import { describe, it, expect } from "vitest";
import { createTestBot, createMockPokemon } from "../../harness/testHarness.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";

describe("Turn-Based Battle Integration (/battle)", () => {
  it("rejects /battle when initiator is not registered", async () => {
    const { dispatchCommand, client } = await createTestBot();

    await dispatchCommand("/battle", { fromId: 1001, isGroup: true });

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("You are not registered!"))).toBe(true);
  });

  it("rejects /battle when initiator has no pokemon in collection", async () => {
    const { dispatchCommand, client, userDataSource } = await createTestBot();

    userDataSource.seedUser(
      new UserEntity({
        id: 11,
        telegramId: BigInt(1002),
        username: "empty_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
      }),
    );

    await dispatchCommand("/battle", { fromId: 1002, isGroup: true });

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("You don't have any pokemon yet!"))).toBe(true);
  });

  it("prevents challenger from accepting their own battle challenge", async () => {
    const { dispatchCommand, dispatchCallback, client, userDataSource } = await createTestBot();

    const challengerId = 1003;
    const pikachu = createMockPokemon("pikachu", "electric", { id: 31 });

    userDataSource.seedUser(
      new UserEntity({
        id: 12,
        telegramId: BigInt(challengerId),
        username: "ash_ketchum",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [pikachu],
      }),
    );

    // 1. Issue challenge
    void dispatchCommand("/battle", { fromId: challengerId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 2. Extract battleId from sent challenge message
    const sent = client.getSentMessages();
    const challengeMsg = sent.find((m) => m.text?.includes("battle challenge"));
    expect(challengeMsg).toBeDefined();

    const match = JSON.stringify(challengeMsg?.reply_markup).match(/battle:([a-f0-9]+):accept/);
    expect(match).not.toBeNull();
    const battleId = match![1];

    // 3. Challenger tries to accept own challenge
    await dispatchCallback(`battle:${battleId}:accept`, { fromId: challengerId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 4. Verify warning alert was sent
    const answered = client.getAnsweredCallbacks();
    expect(
      answered.some(
        (cb) => cb.text?.includes("cannot battle against yourself") && cb.show_alert === true,
      ),
    ).toBe(true);
  });

  it("rejects unregistered user and empty-party user from accepting challenge", async () => {
    const { dispatchCommand, dispatchCallback, client, userDataSource } = await createTestBot();

    const challengerId = 1004;
    const pikachu = createMockPokemon("pikachu", "electric", { id: 32 });

    userDataSource.seedUser(
      new UserEntity({
        id: 13,
        telegramId: BigInt(challengerId),
        username: "red_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [pikachu],
      }),
    );

    // Seed a registered user without any pokemon
    userDataSource.seedUser(
      new UserEntity({
        id: 14,
        telegramId: BigInt(1005),
        username: "noob_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
      }),
    );

    void dispatchCommand("/battle", { fromId: challengerId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const match = JSON.stringify(client.getSentMessages()).match(/battle:([a-f0-9]+):accept/);
    const battleId = match![1];

    // Unregistered clicker (9999)
    await dispatchCallback(`battle:${battleId}:accept`, { fromId: 9999, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(
      client.getAnsweredCallbacks().some((cb) => cb.text?.includes("You are not registered!")),
    ).toBe(true);

    // User without pokemon (1005)
    await dispatchCallback(`battle:${battleId}:accept`, { fromId: 1005, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(
      client
        .getAnsweredCallbacks()
        .some((cb) => cb.text?.includes("don't have any pokemon to battle with")),
    ).toBe(true);
  });

  it("executes complete turn-based battle flow with combat turns, in-place edits, and victory reward", async () => {
    const challengerId = 1010;
    const opponentId = 1020;

    const pikachu = createMockPokemon("pikachu", "electric", { id: 41, timesCaught: 1 });
    const blastoise = createMockPokemon("blastoise", "water", { id: 42, timesCaught: 1 });

    const { dispatchCommand, dispatchCallback, client, userDataSource } = await createTestBot({
      pokeApiService: {
        getPokemonBaseStats: async (name?: string) => {
          if (name === "pikachu") {
            return {
              hp: 100,
              attack: 100,
              defense: 50,
              specialAttack: 200,
              specialDefense: 50,
              speed: 100,
            };
          }
          return {
            hp: 20,
            attack: 20,
            defense: 20,
            specialAttack: 20,
            specialDefense: 20,
            speed: 20,
          };
        },
      },
    });

    userDataSource.seedUser(
      new UserEntity({
        id: 21,
        telegramId: BigInt(challengerId),
        username: "ash_champion",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [pikachu],
      }),
    );

    userDataSource.seedUser(
      new UserEntity({
        id: 22,
        telegramId: BigInt(opponentId),
        username: "gary_oak",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [blastoise],
      }),
    );

    // 1. Challenger initiates battle in group chat
    const battlePromise = dispatchCommand("/battle", { fromId: challengerId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const match = JSON.stringify(client.getSentMessages()).match(/battle:([a-f0-9]+):accept/);
    expect(match).not.toBeNull();
    const battleId = match![1];

    // 2. Opponent Gary accepts challenge
    await dispatchCallback(`battle:${battleId}:accept`, { fromId: opponentId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 3. Challenger picks Pikachu
    await dispatchCallback(`battle:${battleId}:pick:A:41`, { fromId: challengerId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 4. Opponent picks Blastoise
    await dispatchCallback(`battle:${battleId}:pick:B:42`, { fromId: opponentId, isGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 5. Verify battle arena was rendered and posted
    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("POKEMON SHOWDOWN BATTLE"))).toBe(true);

    // 6. Turn 1: Pikachu is faster, so Ash takes turn 1. Use special move (electric vs water)
    await dispatchCallback(`battle:${battleId}:act:special`, {
      fromId: challengerId,
      isGroup: true,
    });
    await battlePromise;

    // 7. Verify victory screen was rendered via in-place message edit
    const edits = client.getEditedMessages();
    expect(edits.length).toBeGreaterThan(0);

    const finalEdit = edits[edits.length - 1];
    expect(finalEdit?.text).toContain("VICTORY!");
    expect(finalEdit?.text).toContain("ash\\_champion");
    expect(finalEdit?.text).toContain("pikachu");

    // 8. Verify winning pokemon gained +1 combat experience (timesCaught)
    const winner = await userDataSource.findUserByTelegramId(challengerId);
    const winningPokemon = winner?.pokemons.find((p) => p.id === 41);
    expect(winningPokemon?.timesCaught).toBe(2);
    expect(winner?.wins).toBe(1);

    // 9. Verify loser recorded +1 loss
    const loser = await userDataSource.findUserByTelegramId(opponentId);
    expect(loser?.losses).toBe(1);
  });
});
