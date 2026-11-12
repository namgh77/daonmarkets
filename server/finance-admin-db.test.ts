import { describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  db: null as unknown,
}));

vi.mock("./db", () => ({
  getDb: vi.fn(async () => harness.db),
}));

import {
  FinanceRequestConflictError,
  FinanceRequestNotFoundError,
  reviewFinanceRequest,
} from "./finance-admin-db";

type HarnessState = {
  affectedRows: number;
  existingRows: Array<{ id: number }>;
  auditValues: unknown[];
  rolledBack: boolean;
};

function makeFakeDb(options: {
  affectedRows: number;
  existingRows?: Array<{ id: number }>;
  insertError?: Error;
}) {
  const state: HarnessState = {
    affectedRows: options.affectedRows,
    existingRows: options.existingRows ?? [],
    auditValues: [],
    rolledBack: false,
  };

  const tx = {
    update: () => ({
      set: () => ({
        where: async () => ({ affectedRows: state.affectedRows }),
      }),
    }),
    select: () => {
      const chain: Record<string, unknown> = {};
      chain.from = () => chain;
      chain.where = () => chain;
      chain.limit = async () => state.existingRows;
      return chain;
    },
    insert: () => ({
      values: async (values: unknown) => {
        state.auditValues.push(values);
        if (options.insertError) throw options.insertError;
        return [{ affectedRows: 1 }];
      },
    }),
  };

  harness.db = {
    transaction: async (
      callback: (transaction: typeof tx) => Promise<unknown>
    ) => {
      try {
        return await callback(tx);
      } catch (error) {
        state.rolledBack = true;
        throw error;
      }
    },
  };

  return state;
}

describe("finance admin transaction guard", () => {
  it("updates a pending request and writes the actor audit record atomically", async () => {
    const state = makeFakeDb({ affectedRows: 1 });
    await expect(
      reviewFinanceRequest({
        kind: "deposit",
        id: 10,
        actorId: 900,
        decision: "APPROVED",
        note: "Checked manually",
      })
    ).resolves.toEqual({ id: 10, status: "APPROVED" });
    expect(state.auditValues).toEqual([
      {
        kind: "deposit",
        requestId: 10,
        reviewerId: 900,
        fromStatus: "PENDING",
        toStatus: "APPROVED",
        note: "Checked manually",
      },
    ]);
    expect(state.rolledBack).toBe(false);
  });

  it("classifies a zero-row update as not found when the request is absent", async () => {
    const state = makeFakeDb({ affectedRows: 0 });
    await expect(
      reviewFinanceRequest({
        kind: "withdrawal",
        id: 99,
        actorId: 900,
        decision: "REJECTED",
        note: "Not present",
      })
    ).rejects.toBeInstanceOf(FinanceRequestNotFoundError);
    expect(state.auditValues).toHaveLength(0);
    expect(state.rolledBack).toBe(true);
  });

  it("classifies a zero-row conditional update as conflict and never inserts a second audit", async () => {
    const state = makeFakeDb({ affectedRows: 0, existingRows: [{ id: 10 }] });
    await expect(
      reviewFinanceRequest({
        kind: "deposit",
        id: 10,
        actorId: 901,
        decision: "REJECTED",
        note: "Second attempt",
      })
    ).rejects.toBeInstanceOf(FinanceRequestConflictError);
    expect(state.auditValues).toHaveLength(0);
    expect(state.rolledBack).toBe(true);
  });

  it("rolls back when the audit insert fails after the status update", async () => {
    const state = makeFakeDb({
      affectedRows: 1,
      insertError: new Error("audit insert failed"),
    });
    await expect(
      reviewFinanceRequest({
        kind: "deposit",
        id: 10,
        actorId: 900,
        decision: "APPROVED",
        note: "Checked manually",
      })
    ).rejects.toThrow("audit insert failed");
    expect(state.auditValues).toHaveLength(1);
    expect(state.rolledBack).toBe(true);
  });
});
