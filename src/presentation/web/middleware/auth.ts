import type { RequestHandler } from "express";
import type { UserDataSource } from "../../../domain/datasource/user.datasource.js";
import type { UserEntity } from "../../../domain/entities/users.entity.js";
import { InitDataError, validateInitData } from "../initData.js";
import { sendApiError } from "../errors.js";

export const INIT_DATA_HEADER = "x-telegram-init-data";

export interface AuthMiddlewareOptions {
  botToken: string;
  userDataSource: UserDataSource;
  maxAgeSeconds?: number | undefined;
}

export interface AuthenticatedLocals {
  telegramId: number;
  user: UserEntity;
}

/**
 * Resolves the caller from the `X-Telegram-Init-Data` header.
 *
 * Mini Apps run inside an iframe, where third-party cookies are blocked, so
 * the signed payload travels in a header on every request instead of a session
 * cookie. The header is never echoed back nor logged.
 */
export function requireTelegramUser(options: AuthMiddlewareOptions): RequestHandler {
  return async (req, res, next) => {
    const header = req.header(INIT_DATA_HEADER);
    if (!header) {
      sendApiError(res, 401, "missing_init_data", "X-Telegram-Init-Data header is required");
      return;
    }

    let telegramId: number;
    try {
      const initData = validateInitData(header, options.botToken, {
        ...(options.maxAgeSeconds !== undefined && { maxAgeSeconds: options.maxAgeSeconds }),
      });
      telegramId = initData.user.id;
    } catch (error) {
      if (error instanceof InitDataError) {
        sendApiError(res, 401, error.code, "Telegram authentication failed");
        return;
      }
      next(error);
      return;
    }

    const user = await options.userDataSource.findUserByTelegramId(telegramId);
    if (!user) {
      sendApiError(res, 404, "user_not_registered", "Start the bot in Telegram first");
      return;
    }

    const locals = res.locals as AuthenticatedLocals;
    locals.telegramId = telegramId;
    locals.user = user;
    next();
  };
}
