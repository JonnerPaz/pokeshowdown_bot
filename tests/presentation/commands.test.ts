import { describe, expect, it } from "vitest";
import {
  commands,
  getAllCommands,
  getCommandRegistrations,
} from "../../src/presentation/controllers/commands.js";

describe("Command Registrations", () => {
  it("registers every command for the default and group scopes in both languages", () => {
    const registrations = getCommandRegistrations();

    const scopes = new Set(registrations.map((registration) => registration.scope.type));
    expect(scopes).toEqual(new Set(["default", "all_group_chats"]));

    const groupRegistrations = registrations.filter(
      (registration) => registration.scope.type === "all_group_chats",
    );
    expect(groupRegistrations).toHaveLength(2);
    expect(groupRegistrations.some((registration) => registration.language_code === "es")).toBe(
      true,
    );
    expect(
      groupRegistrations.some((registration) => registration.language_code === undefined),
    ).toBe(true);

    const expectedCommandCount = Object.keys(commands).length;
    for (const registration of registrations) {
      expect(registration.commands).toHaveLength(expectedCommandCount);
      for (const command of registration.commands) {
        expect(command.command.length).toBeGreaterThan(0);
        expect(command.description.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns localized command metadata", () => {
    expect(getAllCommands("en")[0]?.command).toBe("start");
    expect(getAllCommands("es")[0]?.command).toBe("comenzar");
  });
});
