import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatLinkVerdict,
  linkFailureMessage,
  waitForTabReady,
} from "../link-analysis.js";

function createTabs(initialTab) {
  const updatedListeners = new Set();
  const removedListeners = new Set();
  let currentTab = initialTab;
  const tabs = {
    onUpdated: {
      addListener: (listener) => updatedListeners.add(listener),
      removeListener: (listener) => updatedListeners.delete(listener),
    },
    onRemoved: {
      addListener: (listener) => removedListeners.add(listener),
      removeListener: (listener) => removedListeners.delete(listener),
    },
    get: vi.fn((_tabId, callback) => callback(currentTab)),
    updateTab(tab) {
      currentTab = tab;
    },
    update(tab) {
      currentTab = tab;
    },
    emitUpdated(tabId, changeInfo, tab = currentTab) {
      for (const listener of updatedListeners) listener(tabId, changeInfo, tab);
    },
    emitRemoved(tabId) {
      for (const listener of removedListeners) listener(tabId);
    },
    listenersEmpty() {
      return updatedListeners.size === 0 && removedListeners.size === 0;
    },
  };
  return tabs;
}

function expectClean(tabs) {
  expect(tabs.listenersEmpty()).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("waitForTabReady", () => {
  it("settles an already-complete tab for the full settle interval", async () => {
    vi.useFakeTimers();
    const tab = { id: 7, status: "complete", url: "https://example.com/" };
    const tabs = createTabs(tab);
    let resolved = false;
    const ready = waitForTabReady(tabs, tab.id).then((value) => {
      resolved = true;
      return value;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1499);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await ready).toBe(tab);
    expectClean(tabs);
  });

  it("waits for complete and resolves with the fresh tab after settling", async () => {
    vi.useFakeTimers();
    const loadingTab = { id: 7, status: "loading", url: "https://example.com/" };
    const freshTab = { ...loadingTab, status: "complete", title: "Loaded" };
    const tabs = createTabs(loadingTab);
    const ready = waitForTabReady(tabs, loadingTab.id);

    tabs.update(freshTab);
    tabs.emitUpdated(loadingTab.id, { status: "complete" }, freshTab);
    await vi.advanceTimersByTimeAsync(1500);

    expect(await ready).toBe(freshTab);
    expectClean(tabs);
  });

  it("rejects when the page does not complete before the timeout", async () => {
    vi.useFakeTimers();
    const tabs = createTabs({ id: 7, status: "loading", url: "https://example.com/" });
    const ready = waitForTabReady(tabs, 7, { timeoutMs: 30000 });
    const rejected = expect(ready).rejects.toMatchObject({ reason: "timeout" });

    await vi.advanceTimersByTimeAsync(30000);
    await rejected;
    expectClean(tabs);
  });

  it("rejects when the tab is removed before complete", async () => {
    vi.useFakeTimers();
    const tabs = createTabs({ id: 7, status: "loading", url: "https://example.com/" });
    const ready = waitForTabReady(tabs, 7);
    const rejected = expect(ready).rejects.toMatchObject({ reason: "closed" });

    tabs.emitRemoved(7);
    await rejected;
    expectClean(tabs);
  });

  it("rejects when the tab is removed during settling", async () => {
    vi.useFakeTimers();
    const tabs = createTabs({ id: 7, status: "complete", url: "https://example.com/" });
    const ready = waitForTabReady(tabs, 7);
    const rejected = expect(ready).rejects.toMatchObject({ reason: "closed" });

    await vi.advanceTimersByTimeAsync(500);
    tabs.emitRemoved(7);
    await rejected;
    expectClean(tabs);
  });

  it("rejects a different-origin navigation during settling", async () => {
    vi.useFakeTimers();
    const tabs = createTabs({ id: 7, status: "complete", url: "https://example.com/" });
    const ready = waitForTabReady(tabs, 7);
    const rejected = expect(ready).rejects.toMatchObject({ reason: "navigated" });

    tabs.emitUpdated(7, { url: "https://other.example/" }, {
      id: 7,
      status: "loading",
      url: "https://other.example/",
    });
    await rejected;
    expectClean(tabs);
  });

  it("accepts redirects to another origin before the first complete", async () => {
    vi.useFakeTimers();
    const original = { id: 7, status: "loading", url: "https://short.example/" };
    const redirected = { id: 7, status: "complete", url: "https://example.com/final" };
    const tabs = createTabs(original);
    const ready = waitForTabReady(tabs, 7);

    tabs.update(redirected);
    tabs.emitUpdated(7, { status: "complete" }, redirected);
    await vi.advanceTimersByTimeAsync(1500);

    expect(await ready).toBe(redirected);
    expectClean(tabs);
  });

  it("restarts settling after a same-origin loading event", async () => {
    vi.useFakeTimers();
    const tab = { id: 7, status: "complete", url: "https://example.com/" };
    const freshTab = { ...tab, status: "complete", title: "Reloaded" };
    const tabs = createTabs(tab);
    const ready = waitForTabReady(tabs, 7);

    await vi.advanceTimersByTimeAsync(1000);
    tabs.updateTab({ ...tab, status: "loading" });
    tabs.emitUpdated(7, { status: "loading" }, { ...tab, status: "loading" });
    await vi.advanceTimersByTimeAsync(300);
    tabs.update(freshTab);
    tabs.emitUpdated(7, { status: "complete" }, freshTab);
    await vi.advanceTimersByTimeAsync(1499);
    expect(tabs.get).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    expect(await ready).toBe(freshTab);
    expectClean(tabs);
  });

  it("re-arms timeout for only the remaining time after loading restarts", async () => {
    vi.useFakeTimers();
    const tab = { id: 7, status: "complete", url: "https://example.com/" };
    const tabs = createTabs(tab);
    const ready = waitForTabReady(tabs, 7, { timeoutMs: 4000, settleMs: 1500 });
    const rejected = expect(ready).rejects.toMatchObject({ reason: "timeout" });

    await vi.advanceTimersByTimeAsync(1000);
    tabs.emitUpdated(7, { status: "loading" }, { ...tab, status: "loading" });
    await vi.advanceTimersByTimeAsync(2999);
    expect(tabs.listenersEmpty()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await rejected;
    expectClean(tabs);
  });

  it("rejects when the final tab lookup no longer finds the tab", async () => {
    vi.useFakeTimers();
    const tabs = createTabs({ id: 7, status: "complete", url: "https://example.com/" });
    const ready = waitForTabReady(tabs, 7);
    const rejected = expect(ready).rejects.toMatchObject({ reason: "closed" });

    tabs.update(undefined);
    await vi.advanceTimersByTimeAsync(1500);
    await rejected;
    expectClean(tabs);
  });

  it("ignores update and removal events for other tab ids", async () => {
    vi.useFakeTimers();
    const tab = { id: 7, status: "loading", url: "https://example.com/" };
    const tabs = createTabs(tab);
    const ready = waitForTabReady(tabs, tab.id);
    const unrelatedTab = { id: 8, status: "complete", url: "https://other.example/" };

    tabs.emitUpdated(8, { status: "complete" }, unrelatedTab);
    tabs.emitRemoved(8);
    expect(tabs.listenersEmpty()).toBe(false);

    tabs.update({ ...tab, status: "complete" });
    tabs.emitUpdated(7, { status: "complete" }, { ...tab, status: "complete" });
    await vi.advanceTimersByTimeAsync(1500);
    await ready;
    expectClean(tabs);
  });

  it("treats an initially missing tab as closed", async () => {
    vi.useFakeTimers();
    const tabs = createTabs(undefined);
    await expect(waitForTabReady(tabs, 7)).rejects.toMatchObject({ reason: "closed" });
    expectClean(tabs);
  });
});

describe("formatLinkVerdict", () => {
  const translate = (key, fallback) => ({
    confidence: "confidence",
    confidenceLevelHigh: "High",
    confidenceLevelMedium: "Medium",
    confidenceLevelLow: "Low",
  })[key] || fallback;

  it("formats qualitative confidence and a render-origin label", () => {
    expect(formatLinkVerdict({
      assessable: true,
      renderType: "Server-Side Rendered (SSR)",
      confidence: 93,
      confidenceLevel: "high",
      renderOrigin: { label: "Rendered once, served from cache" },
    }, "en.wikipedia.org", translate)).toEqual({
      title: "en.wikipedia.org: Server-Side Rendered (SSR)",
      message: "High confidence · Rendered once, served from cache",
    });
  });

  it("uses the numeric score when the confidence level is missing", () => {
    expect(formatLinkVerdict({
      assessable: true,
      renderType: "Client-Side Rendered (CSR)",
      confidence: 76.6,
    }, "example.com", translate).message).toBe("77% confidence");
  });

  it("uses the bot-check wording when the result cannot be assessed", () => {
    expect(formatLinkVerdict({
      assessable: false,
      unassessableReason: "bot-challenge",
      renderOrigin: { label: "Challenge page" },
    }, "example.com", translate)).toEqual({
      title: "example.com: Cannot assess — bot check",
      message: "Challenge page",
    });
  });

  it("appends an origin label when the confidence level is known", () => {
    expect(formatLinkVerdict({
      assessable: true,
      renderType: "Hybrid",
      confidence: 41,
      confidenceLevel: "medium",
      renderOrigin: { label: "Generated on the server" },
    }, "example.com", translate).message).toBe("Medium confidence · Generated on the server");
  });
});

describe("linkFailureMessage", () => {
  it("passes the host substitution to the localized message", () => {
    const translate = vi.fn((key, fallback, substitutions) =>
      fallback.replace("$HOST$", substitutions[0]).replace("$1", substitutions[0]));

    expect(linkFailureMessage("timeout", "example.com", translate)).toBe(
      "example.com did not finish loading within 30 seconds. The tab was left open.",
    );
    expect(translate).toHaveBeenCalledWith(
      "linkAnalysisTimeout",
      "$HOST$ did not finish loading within 30 seconds. The tab was left open.",
      ["example.com"],
    );
  });
});
