export interface CapturedTelegramCall {
  method: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface SentMessageSummary {
  chatId: number;
  text?: string | undefined;
  reply_markup?: unknown;
}

export interface EditedMessageSummary {
  chatId: number;
  messageId?: number | undefined;
  text?: string | undefined;
  reply_markup?: unknown;
}

export class MockTelegramClient {
  public calls: CapturedTelegramCall[] = [];
  private nextMessageId = 1000;

  public createFetch(): typeof fetch {
    return async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ): Promise<Response> => {
      const urlStr = input.toString();
      const method = urlStr.split("/").pop() ?? "unknown";

      let payload: Record<string, unknown> = {};
      if (init?.body) {
        if (typeof init.body === "string") {
          try {
            payload = JSON.parse(init.body);
          } catch {
            payload = { raw: init.body };
          }
        } else if (typeof (init.body as FormData)?.forEach === "function") {
          const form = init.body as FormData;
          form.forEach((value, key) => {
            try {
              payload[key] = typeof value === "string" ? JSON.parse(value) : value;
            } catch {
              payload[key] = value;
            }
          });
        }
      }

      this.calls.push({
        method,
        payload,
        timestamp: Date.now(),
      });

      const responseBody = this.resolveResponse(method, payload);
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
  }

  private resolveResponse(
    method: string,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const now = Math.floor(Date.now() / 1000);
    const chatId = Number(payload.chat_id) || -100123456789;

    switch (method) {
      case "getMe":
        return {
          ok: true,
          result: {
            id: 123456789,
            is_bot: true,
            first_name: "PokeShowdownBot",
            username: "pokeshowdown_bot",
            can_join_groups: true,
            can_read_all_group_messages: true,
            supports_inline_queries: false,
            can_connect_to_business: false,
            has_main_web_app: false,
          },
        };

      case "sendMessage":
        return {
          ok: true,
          result: {
            message_id: this.nextMessageId++,
            date: now,
            chat: { id: chatId, type: "group", title: "Test Chat" },
            text: payload.text,
            reply_markup: payload.reply_markup,
          },
        };

      case "sendPhoto":
        return {
          ok: true,
          result: {
            message_id: this.nextMessageId++,
            date: now,
            chat: { id: chatId, type: "group", title: "Test Chat" },
            caption: payload.caption,
            photo: [{ file_id: "photo_1", file_unique_id: "u1", width: 300, height: 300 }],
            reply_markup: payload.reply_markup,
          },
        };

      case "sendMediaGroup":
        return {
          ok: true,
          result: [
            {
              message_id: this.nextMessageId++,
              date: now,
              chat: { id: chatId, type: "group" },
              photo: [{ file_id: "media_1", file_unique_id: "m1", width: 300, height: 300 }],
            },
          ],
        };

      case "editMessageText":
        return {
          ok: true,
          result: {
            message_id: payload.message_id ?? this.nextMessageId++,
            date: now,
            chat: { id: chatId, type: "group", title: "Test Chat" },
            text: payload.text,
            reply_markup: payload.reply_markup,
          },
        };

      case "deleteMessage":
      case "answerCallbackQuery":
      case "setMyCommands":
      case "deleteMyCommands":
        return {
          ok: true,
          result: true,
        };

      default:
        return {
          ok: true,
          result: true,
        };
    }
  }

  public getCalls(method?: string): CapturedTelegramCall[] {
    if (!method) return [...this.calls];
    return this.calls.filter((c) => c.method === method);
  }

  public getLastCall(method?: string): CapturedTelegramCall | undefined {
    const list = this.getCalls(method);
    return list.at(-1);
  }

  public getSentMessages(): SentMessageSummary[] {
    return this.getCalls("sendMessage").map((c) => ({
      chatId: Number(c.payload.chat_id),
      text: typeof c.payload.text === "string" ? c.payload.text : undefined,
      reply_markup: c.payload.reply_markup,
    }));
  }

  public getEditedMessages(): EditedMessageSummary[] {
    return this.getCalls("editMessageText").map((c) => ({
      chatId: Number(c.payload.chat_id),
      messageId: Number(c.payload.message_id) || undefined,
      text: typeof c.payload.text === "string" ? c.payload.text : undefined,
      reply_markup: c.payload.reply_markup,
    }));
  }

  public clear(): void {
    this.calls = [];
  }
}
