import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";

type ScoreItem = {
  label: string;
  value: string;
};

type StudentResult = {
  student_id: string;
  no: string;
  fullname: string;
  scores: ScoreItem[];
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

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return res.status(200).json({
      status: "API is working",
      message: "Dynamic score API route is available",
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
      range: "Scores!A1:ZZ",
    });

    const rows = response.data.values;

    if (!rows || rows.length < 2) {
      return res.status(404).json({
        error: "ยังไม่มีข้อมูลคะแนนในระบบ",
      });
    }

    const headers = rows[0].map((header) => normalizeText(header));
    const dataRows = rows.slice(1);

    const studentIdIndex = headers.indexOf("student_id");
    const noIndex = headers.indexOf("no");
    const fullnameIndex = headers.indexOf("fullname");
    const passwordIndex = headers.indexOf("password");

    if (
      studentIdIndex === -1 ||
      noIndex === -1 ||
      fullnameIndex === -1 ||
      passwordIndex === -1
    ) {
      return res.status(500).json({
        error:
          "หัวตารางไม่ถูกต้อง ต้องมี student_id, no, fullname และ password",
      });
    }

    const foundRow = dataRows.find((row) => {
      const rowStudentId = normalizeText(row[studentIdIndex]);
      const rowPassword = normalizeText(row[passwordIndex]);

      return (
        rowStudentId === normalizeText(studentId) &&
        rowPassword === normalizeText(password)
      );
    });

    if (!foundRow) {
      return res.status(401).json({
        error: "ไม่พบข้อมูล หรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const fixedColumns = new Set(["student_id", "no", "fullname", "password"]);

    const scores: ScoreItem[] = headers
      .map((header, index) => {
        return {
          header,
          index,
        };
      })
      .filter((item) => item.header !== "")
      .filter((item) => !fixedColumns.has(item.header))
      .map((item) => {
        return {
          label: item.header,
          value: normalizeText(foundRow[item.index]),
        };
      });

    const result: StudentResult = {
      student_id: normalizeText(foundRow[studentIdIndex]),
      no: normalizeText(foundRow[noIndex]),
      fullname: normalizeText(foundRow[fullnameIndex]),
      scores,
    };

    return res.status(200).json({
      student: result,
    });
  } catch (error) {
    console.error("Score API error:", error);

    return res.status(500).json({
      error: "เกิดข้อผิดพลาดในการอ่านข้อมูลคะแนน",
    });
  }
}
