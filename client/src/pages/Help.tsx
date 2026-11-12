import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Globe2, LockKeyhole, ShieldCheck } from "lucide-react";
import "../public-pages.css";
import { trpc } from "@/lib/trpc";

type Language = "en" | "ja" | "ko";

const content = {
  en: {
    back: "Home", notices: "Notices", member: "Member area", eyebrow: "PUBLIC HELP", title: "Clear answers before you enter.", lede: "Daonmarkets is a private member platform. This guide explains invitation-only access and the boundary between a review decision and any future treasury-controlled operation.", asideTitle: "Start with the boundary.", asideBody: "Member access is not an admin role. Approval is not a transfer. No real-money operation is represented here until the necessary treasury controls exist and are separately confirmed.", asideLink: "Use an invitation link", sections: [
      ["01", "How do I join the private member area?", "Ask a company administrator or designated partner for an invitation link. Open that link and continue through email verification. Public sign-up without an invitation is not available."],
      ["02", "Does an approved request transfer funds or update my balance?", "No. A request approval is a review outcome only. It is not an on-chain deposit confirmation, balance credit, withdrawal completion, or automatic transfer. Do not treat an approval screen as evidence that money moved."],
      ["03", "When can a member use the private area?", "A signed-in account and member-service approval are separate from the user role. Access to member resources depends on the account and service approval recorded by the application. Being a member does not grant an administrator role."],
      ["04", "What can support help with?", "Use the member support route for account, access, materials, or request questions after authentication. Do not send passwords, private keys, recovery phrases, or payment credentials in a support message."],
      ["05", "Are markets, returns, or live feeds available on this public site?", "No. The public site does not publish a live market feed, a payout rate, a return promise, or a performance record. Any service rules, supported networks, fees, and availability must be confirmed before member access."],
      ["06", "What does ‘no real money until treasury controls’ mean?", "The current public experience is request-and-review only. Real-money handling would require separately implemented and controlled treasury, ledger, settlement, compliance, and operational safeguards. None should be inferred from this site."],
    ],
    footer: "Public guidance only. No financial operation is performed by this page.",
  },
  ja: {
    back: "ホーム", notices: "お知らせ", member: "会員エリア", eyebrow: "PUBLIC HELP", title: "アクセス申請の前に、明確な回答を。", lede: "Daonmarketsは確認を中心とする会員プラットフォームです。このガイドでは、申請、審査結果、将来の運用管理の境界を説明します。", asideTitle: "まず境界を確認してください。", asideBody: "会員アクセスは管理者権限ではありません。承認は送金ではありません。必要な資金管理の仕組みが実装され、別途確認されるまで、実資金の処理はありません。", asideLink: "アクセスを申請", sections: [
      ["01", "会員アクセスを申請するには？", "アクセス申請を選び、実際のManus認証へ進みます。認証後、申請フォームの項目を送信してください。運営チームが確認してから会員アクセスが有効になります。"],
      ["02", "承認された申請で送金や残高更新は行われますか？", "いいえ。申請の承認は審査結果のみです。オンチェーン入金確認、残高反映、出金完了、自動送金を意味しません。承認画面を資金移動の証拠として扱わないでください。"],
      ["03", "非公開エリアはいつ使えますか？", "認証済みアカウントと会員サービス承認は、ユーザーの権限とは別です。資料へのアクセスはアプリケーションに記録された承認に基づきます。会員であることは管理者権限を与えません。"],
      ["04", "サポートで相談できることは？", "認証後、アカウント、アクセス、資料、申請について会員サポートを利用できます。パスワード、秘密鍵、リカバリーフレーズ、決済情報は送信しないでください。"],
      ["05", "公開サイトに市場、収益、ライブフィードはありますか？", "ありません。公開サイトはライブ市場フィード、支払率、収益の約束、実績記録を掲載しません。利用条件、対応ネットワーク、手数料、提供状況は会員アクセス前に確認されます。"],
      ["06", "「資金管理の仕組みができるまで実資金なし」とは？", "現在の公開体験は申請と審査のみです。実資金を扱うには、資金管理、台帳、決済、コンプライアンス、運用上の安全策が別途必要です。このサイトからそれらを推測しないでください。"],
    ],
    footer: "公開ガイドです。このページは金融処理を行いません。",
  },
  ko: {
    back: "홈", notices: "공지", member: "회원 영역", eyebrow: "PUBLIC HELP", title: "입장 전에, 명확한 답변을 확인하세요.", lede: "Daonmarkets는 공개 모집이 아닌 초대 전용 회원 플랫폼입니다. 이 안내는 초대 링크 이용과 향후 자금 운영의 경계를 설명합니다.", asideTitle: "먼저 경계를 확인하세요.", asideBody: "회원 이용 권한은 관리자 역할이 아닙니다. 승인은 송금이 아닙니다. 필요한 자금관리 통제가 구현되고 별도로 확인되기 전에는 실제 자금 처리를 전제로 하지 않습니다.", asideLink: "초대 링크로 가입", sections: [
      ["01", "비공개 회원 영역에 어떻게 들어가나요?", "회사 관리자 또는 지정 제휴 파트너에게 초대 링크를 받아 접속하세요. 링크를 열고 이메일 인증을 완료하면 가입을 진행할 수 있습니다. 초대 링크 없는 공개 가입은 제공하지 않습니다."],
      ["02", "신청이 승인되면 송금되거나 잔액이 반영되나요?", "아닙니다. 신청 승인은 검토 결과일 뿐입니다. 온체인 입금 확인, 잔액 반영, 출금 완료, 자동 송금을 뜻하지 않습니다. 승인 화면을 자금 이동의 증거로 보지 마세요."],
      ["03", "비공개 회원 영역은 언제 이용하나요?", "로그인한 계정과 회원 서비스 승인은 사용자의 역할과 별개입니다. 자료 이용은 애플리케이션에 기록된 승인에 따릅니다. 회원이라고 해서 관리자 권한이 생기지 않습니다."],
      ["04", "지원팀에는 무엇을 문의할 수 있나요?", "인증 후 계정, 접근, 자료, 신청 관련 문의를 회원 지원 경로로 남길 수 있습니다. 비밀번호, 개인키, 복구 문구, 결제 인증정보는 보내지 마세요."],
      ["05", "공개 사이트에 시장, 수익, 실시간 피드가 있나요?", "없습니다. 공개 사이트는 실시간 시장 피드, 지급률, 수익 약속, 성과 기록을 제공하지 않습니다. 서비스 규칙, 지원 네트워크, 수수료, 이용 가능 여부는 회원 이용 전에 확인해야 합니다."],
      ["06", "‘자금관리 통제 전에는 실제 자금 없음’은 무슨 뜻인가요?", "현재 공개 경험은 신청과 검토만 지원합니다. 실제 자금을 다루려면 별도의 자금관리, 원장, 정산, 컴플라이언스, 운영 안전장치가 필요합니다. 이 사이트에서 그런 기능을 추정하지 마세요."],
    ],
    footer: "공개 안내일 뿐입니다. 이 페이지는 금융 처리를 수행하지 않습니다.",
  },
} as const;

export default function Help() {
  const [language, setLanguage] = useState<Language>("ko");
  const t = content[language];
  const faq = trpc.publicContent.faq.useQuery(undefined, {
    enabled: language === "ko",
    retry: false,
  });
  const sections = language === "ko" && faq.data?.length
    ? faq.data.map((item, index) => [String(index + 1).padStart(2, "0"), item.question, item.answer] as const)
    : t.sections;

  useEffect(() => {
    try { const saved = window.localStorage.getItem("daonmarkets-language"); if (saved === "en" || saved === "ja" || saved === "ko") setLanguage(saved); } catch { /* ignore */ }
    document.title = `Daonmarkets Help | ${t.title}`;
  }, [t.title]);

  const switchLanguage = (next: Language) => {
    if (next === language) return;
    setLanguage(next);
    try { window.localStorage.setItem("daonmarkets-language", next); } catch { /* ignore */ }
  };

  return <div className="public-page help-page">
    <header className="container public-page-nav"><a href="/" className="wordmark" aria-label="Daonmarkets home"><span className="wordmark-mark"><span /><span /><span /></span><span>DAON<span className="wordmark-accent">MARKETS</span></span></a><nav className="public-page-nav-links" aria-label="Public navigation"><a href="/notices">{t.notices}</a><a href="/member">{t.member}</a><div className="language-switcher" aria-label="Language"><Globe2 size={15} />{(["en", "ja", "ko"] as const).map((option) => <button key={option} className={language === option ? "is-active" : ""} onClick={() => switchLanguage(option)} aria-pressed={language === option}>{option === "ko" ? "한" : option === "en" ? "EN" : "日"}</button>)}</div></nav></header>
    <main className="public-page-main"><div className="container"><div className="public-page-hero"><div className="eyebrow"><span className="eyebrow-line" />{t.eyebrow}</div><h1>{t.title}</h1><p className="public-page-lede">{t.lede}</p><div className="public-page-actions"><a className="button button-primary" href="/signup">{t.asideLink} <ArrowUpRight size={17} /></a><a className="button button-ghost" href="/">{t.back} <ArrowLeft size={17} /></a></div></div><div className="help-layout"><aside className="help-aside"><ShieldCheck size={20} color="var(--aqua)" /><h2>{t.asideTitle}</h2><p>{t.asideBody}</p><a href="/signup">{t.asideLink} <ArrowUpRight size={14} /></a></aside><div className="help-list">{sections.map(([number, heading, body]) => <article className="help-item" key={number}><div className="public-card-kicker">{number}</div><h2>{heading}</h2><p>{body}</p></article>)}</div></div></div></main>
    <footer className="public-dark-footer"><div className="container public-page-footer"><span><LockKeyhole size={13} /> {t.footer}</span><div className="public-page-footer-links"><a href="/">{t.back}</a><a href="/notices">{t.notices}</a><a href="/member">{t.member}</a></div></div></footer>
  </div>;
}
