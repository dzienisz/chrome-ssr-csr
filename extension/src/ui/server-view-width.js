(function (root) {
  const DEFAULT_VIEWPORT = Object.freeze({ width: 1280, height: 800 });
  const PRESETS = Object.freeze([
    Object.freeze({ id: "desktop", width: 1440, height: 900 }),
    Object.freeze({ id: "tablet", width: 768, height: 1024 }),
    Object.freeze({ id: "mobile", width: 390, height: 844 }),
  ]);

  function validViewport(value) {
    const width = Number(value && value.width);
    const height = Number(value && value.height);
    return width >= 200 && width <= 10000 && height >= 200 && height <= 10000
      ? { width: Math.round(width), height: Math.round(height) }
      : { ...DEFAULT_VIEWPORT };
  }

  function buildOptions(viewport) {
    const captured = validViewport(viewport);
    const presets = PRESETS.map(({ id, width, height }) => ({ id, width, height }));
    if (captured.width >= 1024) {
      return [{ id: "desktop", width: captured.width, height: captured.height }, ...presets.slice(1)];
    }
    return [{ id: "window", ...captured }, ...presets];
  }

  function defaultOptionId(viewport) {
    return validViewport(viewport).width >= 1024 ? "desktop" : "window";
  }

  function computeFit(paneWidth, frameWidth, frameHeight) {
    const width = Number(frameWidth);
    const height = Number(frameHeight);
    const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
    const safeHeight = Number.isFinite(height) && height > 0 ? height : 0;
    const availableWidth = Number(paneWidth);
    if (!Number.isFinite(availableWidth) || availableWidth <= 0) {
      return { scale: 1, boxHeight: Math.round(safeHeight), offsetX: 0 };
    }

    const scale = Math.min(1, availableWidth / safeWidth);
    return {
      scale,
      boxHeight: Math.round(safeHeight * scale),
      offsetX: Math.max(0, Math.round((availableWidth - safeWidth * scale) / 2)),
    };
  }

  function showsWidthNote(optionId) {
    return optionId === "tablet" || optionId === "mobile";
  }

  function liveShotLabelNeeded(option, viewport) {
    return Boolean(option && option.width !== validViewport(viewport).width);
  }

  const api = {
    PRESETS,
    validViewport,
    buildOptions,
    defaultOptionId,
    computeFit,
    showsWidthNote,
    liveShotLabelNeeded,
  };

  if (root) root.SSRServerViewWidth = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
