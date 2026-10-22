import type {
  ArenaBattleTrainerDto,
  ArenaParticipantDto,
  ArenaRoomDto,
} from "../../../features/arena/arena.serializer.js";
import type { ArenaFinishReason } from "../../../features/arena/arena.types.js";
import type { SerializedPokemon, SerializedProfile } from "../serialize.js";
import { escapeHtml, initialOf, spriteImg, stripBattleMarkdown, typeChips } from "./dom.js";
import type { Translator, TranslationKey } from "./i18n.js";
import type { AppState } from "./types.js";

const REASON_KEYS: Record<ArenaFinishReason, TranslationKey> = {
  knockout: "reasonKnockout",
  forfeit: "reasonForfeit",
  abandoned: "reasonAbandoned",
  turn_limit: "reasonTurnLimit",
};

const LOG_ICONS: Record<string, string> = {
  attack: "&#9876;",
  special: "&#10024;",
  defend: "&#128737;",
  charge: "&#9889;",
  timeout: "&#9203;",
  system: "&#128227;",
};

export function renderLoading(t: Translator): string {
  return `<div class="app-shell"><main class="screen"><section class="card loading-card">
    <div class="spinner" aria-hidden="true"></div>
    <p>${escapeHtml(t("loading"))}</p>
  </section></main></div>`;
}

export function renderScreen(state: AppState, t: Translator): string {
  if (state.view === "error") return renderError(state, t);
  if (state.view === "home" || !state.room) return renderHome(state, t);
  return renderRoom(state, t);
}

function shell(
  state: AppState,
  t: Translator,
  content: string,
  options: { title: string; subtitle?: string; connection?: boolean },
): string {
  const subtitle = options.subtitle
    ? `<p class="topbar-subtitle">${escapeHtml(options.subtitle)}</p>`
    : "";

  return `<div class="app-shell">
    ${state.busy ? '<div class="busy-bar" aria-hidden="true"></div>' : ""}
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">&#9889;</span>
        <div>
          <h1>${escapeHtml(options.title)}</h1>
          ${subtitle}
        </div>
      </div>
      ${options.connection ? connectionBadge(state, t) : ""}
    </header>
    <main class="screen">
      ${renderNotice(state)}
      ${content}
    </main>
  </div>`;
}

function connectionBadge(state: AppState, t: Translator): string {
  if (state.streamStatus === "off") return "";

  const label =
    state.streamStatus === "live"
      ? t("live")
      : state.streamStatus === "reconnecting"
        ? t("reconnecting")
        : t("connecting");

  return `<span class="connection ${state.streamStatus}"><span class="dot"></span>${escapeHtml(label)}</span>`;
}

function renderNotice(state: AppState): string {
  if (!state.notice) return "";
  return `<div class="notice" role="alert">${escapeHtml(state.notice)}</div>`;
}

function renderHome(state: AppState, t: Translator): string {
  const profile = state.profile;
  if (!profile) return renderLoading(t);

  const { user, party } = profile;
  const battles = user.wins + user.losses;
  const winRate = battles === 0 ? 0 : Math.round((user.wins / battles) * 100);
  const canCreate = party.length > 0 && !state.busy;
  const partyStrip =
    party.length > 0
      ? `<div class="party-strip">${party
          .map((pokemon) =>
            spriteImg(
              pokemon.isShiny ? pokemon.sprites.frontShiny : pokemon.sprites.frontDefault,
              pokemon.nickname ?? pokemon.name,
              "strip-sprite",
            ),
          )
          .join("")}</div>`
      : `<p class="warning">${escapeHtml(t("emptyParty"))}</p>`;

  const content = `<section class="card profile-card">
      <div class="profile-head">
        <div class="avatar">${escapeHtml(initialOf(user.username))}</div>
        <div class="profile-meta">
          <h2>@${escapeHtml(user.username)}</h2>
          <p>${escapeHtml(t("trainer"))}</p>
        </div>
      </div>
      <dl class="stat-grid">
        <div><dt>${user.wins}</dt><dd>${escapeHtml(t("wins"))}</dd></div>
        <div><dt>${user.losses}</dt><dd>${escapeHtml(t("losses"))}</dd></div>
        <div><dt>${winRate}%</dt><dd>${escapeHtml(t("winRate"))}</dd></div>
      </dl>
      ${partyStrip}
    </section>

    <section class="card">
      <h2>${escapeHtml(t("createRoom"))}</h2>
      <p class="muted">${escapeHtml(t("createHint"))}</p>
      <button type="button" class="btn btn-primary btn-block" data-command="create" ${canCreate ? "" : "disabled"}>${escapeHtml(t("createRoom"))}</button>
    </section>

    <section class="card">
      <h2>${escapeHtml(t("joinRoom"))}</h2>
      <form class="join-form" data-command="join-form">
        <input
          name="code"
          type="text"
          maxlength="6"
          placeholder="${escapeHtml(t("joinPlaceholder"))}"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          aria-label="${escapeHtml(t("joinPlaceholder"))}"
          ${state.busy ? "disabled" : ""}
        >
        <button type="submit" class="btn btn-primary" ${state.busy ? "disabled" : ""}>${escapeHtml(t("join"))}</button>
      </form>
    </section>`;

  return shell(state, t, content, { title: t("appTitle") });
}

function renderRoom(state: AppState, t: Translator): string {
  const room = state.room;
  if (!room) return renderHome(state, t);

  const content =
    room.status === "open"
      ? renderLobby(state, room, t)
      : room.status === "battle"
        ? renderBattle(state, room, t)
        : renderFinished(state, room, t);

  return shell(state, t, content, {
    title: `#${room.code}`,
    subtitle: room.status === "open" ? t("lobby") : t("battle"),
    connection: true,
  });
}

function renderLobby(state: AppState, room: ArenaRoomDto, t: Translator): string {
  const myId = myTelegramId(state);
  const me = room.participants.find((participant) => participant.telegramId === myId) ?? null;
  const rival = room.participants.find((participant) => participant.telegramId !== myId) ?? null;
  const isCreator = room.creatorTelegramId === myId;
  const bothPicked =
    room.participants.length === 2 &&
    room.participants.every((participant) => participant.hasPicked);
  const canStart = isCreator && bothPicked && !state.busy;

  const hint =
    room.participants.length < 2
      ? t("waitingRival")
      : bothPicked
        ? isCreator
          ? ""
          : t("waitingHost")
        : t("waitingPicks");

  return `<section class="card code-card">
      <span class="eyebrow">${escapeHtml(t("roomCode"))}</span>
      <div class="room-code">${escapeHtml(room.code)}</div>
      <div class="code-actions">
        <button type="button" class="btn btn-small" data-command="copy">${escapeHtml(state.copied ? t("copied") : t("copyCode"))}</button>
        <button type="button" class="btn btn-small btn-primary" data-command="share">${escapeHtml(t("shareInvite"))}</button>
      </div>
    </section>

    <section class="duel-slots">
      ${me ? renderParticipantSlot(me, true, t) : ""}
      <div class="vs" aria-hidden="true">VS</div>
      ${
        rival
          ? renderParticipantSlot(rival, false, t)
          : `<article class="slot empty"><span class="slot-role">${escapeHtml(t("rival"))}</span><p>${escapeHtml(t("waitingRival"))}</p></article>`
      }
    </section>

    ${state.profile ? renderPartyPicker(state, room, state.profile, t) : ""}

    ${hint ? `<p class="muted center">${escapeHtml(hint)}</p>` : ""}
    ${
      isCreator
        ? `<button type="button" class="btn btn-primary btn-block" data-command="start" ${canStart ? "" : "disabled"}>${escapeHtml(t("startBattle"))}</button>`
        : ""
    }

    <div class="footer-actions">
      <button type="button" class="btn btn-ghost" data-command="leave" ${state.busy ? "disabled" : ""}>${escapeHtml(t("leaveRoom"))}</button>
    </div>
    ${state.confirmLeave ? renderConfirm(t("leaveConfirm"), "leave-confirm", "leave-cancel", t("leave"), t("cancel"), state.busy) : ""}`;
}

function renderParticipantSlot(
  participant: ArenaParticipantDto,
  isMe: boolean,
  t: Translator,
): string {
  const pick = participant.pokemon;
  const role = isMe ? t("you") : t("rival");
  const status = pick ? t("ready") : "...";

  return `<article class="slot ${isMe ? "is-me" : ""}">
    <div class="slot-head">
      <span class="slot-role">${escapeHtml(role)}</span>
      <span class="slot-status ${pick ? "ready" : ""}">${escapeHtml(status)}</span>
    </div>
    <div class="slot-name">@${escapeHtml(participant.username)}</div>
    ${
      pick
        ? `<div class="slot-pick">
            ${spriteImg(pick.spriteUrl, pick.name, "slot-sprite")}
            <div>
              <strong>${pick.isShiny ? "&#10022; " : ""}${escapeHtml(pick.name)}</strong>
              <div class="type-row">${typeChips(pick.types)}</div>
            </div>
          </div>`
        : `<div class="slot-placeholder" aria-hidden="true">&#9679;</div>`
    }
  </article>`;
}

function renderPartyPicker(
  state: AppState,
  room: ArenaRoomDto,
  profile: SerializedProfile,
  t: Translator,
): string {
  const myId = profile.user.telegramId;
  const me = room.participants.find((participant) => participant.telegramId === myId) ?? null;
  const selectedId = me?.pokemonId ?? null;
  const cards = profile.party.map((pokemon) => renderPartyCard(pokemon, selectedId, state, t));

  return `<section class="card">
    <h2>${escapeHtml(t("pickPokemon"))}</h2>
    <div class="party-grid">${cards.join("")}</div>
    ${me?.hasPicked ? `<p class="muted center">${escapeHtml(t("ready"))}</p>` : ""}
  </section>`;
}

function renderPartyCard(
  pokemon: SerializedPokemon,
  selectedId: number | null,
  state: AppState,
  t: Translator,
): string {
  if (pokemon.id === null) return "";

  const name = pokemon.nickname ?? pokemon.name;
  const source = pokemon.isShiny ? pokemon.sprites.frontShiny : pokemon.sprites.frontDefault;

  return `<button
      type="button"
      class="party-card ${selectedId === pokemon.id ? "selected" : ""}"
      data-command="pick"
      data-pokemon-id="${pokemon.id}"
      ${state.busy ? "disabled" : ""}
      aria-pressed="${selectedId === pokemon.id}"
      title="${escapeHtml(name)}"
    >
      ${spriteImg(source, name, "party-sprite")}
      <span class="party-name">${pokemon.isShiny ? "&#10022; " : ""}${escapeHtml(name)}</span>
      <span class="party-types">${typeChips(pokemon.types)}</span>
      ${selectedId === pokemon.id ? `<span class="party-check">${escapeHtml(t("ready"))}</span>` : ""}
    </button>`;
}

function renderBattle(state: AppState, room: ArenaRoomDto, t: Translator): string {
  const battle = room.battle;
  if (!battle) return renderLobby(state, room, t);

  const myId = myTelegramId(state);
  const { mine, rival } = trainersFor(battle.trainerA, battle.trainerB, myId);
  const isMyTurn = room.turn?.currentTelegramId === myId;
  const deadline = room.turn?.deadline ?? null;
  const disabled = state.busy || !isMyTurn ? "disabled" : "";

  const action = (kind: string, icon: string, label: string, hint: string): string =>
    `<button type="button" class="action" data-battle-action="${kind}" ${disabled} title="${escapeHtml(hint)}">
      <span class="action-icon" aria-hidden="true">${icon}</span>
      <span class="action-name">${escapeHtml(label)}</span>
      <span class="action-hint">${escapeHtml(hint)}</span>
    </button>`;

  return `<section class="turn-banner ${isMyTurn ? "mine" : ""}">
      <div class="turn-main"><span class="turn-dot" aria-hidden="true"></span><strong>${escapeHtml(isMyTurn ? t("yourTurn") : t("rivalTurn"))}</strong></div>
      <div class="turn-meta">
        <span>${escapeHtml(t("turn"))} ${battle.turnCount}</span>
        ${
          deadline
            ? `<span class="countdown" data-countdown="${escapeHtml(deadline)}" title="${escapeHtml(t("timeLeft"))}">--:--</span>`
            : ""
        }
      </div>
    </section>

    <section class="arena">
      ${renderFighter(mine, true, room.turn?.currentTelegramId === mine.telegramId, t)}
      <div class="arena-mid" aria-hidden="true">VS</div>
      ${renderFighter(rival, false, room.turn?.currentTelegramId === rival.telegramId, t)}
    </section>

    <section class="actions" aria-label="${escapeHtml(t("battle"))}">
      ${action("attack", "&#9876;", t("attack"), t("attackHint"))}
      ${action("special", "&#10024;", t("special"), t("specialHint"))}
      ${action("defend", "&#128737;", t("defend"), t("defendHint"))}
      ${action("charge", "&#9889;", t("charge"), t("chargeHint"))}
    </section>

    <div class="footer-actions">
      <button type="button" class="btn btn-danger btn-block" data-command="forfeit" ${state.busy ? "disabled" : ""}>${escapeHtml(t("forfeit"))}</button>
    </div>
    ${state.confirmForfeit ? renderConfirm(t("forfeitConfirm"), "forfeit-confirm", "forfeit-cancel", t("forfeit"), t("cancel"), state.busy) : ""}

    <section class="card log-card">
      <h2>${escapeHtml(t("battleLog"))}</h2>
      ${renderLog(room, t)}
    </section>`;
}

function renderFighter(
  trainer: ArenaBattleTrainerDto,
  isMe: boolean,
  active: boolean,
  t: Translator,
): string {
  const pokemon = trainer.pokemon;
  const percent =
    pokemon.maxHp > 0
      ? Math.max(0, Math.min(100, Math.round((pokemon.currentHp / pokemon.maxHp) * 100)))
      : 0;
  const hpState = percent <= 25 ? "low" : percent <= 50 ? "mid" : "high";
  const buffs = [
    pokemon.isDefending ? `<span class="buff">${escapeHtml(t("defend"))}</span>` : "",
    pokemon.isCharged ? `<span class="buff">${escapeHtml(t("charge"))}</span>` : "",
  ].join("");

  return `<article class="fighter ${isMe ? "is-me" : ""} ${active ? "active" : ""} ${pokemon.currentHp <= 0 ? "fainted" : ""}">
    <div class="fighter-head">
      <span class="fighter-role">${escapeHtml(isMe ? t("you") : t("rival"))}</span>
      <span class="fighter-trainer">@${escapeHtml(trainer.name)}</span>
    </div>
    ${spriteImg(pokemon.spriteUrl, pokemon.name, "fighter-sprite")}
    <h3 class="fighter-name">${pokemon.isShiny ? "&#10022; " : ""}${escapeHtml(pokemon.name)}</h3>
    <div class="type-row">${typeChips(pokemon.types)}</div>
    <div class="hp-row"><span>${escapeHtml(t("hp"))}</span><strong>${pokemon.currentHp} / ${pokemon.maxHp}</strong></div>
    <div class="hp-track"><div class="hp-fill ${hpState}" style="width: ${percent}%"></div></div>
    ${buffs ? `<div class="buff-row">${buffs}</div>` : ""}
    ${pokemon.currentHp <= 0 ? '<div class="ko">K.O.</div>' : ""}
  </article>`;
}

function renderLog(room: ArenaRoomDto, t: Translator): string {
  if (room.log.length === 0) {
    return `<p class="muted">${escapeHtml(t("noLog"))}</p>`;
  }

  const entries = room.log
    .slice(-12)
    .map(
      (entry) => `<li class="log-entry ${escapeHtml(entry.action)}">
        <span class="log-icon" aria-hidden="true">${LOG_ICONS[entry.action] ?? "&#9679;"}</span>
        <span class="log-text">${escapeHtml(stripBattleMarkdown(entry.message))}</span>
      </li>`,
    )
    .join("");

  return `<ol class="battle-log">${entries}</ol>`;
}

function renderFinished(state: AppState, room: ArenaRoomDto, t: Translator): string {
  const myId = myTelegramId(state);
  const winner = room.result?.winnerTelegramId ?? null;
  const outcome = winner === null ? "draw" : winner === myId ? "victory" : "defeat";
  const icon =
    outcome === "victory" ? "&#127942;" : outcome === "defeat" ? "&#128128;" : "&#129309;";
  const reasonKey = room.result ? REASON_KEYS[room.result.reason] : "reasonKnockout";
  const battle = room.battle;

  const arena = battle
    ? `<section class="arena finished">
        ${renderFighter(battle.trainerA, battle.trainerA.telegramId === myId, false, t)}
        <div class="arena-mid" aria-hidden="true">VS</div>
        ${renderFighter(battle.trainerB, battle.trainerB.telegramId === myId, false, t)}
      </section>`
    : "";

  return `<section class="card result-card ${outcome}">
      <div class="result-icon" aria-hidden="true">${icon}</div>
      <h2>${escapeHtml(t(outcome))}</h2>
      <p class="muted">${escapeHtml(t(reasonKey))}</p>
    </section>
    ${arena}
    <div class="footer-actions">
      <button type="button" class="btn btn-primary btn-block" data-command="play-again" ${state.busy ? "disabled" : ""}>${escapeHtml(t("playAgain"))}</button>
      <button type="button" class="btn btn-ghost btn-block" data-command="home">${escapeHtml(t("backHome"))}</button>
    </div>`;
}

function renderConfirm(
  message: string,
  confirmCommand: string,
  cancelCommand: string,
  confirmLabel: string,
  cancelLabel: string,
  busy: boolean,
): string {
  return `<div class="confirm" role="alertdialog">
    <p>${escapeHtml(message)}</p>
    <div class="confirm-actions">
      <button type="button" class="btn btn-ghost" data-command="${cancelCommand}" ${busy ? "disabled" : ""}>${escapeHtml(cancelLabel)}</button>
      <button type="button" class="btn btn-danger" data-command="${confirmCommand}" ${busy ? "disabled" : ""}>${escapeHtml(confirmLabel)}</button>
    </div>
  </div>`;
}

function renderError(state: AppState, t: Translator): string {
  const retry = state.retryable
    ? `<button type="button" class="btn btn-primary btn-block" data-command="retry">${escapeHtml(t("retry"))}</button>`
    : "";

  return `<div class="app-shell"><main class="screen"><section class="card fatal">
    <div class="fatal-icon" aria-hidden="true">&#9888;</div>
    <h2>${escapeHtml(t("appTitle"))}</h2>
    <p>${escapeHtml(state.error ?? t("noticeError"))}</p>
    ${retry}
  </section></main></div>`;
}

function myTelegramId(state: AppState): string | null {
  return state.profile?.user.telegramId ?? null;
}

function trainersFor(
  trainerA: ArenaBattleTrainerDto,
  trainerB: ArenaBattleTrainerDto,
  myId: string | null,
): { mine: ArenaBattleTrainerDto; rival: ArenaBattleTrainerDto } {
  if (trainerA.telegramId === myId) return { mine: trainerA, rival: trainerB };
  if (trainerB.telegramId === myId) return { mine: trainerB, rival: trainerA };
  return { mine: trainerA, rival: trainerB };
}
