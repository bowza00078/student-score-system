import type {
  NextApiRequest,
  NextApiResponse,
} from "next";

import { google } from "googleapis";

import {
  createSessionToken,
  getSessionToken,
  setSessionCookie,
  verifySessionToken,
} from "../../lib/session";

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

/*
 * ==========================================
 * Google Sheets Authentication
 * ==========================================
 */

function getGoogleAuth() {
  const clientEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  const privateKey =
    process.env.GOOGLE_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Google service account credentials"
    );
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  });
}

/*
 * ==========================================
 * Helpers
 * ==========================================
 */

function normalizeText(
  value: unknown
) {
  return String(
    value ?? ""
  ).trim();
}

function rowToObject<T>(
  headers: string[],
  row: string[]
): T {
  const item: Record<
    string,
    string
  > = {};

  headers.forEach(
    (header, index) => {
      item[
        String(
          header
        ).trim()
      ] = normalizeText(
        row[index]
      );
    }
  );

  return item as T;
}

async function getSheetData(
  sheets: ReturnType<
    typeof google.sheets
  >,
  spreadsheetId: string,
  range: string
) {
  const response =
    await sheets.spreadsheets.values.get(
      {
        spreadsheetId,
        range,
      }
    );

  return (
    response.data.values ??
    []
  );
}

/*
 * ==========================================
 * API
 * ==========================================
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  /*
   * รับเฉพาะ GET และ POST
   *
   * GET:
   * โหลดคะแนนจาก Session
   *
   * POST:
   * Login ด้วย studentId + password
   */

  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
    res.setHeader(
      "Allow",
      ["GET", "POST"]
    );

    return res
      .status(405)
      .json({
        error:
          "Method not allowed",
      });
  }

  try {
    const spreadsheetId =
      process.env
        .GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error(
        "Missing GOOGLE_SHEET_ID"
      );
    }

    /*
     * ======================================
     * 1. ระบุตัวนักเรียน
     * ======================================
     */

    let loginStudentId = "";
    let loginPassword = "";
    let loginWithPassword =
      false;

    if (
      req.method === "POST"
    ) {
      /*
       * Login ครั้งแรก
       */

      loginStudentId =
        normalizeText(
          req.body?.studentId
        );

      loginPassword =
        normalizeText(
          req.body?.password
        );

      if (
        !loginStudentId ||
        !loginPassword
      ) {
        return res
          .status(400)
          .json({
            error:
              "กรุณากรอกรหัสนักเรียนและรหัสผ่าน",
          });
      }

      loginWithPassword =
        true;
    } else {
      /*
       * GET
       * ใช้ Session เดิม
       */

      const sessionToken =
        getSessionToken(
          req.headers.cookie
        );

      if (!sessionToken) {
        return res
          .status(401)
          .json({
            error:
              "กรุณาเข้าสู่ระบบก่อน",
          });
      }

      const sessionStudent =
        verifySessionToken(
          sessionToken
        );

      if (!sessionStudent) {
        return res
          .status(401)
          .json({
            error:
              "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่",
          });
      }

      loginStudentId =
        normalizeText(
          sessionStudent.student_id
        );
    }

    /*
     * ======================================
     * 2. เชื่อม Google Sheets
     * ======================================
     */

    const auth =
      getGoogleAuth();

    const sheets =
      google.sheets({
        version: "v4",
        auth,
      });

    /*
     * อ่านข้อมูล 4 Sheet พร้อมกัน
     */

    const [
      studentsRows,
      assessmentsRows,
      assessmentClassesRows,
      scoresRows,
    ] =
      await Promise.all([
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
     * ======================================
     * 3. ตรวจข้อมูลนักเรียน
     * ======================================
     */

    if (
      studentsRows.length <
      2
    ) {
      return res
        .status(404)
        .json({
          error:
            "ยังไม่มีข้อมูลนักเรียนในระบบ",
        });
    }

    const studentsHeaders =
      studentsRows[0].map(
        normalizeText
      );

    const students:
      Student[] =
      studentsRows
        .slice(1)
        .map((row) =>
          rowToObject<Student>(
            studentsHeaders,
            row
          )
        );

    /*
     * POST:
     * ตรวจ student_id + password
     *
     * GET:
     * ตรวจ student_id จาก Session
     *
     * ทั้งสองกรณีต้อง active = TRUE
     */

    const student =
      students.find(
        (item) => {
          const sameStudent =
            normalizeText(
              item.student_id
            ) ===
            loginStudentId;

          const active =
            normalizeText(
              item.active
            ).toUpperCase() ===
            "TRUE";

          if (
            !sameStudent ||
            !active
          ) {
            return false;
          }

          if (
            loginWithPassword
          ) {
            return (
              normalizeText(
                item.password
              ) ===
              loginPassword
            );
          }

          return true;
        }
      );

    if (!student) {
      return res
        .status(401)
        .json({
          error:
            loginWithPassword
              ? "ไม่พบข้อมูล หรือรหัสผ่านไม่ถูกต้อง"
              : "ไม่พบข้อมูลนักเรียน หรือบัญชีถูกปิดใช้งาน",
        });
    }

    /*
     * ======================================
     * 4. Assessments
     * ======================================
     */

    const assessments:
      Assessment[] = [];

    if (
      assessmentsRows.length >=
      2
    ) {
      const headers =
        assessmentsRows[0].map(
          normalizeText
        );

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
              normalizeText(
                item.active
              ).toUpperCase() ===
              "TRUE"
          )
      );
    }

    /*
     * ======================================
     * 5. AssessmentClasses
     * ======================================
     */

    const assessmentClasses:
      AssessmentClass[] = [];

    if (
      assessmentClassesRows.length >=
      2
    ) {
      const headers =
        assessmentClassesRows[0].map(
          normalizeText
        );

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
     * ======================================
     * 6. Scores
     * ======================================
     */

    const scoreRecords:
      ScoreRecord[] = [];

    if (
      scoresRows.length >=
      2
    ) {
      const headers =
        scoresRows[0].map(
          normalizeText
        );

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
     * ======================================
     * 7. หาแบบประเมินของห้องนักเรียน
     * ======================================
     */

    const availableAssessmentIds =
      new Set(
        assessmentClasses
          .filter(
            (item) =>
              normalizeText(
                item.class_id
              ) ===
              normalizeText(
                student.class_id
              )
          )
          .map((item) =>
            normalizeText(
              item.assessment_id
            )
          )
      );

    /*
     * ======================================
     * 8. สร้างรายการคะแนน
     * ======================================
     */

    const scores:
      ScoreItem[] =
      assessments
        .filter(
          (assessment) =>
            availableAssessmentIds.has(
              normalizeText(
                assessment.assessment_id
              )
            )
        )
        .map(
          (assessment) => {
            const scoreRecord =
              scoreRecords.find(
                (item) =>
                  normalizeText(
                    item.assessment_id
                  ) ===
                    normalizeText(
                      assessment.assessment_id
                    ) &&
                  normalizeText(
                    item.student_id
                  ) ===
                    normalizeText(
                      student.student_id
                    )
              );

            return {
              label:
                normalizeText(
                  assessment.name
                ),

              value:
                scoreRecord
                  ? normalizeText(
                      scoreRecord.score
                    )
                  : "",

              maxScore:
                normalizeText(
                  assessment.max_score
                ),

              type:
                normalizeText(
                  assessment.type
                ),
            };
          }
        );

    /*
     * ======================================
     * 9. Student Result
     * ======================================
     */

    const result:
      StudentResult = {
      student_id:
        normalizeText(
          student.student_id
        ),

      no:
        normalizeText(
          student.no
        ),

      fullname:
        normalizeText(
          student.fullname
        ),

      class_id:
        normalizeText(
          student.class_id
        ),

      scores,
    };

    /*
     * ======================================
     * 10. สร้าง Session
     *
     * ทำเฉพาะตอน Login ด้วย POST
     * GET จะใช้ Session เดิม
     * ======================================
     */

    if (
      loginWithPassword
    ) {
      const sessionToken =
        createSessionToken({
          student_id:
            result.student_id,

          fullname:
            result.fullname,

          class_id:
            result.class_id,

          no:
            result.no,
        });

      setSessionCookie(
        res,
        sessionToken
      );
    }

    /*
     * ======================================
     * 11. Response
     * ======================================
     */

    return res
      .status(200)
      .json({
        student: result,
      });
  } catch (error) {
    console.error(
      "Score API error:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          "เกิดข้อผิดพลาดในการอ่านข้อมูลคะแนน",
      });
  }
}