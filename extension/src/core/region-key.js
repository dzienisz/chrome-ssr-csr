/**
 * Resolve region keys identically in the analyzer's raw document and in the
 * live page used by the highlight overlay.
 * @param {Element|null} root
 * @param {string} key
 * @returns {Element|null}
 */
function resolveRegionKey(root, key) {
  if (!root) return null;
  if (key === "body") return root;
  try {
    return root.querySelector(key.startsWith("#") ? key : `:scope > ${key}`);
  } catch (e) {
    return null;
  }
}

if (typeof window !== "undefined") {
  window.resolveRegionKey = resolveRegionKey;
}
