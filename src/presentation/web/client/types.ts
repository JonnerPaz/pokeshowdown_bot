import type { ArenaRoomDto } from "../../../features/arena/arena.serializer.js";
import type { SerializedProfile } from "../serialize.js";
import type { RoomStreamStatus } from "./sse.js";

export type View = "home" | "room" | "error";
export type StreamState = "off" | RoomStreamStatus;

export interface AppState {
  view: View;
  profile: SerializedProfile | null;
  room: ArenaRoomDto | null;
  error: string | null;
  retryable: boolean;
  notice: string | null;
  busy: boolean;
  streamStatus: StreamState;
  confirmLeave: boolean;
  confirmForfeit: boolean;
  copied: boolean;
}
