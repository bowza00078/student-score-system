"use client";

import { useState } from "react";

type StudentScore = {
  student_id: string;
  no: string;
  class: string;
  fullname: string;
  exam_mid: string;
  exam_final: string;
  total: string;
  grade: string;
  note: string;
};

export default function Home() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [student, setStudent] = useState<StudentScore | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCheckScore(e: React.FormEvent) {
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
          studentId,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ไม่สามารถตรวจสอบคะแนนได้");
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
    <main className="min-h-screen bg-slate-100 px-4 py-8">
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
              <label className="mb-1 block text-sm font-medium text-slate-700">
                เลขประจำตัวนักเรียน
              </label>
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="เช่น 12345"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                รหัสผ่าน / วันเดือนปีเกิด
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="เช่น 01102555"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
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
              <h2 className="mb-3 text-lg font-bold text-slate-800">
                ผลคะแนนของนักเรียน
              </h2>

              <div className="space-y-2 text-sm text-slate-700">
                <p>
                  <strong>ชื่อ-สกุล:</strong> {student.fullname}
                </p>
                <p>
                  <strong>ชั้น:</strong> {student.class}
                </p>
                <p>
                  <strong>เลขที่:</strong> {student.no}
                </p>
                <hr className="my-3" />
                <p>
                  <strong>คะแนนกลางภาค:</strong> {student.exam_mid}
                </p>
                <p>
                  <strong>คะแนนปลายภาค:</strong> {student.exam_final}
                </p>
                <p>
                  <strong>คะแนนรวม:</strong> {student.total}
                </p>
                <p>
                  <strong>เกรด:</strong> {student.grade}
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