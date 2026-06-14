import React, { useState, useEffect } from "react";
import { 
  Printer, 
  FileText, 
  Settings, 
  AlignLeft, 
  Maximize2, 
  FileCheck, 
  ToggleLeft, 
  ToggleRight, 
  Type, 
  Trash2, 
  Sliders, 
  BookOpen, 
  Share2, 
  Download, 
  Check, 
  Edit3, 
  Eye, 
  Award,
  ChevronDown,
  Layout,
  HelpCircle,
  Cloud,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { 
  auth, 
  loginWithGoogle, 
  getCachedAccessToken, 
  setCachedAccessToken 
} from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  getOrCreateBKFolder, 
  uploadHtmlAsGoogleDoc 
} from "../lib/driveService";

interface DocumentFormatterProps {
  initialTitle: string;
  initialContent: string;
  documentType: "report" | "rpl" | "recap";
  metadata?: {
    studentName?: string;
    studentClass?: string;
    gender?: string;
    date?: string;
    counselorName?: string;
    serviceCategory?: string;
    topic?: string;
    duration?: string;
    serviceType?: string;
    classGrade?: string;
    period?: string;
    rawNotes?: string;
    serviceField?: string;
    focusPoints?: string;
  };
  onSave?: (updatedContent: string) => void;
  onClose: () => void;
}

export default function DocumentFormatter({
  initialTitle,
  initialContent,
  documentType,
  metadata = {},
  onSave,
  onClose
}: DocumentFormatterProps) {
  // Document state
  const [editedContent, setEditedContent] = useState<string>(initialContent);
  const [docTitle, setDocTitle] = useState<string>(initialTitle);
  
  // Customization States
  const [fontFamily, setFontFamily] = useState<string>("TimesNewRoman");
  const [fontSize, setFontSize] = useState<number>(11); // pt
  const [lineHeight, setLineHeight] = useState<number>(1.5);
  const [marginSize, setMarginSize] = useState<string>("normal"); // narrow, normal, wide
  const [showKop, setShowKop] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Institution letterhead details
  const [schoolName, setSchoolName] = useState<string>("UPT SMAN 1 MERDEKA");
  const [provinceName, setProvinceName] = useState<string>("PEMERINTAH PROVINSI DKI JAKARTA");
  const [deptName, setDeptName] = useState<string>("DINAS PENDIDIKAN DAN KEBUDAYAAN");
  const [schoolAddress, setSchoolAddress] = useState<string>("Jl. Pemuda Pendidikan No. 42, Telp (021) 8591234, Email: info@sman1merdeka.sch.id");
  const [docNumber, setDocNumber] = useState<string>(`BK/S-042/${new Date().getFullYear()}`);

  // Signature names
  const [principalName, setPrincipalName] = useState<string>("Drs. H. Mulyadi, M.Pd.");
  const [principalNip, setPrincipalNip] = useState<string>("19681024 199303 1 002");
  const [counselorName, setCounselorName] = useState<string>(metadata.counselorName || "Dra. Elok Sartika, M.Pd.");
  const [counselorNip, setCounselorNip] = useState<string>("19720412 199802 2 003");
  const [docDate, setDocDate] = useState<string>(metadata.date || new Date().toISOString().split('T')[0]);

  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Measure content scrollHeight to simulate physical A4 sheets (approx 1120px tall)
  const [measuredHeight, setMeasuredHeight] = useState<number>(1050);

  // Google Drive backup states
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [gAccessToken, setGAccessToken] = useState<string | null>(getCachedAccessToken());
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [backupProgress, setBackupProgress] = useState<string>("");
  const [backupSuccessDoc, setBackupSuccessDoc] = useState<{ id: string; name: string } | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupInFolder, setBackupInFolder] = useState<boolean>(true);
  const [customBackupFileName, setCustomBackupFileName] = useState<string>(initialTitle);

  // Sync auth state listener specifically for the Document Formatter
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setDriveUser(usr);
      setGAccessToken(getCachedAccessToken());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const element = document.getElementById("printed-paper-complete-view");
    if (element) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setMeasuredHeight(entry.target.scrollHeight);
        }
      });
      resizeObserver.observe(element);
      return () => resizeObserver.disconnect();
    }
  }, [editedContent, fontFamily, fontSize, lineHeight, showKop, showSignatures, marginSize, provinceName, deptName, schoolName, schoolAddress]);

  const estimatedPages = Math.max(1, Math.ceil(measuredHeight / 1120));
  const pageBreaks = [];
  for (let i = 1; i < estimatedPages; i++) {
    pageBreaks.push(i * 1120);
  }

  // Parse Raw notes / markdown to clean HTML structure
  const parseMarkdownToHTML = (markdown: string) => {
    if (!markdown) return "";
    
    // Simple line-by-line conversion
    let lines = markdown.split("\n");
    let htmlLines = lines.map(line => {
      let trimmed = line.trim();
      
      // Headers
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

      // Horizontal Rule
      if (trimmed === "---") {
        return `<hr style="border: none; border-top: 2px solid #475569; margin: 1em 0;" />`;
      }

      // Bullet points
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const itemText = trimmed.slice(2);
        // Look for bold markers inside list item
        const processedText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return `<li style="margin-left: 1.5em; margin-bottom: 0.25em; list-style-type: square;">${processedText}</li>`;
      }

      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        const number = numMatch[1];
        const itemText = numMatch[2];
        const processedText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return `<li style="margin-left: 1.5em; margin-bottom: 0.25em; list-style-type: decimal;">${processedText}</li>`;
      }

      // Bold text converter
      let processed = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

      if (processed === "") {
        return "<br/>";
      }

      return `<p style="margin-bottom: 0.5em; text-align: justify; text-indent: 0.25in;">${processed}</p>`;
    });

    return htmlLines.join("\n");
  };

  // Build clean, styled HTML body specifically tailored for Google Docs API import
  const generateFullHtmlForDrive = () => {
    const kopSection = showKop ? `
      <div style="border-bottom: 4px double black; padding-bottom: 12px; margin-bottom: 24px; font-family: 'Times New Roman', serif;">
        <table style="width: 100%; border-collapse: collapse; border: none; font-family: 'Times New Roman', serif;">
          <tr>
            <td style="width: 70px; border: none; vertical-align: middle; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: #f1f5f2; border: 2px solid #4A5D4E; border-radius: 50%; display: inline-block; line-height: 60px; font-weight: bold; color: #4A5D4E; font-size: 18px; text-align: center;">BK</div>
            </td>
            <td style="border: none; text-align: center; vertical-align: middle; font-family: 'Times New Roman', serif;">
              <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #111;">${provinceName}</div>
              <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #111; letter-spacing: 1px;">${deptName}</div>
              <div style="font-size: 15px; font-weight: bold; text-transform: uppercase; color: #4A5D4E; margin-top: 2px;">${schoolName}</div>
              <div style="font-size: 9px; color: #555; font-style: italic; margin-top: 4px;">${schoolAddress}</div>
            </td>
          </tr>
        </table>
      </div>
    ` : '';

    const docTypeLabel = documentType === "report" ? "LAPORAN FORMAL BIMBINGAN KONSELING" : documentType === "rpl" ? "RENCANA PELAKSANAAN LAYANAN (RPL) BK" : "LAPORAN REKAPITULASI PELAYANAN BK";

    const headSection = `
      <div style="text-align: center; margin-top: 15px; margin-bottom: 15px; font-family: 'Times New Roman', serif;">
        <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid black; display: inline-block; padding-bottom: 2px; margin: 0 auto;">${docTypeLabel}</h2>
        <div style="font-family: monospace; font-size: 10px; margin-top: 6px; color: #333;">Nomor Surat Perihal: ${docNumber}</div>
      </div>
    `;

    let metadataSection = '';
    if (documentType === "report" && metadata.studentName) {
      metadataSection = `
        <div style="margin-bottom: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 11px; font-family: sans-serif;">
          <h4 style="font-weight: bold; color: #334155; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 8px 0;">IDENTITAS KONSILIASI SISWA</h4>
          <table style="width: 100%; border-collapse: collapse; border: none; text-align: left;">
            <tr>
              <td style="padding: 2px 0; font-weight: bold; color: #64748b; width: 25%; border: none;">Nama Murid / Konseli</td>
              <td style="padding: 2px 0; width: 2%; border: none;">:</td>
              <td style="padding: 2px 0; font-weight: bold; color: #4A5D4E; border: none;">${metadata.studentName}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-weight: bold; color: #64748b; border: none;">Kelas & Jenis Kelamin</td>
              <td style="padding: 2px 0; border: none;">:</td>
              <td style="padding: 2px 0; border: none;">${metadata.studentClass || "N/A"} (${metadata.gender || "N/A"})</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-weight: bold; color: #64748b; border: none;">Bidang Pelayanan</td>
              <td style="padding: 2px 0; border: none;">:</td>
              <td style="padding: 2px 0; font-weight: bold; color: #6b21a8; border: none;">Bidang ${metadata.serviceCategory || "Pribadi"}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-weight: bold; color: #64748b; border: none;">Seksi Pelaporan</td>
              <td style="padding: 2px 0; border: none;">:</td>
              <td style="padding: 2px 0; border: none;">${counselorName} (${counselorNip})</td>
            </tr>
          </table>
        </div>
      `;
    } else if (documentType === "rpl" && metadata.topic) {
      metadataSection = `
        <div style="margin-bottom: 20px; background-color: #f4fbf7; border: 1px solid #d1fae5; border-radius: 8px; padding: 12px; font-size: 11px; font-family: sans-serif;">
          <h4 style="font-weight: bold; color: #047857; text-transform: uppercase; border-bottom: 1px solid #d1fae5; padding-bottom: 4px; margin: 0 0 8px 0;">DATA STRUKTURAL LAYANAN BK</h4>
          <table style="width: 100%; border-collapse: collapse; border: none; text-align: left;">
            <tr>
              <td style="padding: 2px 0; font-weight: bold; color: #64748b; width: 25%; border: none;">Tema Klasikal</td>
              <td style="padding: 2px 0; width: 2%; border: none;">:</td>
              <td style="padding: 2px 0; font-weight: bold; color: #047857; border: none;">${metadata.topic}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-weight: bold; color: #64748b; border: none;">Sasaran Tingkat</td>
              <td style="padding: 2px 0; border: none;">:</td>
              <td style="padding: 2px 0; border: none;">Kelas ${metadata.classGrade || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-weight: bold; color: #64748b; border: none;">Format Layanan</td>
              <td style="padding: 2px 0; border: none;">:</td>
              <td style="padding: 2px 0; font-weight: bold; color: #1d4ed8; border: none;">${metadata.serviceType || "Bimbingan Klasikal"} | ${metadata.duration || "2 jp"}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-weight: bold; color: #64748b; border: none;">Fokus Sasaran</td>
              <td style="padding: 2px 0; border: none;">:</td>
              <td style="padding: 2px 0; border: none;">${metadata.focusPoints || "N/A"}</td>
            </tr>
          </table>
        </div>
      `;
    } else if (documentType === "recap") {
      metadataSection = `
        <div style="margin-bottom: 20px; background-color: #fcf8f2; border: 1px solid #fbd2a4; border-radius: 8px; padding: 12px; font-size: 11px; font-family: sans-serif;">
          <h4 style="font-weight: bold; color: #b45309; text-transform: uppercase; border-bottom: 1px solid #fbd2a4; padding-bottom: 4px; margin: 0 0 8px 0;">KOMPILASI REKAPITULASI PELAYANAN DIGITAL BK</h4>
          <table style="width: 100%; border-collapse: collapse; border: none; text-align: left;">
            <tr>
              <td style="padding: 2px 0; font-weight: bold; color: #64748b; width: 25%; border: none;">Periode Laporan</td>
              <td style="padding: 2px 0; width: 2%; border: none;">:</td>
              <td style="padding: 2px 0; font-weight: bold; color: #b45309; border: none;">${metadata.period || "Juni 2026"}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-weight: bold; color: #64748b; border: none;">Evaluator / Pembimbing</td>
              <td style="padding: 2px 0; border: none;">:</td>
              <td style="padding: 2px 0; border: none;">${counselorName} (${counselorNip})</td>
            </tr>
          </table>
        </div>
      `;
    }

    const signaturesSection = showSignatures ? `
      <div style="margin-top: 35px; font-size: 12px; font-family: 'Times New Roman', serif; border-top: 1px solid #eee; padding-top: 15px;">
        <table style="width: 100%; border-collapse: collapse; border: none;">
          <tr>
            <td style="width: 50%; border: none; text-align: center; padding-bottom: 6px; vertical-align: top;">
              <p style="margin: 0 0 2px 0;">Mengetahui,</p>
              <p style="font-weight: bold; margin: 0 0 40px 0;">Kepala Sekolah ${schoolName}</p>
              <p style="font-weight: bold; text-decoration: underline; margin: 0 0 1px 0;">${principalName}</p>
              <p style="color: #555; font-size: 10px; margin: 0;">NIP. ${principalNip}</p>
            </td>
            <td style="width: 50%; border: none; text-align: center; padding-bottom: 6px; vertical-align: top;">
              <p style="margin: 0 0 2px 0;">Sleman, ${formatIndonesianDate(docDate)}</p>
              <p style="font-weight: bold; margin: 0 0 40px 0;">Guru Bimbingan Konseling</p>
              <p style="font-weight: bold; text-decoration: underline; margin: 0 0 1px 0;">${counselorName}</p>
              <p style="color: #555; font-size: 10px; margin: 0;">NIP. ${counselorNip}</p>
            </td>
          </tr>
        </table>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Times New Roman', 'Georgia', serif; line-height: 1.5; color: #111; padding: 25px; }
          h1, h2, h3, h4 { margin-top: 1.25em; margin-bottom: 0.5em; color: #111; }
          p { margin-bottom: 0.8em; text-align: justify; }
          ul, ol { margin-bottom: 0.8em; padding-left: 20px; }
          li { margin-bottom: 0.25em; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 1.25em; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
        </style>
      </head>
      <body>
        ${kopSection}
        ${headSection}
        ${metadataSection}
        <div style="margin-top: 15px; margin-bottom: 25px;">
          ${parseMarkdownToHTML(editedContent)}
        </div>
        ${signaturesSection}
      </body>
      </html>
    `;
  };

  // Triggers the Google Drive / Google Doc upload flow
  const handleDriveBackup = async () => {
    let token = gAccessToken;
    
    // Check if we need to obtain a new token
    if (!token) {
      setBackupLoading(true);
      setBackupProgress("Menyambungkan dan meminta otoritas pop-up Google...");
      try {
        const userResult = await loginWithGoogle();
        token = getCachedAccessToken();
        setGAccessToken(token);
        if (!token) {
          throw new Error("Persetujuan akses dibatalkan atau token tidak ditemukan.");
        }
      } catch (err: any) {
        console.error(err);
        let errorMsg = err.message || "Gagal melakukan sambungan dengan akun Google.";
        if (err.code === "auth/popup-closed-by-user" || (err.message && err.message.includes("popup-closed-by-user"))) {
          errorMsg = "Login dibatalkan karena Anda menutup jendela interaksi Google.";
        }
        setBackupError(errorMsg);
        setBackupLoading(false);
        return;
      }
    }

    setBackupLoading(true);
    setBackupSuccessDoc(null);
    setBackupError(null);

    try {
      let folderId: string | null = null;
      if (backupInFolder) {
        setBackupProgress("Mengakses folder penyimpanan 'BK Auto Admin Docs' di Drive...");
        folderId = await getOrCreateBKFolder(token!);
      }

      setBackupProgress("Mempersiapkan konversi dokumen resmi ke Google Doc...");
      const fullHtmlContent = generateFullHtmlForDrive();

      setBackupProgress("Mengunggah berkas cadangan langsung ke Google Drive...");
      const resultDoc = await uploadHtmlAsGoogleDoc(token!, customBackupFileName, fullHtmlContent, folderId);
      
      if (resultDoc) {
        setBackupSuccessDoc(resultDoc);
      } else {
        throw new Error("Gagal menyimpan berkas bimbingan.");
      }
    } catch (err: any) {
      console.error(err);
      setBackupError(err.message || "Gagal menyimpan cadangan ke cloud.");
    } finally {
      setBackupLoading(false);
    }
  };

  // Export to WORD Download Native
  const exportToWord = () => {
    const documentBody = document.getElementById("printed-paper-body")?.innerHTML || "";
    
    // CSS to embed in doc to look absolutely polished
    const headerHtml = showKop ? `
      <div class="letterhead" style="text-align: center; border-bottom: 3.5px double black; padding-bottom: 10px; margin-bottom: 20px;">
        <table style="width: 100%; border: none; border-collapse: collapse;">
          <tr>
            <td style="width: 15%; text-align: left; border: none;">
              <span style="font-size: 32pt; font-family: 'Wingdings', sans-serif; color: #4A5D4E;">✦</span>
            </td>
            <td style="width: 85%; text-align: center; border: none; font-family: 'Times New Roman', serif;">
              <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0;">${provinceName}</div>
              <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 0; letter-spacing: 0.5px;">${deptName}</div>
              <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0; color: #2e4031;">${schoolName}</div>
              <div style="font-size: 8.5pt; font-style: italic; color: #555; margin: 2px 0 0 0;">${schoolAddress}</div>
            </td>
          </tr>
        </table>
      </div>
    ` : "";

    const signaturesHtml = showSignatures ? `
      <div class="sig-section" style="margin-top: 40px; font-family: 'Times New Roman', serif; font-size: 11pt;">
        <table style="width: 100%; border: none; border-collapse: collapse;">
          <tr>
            <td style="width: 45%; text-align: center; border: none; vertical-align: top;">
              <p>Mengetahui,</p>
              <p style="font-weight: bold; margin-bottom: 0.5em;">Kepala Sekolah</p>
              <br/><br/><br/><br/>
              <p style="text-decoration: underline; font-weight: bold; margin: 0;">${principalName}</p>
              <p style="font-size: 9pt; margin: 0; color: #555;">NIP. ${principalNip}</p>
            </td>
            <td style="width: 10%; border: none;"></td>
            <td style="width: 45%; text-align: center; border: none; vertical-align: top;">
              <p>Sleman, ${docDate}</p>
              <p style="font-weight: bold; margin-bottom: 0.5em;">Guru Bimbingan Konseling</p>
              <br/><br/><br/><br/>
              <p style="text-decoration: underline; font-weight: bold; margin: 0;">${counselorName}</p>
              <p style="font-size: 9pt; margin: 0; color: #555;">NIP. ${counselorNip}</p>
            </td>
          </tr>
        </table>
      </div>
    ` : "";

    const fullWordHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${docTitle}</title>
        <style>
          @page {
            size: 8.5in 11in;
            margin: ${marginSize === "narrow" ? "0.5in" : marginSize === "wide" ? "1.5in" : "1in"};
          }
          body {
            font-family: ${fontFamily === "TimesNewRoman" ? "'Times New Roman', serif" : fontFamily === "Arial" ? "Arial, sans-serif" : fontFamily === "JetBrains" ? "'Courier New', monospace" : "Georgia, serif"};
            font-size: ${fontSize}pt;
            line-height: ${lineHeight};
            color: #000000;
          }
          h1, h2, h3, h4 { font-family: 'Times New Roman', serif; font-weight: bold; color: black; line-height: 1.2; }
          h1 { font-size: 16pt; text-align: center; margin-bottom: 12pt; text-transform: uppercase; }
          h2 { font-size: 14pt; text-align: center; margin-bottom: 10pt; }
          h3 { font-size: 12pt; margin-top: 14pt; margin-bottom: 6pt; border-bottom: 1px solid black; padding-bottom: 2px; }
          h4 { font-size: 11pt; margin-top: 10pt; margin-bottom: 4pt; }
          p { margin-bottom: 6pt; text-indent: 0.25in; text-align: justify; }
          li { margin-left: 20pt; margin-bottom: 3pt; }
          table.meta-table { width: 100%; border-collapse: collapse; margin-bottom: 15pt; }
          table.meta-table td { padding: 4pt; border: none; font-size: 10.5pt; vertical-align: top; }
        </style>
      </head>
      <body>
        ${headerHtml}
        
        <div style="text-align: center; margin-top: 10px; margin-bottom: 20px;">
          <h2 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 0; text-transform: uppercase;">
            ${documentType === "report" ? "LAPORAN FORMAL BIMBINGAN KONSELING" : documentType === "rpl" ? "RENCANA PELAKSANAAN LAYANAN (RPL) BK" : "LAPORAN REKAPITULASI PELAYANAN BK"}
          </h2>
          <p style="text-align: center; text-indent: 0; margin-top: 2px; font-size: 10pt; font-family: monospace;">Nomor Surat: ${docNumber}</p>
        </div>

        ${documentBody}
        
        ${signaturesHtml}
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + fullWordHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle.replace(/\s+/g, "_")}_${docDate}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export to EXCEL Download Tabular
  const exportToExcel = () => {
    // Generate clean grid structure representing either individual details or database recaps
    let excelsheetContent = "";

    if (documentType === "report") {
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
          <tr><td>ID Dokumen</td><td>BK-IND-${docDate}-${metadata.studentName?.substring(0, 3).toUpperCase()}</td></tr>
          <tr><td>Tanggal Konseling</td><td>${docDate}</td></tr>
          <tr><td>Nama Siswa (Konseli)</td><td>${metadata.studentName || "N/A"}</td></tr>
          <tr><td>Kelas / Rombel</td><td>${metadata.studentClass || "N/A"}</td></tr>
          <tr><td>Jenis Kelamin</td><td>${metadata.gender || "N/A"}</td></tr>
          <tr><td>Bidang Bimbingan</td><td>${metadata.serviceCategory || "Pribadi"}</td></tr>
          <tr><td>Konselor Pembimbing</td><td>${counselorName}</td></tr>
          <tr><td>Catatan Kasar Masalah</td><td>${metadata.rawNotes || editedContent.substring(0, 200)}</td></tr>
          <tr><td>Intisari Kasus (Summary)</td><td>${metadata.topic || "Layanan Individual"}</td></tr>
          <tr><td>Pola Analisis Guru BK</td><td>Draf analisis psikologis terlampir pda dokumen word/pdf</td></tr>
        </table>
      `;
    } else if (documentType === "recap") {
      excelsheetContent = `
        <table>
          <tr>
            <th colspan="5" style="font-size: 14pt; font-weight: bold; background-color: #2F4F4F; color: white;">KOMPILASI REKAPITULASI PELAYANAN DIGITAL BK</th>
          </tr>
          <tr><td colspan="5">Periode Laporan: ${metadata.period || "Juni 2026"} | Tanggal Unduh: ${new Date().toLocaleDateString("id-ID")}</td></tr>
          <tr><td colspan="5"></td></tr>
          <tr style="background-color: #dbe5d8; font-weight: bold; border: 1px solid #000;">
            <td style="border: 1px solid #ccc; padding: 6px;">Atribut Evaluasi</td>
            <td style="border: 1px solid #ccc; padding: 6px;">Deskripsi Diagnostik / Tren</td>
            <td style="border: 1px solid #ccc; padding: 6px;">Penerima Rekomendasi</td>
            <td style="border: 1px solid #ccc; padding: 6px;">Rencana Kerja Sekolah</td>
          </tr>
          <tr>
            <td valign="top" style="border: 1px solid #ccc; padding: 6px; font-weight: bold;">Bidang Kasus Masuk</td>
            <td valign="top" style="border: 1px solid #ccc; padding: 6px;">Didominasi oleh sirkulasi beban akademik kelas ujian, gadget berlebihan, dan rumor digital WhatsApp kelompok. (Total Kasus Terintegrasi)</td>
            <td valign="top" style="border: 1px solid #ccc; padding: 6px;">Kepala Sekolah & Wali Kelas</td>
            <td valign="top" style="border: 1px solid #ccc; padding: 6px;">Memberikan sirkulasi relaksasi istirahat dan penugasan kolaboratif bebas krisis perundungan.</td>
          </tr>
          <tr>
            <td valign="top" style="border: 1px solid #ccc; padding: 6px; font-weight: bold;">Tindak Lanjut Utama</td>
            <td valign="top" style="border: 1px solid #ccc; padding: 6px;">Evaluasi sosiometri klasikal di kelas X, kelompok kognitif restrukturisasi di kelas XI.</td>
            <td valign="top" style="border: 1px solid #ccc; padding: 6px;">Guru Bimbingan Konseling</td>
            <td valign="top" style="border: 1px solid #ccc; padding: 6px;">Konseling individu, mediasi keluarga terstruktur, dan pemantauan harian mandiri (Self-journaling).</td>
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
            <td>${metadata.topic || docTitle}</td>
          </tr>
          <tr><td>Sasaran Kelas</td><td>Kelas ${metadata.classGrade || "X/XI/XII"}</td></tr>
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
    a.download = `Spreedsheet_BK_${docTitle.replace(/\s+/g, "_")}_${docDate}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Safe Print layout implementation (no popup blockers, styling handled through standard print frames)
  const triggerBeautifulPrint = () => {
    // Generate isolated clean HTML content for printable window - avoids returning input tags
    const headerHtml = showKop ? `
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
    ` : "";

    const titleHtml = `
      <div style="text-align: center; margin-top: 15px; margin-bottom: 25px; font-family: 'Times New Roman', serif;">
        <h2 style="font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 0; text-transform: uppercase; display: inline-block;">
          ${documentType === "report" ? "LAPORAN FORMAL BIMBINGAN KONSELING" : documentType === "rpl" ? "RENCANA PELAKSANAAN LAYANAN (RPL) BK" : "LAPORAN REKAPITULASI PELAYANAN BK"}
        </h2>
        <p style="font-family: monospace; font-size: 10pt; color: #444; margin: 4px 0 0 0; text-align: center; text-indent: 0;">Nomor Surat Perihal: ${docNumber}</p>
      </div>
    `;

    const metadataHtml = (documentType === "report" && metadata.studentName) ? `
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
    ` : (documentType === "rpl" && metadata.topic) ? `
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
    ` : "";

    const contentHtml = `
      <div class="main-doc-content" style="font-family: ${fontFamily === "TimesNewRoman" ? "'Times New Roman', serif" : fontFamily === "Arial" ? "Arial, sans-serif" : fontFamily === "JetBrains" ? "'Courier New', monospace" : "Georgia, serif"}; font-size: ${fontSize}pt; line-height: ${lineHeight}; color: black; text-align: justify;">
        ${parseMarkdownToHTML(editedContent)}
      </div>
    `;

    const signaturesHtml = showSignatures ? `
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
              <p style="margin: 0 0 5px 0; text-indent: 0; text-align: center;">Sleman, ${formatIndonesianDate(docDate)}</p>
              <p style="font-weight: bold; margin: 0 0 70px 0; text-indent: 0; text-align: center;">Guru Bimbingan Konseling</p>
              <p style="text-decoration: underline; font-weight: bold; margin: 0; text-indent: 0; text-align: center;">${counselorName}</p>
              <p style="font-size: 9pt; margin: 2px 0 0 0; color: #555; text-indent: 0; text-align: center;">NIP. ${counselorNip}</p>
            </td>
          </tr>
        </table>
      </div>
    ` : "";

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>BK Auto Admin — Cetak Resmi</title>
            <style>
              @page {
                size: A4;
                margin: ${marginSize === "narrow" ? "12mm" : marginSize === "wide" ? "35mm" : "25mm"};
              }
              @media print {
                body { margin: 0; padding: 0; background: white; color: black; }
                .no-print { display: none !important; }
              }
              body {
                font-family: ${fontFamily === "TimesNewRoman" ? "'Times New Roman', serif" : fontFamily === "Arial" ? "Arial, sans-serif" : fontFamily === "JetBrains" ? "'Courier New', monospace" : "Georgia, serif"};
                color: black;
                font-size: ${fontSize}pt;
                line-height: ${lineHeight};
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
      alert("Popup printer diblokir browser. Izinkan popup atau cetak langsung menggunakan salin teks.");
    }
  };

  const copyPlaintext = () => {
    navigator.clipboard.writeText(editedContent);
    setCopiedNotification(true);
    setTimeout(() => {
      setCopiedNotification(false);
    }, 2000);
  };

  // CSS mappings
  const fontStyles: Record<string, string> = {
    TimesNewRoman: "font-serif tracking-normal leading-relaxed text-black style-draft-times",
    Arial: "font-sans tracking-wide leading-relaxed text-neutral-800 style-draft-arial",
    JetBrains: "font-mono tracking-tight text-neutral-900 style-draft-mono",
    Georgia: "font-serif tracking-normal font-medium leading-relaxed text-slate-900 style-draft-georgia",
  };

  const marginStyles: Record<string, string> = {
    narrow: "px-6 py-6",
    normal: "px-12 py-12 md:px-16 md:py-16",
    wide: "px-20 py-20",
  };

  // Convert dates to Indonesian text
  const formatIndonesianDate = (dateStr: string) => {
    if (!dateStr) return "";
    const splitted = dateStr.split("-");
    if (splitted.length !== 3) return dateStr;
    const year = splitted[0];
    const monthIdx = parseInt(splitted[1]) - 1;
    const day = parseInt(splitted[2]);

    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${day} ${months[monthIdx]} ${year}`;
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 overflow-hidden text-[#E1E8E1]">
      <div className="bg-[#0C0E0C] rounded-3xl border border-[#2D382F] w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        
        {/* HEADER MODAL */}
        <div className="bg-[#181D18] p-4 text-zinc-100 flex justify-between items-center shrink-0 border-b border-[#2D382F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#2E362E] border border-[#4A5D4E]/30 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#9CC09E]" />
            </div>
            <div>
              <p className="text-[10px] text-[#9CC09E] font-mono font-bold uppercase tracking-wider">MODUL FORMATTER & EKSPOR DOKUMEN RESMI</p>
              <h3 className="font-heading font-bold text-sm text-white leading-none mt-0.5">{docTitle}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={exportToWord}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Word (.doc)</span>
            </button>

            <button 
              onClick={exportToExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel (.xls)</span>
            </button>

            <button 
              onClick={triggerBeautifulPrint}
              className="px-3 py-1.5 bg-[#4A5D4E] hover:bg-[#3C4C3E] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Berkas</span>
            </button>

            <button 
              onClick={triggerBeautifulPrint}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor PDF</span>
            </button>

            <button 
              onClick={() => {
                setCustomBackupFileName(docTitle);
                setShowBackupModal(true);
              }}
              className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-100 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow"
              title="Simpan Cadangan ke Google Drive sebagai Google Doc"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M19.43 12.98L12.58 1h-1.16L4.57 12.98h1.16l6.85-11.98h1.16s5.69 9.98 5.69 11.98z" fill="#0066da" />
                <path d="M15.47 16H8.53l-3.41-5.92h13.76L15.47 16z" fill="#00ac47" />
                <path d="M11.58 10L15 4h-6.85L5 10H11.58z" fill="#ffbc00" />
              </svg>
              <span>Backup Google Doc</span>
            </button>

            <button 
              onClick={onClose}
              className="p-1 px-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition ml-2"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* WORKSPACE WORKER */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#0A0C0A]">
          
          {/* LEFT COLUMN: CONTROL & LIVE WRITER EDITOR */}
          <div className="w-full lg:w-[450px] border-r border-[#222823] flex flex-col overflow-y-auto shrink-0 p-5 space-y-6">
            
            {/* TOGGLE EDITS SECTION */}
            <div className="bg-[#121612] p-4 rounded-2xl border border-[#222823] shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-[#222823] pb-2">
                <span className="text-xs font-bold text-[#9CC09E] flex items-center gap-1.5 uppercase">
                  <Sliders className="w-4 h-4 text-[#8F9F77]" />
                  <span>Kustomisasi Bentuk Formulir</span>
                </span>
                
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`px-3 py-1 text-[11px] rounded-lg font-bold transition flex items-center gap-1 ${
                    isEditMode ? "bg-[#364438] text-white" : "bg-[#1C201C] text-[#9CC09E] hover:bg-[#252E26]"
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isEditMode ? "Lihat Preview" : "Edit Teks"}</span>
                </button>
              </div>

              {/* STYLING CONFIGS */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#8F9F77] mb-1">Gaya Huruf (Font)</label>
                  <select 
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#161A16] text-[#E1E8E1] focus:outline-[#8F9F77]"
                  >
                    <option value="TimesNewRoman">Times New Roman (Resmi)</option>
                    <option value="Arial">Arial (Modern Block)</option>
                    <option value="Georgia">Georgia (Serif Elegan)</option>
                    <option value="JetBrains">Monospace (Filsafat Buku)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#8F9F77] mb-1">Ukuran Teks</label>
                  <select 
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#161A16] text-[#E1E8E1] focus:outline-[#8F9F77]"
                  >
                    <option value="10">10 pt (Kecil Padat)</option>
                    <option value="11">11 pt (Standar Dinas)</option>
                    <option value="12">12 pt (Besar Rapi)</option>
                    <option value="14">14 pt (Sangat Jelas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#8F9F77] mb-1">Spasi Paragraf</label>
                  <select 
                    value={lineHeight}
                    onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                    className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#161A16] text-[#E1E8E1] focus:outline-[#8F9F77]"
                  >
                    <option value="1.15">1.15 (Sempit)</option>
                    <option value="1.3">1.3 (Rapat)</option>
                    <option value="1.5">1.5 (Normal Dinas)</option>
                    <option value="2.0">2.0 (Ganda Longgar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#8F9F77] mb-1">Batas Margin Kertas</label>
                  <select 
                    value={marginSize}
                    onChange={(e) => setMarginSize(e.target.value)}
                    className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#161A16] text-[#E1E8E1] focus:outline-[#8F9F77]"
                  >
                    <option value="narrow">Narrow (Sempit 0.5")</option>
                    <option value="normal">Normal (Sedang 1.0")</option>
                    <option value="wide">Wide (Lebar 1.5")</option>
                  </select>
                </div>
              </div>

              {/* DOCUMENT SWITCH TOGGLES */}
              <div className="space-y-2 border-t border-[#222823] pt-3 text-xs text-[#A2B5A2]">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#A2B5A2]">Tampilkan KOP Surat Resmi</span>
                  <button onClick={() => setShowKop(!showKop)} className="text-[#9CC09E]">
                    {showKop ? <ToggleRight className="w-8 h-8 text-[#9CC09E]" /> : <ToggleLeft className="w-8 h-8 text-zinc-650" />}
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#A2B5A2]">Kolom Tanda Tangan BK</span>
                  <button onClick={() => setShowSignatures(!showSignatures)} className="text-[#9CC09E]">
                    {showSignatures ? <ToggleRight className="w-8 h-8 text-[#9CC09E]" /> : <ToggleLeft className="w-8 h-8 text-zinc-650" />}
                  </button>
                </div>
              </div>
            </div>

            {/* LIVE DOCUMENT TEXT EDITOR */}
            <div className="flex-1 flex flex-col bg-[#131613] p-4 rounded-2xl border border-[#222823] shadow-sm min-h-[250px]">
              <div className="flex justify-between items-center border-b border-[#222823] pb-2 mb-3">
                <span className="text-xs font-bold text-[#9CC09E] uppercase tracking-wider flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Ketik / Edit Teks Dokumen</span>
                </span>
                <span className="text-[10px] text-zinc-500">Gunakan Markdown biasa</span>
              </div>

              <div className="flex-1 flex flex-col">
                <textarea
                  value={editedContent}
                  onChange={(e) => {
                    setEditedContent(e.target.value);
                    if (onSave) onSave(e.target.value);
                  }}
                  className="flex-1 w-full p-3 border border-[#2D382F] rounded-xl bg-[#181D18] text-xs font-mono text-[#E1E8E1] focus:outline-none focus:ring-1 focus:ring-[#8F9F77] resize-none"
                  placeholder="Ketik dokumen atau modifikasi draf laporan yang dibuat di sini..."
                />
              </div>

              <div className="flex justify-between items-center mt-3 text-xs">
                <button
                  onClick={copyPlaintext}
                  className="px-2.5 py-1 text-[11px] bg-[#1E241E] border border-[#2D382F] rounded-lg font-bold text-[#9CC09E] hover:bg-[#2A332B] transition"
                >
                  {copiedNotification ? "Teks Berhasil Disalin!" : "Salin Teks Bersih"}
                </button>
                <span className="text-[10px] font-mono text-zinc-500">{editedContent.length} Karakter</span>
              </div>
            </div>

            {/* KOP SURAT METADATA */}
            {showKop && (
              <div className="bg-[#131613] p-4 rounded-2xl border border-[#222823] shadow-sm space-y-3 text-zinc-200">
                <p className="text-xs font-bold text-[#9CC09E] uppercase tracking-wider border-b border-[#222823] pb-1 flex items-center gap-1">
                  <Layout className="w-3.5 h-3.5" />
                  <span>Data Letterhead / KOP Dinas</span>
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">Pemerintah Provinsi / Kota</label>
                    <input 
                      type="text" 
                      value={provinceName} 
                      onChange={(e) => setProvinceName(e.target.value)}
                      className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#181D18] text-[#E1E8E1] focus:outline-none focus:ring-1 focus:ring-[#8F9F77] focus:border-[#8F9F77] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">Nama Sekolah</label>
                    <input 
                      type="text" 
                      value={schoolName} 
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#181D18] text-[#E1E8E1] focus:outline-none focus:ring-1 focus:ring-[#8F9F77] focus:border-[#8F9F77] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">Alamat Sekolah</label>
                    <input 
                      type="text" 
                      value={schoolAddress} 
                      onChange={(e) => setSchoolAddress(e.target.value)}
                      className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#181D18] text-[#E1E8E1] focus:outline-none focus:ring-1 focus:ring-[#8F9F77] focus:border-[#8F9F77] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">Nomor Surat Administrasi</label>
                    <input 
                      type="text" 
                      value={docNumber} 
                      onChange={(e) => setDocNumber(e.target.value)}
                      className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#181D18] text-[#E1E8E1] focus:outline-none focus:ring-1 focus:ring-[#8F9F77] focus:border-[#8F9F77] transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SIGNATURE CONFIGS */}
            {showSignatures && (
              <div className="bg-[#131613] p-4 rounded-2xl border border-[#222823] shadow-sm space-y-3 text-zinc-200">
                <p className="text-xs font-bold text-[#9CC09E] uppercase tracking-wider border-b border-[#222823] pb-1 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Data Penandatangan Surat</span>
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">Nama Kepala Sekolah</label>
                    <input 
                      type="text" 
                      value={principalName} 
                      onChange={(e) => setPrincipalName(e.target.value)}
                      className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#181D18] text-[#E1E8E1] focus:outline-none focus:ring-1 focus:ring-[#8F9F77] focus:border-[#8F9F77] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">NIP Kepala Sekolah</label>
                    <input 
                      type="text" 
                      value={principalNip} 
                      onChange={(e) => setPrincipalNip(e.target.value)}
                      className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#181D18] text-[#E1E8E1] focus:outline-none focus:ring-1 focus:ring-[#8F9F77] focus:border-[#8F9F77] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">Nama Konselor / Guru BK</label>
                    <input 
                      type="text" 
                      value={counselorName} 
                      onChange={(e) => setCounselorName(e.target.value)}
                      className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#181D18] text-[#E1E8E1] focus:outline-none focus:ring-1 focus:ring-[#8F9F77] focus:border-[#8F9F77] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">NIP Konselor</label>
                    <input 
                      type="text" 
                      value={counselorNip} 
                      onChange={(e) => setCounselorNip(e.target.value)}
                      className="w-full border border-[#2D382F] rounded-lg p-1.5 bg-[#181D18] text-[#E1E8E1] focus:outline-none focus:ring-1 focus:ring-[#8F9F77] focus:border-[#8F9F77] transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: HD PRINT PAPER EMULATION PREVIEW FIELD */}
          <div className="flex-1 flex flex-col bg-[#0A0C0A] p-5 md:p-8 overflow-y-auto items-center">
            
            {/* PAPER SHEETS PREVIEW BOX */}
            <div 
              id="printed-paper-complete-view"
              className={`bg-[#181D18] text-zinc-200 shadow-2xl border border-[#2D382F] w-full max-w-[812px] min-h-[1050px] transition-all duration-300 relative print:bg-white print:text-black print:shadow-none print:border-none ${fontStyles[fontFamily]} ${marginStyles[marginSize]}`}
              style={{
                fontSize: `${fontSize}pt`,
                lineHeight: lineHeight
              }}
            >
              {/* LETTERHEAD / KOP SURAT (MGBK INDONESIA LAYOUT STYLE) */}
              {showKop && (
                <div className="border-b-[4px] border-double border-zinc-700 print:border-black pb-4 mb-6 relative group">
                  <div className="absolute right-0 top-0 bg-[#2D382F] border border-[#4A5D4E]/40 text-[#9CC09E] text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    KOP Surat Aktif (Klik Teks untuk Mengedit)
                  </div>
                  <div className="flex items-center gap-4">
                    
                    {/* EMBLEM EMBEDDED */}
                    <div className="w-16 h-16 bg-[#2D382F]/40 border-2 border-[#8F9F77] text-[#9CC09E] rounded-full flex items-center justify-center shrink-0 print:border-black print:bg-neutral-100 print:text-neutral-900">
                      <Award className="w-10 h-10 text-[#9CC09E] print:text-black" />
                    </div>

                    <div className="flex-1 text-center pr-12 space-y-1">
                      <input 
                        type="text" 
                        value={provinceName} 
                        onChange={(e) => setProvinceName(e.target.value)}
                        className="bg-transparent hover:bg-zinc-800/85 focus:bg-[#151815] text-center border-none p-0.5 focus:ring-1 focus:ring-[#8F9F77] focus:outline-none w-full font-bold uppercase tracking-wider leading-tight text-white print:text-black text-xs transition-all rounded shadow-none block"
                        placeholder="PEMERINTAH PROVINSI ..."
                        title="Klik untuk mengedit langsung"
                      />
                      <input 
                        type="text" 
                        value={deptName} 
                        onChange={(e) => setDeptName(e.target.value)}
                        className="bg-transparent hover:bg-zinc-800/85 focus:bg-[#151815] text-center border-none p-0.5 focus:ring-1 focus:ring-[#8F9F77] focus:outline-none w-full font-extrabold uppercase tracking-widest text-[#E1E8E1] print:text-black leading-snug text-sm transition-all rounded shadow-none block"
                        placeholder="DINAS PENDIDIKAN ..."
                        title="Klik untuk mengedit langsung"
                      />
                      <input 
                        type="text" 
                        value={schoolName} 
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="bg-transparent hover:bg-zinc-800/85 focus:bg-[#151815] text-center border-none p-0.5 focus:ring-1 focus:ring-[#8F9F77] focus:outline-none w-full font-bold uppercase text-[#9CC09E] print:text-black leading-snug tracking-wider text-base transition-all rounded shadow-none block"
                        placeholder="NAMA SEKOLAH ..."
                        title="Klik untuk mengedit langsung"
                      />
                      <textarea 
                        value={schoolAddress} 
                        onChange={(e) => setSchoolAddress(e.target.value)}
                        rows={2}
                        className="bg-transparent hover:bg-zinc-800/85 focus:bg-[#151815] text-center border-none p-0.5 focus:ring-1 focus:ring-[#8F9F77] focus:outline-none w-full text-[10px] text-zinc-400 print:text-[#444] font-serif leading-normal mt-1 italic text-center h-10 resize-none transition-all rounded shadow-none block"
                        placeholder="Alamat Sekolah Lengkap..."
                        title="Klik untuk mengedit langsung"
                      />
                    </div>

                  </div>
                </div>
              )}

              {/* DOCUMENT CENTER HEADNAME */}
              <div className="text-center my-6 flex flex-col items-center">
                <h2 className="text-sm uppercase font-bold tracking-widest text-[#E1E8E1] print:text-black inline-block border-b-2 border-zinc-650 print:border-black pb-0.5 text-center text-indent-0">
                  {documentType === "report" ? "LAPORAN FORMAL BIMBINGAN KONSELING" : documentType === "rpl" ? "RENCANA PELAKSANAAN LAYANAN (RPL) BK" : "LAPORAN REKAPITULASI PELAYANAN BK"}
                </h2>
                <div className="flex items-center justify-center gap-1.5 mt-2 w-full max-w-lg">
                  <span className="font-mono text-[11px] text-zinc-400 print:text-neutral-600 uppercase shrink-0">Nomor Surat Perihal:</span>
                  <input 
                    type="text" 
                    value={docNumber} 
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="bg-transparent hover:bg-zinc-800/85 focus:bg-[#151815] text-center border-none p-1 focus:ring-1 focus:ring-[#8F9F77] focus:outline-none font-mono text-[11px] text-zinc-300 print:text-neutral-800 uppercase rounded transition-all flex-1 min-w-[200px]"
                    placeholder="NOMOR REKAP ADMINISTRASI..."
                    title="Klik untuk mengedit langsung Nomor Surat"
                  />
                </div>
              </div>

              {/* DYNAMIC TABULAR FORM FOR INDIVIDUAL REPORTS & RPL METADATA */}
              {documentType === "report" && metadata.studentName && (
                <div className="mb-6 bg-[#121612] border border-[#222823] rounded-xl p-4 text-xs print:bg-stone-50 print:border-stone-200">
                  <h4 className="font-bold text-[#9CC09E] print:text-slate-700 uppercase tracking-wide border-b border-[#222823] print:border-slate-200 pb-1.5 mb-2">IDENTITAS KONSILIASI SISWA</h4>
                  <table className="w-full text-left text-[11px] text-zinc-300 print:text-neutral-800">
                    <tbody>
                      <tr>
                        <td className="py-1 font-bold text-zinc-500 w-1/4">Nama Murid / Konseli</td>
                        <td className="py-1 w-1.5">:</td>
                        <td className="py-1 font-bold text-[#9CC09E] print:text-[#4A5D4E]">{metadata.studentName}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-zinc-500">Kelas & Jenis Kelamin</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-medium">{metadata.studentClass} ({metadata.gender})</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-zinc-500">Bidang Pelayanan</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-semibold text-purple-400 print:text-purple-700">Bidang {metadata.serviceCategory}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-zinc-500">Seksi Pelaporan</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-medium">{counselorName} ({counselorNip})</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {documentType === "rpl" && metadata.topic && (
                <div className="mb-6 bg-[#162016]/40 border border-[#243625]/60 rounded-xl p-4 text-xs print:bg-emerald-50/50 print:border-emerald-100">
                  <h4 className="font-bold text-[#9CC09E] print:text-[#4A5D4E] uppercase tracking-wide border-b border-[#243625]/60 print:border-[#E5E0D5] pb-1.5 mb-2">DATA STRUKTURAL LAYANAN BK</h4>
                  <table className="w-full text-left text-[11px] text-zinc-300 print:text-neutral-800">
                    <tbody>
                      <tr>
                        <td className="py-1 font-bold text-zinc-500 w-1/4">Tema Klasikal</td>
                        <td className="py-1 w-1.5">:</td>
                        <td className="py-1 font-bold text-[#9CC09E] print:text-[#4A5D4E]">{metadata.topic}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-zinc-500">Sasaran Tingkat</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-medium">Kelas {metadata.classGrade}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-zinc-500">Format Layanan</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-semibold text-blue-400 print:text-blue-700">{metadata.serviceType || "Bimbingan Klasikal"} | {metadata.duration || "2 jp"}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-zinc-500">Fokus Sasaran</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-medium">{metadata.focusPoints}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* MAIN CONTENT AREA */}
              <div 
                id="printed-paper-body" 
                className="prose prose-invert print:prose-neutral max-w-none text-zinc-150 print:text-neutral-900 mt-4 leading-relaxed tracking-normal overflow-wrap-break-word font-serif text-[11pt]"
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(editedContent) }}
              />

              {/* COUNSELLOR SIGNATURE DESK BOX */}
              {showSignatures && (
                <div className="mt-12 text-sm text-zinc-200 print:text-neutral-900 border-t border-[#2D382F] print:border-[#E5E0D5] pt-6">
                  <div className="flex justify-between items-start text-center">
                    
                    <div className="w-1/2 flex flex-col items-center">
                      <p className="mb-1 text-indent-0">Mengetahui,</p>
                      <p className="font-bold text-indent-0">Kepala Sekolah {schoolName}</p>
                      <div className="h-20 flex items-center justify-center my-2 select-none text-zinc-500 print:text-gray-300 font-mono italic text-xs">
                        [Tanda Tangan Kepala Sekolah]
                      </div>
                      <p className="font-bold text-zinc-100 print:text-neutral-900 underline text-indent-0">{principalName}</p>
                      <p className="text-xs text-zinc-400 print:text-neutral-500 text-indent-0">NIP. {principalNip}</p>
                    </div>

                    <div className="w-1/2 flex flex-col items-center">
                      <p className="mb-1 text-indent-0">Sleman, {formatIndonesianDate(docDate)}</p>
                      <p className="font-bold text-indent-0">Guru Bimbingan Konseling</p>
                      <div className="h-20 flex items-center justify-center my-2 select-none text-zinc-500 print:text-gray-300 font-mono italic text-xs">
                        [Tanda Tangan Guru BK]
                      </div>
                      <p className="font-bold text-zinc-100 print:text-neutral-900 underline text-indent-0">{counselorName}</p>
                      <p className="text-xs text-zinc-400 print:text-neutral-500 text-indent-0">NIP. {counselorNip}</p>
                    </div>

                  </div>
                </div>
              )}

              {/* PAGE BREAK INDICATOR GUIDES FOR MULTIPAGE VISUAL GRID */}
              {pageBreaks.map((topPos, idx) => (
                <div 
                  key={idx}
                  className="absolute left-0 right-0 border-b-2 border-dashed border-rose-400 no-print z-40 pointer-events-none select-none flex items-center justify-center py-2 bg-gradient-to-r from-transparent via-rose-950/20 to-transparent"
                  style={{ top: `${topPos}px` }}
                >
                  <span className="bg-rose-950 text-rose-300 border border-rose-900 px-3.5 py-1 rounded-full text-[10px] font-bold uppercase font-mono shadow-md flex items-center gap-1">
                    ✂️ BATAS AKHIR LEMBAR {idx + 1} (MULAI HALAMAN {idx + 2} DI PRINT OUT)
                  </span>
                </div>
              ))}

            </div>

          </div>

        </div>

      </div>

      {/* GOOGLE DRIVE BACKUP DIALOG OVERLAY */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-[#000000]/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#131613] rounded-3xl border-2 border-[#8F9F77]/30 w-full max-w-md shadow-2xl p-6 overflow-hidden animate-scaleUp text-zinc-200">
            
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-[#222823] pb-3 mb-4">
              <svg className="w-5 h-5 shrink-0 animate-pulse" viewBox="0 0 24 24" fill="none">
                <path d="M19.43 12.98L12.58 1h-1.16L4.57 12.98h1.16l6.85-11.98h1.16s5.69 9.98 5.69 11.98z" fill="#0066da" />
                <path d="M15.47 16H8.53l-3.41-5.92h13.76L15.47 16z" fill="#00ac47" />
                <path d="M11.58 10L15 4h-6.85L5 10H11.58z" fill="#ffbc00" />
              </svg>
              <h3 className="font-heading font-extrabold text-[#E1E8E1] text-sm tracking-tight uppercase">Backup Google Drive Cloud</h3>
            </div>

            {/* ERROR ALERT */}
            {backupError && (
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3 mb-4 text-xs flex gap-2 text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div>
                  <p className="font-bold">Gagal Mencadangkan</p>
                  <p className="mt-0.5 opacity-90">{backupError}</p>
                </div>
              </div>
            )}

            {/* LOADING STATE */}
            {backupLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-900 border-t-emerald-500 animate-spin" />
                  <Cloud className="w-5 h-5 text-emerald-500 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#E1E8E1] uppercase tracking-wide">Pencadangan Sedang Berproses</p>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-[280px]">{backupProgress}</p>
                </div>
              </div>
            ) : backupSuccessDoc ? (
              /* SUCCESS STATE */
              <div className="py-2 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
                <div className="w-16 h-16 bg-emerald-950/20 rounded-full flex items-center justify-center border-2 border-emerald-500 animate-pulse">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-emerald-400 uppercase tracking-tight">Pencadangan Berhasil!</h4>
                  <p className="text-[11px] text-zinc-400 max-w-sm">
                    Dokumen Anda telah berhasil dikonversi dan disimpan di cloud Google Drive.
                  </p>
                </div>

                <div className="w-full bg-[#181D18] border border-[#2D382F] rounded-xl p-3 text-left space-y-2 text-xs">
                  <div className="flex gap-2 items-center">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-zinc-200 truncate block">{backupSuccessDoc.name}</span>
                  </div>
                  <div className="flex gap-1.5 items-center text-[10px] text-zinc-500">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Tersimpan di folder: <strong>BK Auto Admin Docs</strong></span>
                  </div>
                </div>

                <div className="w-full pt-2 flex flex-col gap-2">
                  <a 
                    href={`https://docs.google.com/document/d/${backupSuccessDoc.id}/edit`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <span>Buka Google Docs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  
                  <button 
                    onClick={() => {
                      setBackupSuccessDoc(null);
                      setShowBackupModal(false);
                    }}
                    className="w-full bg-[#1E241E] hover:bg-[#2A332B] text-zinc-300 p-2.5 rounded-xl font-bold text-xs transition"
                  >
                    Tutup Dialog
                  </button>
                </div>
              </div>
            ) : !gAccessToken ? (
              /* REQUIRE AUTHORIZATION STATE */
              <div className="space-y-4 animate-fadeIn">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Aplikasi memerlukan akses sekali-pakai ke Google Drive Anda untuk dapat mengekspor dan menyimpan berkas cadangan laporan BK ke cloud sebagai format <strong>Google Docs</strong> resmi.
                </p>

                {driveUser && (
                  <div className="bg-[#181D18] border border-[#2D382F] rounded-xl p-3 text-xs flex gap-2 items-center">
                    <div className="w-8 h-8 rounded-full bg-[#2A332B] flex items-center justify-center font-bold text-zinc-300 uppercase">
                      {driveUser.email?.substring(0, 1)}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-zinc-200">{driveUser.displayName || "Guru BK"}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{driveUser.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={handleDriveBackup}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M19.43 12.98L12.58 1h-1.16L4.57 12.98h1.16l6.85-11.98h1.16s5.69 9.98 5.69 11.98z" fill="#FFFFFF" />
                      <path d="M15.47 16H8.53l-3.41-5.92h13.76L15.47 16z" fill="#FFFFFF" fillOpacity="0.8" />
                      <path d="M11.58 10L15 4h-6.85L5 10H11.58z" fill="#FFFFFF" fillOpacity="0.9" />
                    </svg>
                    <span>Hubungkan Akses Google Drive</span>
                  </button>
                  <button 
                    onClick={() => setShowBackupModal(false)}
                    className="w-full border border-[#2D382F] bg-[#1E241E] hover:bg-[#2A332B] text-zinc-300 p-2.5 rounded-xl font-bold text-xs transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              /* READY TO BACKUP SETUP STATE */
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nama Judul Berkas Google Doc</label>
                    <input 
                      type="text"
                      value={customBackupFileName}
                      onChange={(e) => setCustomBackupFileName(e.target.value)}
                      className="w-full border border-[#2D382F] rounded-xl p-2.5 text-xs bg-[#181D18] text-[#E1E8E1] focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-b border-[#222823] py-3 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-none">
                      <input 
                        type="checkbox"
                        checked={backupInFolder}
                        onChange={(e) => setBackupInFolder(e.target.checked)}
                        className="mt-0.5 rounded border-[#2D382F] bg-[#181D18] text-emerald-600 focus:ring-emerald-500 focus:ring-offset-[#131613]"
                      />
                      <div>
                        <span className="font-bold text-zinc-200">Simpan di Folder 'BK Auto Admin Docs'</span>
                        <p className="text-[10px] text-zinc-500 mt-1">Mengelompokkan dokumen bimbingan di satu tempat agar rapi.</p>
                      </div>
                    </label>
                  </div>

                  {driveUser && (
                    <div className="text-[10px] text-zinc-500 flex items-center justify-between">
                      <span>Akun Pencadangan Aktif:</span>
                      <strong className="text-zinc-300 truncate max-w-[200px]">{gAccessToken ? driveUser.email : 'Belum Terhubung'}</strong>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button 
                    onClick={() => setShowBackupModal(false)}
                    className="border border-[#2D382F] bg-[#1E241E] hover:bg-[#2A332B] text-zinc-300 p-2.5 rounded-xl font-bold text-xs transition"
                  >
                    Batal
                  </button>
                  
                  <button 
                    onClick={handleDriveBackup}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Mulai Backup</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
