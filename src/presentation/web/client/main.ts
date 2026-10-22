import type { ArenaRoomDto } from "../../../features/arena/arena.serializer.js";
import { ApiError, ArenaApi } from "./api.js";
import { createTranslator, detectLanguage, translateError } from "./i18n.js";
import { renderLoading, renderScreen } from "./render.js";
import { SseHttpError, subscribeToRoom } from "./sse.js";
import { getTelegramWebApp } from "./telegram.js";
import type { TelegramThemeParams } from "./telegram.js";
import type { AppState } from "./types.js";

const BATTLE_ACTIONS = ["attack", "special", "defend", "charge"] as const;
type BattleAction = (typeof BATTLE_ACTIONS)[number];

const THEME_VARIABLES: Array<[string, keyof TelegramThemeParams]> = [
  ["--tg-bg", "bg_color"],
  ["--tg-text", "text_color"],
  ["--tg-hint", "hint_color"],
  ["--tg-link", "link_color"],
  ["--tg-button", "button_color"],
  ["--tg-button-text", "button_text_color"],
  ["--tg-secondary-bg", "secondary_bg_color"],
  ["--tg-header-bg", "header_bg_color"],
];

const rootElement = document.querySelector<HTMLElement>("#app");
if (!rootElement) throw new Error("Mini App root element is missing");
const appRoot: HTMLElement = rootElement;

const telegram = getTelegramWebApp();
const initData = telegram?.initData ?? "";
const language = detectLanguage(telegram?.initDataUnsafe.user?.language_code);
const t = createTranslator(language);
const api = new ArenaApi(initData);

document.documentElement.lang = language;

const state: AppState = {
  view: "home",
  profile: null,
  room: null,
  error: null,
  retryable: false,
  notice: null,
  busy: false,
  streamStatus: "off",
  confirmLeave: false,
  confirmForfeit: false,
  copied: false,
};

let stopStream: (() => void) | null = null;
let lastErrorCode: string | null = null;
const refreshedRooms = new Set<string>();

function applyTheme(): void {
  if (!telegram) return;

  for (const [cssVariable, key] of THEME_VARIABLES) {
    const value = telegram.themeParams[key];
    if (value) {
      document.documentElement.style.setProperty(
        cssVariable,
        value.startsWith("#") ? value : `#${value}`,
      );
    }
  }

  document.documentElement.dataset.theme = telegram.colorScheme;
  telegram.setHeaderColor?.("secondary_bg_color");
  telegram.setBackgroundColor?.("bg_color");
}

function render(): void {
  appRoot.innerHTML = renderScreen(state, t);
  updateCountdowns();
  scrollBattleLog();
}

function showLoading(): void {
  appRoot.innerHTML = renderLoading(t);
}

function showFatal(message: string, retryable: boolean): void {
  stopStream?.();
  stopStream = null;
  state.view = "error";
  state.error = message;
  state.retryable = retryable;
  state.busy = false;
  state.streamStatus = "off";
  render();
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return translateError(t, error.code);
  if (error instanceof SseHttpError) return translateError(t, error.code);
  return t("noticeError");
}

async function boot(): Promise<void> {
  if (!telegram || !initData) {
    showFatal(t("notInTelegram"), false);
    return;
  }

  telegram.ready();
  telegram.expand();
  applyTheme();
  showLoading();

  try {
    const [profile, room] = await Promise.all([api.getProfile(), api.getCurrentRoom()]);
    state.profile = profile;
    state.error = null;
    state.retryable = false;
    state.notice = null;

    if (room) {
      state.room = room;
      state.view = "room";
      updateClosingConfirmation(room);
      attachStream(room.code);
    } else {
      state.room = null;
      state.view = "home";
      telegram.disableClosingConfirmation?.();
    }

    render();
  } catch (error) {
    showFatal(messageFor(error), true);
  }
}

async function withBusy<T>(operation: () => Promise<T>): Promise<T | null> {
  if (state.busy) return null;

  lastErrorCode = null;
  state.busy = true;
  state.notice = null;
  state.confirmLeave = false;
  state.confirmForfeit = false;
  render();

  try {
    return await operation();
  } catch (error) {
    lastErrorCode = error instanceof ApiError ? error.code : null;
    state.notice = messageFor(error);
    return null;
  } finally {
    state.busy = false;
    render();
  }
}

function enterRoom(room: ArenaRoomDto): void {
  state.room = room;
  state.view = "room";
  state.notice = null;
  updateClosingConfirmation(room);
  attachStream(room.code);
  render();
}

function applyRoom(room: ArenaRoomDto): void {
  if (state.room && state.room.code === room.code && room.revision < state.room.revision) return;

  state.room = room;
  state.view = "room";
  state.notice = null;

  if (room.status === "finished") {
    state.confirmForfeit = false;
    state.confirmLeave = false;
    state.streamStatus = "off";
    stopStream?.();
    stopStream = null;

    if (!refreshedRooms.has(room.code)) {
      refreshedRooms.add(room.code);
      void refreshProfile();
    }
  }

  updateClosingConfirmation(room);
  render();
}

async function refreshProfile(): Promise<void> {
  try {
    const profile = await api.getProfile();
    state.profile = profile;
    render();
  } catch {
    // The battle result is already final; a stale profile card is harmless.
  }
}

function updateClosingConfirmation(room: ArenaRoomDto | null): void {
  if (room?.status === "battle") telegram?.enableClosingConfirmation?.();
  else telegram?.disableClosingConfirmation?.();
}

function attachStream(code: string): void {
  stopStream?.();
  stopStream = subscribeToRoom({
    code,
    initData,
    handlers: {
      onStatus(status) {
        if (state.streamStatus === status) return;
        state.streamStatus = status;
        render();
      },
      onEvent(message) {
        handleStreamMessage(message.event, message.data);
      },
      onFatal(error) {
        state.streamStatus = "off";
        state.notice = messageFor(error);
        render();
      },
    },
  });
}

function handleStreamMessage(event: string, data: string): void {
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    return;
  }

  if (event === "turn") {
    const room = (payload as { room?: ArenaRoomDto }).room;
    if (room && typeof room.code === "string") applyRoom(room);
    return;
  }

  if (event === "snapshot" || event === "room" || event === "finished") {
    const room = payload as ArenaRoomDto;
    if (room && typeof room === "object" && typeof room.code === "string") applyRoom(room);
  }
}

async function createRoom(): Promise<void> {
  refreshedRooms.clear();
  const room = await withBusy(() => api.createRoom(telegram?.initDataUnsafe.chat?.id ?? null));
  if (!room) return;
  enterRoom(room);
}

async function joinRoom(rawCode: string): Promise<void> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    state.notice = t("roomNotFound");
    render();
    return;
  }

  const room = await withBusy(() => api.joinRoom(code));
  if (room) {
    enterRoom(room);
    return;
  }

  if (lastErrorCode === "already_in_room") {
    await syncCurrentRoom();
  }
}

async function syncCurrentRoom(): Promise<void> {
  try {
    const room = await api.getCurrentRoom();
    if (room) enterRoom(room);
  } catch {
    // Keep the notice already shown by the failed join attempt.
  }
}

async function pickPokemon(pokemonId: number): Promise<void> {
  const code = state.room?.code;
  if (!code) return;
  const room = await withBusy(() => api.pickPokemon(code, pokemonId));
  if (room) applyRoom(room);
}

async function startBattle(): Promise<void> {
  const code = state.room?.code;
  if (!code) return;
  const room = await withBusy(() => api.startBattle(code));
  if (room) applyRoom(room);
}

async function submitAction(action: BattleAction): Promise<void> {
  const code = state.room?.code;
  if (!code) return;

  const response = await withBusy(() => api.submitAction(code, action));
  if (!response) return;

  haptic("impact");
  applyRoom(response.room);
}

async function forfeit(): Promise<void> {
  const code = state.room?.code;
  if (!code) return;

  const room = await withBusy(() => api.forfeit(code));
  if (room) {
    haptic("warning");
    applyRoom(room);
  }
}

async function leaveRoom(): Promise<void> {
  const code = state.room?.code;
  if (!code) return;

  await withBusy(() => api.leaveRoom(code));
  haptic("selection");
  goHome();
}

function goHome(): void {
  stopStream?.();
  stopStream = null;
  state.room = null;
  state.view = "home";
  state.streamStatus = "off";
  state.notice = null;
  state.confirmLeave = false;
  state.confirmForfeit = false;
  telegram?.disableClosingConfirmation?.();
  render();
}

async function copyCode(): Promise<void> {
  const code = state.room?.code;
  if (!code) return;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      fallbackCopy(code);
    }
  } else {
    fallbackCopy(code);
  }

  haptic("selection");
  state.copied = true;
  render();
  setTimeout(() => {
    state.copied = false;
    render();
  }, 1_500);
}

function fallbackCopy(value: string): void {
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();

  try {
    document.execCommand("copy");
  } catch {
    // Clipboard access is best-effort inside the Telegram iframe.
  } finally {
    area.remove();
  }
}

function shareCode(): void {
  const code = state.room?.code;
  if (!code) return;

  const text = t("shareText", { code });
  const url = window.location.origin;

  if (telegram?.openTelegramLink) {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    telegram.openTelegramLink(shareUrl);
    return;
  }

  if (navigator.share) {
    void navigator.share({ text, url }).catch(() => undefined);
    return;
  }

  void copyCode();
}

function haptic(kind: "impact" | "success" | "selection" | "warning"): void {
  const feedback = telegram?.HapticFeedback;
  if (!feedback) return;

  if (kind === "impact") feedback.impactOccurred("light");
  else if (kind === "selection") feedback.selectionChanged();
  else feedback.notificationOccurred(kind);
}

function isBattleAction(value: string | undefined): value is BattleAction {
  return value !== undefined && (BATTLE_ACTIONS as readonly string[]).includes(value);
}

function updateCountdowns(): void {
  const now = Date.now();

  for (const node of document.querySelectorAll<HTMLElement>("[data-countdown]")) {
    const iso = node.dataset.countdown;
    if (!iso) continue;

    const deadline = Date.parse(iso);
    if (Number.isNaN(deadline)) continue;

    node.textContent = formatDuration(Math.max(0, deadline - now));
  }
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function scrollBattleLog(): void {
  const log = appRoot?.querySelector<HTMLElement>(".battle-log");
  if (log) log.scrollTop = log.scrollHeight;
}

function handleCommand(command: string, element: HTMLElement): void {
  switch (command) {
    case "retry":
      void boot();
      break;
    case "create":
    case "play-again":
      void createRoom();
      break;
    case "copy":
      void copyCode();
      break;
    case "share":
      shareCode();
      break;
    case "pick": {
      const raw = element.dataset.pokemonId;
      const pokemonId = raw ? Number(raw) : Number.NaN;
      if (Number.isInteger(pokemonId)) void pickPokemon(pokemonId);
      break;
    }
    case "start":
      void startBattle();
      break;
    case "leave":
      state.confirmLeave = true;
      state.confirmForfeit = false;
      render();
      break;
    case "leave-cancel":
      state.confirmLeave = false;
      render();
      break;
    case "leave-confirm":
      void leaveRoom();
      break;
    case "forfeit":
      state.confirmForfeit = true;
      state.confirmLeave = false;
      render();
      break;
    case "forfeit-cancel":
      state.confirmForfeit = false;
      render();
      break;
    case "forfeit-confirm":
      void forfeit();
      break;
    case "home":
      goHome();
      break;
    default:
      break;
  }
}

appRoot.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const battleButton = target.closest<HTMLElement>("button[data-battle-action]");
  if (battleButton) {
    event.preventDefault();
    const action = battleButton.dataset.battleAction;
    if (isBattleAction(action)) void submitAction(action);
    return;
  }

  const commandButton = target.closest<HTMLElement>("button[data-command]");
  if (!commandButton) return;

  event.preventDefault();
  const command = commandButton.dataset.command;
  if (command) handleCommand(command, commandButton);
});

appRoot.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.dataset.command !== "join-form") return;

  event.preventDefault();
  const code = new FormData(form).get("code");
  if (typeof code === "string") void joinRoom(code);
});

setInterval(updateCountdowns, 1_000);
void boot();
