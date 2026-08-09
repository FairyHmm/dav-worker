import { describe, it, expect } from "vitest";
import { asNextcloudCredential, basicAuthHeader } from "./credential";

describe("asNextcloudCredential", () => {
  const valid = {
    host: "https://cloud.example",
    username: "fairy",
    password: "secret",
  };

  it("returns the credential when shape is valid", () => {
    expect(asNextcloudCredential(valid)).toEqual(valid);
  });

  it("throws when credential is not an object", () => {
    expect(() => asNextcloudCredential("not-an-object")).toThrow(
      "expected an object",
    );
    expect(() => asNextcloudCredential(null)).toThrow("expected an object");
    expect(() => asNextcloudCredential(undefined)).toThrow(
      "expected an object",
    );
  });

  it("throws when host is missing or empty", () => {
    expect(() =>
      asNextcloudCredential({ ...valid, host: undefined }),
    ).toThrow("host is required");
    expect(() => asNextcloudCredential({ ...valid, host: "" })).toThrow(
      "host is required",
    );
  });

  it("throws when username is missing or empty", () => {
    expect(() =>
      asNextcloudCredential({ ...valid, username: undefined }),
    ).toThrow("username is required");
    expect(() => asNextcloudCredential({ ...valid, username: "" })).toThrow(
      "username is required",
    );
  });

  it("throws when password is missing or empty", () => {
    expect(() =>
      asNextcloudCredential({ ...valid, password: undefined }),
    ).toThrow("password is required");
    expect(() => asNextcloudCredential({ ...valid, password: "" })).toThrow(
      "password is required",
    );
  });
});

describe("basicAuthHeader", () => {
  it("encodes username and password as Basic auth", () => {
    const header = basicAuthHeader({
      host: "https://cloud.example",
      username: "fairy",
      password: "secret",
    });
    expect(header).toBe(`Basic ${btoa("fairy:secret")}`);
  });
});
