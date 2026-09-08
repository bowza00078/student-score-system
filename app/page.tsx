"use client";

import { useState } from "react";
import {
  ArrowRight,
  GraduationCap,
  LockKeyhole,
  LogOut,
  UserRound,
  BookOpen,
  CheckCircle2,
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

export default function Home() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [student, setStudent] = useState<StudentScore | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCheckScore(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setStudent(null);
    setLoading(true);

    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: studentId.trim(),
          password: password.trim(),
        }),
      });

      const data: { student?: StudentScore; error?: string } =
        await response.json();

      if (!response.ok) {
        setError(data.error || "ไม่สามารถตรวจสอบคะแนนได้");
        return;
      }

      if (!data.student) {
        setError("ไม่พบข้อมูลคะแนนของนักเรียน");
        return;
      }

      setStudent(data.student);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setStudent(null);
    setStudentId("");
    setPassword("");
    setError("");
  }

  /*
   * =========================
   * หน้าแสดงผลคะแนน
   * =========================
   */
  if (student) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                <GraduationCap
                  size={25}
                  strokeWidth={1.8}
                  className="text-blue-800"
                />
              </div>

              <div>
                <h1 className="text-sm font-bold text-blue-950 sm:text-base">
                  โรงเรียนเนินมะปรางศึกษาวิทยา
                </h1>
                <p className="mt-0.5 text-[10px] tracking-wide text-blue-600 sm:text-xs">
                  STUDENT SCORE PORTAL
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut size={17} />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
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
              ผลคะแนนของนักเรียน
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              ตรวจสอบผลคะแนนของคุณจากรายการประเมินที่เปิดใช้งาน
            </p>
          </div>

          {/* Student information */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">นักเรียน</p>

                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  {student.fullname}
                </h3>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                  <span>
                    เลขประจำตัว{" "}
                    <strong className="text-slate-700">
                      {student.student_id}
                    </strong>
                  </span>

                  <span>
                    เลขที่{" "}
                    <strong className="text-slate-700">{student.no}</strong>
                  </span>

                  <span>
                    ห้อง{" "}
                    <strong className="text-slate-700">
                      {student.class_id}
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

          {/* Score section */}
          <div className="mt-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  รายการคะแนน
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  คะแนนจากแบบทดสอบและการประเมิน
                </p>
              </div>

              <BookOpen
                size={23}
                strokeWidth={1.8}
                className="text-blue-600"
              />
            </div>

            {student.scores.length > 0 ? (
              <div className="space-y-4">
                {student.scores.map((score, index) => {
                  const scoreValue = Number(score.value);
                  const maxScore = Number(score.maxScore);

                  const percentage =
                    Number.isFinite(scoreValue) &&
                    Number.isFinite(maxScore) &&
                    maxScore > 0
                      ? Math.min(
                          100,
                          Math.max(0, (scoreValue / maxScore) * 100)
                        )
                      : 0;

                  return (
                    <div
                      key={`${score.label}-${index}`}
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-7"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <CheckCircle2
                              size={19}
                              strokeWidth={2}
                              className="shrink-0 text-blue-600"
                            />

                            <h4 className="truncate text-lg font-bold text-slate-900">
                              {score.label}
                            </h4>
                          </div>

                          {score.type && (
                            <p className="mt-1 pl-7 text-sm text-slate-500">
                              {score.type}
                            </p>
                          )}
                        </div>

                        <div className="sm:text-right">
                          <div className="text-3xl font-bold text-blue-800">
                            {score.value || "-"}
                            <span className="ml-1 text-base font-medium text-slate-400">
                              / {score.maxScore || "-"}
                            </span>
                          </div>

                          {score.value && score.maxScore && (
                            <p className="mt-1 text-sm font-medium text-slate-500">
                              {percentage.toFixed(0)}%
                            </p>
                          )}
                        </div>
                      </div>

                      {score.value && score.maxScore && (
                        <div className="mt-6">
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <BookOpen
                  size={34}
                  strokeWidth={1.6}
                  className="mx-auto text-slate-300"
                />

                <h4 className="mt-4 font-semibold text-slate-700">
                  ยังไม่มีรายการคะแนน
                </h4>

                <p className="mt-1 text-sm text-slate-400">
                  ขณะนี้ยังไม่มีคะแนนที่เปิดให้ตรวจสอบ
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-xs text-slate-400">
              โรงเรียนเนินมะปรางศึกษาวิทยา • Student Score Portal
            </p>
          </div>
        </section>
      </main>
    );
  }

  /*
   * =========================
   * หน้า Login
   * =========================
   */
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 shadow-sm ring-1 ring-blue-100">
              <GraduationCap
                size={40}
                strokeWidth={1.7}
                className="text-blue-800"
              />
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-blue-950 sm:text-3xl">
              โรงเรียนเนินมะปรางศึกษาวิทยา
            </h1>

            <p className="mt-2 text-xs tracking-[0.18em] text-blue-600">
              STUDENT SCORE PORTAL
            </p>
          </div>

          {/* Login Card */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.15)] sm:p-9">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-blue-950">
                เข้าสู่ระบบ
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                กรุณากรอกข้อมูลเพื่อดูคะแนนของคุณ
              </p>
            </div>

            <form
              onSubmit={handleCheckScore}
              className="mt-8 space-y-5"
            >
              {/* Student ID */}
              <div>
                <label
                  htmlFor="studentId"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  เลขประจำตัวนักเรียน
                </label>

                <div className="relative">
                  <UserRound
                    size={20}
                    strokeWidth={1.8}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="studentId"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="เช่น 12119"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  รหัสผ่าน
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={20}
                    strokeWidth={1.8}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="รหัสผ่าน"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 rounded-xl bg-blue-800 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-900 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  "กำลังตรวจสอบ..."
                ) : (
                  <>
                    เข้าสู่ระบบ

                    <ArrowRight
                      size={21}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            สำหรับนักเรียนโรงเรียนเนินมะปรางศึกษาวิทยาเท่านั้น
          </p>
        </div>
      </div>
    </main>
  );
}
