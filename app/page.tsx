"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  LogOut,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";

type ScoreItem = {
  label: string;
  value: string;
  maxScore: string;
  type: string;
};

type StudentScore = {
  student_id: string;
  no: string;
  fullname: string;
  class_id: string;
  scores: ScoreItem[];
};

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

function getScoreStatus(
  value: string,
  maxScore: string
) {
  const scoreValue =
    Number(value);

  const max =
    Number(maxScore);

  if (
    value === "" ||
    !Number.isFinite(
      scoreValue
    ) ||
    !Number.isFinite(max) ||
    max <= 0
  ) {
    return {
      status:
        "ยังไม่มีคะแนน",

      box:
        "border-amber-100 bg-amber-50 text-amber-700",

      icon: (
        <AlertCircle
          size={24}
          strokeWidth={2}
        />
      ),
    };
  }

  if (
    scoreValue >=
    max * 0.5
  ) {
    return {
      status: "ผ่าน",

      box:
        "border-emerald-100 bg-emerald-50 text-emerald-700",

      icon: (
        <CheckCircle2
          size={24}
          strokeWidth={2}
        />
      ),
    };
  }

  return {
    status: "ไม่ผ่าน",

    box:
      "border-red-100 bg-red-50 text-red-600",

    icon: (
      <XCircle
        size={24}
        strokeWidth={2}
      />
    ),
  };
}

export default function Home() {
  const [
    studentId,
    setStudentId,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    student,
    setStudent,
  ] =
    useState<StudentScore | null>(
      null
    );

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  /*
   * ========================================
   * ตรวจ Session เมื่อเปิดหน้า
   * ========================================
   */

  useEffect(() => {
    loadExistingSession();
  }, []);

  async function loadExistingSession() {
    setCheckingSession(true);

    try {
      /*
       * GET /api/score
       * จะอ่าน student_id
       * จาก Session Cookie
       */

      const response =
        await fetch(
          "/api/score",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      /*
       * 401 = ยังไม่ได้ Login
       * ไม่ถือว่าเป็น Error
       * ให้แสดงหน้า Login ตามปกติ
       */

      if (
        response.status ===
        401
      ) {
        setStudent(null);
        return;
      }

      const data: {
        student?: StudentScore;
        error?: string;
      } =
        await response.json();

      if (!response.ok) {
        setStudent(null);

        setError(
          data.error ||
            "ไม่สามารถตรวจสอบข้อมูลได้"
        );

        return;
      }

      if (data.student) {
        setStudent(
          data.student
        );

        setError("");
      }
    } catch {
      setStudent(null);

      setError(
        "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setCheckingSession(
        false
      );
    }
  }

  /*
   * ========================================
   * Login ครั้งแรก
   * ========================================
   */

  async function handleCheckScore(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      /*
       * POST /api/score
       * ตรวจ studentId + password
       * และสร้าง Session Cookie
       */

      const response =
        await fetch(
          "/api/score",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                studentId:
                  studentId.trim(),

                password:
                  password.trim(),
              }),
          }
        );

      const data: {
        student?: StudentScore;
        error?: string;
      } =
        await response.json();

      if (!response.ok) {
        setStudent(null);

        setError(
          data.error ||
            "ไม่สามารถตรวจสอบข้อมูลได้"
        );

        return;
      }

      if (!data.student) {
        setStudent(null);

        setError(
          "ไม่พบข้อมูลนักเรียน"
        );

        return;
      }

      setStudent(
        data.student
      );

      /*
       * ไม่จำเป็นต้องเก็บ Password
       * หลัง Login สำเร็จ
       */

      setPassword("");
    } catch {
      setError(
        "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ========================================
   * Logout
   * ========================================
   */

  async function handleLogout() {
    try {
      /*
       * ลบ Session Cookie
       */

      await fetch(
        "/api/auth/session",
        {
          method: "DELETE",
        }
      );
    } finally {
      setStudent(null);
      setStudentId("");
      setPassword("");
      setError("");
    }
  }

  /*
   * ========================================
   * กำลังตรวจ Session
   * ========================================
   */

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800">
        <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
          <div className="w-full text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <GraduationCap
                size={34}
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

  /*
   * ========================================
   * หน้าผลคะแนน
   * ========================================
   */

  if (student) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800">
        {/* Header */}

        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="flex items-center justify-between py-4 sm:py-5">
              {/* School */}

              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <GraduationCap
                    size={25}
                    strokeWidth={
                      1.8
                    }
                    className="text-blue-800"
                  />
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-sm font-bold text-blue-950 sm:text-base">
                    โรงเรียนเนินมะปรางศึกษาวิทยา
                  </h1>

                  <p className="mt-0.5 text-[10px] tracking-wide text-blue-600 sm:text-xs">
                    STUDENT SCORE
                    PORTAL
                  </p>
                </div>
              </div>

              {/* Navigation */}

              <nav className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 sm:px-4"
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
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-blue-700 sm:px-4"
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

        {/* Main */}

        <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
          {/* Page heading */}

          <div className="mb-7">
            <p className="text-sm font-medium tracking-wide text-blue-600">
              STUDENT SCORE
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-blue-950 sm:text-4xl">
              ผลคะแนนของฉัน
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              ตรวจสอบผลคะแนนและรายการประเมินของคุณ
            </p>
          </div>

          {/* Student information */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-slate-500">
                  นักเรียน
                </p>

                <h3 className="mt-1 break-words text-2xl font-bold text-slate-900">
                  {
                    student.fullname
                  }
                </h3>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                  <span>
                    เลขประจำตัว{" "}
                    <strong className="text-slate-700">
                      {
                        student.student_id
                      }
                    </strong>
                  </span>

                  <span>
                    เลขที่{" "}
                    <strong className="text-slate-700">
                      {
                        student.no
                      }
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
                  strokeWidth={
                    1.7
                  }
                  className="text-blue-700"
                />
              </div>
            </div>
          </div>

          {/* Score section */}

          <div className="mt-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  รายการคะแนน
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  คะแนนตามรายการประเมินที่บันทึกไว้
                </p>
              </div>

              <BookOpen
                size={23}
                strokeWidth={
                  1.8
                }
                className="text-blue-600"
              />
            </div>

            {student.scores
              .length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <AlertCircle
                  size={34}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-4 font-medium text-slate-700">
                  ยังไม่มีข้อมูลคะแนน
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  กรุณาตรวจสอบอีกครั้งภายหลัง
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {student.scores.map(
                  (
                    score,
                    index
                  ) => {
                    const status =
                      getScoreStatus(
                        score.value,
                        score.maxScore
                      );

                    return (
                      <div
                        key={`${score.label}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm text-slate-500">
                              รายการประเมิน
                            </p>

                            <h4 className="mt-1 break-words text-lg font-bold text-slate-900">
                              {
                                score.label
                              }
                            </h4>

                            {score.type && (
                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  score.type
                                }
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-slate-400">
                                คะแนน
                              </p>

                              <p className="mt-0.5 text-2xl font-bold text-slate-900">
                                {score.value ===
                                ""
                                  ? "-"
                                  : score.value}

                                <span className="ml-1 text-sm font-medium text-slate-400">
                                  /{" "}
                                  {
                                    score.maxScore
                                  }
                                </span>
                              </p>
                            </div>

                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${status.box}`}
                            >
                              {
                                status.icon
                              }
                            </div>
                          </div>
                        </div>

                        <div
                          className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${status.box}`}
                        >
                          {
                            status.icon
                          }

                          <span>
                            {
                              status.status
                            }
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Quick navigation */}

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  SUBMISSION
                </p>

                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  มีงานที่ต้องส่ง?
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  ไปยังหน้าส่งงานเพื่อดูงานที่เปิดอยู่และตรวจสอบสถานะการส่ง
                </p>
              </div>

              <Link
                href="/submit"
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                ไปหน้าส่งงาน

                <ArrowRight
                  size={17}
                />
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /*
   * ========================================
   * Login Screen
   * ========================================
   */

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <GraduationCap
                size={34}
                strokeWidth={1.8}
                className="text-blue-700"
              />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-blue-950">
              ผลคะแนนนักเรียน
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              STUDENT SCORE PORTAL
            </p>

            <p className="mt-1 text-xs text-slate-400">
              โรงเรียนเนินมะปรางศึกษาวิทยา
            </p>
          </div>

          <form
            onSubmit={
              handleCheckScore
            }
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div>
              <label className="text-sm font-medium text-slate-700">
                รหัสนักเรียน
              </label>

              <div className="relative mt-2">
                <UserRound
                  size={19}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    studentId
                  }
                  onChange={(
                    e
                  ) =>
                    setStudentId(
                      e.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="กรอกรหัสนักเรียน"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-slate-700">
                รหัสผ่าน
              </label>

              <div className="relative mt-2">
                <LogOut
                  size={19}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 rotate-180 text-slate-400"
                />

                <input
                  type="password"
                  value={
                    password
                  }
                  onChange={(
                    e
                  ) =>
                    setPassword(
                      e.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="กรอกรหัสผ่าน"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <XCircle
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <span>
                  {error}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "กำลังตรวจสอบ..."
                : "เข้าสู่ระบบ"}

              {!loading && (
                <ArrowRight
                  size={17}
                />
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">
            กรุณาใช้รหัสนักเรียนและรหัสผ่านที่โรงเรียนกำหนด
          </p>
        </div>
      </div>
    </main>
  );
}