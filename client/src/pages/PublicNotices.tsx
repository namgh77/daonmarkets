import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronDown, Globe2, Megaphone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import "../public-pages.css";

type Language = "en" | "ja" | "ko";
type Notice = { id: number; title: string; body: string; createdAt?: string | Date; updatedAt?: string | Date };

const labels = {
  en: { home: "Home", help: "Help", member: "Member area", eyebrow: "PUBLIC NOTICES", title: "Updates published for the public.", lede: "Only notices explicitly published for a public audience appear here. No sample notices are inserted when the list is empty.", loading: "Checking for published public notices…", empty: "No public notices have been published yet.", error: "Public notices are temporarily unavailable. Please try again later.", date: "Published", footer: "Public notices only. Member notices require authentication." },
  ja: { home: "ホーム", help: "ヘルプ", member: "会員エリア", eyebrow: "PUBLIC NOTICES", title: "公開向けに掲載されたお知らせ。", lede: "公開対象として明示的に掲載されたお知らせだけを表示します。空の場合にサンプルのお知らせは追加しません。", loading: "公開のお知らせを確認しています…", empty: "現在、公開のお知らせはありません。", error: "公開のお知らせを一時的に利用できません。後でもう一度お試しください。", date: "掲載日", footer: "公開のお知らせのみです。会員向けのお知らせには認証が必要です。" },
  ko: { home: "홈", help: "도움말", member: "회원 영역", eyebrow: "PUBLIC NOTICES", title: "공개 대상으로 게시된 공지입니다.", lede: "공개 대상으로 명시적으로 게시된 공지만 표시합니다. 목록이 비어 있을 때 샘플 공지를 추가하지 않습니다.", loading: "게시된 공개 공지를 확인하고 있습니다…", empty: "현재 게시된 공개 공지가 없습니다.", error: "공개 공지를 일시적으로 불러올 수 없습니다. 잠시 후 다시 시도하세요.", date: "게시일", footer: "공개 공지만 표시합니다. 회원 공지는 인증이 필요합니다." },
} as const;

function displayDate(value: Notice["createdAt"]) {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString();
}

export default function PublicNotices() {
  const [language, setLanguage] = useState<Language>("ko");
  const t = labels[language];
  const announcementsQuery = (trpc as any).publicContent.announcements.useQuery(undefined, { retry: false });
  const notices = (announcementsQuery.data ?? []) as Notice[];

  useEffect(() => {
    try { const saved = window.localStorage.getItem("daonmarkets-language"); if (saved === "en" || saved === "ja" || saved === "ko") setLanguage(saved); } catch { /* ignore */ }
    document.title = `Daonmarkets Notices | ${t.title}`;
  }, [t.title]);

  const switchLanguage = () => {
    const next = language === "en" ? "ja" : language === "ja" ? "ko" : "en";
    setLanguage(next);
    try { window.localStorage.setItem("daonmarkets-language", next); } catch { /* ignore */ }
  };

  return <div className="public-page">
    <header className="container public-page-nav"><a href="/" className="wordmark" aria-label="Daonmarkets home"><span className="wordmark-mark"><span /><span /><span /></span><span>DAON<span className="wordmark-accent">MARKETS</span></span></a><nav className="public-page-nav-links" aria-label="Public navigation"><a href="/help">{t.help}</a><a href="/member">{t.member}</a><button className="language-toggle" onClick={switchLanguage} aria-label="Switch language"><Globe2 size={15} /> {language === "en" ? "EN" : language === "ja" ? "日本語" : "한국어"}<ChevronDown size={13} /></button></nav></header>
    <main className="public-page-main"><div className="container"><div className="public-page-hero"><div className="eyebrow"><span className="eyebrow-line" />{t.eyebrow}</div><h1>{t.title}</h1><p className="public-page-lede">{t.lede}</p><div className="public-page-actions"><a className="button button-primary" href="/help">{t.help} <ArrowUpRight size={17} /></a><a className="button button-ghost" href="/">{t.home} <ArrowLeft size={17} /></a></div></div><section className="notice-list" aria-live="polite"><h2 className="sr-only">{t.eyebrow}</h2>{announcementsQuery.isLoading && <div className="public-state">{t.loading}</div>}{announcementsQuery.isError && <div className="public-state public-state-error">{t.error}</div>}{!announcementsQuery.isLoading && !announcementsQuery.isError && notices.length === 0 && <div className="public-state"><Megaphone size={18} /> {t.empty}</div>}{!announcementsQuery.isLoading && !announcementsQuery.isError && notices.map(notice => <article className="notice-card" key={notice.id}><time dateTime={notice.createdAt ? new Date(notice.createdAt).toISOString() : undefined}>{t.date}{displayDate(notice.createdAt) ? ` · ${displayDate(notice.createdAt)}` : ""}</time><h2>{notice.title}</h2><p>{notice.body}</p></article>)}</section></div></main>
    <footer className="public-dark-footer"><div className="container public-page-footer"><span>{t.footer}</span><div className="public-page-footer-links"><a href="/">{t.home}</a><a href="/help">{t.help}</a><a href="/member">{t.member}</a></div></div></footer>
  </div>;
}
