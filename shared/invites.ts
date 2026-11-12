import { z } from "zod";

export const inviteTokenSchema = z.string().trim().min(32).max(128);
export const INVITE_EXPIRY_DAYS = 5;

export const inviteValidateInputSchema = z.object({
  token: inviteTokenSchema,
});

export const inviteConsumeInputSchema = inviteValidateInputSchema;

export const inviteCreateInputSchema = z.object({
  expiresInDays: z.coerce.number().int().refine(days => days === INVITE_EXPIRY_DAYS, {
    message: "초대 링크 유효기간은 5일로 고정됩니다.",
  }),
  invitedEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
});

export const inviteRevokeInputSchema = z.object({
  id: z.number().int().positive(),
});

export const partnerRoleInputSchema = z.object({
  email: z.string().trim().email().max(320),
  enabled: z.boolean(),
});

export const referredMemberSearchInputSchema = z.object({
  memberId: z.coerce.number().int().positive().optional(),
});

export type InviteCreateInput = z.infer<typeof inviteCreateInputSchema>;
