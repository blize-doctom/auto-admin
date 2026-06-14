import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy GoogleGenAI client helper
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Ensure server handles missing API key gracefully rather than crashing on route
function handleGenAiError(error: any, res: express.Response) {
  console.error("Gemini API Error:", error);
  res.status(500).json({
    error: true,
    message: error?.message || "Terjadi kesalahan ketika memproses permintaan kecerdasan buatan.",
  });
}

// Helper to call generateContent with highly-available fallback models in case of high demand (503)
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
) {
  try {
    console.log("Attempting Gemini API generation with primary model: gemini-3.5-flash");
    return await ai.models.generateContent({
      model: "gemini-3.5-flash",
      ...params,
    });
  } catch (error: any) {
    console.warn("Primary model (gemini-3.5-flash) is unavailable or under high demand. Trying fallback gemini-3.1-flash-lite...", error);
    try {
      return await ai.models.generateContent({
        model: "gemini-3.1-flash-lite", // Fallback 1: Extremely stable and highly-available
        ...params,
      });
    } catch (fallbackError: any) {
      console.warn("Fallback gemini-3.1-flash-lite also failed. Retrying with gemini-flash-latest...", fallbackError);
      try {
        return await ai.models.generateContent({
          model: "gemini-flash-latest", // Fallback 2: General purpose latest flash model
          ...params,
        });
      } catch (finalError: any) {
        console.error("All Gemini models exhausted. Throwing original error:", finalError);
        throw error; // Re-throw the original error if even standard fallbacks fail
      }
    }
  }
}

// 1. API: Generate counseling report from notes
app.post("/api/counseling/generate-report", async (req, res) => {
  const { studentName, studentClass, gender, counselorName, date, serviceCategory, rawNotes } = req.body;

  if (!rawNotes || String(rawNotes).trim().length === 0) {
    return res.status(400).json({ error: "Catatan konseling (raw notes) wajib diisi." });
  }

  try {
    const ai = getAiClient();
    const prompt = `
Anda adalah asisten kecerdasan buatan profesional untuk Bimbingan Konseling (BK) di sekolah Indonesia.
Tugas Anda adalah memformulasikan catatan konsultasi kasar (raw notes) menjadi Laporan Konseling Formal yang terstruktur rapi.

INFORMASI KONSELI & KONSELOR:
- Nama Konseli (Siswa): ${studentName || "Siswa Terkait"}
- Kelas: ${studentClass || "Tidak Disebutkan"}
- Jenis Kelamin: ${gender || "Tidak Disebutkan"}
- Bidang Layanan: ${serviceCategory || "Pribadi / Sosial"} (Pribadi, Sosial, Belajar, Karir)
- Guru BK (Konselor): ${counselorName || "Guru BK Sekolah"}
- Tanggal Pelaksanaan: ${date || "Hari Ini"}

CATATAN KASAR (RAW NOTES):
"""
${rawNotes}
"""

Hasilkan respon dalam format JSON yang valid dengan struktur berikut:
1. "summary" (string): Ringkasan singkat padat tentang permasalahan siswa.
2. "problemAnalysis" (string): Analisis BK mendalam mengenai faktor penyebab (internal/eksternal) dan urgensi masalah (maksimal 2 paragraf).
3. "actionPlan" (string): Rencana Tindak Lanjut (RTL) yang konkret, terukur, dan praktis baik bagi siswa, guru BK, maupun wali kelas/orang tua.
4. "formalReportMarkdown" (string): Laporan Lengkap Formal dalam format markdown yang siap cetak / di-copypaste. Laporan ini harus memiliki struktur formal administrasi BK Indonesia (KOP/Identitas Laporan, Identitas Siswa, Gejala/Deskripsi Masalah, Pendekatan/Teknik Konseling, Hasil Deskriptif, Rencana Tindak Lanjut, dan tanda tangan penutup Konselor).

Pastikan penjelasan menggunakan bahasa Indonesia yang baik, formal, empatik, objektif secara psikologis, dan bebas typo.
`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            problemAnalysis: { type: Type.STRING },
            actionPlan: { type: Type.STRING },
            formalReportMarkdown: { type: Type.STRING },
          },
          required: ["summary", "problemAnalysis", "actionPlan", "formalReportMarkdown"],
        },
      },
    });

    const jsonStr = response.text || "{}";
    const data = JSON.parse(jsonStr.trim());
    res.json(data);
  } catch (error) {
    handleGenAiError(error, res);
  }
});

// 2. API: Generate RPL BK Template (Rencana Pelaksanaan Layanan)
app.post("/api/rpl/generate", async (req, res) => {
  const { topic, classGrade, serviceField, serviceType, duration, focusPoints } = req.body;

  if (!topic) {
    return res.status(400).json({ error: "Topik atau tema layanan wajib diisi." });
  }

  try {
    const ai = getAiClient();
    const prompt = `
Anda adalah Master Guru BK Indonesia berpengalaman tinggi. Anda menguasai penyusunan Rencana Pelaksanaan Layanan (RPL) Bimbingan dan Konseling sesuai standar Kurikulum Merdeka dan MGBK (Musyawarah Guru Bimbingan Konseling).

ORGANISASI LAYANAN:
- Topik/Tema Layanan: ${topic}
- Kelas / Semester: Kelas ${classGrade || "Umum"} / Genap atau Ganjil
- Bidang Layanan: ${serviceField || "Sosial"} (Pribadi, Sosial, Belajar, Karir)
- Jenis Layanan: ${serviceType || "Bimbingan Klasikal"} (Bimbingan Klasikal, Bimbingan Kelompok, Konseling Individual, Lintas Kelas)
- Alokasi Waktu: ${duration || "1 x 45 Menit"}
- Titik Fokus/Sasaran Spesifik: ${focusPoints || "Membentuk karakter disiplin dan pemahaman diri siswa"}

Format dokumen RPL harus sangat detail, profesional, aplikatif, dan langsung siap pakai untuk akreditasi sekolah atau administrasi guru.

Hasilkan respon dalam format JSON yang valid dengan struktur berikut:
1. "objectives" (string): Tujuan Umum dan Tujuan Khusus (aspek kognitif, afektif, psikomotorik).
2. "activities" (string): Deskripsi ringkas langkah-langkah kegiatan (Tahap Awal/Pendahuluan, Tahap Inti, Tahap Penutup).
3. "evaluation" (string): Evaluasi Proses dan Evaluasi Hasil.
4. "fullRplMarkdown" (string): Dokumen lengkap RPL BK berformat Markdown formal utuh lengkap dengan tabel instrumen evaluasi bimbingan, lembar refleksi diri siswa, dan tanda tangan kepala sekolah serta guru BK.

Gunakan struktur formal Indonesia, gunakan istilah-istilah MGBK resmi (seperti "Apersepsi", "Skenario Kegiatan", "Fasilitator").
`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            objectives: { type: Type.STRING },
            activities: { type: Type.STRING },
            evaluation: { type: Type.STRING },
            fullRplMarkdown: { type: Type.STRING },
          },
          required: ["objectives", "activities", "evaluation", "fullRplMarkdown"],
        },
      },
    });

    const jsonStr = response.text || "{}";
    const data = JSON.parse(jsonStr.trim());
    res.json(data);
  } catch (error) {
    handleGenAiError(error, res);
  }
});

// 3. API: Generate Counseling Recap/Summary (Laporan Rekapitulasi BK)
app.post("/api/counseling/recap", async (req, res) => {
  const { period, records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Daftar rekaman konseling wajib dikirimkan dalam array." });
  }

  try {
    const ai = getAiClient();
    const recordsString = records.map((r, index) => {
      return `--- Sesi ${index + 1} ---
Siswa: ${r.studentName} (${r.gender || "-"}) | Kelas: ${r.studentClass}
Tanggal: ${r.date} | Bidang: ${r.serviceCategory}
Catatan/Summary: ${r.summary}
Rencana RTL: ${r.actionPlan || "-"}`;
    }).join("\n\n");

    const prompt = `
Anda adalah Koordinator BK Sekolah. Anda mengemban tanggung jawab untuk membuat Laporan Rekapitulasi Pelayanan Konseling secara berkala untuk dilaporkan kepada Kepala Sekolah dan Dinas Pendidikan.

PERIODE ANALISIS: ${period || "Bulanan"}
JUMLAH KASUS/SESI: ${records.length} Sesi Terbuka

DATA HISTORIS SESI KONSELING:
${recordsString}

Hasilkan laporan rekapitulasi, temukan pola/tren masalah terbanyak di sekolah ini (misalnya masalah pertemanan, kecemasan karier, performa akademik, atau kedisplinan), tawarkan rekomendasi umum yang bisa dilakukan pihak sekolah oleh guru kelas atau kepala sekolah.

Hasilkan respon dalam format JSON yang valid dengan struktur berikut:
1. "identifiedTrends" (string): Ringkasan pola atau tren permasalahan siswa yang berhasil ditarik dari data.
2. "recommedationsForSchool" (string): Rekomendasi strategis preventif untuk diambil oleh Kepala Sekolah, Wali Kelas, dan Guru Mata Pelajaran.
3. "fullRecapMarkdown" (string): Laporan Rekapitulasi Pelayanan Konseling Formal utuh dalam format markdown, lengkap dengan tabel sebaran kasus berdasarkan bidang, persentase penyelesaian kasus, analisis sistemik, dan tanda tangan pelaporan.

Gunakan bahasa Indonesia baku yang sangat objektif, informatif, mendalam, dan persuasif demi perbaikan ekosistem belajar siswa di sekolah.
`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identifiedTrends: { type: Type.STRING },
            recommedationsForSchool: { type: Type.STRING },
            fullRecapMarkdown: { type: Type.STRING },
          },
          required: ["identifiedTrends", "recommedationsForSchool", "fullRecapMarkdown"],
        },
      },
    });

    const jsonStr = response.text || "{}";
    const data = JSON.parse(jsonStr.trim());
    res.json(data);
  } catch (error) {
    handleGenAiError(error, res);
  }
});

// Vite server integration
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    // Development mode with Vite HMR disabled helper
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production statics
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BK Auto Admin] Server is active at http://0.0.0.0:${PORT}`);
  });
};

startServer();
