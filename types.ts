export type Gender = "Laki-laki" | "Perempuan" | "L/P";

export type ServiceField = "Pribadi" | "Sosial" | "Belajar" | "Karir";

export type ServiceType = 
  | "Bimbingan Klasikal" 
  | "Bimbingan Kelompok" 
  | "Konseling Individual" 
  | "Lintas Kelas"
  | "Home Visit"
  | "Kolaborasi Orang Tua";

export interface CounselingReport {
  id: string;
  studentName: string;
  studentClass: string;
  gender: string;
  counselorName: string;
  date: string;
  serviceCategory: ServiceField;
  rawNotes: string;
  summary: string;
  problemAnalysis: string;
  actionPlan: string;
  formalReportMarkdown: string;
  createdAt: string;
}

export interface RplTemplate {
  id: string;
  topic: string;
  classGrade: string;
  serviceField: ServiceField;
  serviceType: string;
  duration: string;
  focusPoints: string;
  objectives: string;
  activities: string;
  evaluation: string;
  fullRplMarkdown: string;
  createdAt: string;
}

export interface RecapReport {
  id: string;
  period: string;
  dateGenerated: string;
  recordIds: string[];
  identifiedTrends: string;
  recommedationsForSchool: string;
  fullRecapMarkdown: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: "konseling" | "home_visit" | "klasikal" | "konferensi" | "ortu" | "lainnya";
  studentName?: string;
  description?: string;
}
