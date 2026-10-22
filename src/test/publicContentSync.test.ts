import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { notifyPublicContentChanged, refreshPublicContent } from "@/lib/publicContentSync";

describe("public content synchronization", () => {
  it("invalidates public data without invalidating Admin queries", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["store", "example"], { name: "Old public value" });
    queryClient.setQueryData(["admin-stores"], [{ name: "Admin value" }]);

    await refreshPublicContent(queryClient);

    expect(queryClient.getQueryState(["store", "example"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["admin-stores"])?.isInvalidated).toBe(false);
  });

  it("broadcasts an Admin change and preserves its source", () => {
    const queryClient = new QueryClient();
    let eventSource = "";
    window.addEventListener("ds-review-hub:public-content-changed", ((event: CustomEvent) => {
      eventSource = event.detail.source;
    }) as EventListener, { once: true });

    notifyPublicContentChanged(queryClient, "unit-test");

    expect(eventSource).toBe("unit-test");
    expect(window.localStorage.getItem("DS_REVIEW_HUB_CONTENT_VERSION")).toContain("unit-test");
  });
});
