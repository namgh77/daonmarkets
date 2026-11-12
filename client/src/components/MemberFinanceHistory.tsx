import { trpc } from "@/lib/trpc";
import {
  FinanceStatus,
  formatFinanceDate,
  type FinanceStatusValue,
} from "./FinanceStatus";

type HistoryItem = {
  id: number;
  kind: "deposit" | "withdrawal";
  amount: string;
  asset: string;
  network: string;
  status: FinanceStatusValue;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function MemberFinanceHistory() {
  const deposits = trpc.finance.deposits.mine.useQuery(undefined, {
    retry: false,
  });
  const withdrawals = trpc.finance.withdrawals.mine.useQuery(undefined, {
    retry: false,
  });
  const items: HistoryItem[] = [
    ...(deposits.data ?? []).map(item => ({
      ...item,
      kind: "deposit" as const,
    })),
    ...(withdrawals.data ?? []).map(item => ({
      ...item,
      kind: "withdrawal" as const,
    })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
      b.id - a.id
  );
  const loading = deposits.isLoading || withdrawals.isLoading;
  const failed = deposits.isError || withdrawals.isError;
  const approvedDeposits = (deposits.data ?? []).filter(item => item.status === "APPROVED");
  const approvedWithdrawalTotals = (withdrawals.data ?? [])
    .filter(item => item.status === "APPROVED")
    .reduce<Record<string, number>>((totals, item) => {
      totals[item.asset] = (totals[item.asset] ?? 0) + Number(item.amount);
      return totals;
    }, {});
  const totalApprovedWithdrawals = Object.entries(approvedWithdrawalTotals)
    .map(([asset, amount]) => `${amount.toLocaleString("ko-KR")} ${asset}`)
    .join(" · ") || "0";
  const refresh = () => {
    void deposits.refetch();
    void withdrawals.refetch();
  };

  return (
    <section className="finance-history">
      <div className="member-section-heading">
        <div className="eyebrow">
          <span className="eyebrow-line" /> REQUEST HISTORY
        </div>
        <h2>내 입출금 요청</h2>
        <button
          className="admin-quiet-button"
          onClick={refresh}
          disabled={deposits.isFetching || withdrawals.isFetching}
        >
          처리 상태 새로고침
        </button>
      </div>
      <p className="finance-help">
        검토 승인은 요청 상태만 변경합니다. 실제 입금 확인, 잔액 반영, 출금
        완료를 뜻하지 않습니다.
      </p>
      {!failed && (
        <div className="finance-ledger-summary" aria-label="장부 현황 요약">
          <article>
            <span>승인된 입금 건</span>
            <strong>{approvedDeposits.length}건</strong>
          </article>
          <article>
            <span>승인된 총 출금액</span>
            <strong>{totalApprovedWithdrawals}</strong>
          </article>
          <article>
              <span>현재 표시 기준</span>
              <strong>운영 장부 기준</strong>
          </article>
        </div>
      )}
      {approvedDeposits.length ? (
        <div className="finance-position-grid" aria-label="입금 건별 장부 현황">
          <div className="finance-position-heading">
            <div className="eyebrow"><span className="eyebrow-line" /> DEPOSIT POSITIONS</div>
            <h3>입금 건별 장부 현황</h3>
            <p>각 승인 입금은 별도 건으로 기록됩니다. 운영 기록이 추가되기 전에는 누적 표시액이 0으로 표시됩니다.</p>
          </div>
          {approvedDeposits.map(item => {
            const principal = Number(item.amount);
            return (
              <article className="finance-position-card" key={item.id}>
                <div className="finance-position-top">
                  <span>입금 건 #{item.id}</span>
                  <strong>{item.asset} · {item.network}</strong>
                </div>
                <dl>
                  <div><dt>원금</dt><dd>{item.amount} {item.asset}</dd></div>
                  <div><dt>기준 표시액</dt><dd>{principal.toLocaleString("ko-KR")} {item.asset}</dd></div>
                  <div><dt>누적 표시액</dt><dd>0 {item.asset}</dd></div>
                  <div><dt>남은 표시액</dt><dd>{principal.toLocaleString("ko-KR")} {item.asset}</dd></div>
                </dl>
                <span className="finance-position-status">운영 기록 대기</span>
              </article>
            );
          })}
        </div>
      ) : null}
      {loading ? (
        <p className="request-empty" role="status">
          요청 이력을 불러오는 중…
        </p>
      ) : failed ? (
        <div className="auth-notice auth-notice-error" role="alert">
          요청 이력을 불러오지 못했습니다. 위의 새로고침 버튼으로 다시 시도해
          주세요.
        </div>
      ) : (
        <div className="request-table-wrap">
          <div className="request-table-head">
            <span>종류 / 접수 시각</span>
            <span>금액</span>
            <span>네트워크</span>
            <span>검토 상태</span>
          </div>
          {items.map(item => (
            <article className="request-row" key={`${item.kind}-${item.id}`}>
              <div>
                {item.kind === "deposit" ? "입금" : "출금"} #{item.id}
                <time
                  className="member-history-meta"
                  dateTime={new Date(item.createdAt).toISOString()}
                >
                  {formatFinanceDate(item.createdAt)}
                </time>
              </div>
              <span>
                {item.amount} {item.asset}
              </span>
              <span>{item.network}</span>
              <FinanceStatus status={item.status} />
              {item.status !== "PENDING" && (
                <div className="member-review-copy">
                  <strong>운영자 공개 처리 사유</strong>
                  <p>
                    {item.reviewNote || "이전 기록에 공개 사유가 없습니다."}
                  </p>
                  <time
                    className="member-history-meta"
                    dateTime={new Date(item.updatedAt).toISOString()}
                  >
                    수정: {formatFinanceDate(item.updatedAt)}
                  </time>
                </div>
              )}
            </article>
          ))}
          {!items.length && (
            <p className="request-empty">
              아직 제출한 입금·출금 요청이 없습니다.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
