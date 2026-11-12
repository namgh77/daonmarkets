import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyTelegramRequest } from "./telegram";

const originalToken = process.env.TELEGRAM_BOT_TOKEN;
const originalChatId = process.env.TELEGRAM_CHAT_ID;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN = originalToken;
  if (originalChatId === undefined) delete process.env.TELEGRAM_CHAT_ID;
  else process.env.TELEGRAM_CHAT_ID = originalChatId;
});

describe("Telegram request alerts", () => {
  it("sends a pending deposit alert with the configured bot and chat", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "123456";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(
      notifyTelegramRequest({
        kind: "deposit",
        requestId: 7,
        userId: 42,
        amount: "12.50",
        network: "TRC20",
        asset: "USDT",
        txHash: "tx-123",
      })
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest-token/sendMessage",
      expect.objectContaining({ method: "POST" })
    );
    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body));
    expect(body.chat_id).toBe("123456");
    expect(body.text).toContain("입금 요청");
    expect(body.text).toContain("회원 ID: 42");
    expect(body.text).toContain("상태: 검토 대기");
  });

  it("masks a withdrawal destination address in Telegram", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "123456";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await notifyTelegramRequest({
      kind: "withdrawal",
      requestId: 8,
      userId: 42,
      amount: "3",
      network: "BEP20",
      asset: "BNB",
      destinationAddress: "0x1234567890abcdef1234567890abcdef12345678",
    });

    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body));
    expect(body.text).toContain("수취 주소: 0x1234…345678");
    expect(body.text).not.toContain("0x1234567890abcdef1234567890abcdef12345678");
  });

  it("skips delivery when secrets are not configured", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      notifyTelegramRequest({
        kind: "deposit",
        requestId: 9,
        userId: 42,
        amount: "1",
        network: "TRC20",
        asset: "USDT",
      })
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
