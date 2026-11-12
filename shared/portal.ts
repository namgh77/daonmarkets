import { z } from "zod";

const pageSchema = z.number().int().min(1).max(1000).default(1);
const pageSizeSchema = z.number().int().min(1).max(50).default(20);
const boundedText = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const accessApplicationMessageSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .default("회원 서비스 이용 신청");
export const accessReviewNoteSchema = boundedText(3, 1000);
export const announcementTitleSchema = boundedText(3, 150);
export const announcementBodySchema = boundedText(10, 20000);
export const materialTitleSchema = boundedText(3, 150);
export const materialBodySchema = boundedText(10, 20000);
export const faqQuestionSchema = boundedText(3, 250);
export const faqAnswerSchema = boundedText(3, 5000);
export const attachmentNameSchema = z.string().trim().min(1).max(255);
export const attachmentTypeSchema = z.string().trim().min(1).max(120);
export const attachmentSizeSchema = z.number().int().positive().max(25 * 1024 * 1024);
export const attachmentDataSchema = z
  .object({
    name: attachmentNameSchema,
    type: attachmentTypeSchema,
    size: attachmentSizeSchema,
    base64: z.string().min(1).max(36 * 1024 * 1024),
  })
  .strict();
export const ticketSubjectSchema = boundedText(3, 150);
export const ticketBodySchema = boundedText(10, 5000);
export const ticketReplyBodySchema = boundedText(3, 5000);

export const accessApplyInputSchema = z
  .object({ message: accessApplicationMessageSchema })
  .strict();
export const accessReviewInputSchema = z
  .object({
    id: z.number().int().positive(),
    decision: z.enum(["APPROVED", "REJECTED"]),
    note: accessReviewNoteSchema,
  })
  .strict();
export const accessListInputSchema = z
  .object({
    status: z.enum(["ALL", "PENDING", "APPROVED", "REJECTED"]).default("ALL"),
    page: pageSchema,
    pageSize: pageSizeSchema,
  })
  .strict();

export const announcementAudienceSchema = z.enum(["PUBLIC", "MEMBERS"]);
export const announcementSaveInputSchema = z
  .object({
    id: z.number().int().positive().optional(),
    title: announcementTitleSchema,
    body: announcementBodySchema,
    audience: announcementAudienceSchema,
    published: z.boolean(),
    popup: z.boolean(),
    attachment: attachmentDataSchema.optional(),
  })
  .strict();
export const materialSaveInputSchema = z
  .object({
    id: z.number().int().positive().optional(),
    title: materialTitleSchema,
    body: materialBodySchema,
    published: z.boolean(),
    attachment: attachmentDataSchema.optional(),
  })
  .strict();
export const faqSaveInputSchema = z
  .object({
    id: z.number().int().positive().optional(),
    question: faqQuestionSchema,
    answer: faqAnswerSchema,
    published: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999).default(0),
  })
  .strict();
export const faqDeleteInputSchema = z
  .object({ id: z.number().int().positive() })
  .strict();

export const announcementMarkReadInputSchema = z
  .object({ id: z.number().int().positive() })
  .strict();

export const ticketCategorySchema = z.enum([
  "ACCOUNT",
  "DEPOSIT",
  "WITHDRAWAL",
  "MATERIALS",
  "OTHER",
]);
export const ticketStatusSchema = z.enum(["ALL", "OPEN", "ANSWERED", "CLOSED"]);
export const ticketCreateInputSchema = z
  .object({
    category: ticketCategorySchema,
    subject: ticketSubjectSchema,
    body: ticketBodySchema,
  })
  .strict();
export const ticketReplyInputSchema = z
  .object({ id: z.number().int().positive(), body: ticketReplyBodySchema })
  .strict();
export const ticketIdInputSchema = z
  .object({ id: z.number().int().positive() })
  .strict();
export const ticketListInputSchema = z
  .object({
    status: ticketStatusSchema.default("ALL"),
    page: pageSchema,
    pageSize: pageSizeSchema,
  })
  .strict();

export type AccessStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AnnouncementAudience = "PUBLIC" | "MEMBERS";
export type TicketCategory =
  | "ACCOUNT"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "MATERIALS"
  | "OTHER";
export type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";
