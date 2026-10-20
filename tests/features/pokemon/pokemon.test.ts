import { describe, expect, it, vi } from "vitest";
import { createMockPokemon, createTestBot } from "../../harness/testHarness.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";
import { MAX_PKMN_PARTY } from "../../../src/domain/data/constants.js";

describe("Pokemon Operations Integration (/pokemons, /generate_pokemon)", () => {
  it("shows error when unregistered user attempts to view pokemons", async () => {
    const { dispatchCommand, client } = await createTestBot();

    await dispatchCommand("/pokemons", { fromId: 801 });

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("not registered"))).toBe(true);
  });

  it("shows empty collection message when user has no pokemons", async () => {
    const { dispatchCommand, client, userDataSource } = await createTestBot();

    const userId = 802;
    userDataSource.seedUser(
      new UserEntity({
        id: 20,
        telegramId: BigInt(userId),
        username: "empty_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
      }),
    );

    await dispatchCommand("/pokemons", { fromId: userId });

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("don't have any pokemon yet"))).toBe(true);
  });

  it("displays pokemon collection for registered users", async () => {
    const { dispatchCommand, client, userDataSource } = await createTestBot();

    const userId = 803;
    const pikachu = createMockPokemon("pikachu", "electric");
    userDataSource.seedUser(
      new UserEntity({
        id: 21,
        telegramId: BigInt(userId),
        username: "ash_pallet",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [pikachu],
      }),
    );

    await dispatchCommand("/pokemons", { fromId: userId });

    const sent = client.getSentMessages();
    expect(
      sent.some((m) => m.text?.includes("Your Pokémon Party") && m.text?.includes("Pikachu")),
    ).toBe(true);
  });

  it("handles collections with more than 10 pokemons via interactive carousel without spamming media groups", async () => {
    const { dispatchCommand, client, userDataSource } = await createTestBot();

    const userId = 809;
    const pokemons = Array.from({ length: 15 }, (_, i) =>
      createMockPokemon(`pkm_${i}`, "normal", { id: i + 1 }),
    );
    userDataSource.seedUser(
      new UserEntity({
        id: 29,
        telegramId: BigInt(userId),
        username: "collector_gary",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons,
      }),
    );

    await dispatchCommand("/pokemons", { fromId: userId });

    const sent = client.getSentMessages();
    expect(
      sent.some((m) => m.text?.includes("Your Pokémon Party") && m.text?.includes("1/15")),
    ).toBe(true);
  });

  it("navigates through pokemon carousel via inline buttons", async () => {
    const { dispatchCommand, dispatchCallback, client, userDataSource } = await createTestBot();

    const userId = 812;
    const p1 = createMockPokemon("bulbasaur", "grass", { id: 31 });
    const p2 = createMockPokemon("charmander", "fire", { id: 32 });
    userDataSource.seedUser(
      new UserEntity({
        id: 30,
        telegramId: BigInt(userId),
        username: "carousel_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [p1, p2],
      }),
    );

    await dispatchCommand("/pokemons", { fromId: userId });

    // Navigate to next pokemon (index 1)
    await dispatchCallback(`pkmn:nav:1:${userId}`, { fromId: userId });

    const editCalls = client.getCalls("editMessageMedia");
    expect(editCalls.length).toBeGreaterThan(0);
    const mediaPayload = editCalls[0]?.payload?.media as { caption?: string } | undefined;
    expect(mediaPayload?.caption).toContain("Charmander");
    expect(mediaPayload?.caption).toContain("2/2");
  });

  it("sets active buddy directly from pokemon carousel", async () => {
    const { dispatchCommand, dispatchCallback, client, userDataSource } = await createTestBot();

    const userId = 813;
    const p1 = createMockPokemon("squirtle", "water", { id: 41 });
    const p2 = createMockPokemon("wartortle", "water", { id: 42 });
    userDataSource.seedUser(
      new UserEntity({
        id: 31,
        telegramId: BigInt(userId),
        username: "buddy_setter",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [p1, p2],
        buddyPokemonId: 41,
      }),
    );

    await dispatchCommand("/pokemons", { fromId: userId });

    // Set p2 (wartortle, id 42) as buddy
    await dispatchCallback(`pkmn:buddy:42:1:${userId}`, { fromId: userId });

    const updatedUser = await userDataSource.findUserByTelegramId(userId);
    expect(updatedUser?.buddyPokemonId).toBe(42);

    const answerCalls = client.getCalls("answerCallbackQuery");
    expect(
      answerCalls.some(
        (c) => typeof c.payload?.text === "string" && c.payload.text.includes("companion buddy"),
      ),
    ).toBe(true);
  });

  it("guards pokemon carousel buttons against unauthorized users", async () => {
    const { dispatchCallback, client } = await createTestBot();

    const ownerId = 814;
    const intruderId = 999;

    // Intruder taps carousel button belonging to ownerId
    await dispatchCallback(`pkmn:nav:1:${ownerId}`, { fromId: intruderId });

    const answerCalls = client.getCalls("answerCallbackQuery");
    expect(answerCalls.length).toBeGreaterThan(0);
    const lastAnswer = answerCalls[answerCalls.length - 1];
    expect(lastAnswer?.payload?.text).toContain("not your Pokémon party");
    expect(lastAnswer?.payload?.show_alert).toBe(true);
  });

  it("toggles party roster text overview from carousel", async () => {
    const { dispatchCommand, dispatchCallback, client, userDataSource } = await createTestBot();

    const userId = 815;
    const p1 = createMockPokemon("eevee", "normal", { id: 51 });
    userDataSource.seedUser(
      new UserEntity({
        id: 32,
        telegramId: BigInt(userId),
        username: "roster_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [p1],
      }),
    );

    await dispatchCommand("/pokemons", { fromId: userId });

    // Toggle to roster view
    await dispatchCallback(`pkmn:roster:0:${userId}`, { fromId: userId });

    const captionCalls = client.getCalls("editMessageCaption");
    expect(captionCalls.length).toBeGreaterThan(0);
    const caption = captionCalls[0]?.payload?.caption;
    expect(typeof caption === "string" && caption.includes("Party")).toBe(true);
    expect(typeof caption === "string" && caption.includes("Eevee")).toBe(true);
  });

  it("renders a detailed summary for a pokemon matched by name", async () => {
    const { dispatchCommand, client, userDataSource } = await createTestBot();

    const userId = 813;
    const pikachu = createMockPokemon("pikachu", "electric", { id: 401, timesCaught: 3 });
    userDataSource.seedUser(
      new UserEntity({
        id: 33,
        telegramId: BigInt(userId),
        username: "summary_ash",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [pikachu],
      }),
    );

    await dispatchCommand("/pokemonsummary pikachu", { fromId: userId });

    const summary = client.getSentMessages().find((m) => m.text?.includes("POKÉMON SUMMARY"));
    expect(summary).toBeDefined();
    expect(summary?.text).toContain("PIKACHU");
    expect(summary?.text).toContain("*Caught:* 3x");
    expect(summary?.text).toContain("*Level:* 35");
    expect(summary?.text).toContain("⚡ Electric");
  });

  it("prompts for a name and matches by nickname when no argument is given", async () => {
    const { dispatchCommand, dispatchText, client, userDataSource } = await createTestBot();

    const userId = 814;
    const eevee = createMockPokemon("eevee", "normal", { id: 402, nickname: "Fluffy" });
    userDataSource.seedUser(
      new UserEntity({
        id: 34,
        telegramId: BigInt(userId),
        username: "nick_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [eevee],
      }),
    );

    const summaryPromise = dispatchCommand("/pokemonsummary", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(
      client
        .getSentMessages()
        .some((m) => m.text?.includes("Which pokemon do you want a summary of")),
    ).toBe(true);

    await dispatchText("fluffy", { fromId: userId });
    await summaryPromise;

    const summary = client.getSentMessages().find((m) => m.text?.includes("POKÉMON SUMMARY"));
    expect(summary?.text).toContain("*Nickname:* Fluffy");
  });

  it("reports when the requested pokemon is not owned", async () => {
    const { dispatchCommand, client, userDataSource } = await createTestBot();

    const userId = 815;
    userDataSource.seedUser(
      new UserEntity({
        id: 35,
        telegramId: BigInt(userId),
        username: "small_bag",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("pikachu", "electric", { id: 403 })],
      }),
    );

    await dispatchCommand("/pokemonsummary mewtwo", { fromId: userId });

    expect(
      client.getSentMessages().some((m) => m.text?.includes("don't have a pokemon named")),
    ).toBe(true);
  });

  it("rejects /pokemonsummary for unregistered users", async () => {
    const { dispatchCommand, client } = await createTestBot();

    await dispatchCommand("/pokemonsummary", { fromId: 816 });

    expect(client.getSentMessages().some((m) => m.text?.includes("not registered"))).toBe(true);
  });

  it("rejects /trade outside of a group chat", async () => {
    const { dispatchCommand, client, userDataSource } = await createTestBot();

    const userId = 817;
    userDataSource.seedUser(
      new UserEntity({
        id: 36,
        telegramId: BigInt(userId),
        username: "lonely_trader",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("pikachu", "electric", { id: 404 })],
      }),
    );

    await dispatchCommand("/trade", { fromId: userId });

    expect(client.getSentMessages().some((m) => m.text?.includes("group chat"))).toBe(true);
  });

  it("completes wild encounter and catch flow successfully", async () => {
    const { dispatchCommand, dispatchCallback, client, userDataSource } = await createTestBot();

    const userId = 804;
    const starter = createMockPokemon("squirtle", "water");
    userDataSource.seedUser(
      new UserEntity({
        id: 22,
        telegramId: BigInt(userId),
        username: "catcher_sam",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [starter],
      }),
    );

    // 1. Trigger wild spawn
    const spawnPromise = dispatchCommand("/generate_pokemon", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 2. Click catch button
    await dispatchCallback("catch", { fromId: userId });
    await spawnPromise;

    // 3. Verify user's collection now has the caught pokemon
    const user = await userDataSource.findUserByTelegramId(userId);
    expect(user?.pokemons.length).toBe(2);

    // 4. Verify celebratory message was sent
    const sent = client.getSentMessages();
    expect(
      sent.some((m) => m.text?.includes("Congratulations") || m.text?.includes("caught")),
    ).toBe(true);
  });

  it("enforces rate limits when generating pokemon too rapidly", async () => {
    const { dispatchCommand, client, userDataSource } = await createTestBot();

    const userId = 805;
    userDataSource.seedUser(
      new UserEntity({
        id: 23,
        telegramId: BigInt(userId),
        username: "spammer_ted",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
      }),
    );

    // Hit the rate limit by calling spawn multiple times across groups
    for (let i = 1; i <= 6; i++) {
      await dispatchCommand("/generate_pokemon", {
        fromId: userId,
        chatId: -100500 - i,
        isGroup: true,
      });
    }

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("Slow down"))).toBe(true);
  });

  it("deducts the correct ball type when catching with a Great Ball", async () => {
    const { dispatchCommand, dispatchCallback, client, userDataSource } = await createTestBot();

    const userId = 806;
    userDataSource.seedUser(
      new UserEntity({
        id: 24,
        telegramId: BigInt(userId),
        username: "greatball_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
        pokeballs: 10,
        greatballs: 2,
        ultraballs: 0,
        masterballs: 0,
      }),
    );

    const spawnPromise = dispatchCommand("/generate_pokemon", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));

    await dispatchCallback("catch:greatball", { fromId: userId });
    await spawnPromise;

    const user = await userDataSource.findUserByTelegramId(userId);
    expect(user?.greatballs).toBe(1);
    expect(user?.pokeballs).toBe(10);
    expect(user?.pokemons.length).toBe(1);

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("caught") && m.text?.includes("Great Ball"))).toBe(
      true,
    );
  });

  it("handles 0-ball selection gracefully and allows subsequent valid throw", async () => {
    const { dispatchCommand, dispatchCallback, userDataSource } = await createTestBot();

    const userId = 807;
    userDataSource.seedUser(
      new UserEntity({
        id: 25,
        telegramId: BigInt(userId),
        username: "smart_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
        pokeballs: 5,
        greatballs: 0,
        ultraballs: 0,
        masterballs: 0,
      }),
    );

    const spawnPromise = dispatchCommand("/generate_pokemon", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Try throwing Master Ball (0 in stock)
    await dispatchCallback("catch:masterball", { fromId: userId });

    // Inventory unchanged
    let user = await userDataSource.findUserByTelegramId(userId);
    expect(user?.masterballs).toBe(0);
    expect(user?.pokeballs).toBe(5);

    // Now throw Pokéball (has 5)
    await dispatchCallback("catch:pokeball", { fromId: userId });
    await spawnPromise;

    user = await userDataSource.findUserByTelegramId(userId);
    expect(user?.pokeballs).toBe(4);
    expect(user?.pokemons.length).toBe(1);
  });

  it("routes caught pokemon to PC storage box when party is full", async () => {
    const { dispatchCommand, dispatchCallback, userDataSource } = await createTestBot();

    const userId = 810;
    const party = Array.from({ length: 6 }, (_, i) =>
      createMockPokemon(`party_${i}`, "normal", { id: 200 + i }),
    );
    userDataSource.seedUser(
      new UserEntity({
        id: 30,
        telegramId: BigInt(userId),
        username: "full_party_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: party,
        pokeballs: 5,
        greatballs: 0,
        ultraballs: 0,
        masterballs: 0,
      }),
    );

    const spawnPromise = dispatchCommand("/generate_pokemon", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));

    await dispatchCallback("catch:pokeball", { fromId: userId });
    await spawnPromise;

    const user = await userDataSource.findUserByTelegramId(userId);
    expect(user?.pokeballs).toBe(4);
    expect(user?.pokemons.length).toBe(7);
    expect(user?.box.length).toBe(1);
  });

  it("keeps the encounter alive when a throw is rate-limited instead of stranding messages", async () => {
    const { dispatchCommand, dispatchCallback, client, userDataSource, pokeApi } =
      await createTestBot();

    const userId = 811;
    userDataSource.seedUser(
      new UserEntity({
        id: 31,
        telegramId: BigInt(userId),
        username: "eager_thrower",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
        pokeballs: 10,
        greatballs: 0,
        ultraballs: 0,
        masterballs: 0,
      }),
    );

    // Force a low capture rate and a deterministic miss that does not flee.
    vi.spyOn(pokeApi, "getPokemonCaptureRate").mockResolvedValue(1);
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.999);

    try {
      const spawnPromise = dispatchCommand("/generate_pokemon", { fromId: userId });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // First throw misses and the wild Pokémon stays.
      await dispatchCallback("catch:pokeball", { fromId: userId });
      // Second throw is blocked by the rate limiter but must NOT end the encounter.
      await dispatchCallback("catch:pokeball", { fromId: userId });

      // The conversation is still alive, so running away completes normally.
      await dispatchCallback("catch:run", { fromId: userId });
      await spawnPromise;

      const user = await userDataSource.findUserByTelegramId(userId);
      expect(user?.pokeballs).toBe(9);
      expect(user?.pokemons.length).toBe(0);

      const sent = client.getSentMessages();
      expect(sent.some((m) => m.text?.includes("ran away safely"))).toBe(true);
      expect(client.getAnsweredCallbacks().some((cb) => cb.text?.includes("Slow down"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("merges into the existing evolved form instead of creating a duplicate", async () => {
    const { dispatchCommand, dispatchText, userDataSource } = await createTestBot();

    const userId = 812;
    const charmander = createMockPokemon("charmander", "fire", { id: 301, timesCaught: 5 });
    const charmeleon = createMockPokemon("charmeleon", "fire", { id: 302, timesCaught: 2 });
    userDataSource.seedUser(
      new UserEntity({
        id: 32,
        telegramId: BigInt(userId),
        username: "evo_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [charmander, charmeleon],
      }),
    );

    const evolvePromise = dispatchCommand("/evolve", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("charmander", { fromId: userId });
    await evolvePromise;

    const user = await userDataSource.findUserByTelegramId(userId);
    expect(user?.pokemons.length).toBe(1);
    expect(user?.pokemons[0]?.name).toBe("charmeleon");
    // Existing charmeleon (2) + 1 (newly evolved) + leftover from charmander (5 - EVOLVE_CAP 3) = 5
    expect(user?.pokemons[0]?.timesCaught).toBe(5);
  });

  it("ensures an evolved pokemon has at least 1 timesCaught when evolved from exact EVOLVE_CAP", async () => {
    const { dispatchCommand, dispatchText, userDataSource } = await createTestBot();

    const userId = 818;
    const charmander = createMockPokemon("charmander", "fire", { id: 303, timesCaught: 3 });
    userDataSource.seedUser(
      new UserEntity({
        id: 37,
        telegramId: BigInt(userId),
        username: "exact_evo",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [charmander],
      }),
    );

    const evolvePromise = dispatchCommand("/evolve", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("charmander", { fromId: userId });
    await evolvePromise;

    const user = await userDataSource.findUserByTelegramId(userId);
    expect(user?.pokemons[0]?.name).toBe("charmeleon");
    // Exactly EVOLVE_CAP (3) spent -> newly evolved form must have at least 1 catch (not 0)
    expect(user?.pokemons[0]?.timesCaught).toBe(1);
  });

  it("migrates user.buddyPokemonId to the merged pokemon when buddy is evolved", async () => {
    const { dispatchCommand, dispatchText, userDataSource } = await createTestBot();

    const userId = 819;
    const charmander = createMockPokemon("charmander", "fire", { id: 304, timesCaught: 3 });
    const charmeleon = createMockPokemon("charmeleon", "fire", { id: 305, timesCaught: 1 });
    userDataSource.seedUser(
      new UserEntity({
        id: 38,
        telegramId: BigInt(userId),
        username: "buddy_evo",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [charmander, charmeleon],
        buddyPokemonId: 304, // charmander is the buddy
      }),
    );

    const evolvePromise = dispatchCommand("/evolve", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("charmander", { fromId: userId });
    await evolvePromise;

    const user = await userDataSource.findUserByTelegramId(userId);
    expect(user?.pokemons.length).toBe(1);
    expect(user?.pokemons[0]?.id).toBe(305);
    // Buddy should migrate to the merged charmeleon (id 305) instead of becoming orphaned
    expect(user?.buddyPokemonId).toBe(305);
  });

  it("allows trainer to run away from wild encounter", async () => {
    const { dispatchCommand, dispatchCallback, client, userDataSource } = await createTestBot();

    const userId = 808;
    userDataSource.seedUser(
      new UserEntity({
        id: 26,
        telegramId: BigInt(userId),
        username: "runner_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
        pokeballs: 10,
        greatballs: 2,
      }),
    );

    const spawnPromise = dispatchCommand("/generate_pokemon", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));

    await dispatchCallback("catch:run", { fromId: userId });
    await spawnPromise;

    const user = await userDataSource.findUserByTelegramId(userId);
    expect(user?.pokemons.length).toBe(0);
    expect(user?.pokeballs).toBe(10);

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("ran away safely"))).toBe(true);
  });

  it("handles orphaned or expired catch callback queries via fallback handler", async () => {
    const { dispatchCallback, client } = await createTestBot();

    const userId = 810;
    // Dispatch catch callback with no active encounter conversation
    await dispatchCallback("catch:pokeball", { fromId: userId });

    const answerCalls = client.getCalls("answerCallbackQuery");
    expect(answerCalls.length).toBeGreaterThan(0);
    const lastAnswer = answerCalls[answerCalls.length - 1];
    expect(lastAnswer?.payload?.text).toContain("already fled");
    expect(lastAnswer?.payload?.show_alert).toBe(true);

    const editMarkupCalls = client.getCalls("editMessageReplyMarkup");
    expect(editMarkupCalls.length).toBeGreaterThan(0);
  });

  it("keeps catch conversation alive when hitting catch rate limiter", async () => {
    // Return 0.99 so catch fails (prob ~0.5) and flee fails (fleeRate 0.3), breaking free and staying
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);

    try {
      const { dispatchCommand, dispatchCallback, client, userDataSource } = await createTestBot({
        pokeApiService: { getPokemonCaptureRate: async () => 100 },
      });

      const userId = 811;
      userDataSource.seedUser(
        new UserEntity({
          id: 27,
          telegramId: BigInt(userId),
          username: "rapid_catcher",
          createdAt: new Date(),
          updatedAt: new Date(),
          pokemons: [],
          pokeballs: 10,
          greatballs: 2,
          ultraballs: 0,
          masterballs: 0,
        }),
      );

      const spawnPromise = dispatchCommand("/generate_pokemon", { fromId: userId });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Throw first ball -> breaks free and stays
      await dispatchCallback("catch:pokeball", { fromId: userId });

      // Instantly throw second ball without delay - hits rate limit
      // But since the conversation remains alive, it shows alert instead of crashing
      await dispatchCallback("catch:pokeball", { fromId: userId });

      const answerCalls = client.getCalls("answerCallbackQuery");
      const rateLimitAnswer = answerCalls.find(
        (c) => typeof c.payload?.text === "string" && c.payload.text.includes("Slow down"),
      );
      expect(rateLimitAnswer).toBeDefined();

      // Finish conversation by fleeing
      await dispatchCallback("catch:run", { fromId: userId });
      await spawnPromise;
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("prevents a trainer from accepting their own trade invite in a group chat", async () => {
    const { dispatchCommand, dispatchText, dispatchCallback, client, userDataSource } =
      await createTestBot();

    const userAId = 901;
    const pikachu = createMockPokemon("pikachu", "electric", { id: 501 });
    userDataSource.seedUser(
      new UserEntity({
        id: 41,
        telegramId: BigInt(userAId),
        username: "ash_trader",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [pikachu],
      }),
    );

    const tradePromise = dispatchCommand("/trade", { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    await dispatchText("pikachu", { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const inviteMsg = client
      .getSentMessages()
      .find((m) => m.text?.includes("Click the button below to accept the trade"));
    expect(inviteMsg).toBeDefined();

    const match = JSON.stringify(inviteMsg?.reply_markup).match(/trade-accept:([a-f0-9-]+)/);
    expect(match).not.toBeNull();
    const tradeId = match![1]!;

    // Initiator clicks their own trade-accept button
    await dispatchCallback(`trade-accept:${tradeId}`, { fromId: userAId, isGroup: true });
    await tradePromise;

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("You can't trade with yourself!"))).toBe(true);
    expect(
      client
        .getAnsweredCallbacks()
        .some((cb) => cb.text?.includes("You can't trade with yourself!")),
    ).toBe(true);
  });

  it("completes full group trade flow between two trainers and swaps pokemons", async () => {
    const { dispatchCommand, dispatchText, dispatchCallback, client, userDataSource } =
      await createTestBot();

    const userAId = 902;
    const userBId = 903;
    const pikachu = createMockPokemon("pikachu", "electric", { id: 502 });
    const charmander = createMockPokemon("charmander", "fire", { id: 503 });

    userDataSource.seedUser(
      new UserEntity({
        id: 42,
        telegramId: BigInt(userAId),
        username: "ash_trade",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [pikachu],
        buddyPokemonId: 502,
      }),
    );

    userDataSource.seedUser(
      new UserEntity({
        id: 43,
        telegramId: BigInt(userBId),
        username: "misty_trade",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [charmander],
      }),
    );

    // 1. User A starts /trade and selects pikachu
    const tradePromise = dispatchCommand("/trade", { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    await dispatchText("pikachu", { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const inviteMsg = client
      .getSentMessages()
      .find((m) => m.text?.includes("Click the button below to accept the trade"));
    expect(inviteMsg).toBeDefined();
    const match = JSON.stringify(inviteMsg?.reply_markup).match(/trade-accept:([a-f0-9-]+)/);
    expect(match).not.toBeNull();
    const tradeId = match![1]!;

    // 2. User B accepts the trade invite and selects charmander
    await dispatchCallback(`trade-accept:${tradeId}`, { fromId: userBId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    await dispatchText("charmander", { fromId: userBId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 3. User A confirms selection
    await dispatchCallback(`trade-accept:${tradeId}`, { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 4. User B confirms selection
    await dispatchCallback(`trade-accept:${tradeId}`, { fromId: userBId, isGroup: true });
    await tradePromise;

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("Trade successful!"))).toBe(true);

    const updatedA = await userDataSource.findUserByTelegramId(userAId);
    const updatedB = await userDataSource.findUserByTelegramId(userBId);
    expect(updatedA?.pokemons.map((p) => p.name)).toEqual(["charmander"]);
    expect(updatedB?.pokemons.map((p) => p.name)).toEqual(["pikachu"]);
    // Traded buddy is cleared
    expect(updatedA?.buddyPokemonId).toBeNull();
  });

  it("cancels trade when either trainer rejects the confirmation prompt", async () => {
    const { dispatchCommand, dispatchText, dispatchCallback, client, userDataSource } =
      await createTestBot();

    const userAId = 904;
    const userBId = 905;
    const squirtle = createMockPokemon("squirtle", "water", { id: 504 });
    const bulbasaur = createMockPokemon("bulbasaur", "grass", { id: 505 });

    userDataSource.seedUser(
      new UserEntity({
        id: 44,
        telegramId: BigInt(userAId),
        username: "trainer_a",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [squirtle],
      }),
    );

    userDataSource.seedUser(
      new UserEntity({
        id: 45,
        telegramId: BigInt(userBId),
        username: "trainer_b",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [bulbasaur],
      }),
    );

    const tradePromise = dispatchCommand("/trade", { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    await dispatchText("squirtle", { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const inviteMsg = client
      .getSentMessages()
      .find((m) => m.text?.includes("Click the button below to accept the trade"));
    const tradeId = JSON.stringify(inviteMsg?.reply_markup).match(/trade-accept:([a-f0-9-]+)/)![1]!;

    await dispatchCallback(`trade-accept:${tradeId}`, { fromId: userBId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    await dispatchText("bulbasaur", { fromId: userBId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // User A rejects confirmation
    await dispatchCallback(`trade-reject:${tradeId}`, { fromId: userAId, isGroup: true });
    await tradePromise;

    expect(client.getSentMessages().some((m) => m.text?.includes("Trade cancelled!"))).toBe(true);
    const updatedA = await userDataSource.findUserByTelegramId(userAId);
    const updatedB = await userDataSource.findUserByTelegramId(userBId);
    expect(updatedA?.pokemons.map((p) => p.name)).toEqual(["squirtle"]);
    expect(updatedB?.pokemons.map((p) => p.name)).toEqual(["bulbasaur"]);
  });

  it("does not lock up the bot or fail on /start and /daily while a trade conversation is pending", async () => {
    const { dispatchCommand, dispatchText, client, userDataSource } = await createTestBot();

    const userAId = 906;
    const pikachu = createMockPokemon("pikachu", "electric", { id: 506 });

    userDataSource.seedUser(
      new UserEntity({
        id: 46,
        telegramId: BigInt(userAId),
        username: "resilient_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [pikachu],
      }),
    );

    // Start /trade and select pikachu so the conversation is waiting for trade-accept callback
    void dispatchCommand("/trade", { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("pikachu", { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    client.clear();

    // User runs /daily while trade invite is pending -> works without error
    await dispatchCommand("/daily", { fromId: userAId, isGroup: true });
    const afterDaily = client.getSentMessages();
    expect(afterDaily.some((m) => m.text?.includes("There was an error during request"))).toBe(
      false,
    );
    expect(afterDaily.some((m) => m.text?.includes("Daily Reward"))).toBe(true);

    client.clear();

    // User runs /start while trade invite is pending -> cleanly resets and responds with welcome message
    await dispatchCommand("/start", { fromId: userAId, isGroup: true });
    const afterStart = client.getSentMessages();
    expect(afterStart.some((m) => m.text?.includes("There was an error during request"))).toBe(
      false,
    );
    expect(afterStart.some((m) => m.text?.includes("Welcome to PokeBotShowdown"))).toBe(true);
  });

  it("converts a pokemon to shiny and updates nickname across conversation replays", async () => {
    const { dispatchCommand, dispatchText, client, userDataSource } = await createTestBot();

    const userId = 907;
    const eevee = createMockPokemon("eevee", "normal", { id: 507, timesCaught: 12 });
    userDataSource.seedUser(
      new UserEntity({
        id: 47,
        telegramId: BigInt(userId),
        username: "shiny_nick_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [eevee],
      }),
    );

    // 1. Make eevee shiny
    const shinyPromise = dispatchCommand("/shiny", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("eevee", { fromId: userId });
    await shinyPromise;

    let updated = await userDataSource.findUserByTelegramId(userId);
    expect(updated?.pokemons[0]?.isShiny).toBe(true);
    expect(updated?.pokemons[0]?.timesCaught).toBe(9);

    // 2. Give eevee a nickname
    const nickPromise = dispatchCommand("/nickname", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("eevee", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("Sparky", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("yes", { fromId: userId });
    await nickPromise;

    updated = await userDataSource.findUserByTelegramId(userId);
    expect(updated?.pokemons[0]?.nickname).toBe("Sparky");
    expect(
      client.getSentMessages().some((m) => m.text?.includes("eevee is now known as Sparky")),
    ).toBe(true);
  });

  it("keeps an ongoing group trade alive when another trainer runs /start", async () => {
    const { dispatchCommand, dispatchText, dispatchCallback, client, userDataSource } =
      await createTestBot();

    const userAId = 904;
    const userBId = 905;
    const userCId = 906;

    userDataSource.seedUser(
      new UserEntity({
        id: 44,
        telegramId: BigInt(userAId),
        username: "ash_alive",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("pikachu", "electric", { id: 504 })],
      }),
    );
    userDataSource.seedUser(
      new UserEntity({
        id: 45,
        telegramId: BigInt(userBId),
        username: "misty_alive",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("charmander", "fire", { id: 505 })],
      }),
    );
    userDataSource.seedUser(
      new UserEntity({
        id: 46,
        telegramId: BigInt(userCId),
        username: "brock_bystander",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("onix", "rock", { id: 506 })],
      }),
    );

    // 1. Trainer A opens a trade and leaves it pending
    const tradePromise = dispatchCommand("/trade", { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("pikachu", { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const inviteMsg = client
      .getSentMessages()
      .find((m) => m.text?.includes("Click the button below to accept the trade"));
    expect(inviteMsg).toBeDefined();
    const tradeId = JSON.stringify(inviteMsg?.reply_markup).match(/trade-accept:([a-f0-9-]+)/)![1]!;

    // 2. A third trainer runs /start in the same group
    await dispatchCommand("/start", { fromId: userCId, isGroup: true });
    expect(
      client.getSentMessages().some((m) => m.text?.includes("Welcome to PokeBotShowdown")),
    ).toBe(true);

    // 3. The trade must survive: trainer B can still accept the invite
    await dispatchCallback(`trade-accept:${tradeId}`, { fromId: userBId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("charmander", { fromId: userBId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const confirmMsg = client
      .getSentMessages()
      .find((m) => m.text?.includes("would you like to trade your pikachu"));
    expect(confirmMsg).toBeDefined();

    // Close the flow cleanly so the conversation does not stay suspended
    const rejectData = JSON.stringify(confirmMsg?.reply_markup).match(/trade-reject:[^"]+/)![0];
    await dispatchCallback(rejectData, { fromId: userAId, isGroup: true });
    await tradePromise;

    expect(client.getSentMessages().some((m) => m.text?.includes("Trade cancelled!"))).toBe(true);
  });

  it("sends a traded party pokemon to the box when the receiver party is full", async () => {
    const { dispatchCommand, dispatchText, dispatchCallback, client, userDataSource } =
      await createTestBot();

    const userAId = 907;
    const userBId = 908;

    const fullParty = Array.from({ length: MAX_PKMN_PARTY }, (_, index) =>
      createMockPokemon(`party${index}`, "normal", { id: 600 + index, isInParty: true }),
    );
    const boxPokemon = createMockPokemon("rattata", "normal", { id: 610, isInParty: false });
    const incomingParty = createMockPokemon("mewtwo", "psychic", { id: 611, isInParty: true });

    userDataSource.seedUser(
      new UserEntity({
        id: 47,
        telegramId: BigInt(userAId),
        username: "full_party_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [...fullParty, boxPokemon],
      }),
    );
    userDataSource.seedUser(
      new UserEntity({
        id: 48,
        telegramId: BigInt(userBId),
        username: "legend_giver",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [incomingParty],
      }),
    );

    // 1. Trainer B starts the trade with their party mewtwo
    const tradePromise = dispatchCommand("/trade", { fromId: userBId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("mewtwo", { fromId: userBId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const inviteMsg = client
      .getSentMessages()
      .find((m) => m.text?.includes("Click the button below to accept the trade"));
    expect(inviteMsg).toBeDefined();
    const tradeId = JSON.stringify(inviteMsg?.reply_markup).match(/trade-accept:([a-f0-9-]+)/)![1]!;

    // 2. Trainer A accepts and offers a pokemon from their storage box
    await dispatchCallback(`trade-accept:${tradeId}`, { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await dispatchText("rattata", { fromId: userAId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 3. Both trainers confirm
    const confirmForB = client
      .getSentMessages()
      .filter((m) => m.text?.includes("would you like to trade your mewtwo"))
      .at(-1);
    const acceptForB = JSON.stringify(confirmForB?.reply_markup).match(/trade-accept:[^"]+/)![0];
    await dispatchCallback(acceptForB, { fromId: userBId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const confirmForA = client
      .getSentMessages()
      .filter((m) => m.text?.includes("would you like to trade your rattata"))
      .at(-1);
    const acceptForA = JSON.stringify(confirmForA?.reply_markup).match(/trade-accept:[^"]+/)![0];
    await dispatchCallback(acceptForA, { fromId: userAId, isGroup: true });
    await tradePromise;

    const receiver = await userDataSource.findUserByTelegramId(userAId);
    expect(receiver?.party).toHaveLength(MAX_PKMN_PARTY);
    expect(receiver?.party.some((p) => p.name === "mewtwo")).toBe(false);

    const received = receiver?.pokemons.find((p) => p.name === "mewtwo");
    expect(received).toBeDefined();
    expect(received?.isInParty).toBe(false);
  });
});
