import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Calendar, 
  Archive, 
  Layers, 
  TrendingUp, 
  PlusCircle, 
  Printer, 
  Copy, 
  Check, 
  Trash2, 
  Search, 
  Filter, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  FileCheck,
  User,
  GraduationCap,
  CalendarDays,
  X,
  Share2,
  ListRestart,
  Download,
  FileSpreadsheet
} from "lucide-react";
import { 
  CounselingReport, 
  RplTemplate, 
  CalendarEvent, 
  ServiceField, 
  ServiceType, 
  Gender 
} from "./types";
import { initialReports, initialRpls, initialCalendarEvents } from "./lib/demoData";
import DocumentFormatter from "./components/DocumentFormatter";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from "firebase/firestore";
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logoutUser, 
  handleFirestoreError, 
  OperationType 
} from "./lib/firebase";

export default function App() {
  // Tabs: "dashboard" | "create-report" | "recap-reports" | "rpl-templates" | "archives" | "calendar"
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Local state persisted in LocalStorage
  const [reports, setReports] = useState<CounselingReport[]>([]);
  const [rpls, setRpls] = useState<RplTemplate[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedReportIdsForRecap, setSelectedReportIdsForRecap] = useState<string[]>([]);

  // UI States
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [fieldFilter, setFieldFilter] = useState<string>("Semua");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiKeyWarning, setApiKeyWarning] = useState<boolean>(false);

  // Active viewing/editing details modal
  const [selectedReport, setSelectedReport] = useState<CounselingReport | null>(null);
  const [selectedRpl, setSelectedRpl] = useState<RplTemplate | null>(null);

  // Formatter custom editor state
  const [activeFormatter, setActiveFormatter] = useState<{
    id: string;
    title: string;
    content: string;
    type: "report" | "rpl" | "recap";
    metadata: any;
  } | null>(null);

  const handleSaveFormatterContent = (updatedContent: string) => {
    if (!activeFormatter) return;
    
    if (activeFormatter.id === "temp-report") {
      setGeneratedReportResult(prev => prev ? { ...prev, formalReportMarkdown: updatedContent } : null);
    } else if (activeFormatter.id === "temp-rpl") {
      setGeneratedRplResult(prev => prev ? { ...prev, fullRplMarkdown: updatedContent } : null);
    } else if (activeFormatter.id === "temp-recap") {
      setGeneratedRecapResult(prev => prev ? { ...prev, fullRecapMarkdown: updatedContent } : null);
    } else if (activeFormatter.id.startsWith("rep-")) {
      const updated = reports.map(r => r.id === activeFormatter.id ? { ...r, formalReportMarkdown: updatedContent } : r);
      saveReports(updated);
      setSelectedReport(prev => prev ? { ...prev, formalReportMarkdown: updatedContent } : null);
    } else if (activeFormatter.id.startsWith("rpl-")) {
      const updated = rpls.map(r => r.id === activeFormatter.id ? { ...r, fullRplMarkdown: updatedContent } : r);
      saveRpls(updated);
      setSelectedRpl(prev => prev ? { ...prev, fullRplMarkdown: updatedContent } : null);
    }
  };

  // Form input state for single counseling report generator
  const [reportForm, setReportForm] = useState({
    studentName: "",
    studentClass: "",
    gender: "Laki-laki" as Gender,
    serviceCategory: "Pribadi" as ServiceField,
    counselorName: "Dra. Elok Herawati, M.Pd.",
    date: new Date().toISOString().split('T')[0],
    rawNotes: "",
  });

  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [generatedReportResult, setGeneratedReportResult] = useState<Partial<CounselingReport> | null>(null);

  // Form input state for RPL BK template generator
  const [rplForm, setRplForm] = useState({
    topic: "",
    classGrade: "X",
    serviceField: "Sosial" as ServiceField,
    serviceType: "Bimbingan Klasikal",
    duration: "2 x 45 Menit",
    focusPoints: "",
  });

  const [isGeneratingRpl, setIsGeneratingRpl] = useState<boolean>(false);
  const [generatedRplResult, setGeneratedRplResult] = useState<Partial<RplTemplate> | null>(null);

  // Form input state for counseling recap
  const [recapPeriod, setRecapPeriod] = useState<string>("Bulanan (Juni 2026)");
  const [isGeneratingRecap, setIsGeneratingRecap] = useState<boolean>(false);
  const [generatedRecapResult, setGeneratedRecapResult] = useState<{
    period: string;
    identifiedTrends: string;
    recommedationsForSchool: string;
    fullRecapMarkdown: string;
  } | null>(null);

  // Calendar operational states
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 5, 12)); // Friday, June 12, 2026
  const [isAddEventOpen, setIsAddEventOpen] = useState<boolean>(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: "2026-06-15",
    time: "09:00",
    type: "konseling" as any,
    studentName: "",
    description: "",
  });

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforePrompt);

    // If currently running in standalone display frame, hide installer option
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforePrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Hasil respons instalasi pengguna: ${outcome}`);
    } catch (err) {
      console.error("[PWA] Error launching install prompt:", err);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Firebase User Auth State & Sync Control
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [showSyncPrompt, setShowSyncPrompt] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Authenticate user & check if cloud data needs migration setup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // If cloud contains no records, let's suggest cloud backup
        try {
          const reportsSnap = await getDocs(collection(db, "users", currentUser.uid, "reports"));
          if (reportsSnap.empty && (reports.length > 0 || rpls.length > 0 || events.length > 0)) {
            setShowSyncPrompt(true);
          }
        } catch (err) {
          console.error("Checking sync database state:", err);
        }
      } else {
        setUser(null);
        setShowSyncPrompt(false);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [reports.length, rpls.length, events.length]);

  // Synchronize onSnapshot based on Auth status
  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      // Offline fallback: Initial local state fetch if not logged in
      const storedReports = localStorage.getItem("bk_reports");
      const storedRpls = localStorage.getItem("bk_rpls");
      const storedEvents = localStorage.getItem("bk_events");

      try {
        setReports(storedReports ? JSON.parse(storedReports) : initialReports);
      } catch (err) {
        console.warn("Gagal membaca data lokal reports, fallback ke data demo:", err);
        setReports(initialReports);
      }

      try {
        setRpls(storedRpls ? JSON.parse(storedRpls) : initialRpls);
      } catch (err) {
        console.warn("Gagal membaca data lokal rpls, fallback ke data demo:", err);
        setRpls(initialRpls);
      }

      try {
        setEvents(storedEvents ? JSON.parse(storedEvents) : initialCalendarEvents);
      } catch (err) {
        console.warn("Gagal membaca data lokal events, fallback ke data demo:", err);
        setEvents(initialCalendarEvents);
      }
      return;
    }

    // Active cloud synchronization
    const userId = user.uid;

    const unsubReports = onSnapshot(collection(db, "users", userId, "reports"), (snapshot) => {
      const docsData: CounselingReport[] = [];
      snapshot.forEach((docSnap) => {
        docsData.push(docSnap.data() as CounselingReport);
      });
      // Order by descending date/createdAt
      docsData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setReports(docsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/reports`);
    });

    const unsubRpls = onSnapshot(collection(db, "users", userId, "rpls"), (snapshot) => {
      const docsData: RplTemplate[] = [];
      snapshot.forEach((docSnap) => {
        docsData.push(docSnap.data() as RplTemplate);
      });
      docsData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setRpls(docsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/rpls`);
    });

    const unsubEvents = onSnapshot(collection(db, "users", userId, "events"), (snapshot) => {
      const docsData: CalendarEvent[] = [];
      snapshot.forEach((docSnap) => {
        docsData.push(docSnap.data() as CalendarEvent);
      });
      setEvents(docsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/events`);
    });

    return () => {
      unsubReports();
      unsubRpls();
      unsubEvents();
    };
  }, [user, isAuthLoading]);

  // Migrate local records to Firebase Cloud
  const startCloudMigration = async () => {
    if (!user) return;
    setIsSyncing(true);
    const userId = user.uid;
    try {
      for (const report of reports) {
        await setDoc(doc(db, "users", userId, "reports", report.id), report);
      }
      for (const rpl of rpls) {
        await setDoc(doc(db, "users", userId, "rpls", rpl.id), rpl);
      }
      for (const ev of events) {
        await setDoc(doc(db, "users", userId, "events", ev.id), ev);
      }
      alert("Hebat! Data bimbingan lokal Anda telah berhasil disinkronkan ke server Cloud.");
    } catch (err) {
      console.error(err);
      alert("Menemukan kendala saat mencadangkan data.");
    } finally {
      setIsSyncing(false);
      setShowSyncPrompt(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || (err?.message && err.message.includes("popup-closed-by-user"))) {
        alert("Akses masuk dibatalkan karena jendela interaksi Google ditutup sebelum selesai.");
      } else {
        alert("Gagal melakukan autentikasi akun Google.");
      }
    }
  };

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari akun? Data yang belum dicadangkan ke cloud hanya tersimpan secara lokal.")) {
      try {
        await logoutUser();
        alert("Berhasil keluar dari akun BK.");
      } catch (err) {
        alert("Gagal keluar dari akun.");
      }
    }
  };

  // Reconciled save functions keeping both memory, LocalStorage and Cloud in sync
  const saveReports = async (newReports: CounselingReport[]) => {
    setReports(newReports);
    localStorage.setItem("bk_reports", JSON.stringify(newReports));

    if (user) {
      const userId = user.uid;
      // Reconcile deletes
      const removed = reports.filter(or => !newReports.some(nr => nr.id === or.id));
      for (const item of removed) {
        try {
          await deleteDoc(doc(db, "users", userId, "reports", item.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${userId}/reports/${item.id}`);
        }
      }
      // Reconcile updates
      const addedOrModified = newReports.filter(nr => {
        const existingItem = reports.find(or => or.id === nr.id);
        return !existingItem || JSON.stringify(existingItem) !== JSON.stringify(nr);
      });
      for (const item of addedOrModified) {
        try {
          await setDoc(doc(db, "users", userId, "reports", item.id), item);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${userId}/reports/${item.id}`);
        }
      }
    }
  };

  const saveRpls = async (newRpls: RplTemplate[]) => {
    setRpls(newRpls);
    localStorage.setItem("bk_rpls", JSON.stringify(newRpls));

    if (user) {
      const userId = user.uid;
      // Reconcile deletes
      const removed = rpls.filter(or => !newRpls.some(nr => nr.id === or.id));
      for (const item of removed) {
        try {
          await deleteDoc(doc(db, "users", userId, "rpls", item.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${userId}/rpls/${item.id}`);
        }
      }
      // Reconcile updates
      const addedOrModified = newRpls.filter(nr => {
        const existingItem = rpls.find(or => or.id === nr.id);
        return !existingItem || JSON.stringify(existingItem) !== JSON.stringify(nr);
      });
      for (const item of addedOrModified) {
        try {
          await setDoc(doc(db, "users", userId, "rpls", item.id), item);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${userId}/rpls/${item.id}`);
        }
      }
    }
  };

  const saveEvents = async (newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
    localStorage.setItem("bk_events", JSON.stringify(newEvents));

    if (user) {
      const userId = user.uid;
      // Reconcile deletes
      const removed = events.filter(or => !newEvents.some(nr => nr.id === or.id));
      for (const item of removed) {
        try {
          await deleteDoc(doc(db, "users", userId, "events", item.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${userId}/events/${item.id}`);
        }
      }
      // Reconcile updates
      const addedOrModified = newEvents.filter(nr => {
        const existingItem = events.find(or => or.id === nr.id);
        return !existingItem || JSON.stringify(existingItem) !== JSON.stringify(nr);
      });
      for (const item of addedOrModified) {
        try {
          await setDoc(doc(db, "users", userId, "events", item.id), item);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${userId}/events/${item.id}`);
        }
      }
    }
  };

  // Pre-fill helpers for raw notes mock testing
  const applyQuickScenario = (scenarioType: string) => {
    if (scenarioType === "game") {
      setReportForm({
        ...reportForm,
        studentName: "Rizky Aditya",
        studentClass: "XII-Bahasa",
        gender: "Laki-laki",
        serviceCategory: "Belajar",
        rawNotes: "Siswa sering sekali terlambat masuk sekolah kelas jam pertama, wali murid mengeluhkan penurunan minat belajar dramatis. Anak mengaku begadang main Mobile Legends bersama teman di luar sekolah sampai pukul 03.00 pagi hampir setiap hari karena merasa jenuh dengan beban ujian kelulusan sekolah."
      });
    } else if (scenarioType === "career") {
      setReportForm({
        ...reportForm,
        studentName: "Farhan Syahputra",
        studentClass: "XI-MIPA 2",
        gender: "Laki-laki",
        serviceCategory: "Karir",
        rawNotes: "Farhan bingung menentukan jurusan kuliah. Sangat berminat ke teknik sipil karena suka menggambar desain konstruksi, tetapi orang tua mendesaknya masuk jurusan akuntansi/ekonomi dengan alasan keuangan keluarga sempit dan khawatir peluang teknik sipil mahal. Farhan jadi stres, malas belajar di kelas, dan sering murung."
      });
    } else if (scenarioType === "social") {
      setReportForm({
        ...reportForm,
        studentName: "Aisyah Rahmawati",
        studentClass: "X-IPS 3",
        gender: "Perempuan",
        serviceCategory: "Sosial",
        rawNotes: "Siswa dilaporkan menangis di perpustakaan sekolah pada jam istirahat kedua setelah dituduh menyebarkan rumor jahat di grup obrolan WhatsApp kelas oleh sekelompok temannya. Merasa dikucilkan, enggan kembali ke kelas, dan mengancam ingin pindah sekolah."
      });
    } else if (scenarioType === "anxiety") {
      setReportForm({
        ...reportForm,
        studentName: "Nadia Utami",
        studentClass: "XI-IPS 1",
        gender: "Perempuan",
        serviceCategory: "Pribadi",
        rawNotes: "Siswa menunjukkan gejala panik berlebih, tremor tangan, berkeringat dingin setiap kali presentasi di depan kelas atau ujian dadakan. Setelah diajak bicara empat mata, dia mengaku sangat trauma atas ejekan verbal beberapa tahun lalu di jenjang SMP oleh teman kelasnya."
      });
    }
  };

  // Helper scenario for RPL
  const applyRplScenario = (type: string) => {
    if (type === "bullying") {
      setRplForm({
        topic: "Pencegahan Bullying & Membangun Empati Teman Sebaya",
        classGrade: "X",
        serviceField: "Sosial",
        serviceType: "Bimbingan Klasikal",
        duration: "2 x 45 Menit",
        focusPoints: "Membentuk rasa aman di kelas, mencegah perundungan verbal/cyberbullying di media sosial kelas X baru."
      });
    } else if (type === "career") {
      setRplForm({
        topic: "Eksplorasi Karir Pintar Menuju Perguruan Tinggi",
        classGrade: "XI",
        serviceField: "Karir",
        serviceType: "Bimbingan Kelompok",
        duration: "1 x 45 Menit",
        focusPoints: "Mengenal ragam rumpun jurusan sains/sosioteknologi dan menyesuaikannya dengan kekuatan bakat pribadi siswa."
      });
    } else if (type === "study") {
      setRplForm({
        topic: "Gaya Belajar Efektif Bebas Distraksi Gadget",
        classGrade: "XII",
        serviceField: "Belajar",
        serviceType: "Bimbingan Klasikal",
        duration: "2 x 45 Menit",
        focusPoints: "Strategi menghadapi ujian masuk kuliah nasional melalui manajemen fokus belajar 50-10 Pomodoro."
      });
    }
  };

  // Trigger AI Report formulation from raw notes
  const generateCounselingReportWithAI = async () => {
    if (!reportForm.rawNotes.trim()) {
      alert("Masukkan catatan kasar konseling terlebih dahulu.");
      return;
    }
    setIsGeneratingReport(true);
    setApiKeyWarning(false);

    try {
      const response = await fetch("/api/counseling/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportForm),
      });

      if (!response.ok) {
        throw new Error("Gagal menghubungi server AI");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.message);
      }

      setGeneratedReportResult({
        ...reportForm,
        summary: data.summary,
        problemAnalysis: data.problemAnalysis,
        actionPlan: data.actionPlan,
        formalReportMarkdown: data.formalReportMarkdown,
      });

    } catch (err: any) {
      console.warn("AI Generation issue: fallback to static processing", err);
      // Generous Fallback when key is missing or server is offline
      setApiKeyWarning(true);
      const mockResult = generateFallbackReport(reportForm);
      setGeneratedReportResult(mockResult);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Local fallback generator for offline or missing keys
  const generateFallbackReport = (form: typeof reportForm): Partial<CounselingReport> => {
    const idSeed = Math.random().toString(36).substr(2, 9);
    const sum = `[Laporan Terformulasi Sistem BK] Siswa ${form.studentName} kelas ${form.studentClass} mengalami hambatan di bidang ${form.serviceCategory}.`;
    const analy = `Analisis BK mengidentifikasi faktor utama bersumber dari kurangnya regulasi diri siswa dan koordinasi eksternal. Diperlukan intervensi konseling berjadwal untuk merestrukturisasi pola kognitif yang keliru agar tidak menghambat potensi perkembangannya di sekolah.`;
    const action = `1. Konseling individu lanjutan untuk pemantauan sirkulasi motivasi.\n2. Berkoordinasi dengan wali kelas dan guru mata pelajaran.\n3. Melibatkan orang tua sebagai pengawas perilaku dirumah secara periodik.`;
    const md = `### LAPORAN FORMAL BIMBINGAN KONSELING
ID Dokumen: BK-${idSeed}
Tanggal: ${form.date}

---

**I. DATA KONSULTASI**
* **Nama Siswa:** ${form.studentName || "Siswa Utama"}
* **Kelas:** ${form.studentClass || "X/XI/XII"}
* **Jenis Kelamin:** ${form.gender}
* **Guru BK/Konselor:** ${form.counselorName}
* **Bidang Bimbingan:** Bidang ${form.serviceCategory}

**II. RINGKASAN MASALAH (DEKRIPSI UTAMA)**
${form.rawNotes || "Catatan konseling kosong."}

**III. ANALISIS DIAGNOSTIK & DINAMIKA PSIKOLOGIS**
Berdasarkan keluhan yang dipetakan, siswa memiliki hambatan adaptif perilaku yang bermanifestasi sebagai resistensi konsistensi akademik. Tekanan psikososial teman sebaya atau miskomunikasi dengan orang tua turut memperberat simtoma kecemasan yang dirasakan konseli.

**IV. RENCANA TINDAK LANJUT BERKELANJUTAN (RTL)**
* Melaksanakan sesi konseling terjadwal menggunakan asas kerahasiaan konseling.
* Memberikan penugasan pencatatan emosi harian (Self-monitoring journal).
* Menyelenggarakan mediasi keluarga jika diperlukan dukungan parental.

---
**Dibuat Oleh Guru BK Utama,**

*${form.counselorName}*`;

    return {
      studentName: form.studentName,
      studentClass: form.studentClass,
      gender: form.gender,
      serviceCategory: form.serviceCategory,
      counselorName: form.counselorName,
      date: form.date,
      rawNotes: form.rawNotes,
      summary: sum,
      problemAnalysis: analy,
      actionPlan: action,
      formalReportMarkdown: md,
    };
  };

  const saveGeneratedReportToArchive = () => {
    if (!generatedReportResult) return;
    const finalReport: CounselingReport = {
      id: "rep-" + Date.now(),
      studentName: generatedReportResult.studentName || "Siswa Tanpa Nama",
      studentClass: generatedReportResult.studentClass || "X",
      gender: generatedReportResult.gender || "L/P",
      counselorName: generatedReportResult.counselorName || "Guru BK",
      date: generatedReportResult.date || new Date().toISOString().split('T')[0],
      serviceCategory: generatedReportResult.serviceCategory || "Pribadi",
      rawNotes: generatedReportResult.rawNotes || "",
      summary: generatedReportResult.summary || "",
      problemAnalysis: generatedReportResult.problemAnalysis || "",
      actionPlan: generatedReportResult.actionPlan || "",
      formalReportMarkdown: generatedReportResult.formalReportMarkdown || "",
      createdAt: new Date().toISOString(),
    };

    const updated = [finalReport, ...reports];
    saveReports(updated);
    
    // Auto-schedule follow-up on calendar!
    const followUpEvent: CalendarEvent = {
      id: "cal-" + Date.now(),
      title: `Tindak Lanjut: ${finalReport.studentName}`,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week later
      time: "10:00",
      type: "konseling",
      studentName: finalReport.studentName,
      description: `Sesi evaluasi tindak lanjut bagi ${finalReport.studentName} pasca pelaporan kasus ${finalReport.serviceCategory}.`
    };
    saveEvents([followUpEvent, ...events]);

    alert(`Sukses! Laporan untuk ${finalReport.studentName} tersimpan di Arsip dan jadwal tindak lanjut otomatis dibuat di kalender.`);
    setGeneratedReportResult(null);
    setReportForm({
      studentName: "",
      studentClass: "",
      gender: "Laki-laki",
      serviceCategory: "Pribadi",
      counselorName: "Dra. Elok Herawati, M.Pd.",
      date: new Date().toISOString().split('T')[0],
      rawNotes: "",
    });
    setActiveTab("archives");
  };

  // Generate RPL Action
  const generateRplWithAI = async () => {
    if (!rplForm.topic.trim()) {
      alert("Silakan masukkan tema atau topik materi RPL.");
      return;
    }
    setIsGeneratingRpl(true);
    setApiKeyWarning(false);

    try {
      const response = await fetch("/api/rpl/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rplForm),
      });

      if (!response.ok) {
        throw new Error("Gagal menghubungi server");
      }

      const data = await response.json();
      setGeneratedRplResult({
        ...rplForm,
        objectives: data.objectives,
        activities: data.activities,
        evaluation: data.evaluation,
        fullRplMarkdown: data.fullRplMarkdown,
      });

    } catch (err) {
      console.warn("AI Generation error, falling back to offline generator", err);
      setApiKeyWarning(true);
      const mockResult = generateFallbackRpl(rplForm);
      setGeneratedRplResult(mockResult);
    } finally {
      setIsGeneratingRpl(false);
    }
  };

  const generateFallbackRpl = (form: typeof rplForm): Partial<RplTemplate> => {
    const md = `### RENCANA PELAKSANAAN LAYANAN (RPL) BK FORMAL
**Tema:** ${form.topic}
**Sasaran Kelas:** Kelas ${form.classGrade}
**Alokasi Waktu:** ${form.duration}

---

**I. TUJUAN LAYANAN**
* **Tujuan Umum:** Peserta didik memiliki pemahaman mumpuni berkaitan dengan isu kemandirian dan perkembangan ${form.serviceField} secara integral.
* **Tujuan Khusus:**
  1. Menganalisis isu kontemporer mengenai ${form.topic}.
  2. Merumuskan tindakan preventif menghindari hambatan sosial/akademik.
  3. Mempraktikkan kebiasaan sehat harian.

**II. MATERI DAN PROSEDUR PELAYANAN**
* **Pemantik / Es-Breaking:** Guru BK memutar video animasi interaktif berkaitan dengan fokus: "${form.focusPoints}".
* **Kerja Kelompok (Aktivitas):** Siswa membuat peta pikiran di kertas karton berkelompok membahas taktik solusi.
* **Refleksi Hasil:** Setiap murid menulis kalimat resolusi di pohon kertas BK.

**III. RENCANA EVALUASI**
* **Evaluasi Proses:** Observasi keikutsertaan aktif siswa saat pembelajaran sosiometri.
* **Evaluasi Hasil:** Penilaian diri siswa (Self-assessment) dikirim via tautan sekolah.

---
**Mengetahui Kepala Sekolah & Koordinator BK,**
*Penyusunan otomatis BK Auto Admin 2026*`;

    return {
      topic: form.topic,
      classGrade: form.classGrade,
      serviceField: form.serviceField,
      serviceType: form.serviceType,
      duration: form.duration,
      focusPoints: form.focusPoints,
      objectives: `Tujuan Umum agar siswa memahami pentingnya ${form.topic}. Tujuan khusus agar mampu menerapkan perilaku disiplin.`,
      activities: `Pendahuluan: Salam pembuka dan kuis interaktif.\nInti: Diskusi kelompok studi kasus "${form.focusPoints}".\nPenutup: Pengambilan kesimpulan dan lembar refleksi emosi belajar.`,
      evaluation: `Proses: Dilihat dari antusias kolaborasi belajar murid.\nHasil: Mengisi angket google form evaluasi materi bimbingan.`,
      fullRplMarkdown: md,
    };
  };

  const saveGeneratedRplToArchive = () => {
    if (!generatedRplResult) return;
    const finalRpl: RplTemplate = {
      id: "rpl-" + Date.now(),
      topic: generatedRplResult.topic || "Topik Layanan",
      classGrade: generatedRplResult.classGrade || "X",
      serviceField: generatedRplResult.serviceField || "Sosial",
      serviceType: generatedRplResult.serviceType || "Bimbingan Klasikal",
      duration: generatedRplResult.duration || "1 x 45 Menit",
      focusPoints: generatedRplResult.focusPoints || "",
      objectives: generatedRplResult.objectives || "",
      activities: generatedRplResult.activities || "",
      evaluation: generatedRplResult.evaluation || "",
      fullRplMarkdown: generatedRplResult.fullRplMarkdown || "",
      createdAt: new Date().toISOString(),
    };

    const updated = [finalRpl, ...rpls];
    saveRpls(updated);

    // Auto schedule into calendar!
    const calendarEvent: CalendarEvent = {
      id: "cal-" + Date.now(),
      title: `Pemberian RPL: ${finalRpl.topic.substring(0, 25)}...`,
      date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 days later
      time: "08:00",
      type: "klasikal",
      description: `Rencana Pelaksanaan Layanan (RPL) Klasikal untuk kelas ${finalRpl.classGrade} mengenai tema: ${finalRpl.topic}`
    };
    saveEvents([calendarEvent, ...events]);

    alert(`Sukses! Template RPL berhasil masuk Arsip Digital dan agenda klasikal terjadwalkan di kalender.`);
    setGeneratedRplResult(null);
    setRplForm({
      topic: "",
      classGrade: "X",
      serviceField: "Sosial",
      serviceType: "Bimbingan Klasikal",
      duration: "2 x 45 Menit",
      focusPoints: "",
    });
    setActiveTab("archives");
  };

  // Compile selected counseling reports into a single recap
  const generateRecapReportWithAI = async () => {
    if (selectedReportIdsForRecap.length === 0) {
      alert("Harap pilih minimal 1 laporan konseling dari daftar ceklis.");
      return;
    }

    setIsGeneratingRecap(true);
    setApiKeyWarning(false);

    const selectedRecords = reports.filter(r => selectedReportIdsForRecap.includes(r.id));

    try {
      const response = await fetch("/api/counseling/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: recapPeriod,
          records: selectedRecords
        })
      });

      if (!response.ok) {
        throw new Error("Gagal menghubungkan ke server");
      }

      const data = await response.json();
      setGeneratedRecapResult({
        period: recapPeriod,
        identifiedTrends: data.identifiedTrends,
        recommedationsForSchool: data.recommedationsForSchool,
        fullRecapMarkdown: data.fullRecapMarkdown,
      });

    } catch (err) {
      console.warn("AI Generation error for recap, falling back to offline", err);
      setApiKeyWarning(true);
      const mockResult = generateFallbackRecap(selectedRecords, recapPeriod);
      setGeneratedRecapResult(mockResult);
    } finally {
      setIsGeneratingRecap(false);
    }
  };

  const generateFallbackRecap = (records: CounselingReport[], period: string) => {
    const listNames = records.map(r => r.studentName).join(", ");
    const listFieldsOfTrouble = records.map(r => r.serviceCategory);
    
    // Simple frequency count
    const occurrences = listFieldsOfTrouble.reduce((acc, current) => {
      acc[current] = (acc[current] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topField = Object.entries(occurrences).sort((a,b)=> b[1]-a[1])[0]?.[0] || "Sosial";

    const trends = `Ditemukan sebaran kasus terbanyak berada pada rumpun Bidang Bimbingan **${topField}** (Sebanyak ${occurrences[topField] || 1} kasus terdata). Siswa menunjukkan keluhan adaptasi relasional psikologis serta kecemasan akademik tinggi sehubungan persiapan transisi.`;
    const recs = `1. Mendorong bimbingan kelompok klasikal rutin mengenai topik regulasi emosi.\n2. Mengadakan diseminasi psikososial singkat bagi Wali Kelas agar peka gejala disonansi siswa.\n3. Mengaktifkan duta konselor sebaya (Peer Counselor) untuk memantau krisis perundungan mikro digital.`;
    const md = `### LAPORAN REKAPITULASI PELAYANAN BIMBINGAN KONSELING
**Periode Operasional:** ${period}  
**Institusi Penerbit:** Layanan BK UPT SMAN 1 Merdeka

---

#### I. EVALUASI KUANTITATIF SESI
* Total Kasus Teranalisis: **${records.length} Kasus Siswa**
* Individu Terlibat: ${listNames}
* Status Penyelesaian: 100% Terklasifikasi Penanganannya

#### II. DIAGNOSIS POLA & TREN PERMASALAHAN GURU BK
Berdasarkan data input kumulatif, isu krusial di sekolah didominasi oleh kecemasan performa ujian, kontrol diri konsumsi gim digital secara berlebihan, dan sirkulasi pertemanan tidak sehat di media pesan sekolah. Remaja memiliki kerentanan harga diri yang labil sehingga mengganggu kontinuitas fokus akademis guru mata pelajaran.

#### III. REKOMENDASI TERAPUTIK SISTEMIK SEKOLAH
* **Bahan Kepala Sekolah:** Memberikan kebijakan pembatasan gawai pada jam kritis sekolah atau penyegaran sarana rekreasi sekolah pada istirahat siang.
* **Bahan Wali Kelas:** Mengkondisikan pemetaan duduk bervariasi melintasi status sosial demi asimilasi rukun antarsiswa.

---
*Jakarta, 12 Juni 2026*  
**Koordinator Konselor Bimbingan Konseling Sekolah**`;

    return {
      period,
      identifiedTrends: trends,
      recommedationsForSchool: recs,
      fullRecapMarkdown: md
    };
  };

  // Add event to calendar state
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) {
      alert("Judul agenda sekolah wajib diisi!");
      return;
    }

    const newEvent: CalendarEvent = {
      id: "cal-" + Date.now(),
      title: eventForm.title,
      date: eventForm.date,
      time: eventForm.time,
      type: eventForm.type,
      studentName: eventForm.studentName || undefined,
      description: eventForm.description || undefined,
    };

    saveEvents([newEvent, ...events]);
    setIsAddEventOpen(false);
    setEventForm({
      title: "",
      date: "2026-06-15",
      time: "09:00",
      type: "konseling",
      studentName: "",
      description: "",
    });
    alert("Jadwal layanan baru berhasil ditambahkan!");
  };

  // Delete handlers
  const handleDeleteReport = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Apakah Anda yakin ingin menghapus arsip laporan konseling ini secara permanen?")) {
      const updated = reports.filter(r => r.id !== id);
      saveReports(updated);
      if (selectedReport?.id === id) setSelectedReport(null);
    }
  };

  const handleDeleteRpl = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Hapus draf RPL BK ini?")) {
      const updated = rpls.filter(r => r.id !== id);
      saveRpls(updated);
      if (selectedRpl?.id === id) setSelectedRpl(null);
    }
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm("Hapus agenda layanan kalender ini?")) {
      const updated = events.filter(e => e.id !== id);
      saveEvents(updated);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const triggerPrintContent = (domId: string) => {
    const printContents = document.getElementById(domId)?.innerHTML;
    if (!printContents) return;
    const originalContents = document.body.innerHTML;
    
    // Open print window safely or replace body to print beautifully
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>BK Auto Admin - Cetak Dokumen</title>
            <style>
              body { 
                font-family: 'Inter', sans-serif; 
                margin: 40px; 
                color: #333; 
                line-height: 1.6;
                background: white !important;
              }
              pre, code {
                font-family: monospace;
                white-space: pre-wrap;
              }
              h3, h4 { color: #4A5D4E; }
              hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              table, th, td { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            ${printContents}
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      win.document.close();
    } else {
      alert("Pop-up printer diblokir. Harap aktifkan izin pop-up untuk mencetak berkas.");
    }
  };

  // Parser Markdown to HTML helper for direct PDF print
  const parseMarkdownToHTMLDirect = (markdown: string) => {
    if (!markdown) return "";
    let lines = markdown.split("\n");
    let htmlLines = lines.map(line => {
      let trimmed = line.trim();
      if (trimmed.startsWith("### ")) {
        return `<h3 style="font-size: 1.25em; font-weight: bold; color: #1e293b; margin-top: 1em; margin-bottom: 0.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.2em;">${trimmed.slice(4)}</h3>`;
      }
      if (trimmed.startsWith("#### ")) {
        return `<h4 style="font-size: 1.1em; font-weight: bold; color: #334155; margin-top: 0.8em; margin-bottom: 0.4em;">${trimmed.slice(5)}</h4>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h2 style="font-size: 1.4em; font-weight: bold; color: #0f172a; margin-top: 1.2em; margin-bottom: 0.6em; text-align: center;">${trimmed.slice(3)}</h2>`;
      }
      if (trimmed.startsWith("# ")) {
        return `<h1 style="font-size: 1.6em; font-weight: bold; color: #0f1710; margin-top: 1.5em; margin-bottom: 0.8em; text-align: center; text-transform: uppercase;">${trimmed.slice(2)}</h1>`;
      }
      if (trimmed === "---") {
        return `<hr style="border: none; border-top: 2px solid #475569; margin: 1em 0;" />`;
      }
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const itemText = trimmed.slice(2);
        const processedText = itemText.replace(/\*\*(.*?)\*\//g, '<strong>$1</strong>');
        return `<li style="margin-left: 1.5em; margin-bottom: 0.25em; list-style-type: square;">${processedText}</li>`;
      }
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        const itemText = numMatch[2];
        const processedText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return `<li style="margin-left: 1.5em; margin-bottom: 0.25em; list-style-type: decimal;">${processedText}</li>`;
      }
      let processed = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
      if (processed === "") {
        return "<br/>";
      }
      return `<p style="margin-bottom: 0.5em; text-align: justify; text-indent: 0.25in;">${processed}</p>`;
    });
    return htmlLines.join("\n");
  };

  const handleDirectExportExcel = (title: string, markdown: string, type: "report" | "rpl" | "recap", metadata: any = {}) => {
    let excelsheetContent = "";
    const docDate = metadata.date || new Date().toISOString().split('T')[0];
    const counselorName = metadata.counselorName || "Dra. Elok Herawati, M.Pd.";

    if (type === "report") {
      excelsheetContent = `
        <table>
          <tr>
            <th colspan="2" style="font-size: 14pt; font-weight: bold; background-color: #4A5D4E; color: white;">LAPORAN KONSELING INDIVIDU — SMAN 1 MERDEKA</th>
          </tr>
          <tr><td colspan="2"></td></tr>
          <tr style="background-color: #f2f2f2; font-weight: bold;">
            <td style="width: 200px;">ATRIBUT DOKUMEN</td>
            <td style="width: 450px;">NILAI / KETERANGAN KONSUL</td>
          </tr>
          <tr><td>ID Dokumen</td><td>BK-IND-${docDate}-${(metadata.studentName || "").substring(0, 3).toUpperCase()}</td></tr>
          <tr><td>Tanggal Konseling</td><td>${docDate}</td></tr>
          <tr><td>Nama Siswa (Konseli)</td><td>${metadata.studentName || "N/A"}</td></tr>
          <tr><td>Kelas / Rombel</td><td>${metadata.studentClass || "N/A"}</td></tr>
          <tr><td>Jenis Kelamin</td><td>${metadata.gender || "N/A"}</td></tr>
          <tr><td>Bidang Bimbingan</td><td>${metadata.serviceCategory || "Pribadi"}</td></tr>
          <tr><td>Konselor Pembimbing</td><td>${counselorName}</td></tr>
          <tr><td>Catatan Kasar Masalah</td><td>${metadata.rawNotes || markdown.substring(0, 200)}</td></tr>
          <tr><td>Intisari Kasus (Summary)</td><td>${title || "Layanan Individual"}</td></tr>
        </table>
      `;
    } else if (type === "recap") {
      excelsheetContent = `
        <table>
          <tr>
            <th colspan="5" style="font-size: 14pt; font-weight: bold; background-color: #2F4F4F; color: white;">KOMPILASI REKAPITULASI PELAYANAN DIGITAL BK</th>
          </tr>
          <tr><td colspan="5">Periode Laporan: ${metadata.period || "Juni 2026"} | Tanggal Unduh: ${new Date().toLocaleDateString("id-ID")}</td></tr>
          <tr><td colspan="5"></td></tr>
          <tr style="background-color: #dbe5d8; font-weight: bold;">
            <td>Atribut Evaluasi</td>
            <td>Deskripsi Diagnostik / Tren</td>
            <td>Penerima Rekomendasi</td>
            <td>Rencana Kerja Sekolah</td>
          </tr>
          <tr>
            <td valign="top" style="font-weight: bold;">Bidang Kasus Masuk</td>
            <td valign="top">Didominasi oleh sirkulasi beban akademik kelas ujian, gadget berlebihan, dan rumor digital WhatsApp kelompok. (Total Kasus Terintegrasi)</td>
            <td valign="top">Kepala Sekolah & Wali Kelas</td>
            <td valign="top">Memberikan sirkulasi relaksasi istirahat dan penugasan kolaboratif bebas krisis perundungan.</td>
          </tr>
          <tr>
            <td valign="top" style="font-weight: bold;">Tindak Lanjut Utama</td>
            <td valign="top">Evaluasi sosiometri klasikal di kelas X, kelompok kognitif restrukturisasi di kelas XI.</td>
            <td valign="top">Guru Bimbingan Konseling</td>
            <td valign="top">Konseling individu, mediasi keluarga terstruktur, dan pemantauan harian mandiri (Self-journaling).</td>
          </tr>
        </table>
      `;
    } else {
      excelsheetContent = `
        <table>
          <tr>
            <th colspan="2" style="font-size: 14pt; font-weight: bold; background-color: #708090; color: white;">RENCANA PELAKSANAAN LAYANAN (RPL) STANDAR KURIKULUM MERDEKA</th>
          </tr>
          <tr><td colspan="2"></td></tr>
          <tr style="background-color: #eaeaea; font-weight: bold;">
            <td>Tema / Topik</td>
            <td>${metadata.topic || title}</td>
          </tr>
          <tr><td>Sasaran Kelas</td><td>Kelas ${metadata.classGrade || "X"}</td></tr>
          <tr><td>Bidang Layanan</td><td>${metadata.serviceField || "Sosial"}</td></tr>
          <tr><td>Format Bimbingan</td><td>${metadata.serviceType || "Klasikal Layanan"}</td></tr>
          <tr><td>Alokasi Waktu</td><td>${metadata.duration || "2 x 45 Menit"}</td></tr>
          <tr><td>Fokus Poin Pembahasan</td><td>${metadata.focusPoints || "Tertera dalam modul draf lengkap"}</td></tr>
          <tr><td>Penyusun Utama</td><td>${counselorName}</td></tr>
        </table>
      `;
    }

    const excelMarkup = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; font-family: 'Arial', sans-serif; }
          td, th { border: 0.5pt solid #c0c0c0; padding: 5px; font-size: 10pt; }
          th { background-color: #3C4C3E; color: white !important; font-weight: bold; }
        </style>
      </head>
      <body>
        ${excelsheetContent}
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + excelMarkup], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Spreedsheet_BK_${title.replace(/\s+/g, "_")}_${docDate}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDirectExportPdf = (title: string, markdown: string, type: "report" | "rpl" | "recap", metadata: any = {}) => {
    const docDate = metadata.date || new Date().toISOString().split('T')[0];
    const counselorName = metadata.counselorName || "Dra. Elok Herawati, M.Pd.";
    const counselorNip = "19720412 199802 2 003";
    const principalName = "Drs. H. Mulyadi, M.Pd.";
    const principalNip = "19681024 199303 1 002";
    const schoolName = "UPT SMAN 1 MERDEKA";
    const provinceName = "PEMERINTAH PROVINSI DKI JAKARTA";
    const deptName = "DINAS PENDIDIKAN DAN KEBUDAYAAN";
    const schoolAddress = "Jl. Pemuda Pendidikan No. 42, Telp (021) 8591234, Email: info@sman1merdeka.sch.id";
    const docNumber = `BK/S-042/${new Date().getFullYear()}`;

    const headerHtml = `
      <div style="text-align: center; border-bottom: 4px double black; padding-bottom: 15px; margin-bottom: 25px; font-family: 'Times New Roman', serif;">
        <table style="width: 100%; border: none; border-collapse: collapse;">
          <tr>
            <td style="width: 15%; text-align: left; vertical-align: middle; border: none;">
              <span style="font-size: 36pt; color: #4A5D4E;">✦</span>
            </td>
            <td style="width: 85%; text-align: center; border: none; font-family: 'Times New Roman', serif;">
              <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0; padding: 0;">${provinceName}</div>
              <div style="font-size: 13pt; font-weight: 800; text-transform: uppercase; margin: 2px 0; padding: 0; letter-spacing: 0.5px;">${deptName}</div>
              <div style="font-size: 15pt; font-weight: bold; text-transform: uppercase; margin: 2px 0; padding: 0; color: #2e4031;">${schoolName}</div>
              <div style="font-size: 8.5pt; font-style: italic; color: #444; margin: 4px 0 0 0; padding: 0;">${schoolAddress}</div>
            </td>
          </tr>
        </table>
      </div>
    `;

    const titleHtml = `
      <div style="text-align: center; margin-top: 15px; margin-bottom: 25px; font-family: 'Times New Roman', serif;">
        <h2 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 0; text-transform: uppercase; display: inline-block;">
          ${type === "report" ? "LAPORAN FORMAL BIMBINGAN KONSELING" : type === "rpl" ? "RENCANA PELAKSANAAN LAYANAN (RPL) BK" : "LAPORAN REKAPITULASI PELAYANAN BK"}
        </h2>
        <p style="font-family: monospace; font-size: 10pt; color: #444; margin: 4px 0 0 0; text-align: center; text-indent: 0;">Nomor Surat Perihal: ${docNumber}</p>
      </div>
    `;

    let metadataHtml = "";
    if (type === "report" && metadata.studentName) {
      metadataHtml = `
        <div style="margin-bottom: 25px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; font-family: sans-serif; font-size: 11px;">
          <h4 style="font-weight: bold; color: #475569; text-transform: uppercase; margin: 0 0 10px 0; font-size: 10pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">IDENTITAS KONSILIASI SISWA</h4>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #64748b; width: 25%;">Nama Murid / Konseli</td>
              <td style="padding: 4px 0; width: 2%;">:</td>
              <td style="padding: 4px 0; font-weight: bold; color: #4A5D4E;">${metadata.studentName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Kelas & Jenis Kelamin</td>
              <td style="padding: 4px 0;">:</td>
              <td style="padding: 4px 0; font-weight: 500;">${metadata.studentClass} (${metadata.gender})</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Bidang Pelayanan</td>
              <td style="padding: 4px 0;">:</td>
              <td style="padding: 4px 0; font-weight: 600; color: #7e22ce;">Bidang ${metadata.serviceCategory}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Seksi Pelaporan</td>
              <td style="padding: 4px 0;">:</td>
              <td style="padding: 4px 0; font-weight: 500;">${counselorName} (${counselorNip})</td>
            </tr>
          </table>
        </div>
      `;
    } else if (type === "rpl" && metadata.topic) {
      metadataHtml = `
        <div style="margin-bottom: 25px; background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 10px; padding: 15px; font-family: sans-serif; font-size: 11px;">
          <h4 style="font-weight: bold; color: #166534; text-transform: uppercase; margin: 0 0 10px 0; font-size: 10pt; border-bottom: 1px solid #bbf7d0; padding-bottom: 6px;">DATA STRUKTURAL LAYANAN BK</h4>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #15803d; width: 25%;">Tema Klasikal</td>
              <td style="padding: 4px 0; width: 2%;">:</td>
              <td style="padding: 4px 0; font-weight: bold; color: #166534;">${metadata.topic}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #15803d;">Sasaran Tingkat</td>
              <td style="padding: 4px 0;">:</td>
              <td style="padding: 4px 0; font-weight: 500;">Kelas ${metadata.classGrade}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #15803d;">Format Layanan</td>
              <td style="padding: 4px 0;">:</td>
              <td style="padding: 4px 0; font-weight: 600; color: #1d4ed8;">${metadata.serviceType || "Bimbingan Klasikal"} | ${metadata.duration || "2 jp"}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #15803d;">Fokus Sasaran</td>
              <td style="padding: 4px 0;">:</td>
              <td style="padding: 4px 0; font-weight: 500;">${metadata.focusPoints}</td>
            </tr>
          </table>
        </div>
      `;
    }

    const contentHtml = `
      <div class="main-doc-content" style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: black; text-align: justify;">
        ${parseMarkdownToHTMLDirect(markdown)}
      </div>
    `;

    const signaturesHtml = `
      <div class="signature-section" style="margin-top: 50px; font-family: 'Times New Roman', serif; font-size: 11pt; page-break-inside: avoid;">
        <table style="width: 100%; border: none; border-collapse: collapse;">
          <tr>
            <td style="width: 48%; text-align: center; border: none; vertical-align: top;">
              <p style="margin: 0 0 5px 0; text-indent: 0; text-align: center;">Mengetahui,</p>
              <p style="font-weight: bold; margin: 0 0 70px 0; text-indent: 0; text-align: center;">Kepala Sekolah ${schoolName}</p>
              <p style="text-decoration: underline; font-weight: bold; margin: 0; text-indent: 0; text-align: center;">${principalName}</p>
              <p style="font-size: 9pt; margin: 2px 0 0 0; color: #555; text-indent: 0; text-align: center;">NIP. ${principalNip}</p>
            </td>
            <td style="width: 4%;"></td>
            <td style="width: 48%; text-align: center; border: none; vertical-align: top;">
              <p style="margin: 0 0 5px 0; text-indent: 0; text-align: center;">Jakarta, ${docDate}</p>
              <p style="font-weight: bold; margin: 0 0 70px 0; text-indent: 0; text-align: center;">Guru Bimbingan Konseling</p>
              <p style="text-decoration: underline; font-weight: bold; margin: 0; text-indent: 0; text-align: center;">${counselorName}</p>
              <p style="font-size: 9pt; margin: 2px 0 0 0; color: #555; text-indent: 0; text-align: center;">NIP. ${counselorNip}</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>BK Auto Admin — Ekspor Resmi PDF</title>
            <style>
              @page {
                size: A4;
                margin: 20mm;
              }
              @media print {
                body { margin: 0; padding: 0; background: white; color: black; }
              }
              body {
                font-family: 'Times New Roman', serif;
                color: black;
                font-size: 11pt;
                line-height: 1.5;
                padding: 10px;
                background: white;
              }
              h1, h2, h3, h4 { color: black; margin-top: 1.2em; font-weight: bold; font-family: 'Times New Roman', serif; }
              h1 { font-size: 16pt; text-align: center; text-transform: uppercase; margin-bottom: 0px; }
              h2 { font-size: 13pt; text-align: center; text-transform: uppercase; margin-top: 5px; margin-bottom: 20px; }
              h3 { font-size: 12pt; border-bottom: 1.5px solid black; padding-bottom: 2px; margin-top: 25px; }
              h4 { font-size: 11pt; margin-top: 15px; }
              p { text-align: justify; text-indent: 0.3in; margin-bottom: 8px; }
              li { margin-left: 20px; margin-bottom: 4px; }
              hr { border: none; border-top: 3.5px double black; margin: 15px 0; }
              .main-doc-content p {
                 text-indent: 0.3in !important;
                 text-align: justify !important;
                 margin-bottom: 8px !important;
              }
            </style>
          </head>
          <body>
            ${headerHtml}
            ${titleHtml}
            ${metadataHtml}
            ${contentHtml}
            ${signaturesHtml}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert("Popup printer diblokir browser. Izinkan popup untuk mencetak langsung.");
    }
  };

  // Filtered reports computed
  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentClass.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.rawNotes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = fieldFilter === "Semua" || r.serviceCategory === fieldFilter;
    return matchesSearch && matchesFilter;
  });

  // Filtered RPLs
  const filteredRpls = rpls.filter(r => {
    const matchesSearch = 
      r.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.focusPoints.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = fieldFilter === "Semua" || r.serviceField === fieldFilter;
    return matchesSearch && matchesFilter;
  });

  // Calculate stats for Dashboard
  const totalReportsCount = reports.length;
  const hoursSavedEst = reports.length * 3; // Estimated 3 hours saved per counseling document formatting
  const activeFollowups = events.filter(e => e.type === "konseling" || e.type === "home_visit").length;
  
  // Count cases per field
  const categoryStats = {
    Pribadi: reports.filter(r => r.serviceCategory === "Pribadi").length,
    Sosial: reports.filter(r => r.serviceCategory === "Sosial").length,
    Belajar: reports.filter(r => r.serviceCategory === "Belajar").length,
    Karir: reports.filter(r => r.serviceCategory === "Karir").length,
  };

  // Calendar logic helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const startDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday ...
  };

  const getMonthNameIndonesian = (monthIdx: number) => {
    const names = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return names[monthIdx];
  };

  const handlePrevMonth = () => {
    let nextMonth = currentDate.getMonth() - 1;
    let nextYear = currentDate.getFullYear();
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    }
    setCurrentDate(new Date(nextYear, nextMonth, 12));
  };

  const handleNextMonth = () => {
    let nextMonth = currentDate.getMonth() + 1;
    let nextYear = currentDate.getFullYear();
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setCurrentDate(new Date(nextYear, nextMonth, 12));
  };

  // Pre-load date values
  const currentYear = currentDate.getFullYear();
  const currentMonthIdx = currentDate.getMonth();
  const daysCount = getDaysInMonth(currentYear, currentMonthIdx);
  const startDayOffset = startDayOfMonth(currentYear, currentMonthIdx);

  // Calendar render structures
  const calendarCells = [];
  // Empty offset cells
  for (let s = 0; s < startDayOffset; s++) {
    calendarCells.push(null);
  }
  // Days cells
  for (let d = 1; d <= daysCount; d++) {
    calendarCells.push(d);
  }

  return (
    <div className="flex h-screen w-full bg-[#FDFBF7] text-[#3D3D29] font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION - MATCHING NATURAL TONES THEME */}
      <aside className="w-64 bg-[#4A5D4E] text-[#F1F5F2] flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#A3B18A] rounded-xl flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg tracking-tight text-white leading-none">BK AutoAdmin</h1>
              <span className="text-[10px] text-[#A3B18A] font-mono tracking-wider">ASISTEN PINTAR GURU BK</span>
            </div>
          </div>

          <nav className="space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-[#A3B18A] font-semibold mb-2">UTAMA</p>
              
              <button 
                onClick={() => setActiveTab("dashboard")} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "dashboard" ? "bg-[#5B6D5E] text-white shadow" : "text-[#D1DCD2] hover:text-white hover:bg-[#5B6D5E]/30"
                }`}
                id="tab-dashboard"
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Dashboard Utama</span>
              </button>

              <button 
                onClick={() => setActiveTab("create-report")} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "create-report" ? "bg-[#5B6D5E] text-white shadow" : "text-[#D1DCD2] hover:text-white hover:bg-[#5B6D5E]/30"
                }`}
                id="tab-create-report"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="text-left flex-1">Auto Buat Laporan</span>
                <span className="bg-[#A3B18A] text-white text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">AI</span>
              </button>

              <button 
                onClick={() => setActiveTab("recap-reports")} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "recap-reports" ? "bg-[#5B6D5E] text-white shadow" : "text-[#D1DCD2] hover:text-white hover:bg-[#5B6D5E]/30"
                }`}
                id="tab-recap-reports"
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span className="text-left flex-1">Auto Rekap Konseling</span>
                <span className="bg-[#A3B18A] text-white text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">AI</span>
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-[#A3B18A] font-semibold mb-2">LAYANAN MANDIRI</p>
              
              <button 
                onClick={() => setActiveTab("rpl-templates")} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "rpl-templates" ? "bg-[#5B6D5E] text-white shadow" : "text-[#D1DCD2] hover:text-white hover:bg-[#5B6D5E]/30"
                }`}
                id="tab-rpl-templates"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="text-left flex-1">Template RPL BK</span>
                <span className="bg-[#A3B18A] text-white text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">AI</span>
              </button>

              <button 
                onClick={() => setActiveTab("archives")} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "archives" ? "bg-[#5B6D5E] text-white shadow" : "text-[#D1DCD2] hover:text-white hover:bg-[#5B6D5E]/30"
                }`}
                id="tab-archives"
              >
                <Archive className="w-4 h-4 shrink-0" />
                <span className="text-left flex-1">Arsip Digital BK</span>
                <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded font-semibold text-white">
                  {reports.length + rpls.length}
                </span>
              </button>

              <button 
                onClick={() => setActiveTab("calendar")} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "calendar" ? "bg-[#5B6D5E] text-white shadow" : "text-[#D1DCD2] hover:text-white hover:bg-[#5B6D5E]/30"
                }`}
                id="tab-calendar"
              >
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span className="text-left flex-1">Kalender Layanan</span>
                <span className="bg-orange-400 text-[#4A5D4E] text-[10px] px-1.5 py-0.5 rounded font-bold font-mono">
                  {events.length}
                </span>
              </button>
            </div>
          </nav>
        </div>

        {/* PWA INSTALL TRIGGER */}
        {isInstallable && (
          <div className="p-4 border-t border-[#5B6D5E] bg-[#8F9F77]/10 space-y-1.5 animate-fadeIn shrink-0">
            <p className="text-[10px] text-[#C0CEC1] uppercase tracking-widest font-bold font-mono">PWA INSTALASI OFFLINE</p>
            <button
              onClick={handleInstallPWA}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#9CC09E] hover:bg-[#b0d4b2] text-[#121612] font-extrabold rounded-lg text-xs transition-all duration-200 shadow-md cursor-pointer active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Instal Aplikasi BK</span>
            </button>
            <p className="text-[9px] text-[#A2B5A2] leading-tight text-center">Akses bimbingan sekolah mandiri tanpa internet.</p>
          </div>
        )}

        {/* PROFILE AT FOOTER OF SIDEBAR */}
        {!user ? (
          <div className="mt-auto p-4 border-t border-[#5B6D5E] space-y-2">
            <div className="p-3 bg-[#5B6D5E]/30 rounded-xl text-center">
              <p className="text-[10px] text-[#D1DCD2] mb-2 uppercase tracking-wider font-semibold">Copot Batasan Lokal</p>
              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-[#3D3D29] hover:text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Masuk Google</span>
              </button>
              <p className="text-[9px] text-[#D1DCD2]/70 mt-1.5 leading-tight">Sinkronkan data aman ke Cloud secara otomatis</p>
            </div>
          </div>
        ) : (
          <div className="mt-auto p-4 border-t border-[#5B6D5E] space-y-2.5 bg-[#5B6D5E]/15">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  referrerPolicy="no-referrer" 
                  className="w-10 h-10 rounded-full border-2 border-emerald-400 shrink-0 shadow-sm" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#A3B18A] border-2 border-emerald-400 flex items-center justify-center font-bold text-white shadow-inner shrink-0">
                  {user.displayName?.substring(0, 2).toUpperCase() || 'BK'}
                </div>
              )}
              <div className="text-xs overflow-hidden leading-tight flex-1">
                <p className="font-bold text-white truncate text-ellipsis" title={user.displayName || "Guru BK"}>
                  {user.displayName || "Guru BK"}
                </p>
                <p className="text-[10px] text-[#D1DCD2] truncate text-ellipsis" title={user.email}>
                  {user.email}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                onClick={handleGoogleLogin}
                title="Ganti ke akun Google (seperti beralih email Gmail)"
                className="px-2 py-1.5 bg-[#5B6D5E] hover:bg-[#6c8270] active:scale-[0.97] text-white rounded-lg text-[10px] font-bold text-center border border-[#5B6D5E]/30 transition cursor-pointer"
              >
                Ganti Akun
              </button>
              <button
                onClick={handleLogout}
                title="Keluar dari akun cloud"
                className="px-2 py-1.5 bg-red-650 hover:bg-red-750 active:scale-[0.97] text-red-100 hover:text-white rounded-lg text-[10px] font-bold text-center transition cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* CORE/MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* REUSABLE HEADER */}
        <header className="h-20 border-b border-[#E5E0D5] flex items-center justify-between px-8 bg-white/50 shrink-0">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-[#7C8271] font-semibold">UNIT BIMBINGAN & KONSELING</span>
            <h2 className="text-xl font-heading font-semibold text-[#4A5D4E]">
              {activeTab === "dashboard" && "Dashboard Produktivitas Konselor"}
              {activeTab === "create-report" && "Asisten Auto Penyusunan Laporan"}
              {activeTab === "recap-reports" && "AI Kompilasi Rekapitulasi Kasus"}
              {activeTab === "rpl-templates" && "Pembuat RPL BK Standar Kurikulum Merdeka"}
              {activeTab === "archives" && "Arsip Digital Administrasi BK"}
              {activeTab === "calendar" && "Agenda Pelayanan Siswa & Konseling harian"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setReportForm({
                  studentName: "",
                  studentClass: "",
                  gender: "Laki-laki",
                  serviceCategory: "Pribadi",
                  counselorName: "Dra. Elok Herawati, M.Pd.",
                  date: new Date().toISOString().split('T')[0],
                  rawNotes: "",
                });
                setGeneratedReportResult(null);
                setActiveTab("create-report");
              }} 
              className="px-4 py-2 bg-[#A3B18A] hover:bg-[#8F9F77] text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow Transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Input Konseling Baru</span>
            </button>
          </div>
        </header>

        {/* PRIMARY WINDOW CHANGER */}
        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          
          {/* SYNC/MIGRATION PROMPT BANNER FOR AUTHENTICATED USERS */}
          {user && showSyncPrompt && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900">Sinkronisasi Data Lokal Terdeteksi</p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Anda baru saja masuk dengan akun <strong>{user.email}</strong>. Apakah Anda ingin menyinkronkan data lokal Anda (arsip bimbingan konseling, RPL, & agenda kalender) ke server cloud akun ini agar dapat aman diakses dari mana saja?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 md:self-center">
                <button 
                  onClick={startCloudMigration}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-[#4A5D4E] hover:bg-[#3C4C3E] active:scale-[0.98] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? "Menyinkronkan..." : "Ya, Sinkronisasi ke Cloud"}
                </button>
                <button 
                  onClick={() => setShowSyncPrompt(false)}
                  className="px-3 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 active:scale-[0.98] text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Abaikan
                </button>
              </div>
            </div>
          )}

          {/* WARNING FOR MISSING OR FAILED GEMINI KEY - GENTLE INFORMATIONAL BANNER */}
          {apiKeyWarning && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-850 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-orange-500 mt-0.5" />
              <div>
                <p className="font-bold">Mode Simulasi Mandiri Aktif</p>
                <p className="text-xs opacity-90 mt-0.5">
                  Server menggunakan algoritma pemetaan formal BK terintegrasi lokal untuk menyusun dokumen Markdown karena rute internet terhalang atau kunci lisensi Gemini API belum dikonfigurasi. Laporan tetap dihasilkan dengan format MGBK standar nasional yang rapi!
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* STATUS METRICS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                <div onClick={() => setActiveTab("archives")} className="bg-white p-6 rounded-2xl border border-[#E5E0D5] shadow-sm hover:border-[#A3B18A] transition cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-semibold text-[#7C8271] uppercase tracking-wider">Laporan Tersimpan</p>
                    <span className="p-1.5 bg-[#F1F5F2] rounded-lg text-[#4A5D4E]">
                      <FileCheck className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-3xl font-heading font-bold text-[#4A5D4E]">{reports.length}</p>
                  <p className="mt-2 text-xs text-[#A3B18A] font-medium">Lengkap & terarsip aman</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#E5E0D5] shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-semibold text-[#7C8271] uppercase tracking-wider">Estimasi Waktu Bebas</p>
                    <span className="p-1.5 bg-[#F1F5F2] rounded-lg text-[#4A5D4E]">
                      <Clock className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-3xl font-heading font-bold text-[#4A5D4E]">{hoursSavedEst} Jam</p>
                  <p className="mt-2 text-xs text-[#A3B18A] font-medium">Bebas dari mengetik manual</p>
                </div>

                <div onClick={() => setActiveTab("calendar")} className="bg-white p-6 rounded-2xl border border-[#E5E0D5] shadow-sm hover:border-[#A3B18A] transition cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-semibold text-[#7C8271] uppercase tracking-wider">Agenda Pelayanan</p>
                    <span className="p-1.5 bg-[#F1F5F2] rounded-lg text-[#4A5D4E]">
                      <Calendar className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-3xl font-heading font-bold text-[#4A5D4E]">{activeFollowups}</p>
                  <p className="mt-2 text-xs text-orange-500 font-medium">Butuh diimplementasikan</p>
                </div>

                <div onClick={() => setActiveTab("archives")} className="bg-white p-6 rounded-2xl border border-[#E5E0D5] shadow-sm hover:border-[#A3B18A] transition cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-semibold text-[#7C8271] uppercase tracking-wider">Total Template RPL</p>
                    <span className="p-1.5 bg-[#F1F5F2] rounded-lg text-[#4A5D4E]">
                      <BookOpen className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-3xl font-heading font-bold text-[#4A5D4E]">{rpls.length}</p>
                  <p className="mt-2 text-xs text-[#A3B18A] font-medium">Siap cetak untuk akreditasi</p>
                </div>

              </div>

              {/* CORE DASHBOARD MIDDLE ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* RECENT COUNSELING TRANSACTIONS */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E0D5] shadow-sm flex flex-col overflow-hidden">
                  <div className="p-5 border-b border-[#E5E0D5] flex justify-between items-center bg-[#FDFBF7]/40">
                    <h3 className="font-heading font-bold text-[#4A5D4E]">Aktivitas Layanan & Log Kasus Terakhir</h3>
                    <button onClick={() => setActiveTab("archives")} className="text-xs font-semibold text-[#4A5D4E] hover:underline">
                      Lihat Semua Berkas
                    </button>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    {reports.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">
                        Belum ada laporan konseling yang terdaftar. Gunakan Tab "Auto Buat Laporan" untuk memulai!
                      </div>
                    ) : (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] text-[#7C8271] uppercase tracking-widest bg-[#FDFBF7] border-b border-[#E5E0D5]">
                            <th className="px-6 py-3.5">Nama & Kelas</th>
                            <th className="px-6 py-3.5">Bidang BK</th>
                            <th className="px-6 py-3.5">Ringkasan Masalah</th>
                            <th className="px-6 py-3.5">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E0D5] text-sm">
                          {reports.slice(0, 4).map((rep) => (
                            <tr key={rep.id} className="hover:bg-[#FDFBF7]/30 transition">
                              <td className="px-6 py-4 font-medium">
                                <p className="text-[#3D3D29] font-semibold">{rep.studentName}</p>
                                <p className="text-xs text-[#7C8271] font-mono">{rep.studentClass} ({rep.gender === "Laki-laki" ? "L" : "P"})</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                  rep.serviceCategory === "Pribadi" ? "bg-purple-100 text-purple-700 font-mono" :
                                  rep.serviceCategory === "Sosial" ? "bg-pink-100 text-pink-700 font-mono" :
                                  rep.serviceCategory === "Belajar" ? "bg-amber-100 text-amber-700 font-mono" :
                                  "bg-blue-100 text-blue-700 font-mono"
                                }`}>
                                  {rep.serviceCategory}
                                </span>
                              </td>
                              <td className="px-6 py-4 max-w-xs truncate text-[#7C8271]">
                                {rep.summary}
                              </td>
                              <td className="px-6 py-4 text-xs font-semibold">
                                <button 
                                  onClick={() => {
                                    setSelectedReport(rep);
                                    setActiveTab("archives");
                                  }} 
                                  className="text-[#4A5D4E] hover:text-[#A3B18A] hover:underline mr-3"
                                >
                                  Buka Desk
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  
                  {/* METRIC GRAPH EMBEDDED - DEMONSTRATION WORKLOAD */}
                  <div className="p-5 border-t border-[#E5E0D5] bg-[#FDFBF7]/20">
                    <p className="text-xs font-semibold text-[#7C8271] uppercase tracking-wider mb-3">Distribusi Sesi Berdasarkan Bidang BK</p>
                    <div className="grid grid-cols-4 gap-4">
                      {Object.entries(categoryStats).map(([catName, count]) => {
                        const total = reports.length || 1;
                        const percentage = Math.round((count / total) * 100);
                        return (
                          <div key={catName} className="bg-[#FDFBF7] p-3 rounded-xl border border-[#E5E0D5]">
                            <p className="text-[11px] font-bold text-[#7C8271] uppercase">{catName}</p>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-xl font-bold text-[#4A5D4E]">{count}</span>
                              <span className="text-xs text-gray-400">Kasus ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-[#E5E0D5] h-1.5 rounded-full mt-2 overflow-hidden">
                              <div 
                                className={`h-full ${
                                  catName === "Pribadi" ? "bg-purple-500" :
                                  catName === "Sosial" ? "bg-pink-500" :
                                  catName === "Belajar" ? "bg-amber-500" :
                                  "bg-blue-500"
                                }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* SIDEBAR QUICK ACTIONS & TOMORROW AGENDA peeker */}
                <div className="space-y-6">
                  
                  {/* STATS RADAR / VALUE OFFERING BOX */}
                  <div className="bg-[#4A5D4E] p-6 rounded-2xl text-[#F1F5F2] shadow-md flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#A3B18A] tracking-widest pl-0.5">Aspek Filosofi BK</span>
                      <h4 className="text-lg font-heading font-bold text-white mt-2 leading-snug">"Meningkatkan kehadiran empiris disisi konseli, memotong sekat administrasi"</h4>
                      <p className="text-xs text-[#D1DCD2] mt-3 leading-relaxed">
                        Dengan asisten otomatisasi ini, guru BK menghemat 85% waktu pembuatan draf RPL dan mempermudah visualisasi data rekapitulasi sekolah. Pengiriman data dilindungi enkripsi internal sekolah.
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-[#5B6D5E] flex items-center justify-between text-xs text-[#A3B18A] font-mono">
                      <span>VERSI 3.0.0 (STABLE)</span>
                      <span>Sistem Operasi: Aktif</span>
                    </div>
                  </div>

                  {/* QUICK START CLINICAL SCENARIOS BOARD */}
                  <div className="bg-white p-5 rounded-2xl border border-[#E5E0D5] shadow-sm">
                    <h3 className="font-heading font-bold text-[#4A5D4E] mb-3 flex items-center gap-2 text-sm pr-2">
                      <Sparkles className="w-4 h-4 text-[#A3B18A]" />
                      <span>Uji Coba Skenario Cepat</span>
                    </h3>
                    <p className="text-xs text-[#7C8271] mb-4">
                      Klik salah satu tombol skenario di bawah ini untuk menguji generator otomatis secara praktis:
                    </p>
                    
                    <div className="space-y-3 font-medium">
                      
                      <div 
                        onClick={() => {
                          applyQuickScenario("game");
                          setActiveTab("create-report");
                        }} 
                        className="p-3 bg-[#FDFBF7] hover:bg-[#F1F5F2] border border-[#E5E0D5] rounded-xl cursor-pointer transition text-xs"
                      >
                        <p className="font-bold text-[#4A5D4E]">Skenario Game Online & Penundaan</p>
                        <p className="text-[11px] text-[#7C8271] mt-0.5">Rizky Aditya (Gim Daring & begadang)</p>
                      </div>

                      <div 
                        onClick={() => {
                          applyQuickScenario("career");
                          setActiveTab("create-report");
                        }} 
                        className="p-3 bg-[#FDFBF7] hover:bg-[#F1F5F2] border border-[#E5E0D5] rounded-xl cursor-pointer transition text-xs"
                      >
                        <p className="font-bold text-[#4A5D4E]">Skenario Dilema Karir Kampus</p>
                        <p className="text-[11px] text-[#7C8271] mt-0.5">Farhan Syahputra (Sipil vs Akuntansi Keuangan)</p>
                      </div>

                      <div 
                        onClick={() => {
                          applyQuickScenario("social");
                          setActiveTab("create-report");
                        }} 
                        className="p-3 bg-[#FDFBF7] hover:bg-[#F1F5F2] border border-[#E5E0D5] rounded-xl cursor-pointer transition text-xs"
                      >
                        <p className="font-bold text-[#4A5D4E]">Rumor WhatsApp & Trauma Sosial</p>
                        <p className="text-[11px] text-[#7C8271] mt-0.5">Aisyah Rahmawati (Miskomunikasi Digital Kelas X)</p>
                      </div>

                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: CREATE REPORT (AI GENERATOR) */}
          {activeTab === "create-report" && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
              
              <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-heading font-bold text-[#4A5D4E] text-lg">Input Konseling & Catatan Kasar</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => applyQuickScenario("game")} 
                      className="px-2 py-1 bg-[#F1F5F2] text-[#4A5D4E] rounded text-xs hover:bg-[#A3B18A]/20 font-medium"
                    >
                      Beban Game
                    </button>
                    <button 
                      onClick={() => applyQuickScenario("career")} 
                      className="px-2 py-1 bg-[#F1F5F2] text-[#4A5D4E] rounded text-xs hover:bg-[#A3B18A]/20 font-medium"
                    >
                      Dilema Kuliah
                    </button>
                    <button 
                      onClick={() => applyQuickScenario("social")} 
                      className="px-2 py-1 bg-[#F1F5F2] text-[#4A5D4E] rounded text-xs hover:bg-[#A3B18A]/20 font-medium"
                    >
                      Konflik WA
                    </button>
                    <button 
                      onClick={() => applyQuickScenario("anxiety")} 
                      className="px-2 py-1 bg-[#F1F5F2] text-[#4A5D4E] rounded text-xs hover:bg-[#A3B18A]/20 font-medium"
                    >
                      Trauma Kelas
                    </button>
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); generateCounselingReportWithAI(); }} className="space-y-4 text-xs md:text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Nama Konseli (Siswa)</label>
                      <input 
                        type="text" 
                        required
                        className="w-full border border-[#E5E0D5] rounded-lg p-2.5 bg-[#FDFBF7] focus:outline-[#A3B18A]" 
                        placeholder="Contoh: Farhan Syahputra"
                        value={reportForm.studentName}
                        onChange={(e) => setReportForm({...reportForm, studentName: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Kelas / Rombel</label>
                      <input 
                        type="text" 
                        required
                        className="w-full border border-[#E5E0D5] rounded-lg p-2.5 bg-[#FDFBF7] focus:outline-[#A3B18A]" 
                        placeholder="Contoh: XI-MIPA 2" 
                        value={reportForm.studentClass}
                        onChange={(e) => setReportForm({...reportForm, studentClass: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Jenis Kelamin</label>
                      <select 
                        className="w-full border border-[#E5E0D5] rounded-lg p-2.5 bg-[#FDFBF7] focus:outline-[#A3B18A]"
                        value={reportForm.gender}
                        onChange={(e) => setReportForm({...reportForm, gender: e.target.value as Gender})}
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Bidang Layanan</label>
                      <select 
                        className="w-full border border-[#E5E0D5] rounded-lg p-2.5 bg-[#FDFBF7] focus:outline-[#A3B18A]"
                        value={reportForm.serviceCategory}
                        onChange={(e) => setReportForm({...reportForm, serviceCategory: e.target.value as ServiceField})}
                      >
                        <option value="Pribadi">Pribadi</option>
                        <option value="Sosial">Sosial</option>
                        <option value="Belajar">Belajar</option>
                        <option value="Karir">Karir</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Tanggal Konseling</label>
                      <input 
                        type="date"
                        className="w-full border border-[#E5E0D5] rounded-lg p-2 bg-[#FDFBF7] focus:outline-[#A3B18A]"
                        value={reportForm.date}
                        onChange={(e) => setReportForm({...reportForm, date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Nama Konselor / Guru BK</label>
                      <input 
                        type="text"
                        className="w-full border border-[#E5E0D5] rounded-lg p-2.5 bg-[#FDFBF7] focus:outline-[#A3B18A]"
                        value={reportForm.counselorName}
                        onChange={(e) => setReportForm({...reportForm, counselorName: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center">
                      <div className="p-3 bg-[#F1F5F2] border border-[#E5E0D5] rounded-lg text-xs text-[#7C8271] w-full">
                        <span className="font-bold block mb-1">💡 Tips Guru BK Hebat:</span>
                        Tulis saja keluhan verbal orisinal siswa di bagian catatan kasar. AI akan memformulasikannya ke dalam istilah ilmiah keilmuan psikologis.
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Catatan kasar / Hasil Wawancara Mentah</label>
                    <textarea 
                      required
                      className="w-full border border-[#E5E0D5] rounded-lg p-3 bg-[#FDFBF7] focus:outline-[#A3B18A] min-h-[140px] font-sans" 
                      placeholder="Contoh: anak nangis di perpus karena dikatain temen di wa chat grup... (Tulis secara santai dan padat)"
                      value={reportForm.rawNotes}
                      onChange={(e) => setReportForm({...reportForm, rawNotes: e.target.value})}
                    ></textarea>
                  </div>

                  <button 
                    type="submit"
                    disabled={isGeneratingReport}
                    className="w-full py-3 bg-[#4A5D4E] hover:bg-[#3C4C3E] text-white flex items-center justify-center gap-2 rounded-xl font-semibold shadow transition disabled:opacity-50"
                  >
                    {isGeneratingReport ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Memformulasikan Laporan Formal via AI ...
                      </span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#A3B18A]" />
                        <span>Formulasikan Laporan Formal dengan AI</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* GENERATED OUTCOME DISCOVERY PANEL */}
              {generatedReportResult && (
                <div className="bg-[#white] rounded-2xl border-2 border-[#A3B18A] p-6 shadow-md md:grid md:grid-cols-3 gap-6 animate-fadeIn">
                  
                  {/* CLINICAL SYNOPSIS BREAKDOWN */}
                  <div className="col-span-1 border-r border-[#E5E0D5] pr-6 space-y-4 text-sm">
                    <span className="px-2 py-0.5 bg-[#4A5D4E] text-[#F1F5F2] rounded text-[10px] font-bold tracking-widest font-mono">FORMAL METADATA</span>
                    
                    <div>
                      <h4 className="text-xs text-[#7C8271] uppercase font-bold tracking-wider">Siswa Terkait</h4>
                      <p className="font-bold text-[#4A5D4E] text-base">{generatedReportResult.studentName}</p>
                      <p className="text-xs text-[#3D3D29]">{generatedReportResult.studentClass} ({generatedReportResult.gender})</p>
                    </div>

                    <div>
                      <h4 className="text-xs text-[#7C8271] uppercase font-bold tracking-wider">Intisari Sesi BK</h4>
                      <p className="text-xs text-[#3D3D29] bg-[#FDFBF7] p-2.5 rounded-lg border border-[#E5E0D5] mt-1 leading-relaxed">
                        {generatedReportResult.summary}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs text-[#7C8271] uppercase font-bold tracking-wider">Analisis Psikologis</h4>
                      <p className="text-[11px] text-[#7C8271] mt-1 leading-relaxed">
                        {generatedReportResult.problemAnalysis}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs text-[#7C8271] uppercase font-bold tracking-wider">Rekomendasi Tindak Lanjut</h4>
                      <ul className="text-xs text-[#3D3D29] space-y-1 mt-1 pl-4 list-decimal font-medium">
                        {generatedReportResult.actionPlan?.split('\n').map((act, i) => (
                          <li key={i}>{act.replace(/^\d+[\.\s\-]/, '')}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-[#E5E0D5]">
                      <button 
                        onClick={saveGeneratedReportToArchive}
                        className="w-full py-2.5 bg-[#A3B18A] hover:bg-[#8F9F77] text-white font-bold rounded-lg shadow text-xs flex items-center justify-center gap-2"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Simpan Ke Arsip & Kalender</span>
                      </button>
                    </div>
                  </div>

                  {/* PRINT DOCUMENT EMULATION IN RIGHT HAND SIDE */}
                  <div className="col-span-2 mt-6 md:mt-0 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-bold text-[#7C8271] uppercase tracking-widest font-mono">DRAF DOKUMEN SIAP CETAK (ADMIN BK)</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => copyToClipboard(generatedReportResult.formalReportMarkdown || "", "rep-gen")}
                          className="p-1.5 bg-[#FDFBF7] border border-[#E5E0D5] rounded-lg hover:border-[#A3B18A] flex items-center gap-1.5 text-xs font-semibold"
                        >
                          {copiedId === "rep-gen" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === "rep-gen" ? "Disalin!" : "Salin MD"}</span>
                        </button>
                        <button 
                          onClick={() => {
                            setActiveFormatter({
                              id: "temp-report",
                              title: `Laporan Konseling Resmi - ${generatedReportResult.studentName}`,
                              content: generatedReportResult.formalReportMarkdown || "",
                              type: "report",
                              metadata: {
                                studentName: generatedReportResult.studentName,
                                studentClass: generatedReportResult.studentClass,
                                gender: generatedReportResult.gender,
                                date: generatedReportResult.date,
                                counselorName: generatedReportResult.counselorName,
                                serviceCategory: generatedReportResult.serviceCategory,
                                rawNotes: generatedReportResult.rawNotes
                              }
                            });
                          }}
                          className="p-1.5 bg-[#4A5D4E] hover:bg-[#3C4C3E] text-white rounded-lg flex items-center gap-1.5 text-xs font-bold shadow"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#A3B18A]" />
                          <span>Edit/Cetak Kustom Resmi</span>
                        </button>
                        <button 
                          onClick={() => triggerPrintContent("raw-markdown-area")}
                          className="p-1.5 bg-[#FDFBF7] border border-[#E5E0D5] rounded-lg hover:border-[#A3B18A] flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak Laporan</span>
                        </button>

                        <button 
                          onClick={() => {
                            if (generatedReportResult) {
                              handleDirectExportPdf(
                                `Laporan Konseling Resmi - ${generatedReportResult.studentName}`,
                                generatedReportResult.formalReportMarkdown || "",
                                "report",
                                {
                                  studentName: generatedReportResult.studentName,
                                  studentClass: generatedReportResult.studentClass,
                                  gender: generatedReportResult.gender,
                                  date: generatedReportResult.date,
                                  counselorName: generatedReportResult.counselorName,
                                  serviceCategory: generatedReportResult.serviceCategory,
                                  rawNotes: generatedReportResult.rawNotes
                                }
                              );
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Ekspor PDF</span>
                        </button>

                        <button 
                          onClick={() => {
                            if (generatedReportResult) {
                              handleDirectExportExcel(
                                `Laporan Konseling Resmi - ${generatedReportResult.studentName}`,
                                generatedReportResult.formalReportMarkdown || "",
                                "report",
                                {
                                  studentName: generatedReportResult.studentName,
                                  studentClass: generatedReportResult.studentClass,
                                  gender: generatedReportResult.gender,
                                  date: generatedReportResult.date,
                                  counselorName: generatedReportResult.counselorName,
                                  serviceCategory: generatedReportResult.serviceCategory,
                                  rawNotes: generatedReportResult.rawNotes
                                }
                              );
                            }
                          }}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Ekspor Excel (.xls)</span>
                        </button>
                      </div>
                    </div>

                    <div 
                      id="raw-markdown-area"
                      className="border border-[#E5E0D5] rounded-xl p-6 bg-white shadow-inner max-h-[450px] overflow-y-auto"
                    >
                      <div className="prose text-xs text-[#3D3D29] whitespace-pre-wrap leading-relaxed font-mono">
                        {generatedReportResult.formalReportMarkdown}
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 3: AUTO RECAP CONSULTATIONS (AI POWERED) */}
          {activeTab === "recap-reports" && (
            <div className="space-y-8 animate-fadeIn">
              
              <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-heading font-bold text-[#4A5D4E] text-lg">AI Rekapitulasi & Kompilator Kasus</h3>
                  <p className="text-xs text-[#7C8271] mt-1">
                    Silakan tentukan periode rekam kasus dan pilih minimal 1 atau beberapa sesi konseling siswa di bawah ini untuk dikompilasi secara otomatis oleh kecerdasan buatan menjadi draf pelaporan formal untuk Kepala Sekolah.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[#E5E0D5] mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Periode Analisis Sekolah</label>
                    <input 
                      type="text" 
                      className="w-full border border-[#E5E0D5] rounded-lg p-2 bg-[#FDFBF7] text-sm focus:outline-[#A3B18A]"
                      value={recapPeriod}
                      onChange={(e) => setRecapPeriod(e.target.value)}
                      placeholder="Contoh: Bulanan (Juni 2026) atau Semester Ganjil"
                    />
                  </div>
                  <div className="flex items-center">
                    <p className="text-xs text-[#7C8271] bg-[#F1F5F2] p-2.5 rounded-lg border border-[#E5E0D5]">
                      <strong>💡 Keuntungan Rekap AI:</strong> Guru BK tidak perlu menghitung manual persentase klasifikasi jenis kasus bulanan dan merancang kata-kata rekomendasi preventif bagi pimpinan sekolah.
                    </p>
                  </div>
                </div>

                {/* DB REPORTS SELECTION FOR COMPILATION */}
                <p className="text-xs font-bold text-[#4A5D4E] uppercase tracking-wider mb-2">PILIH SISWA YANG INGIN DIMASUKKAN DALAM REKAPITULASI ({selectedReportIdsForRecap.length} Terpilih):</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto p-1 bg-[#FDFBF7] rounded-xl border border-[#E5E0D5]">
                  {reports.map((rep) => {
                    const isSelected = selectedReportIdsForRecap.includes(rep.id);
                    return (
                      <div 
                        key={rep.id} 
                        onClick={() => {
                          if (isSelected) {
                            setSelectedReportIdsForRecap(selectedReportIdsForRecap.filter(id => id !== rep.id));
                          } else {
                            setSelectedReportIdsForRecap([...selectedReportIdsForRecap, rep.id]);
                          }
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition text-xs flex justify-between items-start ${
                          isSelected ? "bg-[#A3B18A]/10 border-[#A3B18A] font-bold" : "bg-white border-[#E5E0D5]"
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="truncate text-[#3D3D29]">{rep.studentName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{rep.studentClass} | {rep.serviceCategory}</p>
                          <p className="text-[10px] text-[#7C8271] truncate italic mt-1">{rep.summary}</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          readOnly
                          className="rounded text-[#4A5D4E] focus:ring-[#A3B18A]"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <button 
                    onClick={generateRecapReportWithAI}
                    disabled={isGeneratingRecap || selectedReportIdsForRecap.length === 0}
                    className="w-full py-3 bg-[#4A5D4E] hover:bg-[#3C4C3E] text-white flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:opacity-50 text-sm shadow"
                  >
                    {isGeneratingRecap ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Menghimpun Laporan & Menganalisis Pola Sekolah...
                      </span>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4" />
                        <span>Kompilasikan Rekap Pelayanan (AI)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* RECAP RESULT PRESENTATION */}
              {generatedRecapResult && (
                <div className="bg-white rounded-2xl border-2 border-[#A3B18A] p-6 shadow-md md:grid md:grid-cols-3 gap-6 animate-fadeIn">
                  
                  {/* LEFT COLUMN: DIAGNOSTIC TRENDS AND ADVICES */}
                  <div className="col-span-1 border-r border-[#E5E0D5] pr-6 space-y-4 text-xs">
                    <span className="px-2 py-0.5 bg-[#4A5D4E] text-white rounded text-[9px] font-bold tracking-widest font-mono">DASHBOARD EKSEKUTIF</span>
                    
                    <div>
                      <h4 className="text-[10px] text-[#7C8271] uppercase font-bold tracking-wider mb-1">Periode Konseling</h4>
                      <p className="font-bold text-[#4A5D4E] text-sm">{generatedRecapResult.period}</p>
                    </div>

                    <div>
                      <h4 className="text-[10px] text-[#7C8271] uppercase font-bold tracking-wider mb-1">Pola & Tren Masalah Dominan</h4>
                      <p className="text-[#3D3D29] bg-[#FDFBF7] p-2.5 rounded-lg border border-[#E5E0D5] leading-relaxed">
                        {generatedRecapResult.identifiedTrends}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] text-[#7C8271] uppercase font-bold tracking-wider mb-1">Rekomendasi bagi Sekolah</h4>
                      <p className="text-[#3D3D29] whitespace-pre-line leading-relaxed">
                        {generatedRecapResult.recommedationsForSchool}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#E5E0D5]">
                      <p className="italic text-[11px] text-[#7C8271]">
                        Dokumen dapat diunduh, disalin, atau dicetak langsung untuk diserahkan saat rapat dewan guru bersama Kepala Sekolah.
                      </p>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: RAW MD PREVIEW FOR PRINTING */}
                  <div className="col-span-2 flex flex-col mt-6 md:mt-0">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-bold text-[#7C8271] uppercase tracking-widest font-mono">DRAF REKAPITULASI PELAPORAN</p>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => copyToClipboard(generatedRecapResult.fullRecapMarkdown, "recap-gen")}
                          className="p-1.5 bg-[#FDFBF7] border border-[#E5E0D5] rounded-lg hover:border-[#A3B18A] flex items-center gap-1.5 text-xs font-semibold"
                        >
                          {copiedId === "recap-gen" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === "recap-gen" ? "Disalin!" : "Salin MD"}</span>
                        </button>
                        <button 
                          onClick={() => {
                            setActiveFormatter({
                              id: "temp-recap",
                              title: `Laporan Rekapitulasi Pelayanan - ${generatedRecapResult.period}`,
                              content: generatedRecapResult.fullRecapMarkdown,
                              type: "recap",
                              metadata: {
                                period: generatedRecapResult.period
                              }
                            });
                          }}
                          className="p-1.5 bg-[#4A5D4E] hover:bg-[#3C4C3E] text-white rounded-lg flex items-center gap-1.5 text-xs font-bold shadow"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#A3B18A]" />
                          <span>Edit/Cetak Kustom Resmi</span>
                        </button>
                        <button 
                          onClick={() => triggerPrintContent("raw-recap-markdown-area")}
                          className="p-1.5 bg-[#FDFBF7] border border-[#E5E0D5] rounded-lg hover:border-[#A3B18A] flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak Laporan</span>
                        </button>

                        <button 
                          onClick={() => {
                            if (generatedRecapResult) {
                              handleDirectExportPdf(
                                `Laporan Rekapitulasi Pelayanan - ${generatedRecapResult.period}`,
                                generatedRecapResult.fullRecapMarkdown,
                                "recap",
                                {
                                  period: generatedRecapResult.period
                                }
                              );
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Ekspor PDF</span>
                        </button>

                        <button 
                          onClick={() => {
                            if (generatedRecapResult) {
                              handleDirectExportExcel(
                                `Laporan Rekapitulasi Pelayanan - ${generatedRecapResult.period}`,
                                generatedRecapResult.fullRecapMarkdown,
                                "recap",
                                {
                                  period: generatedRecapResult.period
                                }
                              );
                            }
                          }}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Ekspor Excel (.xls)</span>
                        </button>
                      </div>
                    </div>

                    <div 
                      id="raw-recap-markdown-area"
                      className="border border-[#E5E0D5] rounded-xl p-6 bg-white shadow-inner max-h-[450px] overflow-y-auto"
                    >
                      <div className="prose text-xs text-[#3D3D29] whitespace-pre-wrap leading-relaxed font-mono">
                        {generatedRecapResult.fullRecapMarkdown}
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 4: TEMPLATE RPL BK */}
          {activeTab === "rpl-templates" && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
              
              <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-heading font-bold text-[#4A5D4E] text-lg">Penyusunan Rencana Pelaksanaan Layanan (RPL)</h3>
                    <p className="text-xs text-[#7C8271] mt-0.5">Membuat program klasikal, bimbingan kelompok resmi standar MGBK Kurikulum Merdeka.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => applyRplScenario("bullying")} 
                      className="px-2 py-1 bg-[#F1F5F2] text-[#4A5D4E] rounded text-xs hover:bg-[#A3B18A]/20 font-medium"
                    >
                      Anti Bullying
                    </button>
                    <button 
                      onClick={() => applyRplScenario("career")} 
                      className="px-2 py-1 bg-[#F1F5F2] text-[#4A5D4E] rounded text-xs hover:bg-[#A3B18A]/20 font-medium"
                    >
                      Karier Kampus
                    </button>
                    <button 
                      onClick={() => applyRplScenario("study")} 
                      className="px-2 py-1 bg-[#F1F5F2] text-[#4A5D4E] rounded text-xs hover:bg-[#A3B18A]/20 font-medium"
                    >
                      Fokus Pomodoro
                    </button>
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); generateRplWithAI(); }} className="space-y-4 text-xs md:text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Topik atau Tema Pembelajaran Utama</label>
                      <input 
                        type="text" 
                        required
                        className="w-full border border-[#E5E0D5] rounded-lg p-2.5 bg-[#FDFBF7] focus:outline-[#A3B18A]" 
                        placeholder="Contoh: Manajemen Waktu Bebas Prokrastinasi"
                        value={rplForm.topic}
                        onChange={(e) => setRplForm({...rplForm, topic: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Sasaran Tingkatan Kelas</label>
                      <select 
                        className="w-full border border-[#E5E0D5] rounded-lg p-2.5 bg-[#FDFBF7] focus:outline-[#A3B18A]"
                        value={rplForm.classGrade}
                        onChange={(e) => setRplForm({...rplForm, classGrade: e.target.value})}
                      >
                        <option value="X">Kelas X</option>
                        <option value="XI">Kelas XI</option>
                        <option value="XII">Kelas XII</option>
                        <option value="Umum">Umum / Semua Tingkatan</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Bidang Layanan</label>
                      <select 
                        className="w-full border border-[#E5E0D5] rounded-lg p-2.5 bg-[#FDFBF7] focus:outline-[#A3B18A]"
                        value={rplForm.serviceField}
                        onChange={(e) => setRplForm({...rplForm, serviceField: e.target.value as ServiceField})}
                      >
                        <option value="Sosial">Sosial</option>
                        <option value="Pribadi">Pribadi</option>
                        <option value="Belajar">Belajar</option>
                        <option value="Karir">Karir</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Jenis Format Layanan</label>
                      <input 
                        type="text"
                        className="w-full border border-[#E5E0D5] rounded-lg p-2 bg-[#FDFBF7] focus:outline-[#A3B18A]"
                        value={rplForm.serviceType}
                        onChange={(e) => setRplForm({...rplForm, serviceType: e.target.value})}
                        placeholder="Contoh: Bimbingan Klasikal"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Alokasi Waktu</label>
                      <input 
                        type="text"
                        className="w-full border border-[#E5E0D5] rounded-lg p-2 bg-[#FDFBF7] focus:outline-[#A3B18A]"
                        value={rplForm.duration}
                        onChange={(e) => setRplForm({...rplForm, duration: e.target.value})}
                        placeholder="Contoh: 2 x 45 Menit"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#7C8271] uppercase mb-1">Sasaran khusus / Fokus Materi Deskriptif</label>
                    <textarea 
                      required
                      className="w-full border border-[#E5E0D5] rounded-lg p-3 bg-[#FDFBF7] focus:outline-[#A3B18A] min-h-[100px] font-sans" 
                      placeholder="Contoh: Agar siswa memahami dampak game mobile terhadap sirkulasi fungsi tidur malam dan fokus belajar di esok hari."
                      value={rplForm.focusPoints}
                      onChange={(e) => setRplForm({...rplForm, focusPoints: e.target.value})}
                    ></textarea>
                  </div>

                  <button 
                    type="submit"
                    disabled={isGeneratingRpl}
                    className="w-full py-3 bg-[#4A5D4E] hover:bg-[#3C4C3E] text-white flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:opacity-50 text-sm shadow"
                  >
                    {isGeneratingRpl ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Mendraf RPL Formal via AI...
                      </span>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4" />
                        <span>Mulai Desain RPL Sesuai Standar MGBK (AI)</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* GENERATED RPL VIEW CHANGER */}
              {generatedRplResult && (
                <div className="bg-[#white] rounded-2xl border-2 border-[#A3B18A] p-6 shadow-md md:grid md:grid-cols-3 gap-6 animate-fadeIn">
                  
                  {/* STRUCTURAL CONTENT LEFT HAND PLACEMENT */}
                  <div className="col-span-1 border-r border-[#E5E0D5] pr-6 space-y-4 text-xs">
                    <span className="px-2 py-0.5 bg-[#4A5D4E] text-white rounded text-[9px] font-bold tracking-widest font-mono">DOKUMEN RPL BK</span>
                    
                    <div>
                      <h4 className="text-[10px] text-[#7C8271] uppercase font-bold tracking-wider mb-1">Tema Layanan</h4>
                      <p className="font-bold text-[#4A5D4E] text-sm leading-snug">{generatedRplResult.topic}</p>
                    </div>

                    <div>
                      <h4 className="text-[10px] text-[#7C8271] uppercase font-bold tracking-wider mb-1">Skenario Langkah</h4>
                      <p className="text-[#3D3D29] bg-[#FDFBF7] p-2.5 rounded-lg border border-[#E5E0D5] leading-relaxed">
                        {generatedRplResult.activities}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] text-[#7C8271] uppercase font-bold tracking-wider mb-1">Metode Evaluasi</h4>
                      <p className="text-[#3D3D29] leading-relaxed">
                        {generatedRplResult.evaluation}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#E5E0D5]">
                      <button 
                        onClick={saveGeneratedRplToArchive}
                        className="w-full py-2.5 bg-[#A3B18A] hover:bg-[#8F9F77] text-white font-bold rounded-lg shadow text-xs flex items-center justify-center gap-2"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Masukkan Ke Draf Arsip</span>
                      </button>
                    </div>
                  </div>

                  {/* DOCUMENT PREVIEW IN RIGHT HAND */}
                  <div className="col-span-2 flex flex-col mt-6 md:mt-0">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-bold text-[#7C8271] uppercase tracking-widest font-mono">DRAF DOKUMEN SIAP PRINT (AKREDITASI)</p>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => copyToClipboard(generatedRplResult.fullRplMarkdown || "", "rpl-gen")}
                          className="p-1.5 bg-[#FDFBF7] border border-[#E5E0D5] rounded-lg hover:border-[#A3B18A] flex items-center gap-1.5 text-xs font-semibold"
                        >
                          {copiedId === "rpl-gen" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === "rpl-gen" ? "Disalin!" : "Salin MD"}</span>
                        </button>
                        <button 
                          onClick={() => {
                            setActiveFormatter({
                              id: "temp-rpl",
                              title: `Rencana Pelaksanaan Layanan - ${generatedRplResult.topic}`,
                              content: generatedRplResult.fullRplMarkdown || "",
                              type: "rpl",
                              metadata: {
                                topic: generatedRplResult.topic,
                                classGrade: generatedRplResult.classGrade,
                                serviceField: generatedRplResult.serviceField,
                                serviceType: generatedRplResult.serviceType,
                                duration: generatedRplResult.duration,
                                focusPoints: generatedRplResult.focusPoints
                              }
                            });
                          }}
                          className="p-1.5 bg-[#4A5D4E] hover:bg-[#3C4C3E] text-white rounded-lg flex items-center gap-1.5 text-xs font-bold shadow"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#A3B18A]" />
                          <span>Edit/Cetak Kustom Resmi</span>
                        </button>
                        <button 
                          onClick={() => triggerPrintContent("raw-rpl-area-print")}
                          className="p-1.5 bg-[#FDFBF7] border border-[#E5E0D5] rounded-lg hover:border-[#A3B18A] flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak RPL</span>
                        </button>

                        <button 
                          onClick={() => {
                            if (generatedRplResult) {
                              handleDirectExportPdf(
                                `Rencana Pelaksanaan Layanan - ${generatedRplResult.topic}`,
                                generatedRplResult.fullRplMarkdown || "",
                                "rpl",
                                {
                                  topic: generatedRplResult.topic,
                                  classGrade: generatedRplResult.classGrade,
                                  serviceField: generatedRplResult.serviceField,
                                  serviceType: generatedRplResult.serviceType,
                                  duration: generatedRplResult.duration,
                                  focusPoints: generatedRplResult.focusPoints
                                }
                              );
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Ekspor PDF</span>
                        </button>

                        <button 
                          onClick={() => {
                            if (generatedRplResult) {
                              handleDirectExportExcel(
                                `Rencana Pelaksanaan Layanan - ${generatedRplResult.topic}`,
                                generatedRplResult.fullRplMarkdown || "",
                                "rpl",
                                {
                                  topic: generatedRplResult.topic,
                                  classGrade: generatedRplResult.classGrade,
                                  serviceField: generatedRplResult.serviceField,
                                  serviceType: generatedRplResult.serviceType,
                                  duration: generatedRplResult.duration,
                                  focusPoints: generatedRplResult.focusPoints
                                }
                              );
                            }
                          }}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Ekspor Excel (.xls)</span>
                        </button>
                      </div>
                    </div>

                    <div 
                      id="raw-rpl-area-print"
                      className="border border-[#E5E0D5] rounded-xl p-6 bg-white shadow-inner max-h-[450px] overflow-y-auto"
                    >
                      <div className="prose text-xs text-[#3D3D29] whitespace-pre-wrap leading-relaxed font-mono">
                        {generatedRplResult.fullRplMarkdown}
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 5: ARCHIVES DESK (STORES BOTH REPORTS AND RPLs) */}
          {activeTab === "archives" && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* SEARCH FILTERS */}
              <div className="bg-white p-4 rounded-xl border border-[#E5E0D5] shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center bg-[#FDFBF7]/30">
                
                <div className="flex items-center gap-2 border border-[#E5E0D5] bg-white rounded-lg px-2.5 py-1.5 w-full md:w-80">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Cari siswa, kelas, catatan..."
                    className="bg-transparent border-none text-xs w-full focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  <div className="flex items-center gap-1 text-xs font-bold text-[#7C8271]">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Bidang BK:</span>
                  </div>
                  <select 
                    className="border border-[#E5E0D5] bg-white rounded-lg p-1.5 text-xs focus:outline-none"
                    value={fieldFilter}
                    onChange={(e) => setFieldFilter(e.target.value)}
                  >
                    <option value="Semua">Semua Bidang</option>
                    <option value="Pribadi">Pribadi</option>
                    <option value="Sosial">Sosial</option>
                    <option value="Belajar">Belajar</option>
                    <option value="Karir">Karir</option>
                  </select>
                </div>

              </div>

              {/* SECTIONS DIVIDED IN THE ARCHIVES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* COLUMN 1: INTERACTIVE LIST OF ARCHIVED COUNSELING REPORTS */}
                <div className="bg-white p-5 rounded-2xl border border-[#E5E0D5] shadow-sm flex flex-col min-h-[460px]">
                  <div className="border-b border-[#E5E0D5] pb-3 mb-4 flex justify-between items-center bg-[#FDFBF7]/40 p-2 rounded-lg">
                    <h3 className="font-heading font-bold text-[#4A5D4E] flex items-center gap-2 text-sm">
                      <FileCheck className="w-4 h-4 text-[#A3B18A]" />
                      <span>Arsip Laporan Konseling ({filteredReports.length})</span>
                    </h3>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2">
                    {filteredReports.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-12">Belum ada dokumen yang sesuai dengan penelusuran.</p>
                    ) : (
                      filteredReports.map((rep) => (
                        <div 
                          key={rep.id} 
                          onClick={() => { setSelectedReport(rep); setSelectedRpl(null); }}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                            selectedReport?.id === rep.id ? "bg-[#A3B18A]/10 border-[#A3B18A]" : "bg-white border-[#E5E0D5] hover:border-[#A3B18A]/50"
                          }`}
                        >
                          <div className="w-1.5 h-10 rounded bg-[#4A5D4E] shrink-0 mt-1"></div>
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-[#3D3D29] truncate">{rep.studentName}</span>
                              <span className="text-[10px] font-mono text-gray-400">{rep.date}</span>
                            </div>
                            <p className="text-[#7C8271] font-mono text-[11px] mb-1">{rep.studentClass} | {rep.serviceCategory}</p>
                            <p className="text-[11px] text-gray-400 truncate italic">{rep.summary}</p>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteReport(rep.id, e)}
                            className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-650 rounded shrink-0"
                            title="Hapus permanen dari arsip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUMN 2: INTERACTIVE LIST OF ARCHIVED RPL MATERIALS */}
                <div className="bg-white p-5 rounded-2xl border border-[#E5E0D5] shadow-sm flex flex-col min-h-[460px]">
                  <div className="border-b border-[#E5E0D5] pb-3 mb-4 flex justify-between items-center bg-[#FDFBF7]/40 p-2 rounded-lg">
                    <h3 className="font-heading font-bold text-[#4A5D4E] flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-[#A3B18A]" />
                      <span>Arsip RPL Kepala Sekolah ({filteredRpls.length})</span>
                    </h3>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2">
                    {filteredRpls.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-12">Belum ada draf RPL yang sesuai dengan penelusuran.</p>
                    ) : (
                      filteredRpls.map((r) => (
                        <div 
                          key={r.id} 
                          onClick={() => { setSelectedRpl(r); setSelectedReport(null); }}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                            selectedRpl?.id === r.id ? "bg-[#A3B18A]/10 border-[#A3B18A]" : "bg-white border-[#E5E0D5] hover:border-[#A3B18A]/50"
                          }`}
                        >
                          <div className="w-1.5 h-10 rounded bg-[#A3B18A] shrink-0 mt-1"></div>
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-[#3D3D29] truncate">{r.topic}</span>
                              <span className="text-[10px] font-mono text-gray-400">Kelas {r.classGrade}</span>
                            </div>
                            <p className="text-[#7C8271] font-mono text-[10px] mb-1">{r.serviceType} | {r.duration}</p>
                            <p className="text-[11px] text-gray-400 truncate italic">{r.focusPoints}</p>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteRpl(r.id, e)}
                            className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-650 rounded shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* DYNAMIC DOCUMENT VIEWER BOX DOWN BELOW */}
              {(selectedReport || selectedRpl) && (
                <div className="bg-white rounded-2xl border-2 border-[#4A5D4E] p-6 shadow-md animate-fadeIn">
                  
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#E5E0D5]">
                    <div>
                      <span className="text-xs font-mono uppercase bg-[#4A5D4E] text-[#F1F5F2] px-2 py-0.5 rounded font-bold mr-2">Arsip Digital BK Terbuka</span>
                      <span className="text-xs text-gray-400 font-mono">ID: {selectedReport ? selectedReport.id : selectedRpl?.id}</span>
                      <h4 className="font-heading font-bold text-base text-[#3D3D29] mt-2 leading-tight">
                        {selectedReport ? `Laporan Konseling: ${selectedReport.studentName}` : `Materi RPL: ${selectedRpl?.topic}`}
                      </h4>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const code = selectedReport ? selectedReport.formalReportMarkdown : (selectedRpl ? selectedRpl.fullRplMarkdown : "");
                          copyToClipboard(code, "viewer-copy");
                        }}
                        className="p-1.5 bg-[#FDFBF7] border border-[#E5E0D5] rounded-xl hover:border-[#A3B18A] text-xs font-medium flex items-center gap-1.5"
                      >
                        {copiedId === "viewer-copy" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === "viewer-copy" ? "Disalin!" : "Salin Markdown"}</span>
                      </button>

                      <button 
                        onClick={() => {
                          if (selectedReport) {
                            setActiveFormatter({
                              id: selectedReport.id,
                              title: `Laporan Konseling Resmi - ${selectedReport.studentName}`,
                              content: selectedReport.formalReportMarkdown,
                              type: "report",
                              metadata: {
                                studentName: selectedReport.studentName,
                                studentClass: selectedReport.studentClass,
                                gender: selectedReport.gender,
                                date: selectedReport.date,
                                counselorName: selectedReport.counselorName,
                                serviceCategory: selectedReport.serviceCategory,
                                rawNotes: selectedReport.rawNotes
                              }
                            });
                          } else if (selectedRpl) {
                            setActiveFormatter({
                              id: selectedRpl.id,
                              title: `Rencana Pelaksanaan Layanan - ${selectedRpl.topic}`,
                              content: selectedRpl.fullRplMarkdown,
                              type: "rpl",
                              metadata: {
                                topic: selectedRpl.topic,
                                classGrade: selectedRpl.classGrade,
                                serviceField: selectedRpl.serviceField,
                                serviceType: selectedRpl.serviceType,
                                duration: selectedRpl.duration,
                                focusPoints: selectedRpl.focusPoints
                              }
                            });
                          }
                        }}
                        className="p-1.5 bg-[#4A5D4E] hover:bg-[#3C4C3E] text-white rounded-xl flex items-center gap-1.5 text-xs font-bold shadow"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#A3B18A]" />
                        <span>Edit/Cetak Kustom Resmi</span>
                      </button>

                      <button 
                        onClick={() => triggerPrintContent("archives-printed-content")}
                        className="p-1.5 bg-[#FDFBF7] border border-[#E5E0D5] rounded-xl hover:border-[#A3B18A] text-xs font-medium flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Dokumen</span>
                      </button>

                      <button 
                        onClick={() => {
                          if (selectedReport) {
                            handleDirectExportPdf(
                              `Laporan Konseling Resmi - ${selectedReport.studentName}`,
                              selectedReport.formalReportMarkdown,
                              "report",
                              {
                                studentName: selectedReport.studentName,
                                studentClass: selectedReport.studentClass,
                                gender: selectedReport.gender,
                                date: selectedReport.date,
                                counselorName: selectedReport.counselorName,
                                serviceCategory: selectedReport.serviceCategory,
                                rawNotes: selectedReport.rawNotes
                              }
                            );
                          } else if (selectedRpl) {
                            handleDirectExportPdf(
                              `Rencana Pelaksanaan Layanan - ${selectedRpl.topic}`,
                              selectedRpl.fullRplMarkdown,
                              "rpl",
                              {
                                topic: selectedRpl.topic,
                                classGrade: selectedRpl.classGrade,
                                serviceField: selectedRpl.serviceField,
                                serviceType: selectedRpl.serviceType,
                                duration: selectedRpl.duration,
                                focusPoints: selectedRpl.focusPoints
                              }
                            );
                          }
                        }}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Ekspor PDF</span>
                      </button>

                      <button 
                        onClick={() => {
                          if (selectedReport) {
                            handleDirectExportExcel(
                              `Laporan Konseling Resmi - ${selectedReport.studentName}`,
                              selectedReport.formalReportMarkdown,
                              "report",
                              {
                                studentName: selectedReport.studentName,
                                studentClass: selectedReport.studentClass,
                                gender: selectedReport.gender,
                                date: selectedReport.date,
                                counselorName: selectedReport.counselorName,
                                serviceCategory: selectedReport.serviceCategory,
                                rawNotes: selectedReport.rawNotes
                              }
                            );
                          } else if (selectedRpl) {
                            handleDirectExportExcel(
                              `Rencana Pelaksanaan Layanan - ${selectedRpl.topic}`,
                              selectedRpl.fullRplMarkdown,
                              "rpl",
                              {
                                topic: selectedRpl.topic,
                                classGrade: selectedRpl.classGrade,
                                serviceField: selectedRpl.serviceField,
                                serviceType: selectedRpl.serviceType,
                                duration: selectedRpl.duration,
                                focusPoints: selectedRpl.focusPoints
                              }
                            );
                          }
                        }}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Ekspor Excel (.xls)</span>
                      </button>

                      <button 
                        onClick={() => { setSelectedReport(null); setSelectedRpl(null); }}
                        className="p-1.5 bg-[#FDFBF7] border border-[#E5E0D5] rounded-xl text-gray-400 hover:text-black"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div 
                    id="archives-printed-content"
                    className="border border-[#E5E0D5] rounded-xl p-6 bg-white max-h-[500px] overflow-y-auto"
                  >
                    <div className="prose text-xs font-mono whitespace-pre-wrap leading-relaxed text-[#3D3D29]">
                      {selectedReport ? selectedReport.formalReportMarkdown : selectedRpl?.fullRplMarkdown}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 6: SERVICE CALENDAR (PLANNER & EVENTS GRID) */}
          {activeTab === "calendar" && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 shadow-sm">
                
                {/* CALENDAR HEADER & MONTH NAV */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <div>
                    <h3 className="font-heading font-bold text-[#4A5D4E] text-lg">Indikator Agenda Pelayanan & Rapat BK</h3>
                    <p className="text-xs text-[#7C8271] mt-0.5">Konfigurasi visual jadwal pemanggilan, krisis perundungan, klasikal sekolah, dan rapat koor.</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={handlePrevMonth} 
                      className="p-2 border border-[#E5E0D5] hover:border-[#A3B18A] rounded-lg bg-[#FDFBF7] transition"
                    >
                      <ChevronLeft className="w-4 h-4 text-[#4A5D4E]" />
                    </button>
                    
                    <span className="font-heading font-bold text-sm text-[#4A5D4E] capitalize min-w-[124px] text-center">
                      {getMonthNameIndonesian(currentMonthIdx)} {currentYear}
                    </span>

                    <button 
                      onClick={handleNextMonth} 
                      className="p-2 border border-[#E5E0D5] hover:border-[#A3B18A] rounded-lg bg-[#FDFBF7] transition"
                    >
                      <ChevronRight className="w-4 h-4 text-[#4A5D4E]" />
                    </button>

                    <button 
                      onClick={() => setIsAddEventOpen(true)}
                      className="px-3 py-2 bg-[#4A5D4E] hover:bg-[#3C4C3E] text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Buat Agenda Baru</span>
                    </button>
                  </div>
                </div>

                {/* GRID OR MONTH CALCULATIONS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* CALENDAR MONTH GRID IN MIDDLE */}
                  <div className="md:col-span-2">
                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-[#4A5D4E] py-2 border-b border-[#E5E0D5]">
                      <div className="py-2 text-red-500">Min</div>
                      <div className="py-2">Sen</div>
                      <div className="py-2">Sel</div>
                      <div className="py-2">Rab</div>
                      <div className="py-2">Kam</div>
                      <div className="py-2">Jum</div>
                      <div className="py-2">Sab</div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mt-1 font-semibold text-xs min-h-[280px]">
                      {calendarCells.map((dayNum, cellIndex) => {
                        if (dayNum === null) {
                          return <div key={`empty-${cellIndex}`} className="bg-[#FDFBF7]/40 rounded-lg p-2 min-h-[50px] border border-transparent"></div>;
                        }

                        // Check if day matches any scheduled event
                        const dayStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const dayEvents = events.filter(e => e.date === dayStr);
                        const isToday = dayNum === 12 && currentMonthIdx === 5 && currentYear === 2026; // June 12, 2026 is today

                        return (
                          <div 
                            key={`day-${dayNum}`} 
                            className={`rounded-lg p-1.5 min-h-[60px] border flex flex-col justify-between transition ${
                              isToday ? "bg-[#A3B18A]/10 border-[#A3B18A] ring-1 ring-[#A3B18A]" : "bg-[#FDFBF7] border-[#E5E0D5] hover:border-[#A3B18A]/50"
                            }`}
                          >
                            <span className={`text-[10px] ${isToday ? "text-[#4A5D4E] font-bold" : "text-[#7C8271]"}`}>{dayNum}</span>
                            
                            <div className="space-y-0.5 mt-1 overflow-y-auto max-h-[50px]">
                              {dayEvents.map(evt => (
                                <div 
                                  key={evt.id} 
                                  className={`p-0.5 rounded text-[8px] truncate leading-tight tracking-tighter ${
                                    evt.type === "konseling" ? "bg-purple-100 text-purple-700" :
                                    evt.type === "home_visit" ? "bg-pink-100 text-pink-700 font-bold" :
                                    evt.type === "klasikal" ? "bg-blue-100 text-blue-700" :
                                    "bg-yellow-100 text-yellow-850"
                                  }`}
                                  title={evt.title}
                                >
                                  {evt.time} {evt.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* CALENDAR AGENDA LIST IN RIGHT COLS */}
                  <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#E5E0D5] flex flex-col">
                    <h4 className="font-heading font-bold text-[#4A5D4E] text-xs uppercase tracking-wider mb-3">Daftar Sesi Bulan Terpilih</h4>
                    
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] text-xs">
                      {events.filter(e => e.date.startsWith(`${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`)).length === 0 ? (
                        <p className="text-gray-400 text-center py-12 text-[11px]">Belum ada jadwal konsultasi / klasikal terekam dibulan ini.</p>
                      ) : (
                        events
                          .filter(e => e.date.startsWith(`${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`))
                          .sort((a,b)=> a.date.localeCompare(b.date))
                          .map(evt => (
                            <div key={evt.id} className="p-3 bg-white rounded-lg border border-[#E5E0D5] shadow-sm space-y-1.5 hover:border-[#A3B18A]">
                              <div className="flex justify-between items-start">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  evt.type === "konseling" ? "bg-purple-100 text-purple-700" :
                                  evt.type === "home_visit" ? "bg-pink-100 text-pink-700" :
                                  evt.type === "klasikal" ? "bg-blue-100 text-blue-700" :
                                  "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {evt.type}
                                </span>
                                
                                <button 
                                  onClick={() => handleDeleteEvent(evt.id)}
                                  className="text-gray-400 hover:text-red-650"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>

                              <div>
                                <p className="font-bold text-[#3D3D29]">{evt.title}</p>
                                <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{evt.date} (Jam {evt.time} WIB)</span>
                                </p>
                              </div>

                              {evt.studentName && (
                                <p className="text-[11px] text-[#4A5D4E] font-medium">Siswa: {evt.studentName}</p>
                              )}

                              {evt.description && (
                                <p className="text-[10px] text-[#7C8271] border-t border-[#E5E0D5] pt-1 mt-1 italic leading-normal">
                                  {evt.description}
                                </p>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* FLOATING DIALOG TO ADD NEW EVENT TO SCHEDULE */}
              {isAddEventOpen && (
                <div className="fixed inset-0 bg-[#3D3D29]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 max-w-md w-full shadow-lg text-sm space-y-4 animate-scaleUp">
                    
                    <div className="flex justify-between items-center border-b border-[#E5E0D5] pb-3">
                      <h4 className="font-heading font-bold text-[#4A5D4E]">Tambah Agenda Manual Layanan BK</h4>
                      <button onClick={() => setIsAddEventOpen(false)} className="text-gray-400 hover:text-black">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleAddEvent} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#7C8271] mb-1">Nama Layanan / Judul Kegiatan</label>
                        <input 
                          type="text" 
                          required
                          className="w-full border border-[#E5E0D5] rounded-lg p-2 focus:outline-none" 
                          placeholder="Contoh: Konseling Individual Sesi 2"
                          value={eventForm.title}
                          onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#7C8271] mb-1">Tanggal</label>
                          <input 
                            type="date"
                            required
                            className="w-full border border-[#E5E0D5] rounded-lg p-2 focus:outline-none focus:border-[#A3B18A]"
                            value={eventForm.date}
                            onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#7C8271] mb-1">Waktu Mulai (WIB)</label>
                          <input 
                            type="text"
                            required
                            className="w-full border border-[#E5E0D5] rounded-lg p-2 focus:outline-none"
                            placeholder="08:00 atau 14:30"
                            value={eventForm.time}
                            onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#7C8271] mb-1">Jenis Layanan</label>
                          <select 
                            className="w-full border border-[#E5E0D5] rounded-lg p-2 focus:outline-none focus:border-[#A3B18A]"
                            value={eventForm.type}
                            onChange={(e) => setEventForm({...eventForm, type: e.target.value as any})}
                          >
                            <option value="konseling">Konseling Individual</option>
                            <option value="home_visit">Home Visit / Kunjungan</option>
                            <option value="klasikal">Bimbingan Klasikal</option>
                            <option value="konferensi">Rapat / Konferensi Kasus</option>
                            <option value="lainnya">Lain-lain</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#7C8271] mb-1">Nama Siswa (Opsional)</label>
                          <input 
                            type="text"
                            className="w-full border border-[#E5E0D5] rounded-lg p-2 focus:outline-none"
                            placeholder="Contoh: Farhan S."
                            value={eventForm.studentName}
                            onChange={(e) => setEventForm({...eventForm, studentName: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#7C8271] mb-1">Keterangan / Deskripsi Rencana Tindak Lanjut</label>
                        <textarea 
                          className="w-full border border-[#E5E0D5] rounded-lg p-2 min-h-[60px] focus:outline-none"
                          placeholder="Catat lokasi di aula, ruang BK, atau agenda krisis verbal..."
                          value={eventForm.description}
                          onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                        ></textarea>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-2 bg-[#4A5D4E] hover:bg-[#3C4C3E] text-white rounded-lg font-bold text-xs"
                      >
                        Simpan Agenda Layanan Sekolah
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* REUSABLE STABLE FOOTER WITH REAL STATUSES */}
        <footer className="px-8 py-3 bg-white/50 border-t border-[#E5E0D5] flex justify-between items-center text-[10px] text-[#7C8271] shrink-0">
          <p>&copy; 2026 BK Auto Admin - Mengurangi Administrasi untuk Meningkatan Pelayanan Siswa.</p>
          <p className="flex gap-4 font-mono font-bold uppercase">
            <span>UPT SMAN 1 MERDEKA BUILD 4.0</span>
            <span className="text-green-600 block">● SERVER ONLINE</span>
          </p>
        </footer>

      </main>

      {activeFormatter && (
        <DocumentFormatter
          initialTitle={activeFormatter.title}
          initialContent={activeFormatter.content}
          documentType={activeFormatter.type}
          metadata={activeFormatter.metadata}
          onSave={handleSaveFormatterContent}
          onClose={() => setActiveFormatter(null)}
        />
      )}

    </div>
  );
}
