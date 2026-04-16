import type { User } from "@/types";

const SSO_VALIDATE_URL = "http://swpsso.posco.net/idms/U61/jsp/isValidSSO.jsp";
const TCM_DEV_URL = "https://tcm-dev.poscoenc.com/tcm-backend/v1/createToken";

export async function validateSsoToken(token: string): Promise<User | null> {
  try {
    const res = await fetch(SSO_VALIDATE_URL, {
      headers: { Cookie: `SWP-H-SESSION-ID=${token}` },
    });
    const text = await res.text();
    const parts = text.trim().split(",");
    if (parts.length < 10 || !parts[0]) return null;

    return {
      loginId: parts[0],
      empId: parts[1],
      deptName: parts[4],
      deptCode: parts[5],
      companyName: parts[3] || "",
      englishName: parts[8] || "",
      email: parts[9] || "",
    };
  } catch {
    return null;
  }
}

export async function createTcmToken(userId: string): Promise<string> {
  try {
    const res = await fetch(TCM_DEV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemCode: "AXI",
        userId,
        userIp: "0.0.0.0",
      }),
    });
    const data = await res.json();
    return data.accessToken || "";
  } catch {
    return "";
  }
}

export function getDevUser(): User {
  return {
    loginId: "dev_user",
    empId: "000000",
    deptName: "개발팀",
    deptCode: "DEV",
    companyName: "POSCO E&C",
    englishName: "Dev User",
    email: "dev@poscoenc.com",
  };
}
