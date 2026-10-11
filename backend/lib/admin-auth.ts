type AdminAuthorization = "ok" | "unauthorized" | "disabled";
type AdminEnvironment = {
  ADMIN_PASSWORD?: string;
  ADMIN_USER?: string;
};

async function digest(value: string) {
  return new Uint8Array(
    await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    ),
  );
}

async function constantTimeEqual(actual: string, expected: string) {
  const [actualDigest, expectedDigest] = await Promise.all([
    digest(actual),
    digest(expected),
  ]);
  let difference = 0;
  for (let index = 0; index < actualDigest.length; index += 1) {
    difference |= actualDigest[index] ^ expectedDigest[index];
  }
  return difference === 0;
}

function parseBasicCredentials(authorization: string | null) {
  const match = authorization?.match(/^Basic\s+([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) return null;

  try {
    const binary = atob(match[1]);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    const credentials = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const separator = credentials.indexOf(":");
    if (separator < 0) return null;
    return {
      user: credentials.slice(0, separator),
      password: credentials.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export async function isAdminAuthorized(
  authorization: string | null,
  env: AdminEnvironment = process.env as AdminEnvironment,
): Promise<AdminAuthorization> {
  const expectedPassword = env.ADMIN_PASSWORD;
  if (!expectedPassword) return "disabled";

  const credentials = parseBasicCredentials(authorization);
  if (!credentials) return "unauthorized";

  const expectedUser = env.ADMIN_USER || "admin";
  const [userMatches, passwordMatches] = await Promise.all([
    constantTimeEqual(credentials.user, expectedUser),
    constantTimeEqual(credentials.password, expectedPassword),
  ]);

  return userMatches && passwordMatches ? "ok" : "unauthorized";
}
