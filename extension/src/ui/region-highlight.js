if (typeof window !== "undefined" && !window.SSRRegionHighlight) {
  const ORIGIN_STYLES = Object.freeze({
    client: Object.freeze({
      outline: "#ea580c",
      chipBg: "#c2410c",
      chipText: "#ffffff",
      fallback: "Added by JS",
    }),
    mixed: Object.freeze({
      outline: "#f59e0b",
      chipBg: "#fbbf24",
      chipText: "#1c1917",
      fallback: "Mixed",
    }),
    server: Object.freeze({
      outline: "#16a34a",
      chipBg: "#15803d",
      chipText: "#ffffff",
      fallback: "From server",
    }),
  });

  let state = null;

  function originStyle(origin) {
    return ORIGIN_STYLES[origin] || ORIGIN_STYLES.mixed;
  }

  function chipText(region, strings = {}) {
    const style = originStyle(region.origin);
    const originText = strings[region.origin] || style.fallback;
    const value = region.label || region.key;
    const label = value.length > 48 ? `${value.slice(0, 47)}…` : value;
    const share =
      typeof region.serverPct === "number" && Number.isFinite(region.serverPct)
        ? ` · ${(strings.share || "$1% from server").replace("$1", String(region.serverPct))}`
        : "";
    return `${originText} · ${label}${share}`;
  }

  function remove() {
    if (!state) return false;

    if (state.frame !== null) state.cancelFrame(state.frame);
    window.removeEventListener("scroll", state.schedule, true);
    window.removeEventListener("resize", state.schedule);
    window.removeEventListener("keydown", state.onKey, true);
    if (state.observer) state.observer.disconnect();
    state.host.remove();
    state = null;
    return true;
  }

  function isActive() {
    return Boolean(state && state.host.isConnected);
  }

  function inspect() {
    return state
      ? { host: state.host, root: state.root, items: state.items }
      : null;
  }

  function show(regions, strings = {}) {
    remove();
    const list = Array.isArray(regions) ? regions : [];
    const total = list.length;
    const items = [];

    for (const region of list) {
      const el = window.resolveRegionKey(document.body, region.key);
      if (el) items.push({ el, region });
    }

    if (items.length === 0) return { drawn: 0, total };

    const host = document.createElement("ssr-detector-highlight");
    host.setAttribute("aria-hidden", "true");
    for (const [name, value] of Object.entries({
      all: "initial",
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      margin: "0",
      padding: "0",
      border: "0",
      overflow: "hidden",
      background: "transparent",
      "pointer-events": "none",
      "z-index": "2147483647",
      display: "block",
    })) {
      host.style.setProperty(name, value, "important");
    }

    const root = host.attachShadow({ mode: "closed" });
    for (const item of items) {
      const style = originStyle(item.region.origin);
      const rgb = style.outline
        .slice(1)
        .match(/.{2}/g)
        .map((part) => parseInt(part, 16));
      const box = document.createElement("div");
      Object.assign(box.style, {
        position: "absolute",
        boxSizing: "border-box",
        border: `2px solid ${style.outline}`,
        borderRadius: "3px",
        background: `rgba(${rgb.join(", ")}, 0.08)`,
        boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.85)",
        pointerEvents: "none",
      });

      const chip = document.createElement("div");
      Object.assign(chip.style, {
        position: "absolute",
        font: '600 12px/16px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        padding: "3px 8px",
        borderRadius: "4px",
        background: style.chipBg,
        color: style.chipText,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "min(360px, calc(100vw - 16px))",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.35)",
        letterSpacing: "normal",
        textTransform: "none",
        pointerEvents: "none",
      });
      chip.textContent = chipText(item.region, strings);
      item.box = box;
      item.chip = chip;
      root.append(box, chip);
    }

    const requestFrame = window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : (callback) => window.setTimeout(callback, 0);
    const cancelFrame = window.cancelAnimationFrame
      ? window.cancelAnimationFrame.bind(window)
      : window.clearTimeout.bind(window);
    const highlightState = {
      host,
      root,
      items,
      observer: null,
      frame: null,
      requestFrame,
      cancelFrame,
      schedule: null,
      onKey: null,
    };
    highlightState.schedule = () => {
      if (highlightState.frame !== null) return;
      highlightState.frame = requestFrame(() => {
        highlightState.frame = null;
        reposition(highlightState);
      });
    };
    highlightState.onKey = (event) => {
      if (event.key === "Escape") remove();
    };

    document.documentElement.appendChild(host);
    state = highlightState;
    reposition(state);
    window.addEventListener("scroll", state.schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", state.schedule);
    window.addEventListener("keydown", state.onKey, true);
    if (typeof ResizeObserver === "function") {
      state.observer = new ResizeObserver(state.schedule);
      for (const item of items) state.observer.observe(item.el);
    }

    return { drawn: items.length, total };
  }

  function reposition(highlightState) {
    for (const item of highlightState.items) {
      const rect = item.el.getBoundingClientRect();
      const offscreen =
        rect.bottom <= 0 ||
        rect.right <= 0 ||
        rect.top >= window.innerHeight ||
        rect.left >= window.innerWidth;
      if (!item.el.isConnected || rect.width === 0 || rect.height === 0 || offscreen) {
        item.box.style.display = "none";
        item.chip.style.display = "none";
        continue;
      }

      Object.assign(item.box.style, {
        display: "block",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
      Object.assign(item.chip.style, {
        display: "block",
        left: `${Math.max(rect.left, 0)}px`,
        top: `${Math.max(rect.top, 0)}px`,
      });
    }
  }

  window.SSRRegionHighlight = {
    ORIGIN_STYLES,
    originStyle,
    chipText,
    show,
    remove,
    isActive,
    inspect,
  };
}
