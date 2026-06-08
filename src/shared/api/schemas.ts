import { z } from "zod";

export const newConnectionSchema = z.object({
  database: z.number().int().min(0).optional(),
  label: z.string().trim().min(1).max(80),
  provider: z.literal("redis"),
  tls: z.boolean().optional(),
  url: z
    .string()
    .trim()
    .url()
    .refine((value) => value.startsWith("redis://") || value.startsWith("rediss://"), {
      message: "Redis URLs must start with redis:// or rediss://."
    })
});

export const mutationRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(1),
    ttlSeconds: z.number().int().positive().optional(),
    value: z.unknown().optional()
  }),
  z.object({
    action: z.literal("delete"),
    resourceId: z.string().min(1)
  }),
  z.object({
    action: z.literal("expire"),
    resourceId: z.string().min(1),
    ttlSeconds: z.number().int().positive()
  }),
  z.object({
    action: z.literal("rename"),
    newName: z.string().trim().min(1),
    resourceId: z.string().min(1)
  }),
  z.object({
    action: z.literal("update"),
    resourceId: z.string().min(1),
    value: z.unknown()
  })
]);
