const NON_PUBLIC_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".test",
  ".invalid",
  ".example",
  ".home.arpa",
];

function isPublicHostname(host) {
  if (typeof host !== "string" || !host) return false;

  const normalized = host.toLowerCase().replace(/\.$/, "");
  if (
    !normalized ||
    normalized.endsWith(".") ||
    !normalized.includes(".") ||
    (normalized.startsWith("[") && normalized.endsWith("]"))
  )
    return false;

  const labels = normalized.split(".");
  if (
    labels.length === 4 &&
    labels.every((label) => /^\d+$/.test(label) && Number(label) <= 255)
  )
    return false;

  return !NON_PUBLIC_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

if (typeof window !== "undefined") {
  window.isPublicHostname = isPublicHostname;
}
