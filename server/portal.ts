import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  accessApplyInputSchema,
  accessListInputSchema,
  accessReviewInputSchema,
  announcementMarkReadInputSchema,
  announcementSaveInputSchema,
  faqDeleteInputSchema,
  faqSaveInputSchema,
  materialSaveInputSchema,
  ticketCreateInputSchema,
  ticketIdInputSchema,
  ticketListInputSchema,
  ticketReplyInputSchema,
} from "@shared/portal";
import {
  applyForAccess,
  closeTicket,
  createTicket,
  getAdminSummary,
  getMyAccessApplication,
  getTicketDetail,
  listAdminAnnouncements,
  listAdminMaterials,
  listAdminFaq,
  listAdminTickets,
  listAccessApplications,
  listMemberAnnouncements,
  listMyTickets,
  listPopupAnnouncements,
  listPublicAnnouncements,
  listPublishedMaterials,
  listPublishedFaq,
  markAnnouncementRead,
  PortalConflictError,
  PortalDbUnavailableError,
  PortalForbiddenError,
  PortalNotFoundError,
  replyToTicket,
  reviewAccessApplication,
  saveAnnouncement,
  saveMaterial,
  saveFaq,
  deleteFaq,
} from "./portal-db";
import type { AnnouncementAudience } from "@shared/portal";

export {
  accessApplyInputSchema,
  accessListInputSchema,
  accessReviewInputSchema,
  announcementMarkReadInputSchema,
  announcementSaveInputSchema,
  faqDeleteInputSchema,
  faqSaveInputSchema,
  materialSaveInputSchema,
  ticketCreateInputSchema,
  ticketIdInputSchema,
  ticketListInputSchema,
  ticketReplyInputSchema,
};

type AdminAnnouncement = {
  id: number;
  title: string;
  body: string;
  attachmentName: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  audience: AnnouncementAudience;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type AdminMaterial = {
  id: number;
  title: string;
  body: string;
  attachmentName: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Type-only discriminant; material JSON does not include this field. */
  audience: never;
};

export function mapPortalError(error: unknown): never {
  if (error instanceof PortalDbUnavailableError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Portal database is unavailable",
      cause: error,
    });
  }
  if (error instanceof PortalNotFoundError) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Portal record was not found",
      cause: error,
    });
  }
  if (error instanceof PortalForbiddenError) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Portal access is forbidden",
      cause: error,
    });
  }
  if (error instanceof PortalConflictError) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Portal operation conflicts with the current state",
      cause: error,
    });
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Portal operation failed",
    cause: error,
  });
}

async function portalCall<T>(callback: () => Promise<T>): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    return mapPortalError(error);
  }
}

export const portalAccessMine = (userId: number) =>
  portalCall(() => getMyAccessApplication(userId));

export const portalAccessApply = (
  input: z.infer<typeof accessApplyInputSchema>,
  userId: number
) => portalCall(() => applyForAccess({ ...input, userId }));

export const adminPortalAccessList = async (
  input: z.infer<typeof accessListInputSchema>
) => {
  const rows = await portalCall(() => listAccessApplications(input));
  return {
    items: rows.slice(0, input.pageSize),
    hasMore: rows.length > input.pageSize,
    page: input.page,
  };
};

export const adminPortalAccessReview = (
  input: z.infer<typeof accessReviewInputSchema>,
  reviewerId: number
) => portalCall(() => reviewAccessApplication({ ...input, reviewerId }));

export const publicContentAnnouncements = () =>
  portalCall(() => listPublicAnnouncements());

export const publicContentPopupAnnouncement = () =>
  portalCall(() => listPopupAnnouncements());

export const portalAnnouncementsList = (userId: number) =>
  portalCall(() => listMemberAnnouncements(userId));

export const portalAnnouncementsMarkRead = (
  input: z.infer<typeof announcementMarkReadInputSchema>,
  userId: number
) => portalCall(() => markAnnouncementRead(userId, input.id));

export const adminPortalAnnouncementsList = (): Promise<AdminAnnouncement[]> =>
  portalCall(() => listAdminAnnouncements());

export const adminPortalAnnouncementsSave = (
  input: z.infer<typeof announcementSaveInputSchema>
) => portalCall(() => saveAnnouncement(input));

export const portalMaterialsList = (userId: number, isAdmin: boolean) =>
  portalCall(() => listPublishedMaterials({ userId, isAdmin }));

export const adminPortalMaterialsList = (): Promise<AdminMaterial[]> =>
  portalCall(() => listAdminMaterials()) as Promise<AdminMaterial[]>;

export const adminPortalMaterialsSave = (
  input: z.infer<typeof materialSaveInputSchema>
) => portalCall(() => saveMaterial(input));

export const publicContentFaq = () => portalCall(() => listPublishedFaq());

export const adminPortalFaqList = () => portalCall(() => listAdminFaq());

export const adminPortalFaqSave = (
  input: z.infer<typeof faqSaveInputSchema>
) => portalCall(() => saveFaq(input));

export const adminPortalFaqDelete = (
  input: z.infer<typeof faqDeleteInputSchema>
) => portalCall(() => deleteFaq(input.id));

export const portalTicketsMine = (userId: number) =>
  portalCall(() => listMyTickets(userId));

export const portalTicketsCreate = (
  input: z.infer<typeof ticketCreateInputSchema>,
  userId: number
) => portalCall(() => createTicket({ ...input, userId }));

export const portalTicketsDetail = (
  input: z.infer<typeof ticketIdInputSchema>,
  userId: number
) => portalCall(() => getTicketDetail(input.id, userId));

export const portalTicketsReply = (
  input: z.infer<typeof ticketReplyInputSchema>,
  userId: number
) =>
  portalCall(() =>
    replyToTicket({
      ticketId: input.id,
      body: input.body,
      authorId: userId,
      authorRole: "user",
      ownerUserId: userId,
    })
  );

export const adminPortalTicketsList = async (
  input: z.infer<typeof ticketListInputSchema>
) => {
  const rows = await portalCall(() => listAdminTickets(input));
  return {
    items: rows.slice(0, input.pageSize),
    hasMore: rows.length > input.pageSize,
    page: input.page,
  };
};

export const adminPortalTicketsDetail = (
  input: z.infer<typeof ticketIdInputSchema>
) => portalCall(() => getTicketDetail(input.id));

export const adminPortalTicketsReply = (
  input: z.infer<typeof ticketReplyInputSchema>,
  adminId: number
) =>
  portalCall(() =>
    replyToTicket({
      ticketId: input.id,
      body: input.body,
      authorId: adminId,
      authorRole: "admin",
    })
  );

export const adminPortalTicketsClose = (
  input: z.infer<typeof ticketIdInputSchema>
) => portalCall(() => closeTicket(input.id));

export const adminPortalSummary = () => portalCall(() => getAdminSummary());
