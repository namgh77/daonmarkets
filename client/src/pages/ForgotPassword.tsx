import { useSignIn } from "@clerk/react";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { getAuthLanguage, type AuthLanguage } from "../auth-language";
import { getRuntimeAuthConfig } from "../const";
import PasswordGuidance from "../components/PasswordGuidance";
import { isStrongEnoughPassword, MIN_PASSWORD_LENGTH } from "../password-policy";

const copy = {
  ko: {
    back: "로그인으로 돌아가기",
    title: "비밀번호를",
    accent: "다시 설정하세요.",
    description: "가입한 이메일로 인증 코드를 보내 새 비밀번호를 설정합니다.",
    email: "가입한 이메일 주소",
    emailPlaceholder: "이메일 주소를 입력하세요",
    send: "인증 코드 보내기",
    code: "이메일 인증 코드",
    codePlaceholder: "이메일로 받은 코드를 입력하세요",
    verify: "코드 확인",
    password: "새 비밀번호",
    passwordPlaceholder: "새 비밀번호를 입력하세요",
    save: "새 비밀번호 저장",
    sent: "인증 코드를 이메일로 보냈습니다. 받은편지함과 스팸함을 확인해 주세요.",
    done: "비밀번호가 변경되었습니다. 로그인 화면에서 새 비밀번호로 로그인하세요.",
    unavailable: "이메일 인증 설정을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    error: "요청을 처리하지 못했습니다. 이메일 주소와 인증 코드를 확인해 주세요.",
  },
  en: {
    back: "Back to login",
    title: "Reset your",
    accent: "password.",
    description: "We will send a verification code to your account email.",
    email: "Account email",
    emailPlaceholder: "Enter your email address",
    send: "Send verification code",
    code: "Email verification code",
    codePlaceholder: "Enter the code from your email",
    verify: "Verify code",
    password: "New password",
    passwordPlaceholder: "Enter a new password",
    save: "Save new password",
    sent: "A verification code was sent. Check your inbox and spam folder.",
    done: "Your password was changed. Sign in with the new password.",
    unavailable: "Email verification is not available. Please try again later.",
    error: "We could not complete the request. Check your email and code.",
  },
  ja: {
    back: "ログインに戻る",
    title: "パスワードを",
    accent: "再設定してください。",
    description: "登録したメールアドレスに確認コードを送信します。",
    email: "登録メールアドレス",
    emailPlaceholder: "メールアドレスを入力してください",
    send: "確認コードを送信",
    code: "メール確認コード",
    codePlaceholder: "メールに届いたコードを入力してください",
    verify: "コードを確認",
    password: "新しいパスワード",
    passwordPlaceholder: "新しいパスワードを入力してください",
    save: "新しいパスワードを保存",
    sent: "確認コードを送信しました。受信箱と迷惑メールを確認してください。",
    done: "パスワードを変更しました。新しいパスワードでログインしてください。",
    unavailable: "メール確認を利用できません。後でもう一度お試しください。",
    error: "処理できませんでした。メールアドレスとコードを確認してください。",
  },
} as const;

export default function ForgotPassword() {
  const { signIn, fetchStatus } = useSignIn();
  const [, setLocation] = useLocation();
  const [language] = useState<AuthLanguage>(getAuthLanguage);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "code" | "password" | "done">("email");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const config = getRuntimeAuthConfig();
  const text = copy[language];

  const run = async (event: FormEvent, action: () => Promise<void>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await action();
    } catch {
      setError(text.error);
    }
  };

  const sendCode = (event: FormEvent) =>
    run(event, async () => {
      if (!signIn) throw new Error("not-ready");
      const created = await signIn.create({ identifier: email.trim() });
      if (created.error) throw created.error;
      const sent = await signIn.resetPasswordEmailCode.sendCode();
      if (sent.error) throw sent.error;
      setStep("code");
      setMessage(text.sent);
    });

  const verifyCode = (event: FormEvent) =>
    run(event, async () => {
      if (!signIn) throw new Error("not-ready");
      const verified = await signIn.resetPasswordEmailCode.verifyCode({
        code: code.trim(),
      });
      if (verified.error) throw verified.error;
      setStep("password");
    });

  const savePassword = (event: FormEvent) =>
    run(event, async () => {
      if (!signIn) throw new Error("not-ready");
      if (!isStrongEnoughPassword(password)) {
        throw new Error(`비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자이며 대문자·소문자·숫자·특수문자를 모두 포함해야 합니다.`);
      }
      const submitted = await signIn.resetPasswordEmailCode.submitPassword({
        password,
        signOutOfOtherSessions: true,
      });
      if (submitted.error) throw submitted.error;
      if (signIn.status === "complete") await signIn.finalize();
      setStep("done");
      setMessage(text.done);
    });

  return (
    <main className="password-reset-page">
      <div className="password-reset-topbar">
        <Link href="/login" className="auth-back">
          <ArrowLeft size={15} /> {text.back}
        </Link>
        <span className="password-reset-brand">DAON<span>MARKETS</span></span>
      </div>
      <section className="password-reset-card" aria-labelledby="password-reset-title">
        <div className="password-reset-icon"><LockKeyhole size={20} /></div>
        <h1 id="password-reset-title"><span>{text.title}</span><em>{text.accent}</em></h1>
        <p>{text.description}</p>
        {!config.configured ? (
          <div className="auth-notice auth-notice-error">{text.unavailable}</div>
        ) : step === "done" ? (
          <>
            <div className="auth-notice">{message}</div>
            <button className="auth-submit" type="button" onClick={() => setLocation("/login")}>
              {text.back} <ArrowRight size={17} />
            </button>
          </>
        ) : (
          <>
            {message && <div className="auth-notice">{message}</div>}
            {error && <div className="auth-notice auth-notice-error">{error}</div>}
            {step === "email" && (
              <form className="password-reset-form" onSubmit={sendCode}>
                <label>{text.email}<input type="email" required value={email} placeholder={text.emailPlaceholder} onChange={event => setEmail(event.target.value)} /></label>
                <button className="auth-submit" type="submit" disabled={fetchStatus === "fetching"}>{text.send} <ArrowRight size={17} /></button>
              </form>
            )}
            {step === "code" && (
              <form className="password-reset-form" onSubmit={verifyCode}>
                <label>{text.code}<input required inputMode="numeric" value={code} placeholder={text.codePlaceholder} onChange={event => setCode(event.target.value)} /></label>
                <button className="auth-submit" type="submit" disabled={fetchStatus === "fetching"}>{text.verify} <ArrowRight size={17} /></button>
              </form>
            )}
            {step === "password" && (
              <form className="password-reset-form" onSubmit={savePassword}>
                <label>{text.password}<input required minLength={MIN_PASSWORD_LENGTH} type="password" value={password} placeholder={`최소 ${MIN_PASSWORD_LENGTH}자 입력하세요`} onChange={event => setPassword(event.target.value)} /></label>
                <PasswordGuidance password={password} />
                <button className="auth-submit" type="submit" disabled={fetchStatus === "fetching"}>{text.save} <ArrowRight size={17} /></button>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
