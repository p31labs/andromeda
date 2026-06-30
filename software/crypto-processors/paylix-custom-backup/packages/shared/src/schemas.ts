import { z } from "zod";

export const SessionCreateSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("USDC"),
  chain_id: z.string().or(z.number()),
  redirect_url: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const WebhookEventSchema = z.object({
  status: z.enum(["completed", "paid", "failed", "pending"]),
  amount: z.union([z.number(), z.string()]),
  currency: z.string(),
  timestamp: z.string().optional(),
  session_id: z.string().optional(),
  tx_hash: z.string().optional(),
  chain_id: z.string().or(z.number()).optional(),
  from_address: z.string().optional(),
  to_address: z.string().optional(),
});

export type SessionCreateInput = z.infer<typeof SessionCreateSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
