import type { Query, QueryClient } from "@tanstack/react-query";

export const PUBLIC_CONTENT_EVENT = "ds-review-hub:public-content-changed";
export const PUBLIC_CONTENT_STORAGE_KEY = "DS_REVIEW_HUB_CONTENT_VERSION";

const isPublicContentQuery = (query: Query) => {
  const rootKey = query.queryKey[0];
  return typeof rootKey === "string" && !rootKey.startsWith("admin-");
};

export const refreshPublicContent = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: isPublicContentQuery,
    refetchType: "active",
  });

export const notifyPublicContentChanged = (queryClient: QueryClient, source: string) => {
  void refreshPublicContent(queryClient);
  if (typeof window === "undefined") return;

  const detail = { source, changedAt: Date.now() };
  window.dispatchEvent(new CustomEvent(PUBLIC_CONTENT_EVENT, { detail }));
  try {
    window.localStorage.setItem(PUBLIC_CONTENT_STORAGE_KEY, JSON.stringify(detail));
  } catch {
    // Live query invalidation still works when storage is blocked.
  }
};
