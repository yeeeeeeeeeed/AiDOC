import { NextRequest, NextResponse } from "next/server";
import { validateSsoToken, createTcmToken } from "@/lib/auth";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "/aidoc";
const BASE_URL = `https://axyard.poscoenc.com${BASE}`;

export async function POST(req: NextRequest) {
  // SSO 포털은 form-encoded POST로 ssoToken을 전송
  const body = await req.text();
  const params = new URLSearchParams(body);
  const rawToken = params.get("ssoToken") || "";
  // base64 인코딩에서 공백이 + 로 변환되는 경우 복원
  const ssoToken = rawToken.replace(/ /g, "+");

  const user = await validateSsoToken(ssoToken);
  if (!user) {
    return NextResponse.redirect(`${BASE_URL}/?error=auth_failed`);
  }

  const tcmToken = await createTcmToken(user.empId);
  const returnTo = req.cookies.get("AXI-RETURN-TO")?.value || "/home";
  const res = NextResponse.redirect(`${BASE_URL}${returnTo}`, { status: 303 });

  const cookieOpts = { path: "/", httpOnly: false, sameSite: "lax" as const, maxAge: 86400 };
  res.cookies.set("AXI-SSO-TOKEN", ssoToken, { ...cookieOpts, httpOnly: true });
  res.cookies.set("AXI-TCM-TOKEN", tcmToken, { ...cookieOpts, maxAge: 15552000 });
  res.cookies.set("AXI-USER-NAME", encodeURIComponent(user.englishName || user.loginId), cookieOpts);
  res.cookies.set("AXI-USER-ID", user.empId, cookieOpts);
  res.cookies.set("AXI-USER-DEPT", encodeURIComponent(user.deptName || ""), cookieOpts);
  res.cookies.delete("AXI-RETURN-TO");

  return res;
}

export async function GET() {
  return new Response("POST required", { status: 405 });
}
