import type {
  NextApiRequest,
  NextApiResponse,
} from "next";
import { google } from "googleapis";

import {
  getSessionToken,
  verifySessionToken,
} from "../../../lib/session";

type Student = {
  student_id: string;
  class_id: string;
  no: string;
  fullname: string;
  password: string;
  active: string;
};

type Assignment = {
  assignment_id: string;
  name: string;
  description: string;
  due_date: string;
  active: string;
};

type AssignmentClass = {
  assignment_id: string;
  class_id: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

/*
 * ==========================================
 * Google Sheets Authentication
 * ==========================================
 */

function getGoogleSheetsAuth() {
  const clientEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  const privateKey =
    process.env.GOOGLE_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Google Service Account credentials"
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
 * Google Drive Authentication
 * ==========================================
 */

function getGoogleDriveAuth() {
  const clientId =
    process.env.GOOGLE_OAUTH_CLIENT_ID;

  const clientSecret =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI;

  const refreshToken =
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri
  ) {
    throw new Error(
      "Missing Google OAuth Client credentials"
    );
  }

  if (!refreshToken) {
    throw new Error(
      "Missing GOOGLE_OAUTH_REFRESH_TOKEN"
    );
  }

  const oauth2Client =
    new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/*
 * ==========================================
 * Google Sheets
 * ==========================================
 */

async function getSheetData(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  range: string
) {
  const response =
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

  return response.data.values ?? [];
}

/*
 * ==========================================
 * Row → Object
 * ==========================================
 */

function rowToObject<T>(
  headers: string[],
  row: string[]
): T {
  const item: Record<string, string> = {};

  headers.forEach(
    (header, index) => {
      item[String(header).trim()] =
        normalizeText(row[index]);
    }
  );

  return item as T;
}

/*
 * ==========================================
 * Find Folder
 * ==========================================
 */

async function findFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string
) {
  const escapedName =
    name.replace(/'/g, "\\'");

  const response =
    await drive.files.list({
      q:
        `'${parentId}' in parents and ` +
        `name = '${escapedName}' and ` +
        `mimeType = 'application/vnd.google-apps.folder' and ` +
        `trashed = false`,

      fields: "files(id,name)",

      pageSize: 1,
    });

  return (
    response.data.files?.[0] ??
    null
  );
}

/*
 * ==========================================
 * Get Submitted Files
 * ==========================================
 */

async function getSubmittedFiles(
  drive: ReturnType<typeof google.drive>,
  folderId: string
) {
  const response =
    await drive.files.list({
      q:
        `'${folderId}' in parents and ` +
        `trashed = false`,

      fields:
        "files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime)",

      orderBy: "modifiedTime desc",

      pageSize: 100,
    });

  return (
    response.data.files ?? []
  ).map((file) => ({
    id: file.id ?? "",
    name: file.name ?? "",
    mimeType:
      file.mimeType ?? "",
    size: file.size
      ? Number(file.size)
      : null,
    webViewLink:
      file.webViewLink ?? null,
    createdTime:
      file.createdTime ?? null,
    modifiedTime:
      file.modifiedTime ?? null,
  }));
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
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    /*
     * ======================================
     * 1. ตรวจสอบ Session
     * ======================================
     */

    const sessionToken =
      getSessionToken(
        req.headers.cookie
      );

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error:
          "กรุณาเข้าสู่ระบบก่อน",
      });
    }

    const sessionStudent =
      verifySessionToken(
        sessionToken
      );

    if (!sessionStudent) {
      return res.status(401).json({
        success: false,
        error:
          "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่",
      });
    }

    const studentId =
      normalizeText(
        sessionStudent.student_id
      );

    /*
     * ======================================
     * 2. Google Sheets
     * ======================================
     */

    const spreadsheetId =
      process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error(
        "Missing GOOGLE_SHEET_ID"
      );
    }

    const sheetsAuth =
      getGoogleSheetsAuth();

    const sheets =
      google.sheets({
        version: "v4",
        auth: sheetsAuth,
      });

    const [
      studentsRows,
      assignmentsRows,
      assignmentClassesRows,
    ] = await Promise.all([
      getSheetData(
        sheets,
        spreadsheetId,
        "Students!A1:F"
      ),

      getSheetData(
        sheets,
        spreadsheetId,
        "Assignments!A1:E"
      ),

      getSheetData(
        sheets,
        spreadsheetId,
        "AssignmentClasses!A1:B"
      ),
    ]);

    /*
     * ======================================
     * 3. ตรวจสอบนักเรียน
     * ======================================
     */

    const studentHeaders =
      studentsRows[0]?.map(
        normalizeText
      ) ?? [];

    const students: Student[] =
      studentsRows
        .slice(1)
        .map((row) =>
          rowToObject<Student>(
            studentHeaders,
            row
          )
        );

    const student =
      students.find(
        (item) =>
          normalizeText(
            item.student_id
          ) === studentId &&
          normalizeText(
            item.active
          ).toUpperCase() ===
            "TRUE"
      );

    if (!student) {
      return res.status(401).json({
        success: false,
        error:
          "ไม่พบข้อมูลนักเรียน หรือบัญชีถูกปิดใช้งาน",
      });
    }

    /*
     * ======================================
     * 4. Assignment
     * ======================================
     */

    const assignmentHeaders =
      assignmentsRows[0]?.map(
        normalizeText
      ) ?? [];

    const assignments: Assignment[] =
      assignmentsRows
        .slice(1)
        .map((row) =>
          rowToObject<Assignment>(
            assignmentHeaders,
            row
          )
        );

    /*
     * ======================================
     * 5. Assignment Classes
     * ======================================
     */

    const assignmentClassHeaders =
      assignmentClassesRows[0]?.map(
        normalizeText
      ) ?? [];

    const assignmentClasses:
      AssignmentClass[] =
      assignmentClassesRows
        .slice(1)
        .map((row) =>
          rowToObject<AssignmentClass>(
            assignmentClassHeaders,
            row
          )
        );

    /*
     * ======================================
     * 6. หา Assignment ที่นักเรียนมีสิทธิ์
     * ======================================
     */

    const availableAssignments =
      assignments.filter(
        (assignment) => {
          const active =
            normalizeText(
              assignment.active
            ).toUpperCase() ===
            "TRUE";

          if (!active) {
            return false;
          }

          return assignmentClasses.some(
            (item) =>
              normalizeText(
                item.assignment_id
              ) ===
                normalizeText(
                  assignment.assignment_id
                ) &&
              normalizeText(
                item.class_id
              ) ===
                normalizeText(
                  student.class_id
                )
          );
        }
      );

    /*
     * ======================================
     * 7. Google Drive
     * ======================================
     */

    const submissionsFolderId =
      process.env
        .GOOGLE_DRIVE_SUBMISSIONS_FOLDER_ID;

    if (!submissionsFolderId) {
      throw new Error(
        "Missing GOOGLE_DRIVE_SUBMISSIONS_FOLDER_ID"
      );
    }

    const driveAuth =
      getGoogleDriveAuth();

    const drive =
      google.drive({
        version: "v3",
        auth: driveAuth,
      });

    /*
     * ======================================
     * 8. ตรวจแต่ละ Assignment
     * ======================================
     */

    const assignmentsWithStatus =
      await Promise.all(
        availableAssignments.map(
          async (assignment) => {
            /*
             * หา Folder HW
             */

            const assignmentFolder =
              await findFolder(
                drive,
                assignment.assignment_id,
                submissionsFolderId
              );

            if (!assignmentFolder?.id) {
              return {
                ...assignment,
                submitted: false,
                submittedAt: null,
                files: [],
              };
            }

            /*
             * หา Folder ห้อง
             */

            const classFolder =
              await findFolder(
                drive,
                student.class_id,
                assignmentFolder.id
              );

            if (!classFolder?.id) {
              return {
                ...assignment,
                submitted: false,
                submittedAt: null,
                files: [],
              };
            }

            /*
             * หา Folder นักเรียน
             */

            const studentFolderName =
              `${student.student_id}_${student.fullname}`;

            const studentFolder =
              await findFolder(
                drive,
                studentFolderName,
                classFolder.id
              );

            if (!studentFolder?.id) {
              return {
                ...assignment,
                submitted: false,
                submittedAt: null,
                files: [],
              };
            }

            /*
             * อ่านไฟล์
             */

            const files =
              await getSubmittedFiles(
                drive,
                studentFolder.id
              );

            if (files.length === 0) {
              return {
                ...assignment,
                submitted: false,
                submittedAt: null,
                files: [],
              };
            }

            /*
             * หาเวลาส่งล่าสุด
             */

            const latestDate =
              files
                .map(
                  (file) =>
                    file.modifiedTime
                )
                .filter(
                  (
                    value
                  ): value is string =>
                    Boolean(value)
                )
                .sort()
                .reverse()[0] ??
              null;

            return {
              ...assignment,
              submitted: true,
              submittedAt:
                latestDate,
              files,
            };
          }
        )
      );

    /*
     * ======================================
     * 9. Response
     * ======================================
     */

    return res.status(200).json({
      success: true,

      student: {
        student_id:
          student.student_id,

        fullname:
          student.fullname,

        class_id:
          student.class_id,

        no: student.no,
      },

      assignments:
        assignmentsWithStatus,
    });
  } catch (error: any) {
    console.error(
      "Submission status error:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        "ไม่สามารถตรวจสอบสถานะการส่งงานได้",

      details:
        error?.message ||
        "Unknown error",
    });
  }
}