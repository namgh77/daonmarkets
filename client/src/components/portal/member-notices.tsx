import { Bell, Check, CircleAlert, Download, RotateCw } from "lucide-react";
import { trpc } from "@/lib/trpc";

type MemberNoticesProps = {
  isAuthenticated: boolean;
  active: boolean;
};

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function MemberNotices({
  isAuthenticated,
  active,
}: MemberNoticesProps) {
  const utils = trpc.useUtils();
  const notices = trpc.portal.announcements.list.useQuery(undefined, {
    enabled: isAuthenticated && active,
    retry: false,
  });
  const markRead = trpc.portal.announcements.markRead.useMutation({
    onSuccess: async () => {
      await utils.portal.announcements.list.invalidate();
    },
  });

  const handleRead = (id: number) => {
    if (markRead.isPending) return;
    markRead.mutate({ id });
  };

  return (
    <section className="portal-panel" aria-labelledby="notices-heading">
      <div className="portal-panel-heading">
        <div>
          <span className="portal-kicker">02 / NOTICES</span>
          <h2 id="notices-heading">공지</h2>
        </div>
        <Bell size={21} className="portal-heading-icon" />
      </div>
      <p className="portal-panel-lede">
        회원에게 공개된 운영 공지를 확인할 수 있습니다. 읽음 처리는 계정에
        저장됩니다.
      </p>
      {!active && (
        <div className="portal-tab-hint">
          공지 탭을 선택하면 최신 공지를 불러옵니다.
        </div>
      )}
      {active && notices.isLoading && (
        <div className="portal-list-state">
          <span className="portal-spinner" /> 공지를 불러오는 중…
        </div>
      )}
      {active && notices.isError && (
        <div className="portal-state portal-state-error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>공지를 불러오지 못했습니다.</strong>
            <button
              type="button"
              className="portal-text-button"
              onClick={() => notices.refetch()}
            >
              <RotateCw size={14} /> 다시 시도
            </button>
          </div>
        </div>
      )}
      {active && notices.isSuccess && notices.data.length === 0 && (
        <div className="portal-empty">
          <Bell size={20} />
          <strong>등록된 공지가 없습니다.</strong>
          <p>운영자가 공지를 게시하면 이곳에서 확인할 수 있습니다.</p>
        </div>
      )}
      {active && notices.isSuccess && notices.data.length > 0 && (
        <div className="portal-notice-list">
          {notices.data.map(notice => (
            <article
              className={`portal-notice-card ${notice.read ? "is-read" : ""}`}
              key={notice.id}
            >
              <div className="portal-notice-card-top">
                <div>
                  <span className="portal-notice-audience">
                    {notice.audience === "MEMBERS" ? "MEMBERS" : "PUBLIC"}
                  </span>
                  <h3>{notice.title}</h3>
                </div>
                <time dateTime={new Date(notice.createdAt).toISOString()}>
                  {formatDate(notice.createdAt)}
                </time>
              </div>
              <p>{notice.body}</p>
              {notice.attachmentUrl && notice.attachmentName && (
                <a
                  className="portal-attachment-link"
                  href={notice.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={notice.attachmentName}
                >
                  <Download size={14} /> {notice.attachmentName}
                </a>
              )}
              {!notice.read && (
                <button
                  type="button"
                  className="portal-read-button"
                  onClick={() => handleRead(notice.id)}
                  disabled={markRead.isPending}
                >
                  <Check size={14} />{" "}
                  {markRead.isPending ? "처리 중…" : "읽음으로 표시"}
                </button>
              )}
              {notice.read && (
                <span className="portal-read-label">
                  <Check size={14} /> 읽음
                </span>
              )}
            </article>
          ))}
        </div>
      )}
      {markRead.isError && (
        <div className="portal-feedback portal-feedback-error" role="alert">
          읽음 처리를 완료하지 못했습니다. 다시 시도해 주세요.
        </div>
      )}
    </section>
  );
}
