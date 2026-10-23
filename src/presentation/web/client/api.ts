/// <reference lib="dom" />

import type { BattleActionType } from "../../../domain/battle/types.js";
import type { ArenaRoomDto } from "../../../features/arena/arena.serializer.js";
import type { SerializedProfile } from "../serialize.js";

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export interface TurnResultDto {
  attackerTelegramId: string;
  action: BattleActionType;
  damageDealt: number;
  typeMultiplier: number;
  isCritical: boolean;
  targetFainted: boolean;
}

interface RoomEnvelope {
  room: ArenaRoomDto;
}

interface CurrentRoomEnvelope {
  room: ArenaRoomDto | null;
}

interface ActionEnvelope {
  room: ArenaRoomDto;
  result: TurnResultDto;
}

interface TicketEnvelope {
  ticket: string;
}

export class ArenaApi {
  private readonly initData: string;

  constructor(initData: string) {
    this.initData = initData;
  }

  public getProfile(): Promise<SerializedProfile> {
    return this.request<SerializedProfile>("/me");
  }

  public async getCurrentRoom(): Promise<ArenaRoomDto | null> {
    const body = await this.request<CurrentRoomEnvelope>("/battles/current");
    return body.room;
  }

  public async createRoom(): Promise<ArenaRoomDto> {
    const body = await this.request<RoomEnvelope>("/battles", {
      method: "POST",
    });
    return body.room;
  }

  public async joinRoom(code: string): Promise<ArenaRoomDto> {
    const body = await this.request<RoomEnvelope>(`/battles/${encodeURIComponent(code)}/join`, {
      method: "POST",
    });
    return body.room;
  }

  public async pickPokemon(code: string, pokemonId: number): Promise<ArenaRoomDto> {
    const body = await this.request<RoomEnvelope>(`/battles/${encodeURIComponent(code)}/pokemon`, {
      method: "POST",
      body: JSON.stringify({ pokemonId }),
    });
    return body.room;
  }

  public submitAction(code: string, action: BattleActionType): Promise<ActionEnvelope> {
    return this.request<ActionEnvelope>(`/battles/${encodeURIComponent(code)}/action`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  }

  public async leaveRoom(code: string): Promise<ArenaRoomDto | null> {
    const body = await this.request<CurrentRoomEnvelope>(
      `/battles/${encodeURIComponent(code)}/leave`,
      { method: "POST" },
    );
    return body.room;
  }

  public getStreamTicket(code: string): Promise<TicketEnvelope> {
    return this.request<TicketEnvelope>(`/battles/${encodeURIComponent(code)}/ticket`, {
      method: "POST",
    });
  }

  public async getRoom(code: string): Promise<ArenaRoomDto> {
    const body = await this.request<RoomEnvelope>(`/battles/${encodeURIComponent(code)}`);
    return body.room;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("x-telegram-init-data", this.initData);
    if (init.body !== undefined) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(`/api${path}`, { ...init, headers });
    const text = await response.text();
    let payload: unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const body = payload as ApiErrorBody | null;
      throw new ApiError(
        response.status,
        body?.error?.code ?? "http_error",
        body?.error?.message ?? response.statusText ?? "Request failed",
      );
    }

    return payload as T;
  }
}
