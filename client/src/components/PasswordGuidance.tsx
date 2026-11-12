import { Check, Circle } from "lucide-react";
import { getPasswordChecks, getPasswordStrength } from "../password-policy";

export default function PasswordGuidance({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  return (
    <div className="password-guidance" aria-live="polite">
      <div className={`password-strength password-strength-${strength.tone}`}>
        비밀번호 강도: <strong>{strength.label}</strong>
      </div>
      <div className="password-rules">
        {getPasswordChecks(password).map(rule => (
          <span className={rule.passed ? "is-passed" : ""} key={rule.label}>
            {rule.passed ? <Check size={12} /> : <Circle size={10} />} {rule.label}
          </span>
        ))}
      </div>
      <small>최소 12자 이상, 대문자·소문자·숫자·특수문자를 조합하세요.</small>
    </div>
  );
}
