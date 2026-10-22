import { createHmac, timingSafeEqual } from "node:crypto";

export type InitDataErrorCode =
  | "missing"
  | "missing_hash"
  | "malformed_hash"
  | "bad_signature"
  | "missing_auth_date"
  | "expired"
  | "missing_user"
  | "malformed_user";

export class InitDataError extends Error {
  public readonly code: InitDataErrorCode;

  constructor(code: InitDataErrorCode, message: string) {
    super(message);
    this.name = "InitDataError";
    this.code = code;
  }
}

export interface TelegramInitDataUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
}

export interface ValidatedInitData {
  user: TelegramInitDataUser;
  authDate: Date;
  queryId?: string;
  startParam?: string;
}

export interface ValidateInitDataOptions {
  /** Maximum accepted age in seconds. Set to 0 to disable the check. */
  maxAgeSeconds?: number;
  now?: Date;
}

export const DEFAULT_INIT_DATA_MAX_AGE_SECONDS = 86_400;

const HASH_PATTERN = /^[a-f0-9]{64}$/i;

interface RawTelegramUser {
  id?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  username?: unknown;
  language_code?: unknown;
  is_premium?: unknown;
}

/**
 * Validates the `initData` string Telegram hands to a Mini App.
 *
 * The signature is HMAC-SHA256 over a data-check-string (every field except
 * `hash`, sorted by key and joined with newlines). The secret is derived from
 * the bot token, so only Telegram and this bot can produce a valid payload.
 */
export function validateInitData(
  initData: string,
  botToken: string,
  options: ValidateInitDataOptions = {},
): ValidatedInitData {
  if (!initData || initData.trim() === "") {
    throw new InitDataError("missing", "initData is required");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new InitDataError("missing_hash", "initData does not include a hash");
  }
  if (!HASH_PATTERN.test(hash)) {
    throw new InitDataError("malformed_hash", "initData hash is malformed");
  }

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(buildDataCheckString(params)).digest();
  const received = Buffer.from(hash, "hex");

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new InitDataError("bad_signature", "initData signature is invalid");
  }

  const authDate = parseAuthDate(params);
  assertNotExpired(authDate, options);

  const queryId = params.get("query_id");
  const startParam = params.get("start_param");

  return {
    user: parseUser(params),
    authDate,
    ...(queryId ? { queryId } : {}),
    ...(startParam ? { startParam } : {}),
  };
}

function buildDataCheckString(params: URLSearchParams): string {
  return [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => (a === b ? 0 : a < b ? -1 : 1))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function parseAuthDate(params: URLSearchParams): Date {
  const seconds = Number(params.get("auth_date"));
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new InitDataError("missing_auth_date", "initData does not include a valid auth_date");
  }
  return new Date(seconds * 1000);
}

function assertNotExpired(authDate: Date, options: ValidateInitDataOptions): void {
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_INIT_DATA_MAX_AGE_SECONDS;
  if (maxAgeSeconds <= 0) return;

  const now = options.now ?? new Date();
  const ageSeconds = (now.getTime() - authDate.getTime()) / 1000;
  if (ageSeconds > maxAgeSeconds) {
    throw new InitDataError("expired", `initData is older than ${maxAgeSeconds} seconds`);
  }
}

function parseUser(params: URLSearchParams): TelegramInitDataUser {
  const raw = params.get("user");
  if (!raw) {
    throw new InitDataError("missing_user", "initData does not include a user");
  }

  let parsed: RawTelegramUser;
  try {
    parsed = JSON.parse(raw) as RawTelegramUser;
  } catch {
    throw new InitDataError("malformed_user", "initData user is not valid JSON");
  }

  if (typeof parsed.id !== "number" || !Number.isFinite(parsed.id)) {
    throw new InitDataError("malformed_user", "initData user does not include an id");
  }
  if (typeof parsed.first_name !== "string" || parsed.first_name === "") {
    throw new InitDataError("malformed_user", "initData user does not include a first name");
  }

  const user: TelegramInitDataUser = {
    id: parsed.id,
    firstName: parsed.first_name,
  };
  if (typeof parsed.last_name === "string") user.lastName = parsed.last_name;
  if (typeof parsed.username === "string") user.username = parsed.username;
  if (typeof parsed.language_code === "string") user.languageCode = parsed.language_code;
  if (typeof parsed.is_premium === "boolean") user.isPremium = parsed.is_premium;

  return user;
}
