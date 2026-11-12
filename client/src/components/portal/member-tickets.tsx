import { type FormEvent, useState } from "react";
import {
  ChevronRight,
  CircleAlert,
  MessageCircle,
  Plus,
  RotateCw,
  Send,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type MemberTicketsProps = { isAuthenticated: boolean; active: boolean };
type Category = "ACCOUNT" | "DEPOSIT" | "WITHDRAWAL" | "MATERIALS" | "OTHER";
type Feedback = { text: string; error?: boolean } | null;
type TicketDetailResult = {
  ticket: {
    id: number;
    userId: number;
    category: Category;
    subject: string;
    body: string;
    status: "OPEN" | "ANSWERED" | "CLOSED";
    createdAt: string | Date;
    updatedAt: string | Date;
  };
  replies: Array<{
    id: number;
    authorId: number;
    authorRole: "user" | "admin";
    body: string;
    createdAt: string | Date;
  }>;
};

const categories: { value: Category; label: string }[] = [
  { value: "ACCOUNT", label: "계정" },
  { value: "DEPOSIT", label: "입금 요청" },
  { value: "WITHDRAWAL", label: "출금 요청" },
  { value: "MATERIALS", label: "자료실" },
  { value: "OTHER", label: "기타" },
];
const statusLabel = {
  OPEN: "답변 대기",
  ANSWERED: "답변 완료",
  CLOSED: "종료",
} as const;

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function categoryLabel(value: Category) {
  return categories.find(item => item.value === value)?.label ?? value;
}

export default function MemberTickets({
  isAuthenticated,
  active,
}: MemberTicketsProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const mine = trpc.portal.tickets.mine.useQuery(undefined, {
    enabled: isAuthenticated && active,
    retry: false,
  });
  const detail = trpc.portal.tickets.detail.useQuery(
    { id: selectedId ?? 0 },
    { enabled: isAuthenticated && active && selectedId !== null, retry: false }
  );

  return (
    <section className="portal-panel" aria-labelledby="tickets-heading">
      <div className="portal-panel-heading">
        <div>
          <span className="portal-kicker">04 / SUPPORT</span>
          <h2 id="tickets-heading">문의</h2>
        </div>
        <button
          type="button"
          className="portal-secondary-button"
          onClick={() => setShowCreate(true)}
          disabled={!active}
        >
          <Plus size={15} /> 새 문의
        </button>
      </div>
      <p className="portal-panel-lede">
        본인 문의와 운영자 답변을 확인합니다. 종료된 문의에는 추가 답변을 남길
        수 없습니다.
      </p>
      {!active && (
        <div className="portal-tab-hint">
          문의 탭을 선택하면 내 문의를 불러옵니다.
        </div>
      )}
      {active && mine.isLoading && (
        <div className="portal-list-state">
          <span className="portal-spinner" /> 문의를 불러오는 중…
        </div>
      )}
      {active && mine.isError && (
        <div className="portal-state portal-state-error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>문의 목록을 불러오지 못했습니다.</strong>
            <button
              type="button"
              className="portal-text-button"
              onClick={() => mine.refetch()}
            >
              <RotateCw size={14} /> 다시 시도
            </button>
          </div>
        </div>
      )}
      {active && mine.isSuccess && mine.data.length === 0 && (
        <div className="portal-empty">
          <MessageCircle size={20} />
          <strong>등록된 문의가 없습니다.</strong>
          <p>확인이 필요한 내용이 있다면 새 문의를 남겨 주세요.</p>
          <button
            type="button"
            className="portal-secondary-button"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={15} /> 첫 문의 작성
          </button>
        </div>
      )}
      {active && mine.isSuccess && mine.data.length > 0 && (
        <div className="portal-ticket-layout">
          <div className="portal-ticket-list">
            {mine.data.map(ticket => (
              <button
                type="button"
                className={`portal-ticket-row ${selectedId === ticket.id ? "is-selected" : ""}`}
                key={ticket.id}
                onClick={() => setSelectedId(ticket.id)}
              >
                <span>
                  <small>
                    {categoryLabel(ticket.category)} ·{" "}
                    {formatDate(ticket.updatedAt)}
                  </small>
                  <strong>{ticket.subject}</strong>
                </span>
                <span
                  className={`portal-ticket-status portal-ticket-status-${ticket.status.toLowerCase()}`}
                >
                  {statusLabel[ticket.status]}
                  <ChevronRight size={14} />
                </span>
              </button>
            ))}
          </div>
          <TicketDetail detail={detail} onRetry={() => detail.refetch()} />
        </div>
      )}
      {showCreate && (
        <CreateTicket
          onClose={() => setShowCreate(false)}
          onCreated={async id => {
            setShowCreate(false);
            setSelectedId(id);
            await mine.refetch();
          }}
        />
      )}
    </section>
  );
}

function CreateTicket({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: number) => void | Promise<void>;
}) {
  const [category, setCategory] = useState<Category>("OTHER");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const create = trpc.portal.tickets.create.useMutation({
    onSuccess: result => void onCreated(result.id),
    onError: error =>
      setFeedback({
        text: error.message || "문의를 등록하지 못했습니다.",
        error: true,
      }),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (create.isPending) return;
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (trimmedSubject.length < 3 || trimmedSubject.length > 150)
      return setFeedback({
        text: "제목은 3자 이상 150자 이하로 입력해 주세요.",
        error: true,
      });
    if (trimmedBody.length < 10 || trimmedBody.length > 5000)
      return setFeedback({
        text: "내용은 10자 이상 5,000자 이하로 입력해 주세요.",
        error: true,
      });
    setFeedback(null);
    create.mutate({ category, subject: trimmedSubject, body: trimmedBody });
  };
  return (
    <div className="portal-dialog-backdrop">
      <div
        className="portal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-ticket-heading"
      >
        <div className="portal-dialog-heading">
          <div>
            <span className="portal-kicker">NEW SUPPORT TICKET</span>
            <h3 id="create-ticket-heading">새 문의</h3>
          </div>
          <button
            type="button"
            className="portal-icon-button"
            onClick={onClose}
            aria-label="문의 창 닫기"
          >
            <X size={18} />
          </button>
        </div>
        <form className="portal-form" onSubmit={submit}>
          <label htmlFor="ticket-category">
            분류
            <select
              id="ticket-category"
              value={category}
              onChange={event => setCategory(event.target.value as Category)}
              disabled={create.isPending}
            >
              {categories.map(item => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="ticket-subject">
            제목
            <input
              id="ticket-subject"
              value={subject}
              onChange={event => setSubject(event.target.value)}
              minLength={3}
              maxLength={150}
              disabled={create.isPending}
            />
          </label>
          <label htmlFor="ticket-body">
            내용
            <textarea
              id="ticket-body"
              value={body}
              onChange={event => setBody(event.target.value)}
              minLength={10}
              maxLength={5000}
              rows={7}
              disabled={create.isPending}
            />
          </label>
          {feedback && (
            <div className="portal-feedback portal-feedback-error" role="alert">
              <CircleAlert size={15} /> {feedback.text}
            </div>
          )}
          <div className="portal-dialog-actions">
            <button
              type="button"
              className="portal-secondary-button"
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="submit"
              className="portal-primary-button"
              disabled={create.isPending}
            >
              {create.isPending ? "등록 중…" : "문의 등록"} <Send size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TicketDetail({
  detail,
  onRetry,
}: {
  detail: ReturnType<typeof trpc.portal.tickets.detail.useQuery>;
  onRetry: () => void;
}) {
  const [reply, setReply] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const utils = trpc.useUtils();
  const sendReply = trpc.portal.tickets.reply.useMutation({
    onSuccess: async () => {
      setReply("");
      setFeedback({ text: "답변을 추가했습니다." });
      await Promise.all([
        detail.refetch(),
        utils.portal.tickets.mine.invalidate(),
      ]);
    },
    onError: error =>
      setFeedback({
        text: error.message || "답변을 등록하지 못했습니다.",
        error: true,
      }),
  });
  if (!detail.data && !detail.isLoading && !detail.isError)
    return (
      <div className="portal-ticket-detail portal-ticket-placeholder">
        <MessageCircle size={22} />
        <p>목록에서 문의를 선택하면 상세 내용이 표시됩니다.</p>
      </div>
    );
  if (detail.isLoading)
    return (
      <div className="portal-ticket-detail portal-list-state">
        <span className="portal-spinner" /> 문의 내용을 불러오는 중…
      </div>
    );
  if (detail.isError)
    return (
      <div
        className="portal-ticket-detail portal-state portal-state-error"
        role="alert"
      >
        <CircleAlert size={18} />
        <div>
          <strong>문의 내용을 불러오지 못했습니다.</strong>
          <button
            type="button"
            className="portal-text-button"
            onClick={onRetry}
          >
            <RotateCw size={14} /> 다시 시도
          </button>
        </div>
      </div>
    );
  const ticketData = detail.data as unknown as TicketDetailResult | undefined;
  if (!ticketData) return null;
  const ticket = ticketData.ticket;
  const closed = ticket.status === "CLOSED";
  return (
    <div className="portal-ticket-detail">
      <div className="portal-ticket-detail-heading">
        <div>
          <span className="portal-meta-label">
            {categoryLabel(ticket.category)} · {formatDate(ticket.createdAt)}
          </span>
          <h3>{ticket.subject}</h3>
        </div>
        <span
          className={`portal-ticket-status portal-ticket-status-${ticket.status.toLowerCase()}`}
        >
          {statusLabel[ticket.status]}
        </span>
      </div>
      <div className="portal-ticket-message">
        <span className="portal-meta-label">내 문의</span>
        <p>{ticket.body}</p>
      </div>
      <div className="portal-replies">
        {ticketData.replies.map(item => (
          <div
            className={`portal-reply portal-reply-${item.authorRole}`}
            key={item.id}
          >
            <span className="portal-meta-label">
              {item.authorRole === "admin" ? "운영자 답변" : "내 답변"} ·{" "}
              {formatDate(item.createdAt)}
            </span>
            <p>{item.body}</p>
          </div>
        ))}
      </div>
      {!closed ? (
        <form
          className="portal-reply-form"
          onSubmit={event => {
            event.preventDefault();
            const trimmed = reply.trim();
            if (trimmed.length < 3 || trimmed.length > 5000)
              return setFeedback({
                text: "답변은 3자 이상 5,000자 이하로 입력해 주세요.",
                error: true,
              });
            setFeedback(null);
            sendReply.mutate({ id: ticket.id, body: trimmed });
          }}
        >
          <label htmlFor="ticket-reply">
            추가 답변
            <textarea
              id="ticket-reply"
              value={reply}
              onChange={event => setReply(event.target.value)}
              minLength={3}
              maxLength={5000}
              rows={4}
              disabled={sendReply.isPending}
              placeholder="추가로 전달할 내용을 작성해 주세요."
            />
          </label>
          <div className="portal-form-footer">
            <span>{reply.length.toLocaleString("ko-KR")} / 5,000자</span>
            <button
              className="portal-primary-button"
              type="submit"
              disabled={sendReply.isPending}
            >
              {sendReply.isPending ? "등록 중…" : "답변 등록"}{" "}
              <Send size={15} />
            </button>
          </div>
          {feedback && (
            <div
              className={`portal-feedback ${feedback.error ? "portal-feedback-error" : ""}`}
              role={feedback.error ? "alert" : "status"}
            >
              {feedback.text}
            </div>
          )}
        </form>
      ) : (
        <div className="portal-closed-note">
          종료된 문의에는 추가 답변을 남길 수 없습니다.
        </div>
      )}
    </div>
  );
}
