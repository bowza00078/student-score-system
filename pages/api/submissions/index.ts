import type {
  NextApiRequest,
  NextApiResponse,
} from "next";

import { google } from "googleapis";
import formidable, { File } from "formidable";
import fs from "fs";
import path from "path";

import {
  getSessionToken,
  verifySessionToken,
} from "../../../lib/session";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

/*
 * ==========================================
 * Helper
 * ==========================================
 */

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
 * อ่านข้อมูลจาก Google Sheets
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
 * แปลง Row เป็น Object
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
 * ทำชื่อ Folder ให้ปลอดภัย
 * ==========================================
 */

function sanitizeFolderName(
  value: string
) {
  return value
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * ==========================================
 * ทำ File ให้เป็น Array เสมอ
 * ==========================================
 */

function normalizeFiles(
  files:
    | File
    | File[]
    | undefined
): File[] {
  if (!files) {
    return [];
  }

  return Array.isArray(files)
    ? files
    : [files];
}

/*
 * ==========================================
 * หา Folder ถ้ามีอยู่แล้ว
 * ถ้าไม่มีให้สร้างใหม่
 * ==========================================
 */

async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string
) {
  const escapedName =
    name.replace(/'/g, "\\'");

  const search =
    await drive.files.list({
      q:
        `'${parentId}' in parents and ` +
        `name = '${escapedName}' and ` +
        `mimeType = 'application/vnd.google-apps.folder' and ` +
        `trashed = false`,
      fields: "files(id,name)",
      pageSize: 10,
    });

  const existingFolder =
    search.data.files?.[0];

  if (existingFolder?.id) {
    return existingFolder.id;
  }

  const created =
    await drive.files.create({
      requestBody: {
        name,
        mimeType:
          "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id,name",
    });

  if (!created.data.id) {
    throw new Error(
      `ไม่สามารถสร้างโฟลเดอร์ ${name} ได้`
    );
  }

  return created.data.id;
}

/*
 * ==========================================
 * หาไฟล์เดิม
 * ==========================================
 */

async function findExistingFile(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string
) {
  const escapedName =
    name.replace(/'/g, "\\'");

  const search =
    await drive.files.list({
      q:
        `'${parentId}' in parents and ` +
        `name = '${escapedName}' and ` +
        `trashed = false`,
      fields:
        "files(id,name,mimeType)",
      pageSize: 10,
    });

  return (
    search.data.files?.[0] ??
    null
  );
}

/*
 * ==========================================
 * Upload หรือแทนที่ไฟล์
 * ==========================================
 */

async function uploadOrReplaceFile(
  drive: ReturnType<typeof google.drive>,
  file: File,
  parentId: string
) {
  const fileName =
    path.basename(
      file.originalFilename ||
        "uploaded-file"
    );

  const existingFile =
    await findExistingFile(
      drive,
      fileName,
      parentId
    );

  const media = {
    mimeType:
      file.mimetype ||
      "application/octet-stream",

    body: fs.createReadStream(
      file.filepath
    ),
  };

  /*
   * ถ้ามีไฟล์ชื่อเดียวกันอยู่แล้ว
   * ให้อัปเดตไฟล์เดิม
   */

  if (existingFile?.id) {
    const updated =
      await drive.files.update({
        fileId:
          existingFile.id,

        media,

        fields:
          "id,name,mimeType,webViewLink,size,modifiedTime",
      });

    return {
      action: "replaced",
      id: updated.data.id,
      name: updated.data.name,
      webViewLink:
        updated.data.webViewLink,
    };
  }

  /*
   * ถ้ายังไม่มี
   * ให้สร้างไฟล์ใหม่
   */

  const created =
    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentId],
        mimeType:
          file.mimetype ||
          "application/octet-stream",
      },

      media,

      fields:
        "id,name,mimeType,webViewLink,size,createdTime",
    });

  return {
    action: "created",
    id: created.data.id,
    name: created.data.name,
    webViewLink:
      created.data.webViewLink,
  };
}

/*
 * ==========================================
 * API Handler
 * ==========================================
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  /*
   * รับเฉพาะ POST
   */

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  /*
   * ==========================================
   * ตรวจสอบ Session ก่อนรับไฟล์
   * ==========================================
   */

  const sessionToken =
    getSessionToken(
      req.headers.cookie
    );

  if (!sessionToken) {
    return res.status(401).json({
      success: false,
      error:
        "กรุณาเข้าสู่ระบบก่อนส่งงาน",
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
   * ตั้งค่า Formidable
   */

  const MAX_FILE_SIZE =
  Math.floor(
    4.2 * 1024 * 1024
  );

const form =
  formidable({
    /*
     * ระบบจะส่งทีละ 1 ไฟล์
     * ต่อ 1 Request
     */

    multiples: false,

    maxFiles: 1,

    /*
     * จำกัดประมาณ 4.2 MB
     * เพื่อไม่ให้ชนเพดาน
     * Request ของ Vercel
     */

    maxFileSize:
      MAX_FILE_SIZE,

    keepExtensions: true,
  });

  let uploadedFiles: File[] = [];

  try {
    /*
     * ======================================
     * 1. อ่าน Form Data
     * ======================================
     */

    const [fields, files] =
      await form.parse(req);

    const assignmentId =
      normalizeText(
        fields.assignmentId?.[0]
      );

    uploadedFiles =
      normalizeFiles(
        files.files
      );

    /*
     * ======================================
     * 2. ตรวจข้อมูล
     * ======================================
     */

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        error:
          "ไม่พบ assignmentId",
      });
    }

    if (
      uploadedFiles.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          "กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์",
      });
    }

    /*
     * ======================================
     * 3. ตรวจประเภทไฟล์
     *
     * อนุญาต:
     * PDF
     * JPG
     * JPEG
     * PNG
     * WebP
     * ======================================
     */

    const allowedMimeTypes =
      new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ]);

    const allowedExtensions = [
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ];

    const invalidFile =
      uploadedFiles.find(
        (file) => {
          const fileName =
            (
              file.originalFilename ||
              ""
            ).toLowerCase();

          const extensionAllowed =
            allowedExtensions.some(
              (extension) =>
                fileName.endsWith(
                  extension
                )
            );

          const mimeAllowed =
            file.mimetype
              ? allowedMimeTypes.has(
                  file.mimetype
                )
              : false;

          return (
            !extensionAllowed ||
            !mimeAllowed
          );
        }
      );

    if (invalidFile) {
      return res.status(400).json({
        success: false,
        error:
          "ระบบรองรับเฉพาะ PDF, JPG, JPEG, PNG และ WebP เท่านั้น",

        fileName:
          invalidFile.originalFilename,
      });
    }

    /*
     * ======================================
     * 4. Google Sheets
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

    /*
     * อ่านข้อมูล 3 Sheet พร้อมกัน
     */

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
     * 5. ตรวจสอบนักเรียนจาก Session
     * ======================================
     */

    if (
      studentsRows.length < 2
    ) {
      return res.status(404).json({
        success: false,
        error:
          "ยังไม่มีข้อมูลนักเรียน",
      });
    }

    const studentHeaders =
      studentsRows[0].map(
        normalizeText
      );

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
     * 6. ตรวจ Assignment
     * ======================================
     */

    if (
      assignmentsRows.length < 2
    ) {
      return res.status(404).json({
        success: false,
        error:
          "ยังไม่มีข้อมูลงาน",
      });
    }

    const assignmentHeaders =
      assignmentsRows[0].map(
        normalizeText
      );

    const assignments:
      Assignment[] =
      assignmentsRows
        .slice(1)
        .map((row) =>
          rowToObject<Assignment>(
            assignmentHeaders,
            row
          )
        );

    const assignment =
      assignments.find(
        (item) =>
          normalizeText(
            item.assignment_id
          ) === assignmentId
      );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error:
          "ไม่พบงานที่ระบุ",
      });
    }

    /*
     * ตรวจว่างานเปิดอยู่หรือไม่
     */

    if (
      normalizeText(
        assignment.active
      ).toUpperCase() !==
      "TRUE"
    ) {
      return res.status(403).json({
        success: false,
        error:
          "งานนี้ยังไม่เปิดให้ส่ง",
      });
    }

    /*
     * ======================================
     * 7. ตรวจสิทธิ์ห้องเรียน
     * ======================================
     */

    if (
      assignmentClassesRows.length <
      2
    ) {
      return res.status(403).json({
        success: false,
        error:
          "ยังไม่ได้กำหนดห้องเรียนสำหรับงานนี้",
      });
    }

    const assignmentClassHeaders =
      assignmentClassesRows[0].map(
        normalizeText
      );

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

    const allowed =
      assignmentClasses.some(
        (item) =>
          normalizeText(
            item.assignment_id
          ) === assignmentId &&
          normalizeText(
            item.class_id
          ) ===
            normalizeText(
              student.class_id
            )
      );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        error:
          "นักเรียนห้องนี้ไม่มีสิทธิ์ส่งงานนี้",

        classId:
          student.class_id,

        assignmentId,
      });
    }

    /*
     * ======================================
     * 8. Google Drive
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
     * 9. Folder Assignment
     *
     * Submissions
     * └── HW001
     * ======================================
     */

    const assignmentFolderId =
      await findOrCreateFolder(
        drive,

        sanitizeFolderName(
          assignment.assignment_id
        ),

        submissionsFolderId
      );

    /*
     * ======================================
     * 10. Folder ห้อง
     *
     * HW001
     * └── M6-1
     * ======================================
     */

    const classFolderId =
      await findOrCreateFolder(
        drive,

        sanitizeFolderName(
          student.class_id
        ),

        assignmentFolderId
      );

    /*
     * ======================================
     * 11. Folder นักเรียน
     *
     * M6-1
     * └── รหัสนักเรียน_ชื่อ
     * ======================================
     */

    const studentFolderName =
      sanitizeFolderName(
        `${student.student_id}_${student.fullname}`
      );

    const studentFolderId =
      await findOrCreateFolder(
        drive,

        studentFolderName,

        classFolderId
      );

    /*
     * ======================================
     * 12. Upload ทุกไฟล์
     * ======================================
     */

    const uploaded = [];

    for (
      const file of uploadedFiles
    ) {
      const result =
        await uploadOrReplaceFile(
          drive,
          file,
          studentFolderId
        );

      uploaded.push(result);
    }

    /*
     * ======================================
     * 13. ลบ Temporary Files
     * ======================================
     */

    for (
      const file of uploadedFiles
    ) {
      try {
        if (
          fs.existsSync(
            file.filepath
          )
        ) {
          fs.unlinkSync(
            file.filepath
          );
        }
      } catch {
        /*
         * ถ้าลบ Temporary ไม่สำเร็จ
         * ไม่ให้กระทบการส่งงาน
         */
      }
    }

    /*
     * ======================================
     * 14. ส่งผลสำเร็จ
     * ======================================
     */

    return res.status(200).json({
      success: true,

      message:
        "ส่งงานสำเร็จ",

      assignment: {
        assignment_id:
          assignment.assignment_id,

        name:
          assignment.name,

        due_date:
          assignment.due_date,
      },

      student: {
        student_id:
          student.student_id,

        fullname:
          student.fullname,

        class_id:
          student.class_id,

        no:
          student.no,
      },

      folder: {
        assignment:
          assignment.assignment_id,

        class:
          student.class_id,

        student:
          studentFolderName,
      },

      files: uploaded,
    });
  } catch (error: any) {
    console.error(
      "Submission upload error:",
      error
    );

    /*
     * ======================================
     * Cleanup เมื่อเกิด Error
     * ======================================
     */

    for (
      const file of uploadedFiles
    ) {
      try {
        if (
          file.filepath &&
          fs.existsSync(
            file.filepath
          )
        ) {
          fs.unlinkSync(
            file.filepath
          );
        }
      } catch {
        // ignore cleanup errors
      }
    }

    return res.status(500).json({
      success: false,

      error:
        "เกิดข้อผิดพลาดในการส่งงาน",

      details:
        error?.message ||
        "Unknown error",
    });
  }
}