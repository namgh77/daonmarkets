import { useSignIn } from "@clerk/react";
import {
  ArrowLeft,
  ArrowRight,
  Globe2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../_core/hooks/useAuth";
import { getRuntimeAuthConfig, startLogin } from "../const";
import { clerkAppearance } from "../auth-provider";
import PasswordGuidance from "../components/PasswordGuidance";
import {
  authLanguageLabel,
  getAuthLanguage,
  setAuthLanguage,
  type AuthLanguage,
} from "../auth-language";

const loginCopy = {
  ko: {
    banner: "Private member access · Secure email verification",
    back: "홈으로 돌아가기",
    eyebrow: "MEMBER ACCESS",
    title: "회원 공간에",
    titleAccent: "로그인하세요.",
    description: "이메일 주소로 본인을 확인한 뒤 보호된 Daonmarkets 회원 서비스에 접속합니다.",
    first: "회원 이용이 처음이신가요?",
    action: "초대 링크로 가입",
    forgot: "비밀번호를 잊으셨나요?",
    footer: "한국어 이메일 인증",
    loading: "안전한 로그인 상태를 확인하고 있습니다…",
  },
  en: {
    banner: "Private member access · Secure email verification",
    back: "Back home",
    eyebrow: "MEMBER ACCESS",
    title: "Sign in to your",
    titleAccent: "member space.",
    description: "Verify your email address to access protected Daonmarkets member services.",
    first: "New to member access?",
    action: "Join with invitation",
    forgot: "Forgot your password?",
    footer: "English email verification",
    loading: "Checking your secure login status…",
  },
  ja: {
    banner: "Private member access · Secure email verification",
    back: "ホームへ戻る",
    eyebrow: "MEMBER ACCESS",
    title: "会員スペースに",
    titleAccent: "ログインしてください。",
    description: "メールアドレスを確認して、保護されたDaonmarkets会員サービスへアクセスします。",
    first: "会員アクセスが初めてですか？",
    action: "招待リンクで参加",
    forgot: "パスワードをお忘れですか？",
    footer: "日本語メール認証",
    loading: "安全なログイン状態を確認しています…",
  },
} as const;


function EmailPasswordLogin({ onError }: { onError: (message: string) => void }) {
  const { signIn } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verificationMode, setVerificationMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signIn || submitting) return;
    setSubmitting(true);
    onError("");
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.error) {
        onError(result.error.message || "이메일 또는 비밀번호를 확인해 주세요.");
        return;
      }
      if (
        signIn.status === "needs_first_factor" ||
        signIn.status === "needs_second_factor" ||
        signIn.status === "needs_client_trust"
      ) {
        const emailFactor = [
          ...(signIn.supportedFirstFactors ?? []),
          ...(signIn.supportedSecondFactors ?? []),
        ].find(
          factor => factor.strategy === "email_code"
        );
        if (!emailFactor) {
          onError("이메일 인증 방법을 준비하지 못했습니다. 운영자에게 문의해 주세요.");
          return;
        }
        const prepared = await signIn.emailCode.sendCode();
        if (prepared.error) {
          onError(prepared.error.message || "이메일 인증번호를 보내지 못했습니다.");
          return;
        }
        setVerificationMode(true);
        onError("인증번호를 이메일로 보냈습니다. 아래 입력칸에 받은 번호를 입력해 주세요.");
        return;
      }
      if (signIn.status !== "complete") {
        onError("추가 인증이 필요합니다. 이메일 인증 설정을 확인해 주세요.");
        return;
      }
      const finalized = await signIn.finalize();
      if (finalized.error) onError(finalized.error.message || "로그인을 완료하지 못했습니다.");
      else window.location.assign("/member/services");
    } catch (error) {
      onError(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };
  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signIn || submitting) return;
    setSubmitting(true);
    onError("");
    try {
      const result = await signIn.emailCode.verifyCode({ code });
      if (result.error) {
        onError(result.error.message || "인증번호가 올바르지 않습니다.");
        return;
      }
      if (signIn.status !== "complete") {
        onError("인증이 완료되지 않았습니다. 받은 인증번호를 다시 확인해 주세요.");
        return;
      }
      const finalized = await signIn.finalize();
      if (finalized.error) onError(finalized.error.message || "로그인을 완료하지 못했습니다.");
      else window.location.assign("/member/services");
    } catch (error) {
      onError(error instanceof Error ? error.message : "이메일 인증에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };
  if (verificationMode) {
    return (
      <form className="email-auth-form" onSubmit={verify}>
        <label htmlFor="login-code">이메일 인증번호</label>
        <input
          id="login-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="이메일로 받은 인증번호"
          value={code}
          onChange={event => setCode(event.target.value)}
          required
        />
        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? "확인 중…" : "이메일 인증"} <ArrowRight size={17} />
        </button>
      </form>
    );
  }
  return (
    <form className="email-auth-form" onSubmit={submit}>
      <label htmlFor="login-email">이메일</label>
      <input id="login-email" type="email" autoComplete="email" placeholder="이메일 주소를 입력하세요" value={email} onChange={event => setEmail(event.target.value)} required />
      <label htmlFor="login-password">비밀번호</label>
      <div className="auth-input-wrap">
        <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="비밀번호를 입력하세요" value={password} onChange={event => setPassword(event.target.value)} required />
        <button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? "숨김" : "보기"}</button>
      </div>
      <PasswordGuidance password={password} />
      <button className="auth-submit" type="submit" disabled={submitting || !signIn}>
        {submitting ? "확인 중…" : "로그인"} <ArrowRight size={17} />
      </button>
    </form>
  );
}

type NoticeProps = {
  children: React.ReactNode;
  error?: boolean;
};

function Notice({ children, error = false }: NoticeProps) {
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

export default function Login() {
  const [notice, setNotice] = useState("");
  const [language, setLanguage] = useState<AuthLanguage>(getAuthLanguage);
  const [, setLocation] = useLocation();
  const auth = useAuth();
  const config = getRuntimeAuthConfig();
  const isClerk = config.provider === "clerk";
  const copy = loginCopy[language];

  const switchLanguage = (next: AuthLanguage) => {
    if (next === language) return;
    setAuthLanguage(next);
    setLanguage(next);
    window.location.reload();
  };

  const handleManusLogin = () => {
    try {
      startLogin();
    } catch {
      setNotice(
        "Manus 로그인을 현재 사용할 수 없습니다. 구성 상태를 확인해 주세요."
      );
    }
  };

  const renderForm = () => {
    if (isClerk && !config.configured) {
      return (
        <div className="auth-preparation" role="status">
          <strong>이메일 로그인 준비 중입니다.</strong>
          <span>
            Clerk 공개 키와 이메일 인증 설정이 아직 연결되지 않았습니다. 준비가
            완료되면 이 화면에서 바로 로그인할 수 있습니다.
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
              세션이 만료되었거나 서버에서 회원 정보를 불러오지 못했습니다.
              로그인 상태를 유지한 채 다시 시도해 주세요.
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
              이미 로그인되어 있습니다.{" "}
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
          <EmailPasswordLogin onError={setNotice} />
          <Link href="/forgot-password" className="auth-forgot-custom">{copy.forgot}</Link>
        </>
      );
    }

    if (!config.configured) {
      return (
        <div className="auth-preparation auth-provider-error" role="status">
          <strong>Manus 로그인이 구성되지 않았습니다.</strong>
          <span>
            운영자가 Manus 인증 설정을 연결한 뒤 로그인할 수 있습니다.
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
            이미 로그인되어 있습니다.{" "}
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
        {notice && <Notice error>{notice}</Notice>}
        <button
          className="auth-submit"
          type="button"
          onClick={handleManusLogin}
        >
          Manus 계정으로 계속 <ArrowRight size={17} />
        </button>
        <p className="auth-note">
          Manus가 명시적으로 선택된 환경에서만 안전한 계정 페이지로 이동합니다.
          Daonmarkets는 비밀번호를 저장하지 않습니다.
        </p>
      </>
    );
  };

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
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
          <span className="auth-code">DM / 01</span>
        </div>
        <div className="auth-aside-content">
          <div className="eyebrow eyebrow-light">
            <span className="eyebrow-line" /> MEMBER ACCESS
          </div>
          <h2>
            계정 활동을,
            <br />
            <em>한눈에.</em>
          </h2>
          <p>검토된 회원 공간에서 필요한 정보와 요청을 안전하게 관리하세요.</p>
          <div className="auth-geometry">
            <div className="auth-geometry-line" />
            <div className="auth-geometry-dot" />
            <div className="auth-geometry-label">
              APPROVED
              <br />
              ACCESS
            </div>
          </div>
        </div>
        <div className="auth-aside-bottom">
          <ShieldCheck size={15} /> 안전한 회원 접근
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
        <div className="auth-form-wrap">
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
            <span>{copy.first}</span>
            <button type="button" onClick={() => setLocation("/signup")}>
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
