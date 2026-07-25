"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/password";
import {
  ADMIN_SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  createSessionToken,
} from "@/lib/auth/session";
import { uiTexts } from "@/lib/ui-texts";

export interface LoginActionState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: uiTexts.admin.loginError };
  }

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedUsername || !expectedPasswordHash) {
    return { error: uiTexts.common.unknownError };
  }

  const usernameMatches = parsed.data.username === expectedUsername;
  const passwordMatches = verifyPassword(parsed.data.password, expectedPasswordHash);

  if (!usernameMatches || !passwordMatches) {
    return { error: uiTexts.admin.loginError };
  }

  const token = createSessionToken(expectedUsername);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });

  redirect("/admin/machines");
}
