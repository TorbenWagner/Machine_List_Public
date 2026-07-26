"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { publicAccessSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/password";
import {
  PUBLIC_ACCESS_COOKIE_MAX_AGE_SECONDS,
  PUBLIC_ACCESS_COOKIE_NAME,
  createPublicAccessToken,
} from "@/lib/auth/publicAccess";
import { uiTexts } from "@/lib/ui-texts";

export interface PublicAccessActionState {
  error?: string;
}

function sanitizeNextPath(next: FormDataEntryValue | null): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export async function publicAccessAction(
  _prevState: PublicAccessActionState,
  formData: FormData,
): Promise<PublicAccessActionState> {
  const parsed = publicAccessSchema.safeParse({ password: formData.get("password") });
  const nextPath = sanitizeNextPath(formData.get("next"));

  if (!parsed.success) {
    return { error: uiTexts.publicAccess.error };
  }

  const expectedPasswordHash = process.env.PUBLIC_ACCESS_PASSWORD_HASH;
  if (!expectedPasswordHash) {
    return { error: uiTexts.common.unknownError };
  }

  if (!verifyPassword(parsed.data.password, expectedPasswordHash)) {
    return { error: uiTexts.publicAccess.error };
  }

  const token = createPublicAccessToken();
  const cookieStore = await cookies();
  cookieStore.set(PUBLIC_ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PUBLIC_ACCESS_COOKIE_MAX_AGE_SECONDS,
  });

  redirect(nextPath);
}
