if (typeof window !== "undefined" && !window.SSRRegionHighlight) {
  const MIN_CHIP_WIDTH = 40;
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

  function layoutChips(entries) {
    const ordered = entries
      .map((entry, index) => ({
        index,
        rect: entry.rect,
        width: entry.width,
        height: entry.height,
        left: Math.max(entry.rect.left, 0),
        top: Math.max(entry.rect.top, 0),
        hidden: false,
      }))
      .sort((a, b) => a.top - b.top || a.index - b.index);
    const placed = [];

    for (const chip of ordered) {
      let overlap;
      while (
        (overlap = placed.find(
          (other) =>
            chip.left < other.left + other.width &&
            chip.left + chip.width > other.left &&
            chip.top < other.top + other.height &&
            chip.top + chip.height > other.top,
        ))
      ) {
        chip.top = overlap.top + overlap.height + 2;
      }

      if (chip.top + chip.height > chip.rect.bottom) {
        chip.hidden = true;
      } else {
        placed.push(chip);
      }
    }

    return ordered
      .sort((a, b) => a.index - b.index)
      .map(({ top, left, hidden }) => ({ top, left, hidden }));
  }

  function chipMaxWidth(rect, viewportWidth) {
    const available =
      Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
    const width = Math.floor(
      Math.min(360, viewportWidth - 16, available),
    );
    return width < MIN_CHIP_WIDTH ? 0 : width;
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
        boxSizing: "border-box",
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
    const visibleItems = [];
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
      const maxWidth = chipMaxWidth(rect, window.innerWidth);
      if (maxWidth === 0) {
        item.chip.style.display = "none";
        continue;
      }
      item.chip.style.maxWidth = `${maxWidth}px`;
      item.chip.style.display = "block";
      const chipRect = item.chip.getBoundingClientRect();
      visibleItems.push({
        item,
        rect,
        width: chipRect.width,
        height: chipRect.height,
      });
    }

    const placements = layoutChips(visibleItems);
    visibleItems.forEach(({ item }, index) => {
      const placement = placements[index];
      if (placement.hidden) {
        item.chip.style.display = "none";
        return;
      }
      Object.assign(item.chip.style, {
        left: `${placement.left}px`,
        top: `${placement.top}px`,
      });
    });
  }

  window.SSRRegionHighlight = {
    ORIGIN_STYLES,
    originStyle,
    chipText,
    layoutChips,
    chipMaxWidth,
    show,
    remove,
    isActive,
    inspect,
  };
}
