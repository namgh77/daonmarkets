import { type FormEvent, useState } from "react";
import { ArrowRight, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";
import MemberFinanceHistory from "@/components/MemberFinanceHistory";
import {
  depositInputSchema,
  financeAssetForNetwork,
  withdrawalInputSchema,
} from "@shared/finance";
import "../admin-finance.css";

const networks = ["TRC20", "BEP20"] as const;
type Network = (typeof networks)[number];

export default function Member() {
  const {
    user,
    loading,
    error: authError,
    logout,
  } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [deposit, setDeposit] = useState({
    amount: "",
    network: "TRC20" as Network,
    txHash: "",
  });
  const [withdrawal, setWithdrawal] = useState({
    amount: "",
    network: "TRC20" as Network,
    destinationAddress: "",
  });
  const [feedback, setFeedback] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  const createDeposit = trpc.finance.deposits.create.useMutation({
    onSuccess: async () => {
      setDeposit({ amount: "", network: "TRC20", txHash: "" });
      setFeedback({
        text: "입금 요청을 접수했습니다. 실제 입금은 확인되지 않았습니다. 자금을 전송하지 마세요.",
        error: false,
      });
      await utils.finance.deposits.mine.invalidate();
    },
    onError: error => setFeedback({ text: error.message, error: true }),
  });
  const createWithdrawal = trpc.finance.withdrawals.create.useMutation({
    onSuccess: async () => {
      setWithdrawal({ amount: "", network: "TRC20", destinationAddress: "" });
      setFeedback({
        text: "출금 요청을 접수했습니다. 현재는 검토 대기이며 실제 송금은 실행되지 않았습니다.",
        error: false,
      });
      await utils.finance.withdrawals.mine.invalidate();
    },
    onError: error => setFeedback({ text: error.message, error: true }),
  });

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch {
      setFeedback({
        text: "로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.",
        error: true,
      });
    }
  };

  const submitDeposit = (event: FormEvent) => {
    event.preventDefault();
    if (createDeposit.isPending) return;
    setFeedback(null);
    const result = depositInputSchema.safeParse(deposit);
    if (!result.success) {
      setFeedback({
        text: result.error.issues[0]?.message || "입력값을 확인해 주세요.",
        error: true,
      });
      return;
    }
    createDeposit.mutate(result.data);
  };
  const submitWithdrawal = (event: FormEvent) => {
    event.preventDefault();
    if (createWithdrawal.isPending) return;
    setFeedback(null);
    const result = withdrawalInputSchema.safeParse(withdrawal);
    if (!result.success) {
      setFeedback({
        text: result.error.issues[0]?.message || "입력값을 확인해 주세요.",
        error: true,
      });
      return;
    }
    createWithdrawal.mutate(result.data);
  };

  if (loading) {
    return (
      <div className="member-loading">
        <div className="member-loading-mark" />
        <p>회원 로그인 상태 확인 중…</p>
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
          <Link href="/member/services" className="member-admin-link">
            공지·자료·문의
          </Link>
          {user.role === "admin" && (
            <Link href="/admin" className="member-admin-link">
              <ShieldCheck size={15} /> 운영 관리
            </Link>
          )}
          <span className="member-secure">
            <ShieldCheck size={15} /> Secure session
          </span>
          <button
            className="member-logout"
            onClick={handleLogout}
            disabled={createDeposit.isPending || createWithdrawal.isPending}
          >
            <LogOut size={15} /> 로그아웃
          </button>
        </div>
      </header>

      <main className="member-main">
        <section className="member-hero">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> MEMBER SPACE
            </div>
            <h1>
              Account activity,
              <br />
              <em>in context.</em>
            </h1>
            <p>
              보호된 회원 공간에서 입금·출금 요청을 접수하고 운영자의 검토
              결과를 확인하세요. 요청 접수나 검토 승인은 실제 자금 이동을 뜻하지
              않습니다.
            </p>
          </div>
          <div className="member-identity-card">
            <div className="member-avatar">
              <UserRound size={20} />
            </div>
            <div>
              <span className="member-card-label">SIGNED-IN ACCOUNT</span>
              <strong>{user.name || "Daonmarkets 회원"}</strong>
              <small>{user.email || "Manus account identity"}</small>
            </div>
            <span className="member-status">AUTHENTICATED</span>
          </div>
        </section>

        <section className="finance-notice" role="note">
          <ShieldCheck size={18} />
          <div>
            <strong>
              요청 접수와 검토만 가능합니다. 실제 자금을 전송하지 마세요.
            </strong>
            <p>
              입금 지갑 발급, 블록체인 거래 확인, 잔액 원장, 실제 출금은
              연결되지 않았습니다. 검토 승인도 입금 확인 또는 출금 완료가
              아닙니다.
            </p>
          </div>
        </section>

        <section className="finance-section">
          <div className="member-section-heading">
            <div className="eyebrow">
              <span className="eyebrow-line" /> FUNDS REQUESTS
            </div>
            <h2>
              입금·출금
              <br />
              요청 접수
            </h2>
          </div>
          <p className="finance-help">
            USDT(TRC20) 또는 BNB(BEP20) 금액은 정수 최대 12자리, 소수 최대 8자리의 양수로 입력하세요.
            주소·거래 해시는 기본 형식만 확인하며 실제 체인 거래나 지갑 소유권을
            검증하지 않습니다.
          </p>
          <div className="finance-form-grid">
            <form className="finance-card" onSubmit={submitDeposit}>
              <span className="member-module-number">01 / DEPOSIT REQUEST</span>
              <h3>입금 요청</h3>
              <p className="finance-help">
                예정 금액과 네트워크를 등록합니다. 거래 해시는 선택 항목이며
                제출해도 실제 입금 확인으로 처리되지 않습니다.
              </p>
              <label>
                금액 ({financeAssetForNetwork(deposit.network)})
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  maxLength={21}
                  disabled={createDeposit.isPending}
                  value={deposit.amount}
                  onChange={event =>
                    setDeposit({ ...deposit, amount: event.target.value })
                  }
                  placeholder="0.00"
                />
              </label>
              <label>
                자산·네트워크
                <select
                  disabled={createDeposit.isPending}
                  value={deposit.network}
                  onChange={event =>
                    setDeposit({
                      ...deposit,
                      network: event.target.value as Network,
                    })
                  }
                >
                  {networks.map(item => (
                    <option key={item} value={item}>{financeAssetForNetwork(item)} · {item}</option>
                  ))}
                </select>
              </label>
              <label>
                거래 해시 (선택)
                <input
                  maxLength={160}
                  disabled={createDeposit.isPending}
                  value={deposit.txHash}
                  onChange={event =>
                    setDeposit({ ...deposit, txHash: event.target.value })
                  }
                  placeholder={
                    deposit.network === "TRC20"
                      ? "64자리 16진수 해시"
                      : "0x로 시작하는 거래 해시"
                  }
                />
              </label>
              <button
                className="finance-submit"
                type="submit"
                disabled={createDeposit.isPending}
              >
                {createDeposit.isPending ? "접수 중…" : "입금 요청 접수"}{" "}
                <ArrowRight size={16} />
              </button>
            </form>

            <form className="finance-card" onSubmit={submitWithdrawal}>
              <span className="member-module-number">
                02 / WITHDRAWAL REQUEST
              </span>
              <h3>출금 요청</h3>
              <p className="finance-help">
                희망 금액과 주소를 등록합니다. 현재는 검토 요청만 기록하며
                송금·잔액 차감·수수료 계산은 수행하지 않습니다.
              </p>
              <label>
                금액 ({financeAssetForNetwork(withdrawal.network)})
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  maxLength={21}
                  disabled={createWithdrawal.isPending}
                  value={withdrawal.amount}
                  onChange={event =>
                    setWithdrawal({ ...withdrawal, amount: event.target.value })
                  }
                  placeholder="0.00"
                />
              </label>
              <label>
                자산·네트워크
                <select
                  disabled={createWithdrawal.isPending}
                  value={withdrawal.network}
                  onChange={event =>
                    setWithdrawal({
                      ...withdrawal,
                      network: event.target.value as Network,
                    })
                  }
                >
                  {networks.map(item => (
                    <option key={item} value={item}>{financeAssetForNetwork(item)} · {item}</option>
                  ))}
                </select>
              </label>
              <label>
                출금 요청 지갑 주소
                <input
                  required
                  maxLength={160}
                  disabled={createWithdrawal.isPending}
                  value={withdrawal.destinationAddress}
                  onChange={event =>
                    setWithdrawal({
                      ...withdrawal,
                      destinationAddress: event.target.value,
                    })
                  }
                  placeholder={
                    withdrawal.network === "TRC20"
                      ? "T로 시작하는 34자리 주소"
                      : "0x로 시작하는 42자리 주소"
                  }
                />
              </label>
              <button
                className="finance-submit"
                type="submit"
                disabled={createWithdrawal.isPending}
              >
                {createWithdrawal.isPending ? "접수 중…" : "출금 요청 접수"}{" "}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
          {feedback && (
            <div
              className={`auth-notice finance-feedback ${feedback.error ? "auth-notice-error" : ""}`}
              role={feedback.error ? "alert" : "status"}
            >
              {feedback.text}
            </div>
          )}
        </section>

        <MemberFinanceHistory />

        <section className="member-next-step">
          <div>
            <div className="eyebrow eyebrow-light">
              <span className="eyebrow-line" /> CURRENT SCOPE
            </div>
            <h2>
              검토는 기록하고,
              <br />
              자금은 이동하지 않습니다.
            </h2>
          </div>
          <div>
            <p>
              운영자가 요청을 승인하거나 거절하면 위 이력에서 결과와 공개 사유를
              볼 수 있습니다. 잔액 원장, 지갑 확인, 실제 정산은 아직 구현되지
              않았습니다.
            </p>
            <Link href="/" className="button button-light">
              공개 홈페이지로 <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="member-footer">
        <span>© 2026 Daonmarkets</span>
        <span>보호된 회원 영역 · 요청 기록 전용</span>
      </footer>
    </div>
  );
}
