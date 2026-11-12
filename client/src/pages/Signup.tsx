import { useSignUp } from "@clerk/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { type FormEvent, useState } from "react";
import { useAuth } from "../_core/hooks/useAuth";
import { getRuntimeAuthConfig, startLogin } from "../const";
import { clerkAppearance } from "../auth-provider";
import { trpc } from "../lib/trpc";
import PasswordGuidance from "../components/PasswordGuidance";
import { isStrongEnoughPassword, MIN_PASSWORD_LENGTH } from "../password-policy";
import {
  authLanguageLabel,
  getAuthLanguage,
  setAuthLanguage,
  type AuthLanguage,
} from "../auth-language";

const signupCopy = {
  ko: {
    banner: "Private member access · Secure email verification",
    back: "홈으로 돌아가기",
    eyebrow: "REQUEST ACCESS",
    title: "명확한 신청으로",
    titleAccent: "시작하세요.",
    description: "회사에서 받은 초대 링크로 이메일을 인증하면 보호된 회원 공간 이용을 시작할 수 있습니다.",
    existing: "이미 계정이 있으신가요?",
    action: "로그인",
    footer: "한국어 이메일 인증",
    loading: "안전한 로그인 상태를 확인하고 있습니다…",
  },
  en: {
    banner: "Private member access · Secure email verification",
    back: "Back home",
    eyebrow: "REQUEST ACCESS",
    title: "Start with a",
    titleAccent: "clear request.",
    description: "Use the invitation link provided by Daonmarkets, then verify your email to enter the protected member space.",
    existing: "Already have an account?",
    action: "Sign in",
    footer: "English email verification",
    loading: "Checking your secure login status…",
  },
  ja: {
    banner: "Private member access · Secure email verification",
    back: "ホームへ戻る",
    eyebrow: "REQUEST ACCESS",
    title: "明確な申請から",
    titleAccent: "始めましょう。",
    description: "Daonmarketsから受け取った招待リンクでメールを確認し、保護された会員スペースに進みます。",
    existing: "すでにアカウントをお持ちですか？",
    action: "ログイン",
    footer: "日本語メール認証",
    loading: "安全なログイン状態を確認しています…",
  },
} as const;


function EmailSignupForm({
  onError,
  inviteToken,
}: {
  onError: (message: string) => void;
  inviteToken: string;
}) {
  const { signUp } = useSignUp();
  const consumeInvite = trpc.invites.consume.useMutation();
  const [nickname, setNickname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verificationMode, setVerificationMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signUp || submitting) return;
    if (!isStrongEnoughPassword(password)) {
      onError(`비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자이며 대문자·소문자·숫자·특수문자를 모두 포함해야 합니다.`);
      return;
    }
    if (nickname.trim().length < 2) {
      onError("닉네임은 2자 이상 입력해 주세요.");
      return;
    }
    if (!/^[0-9+()\s-]{7,20}$/.test(phoneNumber.trim())) {
      onError("전화번호는 숫자와 +, -, (, )만 사용해 7자 이상 입력해 주세요.");
      return;
    }
    setSubmitting(true); onError("");
    try {
      const created = await signUp.create({
        emailAddress: email,
        password,
        unsafeMetadata: {
          nickname: nickname.trim(),
          phoneNumber: phoneNumber.trim(),
        },
      });
      if (created.error) { onError(created.error.message || "가입 정보를 확인해 주세요."); return; }
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) { onError(sent.error.message || "인증번호를 보내지 못했습니다."); return; }
      setVerificationMode(true);
      onError("인증번호를 이메일로 보냈습니다. 받은 번호를 입력해 주세요.");
    } catch (error) { onError(error instanceof Error ? error.message : "가입을 완료하지 못했습니다."); }
    finally { setSubmitting(false); }
  };
  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signUp || submitting) return;
    setSubmitting(true); onError("");
    try {
      const result = await signUp.verifications.verifyEmailCode({ code });
      if (result.error) { onError(result.error.message || "인증번호가 올바르지 않습니다."); return; }
      const finalized = await signUp.finalize();
      if (finalized.error) onError(finalized.error.message || "가입을 완료하지 못했습니다.");
      else {
        await consumeInvite.mutateAsync({ token: inviteToken });
        window.location.assign("/dashboard");
      }
    } catch (error) { onError(error instanceof Error ? error.message : "이메일 인증에 실패했습니다."); }
    finally { setSubmitting(false); }
  };
  if (verificationMode) return (
    <form className="email-auth-form" onSubmit={verify}>
      <label htmlFor="signup-code">이메일 인증번호</label>
      <input id="signup-code" inputMode="numeric" placeholder="이메일로 받은 인증번호" value={code} onChange={event => setCode(event.target.value)} required />
      <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "확인 중…" : "이메일 인증"} <ArrowRight size={17} /></button>
    </form>
  );
  return (
    <form className="email-auth-form" onSubmit={submit}>
      <label htmlFor="signup-nickname">닉네임</label>
      <input id="signup-nickname" type="text" autoComplete="nickname" placeholder="화면에 표시할 닉네임" value={nickname} onChange={event => setNickname(event.target.value)} required minLength={2} maxLength={40} />
      <label htmlFor="signup-phone">전화번호</label>
      <input id="signup-phone" type="tel" autoComplete="tel" placeholder="연락 가능한 전화번호" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} required minLength={7} maxLength={20} />
      <label htmlFor="signup-email">이메일</label>
      <input id="signup-email" type="email" autoComplete="email" placeholder="이메일 주소를 입력하세요" value={email} onChange={event => setEmail(event.target.value)} required />
      <label htmlFor="signup-password">비밀번호</label>
      <input id="signup-password" type="password" autoComplete="new-password" placeholder="12자 이상 입력하세요" value={password} onChange={event => setPassword(event.target.value)} required minLength={MIN_PASSWORD_LENGTH} />
      <PasswordGuidance password={password} />
      <button className="auth-submit" type="submit" disabled={submitting || !signUp}>{submitting ? "가입 준비 중…" : "가입 요청"} <ArrowRight size={17} /></button>
    </form>
  );
}

function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`auth-notice ${error ? "auth-notice-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <LockKeyhole size={15} />
      <span>{children}</span>
    </div>
  );
}

export default function Signup() {
  const [notice, setNotice] = useState("");
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState<AuthLanguage>(getAuthLanguage);
  const auth = useAuth();
  const config = getRuntimeAuthConfig();
  const isClerk = config.provider === "clerk";
  const inviteToken = new URLSearchParams(window.location.search).get("invite")?.trim() || "";
  const invite = trpc.invites.validate.useQuery(
    { token: inviteToken },
    { enabled: inviteToken.length > 0, retry: false }
  );
  const copy = signupCopy[language];

  const switchLanguage = (next: AuthLanguage) => {
    if (next === language) return;
    setAuthLanguage(next);
    setLanguage(next);
    window.location.reload();
  };

  const renderForm = () => {
    if (!inviteToken) {
      return (
        <div className="auth-preparation auth-provider-error" role="status">
          <strong>초대 링크가 필요합니다.</strong>
          <span>Daonmarkets는 공개 회원 가입을 받지 않습니다. 회사가 지정한 관리자 또는 파트너에게 초대 링크를 받아 다시 접속해 주세요.</span>
        </div>
      );
    }
    if (invite.isLoading) return <Notice>초대 링크를 확인하고 있습니다…</Notice>;
    if (invite.isError || !invite.data?.valid) {
      return (
        <div className="auth-preparation auth-provider-error" role="alert">
          <strong>초대 링크를 사용할 수 없습니다.</strong>
          <span>링크가 만료되었거나 이미 사용되었습니다. 새 초대 링크를 운영자에게 요청해 주세요.</span>
        </div>
      );
    }
    if (isClerk && !config.configured) {
      return (
        <div className="auth-preparation" role="status">
          <strong>이메일 가입 준비 중입니다.</strong>
          <span>
            Clerk 공개 키와 이메일 인증 설정이 아직 연결되지 않았습니다. 준비가
            완료되면 이 화면에서 회원 가입을 시작할 수 있습니다.
          </span>
        </div>
      );
    }

    if (isClerk) {
      if (auth.loading) return <Notice>{copy.loading}</Notice>;
      if (auth.error || auth.serverIdentityUnavailable) {
        return (
          <div className="auth-preparation auth-provider-error" role="alert">
            <strong>계정 정보를 확인하지 못했습니다.</strong>
            <span>
              세션이 만료되었거나 서버에서 회원 정보를 불러오지 못했습니다. 다시
              시도해 주세요.
            </span>
            <button
              className="auth-retry"
              type="button"
              onClick={() => void auth.refresh()}
            >
              다시 시도
            </button>
          </div>
        );
      }
      if (auth.isAuthenticated) {
        return (
          <>
            <Notice>
              이미 가입되어 있습니다.{" "}
              {auth.user?.name || auth.user?.email || "회원"}
            </Notice>
            <button
              className="auth-submit"
              type="button"
              onClick={() => setLocation("/member/services")}
            >
              회원 서비스로 이동 <ArrowRight size={17} />
            </button>
          </>
        );
      }
      if (auth.providerSignedIn) {
        return (
          <Notice error>
            Clerk 세션은 확인되었지만 Daonmarkets 회원 정보를 찾지 못했습니다.
            운영자에게 문의해 주세요.
          </Notice>
        );
      }
      return (
        <>
          {notice && <Notice error>{notice}</Notice>}
          <EmailSignupForm onError={setNotice} inviteToken={inviteToken} />
        </>
      );
    }

    if (!config.configured) {
      return (
        <div className="auth-preparation auth-provider-error" role="status">
          <strong>Manus 로그인이 구성되지 않았습니다.</strong>
          <span>
            운영자가 Manus 인증 설정을 연결한 뒤 가입을 시작할 수 있습니다.
          </span>
        </div>
      );
    }

    if (auth.loading) return <Notice>{copy.loading}</Notice>;
    if (auth.error) {
      return (
        <div className="auth-preparation auth-provider-error" role="alert">
          <strong>로그인 상태를 확인하지 못했습니다.</strong>
          <button
            className="auth-retry"
            type="button"
            onClick={() => void auth.refresh()}
          >
            다시 시도
          </button>
        </div>
      );
    }
    if (auth.isAuthenticated) {
      return (
        <>
          <Notice>
            계정이 연결되어 있습니다.{" "}
            {auth.user?.name || auth.user?.email || "회원"}
          </Notice>
          <button
            className="auth-submit"
            type="button"
            onClick={() => setLocation("/member/services")}
          >
            회원 서비스로 이동 <ArrowRight size={17} />
          </button>
        </>
      );
    }
    return (
      <>
        <button
          className="auth-submit"
          type="button"
          onClick={() => startLogin()}
        >
          Manus 계정 만들기 또는 사용 <ArrowRight size={17} />
        </button>
        <p className="auth-note">
          Manus가 명시적으로 선택된 환경에서만 실제 계정 인증을 시작합니다. 회원
          승인은 별도 검토 절차로 진행됩니다.
        </p>
      </>
    );
  };

  return (
    <div className="auth-shell">
      <aside className="auth-aside auth-aside-signup">
        <div className="auth-aside-top">
          <Link href="/" className="auth-wordmark">
            <span className="wordmark-mark">
              <span />
              <span />
              <span />
            </span>
            <span>
              DAON<span className="wordmark-accent">MARKETS</span>
            </span>
          </Link>
          <span className="auth-code">DM / 02</span>
        </div>
        <div className="auth-aside-content">
          <div className="eyebrow eyebrow-light">
            <span className="eyebrow-line" /> INVITATION SIGNUP
          </div>
          <h2>
            초대 링크로,
            <br />
            <em>안전하게 시작하세요.</em>
          </h2>
          <p>닉네임·전화번호·이메일을 등록하면 관리자 회원 승인 대기로 바로 이동합니다.</p>
          <div className="signup-checklist">
            <div>
              <Check size={14} /> 이메일 계정 인증
            </div>
            <div>
              <Check size={14} /> 관리자 회원 승인
            </div>
            <div>
              <Check size={14} /> 보호된 회원 공간
            </div>
          </div>
        </div>
        <div className="auth-aside-bottom">
          <ShieldCheck size={15} /> 검토 후 이용
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-announcement">
          {copy.banner}
        </div>
        <div className="auth-topbar">
          <Link href="/" className="auth-topbar-brand">
            <span className="wordmark-mark">
              <span />
              <span />
              <span />
            </span>
            <span>
              DAON<span className="wordmark-accent">MARKETS</span>
            </span>
          </Link>
          <Link href="/" className="auth-back">
            <ArrowLeft size={15} /> {copy.back}
          </Link>
          <div className="auth-language-switcher" aria-label="Language">
            <Globe2 size={15} />
            {(["en", "ja", "ko"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`auth-language-option ${language === option ? "is-active" : ""}`}
                onClick={() => switchLanguage(option)}
                aria-pressed={language === option}
              >
                {option === "ko" ? "한" : option === "en" ? "EN" : "日"}
              </button>
            ))}
          </div>
        </div>
        <div className="auth-form-wrap auth-signup-wrap">
          <div className="auth-form-heading">
            <div className="eyebrow">
              <span className="eyebrow-line" /> {copy.eyebrow}
            </div>
            <h1>
              {copy.title}
              <br />
              <span>{copy.titleAccent}</span>
            </h1>
            <p>
              {copy.description}
            </p>
          </div>
          <div className="auth-form auth-oauth-form">{renderForm()}</div>
          <div className="auth-switch">
            <span>{copy.existing}</span>
            <button type="button" onClick={() => setLocation("/login")}>
              {copy.action} <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className="auth-footer">
          <span>© 2026 Daonmarkets</span>
          <span>{copy.footer}</span>
        </div>
      </main>
    </div>
  );
}
