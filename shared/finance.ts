import { z } from "zod";

export const FINANCE_NETWORKS = ["TRC20", "BEP20"] as const;
export const financeNetworkSchema = z.enum(FINANCE_NETWORKS);

export type FinanceNetwork = (typeof FINANCE_NETWORKS)[number];

export function financeAssetForNetwork(network: FinanceNetwork) {
  return network === "TRC20" ? "USDT" : "BNB";
}

function addValidationIssue(ctx: z.RefinementCtx, message: string) {
  ctx.addIssue({ code: "custom", message });
}

/** A positive decimal that fits DECIMAL(20,8): at most 12 integer and 8 fractional digits. */
export const financeAmountSchema = z
  .string()
  .trim()
  .max(21, "Amount input is too long")
  .superRefine((value, ctx) => {
    // Bound work before regex/BigInt, including long sequences of leading zeros.
    if (value.length > 21) return;
    const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
    if (!match) {
      addValidationIssue(
        ctx,
        "Amount must be a positive decimal without an exponent"
      );
      return;
    }

    const integerPart = match[1];
    const fractionalPart = match[2] ?? "";
    const significantIntegerPart = integerPart.replace(/^0+/, "") || "0";

    if (significantIntegerPart.length > 12) {
      addValidationIssue(ctx, "Amount cannot have more than 12 integer digits");
    }
    if (fractionalPart.length > 8) {
      addValidationIssue(ctx, "Amount cannot have more than 8 decimal digits");
    }
    if (significantIntegerPart.length > 12 || fractionalPart.length > 8) return;

    const scaled =
      BigInt(significantIntegerPart) * 100000000n +
      BigInt((fractionalPart + "00000000").slice(0, 8));
    if (scaled <= 0n) {
      addValidationIssue(ctx, "Amount must be greater than zero");
    }
  });

const optionalTxHashSchema = z
  .string()
  .trim()
  .max(66)
  .transform(value => value || undefined);
const walletAddressSchema = z.string().trim().max(42);

function validateNetworkHash(
  network: FinanceNetwork,
  txHash: string | undefined,
  ctx: z.RefinementCtx
) {
  if (txHash === undefined) return;

  const valid =
    network === "TRC20"
      ? /^[0-9a-fA-F]{64}$/.test(txHash)
      : /^0x[0-9a-fA-F]{64}$/.test(txHash);
  if (!valid) {
    addValidationIssue(
      ctx,
      network === "TRC20"
        ? "TRC20 transaction hash must be 64 hexadecimal characters"
        : `${network} transaction hash must be 0x followed by 64 hexadecimal characters`
    );
  }
}

function validateNetworkWallet(
  network: FinanceNetwork,
  destinationAddress: string,
  ctx: z.RefinementCtx
) {
  const valid =
    network === "TRC20"
      ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(destinationAddress)
      : /^0x[0-9a-fA-F]{40}$/.test(destinationAddress);
  if (!valid) {
    addValidationIssue(
      ctx,
      network === "TRC20"
        ? "TRC20 destination address must be T followed by 33 base58 characters"
        : `${network} destination address must be 0x followed by 40 hexadecimal characters`
    );
  }
}

export const depositInputSchema = z
  .object({
    amount: financeAmountSchema,
    network: financeNetworkSchema,
    txHash: optionalTxHashSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    validateNetworkHash(value.network, value.txHash, ctx);
  });

export const withdrawalInputSchema = z
  .object({
    amount: financeAmountSchema,
    network: financeNetworkSchema,
    destinationAddress: walletAddressSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    validateNetworkWallet(value.network, value.destinationAddress, ctx);
  });

export type DepositInput = z.infer<typeof depositInputSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalInputSchema>;
