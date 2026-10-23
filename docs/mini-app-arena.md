# Mini App Arena

The Arena is a Telegram Mini App for visual, turn-based duels between two
trainers. It is served by the same process as the bot and is the only battle
system.

The Arena has visual sprites, live HP, turn deadlines, battle logs, automatic
ranking updates, and result announcements in group chats.

## Opening the Arena

- **Group chat:** `/battle` creates a room and posts a `startapp` deep link. A
  second trainer taps it to join.
- **Private chat:** `/battle` creates a room and posts a `web_app` button that
  opens the Arena directly.
- **Menu button:** when `WEBAPP_URL` is configured, the bot registers an
  **Open Arena** menu button.
- **Deep links:** `https://t.me/<bot>?startapp=<CODE>` opens the client with the
  room code in `start_param`.

The web layer requires `WEBAPP_URL` to be a public `https://` origin. If it is
empty or not HTTPS, `/api` and the menu button are disabled and `/battle` replies
that the Arena is unavailable.

## Match lifecycle

| State      | What happens                                                                 |
| :--------- | :--------------------------------------------------------------------------- |
| `open`     | The room waits for a second trainer and both Pokémon picks.                  |
| `battle`   | Both trainers picked; the battle starts automatically.                       |
| `finished` | A winner or draw is recorded; the result can be announced in the group chat. |

Rooms are created with a six-character code. The alphabet excludes `0`, `O`,
`1`, and `I` to avoid ambiguous codes.

## Rules

### Picks

- Both trainers must have at least one Pokémon in their active party.
- Each trainer picks a party Pokémon. Picks are frozen when the battle starts.
- The lobby shows a shared pick summary (name, sprite, types, shiny flag) before
  the battle.
- The battle starts as soon as both participants have picked.

### Turn order and actions

- The faster Pokémon acts first.
- A speed tie is resolved randomly inside `BattleEngine`.
- The available actions are `attack`, `special`, `defend`, and `charge`.
- Each turn has a deadline of **90 seconds** by default
  (`ARENA_TURN_TIMEOUT_SEC`).
- The battle is capped at **99 turns**. Exceeding the cap ends it as a draw.

### Absences and forfeits

- If the active trainer misses a turn, the engine auto-defends for them.
- A second consecutive missed turn ends the battle by abandonment.
- If the opponent has no missed turns, they win by abandonment and the result is
  ranked.
- If both trainers have missed turns, the result is unranked.
- Leaving during `open` removes the joiner; the creator closes the lobby.
- Leaving during `battle` forfeits the match for the leaving trainer.

### Ranking

`BattleService.recordBattleOutcome()` is the only ranking writer.

| Finish reason | Ranked? | Effects                                                                   |
| :------------ | :------ | :------------------------------------------------------------------------ |
| `knockout`    | Yes     | Winner `wins + 1`, loser `losses + 1`, winning Pokémon `timesCaught + 1`. |
| `forfeit`     | Yes     | Same as knockout.                                                         |
| `abandoned`   | Yes*    | Ranked when one trainer is present and the other abandoned.               |
| `turn_limit`  | No      | Draw; no win/loss or catch-count changes.                                 |

\* A double absence has no winner and is unranked.

### Timeouts and cleanup

- Open lobbies expire after **15 minutes**.
- Finished rooms expire after **10 minutes**.
- A background sweep runs every 60 seconds.
- The turn timer is cleared when the battle ends.

## Authentication

Every authenticated API request sends Telegram's signed `initData` in:

```http
X-Telegram-Init-Data: <initData>
```

The server:

1. Derives the signing secret from `WebAppData` and the bot token.
2. Validates the HMAC-SHA256 signature over the sorted data-check string.
3. Rejects payloads older than `WEBAPP_AUTH_MAX_AGE_SEC` (default 24 hours).
4. Resolves the Telegram ID to a registered trainer.

There are no cookies or server-side sessions. Missing or invalid init data
returns `401`; an unregistered trainer returns `404`.

## REST API

All routes below are under `/api`. Unless noted, they require the
`X-Telegram-Init-Data` header.

| Method | Path                     | Body                     | Response                        |
| :----- | :----------------------- | :----------------------- | :------------------------------ |
| `GET`  | `/health`                | —                        | `{ "status": "ok" }`            |
| `GET`  | `/me`                    | —                        | `{ user, party, botUsername }`  |
| `POST` | `/battles`               | —                        | `201 { room }`                  |
| `GET`  | `/battles/current`       | —                        | `{ room: Room \| null }`        |
| `POST` | `/battles/:code/join`    | —                        | `{ room }`                      |
| `POST` | `/battles/:code/pokemon` | `{ "pokemonId": 123 }`   | `{ room }`                      |
| `POST` | `/battles/:code/action`  | `{ "action": "attack" }` | `{ room, result }`              |
| `POST` | `/battles/:code/leave`   | —                        | `{ room: Room \| null }`        |
| `POST` | `/battles/:code/ticket`  | —                        | `{ ticket }`                    |
| `GET`  | `/battles/:code`         | —                        | `{ room }`                      |
| `GET`  | `/battles/:code/events`  | —                        | SSE stream; requires `?ticket=` |

`/health` is public. The SSE route is authenticated by its ticket instead of the
init-data header.

### Profile response

`GET /api/me` returns the trainer, their party, and the bot username:

```json
{
  "user": {
    "id": 1,
    "telegramId": "123456789",
    "username": "trainer",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "wins": 4,
    "losses": 2,
    "dailyStreak": 3,
    "buddyPokemonId": 12,
    "pokeballs": 8,
    "greatballs": 2,
    "ultraballs": 0,
    "masterballs": 0
  },
  "party": [],
  "botUsername": "pokeshowdown_bot"
}
```

### Room DTO

The client receives a room envelope such as `{ "room": { ... } }`. Important
fields:

| Field          | Meaning                                                          |
| :------------- | :--------------------------------------------------------------- |
| `code`         | Six-character room code.                                         |
| `status`       | `open`, `battle`, or `finished`.                                 |
| `revision`     | Monotonic cursor; ignore older revisions.                        |
| `participants` | Up to two trainers, pick summaries, and consecutive misses.      |
| `battle`       | Current battle state and trainer stats, or `null`.               |
| `turn`         | Current trainer and ISO deadline, or `null`.                     |
| `log`          | Ordered combat/system log entries.                               |
| `result`       | Winner and finish reason when finished, or `null`.               |
| `chatId`       | Group chat ID when the room came from a group; `null` otherwise. |

Telegram IDs and chat IDs are serialized as strings. Room and result DTOs never
contain `BigInt` values or timer handles.

## SSE stream

Native `EventSource` cannot attach custom headers, so the client first requests a
ticket:

```http
POST /api/battles/ABC123/ticket
X-Telegram-Init-Data: <initData>
```

The response is `{ "ticket": "..." }`. Tickets are stateless HMAC values bound to
the trainer and room, valid for **15 minutes**. Then:

```text
GET /api/battles/ABC123/events?ticket=...
```

The stream sends:

| Event      | Payload                                       |
| :--------- | :-------------------------------------------- |
| `snapshot` | Full room DTO; always the first frame.        |
| `room`     | Updated room DTO.                             |
| `turn`     | `{ room, result }` after a resolved action.   |
| `finished` | Final room DTO; the stream closes afterwards. |

Each event includes an SSE `id` equal to the room revision. A comment heartbeat
is sent every 25 seconds. A room allows at most four open streams; additional
connections receive `429 too_many_streams`.

The client uses `revision` to ignore stale frames, reconnects once with a fresh
ticket, and closes the stream when the room finishes.

## Errors

Errors use a consistent JSON shape:

```json
{
  "error": {
    "code": "not_your_turn",
    "message": "It is not your turn"
  }
}
```

Common codes:

| Code                   | Status | Meaning                                            |
| :--------------------- | :----- | :------------------------------------------------- |
| `missing_init_data`    | 401    | No authentication header.                          |
| `bad_signature`        | 401    | Invalid Telegram signature.                        |
| `expired`              | 401    | `initData` is too old.                             |
| `user_not_registered`  | 404    | Register in the bot first.                         |
| `room_not_found`       | 404    | Unknown room code.                                 |
| `not_participant`      | 403    | The caller is not in the room.                     |
| `not_your_turn`        | 403    | Another trainer is acting.                         |
| `empty_party`          | 409    | Move a Pokémon to the party first.                 |
| `already_in_room`      | 409    | One active room per trainer.                       |
| `room_full`            | 409    | The room already has two trainers.                 |
| `invalid_state`        | 409    | The action is not valid for the room state.        |
| `invalid_action`       | 400    | Action must be attack, special, defend, or charge. |
| `pokemon_not_owned`    | 403    | The picked Pokémon does not belong to you.         |
| `pokemon_not_in_party` | 409    | The picked Pokémon is in the box.                  |
| `invalid_pokemon`      | 400    | `pokemonId` is not an integer.                     |
| `too_many_streams`     | 429    | The room has four open SSE streams.                |
| `not_found`            | 404    | Unknown API route.                                 |
| `internal_error`       | 500    | Unexpected server error.                           |

Ticket validation uses `missing_ticket`, `malformed_ticket`,
`bad_ticket_signature`, `ticket_expired`, and `ticket_room_mismatch`.

## Client

The Mini App client lives in `src/presentation/web/client/`:

- `main.ts` owns state and actions.
- `render.ts` contains pure templates.
- `api.ts` sends the init-data header.
- `sse.ts` manages the native stream and ticket renewal.
- `i18n.ts` ships English and Spanish copy.
- `telegram.ts` applies theme colors and haptics.

The client uses Telegram's theme parameters, confirms closing during an active
battle, and shows home, lobby/pick, live battle, result, and error screens.

Build it with:

```bash
pnpm build:web
```

Vite writes hashed assets to `dist/web`. The server serves that directory
statically and falls back to `index.html` for client routes.
