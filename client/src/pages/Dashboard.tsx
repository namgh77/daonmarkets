import {
  ArrowRight,
  Bell,
  BookOpen,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";
import FinanceDashboardPanel from "@/components/FinanceDashboardPanel";
import "../auth.css";
import "../dashboard.css";

const accessCopy = {
  PENDING: { label: "회원 승인 대기", text: "초대 가입이 접수되었습니다. 관리자의 회원 승인을 기다리고 있습니다." },
  APPROVED: { label: "회원 승인 완료", text: "승인된 회원 자료와 지원 기능을 이용할 수 있습니다." },
  REJECTED: { label: "재검토 필요", text: "운영자가 남긴 안내를 확인해 주세요." },
} as const;

export default function Dashboard() {
  const { user, loading, error: authError, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });
  const access = trpc.portal.access.mine.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
  });

  if (loading)
    return <div className="dashboard-loading">회원 로그인 상태 확인 중…</div>;
  if (authError)
    return (
      <div className="dashboard-loading">
        <p>로그인 상태를 확인하지 못했습니다.</p>
        <Link href="/login">로그인 화면으로</Link>
      </div>
    );
  if (!user) return <div className="dashboard-loading">로그인이 필요합니다.</div>;

  const status = access.data?.status;
  const statusInfo = status ? accessCopy[status] : null;

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <Link href="/" className="auth-wordmark">
          <span className="wordmark-mark"><span /><span /><span /></span>
          <span>DAON<span className="wordmark-accent">MARKETS</span></span>
        </Link>
        <nav className="dashboard-nav" aria-label="회원 메뉴">
          <Link href="/member/services">회원 서비스</Link>
          {user.role === "admin" && <Link href="/admin"><ShieldCheck size={14} /> 운영자 화면</Link>}
          <Link href="/help">도움말</Link>
          <button type="button" onClick={() => void logout()}><LogOut size={14} /> 로그아웃</button>
        </nav>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-hero">
          <div>
            <div className="dashboard-kicker"><LayoutDashboard size={14} /> MEMBER DASHBOARD</div>
            <h1>회원 공간을<br /><em>한눈에 확인하세요.</em></h1>
            <p>입금·출금 요청, 요청 상태, 회원 서비스와 장부 표시 금액을 한 곳에서 확인하세요.</p>
          </div>
          <div className="dashboard-account-card">
            <div className="dashboard-avatar"><UserRound size={20} /></div>
            <div>
              <span>SIGNED-IN ACCOUNT</span>
              <strong>{user.name || "Daonmarkets 회원"}</strong>
              <small>{user.email || "회원 계정"}</small>
            </div>
            <b><LockKeyhole size={13} /> SECURE</b>
          </div>
        </section>

        <section className="dashboard-status-grid" aria-label="회원 상태 요약">
          <article className="dashboard-status-card">
            <span className="dashboard-card-kicker">ACCOUNT</span>
            <h2>인증된 회원</h2>
            <p>현재 계정으로 보호된 회원 공간을 이용할 수 있습니다.</p>
            <UserRound size={22} />
          </article>
          <article className="dashboard-status-card">
            <span className="dashboard-card-kicker">MEMBER REVIEW</span>
            <h2>{statusInfo?.label || "승인 대기"}</h2>
            <p>{statusInfo?.text || "초대 가입 후 관리자의 회원 승인 절차가 진행됩니다."}</p>
            <ShieldCheck size={22} />
          </article>
        </section>

        <FinanceDashboardPanel />

        <section className="dashboard-links-section">
          <div className="dashboard-section-heading">
            <div className="dashboard-kicker">QUICK ACCESS</div>
            <h2>필요한 회원 기능으로<br /><em>바로 이동하세요.</em></h2>
          </div>
          <div className="dashboard-link-grid">
            <Link href="/member/services?tab=notices" className="dashboard-link-card"><Bell size={22} /><strong>공지사항</strong><span>회원 공지와 읽음 상태 확인 <ArrowRight size={16} /></span></Link>
            <Link href="/member/services?tab=materials" className="dashboard-link-card"><BookOpen size={22} /><strong>회원 자료실</strong><span>승인된 자료와 안내 확인 <ArrowRight size={16} /></span></Link>
            <Link href="/member/services?tab=tickets" className="dashboard-link-card"><MessageCircle size={22} /><strong>운영자 문의</strong><span>문의 작성과 답변 확인 <ArrowRight size={16} /></span></Link>
          </div>
        </section>

        <section className="dashboard-note">
          <LockKeyhole size={18} />
          <div><strong>표시용 장부 대시보드입니다.</strong><p>입금·출금 신청과 표시 금액을 기록합니다. 실제 입출금은 사이트가 처리하지 않으며 운영자가 별도로 확인합니다.</p></div>
        </section>
      </main>
      <footer className="dashboard-footer"><span>© 2026 Daonmarkets</span><span>비금융 회원 대시보드 · 보호된 회원 영역</span></footer>
    </div>
  );
}
