import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatFinanceDate } from "@/components/FinanceStatus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusLabels = {
  OPEN: "답변 대기",
  ANSWERED: "운영자 답변",
  CLOSED: "종료",
};
const categories = {
  ACCOUNT: "계정",
  DEPOSIT: "입금 요청",
  WITHDRAWAL: "출금 요청",
  MATERIALS: "자료",
  OTHER: "기타",
};

export default function AdminTickets() {
  const [status, setStatus] = useState<"ALL" | "OPEN" | "ANSWERED" | "CLOSED">(
    "OPEN"
  );
  const [page, setPage] = useState(1);
  const [id, setId] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [closing, setClosing] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const utils = trpc.useUtils();
  const list = trpc.admin.portal.tickets.list.useQuery(
    { status, page, pageSize: 20 },
    { retry: false }
  );
  const detail = trpc.admin.portal.tickets.detail.useQuery(
    { id: id ?? 0 },
    { enabled: id !== null, retry: false }
  );
  const invalidate = async () => {
    await Promise.all([
      utils.admin.portal.tickets.list.invalidate(),
      utils.admin.portal.tickets.detail.invalidate(),
      utils.admin.portal.summary.invalidate(),
      utils.portal.tickets.mine.invalidate(),
      utils.portal.tickets.detail.invalidate(),
    ]);
  };
  const failed = async (error: {
    message: string;
    data?: { code?: string } | null;
  }) => {
    setClosing(false);
    setFeedback({ text: error.message, error: true });
    if (error.data?.code === "CONFLICT") await invalidate();
  };
  const reply = trpc.admin.portal.tickets.reply.useMutation({
    onSuccess: async () => {
      setBody("");
      setFeedback({ text: "운영자 답변을 저장했습니다.", error: false });
      await invalidate();
    },
    onError: failed,
  });
  const close = trpc.admin.portal.tickets.close.useMutation({
    onSuccess: async () => {
      setClosing(false);
      setBody("");
      setFeedback({
        text: "문의를 종료했습니다. 이후 답변을 추가할 수 없습니다.",
        error: false,
      });
      await invalidate();
    },
    onError: failed,
  });
  const pending = reply.isPending || close.isPending;
  const reset = () => {
    setId(null);
    setBody("");
    setFeedback(null);
  };
  const ticket = detail.data?.ticket;
  return (
    <section aria-label="회원 문의 관리">
      <div className="portal-filter-row">
        <label>
          문의 상태
          <select
            disabled={pending}
            value={status}
            onChange={event => {
              setStatus(event.target.value as typeof status);
              setPage(1);
              reset();
            }}
          >
            <option value="OPEN">답변 대기</option>
            <option value="ANSWERED">운영자 답변</option>
            <option value="CLOSED">종료</option>
            <option value="ALL">전체</option>
          </select>
        </label>
        <button
          className="portal-secondary"
          disabled={pending || list.isFetching}
          onClick={() => {
            reset();
            void list.refetch();
          }}
        >
          새로고침
        </button>
      </div>
      {feedback && (
        <div
          className={`portal-feedback ${feedback.error ? "is-error" : ""}`}
          role={feedback.error ? "alert" : "status"}
        >
          {feedback.text}
        </div>
      )}
      <div className="portal-two-pane">
        <div className="portal-card">
          <h2>문의 목록</h2>
          {list.isLoading ? (
            <p role="status">문의 목록을 불러오는 중…</p>
          ) : list.isError ? (
            <p role="alert">
              문의 목록을 불러오지 못했습니다. {list.error.message}
            </p>
          ) : !list.data?.items.length ? (
            <p className="portal-empty">해당 조건의 문의가 없습니다.</p>
          ) : (
            <ul className="portal-record-list">
              {list.data.items.map(item => (
                <li key={item.id}>
                  <button
                    disabled={pending}
                    className={id === item.id ? "is-selected" : ""}
                    onClick={() => {
                      setId(item.id);
                      setBody("");
                      setFeedback(null);
                    }}
                  >
                    <strong>
                      #{item.id} · {item.subject}
                    </strong>
                    <span>
                      {item.memberName || `회원 #${item.userId}`} ·{" "}
                      {statusLabels[item.status]} ·{" "}
                      {formatFinanceDate(item.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="portal-pagination">
            <button
              disabled={page <= 1 || pending || list.isFetching}
              onClick={() => {
                setPage(page - 1);
                reset();
              }}
            >
              이전
            </button>
            <span>{page}페이지</span>
            <button
              disabled={
                !list.data?.hasMore ||
                list.isError ||
                pending ||
                list.isFetching
              }
              onClick={() => {
                setPage(page + 1);
                reset();
              }}
            >
              다음
            </button>
          </div>
        </div>
        <div className="portal-card">
          {id === null ? (
            <p className="portal-empty">문의 목록에서 내용을 선택하세요.</p>
          ) : detail.isLoading ? (
            <p role="status">문의 상세를 조회하는 중…</p>
          ) : detail.isError ? (
            <div role="alert">
              <p>문의 상세를 불러오지 못했습니다. {detail.error.message}</p>
              <button
                className="portal-secondary"
                onClick={() => void detail.refetch()}
              >
                다시 시도
              </button>
            </div>
          ) : !ticket ? (
            <p className="portal-empty">문의가 존재하지 않습니다.</p>
          ) : (
            <>
              <h2>
                #{ticket.id} · {ticket.subject}
              </h2>
              <p className="portal-muted">
                회원 #{ticket.userId} · {categories[ticket.category]} ·{" "}
                {statusLabels[ticket.status]}
              </p>
              <article className="portal-message">
                <strong>회원 문의</strong>
                <time>{formatFinanceDate(ticket.createdAt)}</time>
                <p>{ticket.body}</p>
              </article>
              {detail.data?.replies.map(entry => (
                <article
                  className={`portal-message ${entry.authorRole === "admin" ? "from-operator" : ""}`}
                  key={entry.id}
                >
                  <strong>
                    {entry.authorRole === "admin" ? "운영자" : "회원"} #
                    {entry.authorId}
                  </strong>
                  <time>{formatFinanceDate(entry.createdAt)}</time>
                  <p>{entry.body}</p>
                </article>
              ))}
              {ticket.status === "CLOSED" ? (
                <p className="portal-empty">
                  종료된 문의입니다. 답변을 추가할 수 없습니다.
                </p>
              ) : (
                <form
                  className="portal-form"
                  onSubmit={event => {
                    event.preventDefault();
                    if (
                      !pending &&
                      id &&
                      body.trim().length >= 3 &&
                      body.trim().length <= 5000
                    )
                      reply.mutate({ id, body: body.trim() });
                  }}
                >
                  <label>
                    운영자 답변
                    <textarea
                      required
                      minLength={3}
                      maxLength={5000}
                      rows={5}
                      disabled={pending}
                      value={body}
                      onChange={event => setBody(event.target.value)}
                      placeholder="회원에게 전달할 답변을 입력하세요."
                    />
                  </label>
                  <small className="portal-muted">
                    {body.trim().length} / 5,000자 · 회원에게 공개됩니다.
                  </small>
                  <div className="portal-form-actions">
                    <button
                      type="submit"
                      className="portal-button"
                      disabled={
                        pending ||
                        body.trim().length < 3 ||
                        body.trim().length > 5000
                      }
                    >
                      {reply.isPending ? "답변 저장 중…" : "답변 저장"}
                    </button>
                    <button
                      type="button"
                      className="portal-secondary"
                      disabled={pending}
                      onClick={() => setClosing(true)}
                    >
                      문의 종료
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
      <AlertDialog
        open={closing}
        onOpenChange={open => {
          if (!pending) setClosing(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>문의 #{id}를 종료할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              종료하면 회원과 운영자는 이 문의에 추가 답변을 남길 수 없습니다.
              문의 내용과 답변은 기록으로 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending || !ticket || ticket.status === "CLOSED"}
              onClick={event => {
                event.preventDefault();
                if (id && !pending) close.mutate({ id });
              }}
            >
              {close.isPending ? "종료 중…" : "확인 후 종료"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
