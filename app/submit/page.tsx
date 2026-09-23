"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  LogOut,
  Upload,
  UserRound,
  X,
} from "lucide-react";

type AssignmentFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  webViewLink: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
};

type Assignment = {
  assignment_id: string;
  name: string;
  description: string;
  due_date: string;
  active: string;
  submitted: boolean;
  submittedAt: string | null;
  files: AssignmentFile[];
};

type Student = {
  student_id: string;
  fullname: string;
  class_id: string;
  no: string;
};

const ACCEPTED_EXTENSIONS =
  ".pdf,.jpg,.jpeg,.png,.webp";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILES = 10;

const MAX_FILE_SIZE =
  Math.floor(
    4.2 * 1024 * 1024
  );

function formatClassName(
  classId: string
) {
  const match =
    classId
      .trim()
      .match(
        /^M(\d+)-(\d+)$/i
      );

  if (match) {
    return `ม.${match[1]}/${match[2]}`;
  }

  return classId;
}

function formatDate(
  dateString: string
) {
  if (!dateString) {
    return "ไม่ระบุ";
  }

  const date =
    new Date(dateString);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return dateString;
  }

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(date);
}

function formatDateTime(
  dateString: string | null
) {
  if (!dateString) {
    return "ไม่ระบุ";
  }

  const date =
    new Date(dateString);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "ไม่ระบุ";
  }

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function formatFileSize(
  size: number | null
) {
  if (!size) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    1024 /
    1024
  ).toFixed(2)} MB`;
}

function isAcceptedFile(
  file: File
) {
  if (
    ACCEPTED_TYPES.includes(
      file.type
    )
  ) {
    return true;
  }

  const name =
    file.name.toLowerCase();

  return [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
  ].some((extension) =>
    name.endsWith(extension)
  );
}

function getFileIcon(
  fileName: string,
  mimeType?: string
) {
  if (
    mimeType ===
      "application/pdf" ||
    fileName
      .toLowerCase()
      .endsWith(".pdf")
  ) {
    return (
      <FileText
        size={20}
        className="text-red-500"
      />
    );
  }

  return (
    <ImageIcon
      size={20}
      className="text-blue-500"
    />
  );
}

export default function SubmitPage() {
  const router =
    useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    student,
    setStudent,
  ] =
    useState<Student | null>(
      null
    );

  const [
    assignments,
    setAssignments,
  ] =
    useState<Assignment[]>([]);

  const [
    selectedAssignmentId,
    setSelectedAssignmentId,
  ] =
    useState<string | null>(
      null
    );

  const [files, setFiles] =
    useState<File[]>([]);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [
    loadingStatus,
    setLoadingStatus,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    uploadCurrent,
    setUploadCurrent,
  ] = useState(0);

  const [
    uploadTotal,
    setUploadTotal,
  ] = useState(0);

  const [
    viewingFilesId,
    setViewingFilesId,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setCheckingSession(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/auth/session",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.authenticated ||
        !data.student
      ) {
        router.replace("/");
        return;
      }

      setStudent(
        data.student
      );

      await loadSubmissionStatus();
    } catch {
      setError(
        "ไม่สามารถตรวจสอบการเข้าสู่ระบบได้"
      );
    } finally {
      setCheckingSession(false);
    }
  }

  async function loadSubmissionStatus() {
    setLoadingStatus(true);

    try {
      const response =
        await fetch(
          "/api/submissions/status",
          {
            method: "POST",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        router.replace("/");
        return;
      }

      if (!response.ok) {
        setError(
          data.error ||
            "ไม่สามารถตรวจสอบสถานะการส่งงานได้"
        );
        return;
      }

      setStudent(
        data.student
      );

      setAssignments(
        data.assignments || []
      );
    } catch {
      setError(
        "ไม่สามารถตรวจสอบสถานะการส่งงานได้"
      );
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch(
        "/api/auth/session",
        {
          method: "DELETE",
        }
      );
    } finally {
      setStudent(null);
      setAssignments([]);
      setSelectedAssignmentId(
        null
      );
      setViewingFilesId(
        null
      );
      setFiles([]);
      setError("");
      setSuccess("");

      router.replace("/");
    }
  }

  function handleSelectAssignment(
    assignmentId: string
  ) {
    setSelectedAssignmentId(
      assignmentId
    );

    setViewingFilesId(
      null
    );

    setFiles([]);
    setError("");
    setSuccess("");
    setUploadCurrent(0);
    setUploadTotal(0);
  }

  function addFiles(
    selectedFiles:
      | FileList
      | null
  ) {
    if (!selectedFiles) {
      return;
    }

    setError("");
    setSuccess("");

    const newFiles =
      Array.from(
        selectedFiles
      );

    const invalidFile =
      newFiles.find(
        (file) =>
          !isAcceptedFile(
            file
          )
      );

    if (invalidFile) {
      setError(
        `ไฟล์ "${invalidFile.name}" ไม่รองรับ ระบบรองรับเฉพาะ PDF, JPG, JPEG, PNG และ WebP`
      );
      return;
    }

    const tooLarge =
      newFiles.find(
        (file) =>
          file.size >
          MAX_FILE_SIZE
      );

    if (tooLarge) {
      setError(
        `ไฟล์ "${tooLarge.name}" มีขนาดเกิน 4.2 MB`
      );
      return;
    }

    const combined = [
      ...files,
      ...newFiles,
    ];

    if (
      combined.length >
      MAX_FILES
    ) {
      setError(
        `สามารถส่งได้สูงสุด ${MAX_FILES} ไฟล์ต่อครั้ง`
      );
      return;
    }

    const uniqueFiles =
      combined.filter(
        (
          file,
          index,
          array
        ) =>
          index ===
          array.findIndex(
            (item) =>
              item.name ===
                file.name &&
              item.size ===
                file.size &&
              item.lastModified ===
                file.lastModified
          )
      );

    setFiles(
      uniqueFiles
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  function removeFile(
    index: number
  ) {
    setFiles(
      (current) =>
        current.filter(
          (
            _,
            fileIndex
          ) =>
            fileIndex !==
            index
        )
    );
  }

  /*
   * ========================================
   * ส่งงานทีละไฟล์อัตโนมัติ
   * ========================================
   */

  async function handleSubmit(
  e: React.FormEvent<HTMLFormElement>
) {
  e.preventDefault();

  if (!student) {
    router.replace("/");
    return;
  }

  if (!selectedAssignmentId) {
    setError(
      "กรุณาเลือกงานก่อน"
    );
    return;
  }

  if (files.length === 0) {
    setError(
      "กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์"
    );
    return;
  }

  setError("");
  setSuccess("");
  setUploading(true);

  const filesToUpload = [
    ...files,
  ];

  const total =
    filesToUpload.length;

  let successCount = 0;
  let processedCount = 0;
  let unauthorized = false;

  const failedIndexes =
    new Set<number>();

  setUploadTotal(total);
  setUploadCurrent(0);

  /*
   * ========================================
   * ส่งไฟล์หนึ่งไฟล์
   * ========================================
   */

  async function uploadOne(
    file: File
  ) {
    const formData =
      new FormData();

    formData.append(
      "assignmentId",
      selectedAssignmentId!
    );

    formData.append(
      "files",
      file
    );

    const response =
      await fetch(
        "/api/submissions",
        {
          method: "POST",
          body: formData,
        }
      );

    let data: {
      error?: string;
    } = {};

    try {
      data =
        await response.json();
    } catch {
      data = {};
    }

    if (
      response.status === 401
    ) {
      return {
        ok: false,
        unauthorized: true,
        error:
          "Session หมดอายุ",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        unauthorized: false,
        error:
          data.error ||
          "กรุณาลองใหม่อีกครั้ง",
      };
    }

    return {
      ok: true,
      unauthorized: false,
      error: "",
    };
  }

  try {
    /*
     * ========================================
     * ขั้นที่ 1
     * ส่งไฟล์แรกก่อน
     *
     * เพื่อให้ Folder งาน / ห้อง / นักเรียน
     * ถูกสร้างเรียบร้อยก่อนเริ่ม Parallel
     * ========================================
     */

    const firstFile =
      filesToUpload[0];

    const firstResult =
      await uploadOne(
        firstFile
      );

    if (
      firstResult.unauthorized
    ) {
      router.replace("/");
      return;
    }

    processedCount = 1;
    setUploadCurrent(
      processedCount
    );

    if (!firstResult.ok) {
      /*
       * ถ้าไฟล์แรกยังส่งไม่ได้
       * ให้หยุดก่อน เพราะอาจเป็นปัญหา
       * Assignment / Drive / Folder
       */

      setFiles(
        filesToUpload
      );

      setError(
        `ไม่สามารถส่งไฟล์ "${firstFile.name}" ได้: ${firstResult.error}`
      );

      await loadSubmissionStatus();

      return;
    }

    successCount = 1;

    /*
     * ถ้ามีเพียง 1 ไฟล์
     * ไม่ต้องทำ Parallel ต่อ
     */

    if (total === 1) {
      setFiles([]);

      setSuccess(
        "ส่งงานสำเร็จแล้ว 1 ไฟล์"
      );

      await loadSubmissionStatus();

      return;
    }

    /*
     * ========================================
     * ขั้นที่ 2
     * ไฟล์ที่เหลือส่งพร้อมกันสูงสุด 2 ไฟล์
     * ========================================
     */

    let nextIndex = 1;

    async function worker() {
      while (true) {
        if (unauthorized) {
          return;
        }

        const currentIndex =
          nextIndex;

        nextIndex++;

        if (
          currentIndex >=
          total
        ) {
          return;
        }

        const file =
          filesToUpload[
            currentIndex
          ];

        try {
          const result =
            await uploadOne(
              file
            );

          if (
            result.unauthorized
          ) {
            unauthorized = true;
            return;
          }

          if (result.ok) {
            successCount++;
          } else {
            failedIndexes.add(
              currentIndex
            );
          }
        } catch {
          failedIndexes.add(
            currentIndex
          );
        } finally {
          processedCount++;

          setUploadCurrent(
            processedCount
          );
        }
      }
    }

    /*
     * Worker 2 ตัว =
     * ส่งพร้อมกันสูงสุด 2 ไฟล์
     */

    const workerCount =
  Math.min(
    4,
    total - 1
  );

    await Promise.all(
      Array.from(
        {
          length:
            workerCount,
        },
        () => worker()
      )
    );

    /*
     * Session หมดอายุระหว่างส่ง
     */

    if (unauthorized) {
      router.replace("/");
      return;
    }

    /*
     * ========================================
     * ตรวจผลทั้งหมด
     * ========================================
     */

    const failedFiles =
      filesToUpload.filter(
        (_, index) =>
          failedIndexes.has(
            index
          )
      );

    if (
      failedFiles.length >
      0
    ) {
      /*
       * เก็บเฉพาะไฟล์ที่ล้มเหลว
       * เพื่อให้นักเรียนกดส่งซ้ำได้
       */

      setFiles(
        failedFiles
      );

      setError(
        `ส่งสำเร็จแล้ว ${successCount} จาก ${total} ไฟล์ มี ${failedFiles.length} ไฟล์ที่ยังส่งไม่สำเร็จ กรุณากดส่งอีกครั้ง`
      );

      await loadSubmissionStatus();

      return;
    }

    /*
     * ทุกไฟล์สำเร็จ
     */

    setFiles([]);

    setSuccess(
      `ส่งงานสำเร็จแล้วทั้งหมด ${total} ไฟล์`
    );

    await loadSubmissionStatus();
  } catch {
    setError(
      "เกิดข้อผิดพลาดในการส่งงาน กรุณาลองใหม่อีกครั้ง"
    );

    await loadSubmissionStatus();
  } finally {
    setUploading(false);
    setUploadCurrent(0);
    setUploadTotal(0);
  }
}

  function toggleFiles(
    assignmentId: string
  ) {
    setViewingFilesId(
      (current) =>
        current ===
        assignmentId
          ? null
          : assignmentId
    );
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-800 sm:px-8">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <BookOpen
                size={32}
                strokeWidth={1.8}
                className="text-blue-700"
              />
            </div>

            <p className="mt-5 text-sm font-medium text-slate-600">
              กำลังตรวจสอบการเข้าสู่ระบบ...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="min-h-screen bg-slate-50" />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="flex items-center justify-between py-4 sm:py-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <BookOpen
                  size={25}
                  strokeWidth={1.8}
                  className="text-blue-800"
                />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold text-blue-950 sm:text-base">
                  โรงเรียนเนินมะปรางศึกษาวิทยา
                </h1>

                <p className="mt-0.5 text-[10px] tracking-wide text-blue-600 sm:text-xs">
                  STUDENT SCORE PORTAL
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-blue-700 sm:px-4"
              >
                <BarChart3
                  size={17}
                />

                <span className="hidden sm:inline">
                  คะแนนของฉัน
                </span>
              </Link>

              <Link
                href="/submit"
                className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 sm:px-4"
              >
                <Upload
                  size={17}
                />

                <span className="hidden sm:inline">
                  ส่งงาน
                </span>
              </Link>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 sm:px-4"
              >
                <LogOut
                  size={17}
                />

                <span className="hidden sm:inline">
                  ออกจากระบบ
                </span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">
                นักเรียน
              </p>

              <h2 className="mt-1 break-words text-2xl font-bold text-slate-900">
                {student.fullname}
              </h2>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                <span>
                  รหัส{" "}
                  <strong className="text-slate-700">
                    {
                      student.student_id
                    }
                  </strong>
                </span>

                <span>
                  เลขที่{" "}
                  <strong className="text-slate-700">
                    {student.no}
                  </strong>
                </span>

                <span>
                  ห้อง{" "}
                  <strong className="text-slate-700">
                    {formatClassName(
                      student.class_id
                    )}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
              <UserRound
                size={28}
                strokeWidth={1.7}
                className="text-blue-700"
              />
            </div>
          </div>
        </div>

        {error &&
          !selectedAssignmentId && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

        <div className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">
                ASSIGNMENTS
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                งานที่เปิดให้ส่ง
              </h2>
            </div>

            {loadingStatus && (
              <span className="text-xs text-slate-400">
                กำลังตรวจสอบสถานะ...
              </span>
            )}
          </div>

          {assignments.length ===
          0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <BookOpen
                size={34}
                className="mx-auto text-slate-300"
              />

              <p className="mt-4 font-medium text-slate-700">
                ขณะนี้ยังไม่มีงานที่เปิดให้ส่ง
              </p>

              <p className="mt-1 text-sm text-slate-400">
                กรุณาตรวจสอบอีกครั้งภายหลัง
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {assignments.map(
                (assignment) => {
                  const isSelected =
                    selectedAssignmentId ===
                    assignment.assignment_id;

                  const showingFiles =
                    viewingFilesId ===
                    assignment.assignment_id;

                  return (
                    <div
                      key={
                        assignment.assignment_id
                      }
                      className={`rounded-2xl border bg-white shadow-sm transition ${
                        isSelected
                          ? "border-blue-400 ring-2 ring-blue-50"
                          : "border-slate-200"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={
                          uploading
                        }
                        onClick={() =>
                          handleSelectAssignment(
                            assignment.assignment_id
                          )
                        }
                        className="w-full p-5 text-left disabled:cursor-not-allowed"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                                {
                                  assignment.assignment_id
                                }
                              </span>

                              <span className="text-xs text-slate-400">
                                กำหนดส่ง{" "}
                                {formatDate(
                                  assignment.due_date
                                )}
                              </span>
                            </div>

                            <h3 className="mt-3 text-lg font-bold text-slate-900">
                              {
                                assignment.name
                              }
                            </h3>

                            {assignment.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                {
                                  assignment.description
                                }
                              </p>
                            )}
                          </div>

                          {assignment.submitted ? (
                            <CheckCircle2
                              size={25}
                              className="shrink-0 text-emerald-600"
                            />
                          ) : (
                            <Upload
                              size={22}
                              className="shrink-0 text-blue-600"
                            />
                          )}
                        </div>

                        <div className="mt-5">
                          {assignment.submitted ? (
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                                  <CheckCircle2
                                    size={
                                      18
                                    }
                                  />
                                  ส่งแล้ว
                                </div>

                                <span className="text-xs text-emerald-600">
                                  {
                                    assignment
                                      .files
                                      .length
                                  }{" "}
                                  ไฟล์
                                </span>
                              </div>

                              {assignment.submittedAt && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                                  <Clock3
                                    size={
                                      14
                                    }
                                  />

                                  ส่งล่าสุด{" "}
                                  {formatDateTime(
                                    assignment.submittedAt
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                <Clock3
                                  size={
                                    18
                                  }
                                />
                                ยังไม่ส่ง
                              </div>
                            </div>
                          )}
                        </div>
                      </button>

                      <div className="border-t border-slate-100 px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {assignment.submitted && (
                            <button
                              type="button"
                              disabled={
                                uploading
                              }
                              onClick={() =>
                                toggleFiles(
                                  assignment.assignment_id
                                )
                              }
                              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FileText
                                size={
                                  17
                                }
                              />

                              {showingFiles
                                ? "ซ่อนไฟล์"
                                : "ดูไฟล์ที่ส่ง"}
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={
                              uploading
                            }
                            onClick={() =>
                              handleSelectAssignment(
                                assignment.assignment_id
                              )
                            }
                            className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Upload
                              size={
                                17
                              }
                            />

                            {assignment.submitted
                              ? "ส่งงานอีกครั้ง"
                              : "ส่งงาน"}
                          </button>
                        </div>
                      </div>

                      {showingFiles && (
                        <div className="border-t border-slate-100 bg-slate-50 px-5 py-5">
                          <p className="text-sm font-semibold text-slate-800">
                            ไฟล์ที่ส่ง
                          </p>

                          <div className="mt-3 space-y-2">
                            {assignment.files.map(
                              (
                                file
                              ) => (
                                <div
                                  key={
                                    file.id
                                  }
                                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    {getFileIcon(
                                      file.name,
                                      file.mimeType
                                    )}

                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-slate-700">
                                        {
                                          file.name
                                        }
                                      </p>

                                      <p className="mt-0.5 text-xs text-slate-400">
                                        {formatFileSize(
                                          file.size
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  {file.webViewLink && (
                                    <a
                                      href={
                                        file.webViewLink
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                                    >
                                      เปิดไฟล์
                                      <ExternalLink
                                        size={
                                          14
                                        }
                                      />
                                    </a>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {selectedAssignmentId && (
          <form
            onSubmit={
              handleSubmit
            }
            className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            {(() => {
              const selectedAssignment =
                assignments.find(
                  (
                    assignment
                  ) =>
                    assignment.assignment_id ===
                    selectedAssignmentId
                );

              if (
                !selectedAssignment
              ) {
                return null;
              }

              return (
                <>
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      {
                        selectedAssignment.assignment_id
                      }
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                      {
                        selectedAssignment.name
                      }
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      เลือกไฟล์ได้สูงสุด 10 ไฟล์ ระบบจะจัดคิวและส่งพร้อมกันสูงสุด 2 ไฟล์
                    </p>
                  </div>

                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept={
                      ACCEPTED_EXTENSIONS
                    }
                    multiple
                    disabled={
                      uploading
                    }
                    className="hidden"
                    onChange={(
                      e
                    ) =>
                      addFiles(
                        e.target
                          .files
                      )
                    }
                  />

                  <button
                    type="button"
                    disabled={
                      uploading
                    }
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="mt-6 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload
                      size={30}
                      className="text-blue-600"
                    />

                    <span className="mt-3 font-semibold text-slate-800">
                      เลือกไฟล์ส่งงาน
                    </span>

                    <span className="mt-1 text-xs text-slate-500">
                      PDF, JPG,
                      JPEG, PNG หรือ
                      WebP
                    </span>

                    <span className="mt-1 text-xs text-slate-400">
                      สูงสุด 10 ไฟล์
                      / ไฟล์ละไม่เกิน
                      4.2 MB
                    </span>
                  </button>

                  {files.length >
                    0 && (
                    <div className="mt-5 space-y-2">
                      {files.map(
                        (
                          file,
                          index
                        ) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              {getFileIcon(
                                file.name,
                                file.type
                              )}

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-700">
                                  {
                                    file.name
                                  }
                                </p>

                                <p className="text-xs text-slate-400">
                                  {formatFileSize(
                                    file.size
                                  )}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={
                                uploading
                              }
                              onClick={() =>
                                removeFile(
                                  index
                                )
                              }
                              className="ml-3 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="ลบไฟล์"
                            >
                              <X
                                size={
                                  18
                                }
                              />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {uploading &&
                    uploadTotal >
                      0 && (
                      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="font-medium text-blue-700">
                            กำลังส่งไฟล์...
                          </span>

                          <span className="font-semibold text-blue-700">
                            {
                              uploadCurrent
                            }
                            /
                            {
                              uploadTotal
                            }
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{
                              width:
                                uploadTotal >
                                0
                                  ? `${
                                      (uploadCurrent /
                                        uploadTotal) *
                                      100
                                    }%`
                                  : "0%",
                            }}
                          />
                        </div>
                      </div>
                    )}

                  {error && (
                    <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      <CheckCircle2
                        size={20}
                        className="mt-0.5 shrink-0"
                      />

                      <span>
                        {
                          success
                        }
                      </span>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={
                        uploading
                      }
                      onClick={() => {
                        setSelectedAssignmentId(
                          null
                        );
                        setFiles(
                          []
                        );
                        setError(
                          ""
                        );
                        setSuccess(
                          ""
                        );
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ยกเลิก
                    </button>

                    <button
                      type="submit"
                      disabled={
                        uploading ||
                        files.length ===
                          0
                      }
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload
                        size={18}
                      />

                      {uploading
                        ? `กำลังส่ง ${uploadCurrent}/${uploadTotal} ไฟล์...`
                        : selectedAssignment.submitted
                        ? "ส่งงานอีกครั้ง"
                        : "ส่งงาน"}
                    </button>
                  </div>
                </>
              );
            })()}
          </form>
        )}
      </section>
    </main>
  );
}