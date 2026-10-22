import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  InitDataError,
  validateInitData,
  type InitDataErrorCode,
} from "../../../src/presentation/web/initData.js";

const BOT_TOKEN = "123456:TEST_TOKEN";
const USER = {
  id: 42,
  first_name: "Ash",
  username: "ash_ketchum",
  language_code: "es",
  is_premium: true,
};

interface SignOptions {
  token?: string;
  hash?: string | null;
}

function sign(fields: Record<string, string>, options: SignOptions = {}): string {
  const dataCheckString = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData")
    .update(options.token ?? BOT_TOKEN)
    .digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const params = new URLSearchParams(fields);
  if (options.hash === null) {
    params.delete("hash");
  } else {
    params.set("hash", options.hash ?? hash);
  }
  return params.toString();
}

function baseFields(authDateSeconds = Math.floor(Date.now() / 1000)): Record<string, string> {
  return {
    auth_date: String(authDateSeconds),
    query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
    user: JSON.stringify(USER),
  };
}

function expectCode(initData: string, code: InitDataErrorCode): void {
  try {
    validateInitData(initData, BOT_TOKEN);
    throw new Error("expected validateInitData to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(InitDataError);
    expect((error as InitDataError).code).toBe(code);
  }
}

describe("validateInitData", () => {
  it("accepts a payload signed with the bot token", () => {
    const result = validateInitData(sign(baseFields()), BOT_TOKEN);

    expect(result.user).toEqual({
      id: 42,
      firstName: "Ash",
      username: "ash_ketchum",
      languageCode: "es",
      isPremium: true,
    });
    expect(result.authDate.getTime()).toBeLessThanOrEqual(Date.now());
    expect(result.queryId).toBe("AAHdF6IQAAAAAN0XohDhrOrc");
  });

  it("includes unknown fields in the data-check-string", () => {
    const fields = { ...baseFields(), signature: "abc", chat_instance: "-100999" };

    expect(() => validateInitData(sign(fields), BOT_TOKEN)).not.toThrow();
  });

  it("handles URL-encoded values without mangling the signature", () => {
    const fields = {
      ...baseFields(),
      user: JSON.stringify({ ...USER, first_name: "Ash Ketchum+", username: "ash ketchum" }),
    };

    const result = validateInitData(sign(fields), BOT_TOKEN);
    expect(result.user.firstName).toBe("Ash Ketchum+");
    expect(result.user.username).toBe("ash ketchum");
  });

  it("rejects a payload signed with another token", () => {
    expectCode(sign(baseFields(), { token: "999:OTHER" }), "bad_signature");
  });

  it("rejects a payload whose fields were tampered with", () => {
    const initData = sign(baseFields());
    const tampered = initData.replace("ash_ketchum", "team_rocket");

    expectCode(tampered, "bad_signature");
  });

  it("rejects an empty payload", () => {
    expectCode("", "missing");
  });

  it("rejects a payload without hash", () => {
    expectCode(sign(baseFields(), { hash: null }), "missing_hash");
  });

  it("rejects a malformed hash", () => {
    expectCode(sign(baseFields(), { hash: "not-a-hash" }), "malformed_hash");
  });

  it("rejects an expired payload", () => {
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;

    expectCode(sign(baseFields(twoDaysAgo)), "expired");
  });

  it("accepts an old payload when the age check is disabled", () => {
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;

    const result = validateInitData(sign(baseFields(twoDaysAgo)), BOT_TOKEN, { maxAgeSeconds: 0 });
    expect(result.user.id).toBe(42);
  });

  it("rejects a payload without auth_date", () => {
    const rest = baseFields();
    delete rest.auth_date;

    expectCode(sign(rest), "missing_auth_date");
  });

  it("rejects a payload without user", () => {
    const rest = baseFields();
    delete rest.user;

    expectCode(sign(rest), "missing_user");
  });

  it("rejects a user that is not valid JSON", () => {
    expectCode(sign({ ...baseFields(), user: "{not-json" }), "malformed_user");
  });

  it("rejects a user without id", () => {
    expectCode(
      sign({ ...baseFields(), user: JSON.stringify({ first_name: "Ash" }) }),
      "malformed_user",
    );
  });
});
