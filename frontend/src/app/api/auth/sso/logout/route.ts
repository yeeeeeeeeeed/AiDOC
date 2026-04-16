import { NextResponse } from "next/server";

const SSO_LOGOUT = "http://swpsso.posco.net/idms/U61/jsp/logout.jsp";

export async function POST() {
  const res = NextResponse.json({ ok: true, redirectTo: SSO_LOGOUT });
  res.cookies.delete("AXI-SSO-TOKEN");
  res.cookies.delete("AXI-TCM-TOKEN");
  res.cookies.delete("AXI-USER-ID");
  res.cookies.delete("AXI-USER-NAME");
  return res;
}
