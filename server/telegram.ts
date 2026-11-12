import { ENV } from "./_core/env";

type TelegramRequestAlert = {
  kind: "deposit" | "withdrawal";
  requestId: number;
  userId: number;
  amount: string;
  network: string;
  asset: string;
  txHash?: string;
  destinationAddress?: string;
};

function maskAddress(address: string) {
  const trimmed = address.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-6)}`;
}

function formatAlert(input: TelegramRequestAlert) {
  const title = input.kind === "deposit" ? "입금 요청" : "출금 요청";
  const lines = [
    `🔔 Daonmarkets ${title}`,
    `회원 ID: ${input.userId}`,
    `요청 ID: ${input.requestId}`,
    `자산: ${input.asset}`,
    `네트워크: ${input.network}`,
    `금액: ${input.amount}`,
    "상태: 검토 대기",
  ];
  if (input.txHash) lines.push(`거래 해시: ${input.txHash}`);
  if (input.destinationAddress) {
    lines.push(`수취 주소: ${maskAddress(input.destinationAddress)}`);
  }
  lines.push("사이트는 자동 송금하지 않으며 관리자 수동 확인이 필요합니다.");
  return lines.join("\n");
}

/** Send a best-effort operational alert without blocking the member request. */
export async function notifyTelegramRequest(input: TelegramRequestAlert) {
  const token = ENV.telegramBotToken.trim();
  const chatId = ENV.telegramChatId.trim();
  if (!token || !chatId) {
    console.warn("[Telegram] Alert skipped: Telegram secrets are not configured.");
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: formatAlert(input),
        disable_web_page_preview: true,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Telegram] Alert failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Telegram] Alert request failed:", error);
    return false;
  }
}
