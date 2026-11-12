import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  depositRequests,
  InsertUser,
  users,
  withdrawalRequests,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { createPool } from "mysql2";
import { externalMysqlOptions } from "./external-db-config";
import { resolveAuthProvider } from "../shared/auth";
import { financeAssetForNetwork } from "../shared/finance";
import { notifyTelegramRequest } from "./telegram";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (
    process.env.NODE_ENV === "production" &&
    resolveAuthProvider(process.env.AUTH_PROVIDER) === "clerk" &&
    !process.env.EXTERNAL_DATABASE_URL?.trim()
  ) {
    throw new Error(
      "EXTERNAL_DATABASE_URL is required for production Clerk database access"
    );
  }
  if (!_db) {
    const external = externalMysqlOptions();
    if (external) {
      _db = drizzle(createPool(external));
      return _db;
    }
  }
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Could not initialize the database connection");
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createDepositRequest(input: {
  userId: number;
  amount: string;
  network: string;
  txHash?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(depositRequests).values({
    userId: input.userId,
    asset: financeAssetForNetwork(input.network as "TRC20" | "BEP20"),
    amount: input.amount,
    network: input.network,
    txHash: input.txHash || null,
    status: "PENDING",
  });
  const requestId = Number(result[0].insertId);
  void notifyTelegramRequest({
    kind: "deposit",
    requestId,
    userId: input.userId,
    amount: input.amount,
    network: input.network,
    asset: financeAssetForNetwork(input.network as "TRC20" | "BEP20"),
    txHash: input.txHash,
  });
  return requestId;
}

export async function listDepositRequests(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(depositRequests)
    .where(eq(depositRequests.userId, userId))
    .orderBy(desc(depositRequests.createdAt), desc(depositRequests.id));
}

export async function createWithdrawalRequest(input: {
  userId: number;
  amount: string;
  network: string;
  destinationAddress: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(withdrawalRequests).values({
    userId: input.userId,
    asset: financeAssetForNetwork(input.network as "TRC20" | "BEP20"),
    amount: input.amount,
    network: input.network,
    destinationAddress: input.destinationAddress,
    status: "PENDING",
  });
  const requestId = Number(result[0].insertId);
  void notifyTelegramRequest({
    kind: "withdrawal",
    requestId,
    userId: input.userId,
    amount: input.amount,
    network: input.network,
    asset: financeAssetForNetwork(input.network as "TRC20" | "BEP20"),
    destinationAddress: input.destinationAddress,
  });
  return requestId;
}

export async function listWithdrawalRequests(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(withdrawalRequests)
    .where(eq(withdrawalRequests.userId, userId))
    .orderBy(desc(withdrawalRequests.createdAt), desc(withdrawalRequests.id));
}
