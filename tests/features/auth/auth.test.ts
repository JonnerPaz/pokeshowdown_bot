import { describe, expect, it } from "vitest";
import { createTestBot } from "../../harness/testHarness.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";

describe("Auth & Registration Integration (/register, /delete_account)", () => {
  it("rejects registration when user has no telegram username", async () => {
    const { dispatchCommand, client } = await createTestBot();

    await dispatchCommand("/register", { fromId: 401, username: "" });

    const sent = client.getSentMessages();
    expect(sent.length).toBeGreaterThanOrEqual(1);
    expect(sent.some((m) => m.text?.includes("need to have a Telegram username"))).toBe(true);
  });

  it("completes full registration flow with starter selection and persistence", async () => {
    const { dispatchCommand, dispatchCallback, client, userDataSource } = await createTestBot();

    const userId = 501;
    const username = "misty_water";

    // 1. Initiate registration
    const registerPromise = dispatchCommand("/register", { fromId: userId, username });

    // Let the conversation render starters
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 2. Click starter 0 (Bulbasaur)
    await dispatchCallback("starter0", { fromId: userId, username });
    await registerPromise;

    // 3. Verify user was created in datasource
    const createdUser = await userDataSource.findUserByTelegramId(userId);
    expect(createdUser).toBeDefined();
    expect(createdUser?.username).toBe(username);
    expect(createdUser?.pokemons.length).toBe(1);
    expect(createdUser?.pokemons[0]?.name).toBe("bulbasaur");
    expect(createdUser?.pokeballs).toBe(10);
    expect(createdUser?.greatballs).toBe(2);

    // 4. Verify confirmation reply was sent
    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("registered as @"))).toBe(true);
  });

  it("warns user if they are already registered", async () => {
    const { dispatchCommand, client, userDataSource } = await createTestBot();

    const userId = 601;
    userDataSource.seedUser(
      new UserEntity({
        id: 1,
        telegramId: BigInt(userId),
        username: "already_registered",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
      }),
    );

    await dispatchCommand("/register", { fromId: userId, username: "already_registered" });

    const sent = client.getSentMessages();
    expect(sent.some((m) => m.text?.includes("already registered"))).toBe(true);
  });

  it("deletes user account when confirmed via /delete_account", async () => {
    const { dispatchCommand, dispatchCallback, userDataSource } = await createTestBot();

    const userId = 701;
    userDataSource.seedUser(
      new UserEntity({
        id: 10,
        telegramId: BigInt(userId),
        username: "user_to_delete",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
      }),
    );

    // Initiate deletion
    const deletePromise = dispatchCommand("/delete_account", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Confirm deletion
    await dispatchCallback("delete-account", { fromId: userId });
    await deletePromise;

    // Verify user is deleted
    const deletedUser = await userDataSource.findUserByTelegramId(userId);
    expect(deletedUser).toBeNull();
  });
});
