import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AdminApplications from "@/components/portal/AdminApplications";
import AdminContent from "@/components/portal/AdminContent";
import AdminTickets from "@/components/portal/AdminTickets";
import AdminFaq from "@/components/portal/AdminFaq";
import "../portal-admin.css";

type Tab = "access" | "announcements" | "materials" | "faq" | "tickets" | "invites";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "access", label: "회원 승인" },
  { id: "announcements", label: "공지 관리" },
  { id: "materials", label: "자료 관리" },
  { id: "faq", label: "FAQ 관리" },
  { id: "tickets", label: "문의 관리" },
  { id: "invites", label: "초대 링크" },
];

export default function AdminPortal() {
  const { user, loading, error, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("access");
  const [logoutError, setLogoutError] = useState("");
  const summary = trpc.admin.portal.summary.useQuery(undefined, {
    enabled: user?.role === "admin",
    retry: false,
  });
  const signOut = async () => {
    try {
      await logout();
      navigate("/");
    } catch {
      setLogoutError("로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.");
    }
  };
  if (loading)
    return (
      <div className="member-loading">
        <div className="member-loading-mark" />
        <p>운영자 권한 확인 중…</p>
      </div>
    );
  if (error)
    return (
      <div className="member-loading">
        <p role="alert">로그인 상태를 확인하지 못했습니다.</p>
        <Link href="/login">로그인 화면</Link>
      </div>
    );
  if (!user)
    return (
      <div className="member-loading">
        <p>로그인이 필요합니다.</p>
        <Link href="/login">로그인</Link>
      </div>
    );
  if (user.role !== "admin")
    return (
      <div className="member-loading">
        <ShieldCheck />
        <h1>운영자 전용 화면입니다.</h1>
        <p>운영자 권한은 로그인만으로 부여되지 않습니다.</p>
        <Link href="/member/services">내 회원 서비스로</Link>
      </div>
    );

  const counts = [
    ["승인 대기 회원", summary.data?.pendingApplications],
    ["답변 대기 문의", summary.data?.openTickets],
    ["검토 대기 입금 요청", summary.data?.pendingDeposits],
    ["검토 대기 출금 요청", summary.data?.pendingWithdrawals],
  ] as const;
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
            회원 서비스
          </Link>
          <button className="member-logout" onClick={signOut}>
            <LogOut size={15} /> 로그아웃
          </button>
        </div>
      </header>
      <main className="portal-admin-main">
        <section className="portal-admin-hero">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> OPERATIONS HOME
            </div>
            <h1>
              회원의 다음 단계를
              <br />
              <em>한곳에서 관리합니다.</em>
            </h1>
            <p>
              {user.name || "운영자"}님, 초대 회원 승인과 문의를 확인하고 공지·자료를
              관리하세요.
            </p>
          </div>
          <Link href="/admin/finance" className="portal-button">
            입출금 요청 검토 <ArrowRight size={16} />
          </Link>
        </section>
        <section className="portal-counts" aria-label="미처리 알림">
          {counts.map(([label, count]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{count ?? "—"}</strong>
            </div>
          ))}
        </section>
        {summary.isError && (
          <div className="portal-feedback is-error" role="alert">
            미처리 건수를 불러오지 못했습니다.{" "}
            <button onClick={() => void summary.refetch()}>다시 시도</button>
          </div>
        )}
        {summary.isLoading && (
          <p className="portal-muted" role="status">
            현재 처리 건수를 확인 중…
          </p>
        )}
        {logoutError && (
          <div className="portal-feedback is-error" role="alert">
            {logoutError}
          </div>
        )}
        <p className="portal-muted">
          미처리 알림은 실제 DB 기록 기준의 화면 내 표시입니다. 이메일·푸시를
          발송하지 않습니다. 입출금 검토도 실제 자금 이동을 실행하지 않습니다.
        </p>
        <nav className="portal-tabs" aria-label="운영 관리 메뉴">
          {tabs.map(item => (
            <button
              key={item.id}
              aria-current={tab === item.id ? "page" : undefined}
              className={tab === item.id ? "is-active" : ""}
                onClick={() => {
                  if (item.id === "invites") navigate("/admin/invites");
                  else setTab(item.id);
                }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {tab === "access" && <AdminApplications />}
        {tab === "announcements" && (
          <AdminContent key="announcement" kind="announcement" />
        )}
        {tab === "materials" && <AdminContent key="material" kind="material" />}
        {tab === "faq" && <AdminFaq />}
        {tab === "tickets" && <AdminTickets />}
      </main>
      <footer className="member-footer">
        <span>© 2026 Daonmarkets</span>
        <Link href="/help">사용 방법</Link>
      </footer>
    </div>
  );
}
