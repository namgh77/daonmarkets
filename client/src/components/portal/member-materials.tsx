import { BookOpen, Download, LockKeyhole, RotateCw, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { AccessStatus } from "./access-types";

type MemberMaterialsProps = {
  isAuthenticated: boolean;
  active: boolean;
  isAdmin: boolean;
  accessStatus: AccessStatus | null | undefined;
  accessLoading: boolean;
  accessError: boolean;
};

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function MemberMaterials({
  isAuthenticated,
  active,
  isAdmin,
  accessStatus,
  accessLoading,
  accessError,
}: MemberMaterialsProps) {
  const canView = isAdmin || accessStatus === "APPROVED";
  const materials = trpc.portal.materials.list.useQuery(undefined, {
    enabled: isAuthenticated && active && canView,
    retry: false,
  });

  return (
    <section className="portal-panel" aria-labelledby="materials-heading">
      <div className="portal-panel-heading">
        <div>
          <span className="portal-kicker">03 / MATERIALS</span>
          <h2 id="materials-heading">자료실</h2>
        </div>
        <BookOpen size={21} className="portal-heading-icon" />
      </div>
      <p className="portal-panel-lede">
        승인된 회원과 운영자에게만 게시된 자료를 제공합니다. 자료 내용은 이
        보호된 화면 안에서만 열람할 수 있습니다.
      </p>
      {!active && (
        <div className="portal-tab-hint">
          자료실 탭을 선택하면 이용 권한을 확인합니다.
        </div>
      )}
      {active && accessLoading && !isAdmin && (
        <div className="portal-state">
          <span className="portal-spinner" /> 이용 승인 상태를 확인하는 중…
        </div>
      )}
      {active && accessError && !isAdmin && (
        <div className="portal-state portal-state-error" role="alert">
          <ShieldAlert size={18} />
          <div>
            <strong>자료 이용 권한을 확인하지 못했습니다.</strong>
            <p>권한 확인 전에는 자료 내용을 불러오지 않습니다.</p>
          </div>
        </div>
      )}
      {active && !accessLoading && !accessError && !canView && (
        <div className="portal-restricted">
          <LockKeyhole size={24} />
          <strong>승인 회원 전용 자료실입니다.</strong>
          <p>초대 가입에 대한 관리자 회원 승인이 완료되면 게시된 자료를 열람할 수 있습니다.</p>
        </div>
      )}
      {active && canView && materials.isLoading && (
        <div className="portal-list-state">
          <span className="portal-spinner" /> 자료를 불러오는 중…
        </div>
      )}
      {active && canView && materials.isError && (
        <div className="portal-state portal-state-error" role="alert">
          <ShieldAlert size={18} />
          <div>
            <strong>자료를 불러오지 못했습니다.</strong>
            <button
              type="button"
              className="portal-text-button"
              onClick={() => materials.refetch()}
            >
              <RotateCw size={14} /> 다시 시도
            </button>
          </div>
        </div>
      )}
      {active &&
        canView &&
        materials.isSuccess &&
        materials.data.length === 0 && (
          <div className="portal-empty">
            <BookOpen size={20} />
            <strong>게시된 자료가 없습니다.</strong>
            <p>운영자가 자료를 게시하면 이곳에서 확인할 수 있습니다.</p>
          </div>
        )}
      {active &&
        canView &&
        materials.isSuccess &&
        materials.data.length > 0 && (
          <div className="portal-material-list">
            {materials.data.map(material => (
              <article className="portal-material-card" key={material.id}>
                <div className="portal-material-top">
                  <span className="portal-material-index">
                    MATERIAL / {String(material.id).padStart(2, "0")}
                  </span>
                  <time dateTime={new Date(material.createdAt).toISOString()}>
                    {formatDate(material.createdAt)}
                  </time>
                </div>
                <h3>{material.title}</h3>
                <p>{material.body}</p>
                {material.attachmentUrl && material.attachmentName && (
                  <a
                    className="portal-attachment-link"
                    href={material.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={material.attachmentName}
                  >
                    <Download size={14} /> {material.attachmentName}
                  </a>
                )}
                <span className="portal-material-updated">
                  업데이트 {formatDate(material.updatedAt)}
                </span>
              </article>
            ))}
          </div>
        )}
    </section>
  );
}
