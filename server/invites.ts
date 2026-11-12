import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { inviteTokens, users } from "../drizzle/schema";
import { getDb } from "./db";
import { INVITE_EXPIRY_DAYS, type InviteCreateInput } from "../shared/invites";
import { ensurePendingAccessApplication } from "./portal-db";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null;
}

export async function createInviteToken(input: InviteCreateInput, createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const result = await db.insert(inviteTokens).values({
    tokenHash: hashToken(token),
    createdBy,
    invitedEmail: normalizeEmail(input.invitedEmail) || null,
    status: "ACTIVE",
    expiresAt,
  });
  return { id: Number(result[0].insertId), token, expiresAt };
}

export async function listInviteTokens(createdBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(inviteTokens)
    .where(createdBy ? eq(inviteTokens.createdBy, createdBy) : undefined)
    .orderBy(desc(inviteTokens.createdAt), desc(inviteTokens.id));
}

export async function revokeInviteToken(id: number, actorId?: number, isAdmin = false) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const conditions = [eq(inviteTokens.id, id), eq(inviteTokens.status, "ACTIVE")];
  if (!isAdmin && actorId) conditions.push(eq(inviteTokens.createdBy, actorId));
  await db
    .update(inviteTokens)
    .set({ status: "REVOKED" })
    .where(and(...conditions));
  return { success: true } as const;
}

export async function validateInviteToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select()
    .from(inviteTokens)
    .where(and(eq(inviteTokens.tokenHash, hashToken(token)), eq(inviteTokens.status, "ACTIVE")))
    .limit(1);
  const invite = rows[0];
  if (!invite || invite.expiresAt.getTime() <= Date.now()) {
    return { valid: false as const };
  }
  return {
    valid: true as const,
    invitedEmail: invite.invitedEmail,
    expiresAt: invite.expiresAt,
  };
}

export async function consumeInviteToken(token: string, userId: number, email: string | null | undefined) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select()
    .from(inviteTokens)
    .where(and(eq(inviteTokens.tokenHash, hashToken(token)), eq(inviteTokens.status, "ACTIVE")))
    .limit(1);
  const invite = rows[0];
  if (!invite || invite.expiresAt.getTime() <= Date.now()) {
    throw new Error("초대 링크가 만료되었거나 이미 사용되었습니다.");
  }
  if (invite.invitedEmail && normalizeEmail(email) !== normalizeEmail(invite.invitedEmail)) {
    throw new Error("이 초대 링크는 지정된 이메일 주소만 사용할 수 있습니다.");
  }
  const result = await db
    .update(inviteTokens)
    .set({ status: "USED", usedAt: new Date(), usedBy: userId })
    .where(and(eq(inviteTokens.id, invite.id), eq(inviteTokens.status, "ACTIVE")));
  if (!result[0].affectedRows) throw new Error("초대 링크 사용 처리에 실패했습니다. 다시 시도해 주세요.");
  await db.update(users).set({ inviteRequired: false }).where(eq(users.id, userId));
  await ensurePendingAccessApplication(userId);
  return { success: true } as const;
}

export async function setPartnerRole(email: string, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("회원 이메일이 필요합니다.");
  const rows = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  const target = rows[0];
  if (!target) throw new Error("해당 이메일의 회원을 찾지 못했습니다.");
  if (target.role === "admin") throw new Error("운영자 계정의 권한은 이 화면에서 변경할 수 없습니다.");
  const result = await db
    .update(users)
    .set({ role: enabled ? "partner" : "user" })
    .where(eq(users.id, target.id));
  if (!result[0].affectedRows) throw new Error("회원 권한 변경에 실패했습니다.");
  return { success: true } as const;
}

export async function listPartners() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.role, "partner"))
    .orderBy(desc(users.createdAt));
}

/**
 * Return only members who consumed an invite created by the current partner.
 * Administrators may review the complete referral list; partner accounts are
 * always constrained by createdBy at the database query level.
 */
export async function listReferredMembers(
  actorId: number,
  isAdmin: boolean,
  memberId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const conditions = [
    eq(inviteTokens.status, "USED"),
    isNotNull(inviteTokens.usedBy),
  ];
  if (!isAdmin) conditions.push(eq(inviteTokens.createdBy, actorId));
  if (memberId) conditions.push(eq(users.id, memberId));
  return db
    .select({
      memberId: users.id,
      name: users.name,
      joinedAt: users.createdAt,
      inviteId: inviteTokens.id,
      invitedEmail: inviteTokens.invitedEmail,
    })
    .from(inviteTokens)
    .innerJoin(users, eq(inviteTokens.usedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(users.createdAt), desc(users.id));
}
