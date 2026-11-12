export type FinanceStatusValue = "PENDING" | "APPROVED" | "REJECTED";

export const financeStatusLabels: Record<FinanceStatusValue, string> = {
  PENDING: "검토 대기",
  APPROVED: "검토 승인 · 송금 아님",
  REJECTED: "요청 거절",
};

export function FinanceStatus({ status }: { status: FinanceStatusValue }) {
  return (
    <span className={`request-status request-status-${status.toLowerCase()}`}>
      {financeStatusLabels[status]}
    </span>
  );
}

export function formatFinanceDate(value: Date | string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
