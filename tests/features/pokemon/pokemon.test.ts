import { describe, expect, it } from "vitest";
import { createMockPokemon, createTestBot } from "../../harness/testHarness.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";

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
    expect(sent.some((m) => m.text?.includes("Your pokemons are"))).toBe(true);
  });

  it("handles collections with more than 10 pokemons without exceeding Telegram group limits", async () => {
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
    expect(sent.some((m) => m.text?.includes("Your pokemons are"))).toBe(true);
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
});
