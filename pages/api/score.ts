import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";

type Student = {
  student_id: string;
  class_id: string;
  no: string;
  fullname: string;
  password: string;
  active: string;
};

type Assessment = {
  assessment_id: string;
  name: string;
  type: string;
  max_score: string;
  active: string;
};

type ScoreRecord = {
  assessment_id: string;
  student_id: string;
  score: string;
  updated_at: string;
};

type AssessmentClass = {
  assessment_id: string;
  class_id: string;
};

type ScoreItem = {
  label: string;
  value: string;
  maxScore: string;
  type: string;
};

type StudentResult = {
  student_id: string;
  no: string;
  fullname: string;
  class_id: string;
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

function rowToObject<T>(
  headers: string[],
  row: string[]
): T {
  const item: Record<string, string> = {};

  headers.forEach((header, index) => {
    item[String(header).trim()] = normalizeText(row[index]);
  });

  return item as T;
}

async function getSheetData(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  range: string
) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values ?? [];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  /*
   * GET
   * ใช้สำหรับทดสอบว่า API ทำงานหรือไม่
   */
  if (req.method === "GET") {
    return res.status(200).json({
      status: "API is working",
      message: "Student score API is working",
    });
  }

  /*
   * รับเฉพาะ POST
   */
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { studentId, password } = req.body;

    /*
     * ตรวจสอบว่ากรอกข้อมูลมาครบหรือไม่
     */
    if (!studentId || !password) {
      return res.status(400).json({
        error: "กรุณากรอกเลขประจำตัวและรหัสผ่าน",
      });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error("Missing GOOGLE_SHEET_ID");
    }

    /*
     * เชื่อม Google Sheets
     */
    const auth = getGoogleAuth();

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    /*
     * อ่านข้อมูลจาก 4 Sheet ที่เกี่ยวข้อง
     *
     * Students
     * Assessments
     * AssessmentClasses
     * Scores
     *
     * อ่านพร้อมกันเพื่อลดเวลา
     */
    const [
      studentsRows,
      assessmentsRows,
      assessmentClassesRows,
      scoresRows,
    ] = await Promise.all([
      getSheetData(
        sheets,
        spreadsheetId,
        "Students!A1:F"
      ),
      getSheetData(
        sheets,
        spreadsheetId,
        "Assessments!A1:E"
      ),
      getSheetData(
        sheets,
        spreadsheetId,
        "AssessmentClasses!A1:B"
      ),
      getSheetData(
        sheets,
        spreadsheetId,
        "Scores!A1:E"
      ),
    ]);

    /*
     * ตรวจสอบว่ามีข้อมูลหรือไม่
     */
    if (studentsRows.length < 2) {
      return res.status(404).json({
        error: "ยังไม่มีข้อมูลนักเรียนในระบบ",
      });
    }

    /*
     * แปลง Students
     */
    const studentsHeaders = studentsRows[0].map(normalizeText);

    const students: Student[] = studentsRows
      .slice(1)
      .map((row) =>
        rowToObject<Student>(
          studentsHeaders,
          row
        )
      );

    /*
     * ค้นหานักเรียนจาก
     * student_id + password
     */
    const student = students.find(
      (item) =>
        normalizeText(item.student_id) ===
          normalizeText(studentId) &&
        normalizeText(item.password) ===
          normalizeText(password) &&
        normalizeText(item.active).toUpperCase() ===
          "TRUE"
    );

    if (!student) {
      return res.status(401).json({
        error: "ไม่พบข้อมูล หรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    /*
     * แปลง Assessments
     */
    const assessments: Assessment[] = [];

    if (assessmentsRows.length >= 2) {
      const headers = assessmentsRows[0].map(normalizeText);

      assessments.push(
        ...assessmentsRows
          .slice(1)
          .map((row) =>
            rowToObject<Assessment>(
              headers,
              row
            )
          )
          .filter(
            (item) =>
              normalizeText(item.active).toUpperCase() ===
              "TRUE"
          )
      );
    }

    /*
     * แปลง AssessmentClasses
     */
    const assessmentClasses: AssessmentClass[] = [];

    if (assessmentClassesRows.length >= 2) {
      const headers = assessmentClassesRows[0].map(normalizeText);

      assessmentClasses.push(
        ...assessmentClassesRows
          .slice(1)
          .map((row) =>
            rowToObject<AssessmentClass>(
              headers,
              row
            )
          )
      );
    }

    /*
     * แปลง Scores
     */
    const scoreRecords: ScoreRecord[] = [];

    if (scoresRows.length >= 2) {
      const headers = scoresRows[0].map(normalizeText);

      scoreRecords.push(
        ...scoresRows
          .slice(1)
          .map((row) =>
            rowToObject<ScoreRecord>(
              headers,
              row
            )
          )
      );
    }

    /*
     * หา assessment ที่เปิดใช้งาน
     * และใช้กับห้องของนักเรียนคนนี้
     */
    const availableAssessmentIds = new Set(
      assessmentClasses
        .filter(
          (item) =>
            normalizeText(item.class_id) ===
            normalizeText(student.class_id)
        )
        .map((item) =>
          normalizeText(item.assessment_id)
        )
    );

    /*
     * สร้างรายการคะแนนของนักเรียน
     */
    const scores: ScoreItem[] = assessments
      .filter((assessment) =>
        availableAssessmentIds.has(
          normalizeText(assessment.assessment_id)
        )
      )
      .map((assessment) => {
        const scoreRecord = scoreRecords.find(
          (item) =>
            normalizeText(item.assessment_id) ===
              normalizeText(
                assessment.assessment_id
              ) &&
            normalizeText(item.student_id) ===
              normalizeText(student.student_id)
        );

        return {
          label: normalizeText(assessment.name),
          value: scoreRecord
            ? normalizeText(scoreRecord.score)
            : "",
          maxScore: normalizeText(
            assessment.max_score
          ),
          type: normalizeText(assessment.type),
        };
      });

    /*
     * ข้อมูลที่ส่งกลับไปยังหน้าเว็บ
     */
    const result: StudentResult = {
      student_id: normalizeText(student.student_id),
      no: normalizeText(student.no),
      fullname: normalizeText(student.fullname),
      class_id: normalizeText(student.class_id),
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
