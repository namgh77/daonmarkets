import { useState } from "react";
import { ArrowLeft, Copy, Link2, LogOut, ShieldCheck, UserPlus, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import "../portal-admin.css";

type Feedback = { text: string; error: boolean } | null;

async function copyTextToClipboard(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Use the compatibility path below when browser clipboard permission is unavailable.
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function InviteManagement() {
  const { user, loading, error, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });
  const [, navigate] = useLocation();
  const [invitedEmail, setInvitedEmail] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [memberIdInput, setMemberIdInput] = useState("");
  const [memberIdSearch, setMemberIdSearch] = useState<number | undefined>();
  const [currentLink, setCurrentLink] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const isManager = user?.role === "admin" || user?.role === "partner";
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const invites = trpc.invites.mine.useQuery(undefined, {
    enabled: isManager,
    retry: false,
  });
  const partners = trpc.admin.invites.partners.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const referredMembers = trpc.invites.referredMembers.useQuery(
    { memberId: memberIdSearch },
    { enabled: isManager, retry: false }
  );
  const create = trpc.invites.create.useMutation({
    onSuccess: async result => {
      const link = `${window.location.origin}/signup?invite=${encodeURIComponent(result.token)}`;
      setCurrentLink(link);
      setFeedback({ text: "초대 링크를 만들었습니다. 링크를 복사해 지정된 회원에게 보내세요.", error: false });
      setInvitedEmail("");
      await utils.invites.mine.invalidate();
    },
    onError: errorResult => setFeedback({ text: errorResult.message, error: true }),
  });
  const revoke = trpc.invites.revoke.useMutation({
    onSuccess: async () => {
      setFeedback({ text: "초대 링크를 취소했습니다.", error: false });
      await utils.invites.mine.invalidate();
    },
    onError: errorResult => setFeedback({ text: errorResult.message, error: true }),
  });
  const setPartner = trpc.admin.invites.setPartner.useMutation({
    onSuccess: async () => {
      setPartnerEmail("");
      setFeedback({ text: "제휴 파트너 권한을 변경했습니다. 해당 회원은 초대 링크를 만들 수 있습니다.", error: false });
      await utils.admin.invites.partners.invalidate();
    },
    onError: errorResult => setFeedback({ text: errorResult.message, error: true }),
  });

  const copyLink = async () => {
    if (!currentLink) return;
    const copied = await copyTextToClipboard(currentLink);
    setFeedback({
      text: copied
        ? "초대 링크를 클립보드에 복사했습니다."
        : "자동 복사에 실패했습니다. 아래 링크를 길게 눌러 복사해 주세요.",
      error: !copied,
    });
  };

  const signOut = async () => {
    await logout();
    navigate("/");
  };

  if (loading) {
    return <div className="member-loading"><div className="member-loading-mark" /><p>권한 확인 중…</p></div>;
  }
  if (error || !user) {
    return <div className="member-loading"><p role="alert">로그인 상태를 확인하지 못했습니다.</p><Link href="/login">로그인 화면</Link></div>;
  }
  if (!isManager) {
    return (
      <div className="member-loading">
        <ShieldCheck />
        <h1>제휴 파트너 전용 화면입니다.</h1>
        <p>회사에서 지정한 제휴 파트너 회원만 초대 링크를 만들 수 있습니다.</p>
        <Link href="/dashboard">내 대시보드로</Link>
      </div>
    );
  }

  return (
    <div className="member-shell">
      <header className="member-header">
        <Link href="/" className="auth-wordmark">
          <span className="wordmark-mark"><span /><span /><span /></span>
          <span>DAON<span className="wordmark-accent">MARKETS</span></span>
        </Link>
        <div className="member-header-actions">
          <Link href={isAdmin ? "/admin" : "/dashboard"} className="member-admin-link">
            <ArrowLeft size={15} /> {isAdmin ? "운영자 화면" : "대시보드"}
          </Link>
          <button className="member-logout" onClick={() => void signOut}><LogOut size={15} /> 로그아웃</button>
        </div>
      </header>
      <main className="portal-admin-main">
        <section className="portal-admin-hero">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> INVITATION CONTROL</div>
            <h1>초대된 회원만<br /><em>안전하게 연결합니다.</em></h1>
            <p>{isAdmin ? "관리자는 초대 링크를 만들고, 회사가 지정한 제휴 파트너 회원을 관리할 수 있습니다." : "회사에서 지정된 제휴 파트너 회원으로서 초대 링크를 만들어 보낼 수 있습니다."}</p>
          </div>
          <Link href={isAdmin ? "/admin" : "/dashboard"} className="portal-button"><ArrowLeft size={16} /> 돌아가기</Link>
        </section>

        {feedback && <div className={`portal-feedback ${feedback.error ? "is-error" : ""}`} role={feedback.error ? "alert" : "status"}>{feedback.text}</div>}

        <section className="portal-two-pane">
          <div className="portal-card">
            <h2><Link2 size={18} /> 초대 링크 만들기</h2>
            <p className="portal-muted">초대 링크가 없는 사람은 회원 가입을 진행할 수 없습니다. 링크는 한 번만 사용되며 생성 후 5일 동안만 유효합니다.</p>
            <form className="portal-form" onSubmit={event => { event.preventDefault(); setFeedback(null); create.mutate({ expiresInDays: 5, invitedEmail }); }}>
              <div className="portal-static-field"><span>유효 기간</span><strong>5일</strong></div>
              <label>지정 이메일 <small>선택 입력 · 입력하면 해당 이메일만 사용 가능</small>
                <input type="email" value={invitedEmail} onChange={event => setInvitedEmail(event.target.value)} placeholder="member@example.com" disabled={create.isPending} />
              </label>
              <button className="portal-button" type="submit" disabled={create.isPending}>{create.isPending ? "만드는 중…" : "초대 링크 생성"} <UserPlus size={16} /></button>
            </form>
            {currentLink && <div className="invite-link-result"><strong>새 초대 링크</strong><code>{currentLink}</code><button className="portal-secondary" type="button" onClick={() => void copyLink()}><Copy size={15} /> 링크 복사</button></div>}
          </div>
          <div className="portal-card">
            <h2>내 초대 링크</h2>
            {invites.isLoading ? <p role="status">링크 목록을 불러오는 중…</p> : invites.isError ? <p role="alert">링크 목록을 조회하지 못했습니다. {invites.error.message}</p> : !invites.data?.length ? <p className="portal-empty">아직 만든 초대 링크가 없습니다.</p> : <ul className="portal-record-list">{invites.data.map(item => <li key={item.id}><div className="invite-row"><div><strong>#{item.id} {item.invitedEmail || "회원 지정 없음"}</strong><span><span className={`portal-badge status-${item.status.toLowerCase()}`}>{item.status === "ACTIVE" ? "사용 가능" : item.status === "USED" ? "사용 완료" : "취소됨"}</span> · 만료 {formatDate(item.expiresAt)}</span></div>{item.status === "ACTIVE" && <button className="portal-secondary invite-revoke" type="button" disabled={revoke.isPending} onClick={() => revoke.mutate({ id: item.id })}><X size={14} /> 취소</button>}</div></li>)}</ul>}
          </div>
        </section>

        <section className="portal-card invite-referred-card">
          <h2>내가 제휴한 회원 ID 조회</h2>
          <p className="portal-muted">
            {isAdmin
              ? "관리자는 전체 제휴 회원을 확인할 수 있습니다. 제휴 파트너는 본인이 만든 초대 링크로 가입한 회원만 검색할 수 있습니다."
              : "본인이 만든 초대 링크로 가입한 회원만 조회할 수 있습니다. 다른 제휴 파트너의 회원 ID는 검색되지 않습니다."}
          </p>
          <form
            className="portal-form partner-form"
            onSubmit={event => {
              event.preventDefault();
              const parsed = memberIdInput.trim();
              setMemberIdSearch(parsed ? Number(parsed) : undefined);
            }}
          >
            <label>
              회원 ID 검색
              <small>숫자 ID만 입력 · 비워 두면 전체 조회</small>
              <input
                type="number"
                min="1"
                step="1"
                value={memberIdInput}
                onChange={event => setMemberIdInput(event.target.value)}
                placeholder="예: 1024"
                disabled={referredMembers.isFetching}
              />
            </label>
            <button className="portal-button" type="submit" disabled={referredMembers.isFetching}>
              {referredMembers.isFetching ? "조회 중…" : "회원 ID 조회"}
            </button>
          </form>
          {referredMembers.isLoading ? (
            <p role="status">제휴 회원 목록을 불러오는 중…</p>
          ) : referredMembers.isError ? (
            <p role="alert">제휴 회원 목록을 조회하지 못했습니다. {referredMembers.error.message}</p>
          ) : !referredMembers.data?.length ? (
            <p className="portal-empty">검색 조건에 맞는 제휴 회원 ID가 없습니다.</p>
          ) : (
            <ul className="portal-record-list">
              {referredMembers.data.map(member => (
                <li key={`${member.inviteId}-${member.memberId}`}>
                  <div className="invite-row">
                    <div>
                      <strong>회원 ID #{member.memberId}</strong>
                      <span>{member.name || "닉네임 없음"} · 가입 {formatDate(member.joinedAt)}</span>
                    </div>
                    <span className="portal-badge status-approved">제휴 확인</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isAdmin && <section className="portal-card invite-partner-card">
          <h2>회사 지정 제휴 파트너</h2>
          <p className="portal-muted">이미 가입한 회원의 이메일을 등록하면 해당 회원에게 제휴 파트너 권한이 부여됩니다. 제휴 파트너는 회원 가입이 아니라 초대 링크 생성만 할 수 있습니다.</p>
          <form className="portal-form partner-form" onSubmit={event => { event.preventDefault(); setPartner.mutate({ email: partnerEmail, enabled: true }); }}>
            <label>회원 이메일<input type="email" value={partnerEmail} onChange={event => setPartnerEmail(event.target.value)} placeholder="partner@example.com" disabled={setPartner.isPending} required /></label>
            <button className="portal-button" type="submit" disabled={setPartner.isPending}>{setPartner.isPending ? "지정 중…" : "제휴 파트너로 지정"}</button>
          </form>
          <h3>현재 제휴 파트너</h3>
          {!partners.data?.length ? <p className="portal-empty">지정된 제휴 파트너가 없습니다.</p> : <ul className="portal-record-list">{partners.data.map(partner => <li key={partner.id}><div className="invite-row"><div><strong>{partner.name || "이름 없음"}</strong><span>{partner.email || "이메일 없음"}</span></div><button className="portal-secondary invite-revoke" type="button" disabled={setPartner.isPending} onClick={() => { if (partner.email) setPartner.mutate({ email: partner.email, enabled: false }); }}>해제</button></div></li>)}</ul>}
        </section>}
      </main>
      <footer className="member-footer"><span>© 2026 Daonmarkets</span><Link href="/help">사용 방법</Link></footer>
    </div>
  );
}
