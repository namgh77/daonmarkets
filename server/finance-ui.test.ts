import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import type { User } from "../drizzle/schema";

// In-memory UI fixtures only. Never create a live cookie or database row.
const mocks = vi.hoisted(() => ({
  auth: {
    user: null as User | null,
    loading: false,
    error: null as Error | null,
    logout: vi.fn(),
  },
  list: {
    data: { items: [] as unknown[], hasMore: false, page: 1 },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    error: null as Error | null,
  },
  audit: { data: [], isLoading: false, isError: false, error: null },
  deposits: {
    data: [] as unknown[],
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  withdrawals: {
    data: [] as unknown[],
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  listHook: vi.fn(),
  auditHook: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({}),
    admin: {
      finance: {
        list: {
          useQuery: (...args: unknown[]) => {
            mocks.listHook(...args);
            return mocks.list;
          },
        },
        audit: {
          useQuery: (...args: unknown[]) => {
            mocks.auditHook(...args);
            return mocks.audit;
          },
        },
        review: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      },
    },
    finance: {
      deposits: { mine: { useQuery: () => mocks.deposits } },
      withdrawals: { mine: { useQuery: () => mocks.withdrawals } },
    },
  },
}));

import AdminFinance from "../client/src/pages/AdminFinance";
import MemberFinanceHistory from "../client/src/components/MemberFinanceHistory";
import { FinanceStatus } from "../client/src/components/FinanceStatus";

function renderAdmin() {
  return renderToStaticMarkup(
    createElement(Router, {
      ssrPath: "/admin/finance",
      children: createElement(AdminFinance),
    })
  );
}

function user(role: User["role"]): User {
  return {
    id: 7,
    openId: "isolated-ui-fixture",
    role,
    name: "UI test operator",
    email: null,
    loginMethod: "test",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    lastSignedIn: new Date(0),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.user = null;
  mocks.auth.loading = false;
  mocks.auth.error = null;
  mocks.list.isLoading = false;
  mocks.list.isError = false;
  mocks.list.data.items = [];
  mocks.deposits.isLoading = false;
  mocks.deposits.isError = false;
  mocks.deposits.data = [];
  mocks.withdrawals.isLoading = false;
  mocks.withdrawals.isError = false;
  mocks.withdrawals.data = [];
});

describe("finance review UI (isolated mock state)", () => {
  it("shows login state and disables admin queries for a visitor", () => {
    expect(renderAdmin()).toContain("로그인이 필요합니다");
    expect(mocks.listHook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
  });
  it("refuses ordinary members without displaying operator data", () => {
    mocks.auth.user = user("user");
    const html = renderAdmin();
    expect(html).toContain("운영자 전용 화면입니다");
    expect(html).not.toContain("요청 종류");
    expect(mocks.listHook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
    expect(mocks.auditHook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
  });
  it("shows an operator empty state and explicit no-transfer warning", () => {
    mocks.auth.user = user("admin");
    const html = renderAdmin();
    expect(html).toContain("검토 승인 ≠ 입금 확인 또는 출금 완료");
    expect(html).toContain("이 조건에 해당하는 요청이 없습니다");
    expect(mocks.listHook).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20 }),
      expect.objectContaining({ enabled: true })
    );
  });
  it("labels APPROVED as review approval, not a transfer", () => {
    expect(
      renderToStaticMarkup(createElement(FinanceStatus, { status: "APPROVED" }))
    ).toContain("검토 승인 · 송금 아님");
  });
  it("distinguishes history loading from an empty result", () => {
    mocks.deposits.isLoading = true;
    const html = renderToStaticMarkup(createElement(MemberFinanceHistory));
    expect(html).toContain("요청 이력을 불러오는 중");
    expect(html).not.toContain("아직 제출한 입금·출금 요청이 없습니다");
  });
  it("distinguishes a history error from an empty result", () => {
    mocks.withdrawals.isError = true;
    const html = renderToStaticMarkup(createElement(MemberFinanceHistory));
    expect(html).toContain("요청 이력을 불러오지 못했습니다");
    expect(html).not.toContain("아직 제출한 입금·출금 요청이 없습니다");
  });
  it("shows the member-visible review note as escaped text", () => {
    mocks.deposits.data = [
      {
        id: 1,
        amount: "10.00000000",
        asset: "USDT",
        network: "TRC20",
        status: "REJECTED",
        reviewNote: "<script>not executable</script>",
        createdAt: new Date(0),
        updatedAt: new Date(1000),
      },
    ];
    const html = renderToStaticMarkup(createElement(MemberFinanceHistory));
    expect(html).toContain("운영자 공개 처리 사유");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>not executable</script>");
  });
});
