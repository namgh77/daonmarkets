import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn(async () => null) }));

import { appRouter } from "./routers";

const request = {} as any;
const response = {} as any;

function caller(user: { id: number; role: "user" | "admin" } | null) {
  const authUser = user
    ? {
        id: user.id,
        openId: `test-${user.id}`,
        name: null,
        email: null,
        loginMethod: null,
        role: user.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;
  return appRouter.createCaller({
    req: request,
    res: response,
    user: authUser,
  });
}

describe("portal router guards", () => {
  it("rejects visitors before any member portal query runs", async () => {
    await expect(caller(null).portal.access.mine()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller(null).portal.tickets.create({
        category: "OTHER",
        subject: "A valid subject",
        body: "A sufficiently long ticket body.",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a normal member from administrator portal procedures", async () => {
    await expect(
      caller({ id: 12, role: "user" }).admin.portal.summary()
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller({ id: 12, role: "user" }).admin.portal.access.review({
        id: 1,
        decision: "APPROVED",
        note: "Reviewed request",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller({ id: 12, role: "user" }).admin.portal.faq.save({
        question: "회원 질문",
        answer: "관리자만 수정할 수 있는 답변입니다.",
        published: true,
        sortOrder: 1,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("recognizes an administrator as eligible for admin routing without inventing auth or data", async () => {
    const result = caller({ id: 900, role: "admin" }).admin.portal.summary();
    await expect(result).rejects.not.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(result).rejects.not.toMatchObject({ code: "FORBIDDEN" });
    vi.restoreAllMocks();
  });
});
