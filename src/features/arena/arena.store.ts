import type { ArenaRoom } from "./arena.types.js";

/**
 * In-memory room index. Rooms are ephemeral by design: a deploy drops every
 * lobby and battle, exactly like the chat flow (nothing battle-related is
 * persisted). The store keeps two maps so "one active room per trainer" is an
 * O(1) check instead of a scan.
 */
export class ArenaRoomStore {
  private readonly rooms = new Map<string, ArenaRoom>();
  private readonly activeRoomByUser = new Map<number, string>();

  public get size(): number {
    return this.rooms.size;
  }

  public create(room: ArenaRoom): void {
    this.rooms.set(room.code, room);
  }

  public get(code: string): ArenaRoom | null {
    return this.rooms.get(code) ?? null;
  }

  public values(): ArenaRoom[] {
    return [...this.rooms.values()];
  }

  public markActive(telegramId: number, code: string): void {
    this.activeRoomByUser.set(telegramId, code);
  }

  public release(telegramId: number, code?: string): void {
    if (code !== undefined && this.activeRoomByUser.get(telegramId) !== code) return;
    this.activeRoomByUser.delete(telegramId);
  }

  public getActiveRoom(telegramId: number): ArenaRoom | null {
    const code = this.activeRoomByUser.get(telegramId);
    if (code === undefined) return null;
    return this.rooms.get(code) ?? null;
  }

  public delete(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    for (const participant of room.participants) {
      this.release(participant.telegramId, code);
    }
    this.rooms.delete(code);
  }

  public clear(): void {
    this.rooms.clear();
    this.activeRoomByUser.clear();
  }
}
