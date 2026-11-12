export type AuthLanguage = "ko" | "en" | "ja";

const LANGUAGE_KEY = "daonmarkets-language";

export function getAuthLanguage(): AuthLanguage {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    if (saved === "ko" || saved === "en" || saved === "ja") return saved;
  } catch {
    // Use Korean when storage is unavailable.
  }
  return "ko";
}

export function setAuthLanguage(language: AuthLanguage) {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // The page still changes after a storage failure.
  }
}

export function nextAuthLanguage(language: AuthLanguage): AuthLanguage {
  return language === "en" ? "ja" : language === "ja" ? "ko" : "en";
}

export const authLanguageLabel: Record<AuthLanguage, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};
