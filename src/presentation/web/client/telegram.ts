/// <reference lib="dom" />

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
}

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramWebAppChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
}

export interface TelegramHapticFeedback {
  impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
  notificationOccurred(type: "error" | "success" | "warning"): void;
  selectionChanged(): void;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
    chat?: TelegramWebAppChat;
    start_param?: string;
  };
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  HapticFeedback?: TelegramHapticFeedback;
  ready(): void;
  expand(): void;
  close(): void;
  enableClosingConfirmation?(): void;
  disableClosingConfirmation?(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  openTelegramLink?(url: string): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}
