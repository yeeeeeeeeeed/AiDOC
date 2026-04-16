import { NextRequest, NextResponse } from "next/server";

const BASE = "/aidoc";
const SSO_PORTAL = "http://swpsso.posco.net/idms/U61/jsp/redirect.jsp";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 루트 경로 → /aidoc/home 리다이렉트
  if (pathname === BASE || pathname === `${BASE}/`) {
    return NextResponse.redirect(new URL(`${BASE}/home`, request.url));
  }

  // API, 정적 파일은 통과
  if (
    pathname.startsWith(`${BASE}/api/`) ||
    pathname.startsWith(`${BASE}/_next/`) ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // DEV 바이패스
  if (process.env.NEXT_PUBLIC_DEV_BYPASS === "true") {
    const res = NextResponse.next();
    if (!request.cookies.get("AXI-USER-ID")) {
      res.cookies.set("AXI-USER-ID", "162264", { path: "/", maxAge: 86400 });
      res.cookies.set("AXI-USER-NAME", "개발자", { path: "/", maxAge: 86400 });
      res.cookies.set("AXI-SSO-TOKEN", "DEV_TOKEN", {
        path: "/",
        maxAge: 86400,
        httpOnly: true,
      });
    }
    return res;
  }

  // SSO 토큰 확인
  const ssoToken = request.cookies.get("AXI-SSO-TOKEN")?.value;
  if (!ssoToken) {
    const callbackUrl = `${request.nextUrl.origin}${BASE}/api/auth/sso/callback`;
    const returnTo = request.nextUrl.pathname;
    const res = NextResponse.redirect(
      `${SSO_PORTAL}?redir_url=${encodeURIComponent(callbackUrl)}`
    );
    res.cookies.set("AXI-RETURN-TO", returnTo, {
      path: "/",
      maxAge: 300,
      httpOnly: true,
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/:path*"],
};
