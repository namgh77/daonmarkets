import { type FormEvent, useState } from "react";
import {
  ArrowLeft,
  Check,
  LogOut,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  FinanceStatus,
  formatFinanceDate,
  type FinanceStatusValue,
} from "@/components/FinanceStatus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import "../admin-finance.css";

type Kind = "deposit" | "withdrawal";
type FilterStatus = "ALL" | FinanceStatusValue;
type Decision = "APPROVED" | "REJECTED";
type RequestItem = {
  id: number;
  userId: number;
  memberName: string | null;
  memberEmail: string | null;
  asset: string;
  network: string;
  amount: string;
  status: FinanceStatusValue;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  txHash: string | null;
  destinationAddress: string | null;
};

export default function AdminFinance() {
  const {
    user,
    loading,
    error: authError,
    logout,
  } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [kind, setKind] = useState<Kind>("deposit");
  const [status, setStatus] = useState<FilterStatus>("PENDING");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null
  );
  const [entry, setEntry] = useState({
    memberEmail: "",
    amount: "",
    network: "TRC20" as "TRC20" | "BEP20",
    txHash: "",
    note: "",
  });
  const isAdmin = user?.role === "admin";

  const list = trpc.admin.finance.list.useQuery(
    { kind, status, page, pageSize: 20 },
    { enabled: isAdmin, retry: false }
  );
  const audit = trpc.admin.finance.audit.useQuery(
    { kind, id: selected?.id ?? 0 },
    { enabled: isAdmin && Boolean(selected), retry: false }
  );
  const review = trpc.admin.finance.review.useMutation({
    onSuccess: async result => {
      setSelected(null);
      setNote("");
      setDecision(null);
      setNotice({
        text: `요청 #${result.id}의 검토 ${result.status === "APPROVED" ? "승인" : "거절"}을 기록했습니다. 자금 이동은 없습니다.`,
        error: false,
      });
      await Promise.all([
        utils.admin.finance.list.invalidate(),
        utils.admin.finance.audit.invalidate(),
        utils.finance.deposits.mine.invalidate(),
        utils.finance.withdrawals.mine.invalidate(),
      ]);
    },
    onError: async err => {
      setDecision(null);
      setNotice({ text: err.message, error: true });
      // Another operator may already have reviewed the request.
      if (err.data?.code === "CONFLICT" || err.data?.code === "NOT_FOUND") {
        setSelected(null);
        setNote("");
        await utils.admin.finance.list.invalidate();
      }
    },
  });
  const createDepositEntry = trpc.admin.finance.createDepositEntry?.useMutation?.({
    onSuccess: async result => {
      setEntry({ memberEmail: "", amount: "", network: "TRC20", txHash: "", note: "" });
      setNotice({ text: `회원 장부에 외부 입금 #${result.id}를 관리자 직접 기록했습니다. 실제 송금은 실행되지 않았습니다.`, error: false });
      await Promise.all([
        utils.admin.finance.list.invalidate(),
        utils.admin.finance.audit.invalidate(),
      ]);
    },
    onError: error => setNotice({ text: error.message, error: true }),
  });

  const resetSelection = () => {
    setSelected(null);
    setNote("");
    setDecision(null);
    setNotice(null);
  };
  const signOut = async () => {
    try {
      await logout();
      navigate("/");
    } catch {
      setNotice({
        text: "로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.",
        error: true,
      });
    }
  };

  if (loading) {
    return (
      <div className="member-loading">
        <div className="member-loading-mark" />
        <p>운영자 권한 확인 중…</p>
      </div>
    );
  }
  if (authError) {
    return (
      <div className="member-loading">
        <p role="alert">로그인 상태를 확인하지 못했습니다.</p>
        <Link href="/login">로그인 화면으로</Link>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="member-loading">
        <p>로그인이 필요합니다.</p>
        <Link href="/login">로그인</Link>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="member-loading">
        <ShieldCheck size={30} />
        <h1>운영자 전용 화면입니다.</h1>
        <p>
          일반 회원은 금융 요청을 검토하거나 다른 회원의 기록을 조회할 수
          없습니다.
        </p>
        <Link href="/member">내 회원 화면으로 돌아가기</Link>
      </div>
    );
  }

  const noteIsValid = note.trim().length >= 3 && note.trim().length <= 1000;
  const canReview =
    selected?.status === "PENDING" && noteIsValid && !review.isPending;
  const submitDepositEntry = (event: FormEvent) => {
    event.preventDefault();
    if (!createDepositEntry || createDepositEntry.isPending) return;
    createDepositEntry.mutate({
      ...entry,
      txHash: entry.txHash.trim() || undefined,
    });
  };

  return (
    <div className="member-shell">
      <header className="member-header">
        <Link href="/" className="auth-wordmark">
          <span className="wordmark-mark">
            <span />
            <span />
            <span />
          </span>
          <span>
            DAON<span className="wordmark-accent">MARKETS</span>
          </span>
        </Link>
        <div className="member-header-actions">
          <Link href="/admin" className="admin-back">
            <ArrowLeft size={15} /> 운영 홈
          </Link>
          <button
            className="member-logout"
            onClick={signOut}
            disabled={review.isPending}
          >
            <LogOut size={15} /> 로그아웃
          </button>
        </div>
      </header>

      <main className="admin-main">
        <section className="admin-hero">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> OPERATIONS / REVIEW
            </div>
            <h1>
              요청을 확인하고,
              <br />
              <em>결정을 기록합니다.</em>
            </h1>
          </div>
          <div className="admin-operator">
            <ShieldCheck size={19} />
            <div>
              <span>인증된 운영자</span>
              <strong>{user.name || "운영자"}</strong>
            </div>
          </div>
        </section>

        <div className="admin-safety" role="note">
          <ShieldCheck size={20} />
          <div>
            <strong>검토 승인 ≠ 입금 확인 또는 출금 완료</strong>
            <p>
              이 화면은 요청의 검토 상태와 사유만 기록합니다. 잔액 반영, 지갑
              발급, 블록체인 검증, 실제 송금은 실행하지 않습니다. 실제 자금을
              전송하지 마세요.
            </p>
          </div>
        </div>

        <section aria-label="금융 요청 필터" className="admin-filters">
          <label>
            요청 종류
            <select
              value={kind}
              disabled={review.isPending}
              onChange={event => {
                setKind(event.target.value as Kind);
                setPage(1);
                resetSelection();
              }}
            >
              <option value="deposit">입금 요청</option>
              <option value="withdrawal">출금 요청</option>
            </select>
          </label>
          <label>
            검토 상태
            <select
              value={status}
              disabled={review.isPending}
              onChange={event => {
                setStatus(event.target.value as FilterStatus);
                setPage(1);
                resetSelection();
              }}
            >
              <option value="PENDING">검토 대기</option>
              <option value="APPROVED">검토 승인</option>
              <option value="REJECTED">요청 거절</option>
              <option value="ALL">전체 상태</option>
            </select>
          </label>
          <button
            className="admin-quiet-button"
            disabled={list.isFetching || review.isPending}
            onClick={() => {
              resetSelection();
              void list.refetch();
            }}
          >
            <RefreshCw size={15} /> 새로고침
          </button>
        </section>

        {notice && (
          <div
            className={`admin-feedback ${notice.error ? "is-error" : ""}`}
            role={notice.error ? "alert" : "status"}
          >
            {notice.text}
          </div>
        )}

        <section className="admin-manual-entry" aria-labelledby="manual-entry-title">
          <div className="admin-section-title">
            <div>
              <h2 id="manual-entry-title">외부 입금 수동 기록</h2>
              <p>회원 요청 없이 운영자가 외부에서 확인한 입금을 장부에 기록합니다.</p>
            </div>
          </div>
          <form className="admin-manual-entry-form" onSubmit={submitDepositEntry}>
            <label>회원 이메일<input required type="email" value={entry.memberEmail} onChange={event => setEntry({ ...entry, memberEmail: event.target.value })} placeholder="회원 계정 이메일" /></label>
            <label>금액<input required value={entry.amount} onChange={event => setEntry({ ...entry, amount: event.target.value })} placeholder="예: 1000" /></label>
            <label>자산·네트워크<select value={entry.network} onChange={event => setEntry({ ...entry, network: event.target.value as "TRC20" | "BEP20" })}><option value="TRC20">USDT · TRC20</option><option value="BEP20">BNB · BEP20</option></select></label>
            <label>거래 해시 (선택)<input value={entry.txHash} onChange={event => setEntry({ ...entry, txHash: event.target.value })} placeholder="확인 가능한 경우 입력" /></label>
            <label className="admin-manual-entry-note">관리자 기록 사유<textarea required minLength={3} maxLength={1000} value={entry.note} onChange={event => setEntry({ ...entry, note: event.target.value })} placeholder="외부 입금 경로와 확인 내용을 기록하세요." /></label>
            <button className="admin-approve" type="submit" disabled={!createDepositEntry || createDepositEntry.isPending}>{createDepositEntry?.isPending ? "기록 중…" : "외부 입금 기록"}</button>
          </form>
          <p className="admin-format-note">이 기능은 회원 요청을 대신하는 장부 기록입니다. 블록체인 확인, 잔액 반영, 실제 송금은 실행하지 않습니다.</p>
        </section>

        <div className="admin-workspace">
          <section className="admin-list" aria-label="금융 요청 목록">
            <div className="admin-section-title">
              <h2>{kind === "deposit" ? "입금" : "출금"} 요청</h2>
              <span>페이지 {page} · 최대 20건</span>
            </div>
            {list.isLoading ? (
              <p className="admin-empty" role="status">
                요청 목록을 불러오는 중…
              </p>
            ) : list.isError ? (
              <div className="admin-empty" role="alert">
                <p>목록을 불러오지 못했습니다. {list.error.message}</p>
                <button
                  className="admin-quiet-button"
                  onClick={() => void list.refetch()}
                >
                  다시 시도
                </button>
              </div>
            ) : !list.data?.items.length ? (
              <p className="admin-empty">이 조건에 해당하는 요청이 없습니다.</p>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>요청 / 회원</th>
                      <th>금액 / 네트워크</th>
                      <th>상태 / 접수 시각</th>
                      <th>상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.map(item => (
                      <tr
                        key={item.id}
                        className={
                          selected?.id === item.id ? "is-selected" : ""
                        }
                      >
                        <td>
                          <strong>#{item.id}</strong>
                          <span>
                            {item.memberName || `회원 #${item.userId}`}
                          </span>
                        </td>
                        <td>
                          <strong>
                            {item.amount} {item.asset}
                          </strong>
                          <span>{item.network}</span>
                        </td>
                        <td>
                          <FinanceStatus status={item.status} />
                          <span>{formatFinanceDate(item.createdAt)}</span>
                        </td>
                        <td>
                          <button
                            className="admin-open"
                            aria-pressed={selected?.id === item.id}
                            disabled={review.isPending}
                            onClick={() => {
                              setSelected(item);
                              setNote("");
                              setNotice(null);
                            }}
                          >
                            열기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <nav className="admin-pagination" aria-label="요청 목록 페이지">
              <button
                disabled={page === 1 || list.isFetching || review.isPending}
                onClick={() => {
                  setPage(value => value - 1);
                  resetSelection();
                }}
              >
                이전
              </button>
              <span>{page}</span>
              <button
                disabled={
                  !list.data?.hasMore ||
                  list.isFetching ||
                  list.isError ||
                  review.isPending
                }
                onClick={() => {
                  setPage(value => value + 1);
                  resetSelection();
                }}
              >
                다음
              </button>
            </nav>
          </section>

          <aside className="admin-inspector" aria-label="선택한 요청 상세">
            {!selected ? (
              <div className="admin-inspector-empty">
                <ShieldCheck size={29} />
                <h2>먼저 요청을 선택하세요.</h2>
                <p>
                  회원 정보와 제출 내용을 확인하고, 판단 사유를 남겨 주세요.
                </p>
              </div>
            ) : (
              <>
                <div className="admin-section-title">
                  <h2>요청 #{selected.id}</h2>
                  <FinanceStatus status={selected.status} />
                </div>
                <dl className="admin-details">
                  <dt>회원</dt>
                  <dd>
                    {selected.memberName || `회원 #${selected.userId}`}
                    <small>{selected.memberEmail || "이메일 정보 없음"}</small>
                  </dd>
                  <dt>금액</dt>
                  <dd>
                    {selected.amount} {selected.asset}
                  </dd>
                  <dt>네트워크</dt>
                  <dd>{selected.network}</dd>
                  <dt>접수 시각</dt>
                  <dd>{formatFinanceDate(selected.createdAt)}</dd>
                  <dt>수정 시각</dt>
                  <dd>{formatFinanceDate(selected.updatedAt)}</dd>
                  {kind === "deposit" ? (
                    <>
                      <dt>거래 해시</dt>
                      <dd className="admin-address">
                        {selected.txHash || "미제출 · 입금 확인 아님"}
                      </dd>
                    </>
                  ) : (
                    <>
                      <dt>출금 요청 주소</dt>
                      <dd className="admin-address">
                        {selected.destinationAddress}
                      </dd>
                    </>
                  )}
                </dl>
                <p className="admin-format-note">
                  제출한 주소·해시는 기본 형식만 검사합니다. 실제 체인
                  거래·잔액·지갑 소유권은 확인하지 않습니다.
                </p>
                {selected.status === "PENDING" ? (
                  <div className="admin-review-form">
                    <label htmlFor="review-note">
                      처리 사유 <span>회원에게 공개됩니다.</span>
                    </label>
                    <textarea
                      id="review-note"
                      rows={4}
                      minLength={3}
                      maxLength={1000}
                      disabled={review.isPending}
                      value={note}
                      onChange={event => setNote(event.target.value)}
                      placeholder="검토 판단의 이유를 3자 이상 기록하세요."
                    />
                    <small>
                      {note.trim().length} / 1,000자 · 내부 비밀정보를 넣지
                      마세요.
                    </small>
                    <div className="admin-decision-buttons">
                      <button
                        className="admin-approve"
                        disabled={!canReview}
                        onClick={() => setDecision("APPROVED")}
                      >
                        <Check size={16} /> 검토 승인
                      </button>
                      <button
                        className="admin-reject"
                        disabled={!canReview}
                        onClick={() => setDecision("REJECTED")}
                      >
                        <X size={16} /> 요청 거절
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-reviewed">
                    <strong>이미 처리된 요청입니다.</strong>
                    <p>
                      {selected.reviewNote ||
                        "이전 기록에 공개 처리 사유가 없습니다."}
                    </p>
                    <small>재승인이나 상태 되돌리기는 허용하지 않습니다.</small>
                  </div>
                )}
                <section className="admin-audit" aria-label="요청 검토 이력">
                  <h3>검토 이력</h3>
                  {audit.isLoading ? (
                    <p role="status">이력 조회 중…</p>
                  ) : audit.isError ? (
                    <p role="alert">
                      검토 이력을 불러오지 못했습니다. {audit.error.message}
                    </p>
                  ) : !audit.data?.length ? (
                    <p>검토 이력이 아직 없습니다.</p>
                  ) : (
                    audit.data.map(entry => (
                      <article key={entry.id}>
                        <FinanceStatus status={entry.toStatus} />
                        <strong>
                          {entry.reviewerName || `운영자 #${entry.reviewerId}`}
                        </strong>
                        <time
                          dateTime={new Date(entry.createdAt).toISOString()}
                        >
                          {formatFinanceDate(entry.createdAt)}
                        </time>
                        <p>{entry.note}</p>
                      </article>
                    ))
                  )}
                </section>
              </>
            )}
          </aside>
        </div>
      </main>
      <footer className="member-footer">
        <span>© 2026 Daonmarkets</span>
        <span>검토 기록 전용 · 실제 자금 이동 없음</span>
      </footer>

      <AlertDialog
        open={Boolean(decision)}
        onOpenChange={open => {
          if (!open && !review.isPending) setDecision(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              요청 #{selected?.id}를{" "}
              {decision === "APPROVED" ? "검토 승인" : "거절"}하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              처리 후 되돌릴 수 없으며 사유는 회원에게 공개됩니다. 검토 승인으로
              실제 입금 확인·잔액 반영·출금이 실행되지는 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="admin-confirm-details">
            <strong>
              {selected?.amount} {selected?.asset} · {selected?.network}
            </strong>
            <p>{note.trim()}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={review.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!canReview}
              onClick={event => {
                event.preventDefault();
                if (!selected || !decision || !canReview) return;
                review.mutate({
                  kind,
                  id: selected.id,
                  decision,
                  note: note.trim(),
                });
              }}
            >
              {review.isPending ? "기록 중…" : "확인 후 기록"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
