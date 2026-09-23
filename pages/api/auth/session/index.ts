import type {
  NextApiRequest,
  NextApiResponse,
} from "next";

import {
  clearSessionCookie,
  getSessionToken,
  verifySessionToken,
} from "../../../../lib/session";

type SessionStudent = {
  student_id: string;
  fullname: string;
  class_id: string;
  no: string;
};

type SessionResponse = {
  success: boolean;
  authenticated: boolean;
  student?: SessionStudent;
  error?: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionResponse>
) {
  try {
    /*
     * ========================================
     * GET
     * ตรวจสอบ Session ปัจจุบัน
     * ========================================
     */

    if (req.method === "GET") {
      const token = getSessionToken(
        req.headers.cookie
      );

      if (!token) {
        return res.status(200).json({
          success: true,
          authenticated: false,
        });
      }

      const student =
        verifySessionToken(token);

      if (!student) {
        clearSessionCookie(res);

        return res.status(200).json({
          success: true,
          authenticated: false,
        });
      }

      return res.status(200).json({
        success: true,
        authenticated: true,
        student,
      });
    }

    /*
     * ========================================
     * DELETE
     * Logout
     * ========================================
     */

    if (req.method === "DELETE") {
      clearSessionCookie(res);

      return res.status(200).json({
        success: true,
        authenticated: false,
      });
    }

    /*
     * ไม่อนุญาตให้ Client สร้าง Session เอง
     * Session จะถูกสร้างโดย /api/score
     * หลังตรวจรหัสผ่านสำเร็จเท่านั้น
     */

    res.setHeader(
      "Allow",
      ["GET", "DELETE"]
    );

    return res.status(405).json({
      success: false,
      authenticated: false,
      error: "Method Not Allowed",
    });
  } catch (error) {
    console.error(
      "Session API error:",
      error
    );

    return res.status(500).json({
      success: false,
      authenticated: false,
      error:
        "เกิดข้อผิดพลาดของระบบ Session",
    });
  }
}