import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Globe2,
  LockKeyhole,
  Menu,
  Megaphone,
  MessageSquareText,
  PanelTop,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import "../public-pages.css";

type Language = "en" | "ja" | "ko";
type Copy = (typeof copy)[Language];

const copy = {
  en: {
    nav: ["Overview", "How it works", "Notices", "Help"],
    announcement: "Review-led member operations, with clear next steps.",
    heroEyebrow: "DAONMARKETS / MEMBER OPERATIONS",
    heroTitle: "Information,\norganized for action.",
    heroBody:
      "A private member platform for approved access, structured information, and direct operational support — without presenting a request review as a transfer or a promise.",
    primary: "Join with invitation",
    secondary: "View how it works",
    note: "Public preview · English / 日本語 / 한국어",
    reviewLabel: "REQUEST REVIEW",
    reviewSub: "A visible path from request to member access",
    reviewStatus: "NO AUTOMATIC TRANSFER",
    reviewSteps: ["Request submitted", "Team review", "Decision shared"],
    access: "ACCESS MODEL",
    accessTitle: "Approved members only",
    accessBody:
      "Every account starts with a review. Approval gives access to the member area; it does not mean a transfer, balance update, or completed financial operation.",
    accessCta: "See member flow",
    whyEyebrow: "WHY DAONMARKETS",
    whyTitle: "A public front door for a private operating layer.",
    whyBody:
      "The public site stays focused: what the service is, how access works, and where members can get help. Detailed account activity belongs inside the member area.",
    cards: [
      { n: "01", title: "Structured access", body: "Clear review steps and a member space built around approved access." },
      { n: "02", title: "Visible request status", body: "Keep submitted requests and review outcomes in one member area." },
      { n: "03", title: "Direct support", body: "Use private support tickets for account, access, materials, or request questions." },
    ],
    flowEyebrow: "HOW IT WORKS",
    flowTitle: "A simple route from request to support.",
    flowSteps: [
      ["01", "Request", "Submit the basic information required to start a review."],
      ["02", "Review", "The operations team checks the request and shares a decision."],
      ["03", "Use the member area", "Approved members can access assigned resources, notices, and support."],
    ],
    dataEyebrow: "MEMBER RESOURCES",
    dataTitle: "The right information, in the right room.",
    dataBody:
      "Member resources, public notices, and support are organized by access level. Nothing on this public page represents a live market feed or a guaranteed outcome.",
    dataItems: ["Public notices", "Approved member materials", "Request status and review notes", "Private support tickets"],
    supportEyebrow: "SUPPORT",
    supportTitle: "Questions stay clear and in context.",
    supportBody:
      "Read the public help guidance first, or open a member support route after authentication. Request approval is a review step, not an automatic transfer.",
    ticket: "Open help",
    footer: "Structured information. Clear operations. Human support.",
    legal:
      "Public preview only. Service rules, supported networks, fees, and availability are confirmed before member access.",
  },
  ja: {
    nav: ["概要", "利用の流れ", "お知らせ", "ヘルプ"],
    announcement: "確認を中心に、次の手順を明確にする会員運用。",
    heroEyebrow: "DAONMARKETS / MEMBER OPERATIONS",
    heroTitle: "情報を、\n行動につながる形へ。",
    heroBody:
      "承認制のメンバーアクセス、整理された情報、運営チームによる直接サポートを一つの場所にまとめます。申請の審査は送金や結果の約束ではありません。",
    primary: "招待リンクで参加",
    secondary: "利用の流れを見る",
    note: "公開プレビュー · English / 日本語 / 한국어",
    reviewLabel: "REQUEST REVIEW",
    reviewSub: "申請から会員アクセスまでを見える化",
    reviewStatus: "自動送金なし",
    reviewSteps: ["申請を送信", "運営チームが確認", "結果を共有"],
    access: "ACCESS MODEL",
    accessTitle: "承認されたメンバーのみ",
    accessBody:
      "すべてのアカウントは確認から始まります。承認は会員エリアへのアクセスを意味しますが、送金、残高更新、金融処理の完了を意味しません。",
    accessCta: "メンバーの流れを見る",
    whyEyebrow: "WHY DAONMARKETS",
    whyTitle: "公開の入口と、会員向けの運用レイヤー。",
    whyBody:
      "公開サイトではサービス、アクセス方法、サポートへの導線を明確にします。詳細なアカウント情報は会員エリアで管理します。",
    cards: [
      { n: "01", title: "整理されたアクセス", body: "確認ステップと承認制のメンバースペースを明確に設計。" },
      { n: "02", title: "確認できる申請状況", body: "送信した申請と審査結果を会員エリアで確認。" },
      { n: "03", title: "直接サポート", body: "アカウント、アクセス、資料、申請について非公開で問い合わせ。" },
    ],
    flowEyebrow: "HOW IT WORKS",
    flowTitle: "申請からサポートまで、シンプルに。",
    flowSteps: [
      ["01", "申請", "審査に必要な基本情報を送信します。"],
      ["02", "確認", "運営チームが内容を確認し、結果を共有します。"],
      ["03", "会員エリアを利用", "承認された会員は資料、お知らせ、サポートを利用できます。"],
    ],
    dataEyebrow: "MEMBER RESOURCES",
    dataTitle: "必要な情報を、必要な場所へ。",
    dataBody:
      "会員向け資料、公開のお知らせ、サポートを権限ごとに整理します。この公開ページはライブ市場フィードや結果を保証するものではありません。",
    dataItems: ["公開のお知らせ", "承認会員向け資料", "申請状況と審査メモ", "プライベートサポートチケット"],
    supportEyebrow: "SUPPORT",
    supportTitle: "質問を明確に、文脈の中で。",
    supportBody:
      "まず公開ヘルプを確認し、認証後に会員向けサポートへ進んでください。申請の承認は審査であり、自動送金ではありません。",
    ticket: "ヘルプを見る",
    footer: "整理された情報。明確な運用。人によるサポート。",
    legal: "公開プレビューです。対応ネットワーク、手数料、利用条件はメンバー利用前に確定します。",
  },
  ko: {
    nav: ["서비스 소개", "이용 방법", "공지", "도움말"],
    announcement: "검토를 중심으로 다음 단계를 명확하게 안내합니다.",
    heroEyebrow: "DAONMARKETS / MEMBER OPERATIONS",
    heroTitle: "정보를,\n행동으로 이어지게.",
    heroBody:
      "승인된 회원을 위한 접근 관리, 정리된 정보, 운영팀의 직접 지원을 하나의 플랫폼에 담았습니다. 신청 검토는 송금이나 결과를 약속하는 절차가 아닙니다.",
    primary: "초대 링크로 가입",
    secondary: "이용 방법 보기",
    note: "공개 미리보기 · English / 日本語 / 한국어",
    reviewLabel: "REQUEST REVIEW",
    reviewSub: "신청부터 회원 이용까지의 절차를 확인",
    reviewStatus: "자동 송금 없음",
    reviewSteps: ["신청 제출", "운영팀 검토", "결과 안내"],
    access: "ACCESS MODEL",
    accessTitle: "승인된 회원 전용",
    accessBody:
      "모든 계정은 검토에서 시작합니다. 승인은 회원 영역 이용 권한을 뜻하며, 송금·잔액 반영·금융 처리 완료를 뜻하지 않습니다.",
    accessCta: "회원 이용 흐름 보기",
    whyEyebrow: "WHY DAONMARKETS",
    whyTitle: "공개 홈페이지와 회원 전용 운영 공간.",
    whyBody:
      "공개 사이트에서는 서비스, 접근 방법, 지원 경로를 명확하게 안내합니다. 상세한 계정 활동은 회원 영역에서 관리합니다.",
    cards: [
      { n: "01", title: "정리된 접근", body: "명확한 검토 절차와 승인 회원을 위한 전용 공간을 제공합니다." },
      { n: "02", title: "확인 가능한 신청 상태", body: "제출한 신청과 검토 결과를 회원 영역에서 확인합니다." },
      { n: "03", title: "직접 지원", body: "계정, 접근, 자료, 신청 관련 문의를 비공개 티켓으로 처리합니다." },
    ],
    flowEyebrow: "HOW IT WORKS",
    flowTitle: "신청부터 지원까지, 단순하게.",
    flowSteps: [
      ["01", "신청", "검토에 필요한 기본 정보를 제출합니다."],
      ["02", "검토", "운영팀이 내용을 확인하고 결과를 안내합니다."],
      ["03", "회원 영역 이용", "승인된 회원은 자료, 공지, 지원 기능을 이용할 수 있습니다."],
    ],
    dataEyebrow: "MEMBER RESOURCES",
    dataTitle: "필요한 정보를, 필요한 공간에.",
    dataBody:
      "회원 자료, 공개 공지, 지원 내용을 권한에 따라 정리합니다. 이 공개 페이지는 실시간 시장 피드나 결과를 보장하지 않습니다.",
    dataItems: ["공개 공지", "승인 회원 자료", "신청 상태와 검토 메모", "비공개 지원 티켓"],
    supportEyebrow: "SUPPORT",
    supportTitle: "문의는 명확한 맥락 안에서 처리합니다.",
    supportBody:
      "먼저 공개 도움말을 확인하고, 인증 후 회원 지원 경로를 이용하세요. 신청 승인은 검토 단계이며 자동 송금이 아닙니다.",
    ticket: "도움말 보기",
    footer: "정리된 정보. 명확한 운영. 사람의 지원.",
    legal: "공개 미리보기입니다. 지원 네트워크, 수수료, 이용 조건은 회원 이용 전에 확정됩니다.",
  },
} as const;

const languageLabel = (language: Language) => (language === "en" ? "EN" : language === "ja" ? "日本語" : "한국어");

export default function Home() {
  const [language, setLanguage] = useState<Language>("ko");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [popupNotice, setPopupNotice] = useState<{
    id: number;
    title: string;
    body: string;
  } | null>(null);
  const [, setLocation] = useLocation();
  const t: Copy = copy[language];
  const publicAnnouncements = trpc.publicContent.popupAnnouncement.useQuery(
    undefined,
    { retry: false }
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("daonmarkets-language");
      if (saved === "en" || saved === "ja" || saved === "ko") setLanguage(saved);
    } catch {
      // A blocked storage implementation should not affect the public page.
    }
  }, []);

  useEffect(() => {
    const notice = publicAnnouncements.data?.[0];
    if (!notice) return;
    try {
      if (
        window.localStorage.getItem("daonmarkets-dismissed-notice") ===
        String(notice.id)
      )
        return;
    } catch {
      // A blocked storage implementation should not prevent the popup.
    }
    setPopupNotice({ id: notice.id, title: notice.title, body: notice.body });
  }, [publicAnnouncements.data]);

  const dismissPopup = () => {
    if (!popupNotice) return;
    try {
      window.localStorage.setItem(
        "daonmarkets-dismissed-notice",
        String(popupNotice.id)
      );
    } catch {
      // The popup can still close for this session when storage is unavailable.
    }
    setPopupNotice(null);
  };

  const switchLanguage = () => {
    const next = language === "en" ? "ja" : language === "ja" ? "ko" : "en";
    setLanguage(next);
    try { window.localStorage.setItem("daonmarkets-language", next); } catch { /* ignore */ }
  };

  const loginLabel = language === "ko" ? "로그인" : language === "ja" ? "ログイン" : "Login";

  const goTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  const openLogin = () => setLocation("/login");
  const openSignup = () => setLocation("/signup");
  const openPath = (path: string) => { setMobileOpen(false); setLocation(path); };

  return (
    <div className="site-shell">
      <div className="topline"><div className="topline-inner"><span className="status-dot" /><span>{t.announcement}</span><span className="topline-right">REVIEW / ACCESS / SUPPORT</span></div></div>
      <header className="nav-wrap">
        <nav className="nav container" aria-label="Primary navigation">
          <button className="wordmark" onClick={() => goTo("top")} aria-label="Daonmarkets home"><span className="wordmark-mark"><span /><span /><span /></span><span>DAON<span className="wordmark-accent">MARKETS</span></span></button>
          <div className={`nav-links ${mobileOpen ? "is-open" : ""}`}>
            <button onClick={() => goTo("why")}>{t.nav[0]}</button>
            <button onClick={() => goTo("flow")}>{t.nav[1]}</button>
            <a href="/notices" onClick={() => setMobileOpen(false)}>{t.nav[2]}</a>
            <a href="/help" onClick={() => setMobileOpen(false)}>{t.nav[3]}</a>
            <button className="mobile-action" onClick={openSignup}>{t.primary}</button>
          </div>
          <div className="nav-actions">
            <button className="language-toggle" onClick={switchLanguage} aria-label="Switch language"><Globe2 size={15} /> {languageLabel(language)} <ChevronDown size={13} /></button>
            <button className="login-link" onClick={openLogin}>{loginLabel}</button>
            <button className="nav-cta" onClick={openSignup}>{t.primary} <ArrowUpRight size={16} /></button>
            <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="hero container">
          <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" />{t.heroEyebrow}</div><h1>{t.heroTitle.split("\n").map(line => <span key={line}>{line}</span>)}</h1><p className="hero-body">{t.heroBody}</p><div className="hero-actions"><button className="button button-primary" onClick={openSignup}>{t.primary} <ArrowUpRight size={17} /></button><button className="button button-ghost" onClick={() => goTo("flow")}>{t.secondary} <ArrowDownRight size={17} /></button></div><div className="hero-note"><LockKeyhole size={14} /> {t.note}</div></div>
          <div className="hero-visual" aria-label={t.reviewLabel}>
            <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-cross cross-one" /><div className="visual-cross cross-two" />
            <div className="visual-panel review-panel"><div className="panel-heading"><span>{t.reviewLabel}</span><span className="panel-live"><i /> {t.reviewStatus}</span></div><div className="panel-sub">{t.reviewSub}</div><div className="review-path">{t.reviewSteps.map((step, index) => <div className="review-step" key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong>{index < t.reviewSteps.length - 1 && <ArrowDownRight size={14} />}</div>)}</div></div>
            <div className="visual-panel access-panel"><div className="panel-icon"><ShieldCheck size={17} /></div><div><div className="panel-kicker">{t.access}</div><strong>{t.accessTitle}</strong><p>{t.accessBody}</p><button onClick={() => goTo("flow")}>{t.accessCta} <ArrowUpRight size={14} /></button></div></div>
            <div className="signal-chip"><span className="signal-bar" /><div><div>MEMBER ACCESS</div><strong>REVIEW FIRST</strong><small>{t.reviewStatus}</small></div></div>
          </div>
        </section>

        <section className="marquee" aria-label="Daonmarkets principles"><div className="marquee-track"><span>REVIEW-LED ACCESS</span><b>✦</b><span>STRUCTURED INFORMATION</span><b>✦</b><span>DIRECT SUPPORT</span><b>✦</b><span>REVIEW-LED ACCESS</span><b>✦</b><span>STRUCTURED INFORMATION</span><b>✦</b><span>DIRECT SUPPORT</span></div></section>
        <section className="section container" id="why"><div className="section-intro split-intro"><div><div className="eyebrow"><span className="eyebrow-line" />{t.whyEyebrow}</div><h2>{t.whyTitle}</h2></div><p>{t.whyBody}</p></div><div className="feature-cards">{t.cards.map(card => <article className="feature-card" key={card.n}><div className="card-number">{card.n}</div><div className="card-icon">{card.n === "01" ? <PanelTop size={19} /> : card.n === "02" ? <ShieldCheck size={19} /> : <MessageSquareText size={19} />}</div><h3>{card.title}</h3><p>{card.body}</p><ArrowUpRight className="card-arrow" size={17} /></article>)}</div></section>
        <section className="dark-section" id="flow"><div className="container section flow-layout"><div className="flow-heading"><div className="eyebrow eyebrow-light"><span className="eyebrow-line" />{t.flowEyebrow}</div><h2>{t.flowTitle}</h2><div className="flow-stamp"><Sparkles size={15} /> DAON / MEMBER OPERATIONS</div></div><div className="flow-list">{t.flowSteps.map(([number, title, body]) => <div className="flow-step" key={number}><span className="flow-number">{number}</span><div><h3>{title}</h3><p>{body}</p></div><ArrowUpRight size={18} /></div>)}</div></div></section>
        <section className="section container data-section" id="data"><div className="data-panel"><div className="data-panel-art"><span className="art-ring ring-a" /><span className="art-ring ring-b" /><span className="art-cross" /><span className="art-label">DM / 02</span></div><div className="data-panel-copy"><div className="eyebrow"><span className="eyebrow-line" />{t.dataEyebrow}</div><h2>{t.dataTitle}</h2><p>{t.dataBody}</p><ul>{t.dataItems.map(item => <li key={item}><span><Check size={13} /></span>{item}</li>)}</ul><button className="text-link" onClick={() => openPath("/member/services")}>Member resources <ArrowUpRight size={15} /></button></div></div></section>
        <section className="support-section" id="support"><div className="container support-layout"><div><div className="eyebrow eyebrow-light"><span className="eyebrow-line" />{t.supportEyebrow}</div><h2>{t.supportTitle}</h2></div><div><p>{t.supportBody}</p><a className="button button-light" href="/help">{t.ticket} <ArrowUpRight size={17} /></a></div></div></section>
      </main>
      <footer className="footer"><div className="container footer-main"><div className="wordmark footer-wordmark"><span className="wordmark-mark"><span /><span /><span /></span><span>DAON<span className="wordmark-accent">MARKETS</span></span></div><p>{t.footer}</p><div className="footer-links"><button onClick={() => goTo("top")}>Home</button><a href="/notices">{t.nav[2]}</a><a href="/help">{t.nav[3]}</a><a href="/member">Member</a></div></div><div className="container footer-bottom"><span>© 2026 Daonmarkets</span><span>{t.legal}</span><span>EN / 日本語 / 한국어</span></div></footer>
      {popupNotice && (
        <div className="notice-modal-backdrop" role="presentation">
          <section
            className="notice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-modal-title"
          >
            <div className="notice-modal-kicker"><Megaphone size={15} /> {t.nav[2]}</div>
            <button className="notice-modal-close" type="button" onClick={dismissPopup} aria-label="Close notice">
              <X size={18} />
            </button>
            <h2 id="notice-modal-title">{popupNotice.title}</h2>
            <p>{popupNotice.body}</p>
            <div className="notice-modal-actions">
              <a className="button button-primary" href="/notices" onClick={dismissPopup}>{t.nav[2]} <ArrowUpRight size={16} /></a>
              <button className="button button-ghost" type="button" onClick={dismissPopup}>
                {language === "ko" ? "닫기" : language === "ja" ? "閉じる" : "Close"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
