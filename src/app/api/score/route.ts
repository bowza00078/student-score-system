import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

type StudentScore = {
  student_id: string;
  no: string;
  class: string;
  fullname: string;
  password: string;
  exam_mid: string;
  exam_final: string;
  total: string;
  grade: string;
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

export async function POST(req: NextRequest) {
  try {
    const { studentId, password } = await req.json();

    if (!studentId || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกเลขประจำตัวและรหัสผ่าน" },
        { status: 400 }
      );
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
      range: "Scores!A1:J",
    });

    const rows = response.data.values;

    if (!rows || rows.length < 2) {
      return NextResponse.json(
        { error: "ยังไม่มีข้อมูลคะแนนในระบบ" },
        { status: 404 }
      );
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const students: StudentScore[] = dataRows.map((row) => {
      const item: Record<string, string> = {};

      headers.forEach((header, index) => {
        item[header] = row[index] || "";
      });

      return item as StudentScore;
    });

    const student = students.find(
      (item) =>
        item.student_id.trim() === String(studentId).trim() &&
        item.password.trim() === String(password).trim()
    );

    if (!student) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูล หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const safeData = {
      student_id: student.student_id,
      no: student.no,
      class: student.class,
      fullname: student.fullname,
      exam_mid: student.exam_mid,
      exam_final: student.exam_final,
      total: student.total,
      grade: student.grade,
      note: student.note,
    };

    return NextResponse.json({ student: safeData });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอ่านข้อมูลคะแนน" },
      { status: 500 }
    );
  }
}