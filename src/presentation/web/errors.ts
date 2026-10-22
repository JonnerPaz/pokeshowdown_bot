import type { Response } from "express";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export function sendApiError(res: Response, status: number, code: string, message: string): void {
  const body: ApiErrorBody = { error: { code, message } };
  res.status(status).json(body);
}
