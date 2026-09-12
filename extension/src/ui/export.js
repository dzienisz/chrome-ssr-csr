/**
 * Export Helpers
 *
 * Shared by the popup and the DevTools panel so a report copied from one is
 * byte-identical to a report copied from the other.
 */

/**
 * @param {Object} result - Analysis result
 * @param {{url: string, title: string}} page
 * @returns {string}
 */
function toJSON(result, page) {
  return JSON.stringify(
    {
      url: page.url,
      title: page.title,
      exportedAt: new Date().toISOString(),
      analysis: result,
    },
    null,
    2,
  );
}

/**
 * Characters that make a spreadsheet treat a cell as a formula rather than as
 * text, optionally behind leading whitespace or control characters that the
 * parser strips before deciding.
 *
 * `\t` and `\r` appear in both halves deliberately — they are not redundant
 * with the leading-whitespace class. OWASP lists them as trigger characters in
 * their own right (they carry DDE payloads), so the second class has to be
 * able to match one: for "\tcmd" the first class gives the tab back on
 * backtracking and the trigger class consumes it. Drop them from the trigger
 * class and a leading-tab payload stops being quoted.
 */
const FORMULA_PREFIX = /^[\s\u0000-\u001F\u00A0]*[=+\-@\t\r]/;

/**
 * RFC 4180 quoting, plus formula neutralization.
 *
 * Cell values come from the analyzed page — its title, its element ids, its
 * response headers. Quoting alone is not enough: a page titled `=HYPERLINK(…)`
 * produces a valid CSV field that Excel, LibreOffice and Sheets all execute
 * when the file is opened. Prefixing a single quote makes the cell literal
 * text in every one of them, and the quote is not part of the value.
 *
 * @param {*} value
 * @returns {string}
 */
function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * @param {Object} result
 * @param {{url: string, title: string}} page
 * @returns {string}
 */
function toCSV(result, page) {
  const info = result.detailedInfo || {};
  const delivery = info.delivery || {};
  const diff = info.domDiff || {};

  const rows = [
    ["Field", "Value"],
    ["URL", page.url],
    ["Title", page.title],
    ["Exported", new Date().toISOString()],
    ["Render type", result.renderType],
    ["Confidence", `${result.confidence}%`],
    ["Render origin", result.renderOrigin ? result.renderOrigin.label : ""],
    ["SSR score", info.ssrScore],
    ["CSR score", info.csrScore],
    ["SSR share", `${info.ssrPercentage}%`],
    ["Hybrid score", info.hybridScore],
    ["Frameworks", (info.frameworks || []).join(", ")],
    ["Generators", (info.generators || []).join(", ")],
    ["Delivery mode", delivery.modeLabel || ""],
    ["CDN", delivery.cdn || ""],
    ["Cache state", delivery.cacheState || ""],
    ["TTFB (ms)", delivery.ttfb ?? ""],
    ["Server text share", diff.serverSharePct != null ? `${diff.serverSharePct}%` : ""],
    ["Raw HTML text", info.contentComparison ? info.contentComparison.rawLength : ""],
    ["Rendered text", info.contentComparison ? info.contentComparison.renderedLength : ""],
    ["Indicators", (result.indicators || []).join("; ")],
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

/**
 * @param {Object} result
 * @param {{url: string, title: string}} page
 * @param {string} version - Extension version, for the footer
 * @returns {string}
 */
function toMarkdown(result, page, version) {
  const info = result.detailedInfo || {};
  const delivery = info.delivery || {};
  const diff = info.domDiff || {};
  const lines = [];

  lines.push(`# Rendering analysis — ${page.title || page.url}`, "");
  lines.push(`**URL:** ${page.url}`, "");
  lines.push(`**Analyzed:** ${new Date().toLocaleString()}`, "");
  lines.push("---", "");
  lines.push("## Verdict", "");
  lines.push(`- **Render type:** ${result.renderType}`);
  lines.push(`- **Confidence:** ${result.confidence}%`);
  if (result.renderOrigin) {
    lines.push(`- **Rendered where:** ${result.renderOrigin.label} — ${result.renderOrigin.detail}`);
  }
  lines.push(`- **Score:** SSR ${info.ssrScore} / CSR ${info.csrScore} (${info.ssrPercentage}% SSR)`);
  if (diff.available) {
    lines.push(
      `- **Content origin:** ${diff.serverSharePct}% of the visible text came from the server`,
    );
  }
  lines.push("");

  if ((info.frameworks || []).length || (info.generators || []).length) {
    lines.push("## Stack", "");
    for (const name of info.frameworks || []) lines.push(`- Framework: ${name}`);
    for (const name of info.generators || []) lines.push(`- Generator: ${name}`);
    lines.push("");
  }

  if (delivery.available) {
    lines.push("## Delivery", "");
    lines.push(`- ${delivery.modeLabel} — ${delivery.modeDetail}`);
    if (delivery.cdn) lines.push(`- CDN / host: ${delivery.cdn}`);
    if (delivery.runtime) lines.push(`- Origin runtime: ${delivery.runtime}`);
    if (delivery.cacheState) lines.push(`- Cache state: ${delivery.cacheState}`);
    if (delivery.age != null) lines.push(`- Age: ${delivery.age}s`);
    if (delivery.ttfb != null) lines.push(`- TTFB: ${delivery.ttfb} ms`);
    lines.push("");
  }

  const signals = result.signals || [];
  if (signals.length) {
    lines.push("## Evidence", "");
    for (const signal of signals) {
      // Signed: a capped signal removes points rather than adding them.
      const weight = signal.weight
        ? ` _(${signal.impact.toUpperCase()} ${signal.weight < 0 ? "−" : "+"}${Math.abs(signal.weight)})_`
        : "";
      lines.push(`- **${signal.label}**${weight}${signal.detail ? ` — ${signal.detail}` : ""}`);
    }
    lines.push("");
  }

  if (diff.available && diff.regions.length) {
    lines.push("## Regions", "");
    lines.push("| Region | Origin | From server | Added by JS |");
    lines.push("| --- | --- | ---: | ---: |");
    for (const region of diff.regions) {
      lines.push(
        `| \`${region.key}\` | ${region.origin} | ${region.rawChars.toLocaleString()} | ${region.addedChars.toLocaleString()} |`,
      );
    }
    lines.push("");
  }

  lines.push("---", "");
  lines.push(`_Generated by CSR vs SSR Detector v${version}_`);
  return lines.join("\n");
}

/**
 * A one-line summary for pasting into chat or an issue.
 * @param {Object} result
 * @param {{url: string}} page
 */
function toSummary(result, page) {
  const info = result.detailedInfo || {};
  const origin = result.renderOrigin ? ` · ${result.renderOrigin.label}` : "";
  const share =
    info.domDiff && info.domDiff.available
      ? ` · ${info.domDiff.serverSharePct}% of text from the server`
      : "";
  return `${page.url} → ${result.renderType} (${result.confidence}% confidence)${origin}${share}`;
}

/**
 * Trigger a file download from an extension page.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
function downloadFile(content, filename, mimeType) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking synchronously can cancel the download in some builds; one turn
  // of the event loop is enough for the navigation to have been queued.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if (typeof window !== "undefined") {
  window.SSRExport = { toJSON, toCSV, toMarkdown, toSummary, downloadFile, csvCell };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { toJSON, toCSV, toMarkdown, toSummary, csvCell };
}
