import { describe, expect, it } from "vitest";
import {
  emailChangeSchema,
  emailSchema,
  magicLinkLoginSchema,
  passwordChangeSchema,
  passwordLoginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  passwordSchema,
  signupSchema,
} from "#domain/auth";

const VALID_PASSWORD = "ValidPassword123";
const EMAIL = "personne@exemple.fr";

/** Messages are asserted verbatim: they are what the user reads, in the language they read it. */
const firstMessage = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}): string | null => (result.success ? null : (result.error?.issues[0]?.message ?? null));

describe("emailSchema", () => {
  it("accepts an email", () => {
    expect(emailSchema.safeParse(EMAIL).success).toBe(true);
  });

  it("asks for an email when the field is left empty", () => {
    expect(firstMessage(emailSchema.safeParse(""))).toBe("L'email est requis.");
  });

  it("reports a malformed email as a format problem, not a missing one", () => {
    expect(firstMessage(emailSchema.safeParse("pas-un-email"))).toBe("Format d'email invalide.");
  });

  it("rejects an address with no domain", () => {
    expect(emailSchema.safeParse("personne@").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("rejects 11 characters", () => {
    expect(passwordSchema.safeParse("x".repeat(11)).success).toBe(false);
  });

  it("accepts exactly 12 characters", () => {
    expect(passwordSchema.safeParse("x".repeat(12)).success).toBe(true);
  });

  it("states the minimum length the user has to reach", () => {
    expect(firstMessage(passwordSchema.safeParse("court"))).toBe(
      "Le mot de passe doit contenir au moins 12 caractères.",
    );
  });
});

describe("signupSchema", () => {
  const VALID = { email: EMAIL, password: VALID_PASSWORD, acceptTerms: true };

  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["email", "password", "acceptTerms"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
    expect(signupSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects a signup with the terms left unchecked", () => {
    expect(signupSchema.safeParse({ ...VALID, acceptTerms: false }).success).toBe(false);
  });

  it("says which consent is missing", () => {
    expect(firstMessage(signupSchema.safeParse({ ...VALID, acceptTerms: false }))).toBe(
      "Vous devez accepter les CGU et la politique de confidentialité.",
    );
  });

  it("applies the full password policy at signup", () => {
    expect(signupSchema.safeParse({ ...VALID, password: "court" }).success).toBe(false);
  });
});

describe("passwordLoginSchema", () => {
  const VALID = { email: EMAIL, password: VALID_PASSWORD };

  it("accepts credentials", () => {
    expect(passwordLoginSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["email", "password"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
    expect(passwordLoginSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(passwordLoginSchema.safeParse({ ...VALID, password: "" }).success).toBe(false);
  });

  it("asks for the password when it is left empty", () => {
    expect(firstMessage(passwordLoginSchema.safeParse({ ...VALID, password: "" }))).toBe(
      "Le mot de passe est requis.",
    );
  });

  // Logging in must not re-apply the 12-character rule: it would lock out any account created
  // before the policy existed.
  it("accepts a short existing password at login", () => {
    expect(passwordLoginSchema.safeParse({ ...VALID, password: "court" }).success).toBe(true);
  });
});

describe("magicLinkLoginSchema", () => {
  it("accepts an email", () => {
    expect(magicLinkLoginSchema.safeParse({ email: EMAIL }).success).toBe(true);
  });

  it("requires the email", () => {
    expect(magicLinkLoginSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(magicLinkLoginSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("passwordResetRequestSchema", () => {
  it("accepts an email", () => {
    expect(passwordResetRequestSchema.safeParse({ email: EMAIL }).success).toBe(true);
  });

  it("requires the email", () => {
    expect(passwordResetRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("emailChangeSchema", () => {
  it("accepts a new email", () => {
    expect(emailChangeSchema.safeParse({ newEmail: EMAIL }).success).toBe(true);
  });

  it("requires the new email", () => {
    expect(emailChangeSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a malformed new email", () => {
    expect(emailChangeSchema.safeParse({ newEmail: "nope" }).success).toBe(false);
  });
});

describe("passwordResetConfirmSchema", () => {
  const VALID = { password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD };

  it("accepts matching passwords", () => {
    expect(passwordResetConfirmSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    expect(
      passwordResetConfirmSchema.safeParse({ ...VALID, confirmPassword: "OtherPassword123" })
        .success,
    ).toBe(false);
  });

  it("says the two do not match", () => {
    expect(
      firstMessage(
        passwordResetConfirmSchema.safeParse({ ...VALID, confirmPassword: "OtherPassword123" }),
      ),
    ).toBe("Les mots de passe ne correspondent pas.");
  });

  it("puts the error on the confirmation field, where the user can fix it", () => {
    const result = passwordResetConfirmSchema.safeParse({
      ...VALID,
      confirmPassword: "OtherPassword123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects an empty confirmation", () => {
    expect(passwordResetConfirmSchema.safeParse({ ...VALID, confirmPassword: "" }).success).toBe(
      false,
    );
  });

  it("asks for the confirmation when it is left empty", () => {
    const result = passwordResetConfirmSchema.safeParse({
      password: VALID_PASSWORD,
      confirmPassword: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Merci de confirmer le mot de passe.",
      );
    }
  });

  it("still applies the password policy to the new password", () => {
    expect(
      passwordResetConfirmSchema.safeParse({ password: "court", confirmPassword: "court" }).success,
    ).toBe(false);
  });

  it.each(["password", "confirmPassword"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
    expect(passwordResetConfirmSchema.safeParse(withoutField).success).toBe(false);
  });
});

describe("passwordChangeSchema", () => {
  const VALID = {
    currentPassword: "OldPassword123",
    newPassword: VALID_PASSWORD,
    confirmNewPassword: VALID_PASSWORD,
  };

  it("accepts a change whose confirmation matches", () => {
    expect(passwordChangeSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a change whose confirmation does not match", () => {
    expect(
      passwordChangeSchema.safeParse({ ...VALID, confirmNewPassword: "Different123456789" })
        .success,
    ).toBe(false);
  });

  it("says the two do not match", () => {
    expect(
      firstMessage(
        passwordChangeSchema.safeParse({ ...VALID, confirmNewPassword: "Different123456789" }),
      ),
    ).toBe("Les mots de passe ne correspondent pas.");
  });

  it("puts the error on the confirmation field, not on the new password", () => {
    const result = passwordChangeSchema.safeParse({
      ...VALID,
      confirmNewPassword: "Different123456789",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmNewPassword"]);
    }
  });

  it.each(["currentPassword", "newPassword", "confirmNewPassword"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
    expect(passwordChangeSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects an empty current password", () => {
    expect(passwordChangeSchema.safeParse({ ...VALID, currentPassword: "" }).success).toBe(false);
  });

  it("asks for the current password when it is left empty", () => {
    const result = passwordChangeSchema.safeParse({ ...VALID, currentPassword: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Le mot de passe actuel est requis.",
      );
    }
  });

  it("rejects an empty confirmation", () => {
    expect(passwordChangeSchema.safeParse({ ...VALID, confirmNewPassword: "" }).success).toBe(
      false,
    );
  });

  it("asks for the confirmation when it is left empty", () => {
    const result = passwordChangeSchema.safeParse({ ...VALID, confirmNewPassword: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Merci de confirmer le nouveau mot de passe.",
      );
    }
  });

  // The current password is checked against the account, not against the policy: an account
  // predating the 12-character rule must still be able to change its password.
  it("accepts a short current password", () => {
    expect(passwordChangeSchema.safeParse({ ...VALID, currentPassword: "court" }).success).toBe(
      true,
    );
  });

  it("applies the policy to the new password", () => {
    expect(
      passwordChangeSchema.safeParse({
        ...VALID,
        newPassword: "court",
        confirmNewPassword: "court",
      }).success,
    ).toBe(false);
  });
});
