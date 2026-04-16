import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { validateSsoToken, createTcmToken } from "@/lib/auth";

const BASE = "/aidoc";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const ssoToken = body.ssoToken || "";

  if (!ssoToken) {
    return NextResponse.json({ error: "토큰 없음" }, { status: 400 });
  }

  const user = await validateSsoToken(ssoToken);
  if (!user) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const tcmToken = await createTcmToken(user.empId);

  const cookieStore = await cookies();
  const returnTo = cookieStore.get("AXI-RETURN-TO")?.value || BASE;

  const res = NextResponse.json({ ok: true, redirectTo: returnTo });
  res.cookies.set("AXI-SSO-TOKEN", ssoToken, {
    path: "/",
    maxAge: 86400,
    httpOnly: true,
    secure: true,
  });
  res.cookies.set("AXI-TCM-TOKEN", tcmToken, {
    path: "/",
    maxAge: 15552000,
    secure: true,
  });
  res.cookies.set("AXI-USER-ID", user.empId, {
    path: "/",
    maxAge: 86400,
    secure: true,
  });
  res.cookies.set("AXI-USER-NAME", encodeURIComponent(user.loginId), {
    path: "/",
    maxAge: 86400,
    secure: true,
  });
  res.cookies.delete("AXI-RETURN-TO");

  return res;
}
