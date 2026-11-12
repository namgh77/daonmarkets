import { useState } from "react";
import { ArrowUpRight, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";
import type { AccessStatus } from "@/components/portal/access-types";
import MemberNotices from "@/components/portal/member-notices";
import MemberMaterials from "@/components/portal/member-materials";
import MemberTickets from "@/components/portal/member-tickets";
import "../auth.css";
import "../member-services.css";

const tabs = [
  { id: "notices", label: "공지" },
  { id: "materials", label: "자료실" },
  { id: "tickets", label: "문의" },
] as const;
type TabId = (typeof tabs)[number]["id"];

function currentTab(): TabId {
  if (typeof window === "undefined") return "notices";
  const value = new URLSearchParams(window.location.search).get("tab");
  return tabs.some(tab => tab.id === value) ? (value as TabId) : "notices";
}

export default function MemberServices() {
  const {
    user,
    loading,
    error: authError,
    logout,
  } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const [tab, setTab] = useStateTab();
  const access = trpc.portal.access.mine.useQuery(undefined, {
    enabled: Boolean(user) && tab === "materials",
    retry: false,
  });
  const [logoutError, setLogoutError] = useState(false);
  const isAdmin = user?.role === "admin";
  const accessStatus = access.data?.status as AccessStatus | undefined;

  const handleLogout = async () => {
    setLogoutError(false);
    try {
      await logout();
    } catch {
      setLogoutError(true);
    }
  };

  if (loading)
    return (
      <div className="member-loading">
        <div className="member-loading-mark" />
        <p>회원 로그인 상태 확인 중…</p>
      </div>
    );
  if (authError)
    return (
      <div className="member-loading">
        <p role="alert">로그인 상태를 확인하지 못했습니다.</p>
        <Link href="/login">로그인 화면으로</Link>
      </div>
    );
  if (!user)
    return (
      <div className="member-loading">
        <p>로그인이 필요합니다.</p>
        <Link href="/login">로그인</Link>
      </div>
    );

  return (
    <div className="member-shell member-services-shell">
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
          <Link href="/dashboard" className="member-service-link">
            대시보드
          </Link>
          {isAdmin && (
            <Link href="/admin" className="member-admin-link">
              <ShieldCheck size={15} /> 운영자 화면
            </Link>
          )}
          <Link href="/help" className="member-service-link">
            도움말
          </Link>
          <span className="member-secure">
            <ShieldCheck size={15} /> Secure session
          </span>
          <button
            className="member-logout"
            onClick={handleLogout}
            disabled={loading}
          >
            <LogOut size={15} /> 로그아웃
          </button>
        </div>
      </header>

      <main className="member-main member-services-main">
        <section className="member-hero member-services-hero">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> MEMBER SERVICES
            </div>
            <h1>
              Member care,
              <br />
              <em>in one place.</em>
            </h1>
            <p>
              초대 회원을 위한 공지, 승인 회원 자료, 운영자 문의를 보호된
              회원 공간에서 확인하세요.
            </p>
            <Link href="/dashboard" className="button button-primary member-dashboard-cta">
              대시보드로 이동 <ArrowUpRight size={17} />
            </Link>
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

        <nav className="member-services-tabs" aria-label="회원 서비스 메뉴">
          {tabs.map(item => (
            <button
              type="button"
              key={item.id}
              className={tab === item.id ? "is-active" : ""}
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {logoutError && (
          <div className="portal-feedback portal-feedback-error" role="alert">
            로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.
          </div>
        )}

        <div className="member-services-stack">
          <div
            className={
              tab === "notices"
                ? "member-service-view is-active"
                : "member-service-view"
            }
          >
            <MemberNotices
              isAuthenticated={Boolean(user)}
              active={tab === "notices"}
            />
          </div>
          <div
            className={
              tab === "materials"
                ? "member-service-view is-active"
                : "member-service-view"
            }
          >
            <MemberMaterials
              isAuthenticated={Boolean(user)}
              active={tab === "materials"}
              isAdmin={isAdmin}
              accessStatus={accessStatus}
              accessLoading={access.isLoading}
              accessError={access.isError}
            />
          </div>
          <div
            className={
              tab === "tickets"
                ? "member-service-view is-active"
                : "member-service-view"
            }
          >
            <MemberTickets
              isAuthenticated={Boolean(user)}
              active={tab === "tickets"}
            />
          </div>
        </div>

        <section className="member-services-footer-card">
          <div>
            <span className="eyebrow eyebrow-light">
              <span className="eyebrow-line" /> MEMBER NAVIGATION
            </span>
            <h2>
              필요한 안내를
              <br />
              <em>이어가세요.</em>
            </h2>
          </div>
          <div>
            <p>
              금융 요청과 표시용 장부는 대시보드에서 확인할 수 있습니다. 이용 중
              궁금한 점은 문의를 남겨 주세요.
            </p>
            <div className="member-services-links">
              <Link href="/dashboard">대시보드 보기</Link>
              <Link href="/help">도움말 보기</Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="member-footer">
        <span>© 2026 Daonmarkets</span>
        <span>보호된 회원 영역 · 서비스 안내 전용</span>
      </footer>
    </div>
  );
}

function useStateTab(): [TabId, (next: TabId) => void] {
  const [tab, setTabState] = useState<TabId>(currentTab);
  const setTab = (next: TabId) => {
    setTabState(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState({}, "", url.toString());
    }
  };
  return [tab, setTab];
}
