import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// TanStack's default search parser turns number-only values into numbers, so
// `?transactionId=3642656376` (MonCash's return URL) or a numeric player ID fails the routes'
// string checks and is dropped. Same behaviour as the default otherwise (JSON values such as
// quoted strings, booleans and objects are still parsed), but numbers stay as the URL's text.
function parseSearch(searchStr: string): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  for (const [key, raw] of params) {
    let value: unknown = raw;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "number") value = parsed;
    } catch {
      // Not JSON: keep the raw text.
    }
    const previous = query[key];
    query[key] =
      previous === undefined
        ? value
        : Array.isArray(previous)
          ? [...previous, value]
          : [previous, value];
  }
  return query;
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    parseSearch,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
