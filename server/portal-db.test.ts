import { describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("./db", () => ({
  getDb: vi.fn(async () => harness.db),
}));

import {
  applyForAccess,
  getTicketDetail,
  listMemberAnnouncements,
  listPublishedMaterials,
  markAnnouncementRead,
  PortalConflictError,
  PortalForbiddenError,
  PortalNotFoundError,
  replyToTicket,
  reviewAccessApplication,
} from "./portal-db";

function makeFakeDb(options: {
  selectResults?: unknown[];
  updateResult?: { affectedRows: number };
  insertResult?: { insertId: number }[];
  insertError?: Error;
}) {
  const state = {
    selectResults: [...(options.selectResults ?? [])],
    updateResult: options.updateResult ?? { affectedRows: 1 },
    insertValues: [] as unknown[],
    insertError: options.insertError,
    rolledBack: false,
  };

  const query = () => {
    const chain: Record<string, any> = {};
    chain.from = () => chain;
    chain.leftJoin = () => chain;
    chain.where = () => chain;
    chain.orderBy = () => chain;
    chain.offset = () => chain;
    chain.limit = async () => state.selectResults.shift() ?? [];
    return chain;
  };
  const adapter: Record<string, any> = {
    select: query,
    insert: () => ({
      values: async (values: unknown) => {
        state.insertValues.push(values);
        if (state.insertError) throw state.insertError;
        return options.insertResult ?? [{ insertId: 41 }];
      },
    }),
    update: () => ({
      set: () => ({
        where: async () => state.updateResult,
      }),
    }),
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      try {
        return await callback(adapter);
      } catch (error) {
        state.rolledBack = true;
        throw error;
      }
    },
  };
  harness.db = adapter;
  return state;
}

describe("portal database guards", () => {
  it("binds an access application to the authenticated user and maps duplicate user ids to conflict", async () => {
    const state = makeFakeDb({ insertResult: [{ insertId: 7 }] });
    await expect(
      applyForAccess({
        userId: 12,
        message: "Please review my service access request.",
      })
    ).resolves.toEqual({
      id: 7,
      status: "PENDING",
    });
    expect(state.insertValues).toEqual([
      {
        userId: 12,
        message: "Please review my service access request.",
        status: "PENDING",
      },
    ]);

    makeFakeDb({
      insertError: Object.assign(new Error("duplicate"), {
        code: "ER_DUP_ENTRY",
      }),
    });
    await expect(
      applyForAccess({
        userId: 12,
        message: "A second application is not allowed.",
      })
    ).rejects.toBeInstanceOf(PortalConflictError);
  });

  it("reviews only pending applications and rolls back if the transaction cannot finish", async () => {
    const success = makeFakeDb({ updateResult: { affectedRows: 1 } });
    await expect(
      reviewAccessApplication({
        id: 9,
        decision: "APPROVED",
        note: "Reviewed account details.",
        reviewerId: 88,
      })
    ).resolves.toEqual({ id: 9, status: "APPROVED" });
    expect(success.rolledBack).toBe(false);

    const conflict = makeFakeDb({
      updateResult: { affectedRows: 0 },
      selectResults: [[{ id: 9 }]],
    });
    await expect(
      reviewAccessApplication({
        id: 9,
        decision: "REJECTED",
        note: "Already handled.",
        reviewerId: 88,
      })
    ).rejects.toBeInstanceOf(PortalConflictError);
    expect(conflict.rolledBack).toBe(true);

    const missing = makeFakeDb({
      updateResult: { affectedRows: 0 },
      selectResults: [[]],
    });
    await expect(
      reviewAccessApplication({
        id: 99,
        decision: "REJECTED",
        note: "No such application.",
        reviewerId: 88,
      })
    ).rejects.toBeInstanceOf(PortalNotFoundError);
  });

  it("filters member announcements and never marks a hidden announcement as read", async () => {
    const visible = makeFakeDb({
      selectResults: [
        [
          {
            id: 3,
            title: "Published",
            body: "Visible content",
            audience: "PUBLIC",
            createdAt: new Date(),
            updatedAt: new Date(),
            readId: null,
          },
        ],
      ],
    });
    await expect(listMemberAnnouncements(12)).resolves.toEqual([
      expect.objectContaining({ id: 3, read: false }),
    ]);
    expect(visible.selectResults).toHaveLength(0);

    makeFakeDb({ selectResults: [[]] });
    await expect(markAnnouncementRead(12, 404)).rejects.toBeInstanceOf(
      PortalNotFoundError
    );
  });

  it("requires an approved service application before returning published materials", async () => {
    makeFakeDb({ selectResults: [[]] });
    await expect(
      listPublishedMaterials({ userId: 12, isAdmin: false })
    ).rejects.toBeInstanceOf(PortalForbiddenError);

    const approved = makeFakeDb({
      selectResults: [
        [{ id: 8 }],
        [
          {
            id: 2,
            title: "Guide",
            body: "Approved members only",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      ],
    });
    await expect(
      listPublishedMaterials({ userId: 12, isAdmin: false })
    ).resolves.toHaveLength(1);
    expect(approved.selectResults).toHaveLength(0);

    const admin = makeFakeDb({
      selectResults: [
        [
          {
            id: 2,
            title: "Guide",
            body: "Admin view",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      ],
    });
    await expect(
      listPublishedMaterials({ userId: 99, isAdmin: true })
    ).resolves.toHaveLength(1);
  });
});

describe("portal ticket transaction guards", () => {
  it("does not expose another member's ticket through the owner-filtered query", async () => {
    makeFakeDb({ selectResults: [[]] });
    await expect(getTicketDetail(55, 12)).rejects.toBeInstanceOf(
      PortalNotFoundError
    );
  });

  it("binds reply author context and rejects replies after a closed state", async () => {
    const state = makeFakeDb({
      updateResult: { affectedRows: 1 },
      insertResult: [{ insertId: 77 }],
    });
    await expect(
      replyToTicket({
        ticketId: 5,
        body: "Here is an additional detail.",
        authorId: 12,
        authorRole: "user",
        ownerUserId: 12,
      })
    ).resolves.toEqual({ id: 77 });
    expect(state.insertValues).toContainEqual({
      ticketId: 5,
      body: "Here is an additional detail.",
      authorId: 12,
      authorRole: "user",
    });

    const closed = makeFakeDb({
      updateResult: { affectedRows: 0 },
      selectResults: [
        [
          {
            id: 5,
            userId: 12,
            category: "OTHER",
            subject: "Subject",
            body: "Body",
            status: "CLOSED",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      ],
    });
    await expect(
      replyToTicket({
        ticketId: 5,
        body: "Cannot append.",
        authorId: 900,
        authorRole: "admin",
      })
    ).rejects.toBeInstanceOf(PortalConflictError);
    expect(closed.rolledBack).toBe(true);

    const failedInsert = makeFakeDb({
      updateResult: { affectedRows: 1 },
      insertError: new Error("reply insert failed"),
    });
    await expect(
      replyToTicket({
        ticketId: 5,
        body: "Atomic reply.",
        authorId: 900,
        authorRole: "admin",
      })
    ).rejects.toThrow("reply insert failed");
    expect(failedInsert.rolledBack).toBe(true);
  });
});
