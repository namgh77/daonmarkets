import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phoneNumber: varchar("phoneNumber", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "partner"]).default("user").notNull(),
  inviteRequired: boolean("inviteRequired").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const depositRequests = mysqlTable("deposit_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entrySource: mysqlEnum("entrySource", ["MEMBER_REQUEST", "ADMIN_ENTRY"])
    .default("MEMBER_REQUEST")
    .notNull(),
  recordedBy: int("recordedBy"),
  asset: varchar("asset", { length: 16 }).default("USDT").notNull(),
  network: varchar("network", { length: 32 }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  txHash: varchar("txHash", { length: 160 }),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"])
    .default("PENDING")
    .notNull(),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const withdrawalRequests = mysqlTable("withdrawal_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  asset: varchar("asset", { length: 16 }).default("USDT").notNull(),
  network: varchar("network", { length: 32 }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  destinationAddress: varchar("destinationAddress", { length: 160 }).notNull(),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"])
    .default("PENDING")
    .notNull(),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DepositRequest = typeof depositRequests.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;

export const financeRequestReviews = mysqlTable(
  "finance_request_reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    kind: mysqlEnum("kind", ["deposit", "withdrawal"]).notNull(),
    requestId: int("requestId").notNull(),
    reviewerId: int("reviewerId").notNull(),
    fromStatus: mysqlEnum("fromStatus", ["PENDING"]).notNull(),
    toStatus: mysqlEnum("toStatus", ["APPROVED", "REJECTED"]).notNull(),
    note: text("note").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    requestReviewUnique: uniqueIndex(
      "finance_request_reviews_kind_request_unique"
    ).on(table.kind, table.requestId),
  })
);

export type FinanceRequestReview = typeof financeRequestReviews.$inferSelect;

export const accessApplications = mysqlTable(
  "access_applications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    message: text("message").notNull(),
    status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"])
      .default("PENDING")
      .notNull(),
    reviewNote: text("reviewNote"),
    reviewerId: int("reviewerId"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userUnique: uniqueIndex("access_applications_user_unique").on(table.userId),
    statusIndex: index("access_applications_status_idx").on(table.status),
  })
);

export const announcements = mysqlTable(
  "announcements",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 150 }).notNull(),
    body: text("body").notNull(),
    attachmentName: varchar("attachmentName", { length: 255 }),
    attachmentUrl: varchar("attachmentUrl", { length: 500 }),
    attachmentType: varchar("attachmentType", { length: 120 }),
    attachmentSize: int("attachmentSize"),
    audience: mysqlEnum("audience", ["PUBLIC", "MEMBERS"]).notNull(),
    published: boolean("published").default(false).notNull(),
    popup: boolean("popup").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    publishedAudienceIndex: index("announcements_published_audience_idx").on(
      table.published,
      table.audience
    ),
  })
);

export const announcementReads = mysqlTable(
  "announcement_reads",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    announcementId: int("announcementId").notNull(),
    readAt: timestamp("readAt").defaultNow().notNull(),
  },
  table => ({
    userAnnouncementUnique: uniqueIndex(
      "announcement_reads_user_announcement_unique"
    ).on(table.userId, table.announcementId),
    announcementIndex: index("announcement_reads_announcement_idx").on(
      table.announcementId
    ),
  })
);

export const materials = mysqlTable(
  "materials",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 150 }).notNull(),
    body: text("body").notNull(),
    attachmentName: varchar("attachmentName", { length: 255 }),
    attachmentUrl: varchar("attachmentUrl", { length: 500 }),
    attachmentType: varchar("attachmentType", { length: 120 }),
    attachmentSize: int("attachmentSize"),
    published: boolean("published").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    publishedIndex: index("materials_published_idx").on(table.published),
  })
);

export const faqItems = mysqlTable(
  "faq_items",
  {
    id: int("id").autoincrement().primaryKey(),
    question: varchar("question", { length: 250 }).notNull(),
    answer: text("answer").notNull(),
    published: boolean("published").default(true).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    publishedOrderIndex: index("faq_items_published_order_idx").on(
      table.published,
      table.sortOrder
    ),
  })
);

export const supportTickets = mysqlTable(
  "support_tickets",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    category: mysqlEnum("category", [
      "ACCOUNT",
      "DEPOSIT",
      "WITHDRAWAL",
      "MATERIALS",
      "OTHER",
    ]).notNull(),
    subject: varchar("subject", { length: 150 }).notNull(),
    body: text("body").notNull(),
    status: mysqlEnum("status", ["OPEN", "ANSWERED", "CLOSED"])
      .default("OPEN")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIndex: index("support_tickets_user_idx").on(table.userId),
    statusIndex: index("support_tickets_status_idx").on(table.status),
  })
);

export const ticketReplies = mysqlTable(
  "ticket_replies",
  {
    id: int("id").autoincrement().primaryKey(),
    ticketId: int("ticketId").notNull(),
    authorId: int("authorId").notNull(),
    authorRole: mysqlEnum("authorRole", ["user", "admin"]).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    ticketIndex: index("ticket_replies_ticket_idx").on(
      table.ticketId,
      table.createdAt
    ),
  })
);

export type AccessApplication = typeof accessApplications.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type AnnouncementRead = typeof announcementReads.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type TicketReply = typeof ticketReplies.$inferSelect;

export const inviteTokens = mysqlTable(
  "invite_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
    createdBy: int("createdBy").notNull(),
    invitedEmail: varchar("invitedEmail", { length: 320 }),
    status: mysqlEnum("status", ["ACTIVE", "USED", "REVOKED"])
      .default("ACTIVE")
      .notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    usedBy: int("usedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    statusIndex: index("invite_tokens_status_idx").on(table.status),
    expiresIndex: index("invite_tokens_expires_idx").on(table.expiresAt),
  })
);

export type InviteToken = typeof inviteTokens.$inferSelect;
