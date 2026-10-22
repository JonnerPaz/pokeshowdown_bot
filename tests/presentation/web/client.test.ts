import { describe, expect, it } from "vitest";

import { createSseParser } from "../../../src/presentation/web/client/sse.js";

describe("mini app sse parser", () => {
  it("buffers frames split across network chunks", () => {
    const parser = createSseParser();

    expect(parser.feed("event: snap")).toEqual([]);
    expect(parser.feed('shot\nid: 4\ndata: {"code":"ABC123"}\n\n')).toEqual([
      { event: "snapshot", id: "4", data: '{"code":"ABC123"}' },
    ]);
  });

  it("joins multi-line data and ignores comments", () => {
    const parser = createSseParser();

    expect(parser.feed(": ping\n\nevent: turn\ndata: first\ndata: second\n\n")).toEqual([
      { event: "turn", data: "first\nsecond" },
    ]);
  });

  it("accepts CRLF frames and defaults to the message event", () => {
    const parser = createSseParser();

    expect(parser.feed("data: hello\r\n\r\n")).toEqual([{ event: "message", data: "hello" }]);
  });

  it("ignores frames without data and keeps trailing bytes buffered", () => {
    const parser = createSseParser();

    expect(parser.feed("event: room\n\n")).toEqual([]);
    expect(parser.feed("event: room\ndata: partial")).toEqual([]);
    expect(parser.feed("\n\n")).toEqual([{ event: "room", data: "partial" }]);
  });
});
