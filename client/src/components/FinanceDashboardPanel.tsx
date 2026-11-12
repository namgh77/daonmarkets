import { type FormEvent, useMemo, useState } from "react";
import { ArrowRight, Calculator, Check, Copy, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { trpc } from "@/lib/trpc";
import MemberFinanceHistory from "@/components/MemberFinanceHistory";
import {
  depositInputSchema,
  financeAssetForNetwork,
  withdrawalInputSchema,
} from "@shared/finance";
import "../admin-finance.css";

const networks = ["TRC20", "BEP20"] as const;
type Network = (typeof networks)[number];

// Public receiving addresses supplied by the owner and verified for display format.
const depositAddresses: Array<{ network: Network; address: string }> = [
  { network: "TRC20", address: "TZHR3u5Q8XwQESYm5vSWV3ktFetbFrEbXx" },
  { network: "BEP20", address: "" },
];

export default function FinanceDashboardPanel() {
  const utils = trpc.useUtils();
  const [deposit, setDeposit] = useState({ amount: "", network: "TRC20" as Network, txHash: "" });
  const [withdrawal, setWithdrawal] = useState({ amount: "", network: "TRC20" as Network, destinationAddress: "" });
  const [dailyBase, setDailyBase] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [copiedNetwork, setCopiedNetwork] = useState<Network | null>(null);

  const createDeposit = trpc.finance.deposits.create.useMutation({
    onSuccess: async () => {
      setDeposit({ amount: "", network: "TRC20", txHash: "" });
      setFeedback({ text: "입금 요청을 접수했습니다. 실제 입금은 확인되지 않았습니다. 자금을 전송하지 마세요.", error: false });
      await utils.finance.deposits.mine.invalidate();
    },
    onError: error => setFeedback({ text: error.message, error: true }),
  });
  const createWithdrawal = trpc.finance.withdrawals.create.useMutation({
    onSuccess: async () => {
      setWithdrawal({ amount: "", network: "TRC20", destinationAddress: "" });
      setFeedback({ text: "출금 요청을 접수했습니다. 현재는 검토 대기이며 실제 송금은 실행되지 않습니다.", error: false });
      await utils.finance.withdrawals.mine.invalidate();
    },
    onError: error => setFeedback({ text: error.message, error: true }),
  });

  const expectedDaily = useMemo(() => {
    const value = Number(dailyBase.replace(/,/g, ""));
    return Number.isFinite(value) && value > 0 ? value * 0.003 : null;
  }, [dailyBase]);

  const copyDepositAddress = async (network: Network, address: string) => {
    if (!address) {
      setFeedback({ text: `${financeAssetForNetwork(network)} (${network}) 입금 주소가 아직 등록되지 않았습니다. 운영자에게 확인해 주세요.`, error: true });
      return;
    }
    await navigator.clipboard.writeText(address);
    setCopiedNetwork(network);
    window.setTimeout(() => setCopiedNetwork(current => current === network ? null : current), 1600);
  };

  const submitDeposit = (event: FormEvent) => {
    event.preventDefault();
    if (createDeposit.isPending) return;
    const result = depositInputSchema.safeParse(deposit);
    if (!result.success) {
      setFeedback({ text: result.error.issues[0]?.message || "입금 요청 내용을 확인해 주세요.", error: true });
      return;
    }
    setFeedback(null);
    createDeposit.mutate(result.data);
  };
  const submitWithdrawal = (event: FormEvent) => {
    event.preventDefault();
    if (createWithdrawal.isPending) return;
    const result = withdrawalInputSchema.safeParse(withdrawal);
    if (!result.success) {
      setFeedback({ text: result.error.issues[0]?.message || "출금 요청 내용을 확인해 주세요.", error: true });
      return;
    }
    setFeedback(null);
    createWithdrawal.mutate(result.data);
  };

  return (
    <section className="dashboard-finance-section" aria-labelledby="dashboard-finance-title">
      <div className="dashboard-section-heading">
        <div className="dashboard-kicker"><ShieldCheck size={14} /> FUNDS OVERVIEW</div>
        <h2 id="dashboard-finance-title">입금·출금 기록과<br /><em>표시 금액을 확인하세요.</em></h2>
      </div>
      <div className="dashboard-finance-notice" role="note">
        <ShieldCheck size={18} />
        <div><strong>요청 접수와 예상 계산만 제공됩니다.</strong><p>이 화면은 실제 잔액·송금·지급을 처리하지 않습니다. 승인도 입금 확인이나 출금 완료를 뜻하지 않습니다.</p></div>
      </div>
      <div className="dashboard-deposit-addresses" aria-labelledby="deposit-addresses-title">
        <div className="dashboard-deposit-address-heading">
          <div><span className="dashboard-card-kicker">COMPANY DEPOSIT ADDRESS</span><h3 id="deposit-addresses-title">입금 주소</h3></div>
          <p>선택한 네트워크와 동일한 주소로만 보내세요.</p>
        </div>
        <div className="dashboard-address-grid">
          {depositAddresses.map(({ network, address }) => (
            <article className="dashboard-address-card" key={network}>
              <div className="dashboard-address-card-top"><strong>{financeAssetForNetwork(network)}</strong><span>{network}</span></div>
              {address && <div className="dashboard-address-qr" aria-label={`${financeAssetForNetwork(network)} ${network} 입금 주소 QR 코드`}><QRCodeSVG value={address} size={92} bgColor="#ffffff" fgColor="#080d22" includeMargin /></div>}
              <div className="dashboard-address-value">{address || "입금 주소 준비 중"}</div>
              <button type="button" onClick={() => void copyDepositAddress(network, address)} disabled={!address} aria-label={`${network} 주소 복사`}>
                {copiedNetwork === network ? <><Check size={15} /> 복사됨</> : <><Copy size={15} /> 복사</>}
              </button>
            </article>
          ))}
        </div>
        <p className="dashboard-address-warning">네트워크가 다르면 자산을 잃을 수 있습니다. 주소와 네트워크를 반드시 확인하세요. 회원의 실수로 다른 주소 또는 잘못된 네트워크로 전송한 경우 회사는 책임을 지지 않습니다. 주소가 등록되기 전에는 자금을 전송하지 마세요.</p>
      </div>
      <div className="dashboard-finance-grid">
        <form className="dashboard-finance-card" onSubmit={submitDeposit}>
          <span className="dashboard-card-kicker">01 / DEPOSIT</span>
          <h3>입금 신청</h3>
          <p>금액과 네트워크를 등록합니다. 거래 해시는 선택 항목입니다.</p>
          <label>금액 ({financeAssetForNetwork(deposit.network)})<input required type="text" inputMode="decimal" value={deposit.amount} onChange={event => setDeposit({ ...deposit, amount: event.target.value })} placeholder="0.00" /></label>
          <label>자산·네트워크<select value={deposit.network} onChange={event => setDeposit({ ...deposit, network: event.target.value as Network })}>{networks.map(item => <option key={item} value={item}>{financeAssetForNetwork(item)} · {item}</option>)}</select></label>
          <label>거래 해시 (선택)<input value={deposit.txHash} onChange={event => setDeposit({ ...deposit, txHash: event.target.value })} placeholder={deposit.network === "TRC20" ? "64자리 16진수 해시" : "0x로 시작하는 해시"} /></label>
          <button type="submit" disabled={createDeposit.isPending}>{createDeposit.isPending ? "접수 중…" : "입금 신청 접수"} <ArrowRight size={16} /></button>
        </form>
        <form className="dashboard-finance-card" onSubmit={submitWithdrawal}>
          <span className="dashboard-card-kicker">02 / WITHDRAWAL</span>
          <h3>출금 신청</h3>
          <p>금액과 출금 주소를 등록합니다. 실제 송금은 수행하지 않습니다.</p>
          <label>금액 ({financeAssetForNetwork(withdrawal.network)})<input required type="text" inputMode="decimal" value={withdrawal.amount} onChange={event => setWithdrawal({ ...withdrawal, amount: event.target.value })} placeholder="0.00" /></label>
          <label>자산·네트워크<select value={withdrawal.network} onChange={event => setWithdrawal({ ...withdrawal, network: event.target.value as Network })}>{networks.map(item => <option key={item} value={item}>{financeAssetForNetwork(item)} · {item}</option>)}</select></label>
          <label>출금 지갑 주소<input required value={withdrawal.destinationAddress} onChange={event => setWithdrawal({ ...withdrawal, destinationAddress: event.target.value })} placeholder={withdrawal.network === "TRC20" ? "T로 시작하는 주소" : "0x로 시작하는 주소"} /></label>
          <button type="submit" disabled={createWithdrawal.isPending}>{createWithdrawal.isPending ? "접수 중…" : "출금 신청 접수"} <ArrowRight size={16} /></button>
        </form>
        <div className="dashboard-rate-card">
          <div className="dashboard-rate-icon"><Calculator size={20} /></div>
          <span className="dashboard-card-kicker">DAILY DISPLAY RATE</span>
          <h3>일일 표시 기준</h3>
          <p>입력한 기준 금액을 바탕으로 운영 장부에 표시할 금액을 계산합니다.</p>
          <label>기준 금액 (USDT)<input type="text" inputMode="decimal" value={dailyBase} onChange={event => setDailyBase(event.target.value)} placeholder="예: 1,000" /></label>
          <strong className="dashboard-rate-result">{expectedDaily === null ? "—" : `${expectedDaily.toLocaleString("ko-KR", { maximumFractionDigits: 8 })} USDT`}</strong>
          <small>사이트의 표시용 계산값이며 실제 입출금은 운영자가 별도로 처리합니다.</small>
        </div>
      </div>
      {feedback && <div className={`dashboard-finance-feedback ${feedback.error ? "is-error" : ""}`} role={feedback.error ? "alert" : "status"}>{feedback.text}</div>}
      <MemberFinanceHistory />
    </section>
  );
}
