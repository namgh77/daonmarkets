import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  FinanceDbUnavailableError,
  FinanceRequestConflictError,
  FinanceRequestNotFoundError,
  listFinanceAudit,
  listFinanceRequests,
  createAdminDepositEntry,
  reviewFinanceRequest,
  type FinanceKind,
} from "./finance-admin-db";

export const financeKindSchema = z.enum(["deposit", "withdrawal"]);
export const financeStatusSchema = z.enum([
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
export const financeDecisionSchema = z.enum(["APPROVED", "REJECTED"]);

export const financeListInputSchema = z
  .object({
    kind: financeKindSchema,
    status: financeStatusSchema.default("ALL"),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(20),
  })
  .strict();

export const financeReviewInputSchema = z
  .object({
    kind: financeKindSchema,
    id: z.number().int().positive(),
    decision: financeDecisionSchema,
    note: z.string().trim().min(3).max(1000),
  })
  .strict();

export const financeAuditInputSchema = z
  .object({
    kind: financeKindSchema,
    id: z.number().int().positive(),
  })
  .strict();

export const adminDepositEntryInputSchema = z
  .object({
    memberEmail: z.string().trim().email().max(320),
    amount: z.string().trim().min(1).max(21),
    network: z.enum(["TRC20", "BEP20"]),
    txHash: z.string().trim().max(66).optional(),
    note: z.string().trim().min(3).max(1000),
  })
  .strict();

function mapFinanceError(error: unknown): never {
  if (error instanceof FinanceDbUnavailableError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Finance database is unavailable",
      cause: error,
    });
  }
  if (error instanceof FinanceRequestNotFoundError) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Finance request was not found",
      cause: error,
    });
  }
  if (error instanceof FinanceRequestConflictError) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Finance request has already been reviewed",
      cause: error,
    });
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Finance operation failed",
    cause: error,
  });
}

export async function adminListFinance(
  input: z.infer<typeof financeListInputSchema>
) {
  try {
    const rows = await listFinanceRequests(input);
    const items = rows.slice(0, input.pageSize);
    return {
      items,
      hasMore: rows.length > input.pageSize,
      page: input.page,
    };
  } catch (error) {
    return mapFinanceError(error);
  }
}

export async function adminReviewFinance(
  input: z.infer<typeof financeReviewInputSchema>,
  actorId: number
) {
  try {
    return await reviewFinanceRequest({ ...input, actorId });
  } catch (error) {
    return mapFinanceError(error);
  }
}

export async function adminFinanceAudit(
  input: z.infer<typeof financeAuditInputSchema>
) {
  try {
    return await listFinanceAudit(input);
  } catch (error) {
    return mapFinanceError(error);
  }
}

export async function adminCreateDepositEntry(
  input: z.infer<typeof adminDepositEntryInputSchema>,
  actorId: number
) {
  try {
    return await createAdminDepositEntry({ ...input, actorId });
  } catch (error) {
    return mapFinanceError(error);
  }
}

export type AdminFinanceKind = FinanceKind;
