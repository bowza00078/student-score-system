"use client";

import { useState } from "react";
import {
  ArrowRight,
  GraduationCap,
  LockKeyhole,
  UserRound,
} from "lucide-react";

type ScoreItem = {
  label: string;
  value: string;
};

type StudentScore = {
  student_id: string;
  no: string;
  fullname: string;
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Left: Branding */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100 lg:flex">
          <div className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-blue-200/40" />
          <div className="absolute -bottom-40 right-[-80px] h-96 w-96 rounded-full bg-blue-200/40" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">

            {/* School name */}
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-blue-100">
                  <GraduationCap
                    size={32}
                    strokeWidth={1.8}
                    className="text-blue-800"
                  />
                </div>

                <div>
                  <h1 className="text-xl font-bold tracking-tight text-blue-950">
                    โรงเรียนเนินมะปรางศึกษาวิทยา
                  </h1>

                  <p className="mt-1 text-xs tracking-wide text-blue-700">
                    NERNMAPRANGSUKSAWITTAYA SCHOOL
                  </p>
                </div>
              </div>
            </div>

            {/* Main branding */}
            <div className="max-w-xl">
              <p className="mb-3 text-sm font-medium tracking-[0.2em] text-blue-600">
                STUDENT PORTAL
              </p>

              <h2 className="text-5xl font-bold tracking-tight text-blue-950 xl:text-6xl">
                ระบบตรวจสอบ
                <br />
                คะแนนนักเรียน
              </h2>

              <div className="mt-7 h-1 w-16 rounded-full bg-blue-500" />

              <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
                ตรวจสอบคะแนนของตนเองได้อย่างสะดวก
                และรวดเร็วผ่านระบบออนไลน์
              </p>
            </div>

            {/* Bottom */}
            <div>
              <div className="h-px w-16 bg-blue-500" />

              <p className="mt-4 text-xs tracking-[0.25em] text-blue-700">
                NERNMAPRANG SUKSAWITTAYA SCHOOL
              </p>
            </div>
          </div>
        </section>

        {/* Right: Login */}
        <section className="flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">

            <div className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] sm:p-10">

              {/* Header */}
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <GraduationCap
                    size={34}
                    strokeWidth={1.8}
                    className="text-blue-800"
                  />
                </div>

                <h2 className="mt-6 text-3xl font-bold tracking-tight text-blue-950">
                  เข้าสู่ระบบ
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  ระบบตรวจสอบคะแนนนักเรียน
                </p>
              </div>

              {/* Login form */}
              <form
                onSubmit={handleCheckScore}
                className="mt-8 space-y-5"
              >

                {/* Student ID */}
                <div>
                  <label
                    htmlFor="studentId"
                    className="mb-2 block text-sm font-medium text-slate-700"
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
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
                  className="group flex w-full items-center justify-center gap-3 rounded-xl bg-blue-800 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-900 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}

                  {!loading && (
                    <ArrowRight
                      size={20}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-7 border-t border-slate-100 pt-6 text-center">
                <p className="text-xs text-slate-400">
                  สำหรับนักเรียนโรงเรียนเนินมะปรางศึกษาวิทยาเท่านั้น
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Student Portal
            </p>
          </div>
        </section>
      </div>

      {/* Temporary score result */}
      {student && (
        <div className="mx-auto max-w-3xl px-5 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              ผลคะแนนของนักเรียน
            </h2>

            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                <strong>เลขประจำตัว:</strong> {student.student_id}
              </p>

              <p>
                <strong>เลขที่:</strong> {student.no}
              </p>

              <p>
                <strong>ชื่อ-สกุล:</strong> {student.fullname}
              </p>

              <div className="my-4 h-px bg-slate-200" />

              {student.scores.length > 0 ? (
                student.scores.map((score) => (
                  <p key={score.label}>
                    <strong>{score.label}:</strong>{" "}
                    {score.value || "-"}
                  </p>
                ))
              ) : (
                <p className="text-slate-500">
                  ยังไม่มีรายการคะแนน
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
