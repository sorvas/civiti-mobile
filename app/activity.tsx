import { ErrorBoundary, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityItem } from '@/components/activity-item';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Localization } from '@/constants/localization';
import { Spacing } from '@/constants/spacing';
import { useRecentActivity } from '@/hooks/use-activity';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { ActivityResponse } from '@/types/activity';

export { ErrorBoundary };

// ─── Helpers ────────────────────────────────────────────────────

const keyExtractor = (item: ActivityResponse) => item.id;

// ─── Screen ─────────────────────────────────────────────────────

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const textColor = useThemeColor({}, 'text');
  const accent = useThemeColor({}, 'accent');

  const {
    activities,
    isLoading,
    isError,
    isRefetching,
    refetch,
    fetchNextPage,
    isFetchingNextPage,
  } = useRecentActivity();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleIssuePress = useCallback(
    (id: string) => {
      router.push({ pathname: '/issues/[id]', params: { id } });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: ActivityResponse }) => (
      <ActivityItem activity={item} onPress={handleIssuePress} />
    ),
    [handleIssuePress],
  );

  const renderFooter = useCallback(
    () =>
      isFetchingNextPage ? (
        <ActivityIndicator style={styles.footer} color={accent} />
      ) : null,
    [isFetchingNextPage, accent],
  );

  const handleEndReached = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  const contentPadding = useMemo(
    () => ({ paddingBottom: insets.bottom + Spacing.lg }),
    [insets.bottom],
  );

  // ─── Loading / Error states ───────────────────────────────────

  if (isLoading) {
    return (
      <ThemedView style={styles.flex}>
        <ScreenHeader onBack={handleBack} textColor={textColor} topInset={insets.top} />
        <LoadingSkeleton />
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedView style={styles.flex}>
        <ScreenHeader onBack={handleBack} textColor={textColor} topInset={insets.top} />
        <ErrorState onRetry={refetch} />
      </ThemedView>
    );
  }

  // ─── Loaded ───────────────────────────────────────────────────

  return (
    <ThemedView style={styles.flex}>
      <ScreenHeader onBack={handleBack} textColor={textColor} topInset={insets.top} />
      {activities.length === 0 ? (
        <EmptyState message={Localization.activity.empty} />
      ) : (
        <FlatList
          data={activities}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          removeClippedSubviews
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={accent} />
          }
          contentContainerStyle={contentPadding}
        />
      )}
    </ThemedView>
  );
}

// ─── Screen Header ──────────────────────────────────────────────

function ScreenHeader({
  onBack,
  textColor,
  topInset,
}: {
  onBack: () => void;
  textColor: string;
  topInset: number;
}) {
  return (
    <View style={[styles.header, { paddingTop: topInset + Spacing.sm }]}>
      <Pressable
        onPress={onBack}
        style={styles.headerButton}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={Localization.actions.back}
      >
        <IconSymbol name="chevron.left" size={24} color={textColor} />
      </Pressable>
      <ThemedText type="h2" accessibilityRole="header">
        {Localization.activity.title}
      </ThemedText>
      <View style={styles.headerSpacer} />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  footer: {
    paddingVertical: Spacing.xl,
  },
});
