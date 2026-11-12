import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

const defaults = [
  ["수익을 보장하나요?", "아닙니다. 수익이나 지급을 보장하지 않으며, 서비스 이용 전 운영 정책과 위험을 확인해야 합니다."],
  ["EA를 정말 무료로 받을 수 있나요?", "제공 여부와 조건은 운영자가 게시한 최신 안내를 기준으로 확인해 주세요."],
  ["제 돈을 맡기는 건가요?", "회원 서비스 화면은 신청·검토 기록을 표시합니다. 실제 자금 보관이나 자동 송금 여부는 별도 운영 정책을 확인해야 합니다."],
  ["초보자도 할 수 있나요?", "초보자도 안내 자료를 확인할 수 있지만, 내용을 충분히 이해하고 본인의 판단과 책임으로 이용해야 합니다."],
  ["가입 후 무엇을 캡처해서 보내야 하나요?", "운영자가 요구한 안내가 있을 때만 필요한 화면을 확인해 보내 주세요. 비밀번호·개인키·복구 문구는 보내지 마세요."],
  ["성과는 어디서 확인하나요?", "운영자가 게시한 공지와 회원 자료실에서 확인합니다. 화면의 예상 계산은 실제 지급이나 성과를 보장하지 않습니다."],
] as const;

export default function AdminFaq() {
  const [id, setId] = useState<number | undefined>();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [feedback, setFeedback] = useState("");
  const utils = trpc.useUtils();
  const list = trpc.admin.portal.faq.list.useQuery(undefined, { retry: false });
  const save = trpc.admin.portal.faq.save.useMutation({
    onSuccess: async () => {
      setFeedback("FAQ를 저장했습니다.");
      reset();
      await utils.admin.portal.faq.list.invalidate();
      await utils.publicContent.faq.invalidate();
    },
    onError: error => setFeedback(error.message),
  });
  const remove = trpc.admin.portal.faq.delete.useMutation({
    onSuccess: async () => {
      setFeedback("FAQ를 삭제했습니다.");
      await utils.admin.portal.faq.list.invalidate();
      await utils.publicContent.faq.invalidate();
    },
    onError: error => setFeedback(error.message),
  });
  const pending = save.isPending || remove.isPending;
  const reset = () => {
    setId(undefined);
    setQuestion("");
    setAnswer("");
    setPublished(true);
    setSortOrder(0);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (question.trim().length < 3 || answer.trim().length < 3 || pending) return;
    save.mutate({ id, question: question.trim(), answer: answer.trim(), published, sortOrder });
  };
  return (
    <section className="portal-faq-admin" aria-label="FAQ 관리">
      <div className="portal-filter-row">
        <p className="portal-muted">공개 도움말에 표시할 FAQ를 입력하고, 게시 여부와 순서를 관리합니다.</p>
        <button className="portal-secondary" type="button" onClick={() => { reset(); setFeedback(""); }} disabled={pending}><Plus size={15} /> 새 FAQ</button>
      </div>
      {feedback && <div className="portal-feedback" role="status">{feedback}</div>}
      <div className="portal-two-pane">
        <div className="portal-card">
          <h2>FAQ 목록</h2>
          {list.isLoading && <p role="status">FAQ를 불러오는 중…</p>}
          {list.isError && <p role="alert">FAQ를 불러오지 못했습니다.</p>}
          {!list.isLoading && !list.data?.length && <div className="portal-empty"><p>등록된 FAQ가 없습니다.</p><p>아래 기본 질문 6개를 참고해 입력할 수 있습니다.</p>{defaults.map(([q]) => <button key={q} type="button" className="portal-text-button" onClick={() => { setQuestion(q); setAnswer(""); }}>{q}</button>)}</div>}
          <ul className="portal-record-list">
            {list.data?.map(item => <li key={item.id}><button type="button" className={id === item.id ? "is-selected" : ""} onClick={() => { setId(item.id); setQuestion(item.question); setAnswer(item.answer); setPublished(Boolean(item.published)); setSortOrder(item.sortOrder); }}><strong>{item.question}</strong><span>{item.published ? "게시 중" : "숨김"} · 순서 {item.sortOrder}</span></button></li>)}
          </ul>
        </div>
        <form className="portal-card portal-form" onSubmit={submit}>
          <h2>{id ? `FAQ #${id} 수정` : "FAQ 입력"}</h2>
          <label>질문<input required minLength={3} maxLength={250} value={question} onChange={event => setQuestion(event.target.value)} disabled={pending} /></label>
          <label>답변<textarea required minLength={3} maxLength={5000} rows={8} value={answer} onChange={event => setAnswer(event.target.value)} disabled={pending} /></label>
          <label>표시 순서<input type="number" min={0} max={9999} value={sortOrder} onChange={event => setSortOrder(Number(event.target.value))} disabled={pending} /></label>
          <label className="portal-checkbox"><input type="checkbox" checked={published} onChange={event => setPublished(event.target.checked)} disabled={pending} /> 공개 화면에 게시</label>
          <div className="portal-form-actions"><button className="portal-button" type="submit" disabled={pending || question.trim().length < 3 || answer.trim().length < 3}><Pencil size={15} /> {save.isPending ? "저장 중…" : "저장"}</button>{id && <button className="portal-secondary" type="button" disabled={pending} onClick={() => { if (window.confirm("이 FAQ를 삭제할까요?")) remove.mutate({ id }); }}><Trash2 size={15} /> 삭제</button>}</div>
        </form>
      </div>
    </section>
  );
}
