import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "L'email est requis.")
  .email("Format d'email invalide.");

export const passwordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères.");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.boolean().refine((value) => value === true, {
    message: "Vous devez accepter les CGU et la politique de confidentialité.",
  }),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const passwordLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Le mot de passe est requis."),
});
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;

export const magicLinkLoginSchema = z.object({ email: emailSchema });
export type MagicLinkLoginInput = z.infer<typeof magicLinkLoginSchema>;

export const passwordResetRequestSchema = z.object({ email: emailSchema });
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetConfirmSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Merci de confirmer le mot de passe."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;

export const emailChangeSchema = z.object({ newEmail: emailSchema });
export type EmailChangeInput = z.infer<typeof emailChangeSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis."),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Merci de confirmer le nouveau mot de passe."),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmNewPassword"],
  });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
