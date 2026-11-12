import { type FormEvent, useState } from "react";
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

type Kind = "announcement" | "material";
type AttachmentPayload = {
  name: string;
  type: string;
  size: number;
  base64: string;
};
type Editor = {
  id?: number;
  title: string;
  body: string;
  audience: "PUBLIC" | "MEMBERS";
  published: boolean;
  popup: boolean;
  attachment?: AttachmentPayload;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  attachmentSize?: number | null;
};
const emptyEditor = (): Editor => ({
  title: "",
  body: "",
  audience: "PUBLIC",
  published: false,
  popup: false,
  attachmentName: null,
  attachmentUrl: null,
  attachmentSize: null,
});

export default function AdminContent({ kind }: { kind: Kind }) {
  const [editor, setEditor] = useState<Editor>(emptyEditor);
  const [feedback, setFeedback] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const utils = trpc.useUtils();
  const announcements = trpc.admin.portal.announcements.list.useQuery(
    undefined,
    { enabled: kind === "announcement", retry: false }
  );
  const materials = trpc.admin.portal.materials.list.useQuery(undefined, {
    enabled: kind === "material",
    retry: false,
  });
  const saved = async () => {
    setConfirm(false);
    setEditor(emptyEditor());
    setFeedback({ text: "내용과 게시 상태를 저장했습니다.", error: false });
    await Promise.all([
      utils.admin.portal.announcements.list.invalidate(),
      utils.admin.portal.materials.list.invalidate(),
      utils.admin.portal.summary.invalidate(),
      utils.portal.announcements.list.invalidate(),
      utils.portal.materials.list.invalidate(),
      utils.publicContent.announcements.invalidate(),
      utils.publicContent.popupAnnouncement.invalidate(),
    ]);
  };
  const failed = (error: { message: string }) => {
    setConfirm(false);
    setFeedback({ text: error.message, error: true });
  };
  const saveAnnouncement = trpc.admin.portal.announcements.save.useMutation({
    onSuccess: saved,
    onError: failed,
  });
  const saveMaterial = trpc.admin.portal.materials.save.useMutation({
    onSuccess: saved,
    onError: failed,
  });
  const pending =
    saveAnnouncement.isPending || saveMaterial.isPending || readingFile;
  const valid =
    editor.title.trim().length >= 3 &&
    editor.title.trim().length <= 150 &&
    editor.body.trim().length >= 10 &&
    editor.body.trim().length <= 20000;
  const query = kind === "announcement" ? announcements : materials;
  const items = kind === "announcement" ? announcements.data : materials.data;
  const name = kind === "announcement" ? "공지" : "자료";
  const save = () => {
    if (!valid || pending) return;
    setFeedback(null);
    if (kind === "announcement")
      saveAnnouncement.mutate({
        ...editor,
        title: editor.title.trim(),
        body: editor.body.trim(),
        attachment: editor.attachment,
      });
    else
      saveMaterial.mutate({
        id: editor.id,
        title: editor.title.trim(),
        body: editor.body.trim(),
        published: editor.published,
        attachment: editor.attachment,
      });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid || pending) return;
    if (editor.published) setConfirm(true);
    else save();
  };

  return (
    <section aria-label={`${name} 관리`}>
      <div className="portal-filter-row">
        <p className="portal-muted">
          {kind === "announcement"
            ? "전체 공개와 로그인 회원 공지를 구분합니다. 숨긴 공지는 회원·공개 페이지에 나타나지 않습니다."
            : "게시된 자료는 이용 승인을 받은 회원과 운영자만 볼 수 있습니다. 보호되지 않는 외부 다운로드 링크는 제공하지 않습니다."}
        </p>
        <button
          className="portal-secondary"
          disabled={pending}
          onClick={() => {
            setEditor(emptyEditor());
            setFeedback(null);
          }}
        >
          새 {name}
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
          <h2>{name} 목록</h2>
          {query.isLoading ? (
            <p role="status">목록을 불러오는 중…</p>
          ) : query.isError ? (
            <div role="alert">
              <p>목록을 조회하지 못했습니다.</p>
              <button
                className="portal-secondary"
                onClick={() => void query.refetch()}
              >
                다시 시도
              </button>
            </div>
          ) : !items?.length ? (
            <p className="portal-empty">
              등록한 {name}가 없습니다. 오른쪽에서 작성할 수 있습니다.
            </p>
          ) : (
            <ul className="portal-record-list">
              {items.map(item => (
                <li key={item.id}>
                  <button
                    disabled={pending}
                    className={editor.id === item.id ? "is-selected" : ""}
                    onClick={() => {
                      setFeedback(null);
                      setEditor({
                        id: item.id,
                        title: item.title,
                        body: item.body,
                        published: item.published,
                        popup: "popup" in item ? Boolean(item.popup) : false,
                        audience:
                          "audience" in item ? item.audience : "MEMBERS",
                        attachmentName: item.attachmentName,
                        attachmentUrl: item.attachmentUrl,
                        attachmentSize: item.attachmentSize,
                      });
                    }}
                  >
                    <strong>{item.title}</strong>
                    <span>
                      {item.published ? "게시 중" : "숨김"} ·{" "}
                      {"audience" in item
                        ? item.audience === "PUBLIC"
                          ? "전체 공개"
                          : "로그인 회원"
                        : "승인 회원"}{" "}
                      {"popup" in item && item.popup ? "· 팝업" : ""} ·{" "}
                      {formatFinanceDate(item.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form className="portal-card portal-form" onSubmit={submit}>
          <h2>
            {editor.id ? `${name} #${editor.id} 수정` : `새 ${name} 작성`}
          </h2>
          <label>
            제목
            <input
              required
              minLength={3}
              maxLength={150}
              disabled={pending}
              value={editor.title}
              onChange={event =>
                setEditor({ ...editor, title: event.target.value })
              }
            />
          </label>
          <label>
            본문
            <textarea
              required
              minLength={10}
              maxLength={20000}
              rows={10}
              disabled={pending}
              value={editor.body}
              onChange={event =>
                setEditor({ ...editor, body: event.target.value })
              }
            />
          </label>
          <small className="portal-muted">
            {editor.body.trim().length.toLocaleString()} / 20,000자 · 텍스트로
            저장되며 HTML은 실행되지 않습니다.
          </small>
          <label>
            첨부파일
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={pending}
              onChange={async event => {
                const file = event.target.files?.[0];
                if (!file) return;
                setReadingFile(true);
                try {
                  const bytes = new Uint8Array(await file.arrayBuffer());
                  let binary = "";
                  for (let offset = 0; offset < bytes.length; offset += 0x8000)
                    binary += String.fromCharCode(
                      ...bytes.subarray(offset, offset + 0x8000)
                    );
                  setEditor({
                    ...editor,
                    attachment: {
                      name: file.name,
                      type: file.type || "application/octet-stream",
                      size: file.size,
                      base64: btoa(binary),
                    },
                    attachmentName: file.name,
                    attachmentSize: file.size,
                  });
                  setFeedback(null);
                } catch {
                  setFeedback({
                    text: "파일을 읽지 못했습니다. 다시 선택해 주세요.",
                    error: true,
                  });
                } finally {
                  setReadingFile(false);
                }
              }}
            />
            <small className="portal-muted">
              PDF, PPT/PPTX, DOC/DOCX, XLS/XLSX · 최대 25MB
            </small>
            {(editor.attachmentName || editor.attachment) && (
              <small className="portal-attachment-note">
                선택됨: {editor.attachmentName || editor.attachment?.name}
                {editor.attachmentSize
                  ? ` (${(editor.attachmentSize / 1024 / 1024).toFixed(1)}MB)`
                  : ""}
              </small>
            )}
            {!editor.attachment && editor.attachmentUrl && (
              <a
                className="portal-attachment-note"
                href={editor.attachmentUrl}
                target="_blank"
                rel="noreferrer"
              >
                기존 첨부파일 열기: {editor.attachmentName}
              </a>
            )}
          </label>
          {kind === "announcement" && (
            <label>
              열람 대상
              <select
                disabled={pending}
                value={editor.audience}
                onChange={event =>
                  setEditor({
                    ...editor,
                    audience: event.target.value as Editor["audience"],
                  })
                }
              >
                <option value="PUBLIC">전체 공개</option>
                <option value="MEMBERS">로그인 회원</option>
              </select>
            </label>
          )}
          <label className="portal-checkbox">
            <input
              type="checkbox"
              disabled={pending}
              checked={editor.published}
              onChange={event =>
                setEditor({ ...editor, published: event.target.checked })
              }
            />{" "}
            저장 후 게시하기
          </label>
          {kind === "announcement" && (
            <label className="portal-checkbox">
              <input
                type="checkbox"
                disabled={pending || editor.audience !== "PUBLIC"}
                checked={editor.popup && editor.audience === "PUBLIC"}
                onChange={event =>
                  setEditor({ ...editor, popup: event.target.checked })
                }
              />{" "}
              홈페이지 팝업으로도 표시하기
            </label>
          )}
          <p className="portal-muted">
            숨김으로 저장하면 운영자만 확인할 수 있습니다. 게시 내용의 정확성과
            민감정보 포함 여부를 확인하세요. 일반 공개 공지는 공지 목록에만
            표시되며, 위의 팝업 체크를 선택한 공지만 홈페이지에 팝업으로
            표시됩니다.
          </p>
          <button
            className="portal-button"
            disabled={!valid || pending}
            type="submit"
          >
            {pending
              ? "저장 중…"
              : editor.published
                ? "게시 내용 확인"
                : "숨김으로 저장"}
          </button>
        </form>
      </div>
      <AlertDialog
        open={confirm}
        onOpenChange={open => {
          if (!pending) setConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{name}를 게시하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {kind === "announcement" && editor.audience === "PUBLIC"
                ? "로그인하지 않은 방문자도 볼 수 있는 전체 공개 공지입니다."
                : kind === "announcement"
                  ? "로그인한 회원에게 게시되는 공지입니다."
                  : "이용 승인을 받은 회원과 운영자에게 게시되는 자료입니다."}{" "}
              개인정보·내부 인증 정보가 포함되지 않았는지 확인하세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="portal-confirm-note">
            <strong>{editor.title.trim()}</strong>
            <p>{editor.body.trim()}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={!valid || pending}
              onClick={event => {
                event.preventDefault();
                save();
              }}
            >
              {pending ? "저장 중…" : "확인 후 게시"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
