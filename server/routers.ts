import { COOKIE_NAME } from "@shared/const";
import { depositInputSchema, withdrawalInputSchema } from "@shared/finance";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  inviteProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import {
  inviteConsumeInputSchema,
  inviteCreateInputSchema,
  inviteRevokeInputSchema,
  inviteValidateInputSchema,
  partnerRoleInputSchema,
  referredMemberSearchInputSchema,
} from "../shared/invites";
import {
  consumeInviteToken,
  createInviteToken,
  listReferredMembers,
  listInviteTokens,
  listPartners,
  revokeInviteToken,
  setPartnerRole,
  validateInviteToken,
} from "./invites";
import * as db from "./db";
import {
  adminFinanceAudit,
  adminCreateDepositEntry,
  adminListFinance,
  adminReviewFinance,
  financeAuditInputSchema,
  financeListInputSchema,
  financeReviewInputSchema,
  adminDepositEntryInputSchema,
} from "./finance-admin";
import {
  accessApplyInputSchema,
  accessListInputSchema,
  accessReviewInputSchema,
  adminPortalAccessList,
  adminPortalAccessReview,
  adminPortalAnnouncementsList,
  adminPortalAnnouncementsSave,
  adminPortalFaqDelete,
  adminPortalFaqList,
  adminPortalFaqSave,
  adminPortalMaterialsList,
  adminPortalMaterialsSave,
  adminPortalSummary,
  adminPortalTicketsClose,
  adminPortalTicketsDetail,
  adminPortalTicketsList,
  adminPortalTicketsReply,
  announcementMarkReadInputSchema,
  announcementSaveInputSchema,
  faqDeleteInputSchema,
  faqSaveInputSchema,
  materialSaveInputSchema,
  portalAccessApply,
  portalAccessMine,
  portalAnnouncementsList,
  portalAnnouncementsMarkRead,
  portalMaterialsList,
  portalTicketsCreate,
  portalTicketsDetail,
  portalTicketsMine,
  portalTicketsReply,
  publicContentAnnouncements,
  publicContentFaq,
  publicContentPopupAnnouncement,
  ticketCreateInputSchema,
  ticketIdInputSchema,
  ticketListInputSchema,
  ticketReplyInputSchema,
} from "./portal";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (opts.ctx.authError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Authentication is temporarily unavailable. Please retry.",
        });
      }
      return opts.ctx.user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  invites: router({
    validate: publicProcedure
      .input(inviteValidateInputSchema)
      .query(({ input }) => validateInviteToken(input.token)),
    consume: protectedProcedure
      .input(inviteConsumeInputSchema)
      .mutation(({ ctx, input }) =>
        consumeInviteToken(input.token, ctx.user.id, ctx.user.email)
      ),
    mine: inviteProcedure.query(({ ctx }) =>
      listInviteTokens(ctx.user.role === "admin" ? undefined : ctx.user.id)
    ),
    referredMembers: inviteProcedure
      .input(referredMemberSearchInputSchema)
      .query(({ ctx, input }) =>
        listReferredMembers(ctx.user.id, ctx.user.role === "admin", input.memberId)
      ),
    create: inviteProcedure
      .input(inviteCreateInputSchema)
      .mutation(({ ctx, input }) => createInviteToken(input, ctx.user.id)),
    revoke: inviteProcedure
      .input(inviteRevokeInputSchema)
      .mutation(({ ctx, input }) =>
        revokeInviteToken(input.id, ctx.user.id, ctx.user.role === "admin")
      ),
  }),
  publicContent: router({
    announcements: publicProcedure.query(() => publicContentAnnouncements()),
    faq: publicProcedure.query(() => publicContentFaq()),
    popupAnnouncement: publicProcedure.query(() =>
      publicContentPopupAnnouncement()
    ),
  }),
  portal: router({
    access: {
      mine: protectedProcedure.query(({ ctx }) =>
        portalAccessMine(ctx.user.id)
      ),
      apply: protectedProcedure
        .input(accessApplyInputSchema)
        .mutation(({ ctx, input }) => portalAccessApply(input, ctx.user.id)),
    },
    announcements: router({
      list: protectedProcedure.query(({ ctx }) =>
        portalAnnouncementsList(ctx.user.id)
      ),
      markRead: protectedProcedure
        .input(announcementMarkReadInputSchema)
        .mutation(({ ctx, input }) =>
          portalAnnouncementsMarkRead(input, ctx.user.id)
        ),
    }),
    materials: router({
      list: protectedProcedure.query(({ ctx }) =>
        portalMaterialsList(ctx.user.id, ctx.user.role === "admin")
      ),
    }),
    tickets: router({
      mine: protectedProcedure.query(({ ctx }) =>
        portalTicketsMine(ctx.user.id)
      ),
      create: protectedProcedure
        .input(ticketCreateInputSchema)
        .mutation(({ ctx, input }) => portalTicketsCreate(input, ctx.user.id)),
      detail: protectedProcedure
        .input(ticketIdInputSchema)
        .query(({ ctx, input }) => portalTicketsDetail(input, ctx.user.id)),
      reply: protectedProcedure
        .input(ticketReplyInputSchema)
        .mutation(({ ctx, input }) => portalTicketsReply(input, ctx.user.id)),
    }),
  }),
  finance: router({
    deposits: router({
      mine: protectedProcedure.query(({ ctx }) =>
        db.listDepositRequests(ctx.user.id)
      ),
      create: protectedProcedure
        .input(depositInputSchema)
        .mutation(({ ctx, input }) =>
          db.createDepositRequest({
            userId: ctx.user.id,
            amount: input.amount,
            network: input.network,
            txHash: input.txHash,
          })
        ),
    }),
    withdrawals: router({
      mine: protectedProcedure.query(({ ctx }) =>
        db.listWithdrawalRequests(ctx.user.id)
      ),
      create: protectedProcedure
        .input(withdrawalInputSchema)
        .mutation(({ ctx, input }) =>
          db.createWithdrawalRequest({
            userId: ctx.user.id,
            amount: input.amount,
            network: input.network,
            destinationAddress: input.destinationAddress,
          })
        ),
    }),
  }),
  admin: router({
    invites: router({
      partners: adminProcedure.query(() => listPartners()),
      setPartner: adminProcedure
        .input(partnerRoleInputSchema)
        .mutation(({ input }) => setPartnerRole(input.email, input.enabled)),
    }),
    finance: router({
      list: adminProcedure
        .input(financeListInputSchema)
        .query(({ input }) => adminListFinance(input)),
      review: adminProcedure
        .input(financeReviewInputSchema)
        .mutation(({ ctx, input }) => adminReviewFinance(input, ctx.user.id)),
      audit: adminProcedure
        .input(financeAuditInputSchema)
        .query(({ input }) => adminFinanceAudit(input)),
      createDepositEntry: adminProcedure
        .input(adminDepositEntryInputSchema)
        .mutation(({ ctx, input }) => adminCreateDepositEntry(input, ctx.user.id)),
    }),
    portal: router({
      summary: adminProcedure.query(() => adminPortalSummary()),
      access: router({
        list: adminProcedure
          .input(accessListInputSchema)
          .query(({ input }) => adminPortalAccessList(input)),
        review: adminProcedure
          .input(accessReviewInputSchema)
          .mutation(({ ctx, input }) =>
            adminPortalAccessReview(input, ctx.user.id)
          ),
      }),
      announcements: router({
        list: adminProcedure.query(() => adminPortalAnnouncementsList()),
        save: adminProcedure
          .input(announcementSaveInputSchema)
          .mutation(({ input }) => adminPortalAnnouncementsSave(input)),
      }),
      materials: router({
        list: adminProcedure.query(() => adminPortalMaterialsList()),
        save: adminProcedure
          .input(materialSaveInputSchema)
          .mutation(({ input }) => adminPortalMaterialsSave(input)),
      }),
      faq: router({
        list: adminProcedure.query(() => adminPortalFaqList()),
        save: adminProcedure
          .input(faqSaveInputSchema)
          .mutation(({ input }) => adminPortalFaqSave(input)),
        delete: adminProcedure
          .input(faqDeleteInputSchema)
          .mutation(({ input }) => adminPortalFaqDelete(input)),
      }),
      tickets: router({
        list: adminProcedure
          .input(ticketListInputSchema)
          .query(({ input }) => adminPortalTicketsList(input)),
        detail: adminProcedure
          .input(ticketIdInputSchema)
          .query(({ input }) => adminPortalTicketsDetail(input)),
        reply: adminProcedure
          .input(ticketReplyInputSchema)
          .mutation(({ ctx, input }) =>
            adminPortalTicketsReply(input, ctx.user.id)
          ),
        close: adminProcedure
          .input(ticketIdInputSchema)
          .mutation(({ input }) => adminPortalTicketsClose(input)),
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
