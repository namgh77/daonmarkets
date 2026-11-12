import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  depositRequests,
  financeRequestReviews,
  users,
  withdrawalRequests,
} from "../drizzle/schema";
import { getDb } from "./db";

export type FinanceKind = "deposit" | "withdrawal";
export type FinanceStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
export type FinanceDecision = "APPROVED" | "REJECTED";

export type FinanceListItem = {
  id: number;
  userId: number;
  entrySource: "MEMBER_REQUEST" | "ADMIN_ENTRY";
  recordedBy: number | null;
  memberName: string | null;
  memberEmail: string | null;
  asset: string;
  network: string;
  amount: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  txHash: string | null;
  destinationAddress: string | null;
};

export type FinanceReviewAudit = {
  id: number;
  reviewerId: number;
  reviewerName: string | null;
  fromStatus: "PENDING";
  toStatus: FinanceDecision;
  note: string;
  createdAt: Date;
};

export class FinanceDbUnavailableError extends Error {
  constructor() {
    super("Database is not available");
    this.name = "FinanceDbUnavailableError";
  }
}

export class FinanceRequestNotFoundError extends Error {
  constructor(kind: FinanceKind, id: number) {
    super(`${kind} request ${id} was not found`);
    this.name = "FinanceRequestNotFoundError";
  }
}

export class FinanceRequestConflictError extends Error {
  constructor(kind: FinanceKind, id: number) {
    super(`${kind} request ${id} has already been reviewed`);
    this.name = "FinanceRequestConflictError";
  }
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new FinanceDbUnavailableError();
  return db;
}

function isStatusFilter(
  status: FinanceStatus
): status is Exclude<FinanceStatus, "ALL"> {
  return status !== "ALL";
}

function normalizeListItem(item: FinanceListItem): FinanceListItem {
  return {
    ...item,
    amount: String(item.amount),
  };
}

export async function listFinanceRequests(input: {
  kind: FinanceKind;
  status: FinanceStatus;
  page: number;
  pageSize: number;
}) {
  const db = await requireDb();
  const offset = (input.page - 1) * input.pageSize;

  if (input.kind === "deposit") {
    const rows = await db
      .select({
        id: depositRequests.id,
        userId: depositRequests.userId,
        entrySource: depositRequests.entrySource,
        recordedBy: depositRequests.recordedBy,
        memberName: users.name,
        memberEmail: users.email,
        asset: depositRequests.asset,
        network: depositRequests.network,
        amount: depositRequests.amount,
        status: depositRequests.status,
        reviewNote: depositRequests.reviewNote,
        createdAt: depositRequests.createdAt,
        updatedAt: depositRequests.updatedAt,
        txHash: depositRequests.txHash,
        destinationAddress: sql<string | null>`NULL`,
      })
      .from(depositRequests)
      .leftJoin(users, eq(users.id, depositRequests.userId))
      .where(
        isStatusFilter(input.status)
          ? eq(depositRequests.status, input.status)
          : undefined
      )
      .orderBy(desc(depositRequests.createdAt), desc(depositRequests.id))
      .limit(input.pageSize + 1)
      .offset(offset);

    return rows.map(row => normalizeListItem(row));
  }

  const rows = await db
    .select({
      id: withdrawalRequests.id,
      userId: withdrawalRequests.userId,
      entrySource: sql<"MEMBER_REQUEST">`'MEMBER_REQUEST'`,
      recordedBy: sql<number | null>`NULL`,
      memberName: users.name,
      memberEmail: users.email,
      asset: withdrawalRequests.asset,
      network: withdrawalRequests.network,
      amount: withdrawalRequests.amount,
      status: withdrawalRequests.status,
      reviewNote: withdrawalRequests.reviewNote,
      createdAt: withdrawalRequests.createdAt,
      updatedAt: withdrawalRequests.updatedAt,
      txHash: sql<string | null>`NULL`,
      destinationAddress: withdrawalRequests.destinationAddress,
    })
    .from(withdrawalRequests)
    .leftJoin(users, eq(users.id, withdrawalRequests.userId))
    .where(
      isStatusFilter(input.status)
        ? eq(withdrawalRequests.status, input.status)
        : undefined
    )
    .orderBy(desc(withdrawalRequests.createdAt), desc(withdrawalRequests.id))
    .limit(input.pageSize + 1)
    .offset(offset);

  return rows.map(row => normalizeListItem(row));
}

function affectedRows(result: unknown): number {
  if (
    typeof result === "object" &&
    result !== null &&
    "affectedRows" in result
  ) {
    return Number((result as { affectedRows: number }).affectedRows);
  }
  if (
    Array.isArray(result) &&
    result[0] &&
    typeof result[0] === "object" &&
    "affectedRows" in result[0]
  ) {
    return Number((result[0] as { affectedRows: number }).affectedRows);
  }
  return 0;
}

export async function reviewFinanceRequest(input: {
  kind: FinanceKind;
  id: number;
  actorId: number;
  decision: FinanceDecision;
  note: string;
}) {
  const db = await requireDb();

  return db.transaction(async tx => {
    let result: unknown;
    if (input.kind === "deposit") {
      result = await tx
        .update(depositRequests)
        .set({ status: input.decision, reviewNote: input.note })
        .where(
          and(
            eq(depositRequests.id, input.id),
            eq(depositRequests.status, "PENDING")
          )
        );
    } else {
      result = await tx
        .update(withdrawalRequests)
        .set({ status: input.decision, reviewNote: input.note })
        .where(
          and(
            eq(withdrawalRequests.id, input.id),
            eq(withdrawalRequests.status, "PENDING")
          )
        );
    }

    if (affectedRows(result) !== 1) {
      const existing =
        input.kind === "deposit"
          ? await tx
              .select({ id: depositRequests.id })
              .from(depositRequests)
              .where(eq(depositRequests.id, input.id))
              .limit(1)
          : await tx
              .select({ id: withdrawalRequests.id })
              .from(withdrawalRequests)
              .where(eq(withdrawalRequests.id, input.id))
              .limit(1);
      if (existing.length === 0)
        throw new FinanceRequestNotFoundError(input.kind, input.id);
      throw new FinanceRequestConflictError(input.kind, input.id);
    }

    await tx.insert(financeRequestReviews).values({
      kind: input.kind,
      requestId: input.id,
      reviewerId: input.actorId,
      fromStatus: "PENDING",
      toStatus: input.decision,
      note: input.note,
    });

    return { id: input.id, status: input.decision } as const;
  });
}

export async function listFinanceAudit(input: {
  kind: FinanceKind;
  id: number;
}): Promise<FinanceReviewAudit[]> {
  const db = await requireDb();
  const rows = await db
    .select({
      id: financeRequestReviews.id,
      reviewerId: financeRequestReviews.reviewerId,
      reviewerName: users.name,
      fromStatus: financeRequestReviews.fromStatus,
      toStatus: financeRequestReviews.toStatus,
      note: financeRequestReviews.note,
      createdAt: financeRequestReviews.createdAt,
    })
    .from(financeRequestReviews)
    .leftJoin(users, eq(users.id, financeRequestReviews.reviewerId))
    .where(
      and(
        eq(financeRequestReviews.kind, input.kind),
        eq(financeRequestReviews.requestId, input.id)
      )
    )
    .orderBy(
      asc(financeRequestReviews.createdAt),
      asc(financeRequestReviews.id)
    );

  return rows as FinanceReviewAudit[];
}

export async function createAdminDepositEntry(input: {
  memberEmail: string;
  amount: string;
  network: "TRC20" | "BEP20";
  txHash?: string;
  note: string;
  actorId: number;
}) {
  const db = await requireDb();
  const member = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.memberEmail.trim().toLowerCase()))
    .limit(1);
  if (!member.length) throw new FinanceRequestNotFoundError("deposit", 0);

  return db.transaction(async tx => {
    const result = await tx.insert(depositRequests).values({
      userId: member[0].id,
      entrySource: "ADMIN_ENTRY",
      recordedBy: input.actorId,
      asset: input.network === "TRC20" ? "USDT" : "BNB",
      amount: input.amount,
      network: input.network,
      txHash: input.txHash || null,
      status: "APPROVED",
      reviewNote: input.note,
    });
    const id = Number(result[0].insertId);
    await tx.insert(financeRequestReviews).values({
      kind: "deposit",
      requestId: id,
      reviewerId: input.actorId,
      fromStatus: "PENDING",
      toStatus: "APPROVED",
      note: `[관리자 직접 기록] ${input.note}`,
    });
    return { id, status: "APPROVED" as const };
  });
}
