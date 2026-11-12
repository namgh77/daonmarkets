import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import "../pwa.css";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    window.addEventListener("appinstalled", () => setInstallEvent(null));
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  if (!installEvent || dismissed) return null;

  const install = async () => {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
  };

  return (
    <aside className="pwa-install-prompt" role="status">
      <Download size={18} />
      <div>
        <strong>Daonmarkets를 앱처럼 설치하세요</strong>
        <p>휴대폰 홈 화면에서 회원 서비스를 바로 열 수 있습니다.</p>
      </div>
      <button type="button" onClick={() => void install}>설치</button>
      <button className="pwa-install-dismiss" type="button" aria-label="설치 안내 닫기" onClick={() => setDismissed(true)}><X size={16} /></button>
    </aside>
  );
}
