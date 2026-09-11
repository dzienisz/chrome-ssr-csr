/**
 * DOM Diff Detector Module
 *
 * The verdict says *what* the page is. This says *which parts of it* the
 * server actually sent. It lines up the regions of the pre-JS document
 * against the same regions in the live DOM and reports, per region, how much
 * visible text arrived from the server and how much JavaScript added.
 *
 * That turns an opaque "CSR, 88%" into something actionable: the header and
 * footer came from the server, `#feed` was empty until JS filled it with
 * 12,400 characters.
 *
 * Score-neutral by design. Region attribution is an explanation of the
 * comparison signal, not a second vote on it — the overall ratio is already
 * scored once in comparison-detector, and scoring it twice would double-count
 * the single strongest input to the verdict.
 */

/** Elements never worth reporting as a region of their own. */
const REGION_SKIP = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "LINK",
  "META",
  "BR",
  "HR",
]);

/**
 * Tags that are prose, not structure. A <main> holding six paragraphs is one
 * region; splitting it into six paragraph rows is how a useful report turns
 * into a wall of noise.
 */
const CONTENT_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "DT",
  "DD",
  "SPAN",
  "A",
  "TD",
  "TH",
  "TR",
  "BLOCKQUOTE",
  "FIGCAPTION",
  "PRE",
  "CODE",
  "LABEL",
  "BUTTON",
]);

/** Maximum depth walked from <body> when collecting regions. */
const MAX_REGION_DEPTH = 4;

/** Regions below this rendered text length are noise, not structure. */
const MIN_REGION_CHARS = 40;

/**
 * Escape an id for use in a selector. Ids legitimately contain characters
 * that are syntax in CSS (`#__next`, `:r0:`, `foo.bar`), and an unescaped one
 * turns querySelector into a thrown SyntaxError rather than a miss.
 *
 * @param {string} value
 * @returns {string}
 */
function cssEscape(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return String(value).replace(/([^\w-])/g, "\\$1");
}

/**
 * A stable-ish key for matching an element between two parses of the same
 * page. Ids are used when present (they survive hydration); otherwise the
 * tag plus its position among same-tag siblings, which survives hydration in
 * every framework that reuses the server markup.
 *
 * @param {Element} el
 * @returns {string}
 */
function regionKey(el) {
  const parts = [];
  let node = el;
  let depth = 0;
  while (node && node.nodeType === 1 && node.tagName !== "BODY" && depth < 12) {
    if (node.id) {
      parts.unshift(`#${cssEscape(node.id)}`);
      break;
    }
    const tag = node.tagName.toLowerCase();
    let index = 1;
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === node.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    parts.unshift(index > 1 ? `${tag}:nth-of-type(${index})` : tag);
    node = node.parentElement;
    depth++;
  }
  return parts.join(" > ") || "body";
}

/**
 * A short human label for a region — the landmark role or heading a developer
 * would use to find it, falling back to the selector.
 *
 * @param {Element} el
 * @param {string} key
 * @returns {string}
 */
function regionLabel(el, key) {
  const tag = el.tagName.toLowerCase();
  const landmark = {
    header: "Header",
    nav: "Navigation",
    main: "Main content",
    article: "Article",
    aside: "Sidebar",
    footer: "Footer",
    form: "Form",
    table: "Table",
  }[tag];
  if (landmark) return landmark;
  const role = el.getAttribute && el.getAttribute("role");
  if (role === "main") return "Main content";
  if (role === "banner") return "Header";
  if (role === "navigation") return "Navigation";
  if (role === "contentinfo") return "Footer";
  return key;
}

/** Per-analysis memo, so a region's text is measured once, not once per depth. */
const textLengthCache = new WeakMap();

/**
 * Visible text length of an element, counting the same characters
 * comparison-detector counts for whole documents (script/style/noscript/
 * template excluded) so the two numbers are directly comparable.
 *
 * Walks text nodes instead of cloning the subtree: this runs once per region
 * on both sides of the diff, and cloning a page-sized subtree per region is
 * quadratic on exactly the content-heavy pages worth analyzing.
 *
 * @param {Element|null} el
 * @returns {number}
 */
function visibleTextLength(el) {
  if (!el) return 0;
  const cached = textLengthCache.get(el);
  if (cached !== undefined) return cached;

  let text = "";
  const doc = el.ownerDocument || document;
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let parent = node.parentElement;
      while (parent) {
        if (REGION_SKIP.has(parent.tagName) || parent.id === "ssr-detector-probe-data") {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent === el) break;
        parent = parent.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    text += node.nodeValue || "";
    node = walker.nextNode();
  }

  const length = text.replace(/\s+/g, " ").trim().length;
  textLengthCache.set(el, length);
  return length;
}

/**
 * Structural children of an element: what a developer would call the parts of
 * this region, with script/style noise and this extension's probe removed.
 *
 * @param {Element} el
 * @returns {Array<Element>}
 */
function structuralChildren(el) {
  return Array.from(el.children).filter(
    (child) =>
      !REGION_SKIP.has(child.tagName) && child.id !== "ssr-detector-probe-data",
  );
}

/**
 * Look up the counterpart of a rendered element in the pre-JavaScript
 * document. A key can be a selector the raw document rejects (ids are chosen
 * by the page, not by us), so a failure here means "not present", never an
 * exception.
 *
 * @param {HTMLElement|null} rawBody
 * @param {string} key
 * @returns {Element|null}
 */
function findInRaw(rawBody, key) {
  if (!rawBody) return null;
  try {
    return rawBody.querySelector(key);
  } catch (e) {
    return null;
  }
}

/**
 * Walk the rendered document alongside the served one and report the regions
 * where the two differ.
 *
 * The descent rule is the whole trick. A container the server filled in
 * completely is not itself interesting — its parts are, so the walk goes
 * inside it and reports the header, the article and the footer separately. A
 * container that JavaScript filled IS the interesting boundary: `#root` going
 * from empty to twelve thousand characters is the finding, and splitting it
 * into the components React happened to mount would bury it.
 *
 * @param {HTMLElement|null} renderedBody
 * @param {HTMLElement|null} rawBody
 * @returns {Array<Object>} Region records
 */
function collectRegions(renderedBody, rawBody) {
  const regions = [];
  if (!renderedBody) return regions;

  const walk = (element, depth) => {
    for (const child of structuralChildren(element)) {
      const renderedChars = visibleTextLength(child);

      // Too small to be a region of its own: look inside it instead.
      if (renderedChars < MIN_REGION_CHARS) {
        if (depth < MAX_REGION_DEPTH) walk(child, depth + 1);
        continue;
      }

      const key = regionKey(child);
      const rawElement = findInRaw(rawBody, key);
      const rawChars = visibleTextLength(rawElement);
      const ratio = renderedChars > 0 ? rawChars / renderedChars : 1;

      let origin;
      if (!rawElement) origin = "client";
      else if (ratio >= 0.7) origin = "server";
      else if (ratio <= 0.2) origin = "client";
      else origin = "mixed";

      const children = structuralChildren(child);
      // A wrapper whose only child holds all its text adds nothing — unless
      // that child is prose, in which case the wrapper is the landmark worth
      // naming (a <footer> around one <p> is "Footer", not "footer > p").
      const isPassThrough =
        children.length === 1 &&
        !CONTENT_TAGS.has(children[0].tagName) &&
        visibleTextLength(children[0]) >= renderedChars - 5;
      const worthSplitting =
        origin !== "client" &&
        children.filter(
          (kid) =>
            !CONTENT_TAGS.has(kid.tagName) && visibleTextLength(kid) >= MIN_REGION_CHARS,
        ).length >= 2;

      if (depth < MAX_REGION_DEPTH && (isPassThrough || worthSplitting)) {
        walk(child, depth + 1);
        continue;
      }

      regions.push({
        key,
        label: regionLabel(child, key),
        rawChars,
        renderedChars,
        addedChars: Math.max(0, renderedChars - rawChars),
        origin,
        existedInRawHtml: Boolean(rawElement),
      });
    }
  };

  walk(renderedBody, 1);
  return regions;
}

/**
 * Count elements in a document body, excluding this extension's own probe.
 * @param {HTMLElement|null} body
 * @returns {number}
 */
function countElements(body) {
  if (!body) return 0;
  const total = body.querySelectorAll("*").length;
  const probe = body.querySelectorAll(
    "#ssr-detector-probe-data, #ssr-detector-probe-data *",
  ).length;
  return total - probe;
}

/**
 * Attribute the rendered page's content to the server or to client JavaScript,
 * region by region.
 *
 * @param {Document|null} rawDocument - Parsed pre-JS document
 * @returns {Object} Score-neutral detection results
 */
function detectDomDiff(rawDocument) {
  // Intentionally always empty: `indicators` is the scored channel that feeds
  // the confidence bonus. This module explains the verdict, it does not vote,
  // so everything it has to say goes into `signals`.
  const indicators = [];
  const signals = [];

  if (!rawDocument || !rawDocument.body || !document.body) {
    return {
      ssrScore: 0,
      csrScore: 0,
      indicators,
      signals,
      details: { domDiff: { available: false, regions: [] } },
    };
  }

  const regions = collectRegions(document.body, rawDocument.body);

  let serverChars = 0;
  let clientChars = 0;
  for (const region of regions) {
    serverChars += Math.min(region.rawChars, region.renderedChars);
    clientChars += region.addedChars;
  }

  regions.sort((a, b) => b.renderedChars - a.renderedChars);

  const totalChars = serverChars + clientChars;
  const serverSharePct = totalChars > 0 ? Math.round((serverChars / totalChars) * 100) : 100;

  const rawElements = countElements(rawDocument.body);
  const renderedElements = countElements(document.body);
  const elementsAddedByJs = Math.max(0, renderedElements - rawElements);

  const serverRegions = regions.filter((r) => r.origin === "server");
  const clientRegions = regions.filter((r) => r.origin === "client");
  const mixedRegions = regions.filter((r) => r.origin === "mixed");

  const domDiff = {
    available: true,
    serverChars,
    clientChars,
    serverSharePct,
    rawElements,
    renderedElements,
    elementsAddedByJs,
    regionCount: regions.length,
    serverRegionCount: serverRegions.length,
    clientRegionCount: clientRegions.length,
    mixedRegionCount: mixedRegions.length,
    regions: regions.slice(0, 25),
    biggestClientRegion: clientRegions.length
      ? clientRegions.reduce((a, b) => (b.addedChars > a.addedChars ? b : a))
      : null,
  };

  if (regions.length > 0) {
    signals.push({
      id: "diff.serverShare",
      label: `Server supplied ${serverSharePct}% of the visible text`,
      impact: "info",
      weight: 0,
      detail: `${serverChars.toLocaleString()} characters arrived in the HTML; JavaScript added ${clientChars.toLocaleString()}.`,
    });
  }

  if (elementsAddedByJs > 0) {
    signals.push({
      id: "diff.elements",
      label: `JavaScript added ${elementsAddedByJs.toLocaleString()} elements`,
      impact: "info",
      weight: 0,
      detail: `${rawElements.toLocaleString()} elements in the initial HTML, ${renderedElements.toLocaleString()} after scripts ran.`,
    });
  }

  if (domDiff.biggestClientRegion && domDiff.biggestClientRegion.addedChars > 200) {
    const region = domDiff.biggestClientRegion;
    signals.push({
      id: "diff.clientRegion",
      label: `${region.label} is filled in by JavaScript`,
      impact: "info",
      weight: 0,
      detail: `${region.key} gained ${region.addedChars.toLocaleString()} characters after the initial HTML.`,
    });
  }

  // Server-rendered regions sitting next to client-filled ones is the
  // structural fingerprint of an islands / partial-hydration layout. Reported,
  // not scored — hybrid-detector owns that vote.
  if (serverRegions.length > 0 && clientRegions.length > 0) {
    signals.push({
      id: "diff.mixedLayout",
      label: "Server and client regions side by side",
      impact: "info",
      weight: 0,
      detail: `${serverRegions.length} region(s) came fully from the server, ${clientRegions.length} were produced in the browser.`,
    });
  }

  return { ssrScore: 0, csrScore: 0, indicators, signals, details: { domDiff } };
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.detectDomDiff = detectDomDiff;
  window.collectDomRegions = collectRegions;
  window.domRegionKey = regionKey;
}
