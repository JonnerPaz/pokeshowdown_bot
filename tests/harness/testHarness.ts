import type { Update, User, Chat, UserFromGetMe } from "grammy/types";
import { MainBot } from "../../src/presentation/mainbot.js";
import { MockTelegramClient } from "./mockTelegramClient.js";
import { InMemoryPokemonDataSource, InMemoryUserDataSource } from "./inMemoryDatasources.js";
import { RateLimiterService } from "../../src/presentation/services/rateLimiter.service.js";
import { BattleService } from "../../src/features/battle/battle.service.js";
import type { PokeApiService } from "../../src/presentation/services/pokeapi.service.js";
import { PokemonEntity } from "../../src/domain/entities/pokemon.entity.js";

export const createMockPokemon = (
  name: string,
  type: string,
  overrides: Partial<PokemonEntity> = {},
): PokemonEntity =>
  new PokemonEntity({
    id: 1,
    name,
    types: [type],
    ability: "overgrow",
    isShiny: false,
    sprites: {
      frontDefault: `https://example.com/${name}.png`,
      backDefault: `https://example.com/${name}-back.png`,
      frontShiny: `https://example.com/${name}-shiny.png`,
      backShiny: `https://example.com/${name}-back-shiny.png`,
    },
    timesCaught: 1,
    ...overrides,
  });

export interface TestBotContext {
  mainBot: MainBot;
  client: MockTelegramClient;
  userDataSource: InMemoryUserDataSource;
  pokemonDataSource: InMemoryPokemonDataSource;
  battleService: BattleService;
  dispatchUpdate: (update: Update) => Promise<void>;
  dispatchCommand: (
    command: string,
    opts?: { fromId?: number; username?: string; chatId?: number; isGroup?: boolean },
  ) => Promise<void>;
  dispatchCallback: (
    data: string,
    opts?: {
      fromId?: number;
      username?: string;
      chatId?: number;
      messageId?: number;
      isGroup?: boolean;
    },
  ) => Promise<void>;
  dispatchText: (
    text: string,
    opts?: { fromId?: number; username?: string; chatId?: number; isGroup?: boolean },
  ) => Promise<void>;
}

export async function createTestBot(options?: {
  pokeApiService?: Partial<PokeApiService>;
}): Promise<TestBotContext> {
  const client = new MockTelegramClient();
  const userDataSource = new InMemoryUserDataSource();
  const pokemonDataSource = new InMemoryPokemonDataSource(userDataSource);

  const defaultPokeApi = {
    createStarterPokemon: async () => [
      createMockPokemon("bulbasaur", "grass", { id: null }),
      createMockPokemon("charmander", "fire", { id: null }),
      createMockPokemon("squirtle", "water", { id: null }),
    ],
    createPokemon: async (nameOrId?: string | number) => {
      const name = typeof nameOrId === "string" ? nameOrId : "pikachu";
      return createMockPokemon(name, "electric", { id: null });
    },
    evolvePokemon: async (pokemon: PokemonEntity) => {
      if (pokemon.name === "charmander") {
        return createMockPokemon("charmeleon", "fire", {
          id: pokemon.id,
          timesCaught: pokemon.timesCaught,
        });
      }
      return pokemon;
    },
    getPokemonBaseStats: async () => ({
      hp: 70,
      attack: 70,
      defense: 70,
      specialAttack: 70,
      specialDefense: 70,
      speed: 70,
    }),
    getPokedexEntry: async (query: string | number) => {
      const q = String(query).toLowerCase();
      if (q.includes("unknown")) return null;
      return {
        id: 25,
        name: q,
        types: ["electric"],
        heightM: 0.4,
        weightKg: 6.0,
        ability: "static",
        flavorText: "When several of these Pokemon gather, electricity builds up.",
        spriteUrl: "https://example.com/sprite.png",
        stats: {
          hp: 35,
          attack: 55,
          defense: 40,
          specialAttack: 50,
          specialDefense: 50,
          speed: 90,
        },
        isLegendary: false,
        isMythical: false,
      };
    },
    getPokemonCaptureRate: async () => 255,
  };

  const mockPokeApi = {
    ...defaultPokeApi,
    ...options?.pokeApiService,
  } as unknown as PokeApiService;

  const rateLimiter = new RateLimiterService();
  const battleService = new BattleService(mockPokeApi, userDataSource, pokemonDataSource);

  const botInfo = {
    id: 123456789,
    is_bot: true,
    first_name: "PokeShowdownBot",
    username: "pokeshowdown_bot",
    can_join_groups: true,
    can_read_all_group_messages: true,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
    has_topics_enabled: false,
    allows_users_to_create_topics: false,
    can_manage_bots: false,
    supports_join_request_queries: false,
  } as UserFromGetMe;

  const mainBot = new MainBot("123456:FAKE_TELEGRAM_TOKEN_FOR_TESTS", {
    botConfig: {
      client: {
        fetch: client.createFetch(),
      },
      botInfo,
    },
    userDatasource: userDataSource,
    pokemonDatasource: pokemonDataSource,
    pokeApi: mockPokeApi,
    rateLimiter,
    battleService,
  });

  await mainBot.registerControllers();
  client.clear(); // Clear initial setMyCommands/deleteMyCommands calls from registration

  let updateIdCounter = 1;
  let messageIdCounter = 100;

  const dispatchUpdate = async (update: Update) => {
    await mainBot.bot.handleUpdate(update);
  };

  const dispatchCommand = async (
    commandWithSlash: string,
    opts: { fromId?: number; username?: string; chatId?: number; isGroup?: boolean } = {},
  ) => {
    const fromId = opts.fromId ?? 99901;
    const username = opts.username ?? `user_${fromId}`;
    const chatId = opts.chatId ?? (opts.isGroup ? -10099901 : fromId);
    const isGroup = opts.isGroup ?? chatId < 0;

    const from: User = {
      id: fromId,
      is_bot: false,
      first_name: `Trainer_${fromId}`,
      username,
    };

    const chat: Chat = (
      isGroup
        ? { id: chatId, type: "group", title: "Pokemon Battle Arena" }
        : {
            id: chatId,
            type: "private",
            first_name: from.first_name,
            ...(from.username !== undefined && { username: from.username }),
          }
    ) as Chat;

    const message = {
      message_id: messageIdCounter++,
      date: Math.floor(Date.now() / 1000),
      chat,
      from,
      text: commandWithSlash,
      entities: [
        {
          type: "bot_command" as const,
          offset: 0,
          length: commandWithSlash.split(" ")[0]!.length,
        },
      ],
    };

    const update = {
      update_id: updateIdCounter++,
      message,
    } as unknown as Update;

    await dispatchUpdate(update);
  };

  const dispatchCallback = async (
    data: string,
    opts: {
      fromId?: number;
      username?: string;
      chatId?: number;
      messageId?: number;
      isGroup?: boolean;
    } = {},
  ) => {
    const fromId = opts.fromId ?? 99901;
    const username = opts.username ?? `user_${fromId}`;
    const chatId = opts.chatId ?? (opts.isGroup ? -10099901 : fromId);
    const isGroup = opts.isGroup ?? chatId < 0;
    const messageId = opts.messageId ?? 1000;

    const from: User = {
      id: fromId,
      is_bot: false,
      first_name: `Trainer_${fromId}`,
      username,
    };

    const chat: Chat = (
      isGroup
        ? { id: chatId, type: "group", title: "Pokemon Battle Arena" }
        : {
            id: chatId,
            type: "private",
            first_name: from.first_name,
            ...(from.username !== undefined && { username: from.username }),
          }
    ) as Chat;

    const update = {
      update_id: updateIdCounter++,
      callback_query: {
        id: `cb_${updateIdCounter}`,
        from,
        chat_instance: `chat_${chatId}`,
        data,
        message: {
          message_id: messageId,
          date: Math.floor(Date.now() / 1000),
          chat,
          text: "Interactive message",
        },
      },
    } as unknown as Update;

    await dispatchUpdate(update);
  };

  const dispatchText = async (
    text: string,
    opts: { fromId?: number; username?: string; chatId?: number; isGroup?: boolean } = {},
  ) => {
    const fromId = opts.fromId ?? 99901;
    const username = opts.username ?? `user_${fromId}`;
    const chatId = opts.chatId ?? (opts.isGroup ? -10099901 : fromId);
    const isGroup = opts.isGroup ?? chatId < 0;

    const from: User = {
      id: fromId,
      is_bot: false,
      first_name: `Trainer_${fromId}`,
      username,
    };

    const chat: Chat = (
      isGroup
        ? { id: chatId, type: "group", title: "Pokemon Battle Arena" }
        : {
            id: chatId,
            type: "private",
            first_name: from.first_name,
            ...(from.username !== undefined && { username: from.username }),
          }
    ) as Chat;

    const message = {
      message_id: messageIdCounter++,
      date: Math.floor(Date.now() / 1000),
      chat,
      from,
      text,
    };

    const update = {
      update_id: updateIdCounter++,
      message,
    } as unknown as Update;

    await dispatchUpdate(update);
  };

  return {
    mainBot,
    client,
    userDataSource,
    pokemonDataSource,
    battleService,
    dispatchUpdate,
    dispatchCommand,
    dispatchCallback,
    dispatchText,
  };
}
