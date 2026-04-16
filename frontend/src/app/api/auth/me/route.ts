import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { validateSsoToken, getDevUser } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();

  if (process.env.NEXT_PUBLIC_DEV_BYPASS === "true") {
    return NextResponse.json(getDevUser());
  }

  const token = cookieStore.get("AXI-SSO-TOKEN")?.value;
  if (!token) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const user = await validateSsoToken(token);
  if (!user) {
    return NextResponse.json({ error: "세션 만료" }, { status: 401 });
  }

  return NextResponse.json(user);
}
