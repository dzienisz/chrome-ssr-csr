/**
 * Report Renderer
 *
 * Turns an analysis result into DOM, for both the popup and the DevTools
 * panel. Two rules it never breaks:
 *
 *  1. Everything is built with createElement/textContent. Analysis results
 *     carry strings lifted out of the inspected page — framework names,
 *     element ids, header values — and the previous renderer interpolated
 *     them into an HTML string that the popup then assigned to innerHTML.
 *     A page could choose its own id. Text nodes end that whole class of bug.
 *  2. No layout decisions live here that the stylesheet could make instead;
 *     theme.css owns appearance so the two surfaces cannot drift apart.
 */

/**
 * Create an element.
 * @param {string} tag
 * @param {Object} [props] - className, text, attrs, dataset, children
 * @returns {HTMLElement}
 */
function el(tag, props = {}) {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.text != null) node.textContent = String(props.text);
  if (props.html) node.innerHTML = props.html; // literal markup only (icons)
  if (props.attrs) {
    for (const [key, value] of Object.entries(props.attrs)) {
      if (value != null) node.setAttribute(key, String(value));
    }
  }
  if (props.dataset) {
    for (const [key, value] of Object.entries(props.dataset)) {
      if (value != null) node.dataset[key] = String(value);
    }
  }
  for (const child of props.children || []) {
    if (child) node.appendChild(child);
  }
  return node;
}

/**
 * Localized label with an English fallback. The renderer is loaded by pages
 * that always ship i18n.js, but it is also unit-tested standalone, so it
 * cannot assume the helper exists.
 *
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
function label(key, fallback) {
  return typeof window !== "undefined" && typeof window.t === "function"
    ? window.t(key, fallback)
    : fallback;
}

/** @param {number|null|undefined} n */
function num(n) {
  return typeof n === "number" && isFinite(n) ? n.toLocaleString() : "—";
}

/** @param {number|null|undefined} ms */
function ms(value) {
  return typeof value === "number" && isFinite(value) ? `${Math.round(value)} ms` : "—";
}

/**
 * Which of the three verdict families a render type belongs to. The popup
 * badge, the hero tint and the history list all key off this, so the mapping
 * lives in exactly one place.
 *
 * @param {string} renderType
 * @returns {"ssr"|"csr"|"hybrid"|"unknown"}
 */
function verdictKind(renderType) {
  if (!renderType) return "unknown";
  if (/hybrid|mixed|islands/i.test(renderType)) return "hybrid";
  if (/ssr|server/i.test(renderType)) return "ssr";
  if (/csr|client/i.test(renderType)) return "csr";
  return "unknown";
}

/** Three-letter badge text for the toolbar icon and the hero. */
function verdictBadge(renderType) {
  return { ssr: "SSR", csr: "CSR", hybrid: "MIX", unknown: "" }[
    verdictKind(renderType)
  ];
}

/**
 * The hero: verdict, confidence dial, where it was rendered, and the
 * server/client split of the visible text.
 *
 * @param {Object} result
 * @returns {HTMLElement}
 */
function renderVerdict(result) {
  const kind = verdictKind(result.renderType);
  const confidence = Math.round(result.confidence || 0);
  const color = { ssr: "var(--ssr)", csr: "var(--csr)", hybrid: "var(--hybrid)" }[kind] ||
    "var(--neutral)";

  const dial = el("div", {
    className: "dial",
    attrs: {
      role: "img",
      "aria-label": `${confidence}% ${label("confidence", "confidence")}`,
    },
    children: [el("span", { className: "dial-value", text: `${confidence}` })],
  });
  dial.style.setProperty("--value", String(confidence));
  dial.style.setProperty("--dial-color", color);

  const dialWrap = el("div", {
    className: "dial-wrap",
    children: [
      dial,
      el("div", {
        className: "dial-caption",
        text: label("confidence", "confidence"),
      }),
    ],
  });

  const body = el("div", {
    className: "verdict-body",
    children: [
      el("div", { className: "verdict-kind", text: verdictBadge(result.renderType) }),
      el("div", { className: "verdict-label", text: result.renderType }),
      result.renderOrigin
        ? el("div", {
            className: "verdict-origin",
            children: [
              el("strong", { text: result.renderOrigin.label }),
              document.createTextNode(` — ${result.renderOrigin.detail}`),
            ],
          })
        : null,
    ],
  });

  // The hero stacks: a row of verdict + dial, then the split bar underneath.
  // They are separate rows rather than siblings of one flex container, so the
  // bar cannot compete with the text for horizontal space.
  const hero = el("section", {
    className: "verdict",
    dataset: { kind },
    attrs: { "aria-live": "polite" },
    children: [el("div", { className: "verdict-main", children: [body, dialWrap] })],
  });

  const diff = result.detailedInfo && result.detailedInfo.domDiff;
  if (diff && diff.available && diff.serverChars + diff.clientChars > 0) {
    hero.appendChild(renderSplit(diff));
  }

  return hero;
}

/**
 * The one visual that answers "how much of this page came from the server?".
 * @param {Object} diff - detailedInfo.domDiff
 */
function renderSplit(diff) {
  const serverPct = Math.max(0, Math.min(100, diff.serverSharePct));
  const server = el("div", { className: "split-server" });
  const client = el("div", { className: "split-client" });
  server.style.width = `${serverPct}%`;
  client.style.width = `${100 - serverPct}%`;

  return el("div", {
    className: "split",
    children: [
      el("div", {
        className: "split-track",
        attrs: {
          role: "img",
          "aria-label": `${serverPct}% of the visible text came from the server`,
        },
        children: [server, client],
      }),
      el("div", {
        className: "split-legend",
        children: [
          el("span", {
            children: [
              el("b", { text: `${serverPct}%` }),
              document.createTextNode(
                ` ${label("fromServer", "from server")}`,
              ),
            ],
          }),
          el("span", {
            children: [
              el("b", { text: `${100 - serverPct}%` }),
              document.createTextNode(
                ` ${label("fromJavaScript", "added by JavaScript")}`,
              ),
            ],
          }),
        ],
      }),
    ],
  });
}

/** A labelled number tile. */
function stat(name, value) {
  return el("div", {
    className: "stat",
    children: [
      el("div", { className: "stat-label", text: name }),
      el("div", { className: "stat-value", text: value }),
    ],
  });
}

/**
 * Overview tab: the numbers a developer reads first, plus detected stacks.
 *
 * @param {Object} result
 * @param {{topSignals?: boolean}} [options] - The popup shows the three
 *   strongest signals here because the full list is a tab away; the panel
 *   shows that list in the next column, so it turns them off rather than
 *   printing the same three findings twice on one screen.
 */
function renderOverview(result, options = {}) {
  const showTopSignals = options.topSignals !== false;
  const info = result.detailedInfo || {};
  const comparison = info.contentComparison;
  const delivery = info.delivery;
  const timing = info.timing;
  const frag = document.createDocumentFragment();

  const stats = el("div", { className: "stats" });
  stats.appendChild(stat("SSR score", `${info.ssrScore ?? 0}`));
  stats.appendChild(stat("CSR score", `${info.csrScore ?? 0}`));
  stats.appendChild(stat("SSR share", `${info.ssrPercentage ?? 50}%`));
  if (comparison) {
    stats.appendChild(stat("In HTML", num(comparison.rawLength)));
    stats.appendChild(stat("On screen", num(comparison.renderedLength)));
  }
  if (delivery && delivery.ttfb != null) stats.appendChild(stat("TTFB", ms(delivery.ttfb)));
  if (timing) {
    stats.appendChild(stat("DOM ready", ms(timing.domContentLoaded)));
    if (timing.firstContentfulPaint != null) {
      stats.appendChild(stat("First paint", ms(timing.firstContentfulPaint)));
    }
  }
  frag.appendChild(el("section", { className: "card", children: [stats] }));

  const stacks = [];
  for (const name of info.frameworks || []) stacks.push({ name, tone: "ssr" });
  for (const name of info.generators || []) stacks.push({ name, tone: "hybrid" });

  if (stacks.length) {
    frag.appendChild(
      el("section", {
        className: "card",
        children: [
          el("div", {
            className: "card-title",
            text: label("detectedStack", "Detected stack"),
          }),
          el("div", {
            className: "chips",
            children: stacks.map((s) =>
              el("span", { className: "chip", dataset: { tone: s.tone }, text: s.name }),
            ),
          }),
        ],
      }),
    );
  }

  const top = showTopSignals
    ? (result.signals || []).filter((s) => s.weight).slice(0, 3)
    : [];
  if (top.length) {
    frag.appendChild(
      el("section", {
        className: "card",
        children: [
          el("div", {
            className: "card-title",
            text: label("whyThisVerdict", "Why this verdict"),
          }),
          ...top.map(renderSignal),
        ],
      }),
    );
  }

  return frag;
}

/**
 * The points a signal contributed, with its side and its sign.
 *
 * Weights can be negative: the decisive-CSR cap removes SSR points rather than
 * adding CSR ones, and rendering that as "CSR +80" would claim evidence that
 * was never found.
 *
 * @param {{impact: string, weight: number}} signal
 * @returns {string}
 */
function formatWeight(signal) {
  const side = { csr: "CSR", hybrid: "HYB" }[signal.impact] || "SSR";
  const sign = signal.weight < 0 ? "\u2212" : "+";
  return `${side} ${sign}${Math.abs(signal.weight)}`;
}

/** One evidence row. */
function renderSignal(signal) {
  return el("div", {
    className: "signal",
    dataset: { impact: signal.impact || "info" },
    children: [
      el("div", { className: "signal-mark" }),
      el("div", {
        className: "signal-body",
        children: [
          el("div", {
            className: "signal-head",
            children: [
              el("div", { className: "signal-label", text: signal.label }),
              signal.weight
                ? el("span", {
                    className: "signal-weight",
                    text: formatWeight(signal),
                  })
                : null,
            ],
          }),
          signal.detail ? el("div", { className: "signal-detail", text: signal.detail }) : null,
        ],
      }),
    ],
  });
}

/**
 * Signals tab: every piece of evidence, scored ones first.
 * @param {Object} result
 */
function renderSignals(result) {
  const signals = result.signals || [];
  if (!signals.length) {
    return el("div", { className: "empty", text: "No signals were recorded." });
  }

  const scored = signals.filter((s) => s.weight);
  const context = signals.filter((s) => !s.weight);
  const frag = document.createDocumentFragment();

  if (scored.length) {
    frag.appendChild(
      el("section", {
        className: "card",
        children: [
          el("div", {
            className: "card-title",
            text: label("scoredEvidence", "Scored evidence"),
          }),
          ...scored.map(renderSignal),
        ],
      }),
    );
  }

  if (context.length) {
    frag.appendChild(
      el("section", {
        className: "card",
        children: [
          el("div", {
            className: "card-title",
            text: label("context", "Context"),
          }),
          ...context.map(renderSignal),
        ],
      }),
    );
  }

  return frag;
}

/** Key/value list helper. */
function kv(pairs) {
  const list = el("dl", { className: "kv" });
  for (const [key, value] of pairs) {
    if (value == null || value === "") continue;
    list.appendChild(el("dt", { text: key }));
    list.appendChild(el("dd", { text: String(value) }));
  }
  return list;
}

/**
 * Delivery tab: how the document travelled, straight from response headers.
 * @param {Object} result
 */
function renderDelivery(result) {
  const delivery = (result.detailedInfo || {}).delivery;

  if (!delivery || !delivery.available) {
    return el("div", {
      className: "empty",
      text: "Response headers were not available for this page, so delivery could not be classified.",
    });
  }

  const frag = document.createDocumentFragment();

  frag.appendChild(
    el("section", {
      className: "card",
      children: [
        el("div", { className: "card-title", text: delivery.modeLabel }),
        el("div", { className: "signal-detail", text: delivery.modeDetail }),
      ],
    }),
  );

  frag.appendChild(
    el("section", {
      className: "card",
      children: [
        el("div", {
          className: "card-title",
          text: label("transport", "Transport"),
        }),
        kv([
          ["CDN / host", delivery.cdn],
          ["Origin runtime", delivery.runtime],
          ["Server", delivery.server],
          ["X-Powered-By", delivery.poweredBy],
          ["Cache state", delivery.cacheState],
          // Only when more than one tier answered: a single layer is already
          // the line above it, and repeating it reads like a second fact.
          [
            label("cacheLayers", "Cache layers"),
            delivery.cacheLayers && delivery.cacheLayers.length > 1
              ? delivery.cacheLayers.map((l) => `${l.header}: ${l.state}`).join(" · ")
              : null,
          ],
          ["Age", delivery.age != null ? `${delivery.age}s` : null],
          ["Cache-Control", delivery.cacheControl],
          ["Shared max-age", delivery.sMaxAge != null ? `${delivery.sMaxAge}s` : null],
          [
            "Stale-while-revalidate",
            delivery.staleWhileRevalidate != null ? `${delivery.staleWhileRevalidate}s` : null,
          ],
          ["Compression", delivery.compression],
          ["Vary", delivery.varies],
          ["Last-Modified", delivery.lastModified],
          ["TTFB", delivery.ttfb != null ? ms(delivery.ttfb) : null],
        ]),
      ],
    }),
  );

  if (delivery.serverTiming && delivery.serverTiming.length) {
    frag.appendChild(
      el("section", {
        className: "card",
        children: [
          el("div", { className: "card-title", text: "Server-Timing" }),
          kv(
            delivery.serverTiming.map((entry) => [
              entry.description || entry.name,
              entry.duration ? `${entry.duration} ms` : entry.name,
            ]),
          ),
        ],
      }),
    );
  }

  return frag;
}

/**
 * Diff tab: which regions the server sent and which JavaScript built.
 * @param {Object} result
 */
function renderDiff(result) {
  const diff = (result.detailedInfo || {}).domDiff;

  if (!diff || !diff.available) {
    return el("div", {
      className: "empty",
      text: "The pre-JavaScript HTML could not be fetched, so regions cannot be compared.",
    });
  }

  const frag = document.createDocumentFragment();

  const stats = el("div", { className: "stats" });
  stats.appendChild(stat("From server", num(diff.serverChars)));
  stats.appendChild(stat("Added by JS", num(diff.clientChars)));
  stats.appendChild(stat("Elements", num(diff.rawElements)));
  stats.appendChild(stat("After scripts", num(diff.renderedElements)));
  frag.appendChild(el("section", { className: "card", children: [stats] }));

  if (!diff.regions.length) {
    frag.appendChild(
      el("div", { className: "empty", text: "This page has no regions large enough to compare." }),
    );
    return frag;
  }

  const rows = diff.regions.map((region) => {
    const serverPct =
      region.renderedChars > 0
        ? Math.max(0, Math.min(100, Math.round((region.rawChars / region.renderedChars) * 100)))
        : 100;
    const server = el("div", { className: "split-server" });
    const client = el("div", { className: "split-client" });
    server.style.width = `${serverPct}%`;
    client.style.width = `${100 - serverPct}%`;

    const tone = { server: "ssr", client: "csr", mixed: "hybrid" }[region.origin];

    return el("div", {
      className: "region",
      children: [
        el("div", {
          className: "region-head",
          children: [
            el("div", { className: "region-label", text: region.label }),
            el("span", { className: "chip", dataset: { tone }, text: region.origin }),
          ],
        }),
        region.label !== region.key
          ? el("div", { className: "region-key", text: region.key })
          : null,
        el("div", { className: "region-track", children: [server, client] }),
        el("div", {
          className: "split-legend",
          children: [
            el("span", { text: `${num(region.rawChars)} from server` }),
            el("span", { text: `${num(region.addedChars)} added` }),
          ],
        }),
      ],
    });
  });

  // No card title: both surfaces already label this section — the popup with
  // its tab, the panel with its column heading — and a third "Regions" in a
  // row reads like a bug.
  frag.appendChild(el("section", { className: "card", children: rows }));

  return frag;
}

if (typeof window !== "undefined") {
  window.SSRReport = {
    el,
    kv,
    stat,
    num,
    ms,
    verdictKind,
    verdictBadge,
    renderVerdict,
    renderOverview,
    renderSignal,
    renderSignals,
    renderDelivery,
    renderDiff,
  };
}
