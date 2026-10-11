import { describe, expect, it } from "vitest";

import "../telemetry-host.js";

const { isPublicHostname } = window;

describe("isPublicHostname", () => {
  it.each([
    "localhost",
    "app.localhost",
    "printer.local",
    "db.internal",
    "127.0.0.1",
    "192.168.68.109",
    "51.49.1.213",
    "[::1]",
    "devbox",
    "localhost.",
    "ci.lan",
    "ci.test",
    "ci.invalid",
    "ci.example",
    "node.home.arpa",
  ])("rejects %s", (host) => {
    expect(isPublicHostname(host)).toBe(false);
  });

  it.each([
    "example.com",
    "ua.sitbackdev.com.au",
    "www.v2.dentarra.ai",
    "xn--bcher-kva.de",
  ])("accepts %s", (host) => {
    expect(isPublicHostname(host)).toBe(true);
  });

  it.each([
    "app.localhost.",
    "printer.local.",
    "db.internal.",
    "node.home.arpa.",
  ])("rejects suffixed host with trailing dot: %s", (host) => {
    expect(isPublicHostname(host)).toBe(false);
  });
});
