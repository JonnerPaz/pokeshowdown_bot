import { describe, expect, it } from "vitest";
import { BattleEngine } from "../../src/domain/battle/battleEngine.js";
import { getTypeEffectiveness } from "../../src/domain/battle/typeEffectiveness.js";
import type { BattlePokemonStats, TrainerBattleProfile } from "../../src/domain/battle/types.js";

const makeTestPokemon = (overrides: Partial<BattlePokemonStats> = {}): BattlePokemonStats => ({
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
): TrainerBattleProfile => ({
  id,
  name,
  pokemon,
});

describe("Type Effectiveness Chart", () => {
  it("calculates super effective moves correctly", () => {
    expect(getTypeEffectiveness("water", ["fire"])).toBe(2);
    expect(getTypeEffectiveness("fire", ["grass"])).toBe(2);
    expect(getTypeEffectiveness("electric", ["water"])).toBe(2);
  });

  it("calculates not very effective moves correctly", () => {
    expect(getTypeEffectiveness("fire", ["water"])).toBe(0.5);
    expect(getTypeEffectiveness("grass", ["fire"])).toBe(0.5);
    expect(getTypeEffectiveness("water", ["water"])).toBe(0.5);
  });

  it("handles immunities (0x damage)", () => {
    expect(getTypeEffectiveness("electric", ["ground"])).toBe(0);
    expect(getTypeEffectiveness("ghost", ["normal"])).toBe(0);
    expect(getTypeEffectiveness("normal", ["ghost"])).toBe(0);
    expect(getTypeEffectiveness("ground", ["flying"])).toBe(0);
  });

  it("multiplies dual typing weaknesses", () => {
    // Water/Ground defender vs Grass move: 2 * 2 = 4
    expect(getTypeEffectiveness("grass", ["water", "ground"])).toBe(4);
    // Grass/Steel defender vs Fire move: 2 * 2 = 4
    expect(getTypeEffectiveness("fire", ["grass", "steel"])).toBe(4);
  });

  it("defaults to 1.0 for neutral moves or unknown types", () => {
    expect(getTypeEffectiveness("normal", ["normal"])).toBe(1.0);
    expect(getTypeEffectiveness("unknown", ["fire"])).toBe(1.0);
  });
});

describe("BattleEngine", () => {
  it("initializes turn order based on pokemon speed", () => {
    const fastPokemon = makeTestPokemon({ speed: 120, name: "FastMon" });
    const slowPokemon = makeTestPokemon({ speed: 50, name: "SlowMon" });

    const trainerA = makeTrainer("t1", "Trainer A", slowPokemon);
    const trainerB = makeTrainer("t2", "Trainer B", fastPokemon);

    const battle = BattleEngine.initBattle("battle-1", trainerA, trainerB);
    expect(battle.currentTurnTrainerId).toBe("t2"); // Trainer B is faster
    expect(battle.isFinished).toBe(false);
  });

  it("falls back to Trainer A when speed is tied", () => {
    const p1 = makeTestPokemon({ speed: 80 });
    const p2 = makeTestPokemon({ speed: 80 });

    const trainerA = makeTrainer("t1", "Trainer A", p1);
    const trainerB = makeTrainer("t2", "Trainer B", p2);

    const battle = BattleEngine.initBattle("battle-2", trainerA, trainerB);
    expect(battle.currentTurnTrainerId).toBe("t1");
  });

  it("deals damage with physical attack and passes turn", () => {
    const p1 = makeTestPokemon({ attack: 80, speed: 100 });
    const p2 = makeTestPokemon({ defense: 60, currentHp: 100, maxHp: 100, speed: 50 });

    const trainerA = makeTrainer("t1", "Trainer A", p1);
    const trainerB = makeTrainer("t2", "Trainer B", p2);

    const battle = BattleEngine.initBattle("battle-3", trainerA, trainerB);
    const deterministicRng = () => 0.5;

    const { state, result } = BattleEngine.executeTurn(battle, "attack", deterministicRng);

    expect(result.damageDealt).toBeGreaterThan(0);
    expect(state.trainerB.pokemon.currentHp).toBe(100 - result.damageDealt);
    expect(state.currentTurnTrainerId).toBe("t2");
    expect(state.isFinished).toBe(false);
  });

  it("halves incoming damage when defender is defending", () => {
    const p1 = makeTestPokemon({ attack: 80, speed: 100 });
    const p2 = makeTestPokemon({ defense: 60, currentHp: 100, maxHp: 100, speed: 50 });

    const trainerA = makeTrainer("t1", "Trainer A", p1);
    const trainerB = makeTrainer("t2", "Trainer B", p2);

    const battle = BattleEngine.initBattle("battle-4", trainerA, trainerB);
    const deterministicRng = () => 0.5;

    // Normal attack without defend
    const { result: normalResult } = BattleEngine.executeTurn(battle, "attack", deterministicRng);

    // Attack against defending target
    const battleWithDefend = BattleEngine.initBattle("battle-4-def", trainerA, trainerB);
    battleWithDefend.trainerB.pokemon.isDefending = true;

    const { result: defendResult } = BattleEngine.executeTurn(
      battleWithDefend,
      "attack",
      deterministicRng,
    );

    expect(defendResult.damageDealt).toBe(Math.floor(normalResult.damageDealt * 0.5));
  });

  it("guarantees critical hit after charge action", () => {
    const p1 = makeTestPokemon({ attack: 80, speed: 100, isCharged: true });
    const p2 = makeTestPokemon({ defense: 60, currentHp: 100, maxHp: 100, speed: 50 });

    const trainerA = makeTrainer("t1", "Trainer A", p1);
    const trainerB = makeTrainer("t2", "Trainer B", p2);

    const battle = BattleEngine.initBattle("battle-5", trainerA, trainerB);
    battle.trainerA.pokemon.isCharged = true;

    const deterministicRng = () => 0.5; // Normally wouldn't crit (< 0.1)
    const { result } = BattleEngine.executeTurn(battle, "attack", deterministicRng);

    expect(result.isCritical).toBe(true);
  });

  it("handles immunities with 0 damage", () => {
    const pikachu = makeTestPokemon({
      primaryType: "electric",
      types: ["electric"],
      speed: 100,
    });
    const geodude = makeTestPokemon({
      primaryType: "rock",
      types: ["rock", "ground"],
      speed: 40,
    });

    const trainerA = makeTrainer("t1", "Ash", pikachu);
    const trainerB = makeTrainer("t2", "Brock", geodude);

    const battle = BattleEngine.initBattle("battle-6", trainerA, trainerB);
    const { result, state } = BattleEngine.executeTurn(battle, "special");

    expect(result.damageDealt).toBe(0);
    expect(result.typeMultiplier).toBe(0);
    expect(state.trainerB.pokemon.currentHp).toBe(geodude.maxHp);
  });

  it("finishes battle when defender HP drops to 0", () => {
    const p1 = makeTestPokemon({ attack: 200, speed: 100 });
    const p2 = makeTestPokemon({ defense: 10, currentHp: 5, maxHp: 100, speed: 50 });

    const trainerA = makeTrainer("t1", "Trainer A", p1);
    const trainerB = makeTrainer("t2", "Trainer B", p2);

    const battle = BattleEngine.initBattle("battle-7", trainerA, trainerB);
    const { state, result } = BattleEngine.executeTurn(battle, "attack");

    expect(result.targetFainted).toBe(true);
    expect(state.isFinished).toBe(true);
    expect(state.winnerTrainerId).toBe("t1");
    expect(state.trainerB.pokemon.currentHp).toBe(0);
  });

  it("renders visual HP bar accurately", () => {
    expect(BattleEngine.renderHpBar(100, 100, 5)).toBe("🟩🟩🟩🟩🟩");
    expect(BattleEngine.renderHpBar(60, 100, 5)).toBe("🟩🟩🟩⬜⬜");
    expect(BattleEngine.renderHpBar(30, 100, 5)).toBe("🟨🟨⬜⬜⬜");
    expect(BattleEngine.renderHpBar(10, 100, 5)).toBe("🟥⬜⬜⬜⬜");
    expect(BattleEngine.renderHpBar(0, 100, 5)).toBe("⬜⬜⬜⬜⬜");
  });
});
