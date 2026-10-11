import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const EXTENSION_DIR = join(import.meta.dirname, "../../..");
const optionsHtml = readFileSync(join(EXTENSION_DIR, "options.html"), "utf8");
const optionsScript = readFileSync(join(EXTENSION_DIR, "options.js"), "utf8");

function createOptions({
  permissionGranted = true,
  settings = {},
  localValues = {},
  manifest = { version: "4.0.1" },
  userAgent,
} = {}) {
  const dom = new JSDOM(optionsHtml, {
    url: "chrome-extension://test/options.html",
    runScripts: "outside-only",
  });
  const { window } = dom;
  if (userAgent) {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: userAgent,
    });
  }
  const events = [];
  const syncCalls = [];
  const localRemovals = [];
  const permissionRequests = [];
  const permissionRemovals = [];
  const syncValues = { ...settings };
  const localStore = { ...localValues };

  window.chrome = {
    runtime: {
      getManifest: () => manifest,
      sendMessage: (_message, callback) => {
        events.push("runtime.sendMessage");
        callback?.();
      },
      lastError: undefined,
    },
    storage: {
      sync: {
        get: (defaults, callback) => {
          events.push("storage.sync.get");
          callback({ ...defaults, ...syncValues });
        },
        set: (values, callback) => {
          events.push("storage.sync.set");
          syncCalls.push(JSON.parse(JSON.stringify(values)));
          Object.assign(syncValues, values);
          callback?.();
        },
      },
      local: {
        get: (_key, callback) => {
          events.push("storage.local.get");
          callback({ jevApiKey: localStore.jevApiKey });
        },
        set: (values, callback) => {
          events.push("storage.local.set");
          Object.assign(localStore, values);
          callback?.();
        },
        remove: (key, callback) => {
          events.push("storage.local.remove");
          localRemovals.push(key);
          delete localStore[key];
          callback?.();
        },
      },
    },
    permissions: {
      request: (permissions, callback) => {
        events.push("permissions.request");
        permissionRequests.push(permissions);
        callback(permissionGranted);
      },
      remove: (permissions, callback) => {
        events.push("permissions.remove");
        permissionRemovals.push(permissions);
        callback(true);
      },
    },
    commands: {
      getAll: (callback) => callback([]),
    },
  };
  window.applyI18n = () => {};
  window.t = (_key, fallback) => fallback;
  window.matchMedia = () => ({ matches: false });

  vm.runInContext(optionsScript, dom.getInternalVMContext());
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));

  return {
    dom,
    events,
    syncCalls,
    localRemovals,
    localStore,
    permissionRequests,
    permissionRemovals,
    syncValues,
  };
}

describe("Ask Jev options", () => {
  it("requests host permission before storage writes and never syncs the key", () => {
    const page = createOptions();
    const { window } = page.dom;
    page.events.length = 0;
    window.document.getElementById("jevEnabled").checked = true;
    window.document.getElementById("jevApiKey").value = "fake-key";

    window.document.getElementById("save").click();

    expect(page.events.indexOf("permissions.request")).toBe(0);
    expect(page.events.indexOf("permissions.request")).toBeLessThan(
      page.events.indexOf("storage.sync.set"),
    );
    expect(page.permissionRequests).toEqual([
      { origins: ["https://api.typesafe.ai/*"] },
    ]);
    expect(page.syncCalls.at(-1)).toMatchObject({ jevEnabled: true });
    expect(page.syncCalls.at(-1)).not.toHaveProperty("jevApiKey");
    expect(page.localStore.jevApiKey).toBe("fake-key");
    page.dom.window.close();
  });

  it("persists Jev as disabled when optional permission is denied", () => {
    const page = createOptions({ permissionGranted: false });
    const { window } = page.dom;
    window.document.getElementById("jevEnabled").checked = true;
    window.document.getElementById("jevApiKey").value = "fake-key";

    window.document.getElementById("save").click();

    expect(page.syncCalls.at(-1).jevEnabled).toBe(false);
    expect(window.document.getElementById("jevEnabled").checked).toBe(false);
    expect(window.document.getElementById("jevStatus").textContent).toContain(
      "Permission was not granted",
    );
    expect(page.localStore.jevApiKey).toBeUndefined();
    page.dom.window.close();
  });

  it("requests Firefox website-content consent on Firefox 140 and newer", () => {
    const page = createOptions({
      manifest: { browser_specific_settings: { gecko: { id: "test@example.com" } } },
      userAgent: "Mozilla/5.0 Firefox/140.0",
    });
    const { window } = page.dom;
    window.document.getElementById("jevEnabled").checked = true;
    window.document.getElementById("jevApiKey").value = "fake-key";

    window.document.getElementById("save").click();

    expect(page.permissionRequests).toEqual([
      {
        origins: ["https://api.typesafe.ai/*"],
        data_collection: ["websiteContent"],
      },
    ]);
    page.dom.window.close();
  });

  it("does not request Firefox website-content consent before Firefox 140", () => {
    const page = createOptions({
      manifest: { browser_specific_settings: { gecko: { id: "test@example.com" } } },
      userAgent: "Mozilla/5.0 Firefox/128.0",
    });
    const { window } = page.dom;
    window.document.getElementById("jevEnabled").checked = true;
    window.document.getElementById("jevApiKey").value = "fake-key";

    window.document.getElementById("save").click();

    expect(page.permissionRequests).toEqual([{ origins: ["https://api.typesafe.ai/*"] }]);
    page.dom.window.close();
  });

  it("removes the optional permission and local key when disabling", () => {
    const page = createOptions({
      settings: { jevEnabled: true },
      localValues: { jevApiKey: "fake-key" },
    });
    const { window } = page.dom;
    page.events.length = 0;
    window.document.getElementById("jevEnabled").checked = false;

    window.document.getElementById("save").click();

    expect(page.syncCalls.at(-1).jevEnabled).toBe(false);
    expect(page.permissionRemovals).toContainEqual({
      origins: ["https://api.typesafe.ai/*"],
    });
    expect(page.localRemovals).toContain("jevApiKey");
    expect(page.localStore.jevApiKey).toBeUndefined();
    expect(page.syncCalls.at(-1)).not.toHaveProperty("jevApiKey");
    page.dom.window.close();
  });

  it.each(["disable", "reset"])(
    "removes Firefox website-content consent when %s on Firefox 140",
    (action) => {
      const page = createOptions({
        settings: { jevEnabled: true },
        localValues: { jevApiKey: "fake-key" },
        manifest: { browser_specific_settings: { gecko: { id: "test@example.com" } } },
        userAgent: "Mozilla/5.0 Firefox/140.0",
      });
      const { window } = page.dom;
      if (action === "disable") {
        window.document.getElementById("jevEnabled").checked = false;
        window.document.getElementById("save").click();
      } else {
        window.document.getElementById("reset").click();
      }

      expect(page.permissionRemovals).toContainEqual({
        origins: ["https://api.typesafe.ai/*"],
        data_collection: ["websiteContent"],
      });
      page.dom.window.close();
    },
  );

  it("reset removes the permission and local key", () => {
    const page = createOptions({
      settings: { jevEnabled: true },
      localValues: { jevApiKey: "fake-key" },
    });

    page.dom.window.document.getElementById("reset").click();

    expect(page.syncCalls.at(-1).jevEnabled).toBe(false);
    expect(page.permissionRemovals).toContainEqual({
      origins: ["https://api.typesafe.ai/*"],
    });
    expect(page.localRemovals).toContain("jevApiKey");
    expect(page.localStore.jevApiKey).toBeUndefined();
    page.dom.window.close();
  });

  it("does not enable Jev without a key", () => {
    const page = createOptions();
    const { window } = page.dom;
    page.events.length = 0;
    window.document.getElementById("jevEnabled").checked = true;

    window.document.getElementById("save").click();

    expect(page.permissionRequests).toHaveLength(0);
    expect(page.syncCalls.at(-1).jevEnabled).toBe(false);
    expect(window.document.getElementById("jevStatus").textContent).toContain(
      "Add your TypeSafe API key",
    );
    page.dom.window.close();
  });
});
