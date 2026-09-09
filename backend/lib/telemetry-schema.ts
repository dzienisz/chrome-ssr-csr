export const MAX_BODY_BYTES = 64 * 1024;
export const RENDER_TYPES = [
  "Server-Side Rendered (SSR)",
  "Client-Side Rendered (CSR)",
  "Likely SSR with Hydration",
  "Likely CSR/SPA",
  "Hybrid/Islands Architecture",
  "Hybrid/Mixed Rendering",
  "SSR",
  "CSR",
  "Hybrid",
  "Mixed",
];
export const FRAMEWORKS = [
  "react",
  "nextjs",
  "gatsby",
  "remix",
  "vue",
  "nuxt",
  "svelte",
  "sveltekit",
  "angular",
  "astro",
  "qwik",
  "solidjs",
  "preact",
  "lit",
  "htmx",
  "alpinejs",
  "wordpress",
  "shopify",
  "webflow",
  "wix",
  "squarespace",
];
export const PAGE_TYPES = [
  "ecommerce",
  "auth",
  "blog",
  "docs",
  "app",
  "homepage",
  "other",
];
export const DEVICE_TYPES = ["mobile", "tablet", "desktop"];
export const EFFECTIVE_TYPES = ["slow-2g", "2g", "3g", "4g", "unknown"];
export const TECH_LABELS = {
  cssFramework: [
    "Tailwind",
    "Bootstrap",
    "Bootstrap 5",
    "Bootstrap 4",
    "MUI",
    "Chakra UI",
    "Bulma",
    "Foundation",
    "Ant Design",
  ],
  stateManagement: ["Redux", "MobX", "Recoil", "XState", "Apollo"],
  buildTool: ["Vite", "Webpack", "Next.js Build", "Parcel"],
  hosting: [
    "Vercel",
    "Netlify",
    "GitHub Pages",
    "AWS Amplify",
    "Heroku",
    "Cloudflare Pages",
  ],
  cdn: ["Cloudflare", "AWS CloudFront", "Fastly", "Akamai", "BunnyCDN"],
  globalVariables: [
    "React (Global)",
    "Vue (Global)",
    "jQuery",
    "Zepto",
    "AngularJS",
    "Backbone",
    "Ember",
  ],
};

export class TelemetryError extends Error {
  constructor(public status = 400) {
    super(status === 413 ? "Telemetry body too large" : "Invalid telemetry");
  }
}
function invalid(): never {
  throw new TelemetryError();
}
export function plainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}
function text(value: unknown, max = 64): string {
  if (typeof value !== "string" || !value.length || value.length > max)
    return invalid();
  return value;
}
function number(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > Number.MAX_SAFE_INTEGER
  )
    return invalid();
  return value;
}
function count(value: unknown): number {
  const result = number(value);
  return Number.isSafeInteger(result) ? result : invalid();
}
function percent(value: unknown): number {
  const result = number(value);
  return result <= 100 ? result : invalid();
}
function boolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : invalid();
}
function nullable<T>(parse: (value: unknown) => T) {
  return (value: unknown): T | null => (value === null ? null : parse(value));
}
function closed(labels: readonly string[]) {
  return (value: unknown): string =>
    labels.includes(text(value)) ? (value as string) : invalid();
}
function array<T>(parse: (value: unknown) => T) {
  return (value: unknown): T[] => {
    if (!Array.isArray(value) || value.length > 32) return invalid();
    return Array.from(new Set(value.map(parse)));
  };
}
type Parsers = Record<string, (value: unknown) => unknown>;
type Fields<S extends Parsers> = { [K in keyof S]?: ReturnType<S[K]> };
function object<S extends Parsers>(shape: S) {
  return (value: unknown): Fields<S> | null => {
    if (value === undefined || value === null) return null;
    if (!plainObject(value)) return invalid();
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(shape)) {
      if (Object.hasOwn(value, key)) result[key] = shape[key](value[key]);
    }
    return result as Fields<S>;
  };
}
export function normalizeFramework(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 64) return null;
  const token = value.toLowerCase().replace(/[.\s-]/g, "");
  const aliases: Record<string, string> = {
    next: "nextjs",
    nuxtjs: "nuxt",
    solid: "solidjs",
    alpine: "alpinejs",
    vuejs: "vue",
    reactjs: "react",
  };
  const normalized = Object.hasOwn(aliases, token) ? aliases[token] : token;
  return FRAMEWORKS.includes(normalized) ? normalized : null;
}
function frameworks(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  return array((v) => normalizeFramework(text(v)))(value).filter(
    (v): v is string => v !== null,
  );
}
export function normalizeHostname(value: unknown): string | null {
  if (
    typeof value === "string" &&
    value.length <= 45 &&
    /^\[[0-9a-f:.]+\]$/i.test(value)
  ) {
    try {
      return new URL("https://" + value).hostname;
    } catch {
      return null;
    }
  }
  if (
    typeof value !== "string" ||
    !value.length ||
    value.length > 253 ||
    /[\s/@?#:%\\]/.test(value)
  )
    return null;
  try {
    const host = new URL("https://" + value).hostname;
    if (
      host.length > 253 ||
      !host
        .replace(/\.$/, "")
        .split(".")
        .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
    )
      return null;
    return host;
  } catch {
    return null;
  }
}
export function normalizeCountry(value: unknown): string | null {
  return typeof value === "string" && /^[a-z]{2}$/i.test(value)
    ? value.toUpperCase()
    : null;
}
function version(value: unknown): string {
  return typeof value === "string" &&
    value.length <= 32 &&
    /^\d+(?:\.\d+)+$/.test(value)
    ? value
    : "unknown";
}
function browserVersion(value: unknown): string {
  if (typeof value === "string" && value.toLowerCase() === "unknown")
    return "unknown";
  const normalized = version(value);
  return normalized === "unknown" ? invalid() : normalized;
}
function language(value: unknown): string {
  try {
    const result = Intl.getCanonicalLocales(text(value));
    return result[0] || invalid();
  } catch {
    return invalid();
  }
}
function timezone(value: unknown): string {
  try {
    return new Intl.DateTimeFormat("en", {
      timeZone: text(value),
    }).resolvedOptions().timeZone;
  } catch {
    return invalid();
  }
}
const performanceSchema = object({
  domReady: number,
  fcp: number,
  contentRatio: number,
  rawHtmlLength: count,
  renderedLength: count,
  hybridScore: number,
});
const cwvSchema = object({
  lcp: nullable(number),
  cls: nullable(number),
  inp: nullable(number),
  fid: nullable(number),
  ttfb: nullable(number),
  tti: nullable(number),
  tbt: nullable(number),
  pageLoadTime: nullable(number),
  resourceCount: nullable(count),
  totalTransferSize: nullable(count),
  cachedResources: nullable(count),
  cacheHitRate: nullable(percent),
  loafCount: nullable(count),
  loafBlockingDuration: nullable(number),
  loafLongestFrame: nullable(number),
});
const deviceSchema = object({
  deviceType: closed(DEVICE_TYPES),
  screenWidth: count,
  screenHeight: count,
  devicePixelRatio: number,
  isTouchDevice: boolean,
  browserName: closed([
    "Unknown",
    "Firefox",
    "Edge",
    "Chrome",
    "Safari",
    "Opera",
  ]),
  browserVersion,
  engineName: closed(["Unknown", "Gecko", "Blink", "WebKit"]),
  connectionType: closed([
    "bluetooth",
    "cellular",
    "ethernet",
    "mixed",
    "none",
    "other",
    "unknown",
    "wifi",
    "wimax",
  ]),
  effectiveType: closed(EFFECTIVE_TYPES),
  downlink: nullable(number),
  rtt: nullable(number),
  saveData: boolean,
  timezone,
  language,
  prefersReducedMotion: boolean,
  prefersDarkMode: boolean,
  cpuCores: nullable(count),
});
const techSchema = object({
  cssFramework: nullable(closed(TECH_LABELS.cssFramework)),
  stateManagement: array(closed(TECH_LABELS.stateManagement)),
  buildTool: nullable(closed(TECH_LABELS.buildTool)),
  hosting: nullable(closed(TECH_LABELS.hosting)),
  cdn: nullable(closed(TECH_LABELS.cdn)),
  globalVariables: array(closed(TECH_LABELS.globalVariables)),
});
const seoSchema = object({
  seo: object({
    hasMetaDescription: boolean,
    metaDescriptionLength: count,
    titleLength: count,
    h1Count: count,
    h2Count: count,
    hasOGTags: boolean,
    hasOGImage: boolean,
    hasTwitterCard: boolean,
    hasCanonicalURL: boolean,
    hasRobotsMeta: boolean,
    hasStructuredData: boolean,
    isMobileFriendly: boolean,
  }),
  accessibility: object({
    hasAriaLabels: boolean,
    totalImages: count,
    imagesWithAlt: count,
    altTextCoverage: percent,
    hasLandmarks: boolean,
    hasLangAttribute: boolean,
    hasSkipLinks: boolean,
    emptyButtons: count,
  }),
});
const hydrationSchema = object({ errorCount: count, score: percent });
const navigationSchema = object({
  isSPA: boolean,
  clientRoutes: count,
  softNavigations: object({ supported: boolean, count }),
  navigationApi: object({ supported: boolean, clientEntries: count }),
});

export function parseTelemetry(value: unknown, country?: unknown) {
  if (!plainObject(value)) return invalid();
  text(value.domain, 253);
  let url: URL;
  try {
    url = new URL(text(value.url, MAX_BODY_BYTES));
  } catch {
    return invalid();
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    return invalid();
  const domain = normalizeHostname(url.hostname);
  if (!domain) return invalid();
  const device = deviceSchema(value.deviceInfo);
  const validatedCountry = normalizeCountry(country);
  const enrichedDevice: (NonNullable<typeof device> & { country: string | null }) | null =
    device !== null || validatedCountry !== null
      ? Object.assign(device ?? {}, { country: validatedCountry })
      : null;
  return {
    url: url.origin,
    domain,
    render_type: closed(RENDER_TYPES)(value.renderType),
    confidence: percent(value.confidence),
    frameworks: frameworks(value.frameworks),
    performance_metrics: performanceSchema(value.performanceMetrics),
    indicators: [] as string[],
    extension_version: version(value.version),
    core_web_vitals: cwvSchema(value.coreWebVitals),
    page_type:
      value.pageType == null
        ? null
        : PAGE_TYPES.includes(text(value.pageType))
          ? (value.pageType as string)
          : "other",
    device_info: enrichedDevice,
    tech_stack: techSchema(value.techStack),
    seo_accessibility: seoSchema(value.seoAccessibility),
    hydration_stats: hydrationSchema(value.hydrationData),
    navigation_stats: navigationSchema(value.navigationData),
  };
}
export type TelemetryRecord = ReturnType<typeof parseTelemetry>;

export interface PublicAnalysis {
  id: number;
  domain: string;
  render_type: string;
  confidence: number;
  timestamp: string;
  frameworks: string[];
  core_web_vitals?: TelemetryRecord["core_web_vitals"];
  tech_stack?: TelemetryRecord["tech_stack"];
  hydration_stats?: TelemetryRecord["hydration_stats"];
  navigation_stats?: { isSPA?: boolean; clientRoutes?: number } | null;
  device_info?: { country: string | null };
}
function historical<T>(parse: (value: unknown) => T, value: unknown): T | null {
  try {
    return parse(value);
  } catch {
    return null;
  }
}
export function aggregateNumber(value: unknown): number {
  const parsed =
    typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)
      ? Number(value)
      : value;
  return typeof parsed === "number" &&
    Number.isFinite(parsed) &&
    parsed >= 0 &&
    parsed <= Number.MAX_SAFE_INTEGER
    ? parsed
    : 0;
}
export function publicRenderType(value: unknown): string {
  return typeof value === "string" && RENDER_TYPES.includes(value)
    ? value
    : "Other";
}
export function toPublicAnalysis(value: unknown): PublicAnalysis {
  const row = plainObject(value) ? value : {};
  let timestamp = new Date(0).toISOString();
  if (
    row.timestamp instanceof Date ||
    (typeof row.timestamp === "string" &&
      row.timestamp.length <= 64 &&
      /^\d{4}-\d{2}-\d{2}/.test(row.timestamp))
  ) {
    const date = new Date(row.timestamp);
    if (Number.isFinite(date.getTime())) timestamp = date.toISOString();
  }
  const normalizedFrameworks = Array.isArray(row.frameworks)
    ? Array.from(
        new Set(
          row.frameworks
            .slice(0, 32)
            .map(normalizeFramework)
            .filter((v): v is string => v !== null),
        ),
      )
    : [];
  return {
    id: historical(count, row.id) ?? 0,
    domain: normalizeHostname(row.domain) || "unknown",
    render_type: publicRenderType(row.render_type),
    confidence: historical(percent, row.confidence) ?? 0,
    timestamp,
    frameworks: normalizedFrameworks,
    core_web_vitals: historical(cwvSchema, row.core_web_vitals),
    tech_stack: historical(techSchema, row.tech_stack),
    hydration_stats: historical(hydrationSchema, row.hydration_stats),
    navigation_stats: historical(
      object({ isSPA: boolean, clientRoutes: count }),
      row.navigation_stats,
    ),
    device_info: {
      country: normalizeCountry(
        plainObject(row.device_info) ? row.device_info.country : null,
      ),
    },
  };
}

export async function readTelemetryBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return invalid();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new TelemetryError(413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof TelemetryError) throw error;
    return invalid();
  } finally {
    reader.releaseLock();
  }
}
