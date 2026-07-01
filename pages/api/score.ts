import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";

type StudentScore = {
  student_id: string;
  no: string;
  fullname: string;
  password: string;
  quiz_1: string;
  quiz_2: string;
  final_exam: string;
  total: string;
  note: string;
};

function getGoogleAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google service account credentials");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return res.status(200).json({
      status: "API is working",
      message: "Score API route is available",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { studentId, password } = req.body;

    if (!studentId || !password) {
      return res.status(400).json({
        error: "กรุณากรอกเลขประจำตัวและรหัสผ่าน",
      });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error("Missing GOOGLE_SHEET_ID");
    }

    const auth = getGoogleAuth();

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Scores!A1:I",
    });

    const rows = response.data.values;

    if (!rows || rows.length < 2) {
      return res.status(404).json({
        error: "ยังไม่มีข้อมูลคะแนนในระบบ",
      });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const students: StudentScore[] = dataRows.map((row) => {
      const item: Record<string, string> = {};

      headers.forEach((header, index) => {
        item[String(header).trim()] = row[index] || "";
      });

      return item as StudentScore;
    });

    const student = students.find(
      (item) =>
        String(item.student_id).trim() === String(studentId).trim() &&
        String(item.password).trim() === String(password).trim()
    );

    if (!student) {
      return res.status(401).json({
        error: "ไม่พบข้อมูล หรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const safeData = {
      student_id: student.student_id,
      no: student.no,
      fullname: student.fullname,
      quiz_1: student.quiz_1,
      quiz_2: student.quiz_2,
      final_exam: student.final_exam,
      total: student.total,
      note: student.note,
    };

    return res.status(200).json({
      student: safeData,
    });
  } catch (error) {
    console.error("Score API error:", error);

    return res.status(500).json({
      error: "เกิดข้อผิดพลาดในการอ่านข้อมูลคะแนน",
    });
  }
}
