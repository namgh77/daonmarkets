import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { depositInputSchema, withdrawalInputSchema } from "../shared/finance";

const mocks = vi.hoisted(() => ({
  listFinanceRequests: vi.fn(),
  reviewFinanceRequest: vi.fn(),
  listFinanceAudit: vi.fn(),
  createDepositRequest: vi.fn(),
  createWithdrawalRequest: vi.fn(),
}));

vi.mock("./finance-admin-db", () => {
  class FinanceDbUnavailableError extends Error {}
  class FinanceRequestNotFoundError extends Error {}
  class FinanceRequestConflictError extends Error {}
  return {
    FinanceDbUnavailableError,
    FinanceRequestNotFoundError,
    FinanceRequestConflictError,
    listFinanceRequests: mocks.listFinanceRequests,
    reviewFinanceRequest: mocks.reviewFinanceRequest,
    listFinanceAudit: mocks.listFinanceAudit,
  };
});

vi.mock("./db", () => ({
  createDepositRequest: mocks.createDepositRequest,
  createWithdrawalRequest: mocks.createWithdrawalRequest,
  listDepositRequests: vi.fn(),
  listWithdrawalRequests: vi.fn(),
}));

import { appRouter } from "./routers";
import {
  FinanceDbUnavailableError,
  FinanceRequestConflictError,
  FinanceRequestNotFoundError,
} from "./finance-admin-db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(role: User["role"], id = 41): AuthenticatedUser {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id,
    openId: `test-${id}`,
    email: `${id}@example.com`,
    name: `Member ${id}`,
    loginMethod: "manus",
    role,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

function makeContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const sampleItem = {
  id: 7,
  userId: 41,
  memberName: "Member 41",
  memberEmail: "41@example.com",
  asset: "USDT",
  network: "TRC20",
  amount: "12.50",
  status: "PENDING" as const,
  reviewNote: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  txHash: null,
  destinationAddress: null,
};

describe("admin.finance API", () => {
  beforeEach(() => {
    mocks.listFinanceRequests.mockResolvedValue([sampleItem]);
    mocks.reviewFinanceRequest.mockResolvedValue({ id: 7, status: "APPROVED" });
    mocks.listFinanceAudit.mockResolvedValue([]);
    mocks.createDepositRequest.mockResolvedValue(7);
    mocks.createWithdrawalRequest.mockResolvedValue(8);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [
      "list",
      (caller: ReturnType<typeof appRouter.createCaller>) =>
        caller.admin.finance.list({ kind: "deposit" }),
    ],
    [
      "review",
      (caller: ReturnType<typeof appRouter.createCaller>) =>
        caller.admin.finance.review({
          kind: "deposit",
          id: 7,
          decision: "APPROVED",
          note: "Review okay",
        }),
    ],
    [
      "audit",
      (caller: ReturnType<typeof appRouter.createCaller>) =>
        caller.admin.finance.audit({ kind: "deposit", id: 7 }),
    ],
  ])("returns 401 for unauthenticated %s", async (_name, call) => {
    await expect(
      call(appRouter.createCaller(makeContext(null)))
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each([
    [
      "list",
      (caller: ReturnType<typeof appRouter.createCaller>) =>
        caller.admin.finance.list({ kind: "deposit" }),
    ],
    [
      "review",
      (caller: ReturnType<typeof appRouter.createCaller>) =>
        caller.admin.finance.review({
          kind: "deposit",
          id: 7,
          decision: "APPROVED",
          note: "Review okay",
        }),
    ],
    [
      "audit",
      (caller: ReturnType<typeof appRouter.createCaller>) =>
        caller.admin.finance.audit({ kind: "deposit", id: 7 }),
    ],
  ])("returns 403 for authenticated non-admin %s", async (_name, call) => {
    await expect(
      call(appRouter.createCaller(makeContext(makeUser("user"))))
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admins to list with defaults and returns the contract shape", async () => {
    const caller = appRouter.createCaller(makeContext(makeUser("admin")));
    const result = await caller.admin.finance.list({ kind: "deposit" });
    expect(result).toEqual({ items: [sampleItem], hasMore: false, page: 1 });
    expect(mocks.listFinanceRequests).toHaveBeenCalledWith({
      kind: "deposit",
      status: "ALL",
      page: 1,
      pageSize: 20,
    });
    await expect(
      caller.admin.finance.audit({ kind: "deposit", id: 7 })
    ).resolves.toEqual([]);
    expect(mocks.listFinanceAudit).toHaveBeenCalledWith({
      kind: "deposit",
      id: 7,
    });
  });

  it("uses only the authenticated admin actor and trims the review note", async () => {
    const result = await appRouter
      .createCaller(makeContext(makeUser("admin", 900)))
      .admin.finance.review({
        kind: "withdrawal",
        id: 8,
        decision: "REJECTED",
        note: "  Invalid destination  ",
      });
    expect(result).toEqual({ id: 7, status: "APPROVED" });
    expect(mocks.reviewFinanceRequest).toHaveBeenCalledWith({
      kind: "withdrawal",
      id: 8,
      decision: "REJECTED",
      note: "Invalid destination",
      actorId: 900,
    });
  });

  it("rejects unknown admin fields, invalid status, and short notes", async () => {
    const caller = appRouter.createCaller(makeContext(makeUser("admin")));
    await expect(
      caller.admin.finance.list({ kind: "deposit", status: "UNKNOWN" as never })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.admin.finance.list({ kind: "deposit", extra: true } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.admin.finance.review({
        kind: "deposit",
        id: 7,
        decision: "APPROVED",
        note: "no",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.admin.finance.review({
        kind: "deposit",
        id: 7,
        decision: "APPROVED",
        note: "valid note",
        actorId: 1,
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects member attempts to supply status or userId and binds valid creates to ctx.user.id", async () => {
    const caller = appRouter.createCaller(makeContext(makeUser("user", 123)));
    await expect(
      caller.finance.deposits.create({
        amount: "1",
        network: "TRC20",
        status: "APPROVED",
        userId: 999,
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await caller.finance.deposits.create({
      amount: " 1.25000000 ",
      network: "TRC20",
      txHash: "",
    });
    expect(mocks.createDepositRequest).toHaveBeenCalledWith({
      userId: 123,
      amount: "1.25000000",
      network: "TRC20",
      txHash: undefined,
    });
  });

  it("maps not-found, concurrent-review conflict, and unavailable database errors", async () => {
    const caller = appRouter.createCaller(makeContext(makeUser("admin")));

    mocks.reviewFinanceRequest.mockRejectedValueOnce(
      new FinanceRequestNotFoundError("deposit", 999)
    );
    await expect(
      caller.admin.finance.review({
        kind: "deposit",
        id: 999,
        decision: "APPROVED",
        note: "Review okay",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    mocks.reviewFinanceRequest.mockRejectedValueOnce(
      new FinanceRequestConflictError("deposit", 7)
    );
    await expect(
      caller.admin.finance.review({
        kind: "deposit",
        id: 7,
        decision: "APPROVED",
        note: "Review okay",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });

    mocks.listFinanceRequests.mockRejectedValueOnce(
      new FinanceDbUnavailableError()
    );
    await expect(
      caller.admin.finance.list({ kind: "deposit" })
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Finance database is unavailable",
    });
  });
});

describe("shared finance schemas", () => {
  it("bounds raw amount length before arbitrary-size integer work", () => {
    for (const amount of [
      "0".repeat(100000) + "1",
      "9".repeat(100000),
      "0.000000001",
    ]) {
      expect(
        depositInputSchema.safeParse({ amount, network: "TRC20" }).success
      ).toBe(false);
    }
  });

  it("validates positive decimal strings using decimal precision rather than Number", () => {
    expect(
      depositInputSchema.safeParse({
        amount: " 123456789012.12345678 ",
        network: "TRC20",
      }).success
    ).toBe(true);
    for (const amount of [
      "0",
      "0.00000000",
      "-1",
      "+1",
      "1e-8",
      "1234567890123",
      "1.123456789",
      "1.",
    ]) {
      expect(
        depositInputSchema.safeParse({ amount, network: "TRC20" }).success
      ).toBe(false);
    }
  });

  it("enforces network-specific transaction hash formats and normalizes empty hashes", () => {
    const empty = depositInputSchema.parse({
      amount: "1",
      network: "TRC20",
      txHash: "  ",
    });
    expect(empty.txHash).toBeUndefined();
    expect(
      depositInputSchema.safeParse({
        amount: "1",
        network: "TRC20",
        txHash: "a".repeat(64),
      }).success
    ).toBe(true);
    expect(
      depositInputSchema.safeParse({
        amount: "1",
        network: "TRC20",
        txHash: `0x${"a".repeat(64)}`,
      }).success
    ).toBe(false);
    expect(
      depositInputSchema.safeParse({
        amount: "1",
        network: "BEP20",
        txHash: `0x${"a".repeat(64)}`,
      }).success
    ).toBe(true);
    expect(
      depositInputSchema.safeParse({
        amount: "1",
        network: "BEP20",
        txHash: "a".repeat(64),
      }).success
    ).toBe(false);
  });

  it("enforces network-specific wallet address formats", () => {
    expect(
      withdrawalInputSchema.safeParse({
        amount: "1",
        network: "TRC20",
        destinationAddress: `T${"1".repeat(33)}`,
      }).success
    ).toBe(true);
    expect(
      withdrawalInputSchema.safeParse({
        amount: "1",
        network: "BEP20",
        destinationAddress: `0x${"a".repeat(40)}`,
      }).success
    ).toBe(true);
    expect(
      withdrawalInputSchema.safeParse({
        amount: "1",
        network: "TRC20",
        destinationAddress: `0x${"a".repeat(40)}`,
      }).success
    ).toBe(false);
    expect(
      withdrawalInputSchema.safeParse({
        amount: "1",
        network: "BEP20",
        destinationAddress: "T111111111111111111111111111111111",
      }).success
    ).toBe(false);
  });
});
