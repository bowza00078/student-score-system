"use client";

import { useState } from "react";

type StudentScore = {
  student_id: string;
  no: string;
  fullname: string;
  quiz_1: string;
  quiz_2: string;
  final_exam: string;
  total: string;
  note: string;
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
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-800">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-800">
              ระบบแจ้งคะแนนสอบนักเรียน
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              กรุณากรอกเลขประจำตัวนักเรียนและรหัสผ่านเพื่อตรวจสอบคะแนน
            </p>
          </div>

          <form onSubmit={handleCheckScore} className="space-y-4">
            <div>
              <label
                htmlFor="studentId"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                เลขประจำตัวนักเรียน
              </label>

              <input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="เช่น 12119"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                รหัสผ่าน / วันเดือนปีเกิด
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="กรอกรหัสผ่าน"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "กำลังตรวจสอบ..." : "ตรวจสอบคะแนน"}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {student && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="mb-4 text-lg font-bold text-slate-800">
                ผลคะแนนของนักเรียน
              </h2>

              <div className="space-y-2 text-sm text-slate-700">
                <p>
                  <strong>เลขประจำตัวนักเรียน:</strong> {student.student_id}
                </p>

                <p>
                  <strong>เลขที่:</strong> {student.no}
                </p>

                <p>
                  <strong>ชื่อ-สกุล:</strong> {student.fullname}
                </p>

                <hr className="my-3" />

                <p>
                  <strong>คะแนนสอบย่อยครั้งที่ 1:</strong>{" "}
                  {student.quiz_1 || "-"}
                </p>

                <p>
                  <strong>คะแนนสอบย่อยครั้งที่ 2:</strong>{" "}
                  {student.quiz_2 || "-"}
                </p>

                <p>
                  <strong>คะแนนสอบปลายภาค:</strong>{" "}
                  {student.final_exam || "-"}
                </p>

                <p>
                  <strong>คะแนนรวม:</strong> {student.total || "-"}
                </p>

                <p>
                  <strong>หมายเหตุ:</strong> {student.note || "-"}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          ข้อมูลคะแนนอ้างอิงจากฐานข้อมูล Google Sheet ของครูผู้สอน
        </p>
      </div>
    </main>
  );
}
