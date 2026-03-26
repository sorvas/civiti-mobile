import { API_BASE_URL } from '@/constants/api';
import type { ApiErrorResponse } from '@/types/api';

import { ApiError, AuthError, NetworkError } from './errors';

type TokenGetter = () =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>;

let tokenGetter: TokenGetter | null = null;

export function setTokenGetter(getter: TokenGetter | null): void {
  tokenGetter = getter;
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  /** When true (default), throws AuthError if no token. When false, skips auth entirely. */
  authenticated?: boolean;
  /** When true, attaches token if available but doesn't throw if missing. */
  authOptional?: boolean;
  params?: QueryParams;
  body?: unknown;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  const url = `${API_BASE_URL}${path}`;
  if (!params) return url;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) {
      searchParams.append(key, String(value));
    }
  }

  const qs = searchParams.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { authenticated = true, authOptional = false, params, body, headers, ...fetchOptions } =
    options;

  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (body != null) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (authOptional) {
    // Best-effort: attach token if available, proceed unauthenticated if not
    if (tokenGetter) {
      const token = await Promise.resolve(tokenGetter()).catch((err) => {
        if (__DEV__) console.warn('[api-client] authOptional token retrieval failed:', err);
        return null;
      });
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }
  } else if (authenticated) {
    if (!tokenGetter) {
      throw new AuthError();
    }
    const token = await Promise.resolve(tokenGetter());
    if (!token) {
      throw new AuthError();
    }
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const url = buildUrl(path, params);

  if (__DEV__) console.log(`[api-client] ${fetchOptions.method ?? 'GET'} ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new NetworkError();
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    let message = response.statusText;
    let requestId: string | undefined;

    try {
      const errorBody: ApiErrorResponse = await response.json();
      message = errorBody.error || message;
      requestId = errorBody.requestId;
    } catch {
      // Use statusText if body isn't parseable
    }

    throw new ApiError(response.status, message, requestId);
  }

  return response.json() as Promise<T>;
}
