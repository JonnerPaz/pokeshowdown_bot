import { describe, expect, it } from "vitest";
import { BattleEngine } from "../../../src/domain/battle/battleEngine.js";
import type { BattlePokemonStats, TrainerBattleProfile } from "../../../src/domain/battle/types.js";
import { renderBattlefield } from "../../../src/features/battle/battle.keyboards.js";

const makePokemon = (overrides: Partial<BattlePokemonStats> = {}): BattlePokemonStats => ({
  name: "Pikachu",
  types: ["electric"],
  primaryType: "electric",
  currentHp: 100,
  maxHp: 100,
  attack: 55,
  defense: 40,
  specialAttack: 50,
  specialDefense: 50,
  speed: 90,
  isDefending: false,
  isCharged: false,
  isShiny: false,
  timesCaught: 1,
  ...overrides,
});

const makeTrainer = (
  id: string,
  name: string,
  pokemon: BattlePokemonStats,
): TrainerBattleProfile => ({ id, name, pokemon });

describe("renderBattlefield", () => {
  it("shows the active trainer's turn prompt by default", () => {
    const state = BattleEngine.initBattle(
      "b1",
      makeTrainer("t1", "Ash", makePokemon()),
      makeTrainer(
        "t2",
        "Gary",
        makePokemon({ name: "Blastoise", types: ["water"], primaryType: "water", speed: 10 }),
      ),
    );

    expect(renderBattlefield(state)).toContain("It's **Ash**'s turn!");
  });

  it("replaces the turn prompt with a final note when one is provided", () => {
    const state = BattleEngine.initBattle(
      "b2",
      makeTrainer("t1", "Ash", makePokemon()),
      makeTrainer("t2", "Gary", makePokemon()),
    );

    const text = renderBattlefield(
      state,
      "⚔️ A fierce exchange!",
      "🏳️ **Turn limit reached!** The battle was called a draw.",
    );

    expect(text).toContain("A fierce exchange!");
    expect(text).toContain("Turn limit reached!");
    expect(text).not.toContain("It's **");
  });

  it("renders the victory screen when the battle is finished", () => {
    const state = BattleEngine.initBattle(
      "b3",
      makeTrainer("t1", "Ash", makePokemon({ attack: 200 })),
      makeTrainer("t2", "Gary", makePokemon({ maxHp: 1, speed: 10 })),
    );
    const { state: finished } = BattleEngine.executeTurn(state, "attack");

    const text = renderBattlefield(finished);
    expect(text).toContain("VICTORY!");
    expect(text).not.toContain("Turn limit reached!");
  });
});
