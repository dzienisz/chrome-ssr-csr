import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import "../i18n.js";

const EXTENSION_DIR = join(import.meta.dirname, "../../..");
const LOCALES_DIR = join(EXTENSION_DIR, "_locales");

/** Every page that localizes itself declaratively. */
const PAGES = ["popup.html", "options.html", "welcome.html", "devtools/panel.html"];

const LOCALES = readdirSync(LOCALES_DIR);

function catalog(locale) {
  return JSON.parse(readFileSync(join(LOCALES_DIR, locale, "messages.json"), "utf8"));
}

/** Message keys the markup asks for, via any of the data-i18n* attributes. */
function keysUsedIn(page) {
  const html = readFileSync(join(EXTENSION_DIR, page), "utf8");
  const keys = new Set();
  for (const match of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) {
    keys.add(match[1]);
  }
  return keys;
}

describe("message catalogs", () => {
  const english = catalog("en");

  it("ships the eight documented locales", () => {
    expect(LOCALES.sort()).toEqual(["de", "en", "es", "fr", "ja", "ko", "pl", "pt_BR"]);
  });

  // A key the markup asks for but no catalog defines is invisible in English —
  // chrome.i18n returns "" and the helper falls back to the markup — and then
  // silently ships English to every other locale.
  it.each(PAGES)("defines every key %s asks for", (page) => {
    const missing = [...keysUsedIn(page)].filter((key) => !(key in english));
    expect(missing).toEqual([]);
  });

  it.each(LOCALES)("%s defines exactly the same keys as English", (locale) => {
    const keys = Object.keys(catalog(locale)).sort();
    expect(keys).toEqual(Object.keys(english).sort());
  });

  it.each(LOCALES)("%s has no empty messages", (locale) => {
    const empty = Object.entries(catalog(locale))
      .filter(([, entry]) => !entry.message || !entry.message.trim())
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it("keeps the store description within the 132-character store limit", () => {
    for (const locale of LOCALES) {
      expect(catalog(locale).appDesc.message.length).toBeLessThanOrEqual(132);
    }
  });

  it("documents every English message for translators", () => {
    const undocumented = Object.entries(english)
      .filter(([, entry]) => !entry.description)
      .map(([key]) => key);
    expect(undocumented).toEqual([]);
  });
});

describe("t", () => {
  afterEach(() => {
    delete global.chrome;
  });

  it("returns the catalog message when the locale defines the key", () => {
    global.chrome = { i18n: { getMessage: () => "Ustawienia" } };
    expect(window.t("settings", "Settings")).toBe("Ustawienia");
  });

  // chrome.i18n returns "" for an undefined key, which would blank the UI.
  it("falls back to English for a key the locale does not define", () => {
    global.chrome = { i18n: { getMessage: () => "" } };
    expect(window.t("settings", "Settings")).toBe("Settings");
  });

  it("falls back outside an extension context", () => {
    expect(window.t("settings", "Settings")).toBe("Settings");
  });
});

describe("applyI18n", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.documentElement.lang = "en";
  });

  afterEach(() => {
    delete global.chrome;
  });

  it("replaces marked text and localizes attributes", () => {
    global.chrome = {
      i18n: {
        getMessage: (key) => ({ settings: "Ustawienia", rerun: "Analizuj ponownie" })[key] || "",
        getUILanguage: () => "pl",
      },
    };
    document.body.innerHTML =
      '<span data-i18n="settings">Settings</span>' +
      '<button data-i18n-title="rerun" title="Analyze again"></button>';

    window.applyI18n(document);

    expect(document.querySelector("span").textContent).toBe("Ustawienia");
    expect(document.querySelector("button").title).toBe("Analizuj ponownie");
  });

  // The markup ships English and is rewritten at runtime; leaving lang="en" in
  // place makes a screen reader read Polish with English pronunciation rules.
  it("sets the document language from the UI locale", () => {
    global.chrome = { i18n: { getMessage: () => "", getUILanguage: () => "ja" } };

    window.applyI18n(document);

    expect(document.documentElement.lang).toBe("ja");
  });

  it("leaves the markup's language alone outside an extension context", () => {
    window.applyI18n(document);
    expect(document.documentElement.lang).toBe("en");
  });

  it("does not touch the document language when localizing a fragment", () => {
    global.chrome = { i18n: { getMessage: () => "", getUILanguage: () => "ko" } };
    const fragment = document.createElement("div");
    document.body.appendChild(fragment);

    window.applyI18n(fragment);

    expect(document.documentElement.lang).toBe("en");
  });

  it("survives a locale that reports no UI language", () => {
    global.chrome = { i18n: { getMessage: () => "", getUILanguage: () => "" } };
    expect(() => window.applyI18n(document)).not.toThrow();
    expect(document.documentElement.lang).toBe("en");
  });
});

describe("settings markup", () => {
  // A switch styled from a <div> is announced as an unnamed checkbox.
  it("gives every settings control an accessible name", () => {
    const html = readFileSync(join(EXTENSION_DIR, "options.html"), "utf8");
    const controlIds = [...html.matchAll(/<(?:input|select)[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
    const labelled = new Set(
      [...html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map((m) => m[1]),
    );

    expect(controlIds.length).toBeGreaterThan(0);
    expect(controlIds.filter((id) => !labelled.has(id))).toEqual([]);
  });
});
