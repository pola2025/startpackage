import { NextResponse } from "next/server";
import { EDUCATION_COOKIE } from "@/lib/education/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(EDUCATION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
