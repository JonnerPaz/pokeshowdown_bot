import { describe, expect, it, vi } from "vitest";
import { createMockPokemon, createTestBot } from "../../harness/testHarness.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";

describe("Pokedex Feature Integration (/pokedex)", () => {
  it("displays pokedex entry directly when query argument is provided", async () => {
    const { dispatchCommand, client } = await createTestBot();

    await dispatchCommand("/pokedex pikachu", { fromId: 701 });

    const sent = client.getSentMessages();
    expect(
      sent.some((m) => m.text?.includes("Pokédex Entry #025") || m.text?.includes("PIKACHU")),
    ).toBe(true);
    expect(sent.some((m) => m.text?.includes("Base Stats:"))).toBe(true);
  });

  it("indicates when the trainer already owns the pokemon in their bag", async () => {
    const { dispatchCommand, client, userDataSource } = await createTestBot();

    const userId = 702;
    const pikachu = createMockPokemon("pikachu", "electric", { timesCaught: 4 });
    userDataSource.seedUser(
      new UserEntity({
        id: 31,
        telegramId: BigInt(userId),
        username: "red_kanto",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [pikachu],
      }),
    );

    await dispatchCommand("/pokedex pikachu", { fromId: userId });

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("In your bag (Caught: 4x)"))).toBe(true);
  });

  it("escapes Markdown characters in flavor text", async () => {
    const { dispatchCommand, client, pokeApi } = await createTestBot();

    vi.spyOn(pokeApi, "getPokedexEntry").mockResolvedValue({
      id: 25,
      name: "pikachu",
      types: ["electric"],
      heightM: 0.4,
      weightKg: 6,
      ability: "static",
      flavorText: "It stores _electricity* in its cheeks.",
      spriteUrl: "",
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
    });

    await dispatchCommand("/pokedex pikachu", { fromId: 705 });

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("It stores \\_electricity\\* in its cheeks."))).toBe(
      true,
    );
  });

  it("handles unknown pokemon gracefully with helpful error message", async () => {
    const { dispatchCommand, client } = await createTestBot();

    await dispatchCommand("/pokedex unknown_fakemon", { fromId: 703 });

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("Could not find Pokédex data"))).toBe(true);
  });

  it("prompts for name when command is sent without arguments and completes lookup", async () => {
    const { dispatchCommand, dispatchText, client } = await createTestBot();

    await dispatchCommand("/pokedex", { fromId: 704 });

    const sent1 = client.getSentMessages();
    expect(sent1.some((m) => m.text?.includes("Which Pokemon do you want to look up?"))).toBe(true);

    await dispatchText("pikachu", { fromId: 704 });

    const sent2 = client.getSentMessages();
    expect(sent2.some((m) => m.text?.includes("PIKACHU"))).toBe(true);
  });
});
