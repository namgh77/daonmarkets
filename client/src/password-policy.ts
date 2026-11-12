export const MIN_PASSWORD_LENGTH = 12;

export type PasswordCheck = {
  label: string;
  passed: boolean;
};

export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: `최소 ${MIN_PASSWORD_LENGTH}자`, passed: password.length >= MIN_PASSWORD_LENGTH },
    { label: "영문 대문자 포함", passed: /[A-Z]/.test(password) },
    { label: "영문 소문자 포함", passed: /[a-z]/.test(password) },
    { label: "숫자 포함", passed: /\d/.test(password) },
    { label: "특수문자 포함", passed: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isStrongEnoughPassword(password: string) {
  return getPasswordChecks(password).every(check => check.passed);
}

export function getPasswordStrength(password: string) {
  if (!password) return { label: "입력 대기", tone: "empty" as const };
  const passed = getPasswordChecks(password).filter(check => check.passed).length;
  if (passed <= 2) return { label: "약함", tone: "weak" as const };
  if (passed < 5) return { label: "보통", tone: "medium" as const };
  return { label: "강함", tone: "strong" as const };
}
