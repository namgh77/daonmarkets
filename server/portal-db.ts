import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import {
  accessApplications,
  announcementReads,
  announcements,
  depositRequests,
  faqItems,
  materials,
  supportTickets,
  ticketReplies,
  users,
  withdrawalRequests,
} from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut } from "./storage";
import type {
  AnnouncementAudience,
  TicketCategory,
  TicketStatus,
} from "@shared/portal";

type TicketRow = {
  id: number;
  userId: number;
  category: TicketCategory;
  subject: string;
  body: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  createdAt: Date;
  updatedAt: Date;
};

export class PortalDbUnavailableError extends Error {
  constructor() {
    super("Database is not available");
    this.name = "PortalDbUnavailableError";
  }
}
export class PortalNotFoundError extends Error {
  constructor(message = "Portal record was not found") {
    super(message);
    this.name = "PortalNotFoundError";
  }
}
export class PortalConflictError extends Error {
  constructor(message = "Portal operation conflicts with the current state") {
    super(message);
    this.name = "PortalConflictError";
  }
}
export class PortalForbiddenError extends Error {
  constructor(message = "You do not have access to this portal record") {
    super(message);
    this.name = "PortalForbiddenError";
  }
}

const allowedAttachmentTypes = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

async function persistAttachment(
  attachment: { name: string; type: string; size: number; base64: string } | undefined,
  folder: "announcements" | "materials"
) {
  if (!attachment) return null;
  if (!allowedAttachmentTypes.has(attachment.type)) {
    throw new PortalConflictError(
      "PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX 파일만 첨부할 수 있습니다."
    );
  }
  const bytes = Buffer.from(attachment.base64, "base64");
  if (bytes.length !== attachment.size || bytes.length > 25 * 1024 * 1024) {
    throw new PortalConflictError("첨부파일 크기를 확인해 주세요. 최대 25MB입니다.");
  }
  const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uploaded = await storagePut(
    `portal/${folder}/${Date.now()}-${safeName}`,
    bytes,
    attachment.type
  );
  return {
    attachmentName: attachment.name,
    attachmentUrl: uploaded.url,
    attachmentType: attachment.type,
    attachmentSize: attachment.size,
  };
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new PortalDbUnavailableError();
  return db;
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

function insertId(result: unknown): number {
  if (Array.isArray(result) && result[0] && "insertId" in result[0]) {
    return Number((result[0] as { insertId: number }).insertId);
  }
  if (typeof result === "object" && result !== null && "insertId" in result) {
    return Number((result as { insertId: number }).insertId);
  }
  return 0;
}

function isDuplicateKey(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; errno?: number };
  return candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062;
}

export async function getMyAccessApplication(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({
      id: accessApplications.id,
      userId: accessApplications.userId,
      message: accessApplications.message,
      status: accessApplications.status,
      reviewNote: accessApplications.reviewNote,
      createdAt: accessApplications.createdAt,
      updatedAt: accessApplications.updatedAt,
    })
    .from(accessApplications)
    .where(eq(accessApplications.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

/** Create the one and only review record for an invited member. */
export async function ensurePendingAccessApplication(userId: number) {
  const db = await requireDb();
  const existing = await db
    .select({ id: accessApplications.id, status: accessApplications.status })
    .from(accessApplications)
    .where(eq(accessApplications.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];

  try {
    const result = await db.insert(accessApplications).values({
      userId,
      message: "초대 링크를 통한 가입이 완료되어 관리자 승인 대기 상태입니다.",
      status: "PENDING",
    });
    return { id: insertId(result), status: "PENDING" as const };
  } catch (error) {
    if (isDuplicateKey(error)) {
      const concurrent = await db
        .select({ id: accessApplications.id, status: accessApplications.status })
        .from(accessApplications)
        .where(eq(accessApplications.userId, userId))
        .limit(1);
      if (concurrent[0]) return concurrent[0];
    }
    throw error;
  }
}

export async function applyForAccess(input: {
  userId: number;
  message: string;
}) {
  const db = await requireDb();
  try {
    const result = await db.insert(accessApplications).values({
      userId: input.userId,
      message: input.message,
      status: "PENDING",
    });
    return { id: insertId(result), status: "PENDING" as const };
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new PortalConflictError("An access application already exists");
    }
    throw error;
  }
}

export async function listAccessApplications(input: {
  status: "ALL" | "PENDING" | "APPROVED" | "REJECTED";
  page: number;
  pageSize: number;
}) {
  const db = await requireDb();
  const rows = await db
    .select({
      id: accessApplications.id,
      userId: accessApplications.userId,
      message: accessApplications.message,
      status: accessApplications.status,
      reviewNote: accessApplications.reviewNote,
      createdAt: accessApplications.createdAt,
      updatedAt: accessApplications.updatedAt,
      memberName: users.name,
      memberEmail: users.email,
    })
    .from(accessApplications)
    .leftJoin(users, eq(users.id, accessApplications.userId))
    .where(
      input.status === "ALL"
        ? undefined
        : eq(accessApplications.status, input.status)
    )
    .orderBy(desc(accessApplications.createdAt), desc(accessApplications.id))
    .limit(input.pageSize + 1)
    .offset((input.page - 1) * input.pageSize);
  return rows;
}

export async function reviewAccessApplication(input: {
  id: number;
  decision: "APPROVED" | "REJECTED";
  note: string;
  reviewerId: number;
}) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const result = await tx
      .update(accessApplications)
      .set({
        status: input.decision,
        reviewNote: input.note,
        reviewerId: input.reviewerId,
        reviewedAt: new Date(),
      })
      .where(
        and(
          eq(accessApplications.id, input.id),
          eq(accessApplications.status, "PENDING")
        )
      );
    if (affectedRows(result) !== 1) {
      const existing = await tx
        .select({ id: accessApplications.id })
        .from(accessApplications)
        .where(eq(accessApplications.id, input.id))
        .limit(1);
      if (existing.length === 0)
        throw new PortalNotFoundError("Access application was not found");
      throw new PortalConflictError(
        "Access application has already been reviewed"
      );
    }
    return { id: input.id, status: input.decision } as const;
  });
}

export async function listPublicAnnouncements() {
  const db = await requireDb();
  return db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      attachmentName: announcements.attachmentName,
      attachmentUrl: announcements.attachmentUrl,
      attachmentType: announcements.attachmentType,
      attachmentSize: announcements.attachmentSize,
      audience: announcements.audience,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
    })
    .from(announcements)
    .where(
      and(
        eq(announcements.published, true),
        eq(announcements.audience, "PUBLIC")
      )
    )
    .orderBy(desc(announcements.createdAt), desc(announcements.id))
    .limit(100);
}

export async function listPopupAnnouncements() {
  const db = await requireDb();
  return db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      attachmentName: announcements.attachmentName,
      attachmentUrl: announcements.attachmentUrl,
      attachmentType: announcements.attachmentType,
      attachmentSize: announcements.attachmentSize,
      audience: announcements.audience,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
    })
    .from(announcements)
    .where(
      and(
        eq(announcements.published, true),
        eq(announcements.audience, "PUBLIC"),
        eq(announcements.popup, true)
      )
    )
    .orderBy(desc(announcements.createdAt), desc(announcements.id))
    .limit(1);
}

export async function listMemberAnnouncements(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      attachmentName: announcements.attachmentName,
      attachmentUrl: announcements.attachmentUrl,
      attachmentType: announcements.attachmentType,
      attachmentSize: announcements.attachmentSize,
      audience: announcements.audience,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
      readId: announcementReads.id,
    })
    .from(announcements)
    .leftJoin(
      announcementReads,
      and(
        eq(announcementReads.announcementId, announcements.id),
        eq(announcementReads.userId, userId)
      )
    )
    .where(
      and(
        eq(announcements.published, true),
        inArray(announcements.audience, ["PUBLIC", "MEMBERS"])
      )
    )
    .orderBy(desc(announcements.createdAt), desc(announcements.id))
    .limit(100);
  return rows.map(({ readId, ...row }) => ({ ...row, read: readId !== null }));
}

export async function markAnnouncementRead(
  userId: number,
  announcementId: number
) {
  const db = await requireDb();
  const visible = await db
    .select({ id: announcements.id })
    .from(announcements)
    .where(
      and(
        eq(announcements.id, announcementId),
        eq(announcements.published, true),
        inArray(announcements.audience, ["PUBLIC", "MEMBERS"])
      )
    )
    .limit(1);
  if (visible.length === 0)
    throw new PortalNotFoundError("Announcement was not found");
  try {
    await db.insert(announcementReads).values({ userId, announcementId });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }
  return { success: true as const };
}

export async function listAdminAnnouncements() {
  const db = await requireDb();
  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      attachmentName: announcements.attachmentName,
      attachmentUrl: announcements.attachmentUrl,
      attachmentType: announcements.attachmentType,
      attachmentSize: announcements.attachmentSize,
      audience: announcements.audience,
      published: announcements.published,
      popup: announcements.popup,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
    })
    .from(announcements)
    .orderBy(desc(announcements.createdAt), desc(announcements.id))
    .limit(100);
  return rows.map(row => ({
    ...row,
    audience: row.audience as AnnouncementAudience,
    published: Boolean(row.published),
  }));
}

export async function saveAnnouncement(input: {
  id?: number;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  published: boolean;
  popup: boolean;
  attachment?: { name: string; type: string; size: number; base64: string };
}) {
  const db = await requireDb();
  const attachment = await persistAttachment(input.attachment, "announcements");
  if (input.id !== undefined) {
    const existing = await db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.id, input.id))
      .limit(1);
    if (existing.length === 0)
      throw new PortalNotFoundError("Announcement was not found");
    await db
      .update(announcements)
      .set({
        title: input.title,
        body: input.body,
        audience: input.audience,
        published: input.published,
        popup: input.audience === "PUBLIC" && input.popup,
        ...(attachment ?? {}),
      })
      .where(eq(announcements.id, input.id));
    return { id: input.id };
  }
  const result = await db.insert(announcements).values({
    title: input.title,
    body: input.body,
    audience: input.audience,
    published: input.published,
    popup: input.audience === "PUBLIC" && input.popup,
    ...(attachment ?? {}),
  });
  return { id: insertId(result) };
}

async function requireApprovedMember(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ id: accessApplications.id })
    .from(accessApplications)
    .where(
      and(
        eq(accessApplications.userId, userId),
        eq(accessApplications.status, "APPROVED")
      )
    )
    .limit(1);
  if (rows.length === 0)
    throw new PortalForbiddenError("Approved service access is required");
}

export async function listPublishedMaterials(input: {
  userId: number;
  isAdmin: boolean;
}) {
  const db = await requireDb();
  if (!input.isAdmin) await requireApprovedMember(input.userId);
  return db
    .select({
      id: materials.id,
      title: materials.title,
      body: materials.body,
      attachmentName: materials.attachmentName,
      attachmentUrl: materials.attachmentUrl,
      attachmentType: materials.attachmentType,
      attachmentSize: materials.attachmentSize,
      createdAt: materials.createdAt,
      updatedAt: materials.updatedAt,
    })
    .from(materials)
    .where(eq(materials.published, true))
    .orderBy(desc(materials.createdAt), desc(materials.id))
    .limit(100);
}

export async function listAdminMaterials() {
  const db = await requireDb();
  return db
    .select({
      id: materials.id,
      title: materials.title,
      body: materials.body,
      published: materials.published,
      createdAt: materials.createdAt,
      updatedAt: materials.updatedAt,
    })
    .from(materials)
    .orderBy(desc(materials.createdAt), desc(materials.id))
    .limit(100);
}

export async function saveMaterial(input: {
  id?: number;
  title: string;
  body: string;
  published: boolean;
  attachment?: { name: string; type: string; size: number; base64: string };
}) {
  const db = await requireDb();
  const attachment = await persistAttachment(input.attachment, "materials");
  if (input.id !== undefined) {
    const existing = await db
      .select({ id: materials.id })
      .from(materials)
      .where(eq(materials.id, input.id))
      .limit(1);
    if (existing.length === 0)
      throw new PortalNotFoundError("Material was not found");
    await db
      .update(materials)
      .set({
        title: input.title,
        body: input.body,
        published: input.published,
        ...(attachment ?? {}),
      })
      .where(eq(materials.id, input.id));
    return { id: input.id };
  }
  const result = await db.insert(materials).values({
    title: input.title,
    body: input.body,
    published: input.published,
    ...(attachment ?? {}),
  });
  return { id: insertId(result) };
}

export async function listPublishedFaq() {
  const db = await requireDb();
  return db
    .select({
      id: faqItems.id,
      question: faqItems.question,
      answer: faqItems.answer,
      sortOrder: faqItems.sortOrder,
      updatedAt: faqItems.updatedAt,
    })
    .from(faqItems)
    .where(eq(faqItems.published, true))
    .orderBy(asc(faqItems.sortOrder), asc(faqItems.id))
    .limit(100);
}

export async function listAdminFaq() {
  const db = await requireDb();
  return db
    .select()
    .from(faqItems)
    .orderBy(asc(faqItems.sortOrder), asc(faqItems.id))
    .limit(200);
}

export async function saveFaq(input: {
  id?: number;
  question: string;
  answer: string;
  published: boolean;
  sortOrder: number;
}) {
  const db = await requireDb();
  if (input.id !== undefined) {
    const existing = await db
      .select({ id: faqItems.id })
      .from(faqItems)
      .where(eq(faqItems.id, input.id))
      .limit(1);
    if (existing.length === 0) throw new PortalNotFoundError("FAQ was not found");
    await db
      .update(faqItems)
      .set({
        question: input.question,
        answer: input.answer,
        published: input.published,
        sortOrder: input.sortOrder,
      })
      .where(eq(faqItems.id, input.id));
    return { id: input.id };
  }
  const result = await db.insert(faqItems).values(input);
  return { id: insertId(result) };
}

export async function deleteFaq(id: number) {
  const db = await requireDb();
  const result = await db.delete(faqItems).where(eq(faqItems.id, id));
  if (affectedRows(result) !== 1) throw new PortalNotFoundError("FAQ was not found");
  return { id };
}

export async function listMyTickets(userId: number) {
  const db = await requireDb();
  return db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      category: supportTickets.category,
      subject: supportTickets.subject,
      body: supportTickets.body,
      status: supportTickets.status,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
    })
    .from(supportTickets)
    .where(eq(supportTickets.userId, userId))
    .orderBy(desc(supportTickets.createdAt), desc(supportTickets.id))
    .limit(50);
}

export async function createTicket(input: {
  userId: number;
  category: TicketCategory;
  subject: string;
  body: string;
}) {
  const db = await requireDb();
  const result = await db
    .insert(supportTickets)
    .values({ ...input, status: "OPEN" });
  return { id: insertId(result) };
}

async function findTicket(
  ticketId: number,
  ownerUserId?: number,
  executor?: any
): Promise<TicketRow | undefined> {
  const db = executor ?? (await requireDb());
  const rows = await db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      category: supportTickets.category,
      subject: supportTickets.subject,
      body: supportTickets.body,
      status: supportTickets.status,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
    })
    .from(supportTickets)
    .where(
      ownerUserId === undefined
        ? eq(supportTickets.id, ticketId)
        : and(
            eq(supportTickets.id, ticketId),
            eq(supportTickets.userId, ownerUserId)
          )
    )
    .limit(1);
  return rows[0] as TicketRow | undefined;
}

export async function getTicketDetail(ticketId: number, ownerUserId?: number) {
  const db = await requireDb();
  const ticket = await findTicket(ticketId, ownerUserId, db);
  if (!ticket) throw new PortalNotFoundError("Ticket was not found");
  const replies = await db
    .select({
      id: ticketReplies.id,
      authorId: ticketReplies.authorId,
      authorRole: ticketReplies.authorRole,
      body: ticketReplies.body,
      createdAt: ticketReplies.createdAt,
    })
    .from(ticketReplies)
    .where(eq(ticketReplies.ticketId, ticketId))
    .orderBy(asc(ticketReplies.createdAt), asc(ticketReplies.id));
  return { ticket, replies };
}

export async function listAdminTickets(input: {
  status: "ALL" | TicketStatus;
  page: number;
  pageSize: number;
}) {
  const db = await requireDb();
  const rows = await db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      category: supportTickets.category,
      subject: supportTickets.subject,
      body: supportTickets.body,
      status: supportTickets.status,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      memberName: users.name,
      memberEmail: users.email,
    })
    .from(supportTickets)
    .leftJoin(users, eq(users.id, supportTickets.userId))
    .where(
      input.status === "ALL"
        ? undefined
        : eq(supportTickets.status, input.status)
    )
    .orderBy(desc(supportTickets.createdAt), desc(supportTickets.id))
    .limit(input.pageSize + 1)
    .offset((input.page - 1) * input.pageSize);
  return rows;
}

export async function replyToTicket(input: {
  ticketId: number;
  body: string;
  authorId: number;
  authorRole: "user" | "admin";
  ownerUserId?: number;
}) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const predicates = [
      eq(supportTickets.id, input.ticketId),
      ne(supportTickets.status, "CLOSED"),
    ];
    if (input.ownerUserId !== undefined)
      predicates.push(eq(supportTickets.userId, input.ownerUserId));
    const result = await tx
      .update(supportTickets)
      .set({ status: input.authorRole === "admin" ? "ANSWERED" : "OPEN" })
      .where(and(...predicates));
    if (affectedRows(result) !== 1) {
      const ticket = await findTicket(input.ticketId, input.ownerUserId, tx);
      if (!ticket) throw new PortalNotFoundError("Ticket was not found");
      if (ticket.status === "CLOSED")
        throw new PortalConflictError("Closed tickets cannot receive replies");
      throw new PortalConflictError("Ticket could not be updated");
    }
    const inserted = await tx.insert(ticketReplies).values({
      ticketId: input.ticketId,
      authorId: input.authorId,
      authorRole: input.authorRole,
      body: input.body,
    });
    return { id: insertId(inserted) };
  });
}

export async function closeTicket(ticketId: number) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const result = await tx
      .update(supportTickets)
      .set({ status: "CLOSED" })
      .where(
        and(
          eq(supportTickets.id, ticketId),
          ne(supportTickets.status, "CLOSED")
        )
      );
    if (affectedRows(result) !== 1) {
      const existing = await tx
        .select({ id: supportTickets.id })
        .from(supportTickets)
        .where(eq(supportTickets.id, ticketId))
        .limit(1);
      if (existing.length === 0)
        throw new PortalNotFoundError("Ticket was not found");
      throw new PortalConflictError("Ticket is already closed");
    }
    return { id: ticketId, status: "CLOSED" as const };
  });
}

async function countRows(db: any, table: any, predicate: any) {
  const rows = await db.select({ value: count() }).from(table).where(predicate);
  return Number(rows[0]?.value ?? 0);
}

export async function getAdminSummary() {
  const db = await requireDb();
  const [
    pendingApplications,
    openTickets,
    pendingDeposits,
    pendingWithdrawals,
    announcementCount,
    materialCount,
  ] = await Promise.all([
    countRows(db, accessApplications, eq(accessApplications.status, "PENDING")),
    countRows(db, supportTickets, eq(supportTickets.status, "OPEN")),
    countRows(db, depositRequests, eq(depositRequests.status, "PENDING")),
    countRows(db, withdrawalRequests, eq(withdrawalRequests.status, "PENDING")),
    db.select({ value: count() }).from(announcements),
    db.select({ value: count() }).from(materials),
  ]);
  return {
    pendingApplications,
    openTickets,
    pendingDeposits,
    pendingWithdrawals,
    announcements: Number(announcementCount[0]?.value ?? 0),
    materials: Number(materialCount[0]?.value ?? 0),
  };
}
