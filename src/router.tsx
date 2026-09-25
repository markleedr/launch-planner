import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Key scroll positions by URL, not by history entry, so returning to a
    // page via a nav link (not just the browser back button) restores where
    // the user left off instead of resetting to the top.
    getScrollRestorationKey: (location) => location.href,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
