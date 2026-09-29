import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, test } from "bun:test";
import { routeTree } from "../routeTree.gen";

const LANDING =
  "/urban-developer?utm_source=theurbandeveloper&utm_medium=banner&utm_campaign=tud-oct-nov-2026";

describe("campaign search retention", () => {
  test("keeps landing UTMs on the URL through guest navigations", async () => {
    const history = createMemoryHistory({ initialEntries: [LANDING] });
    const router = createRouter({
      routeTree,
      history,
      context: { queryClient: new QueryClient() },
    });

    await router.load();
    expect(router.state.location.search).toMatchObject({
      utm_source: "theurbandeveloper",
      utm_medium: "banner",
      utm_campaign: "tud-oct-nov-2026",
    });

    await router.navigate({ to: "/urban-developer/summary" });
    expect(router.state.location.search).toMatchObject({
      utm_source: "theurbandeveloper",
      utm_medium: "banner",
      utm_campaign: "tud-oct-nov-2026",
    });

    await router.navigate({
      to: "/urban-developer/plan",
      search: { projectId: "example" },
    });
    expect(router.state.location.search).toMatchObject({
      projectId: "example",
      utm_source: "theurbandeveloper",
      utm_campaign: "tud-oct-nov-2026",
    });

    await router.navigate({
      to: "/webinar-23-sept",
      search: {
        utm_source: "theurbandeveloper",
        utm_medium: "banner",
        utm_campaign: "tud-oct-nov-2026",
      },
    });
    await router.navigate({ to: "/webinar-23-sept/new", search: { sample: "teneriffe" } });
    expect(router.state.location.search).toMatchObject({
      sample: "teneriffe",
      utm_source: "theurbandeveloper",
      utm_medium: "banner",
      utm_campaign: "tud-oct-nov-2026",
    });
  });
});
