import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as User | null,
    loading: false,
    error: null,
    logout: vi.fn(),
  },
  summary: {
    data: null as null | {
      pendingApplications: number;
      openTickets: number;
      pendingDeposits: number;
      pendingWithdrawals: number;
      announcements: number;
      materials: number;
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  applications: {
    data: { items: [] as unknown[], hasMore: false, page: 1 },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    error: { message: "isolated test failure" },
  },
  summaryHook: vi.fn(),
  applicationsHook: vi.fn(),
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({}),
    admin: {
      portal: {
        summary: {
          useQuery: (...args: unknown[]) => {
            mocks.summaryHook(...args);
            return mocks.summary;
          },
        },
        access: {
          list: {
            useQuery: (...args: unknown[]) => {
              mocks.applicationsHook(...args);
              return mocks.applications;
            },
          },
          review: {
            useMutation: () => ({ isPending: false, mutate: vi.fn() }),
          },
        },
      },
    },
  },
}));
import AdminPortal from "../client/src/pages/AdminPortal";

function render() {
  return renderToStaticMarkup(
    createElement(Router, {
      ssrPath: "/admin",
      children: createElement(AdminPortal),
    })
  );
}
function member(role: User["role"]): User {
  return {
    id: 99,
    openId: "isolated-portal-test",
    name: "isolated operator",
    email: null,
    loginMethod: "test",
    role,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    lastSignedIn: new Date(0),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.user = null;
  mocks.auth.loading = false;
  mocks.summary.data = null;
  mocks.summary.isLoading = false;
  mocks.summary.isError = false;
  mocks.applications.data.items = [];
  mocks.applications.isLoading = false;
  mocks.applications.isError = false;
});

describe("operations home isolated UI", () => {
  it("does not query admin data or render management for visitors", () => {
    expect(render()).toContain("로그인이 필요합니다");
    expect(mocks.summaryHook).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ enabled: false })
    );
    expect(mocks.applicationsHook).not.toHaveBeenCalled();
  });
  it("does not turn a regular member into an operator", () => {
    mocks.auth.user = member("user");
    const html = render();
    expect(html).toContain("운영자 전용 화면입니다");
    expect(html).not.toContain("공지 관리");
    expect(mocks.applicationsHook).not.toHaveBeenCalled();
  });
  it("uses unavailable marks until genuine summary data arrives", () => {
    mocks.auth.user = member("admin");
    mocks.summary.isLoading = true;
    const html = render();
    expect(html).toContain("현재 처리 건수를 확인 중");
    expect(html).toContain("<strong>—</strong>");
  });
  it("shows returned summary counts and a truly empty application result", () => {
    mocks.auth.user = member("admin");
    mocks.summary.data = {
      pendingApplications: 7,
      openTickets: 3,
      pendingDeposits: 2,
      pendingWithdrawals: 1,
      announcements: 0,
      materials: 0,
    };
    const html = render();
    expect(html).toContain("<strong>7</strong>");
    expect(html).toContain("<strong>3</strong>");
    expect(html).toContain("해당 조건의 신청이 없습니다");
    expect(html).toContain('href="/admin/finance"');
  });
  it("does not disguise failed queries as empty results", () => {
    mocks.auth.user = member("admin");
    mocks.summary.isError = true;
    mocks.applications.isError = true;
    const html = render();
    expect(html).toContain("미처리 건수를 불러오지 못했습니다");
    expect(html).toContain("조회에 실패했습니다");
    expect(html).not.toContain("해당 조건의 신청이 없습니다");
  });
  it("escapes member-controlled names in operator records", () => {
    mocks.auth.user = member("admin");
    mocks.applications.data.items = [
      {
        id: 1,
        userId: 7,
        memberName: "<script>not executable</script>",
        memberEmail: null,
        message: "Isolated application",
        status: "PENDING",
        reviewNote: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
    ];
    const html = render();
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>not executable</script>");
  });
});
