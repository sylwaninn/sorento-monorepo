import { z } from "zod";
import { dateTimeSchema, idSchema } from "#domain/primitives";

export const preparationWishesSchema = z.object({
  dossierId: idSchema,
  funeralWishes: z.string().nullable(),
  peopleToNotify: z.string().nullable(),
  documentLocation: z.string().nullable(),
  updatedAt: dateTimeSchema,
});
export type PreparationWishes = z.infer<typeof preparationWishesSchema>;

export const preparationWishesInputSchema = z.object({
  funeralWishes: z.string().nullable().optional(),
  peopleToNotify: z.string().nullable().optional(),
  documentLocation: z.string().nullable().optional(),
});
export type PreparationWishesInput = z.infer<typeof preparationWishesInputSchema>;
