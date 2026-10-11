import { describe, expect, it } from "vitest";
import { isAdminAuthorized } from "../admin-auth";

const authorization = (user: string, password: string) =>
  `Basic ${btoa(`${user}:${password}`)}`;

describe("isAdminAuthorized", () => {
  const env = { ADMIN_PASSWORD: "secret", ADMIN_USER: "owner" };

  it("accepts matching credentials", async () => {
    await expect(
      isAdminAuthorized(authorization("owner", "secret"), env),
    ).resolves.toBe("ok");
  });

  it("rejects a wrong password", async () => {
    await expect(
      isAdminAuthorized(authorization("owner", "incorrect"), env),
    ).resolves.toBe("unauthorized");
  });

  it("rejects a wrong user", async () => {
    await expect(
      isAdminAuthorized(authorization("other", "secret"), env),
    ).resolves.toBe("unauthorized");
  });

  it("defaults the user to admin", async () => {
    await expect(
      isAdminAuthorized(authorization("admin", "secret"), {
        ADMIN_PASSWORD: "secret",
      }),
    ).resolves.toBe("ok");
  });

  it("allows colons in the password", async () => {
    await expect(
      isAdminAuthorized(authorization("owner", "one:two:three"), {
        ADMIN_PASSWORD: "one:two:three",
        ADMIN_USER: "owner",
      }),
    ).resolves.toBe("ok");
  });

  it("rejects a missing header", async () => {
    await expect(isAdminAuthorized(null, env)).resolves.toBe("unauthorized");
  });

  it("rejects a non-Basic scheme", async () => {
    await expect(
      isAdminAuthorized("Bearer token", env),
    ).resolves.toBe("unauthorized");
  });

  it("rejects invalid base64", async () => {
    await expect(
      isAdminAuthorized("Basic !!!", env),
    ).resolves.toBe("unauthorized");
  });

  it("disables admin access when the password is unset", async () => {
    await expect(
      isAdminAuthorized(authorization("admin", "secret"), {}),
    ).resolves.toBe("disabled");
  });

  it("disables admin access when the password is empty", async () => {
    await expect(
      isAdminAuthorized(authorization("admin", "secret"), {
        ADMIN_PASSWORD: "",
      }),
    ).resolves.toBe("disabled");
  });
});
