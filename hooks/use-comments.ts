import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { Localization } from '@/constants/localization';
import {
  createComment,
  deleteComment,
  getIssueComments,
  removeCommentVote,
  updateComment,
  voteCommentHelpful,
} from '@/services/comments';
import type { PagedResult } from '@/types/api';
import type {
  CommentResponse,
  CreateCommentRequest,
  GetCommentsParams,
  UpdateCommentRequest,
} from '@/types/comments';

type UseCommentsParams = Omit<GetCommentsParams, 'page' | 'pageSize'>;

const PAGE_SIZE = 12;

function showMutationError(err: unknown) {
  const message =
    err instanceof Error && err.message.includes('429')
      ? Localization.errors.tooManyRequests
      : Localization.errors.generic;
  Alert.alert(message);
}

export function useComments(issueId: string, params?: UseCommentsParams) {
  const query = useInfiniteQuery({
    queryKey: ['issues', issueId, 'comments', params],
    queryFn: ({ pageParam }) =>
      getIssueComments(issueId, {
        ...params,
        page: pageParam,
        pageSize: PAGE_SIZE,
        sortBy: params?.sortBy ?? 'createdAt',
        sortDescending: params?.sortDescending ?? true,
      }),
    initialPageParam: 1,
    enabled: !!issueId,
    maxPages: 5,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  const comments = useMemo(
    () => query.data?.pages.flatMap((page) => page.items ?? []) ?? [],
    [query.data],
  );

  const totalComments = query.data?.pages[0]?.totalItems ?? 0;

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    comments,
    totalComments,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch,
  };
}

// ─── Comment key prefix ──────────────────────────────────────────

const commentsKeyPrefix = (issueId: string) => ['issues', issueId, 'comments'];

type CommentsInfiniteData = InfiniteData<PagedResult<CommentResponse>>;

// ─── Create Comment ──────────────────────────────────────────────

export function useCreateComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentRequest) => createComment(issueId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKeyPrefix(issueId) });
    },
    onError: (err) => {
      console.warn('[comments] Failed to create comment for issue', issueId, err);
      showMutationError(err);
    },
  });
}

// ─── Update Comment ──────────────────────────────────────────────

export function useUpdateComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateCommentRequest }) =>
      updateComment(commentId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKeyPrefix(issueId) });
    },
    onError: (err) => {
      console.warn('[comments] Failed to update comment for issue', issueId, err);
      showMutationError(err);
    },
  });
}

// ─── Delete Comment ──────────────────────────────────────────────

export function useDeleteComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKeyPrefix(issueId) });
    },
    onError: (err) => {
      console.warn('[comments] Failed to delete comment for issue', issueId, err);
      showMutationError(err);
    },
  });
}

// ─── Vote Comment Helpful (Optimistic) ──────────────────────────

export function useCommentVote(issueId: string, commentId: string) {
  const queryClient = useQueryClient();
  const prefix = commentsKeyPrefix(issueId);

  return useMutation({
    mutationFn: (hasVoted: boolean) =>
      hasVoted ? removeCommentVote(commentId) : voteCommentHelpful(commentId),

    onMutate: async (hasVoted: boolean) => {
      await queryClient.cancelQueries({ queryKey: prefix });

      // Snapshot ALL comment queries for this issue (different sort modes create separate cache entries)
      const snapshots = queryClient.getQueriesData<CommentsInfiniteData>({ queryKey: prefix });

      // Optimistically update the target comment across all cached queries
      for (const [key] of snapshots) {
        queryClient.setQueryData<CommentsInfiniteData>(key, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: (page.items ?? []).map((c) =>
                c.id === commentId
                  ? {
                      ...c,
                      hasVoted: !hasVoted,
                      helpfulCount: Math.max(0, c.helpfulCount + (hasVoted ? -1 : 1)),
                    }
                  : c,
              ),
            })),
          };
        });
      }

      return { snapshots };
    },

    onError: (err, _vars, context) => {
      // Rollback all snapshots
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
      }
      console.warn('[comments] Failed to toggle vote on comment', commentId, err);
      showMutationError(err);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: prefix });
    },
  });
}
