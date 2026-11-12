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

type Status = "PENDING" | "APPROVED" | "REJECTED";
type Application = {
  id: number;
  userId: number;
  message: string;
  status: Status;
  reviewNote: string | null;
  memberName: string | null;
  memberEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};
const labels = {
  PENDING: "승인 대기",
  APPROVED: "회원 승인",
  REJECTED: "회원 거절",
};

export default function AdminApplications() {
  const [status, setStatus] = useState<"ALL" | Status>("PENDING");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Application | null>(null);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(
    null
  );
  const [feedback, setFeedback] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const utils = trpc.useUtils();
  const list = trpc.admin.portal.access.list.useQuery(
    { status, page, pageSize: 20 },
    { retry: false }
  );
  const review = trpc.admin.portal.access.review.useMutation({
    onSuccess: async () => {
      setDecision(null);
      setSelected(null);
      setNote("");
      setFeedback({
        text: "초대 회원 승인 처리 결과를 기록했습니다. 운영자 권한이나 자금 이동은 부여되지 않습니다.",
        error: false,
      });
      await Promise.all([
        utils.admin.portal.access.list.invalidate(),
        utils.admin.portal.summary.invalidate(),
        utils.portal.access.mine.invalidate(),
        utils.portal.materials.list.invalidate(),
      ]);
    },
    onError: async error => {
      setDecision(null);
      setFeedback({ text: error.message, error: true });
      if (error.data?.code === "CONFLICT" || error.data?.code === "NOT_FOUND") {
        setSelected(null);
        await utils.admin.portal.access.list.invalidate();
      }
    },
  });
  const canReview =
    selected?.status === "PENDING" &&
    note.trim().length >= 3 &&
    note.trim().length <= 1000 &&
    !review.isPending;
  const clear = () => {
    setSelected(null);
    setNote("");
    setFeedback(null);
  };
  return (
    <section aria-label="초대 회원 승인 관리">
      <div className="portal-filter-row">
        <label>
            회원 상태
          <select
            value={status}
            disabled={review.isPending}
            onChange={event => {
              setStatus(event.target.value as typeof status);
              setPage(1);
              clear();
            }}
          >
            <option value="PENDING">검토 대기</option>
            <option value="APPROVED">이용 승인</option>
            <option value="REJECTED">이용 거절</option>
            <option value="ALL">전체</option>
          </select>
        </label>
        <button
          className="portal-secondary"
          disabled={list.isFetching || review.isPending}
          onClick={() => {
            clear();
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
          <h2>초대 회원 승인 목록</h2>
          {list.isLoading ? (
            <p role="status">신청 목록을 불러오는 중…</p>
          ) : list.isError ? (
            <p role="alert">조회에 실패했습니다. {list.error.message}</p>
          ) : !list.data?.items.length ? (
            <p className="portal-empty">해당 조건의 신청이 없습니다.</p>
          ) : (
            <ul className="portal-record-list">
              {list.data.items.map(item => (
                <li key={item.id}>
                  <button
                    disabled={review.isPending}
                    className={selected?.id === item.id ? "is-selected" : ""}
                    onClick={() => {
                      setSelected(item);
                      setNote("");
                      setFeedback(null);
                    }}
                  >
                    <strong>
                      #{item.id} · {item.memberName || `회원 #${item.userId}`}
                    </strong>
                    <span>
                      {labels[item.status]} ·{" "}
                      {formatFinanceDate(item.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="portal-pagination">
            <button
              disabled={page <= 1 || list.isFetching || review.isPending}
              onClick={() => {
                setPage(page - 1);
                clear();
              }}
            >
              이전
            </button>
            <span>{page}페이지</span>
            <button
              disabled={
                !list.data?.hasMore ||
                list.isFetching ||
                list.isError ||
                review.isPending
              }
              onClick={() => {
                setPage(page + 1);
                clear();
              }}
            >
              다음
            </button>
          </div>
        </div>
        <div className="portal-card">
          {!selected ? (
            <p className="portal-empty">회원을 선택해 가입 정보를 확인하세요.</p>
          ) : (
            <>
              <h2>초대 회원 #{selected.id}</h2>
              <p>
                <strong>
                  {selected.memberName || `회원 #${selected.userId}`}
                </strong>
                <br />
                <span className="portal-muted">
                  {selected.memberEmail || "이메일 정보 없음"}
                </span>
              </p>
              <span
                className={`portal-badge status-${selected.status.toLowerCase()}`}
              >
                {labels[selected.status]}
              </span>
              <h3>신청 내용</h3>
              <p className="portal-prose">{selected.message}</p>
              <p className="portal-muted">
                수정: {formatFinanceDate(selected.updatedAt)}
              </p>
              {selected.status !== "PENDING" ? (
                <>
                  <h3>회원 공개 사유</h3>
                  <p className="portal-prose">
                    {selected.reviewNote || "등록된 사유가 없습니다."}
                  </p>
                  <p className="portal-muted">
                    이미 처리된 신청은 다시 변경할 수 없습니다.
                  </p>
                </>
              ) : (
                <div className="portal-form">
                  <label>
                    처리 사유 <small>회원에게 공개됩니다.</small>
                    <textarea
                      rows={4}
                      minLength={3}
                      maxLength={1000}
                      disabled={review.isPending}
                      value={note}
                      onChange={event => setNote(event.target.value)}
                      placeholder="처리 사유를 3자 이상 기록해 주세요."
                    />
                  </label>
                  <small className="portal-muted">
                    {note.trim().length} / 1,000자
                  </small>
                  <div className="portal-form-actions">
                    <button
                      className="portal-button"
                      disabled={!canReview}
                      onClick={() => setDecision("APPROVED")}
                    >
                      회원 승인
                    </button>
                    <button
                      className="portal-secondary"
                      disabled={!canReview}
                      onClick={() => setDecision("REJECTED")}
                    >
                      회원 거절
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <AlertDialog
        open={Boolean(decision)}
        onOpenChange={open => {
          if (!open && !review.isPending) setDecision(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selected?.memberName || `회원 #${selected?.userId}`}의 회원
              가입을 {decision === "APPROVED" ? "승인" : "거절"}할까요?
            </AlertDialogTitle>
            <AlertDialogDescription>
              처리 사유는 회원에게 공개되며 되돌리는 기능은 없습니다. 회원 승인은
              자료 접근만 허용하며 운영자 권한이나 실제 금융 거래를 허용하지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="portal-confirm-note">{note.trim()}</p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={review.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!canReview}
              onClick={event => {
                event.preventDefault();
                if (selected && decision && canReview)
                  review.mutate({
                    id: selected.id,
                    decision,
                    note: note.trim(),
                  });
              }}
            >
              {review.isPending ? "기록 중…" : "확인 후 기록"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
