import { CounselingReport, RplTemplate, CalendarEvent } from "../types";

export const initialReports: CounselingReport[] = [
  {
    id: "rep-1",
    studentName: "Farhan Syahputra",
    studentClass: "XI-MIPA 2",
    gender: "Laki-laki",
    counselorName: "Dra. Elok Herawati, M.Pd.",
    date: "2026-06-08",
    serviceCategory: "Karir",
    rawNotes: "Siswa berkonsultasi karena bingung memilih jurusan kuliah. Tertarik teknik sipil tapi orang tua menghendaki masuk ilmu ekonomi karena alasan biaya kuliah. Siswa merasa cemas dan prestasinya sedikit menurun akhir semester ini karena banyak melamun.",
    summary: "Siswa bingung memilih jurusan antara Teknik Sipil (minat pribadi) vs Ilmu Ekonomi (keinginan orang tua karena faktor biaya), memicu kecemasan dan penurunan akademis.",
    problemAnalysis: "Dilema karir antara realisasi minat pribadi dan kondisi finansial keluarga. Dorongan eksternal dari orang tua tanpa komunikasi dua arah memicu ketegangan psikologis ringan pada siswa yang bermanifestasi berupa kecemasan dan perilaku distraktif di dalam kelas.",
    actionPlan: "1. Mengajak siswa menyusun riset kecil perbandingan biaya kuliah dan beasiswa teknik sipil.\n2. Mengadakan sesi mediasi bersama orang tua siswa untuk menjembatani komunikasi minat karir.\n3. Siswa berkomitmen untuk membagi waktu belajar agar performa akademik pulih.",
    formalReportMarkdown: `### LAPORAN KONSELING INDIVIDUAL
**UPT SMAN 1 MERDEKA**
*Jl. Pendidikan No. 45, Jakarta*

---

**I. IDENTITAS KONSELI & SESI**
* **Nama Siswa:** Farhan Syahputra
* **Kelas:** XI-MIPA 2
* **Jenis Kelamin:** Laki-laki
* **Bidang Layanan:** Bimbingan Karir
* **Guru BK/Konselor:** Dra. Elok Herawati, M.Pd.
* **Tanggal Pelaksanaan:** 2026-06-08

**II. GEJALA/MASALAH YANG TAMPAK**
Siswa tampak murung di kelas, sering melamun, dan mengalami penurunan nilai pada beberapa tugas kuantitatif. Berdasarkan diskusi awal, siswa memendam kebingungan akut mengenai masa depan akademis pasca-sekolah akibat ekspektasi ekonomi orang tua.

**III. ANALISIS DARI DINAMIKA PSIKOLOGIS**
Siswa berada pada tahap eksplorasi karir karakternya namun terhambat keterbatasan finansial keluarga. Terjadi disonansi kognitif antara minat kuat di bidang teknik sipil dan ketakutan membebani orang tua jika memaksakan kuliah berbiaya tinggi. Keharmonisan hubungan orang tua-anak perlu dijaga melalui mediasi objektif.

**IV. TEKNIK KONSELING YANG DIGUNAKAN**
Menggunakan pendekatan *Cognitive Behavioral Therapy (CBT)* dengan teknik *Reframing Pikiran* dan *Decision Making Grid* untuk menjabarkan pilihan realistis dan alternatif program beasiswa.

**V. HASIL KONSELING & TINDAK LANJUT**
Siswa merasa lebih tenang setelah semua kekhawatiran dipetakan dalam kertas keputusan. 
* **Rencana Tindak Lanjut (RTL):**
  1. Konselor membantu siswa mencari informasi Beasiswa KIP Kuliah atau Program Kemitraan Teknik Sipil.
  2. Guru BK menjadwalkan kunjungan orang tua ke sekolah pada hari Jumat pekan depan untuk berdiskusi bersama secara kekeluargaan.

---
*Jakarta, 8 Juni 2026*

**Dra. Elok Herawati, M.Pd.**
NIP. 19780512 200501 2 003`,
    createdAt: "2026-06-08T09:30:00.000Z"
  },
  {
    id: "rep-2",
    studentName: "Aisyah Rahmawati",
    studentClass: "X-IPS 3",
    gender: "Perempuan",
    counselorName: "Dra. Elok Herawati, M.Pd.",
    date: "2026-06-09",
    serviceCategory: "Sosial",
    rawNotes: "Aisyah dikabarkan menangis di perpustakaan setelah jam istirahat. Setelah diajak bicara, ternyata berselisih paham hebat dengan sahabat lamanya sejak SMP karena tuduhan menyebar rumor negatif grup WhatsApp kelas. Menghindar masuk kelas selanjutnya.",
    summary: "Konflik interpersonal dengan sahabat di grup WhatsApp kelas memicu guncangan emosional (menangis di sekolah) dan kecenderungan menghindari kelas.",
    problemAnalysis: "Krisis relasi sebaya (peer relationship) akibat miskomunikasi di media sosial digital. Siswa mengalami tekanan kecemasan sosial akut karena takut dikucilkan oleh kelompok belajarnya pasca tersebarnya tangkapan layar percakapan pribadi.",
    actionPlan: "1. Memberikan katarsis emosional bagi Aisyah agar lebih tenang.\n2. Melakukan konseling kelompok/mediasi teman sebaya dengan memanggil pihak sahabat secara objektif tanpa menyudutkan.\n3. Mengajarkan etika komunikasi asertif di media digital.",
    formalReportMarkdown: `### LAPORAN PELAKSANAAN KONSELING INDIVIDUAL
**UPT SMAN 1 MERDEKA**
*Jl. Pendidikan No. 45, Jakarta*

---

**I. IDENTITAS KONSELI & SESI**
* **Nama Siswa:** Aisyah Rahmawati
* **Kelas:** X-IPS 3
* **Jenis Kelamin:** Perempuan
* **Bidang Layanan:** Bimbingan Layanan Sosial
* **Guru BK/Konselor:** Dra. Elok Herawati, M.Pd.
* **Tanggal Pelaksanaan:** 2026-06-09

**II. GEJALA/MASALAH YANG TAMPAK**
Siswa mengurung diri di perpustakaan sekolah pada jam istirahat kedua dan menolak masuk ruang kelas selanjutnya dengan alasan pusing kepala dan lemas emosional.

**III. ANALISIS DARI DINAMIKA PSIKOLOGIS**
Siswa mengalami kecemasan hubungan sebaya yang intens akibat rumor negatif dan distorsi kebenaran obrolan digital. Ketergantungan psikologis remaja terhadap penerimaan sosial (peer acceptance) memicu respons pertahanan diri defensif (mengurung diri dan psikosomatis ringan).

**IV. TEKNIK KONSELING YANG DIGUNAKAN**
Menggunakan teknik *Client-Centered Counseling* (untuk katarsis emosi awal) serta dilanjutkan dengan metode *Mediasi Rekonsiliasi Damai (Peer Mediation)*.

**V. HASIL KONSELING & TINDAK LANJUT**
Siswa berhasil mengeluarkan beban kesedihannya dan merasa aman di ruangan BK. Kebingungan rumor telah diidentifikasi sebagai salah tafsir teks pesan singkat.
* **Rencana Tindak Lanjut (RTL):**
  1. Guru BK mengundang sahabat Aisyah ke ruang BK besok pagi untuk proses mediasi damai terbimbing.
  2. Guru BK berkoordinasi dengan wali kelas X-IPS 3 untuk memantau dinamika inklusi sosial Aisyah di dalam kelas.

---
*Jakarta, 9 Juni 2026*

**Dra. Elok Herawati, M.Pd.**
NIP. 19780512 200501 2 003`,
    createdAt: "2026-06-09T11:00:00.000Z"
  },
  {
    id: "rep-3",
    studentName: "Rizky Aditya",
    studentClass: "XII-Bahasa",
    gender: "Laki-laki",
    counselorName: "Dra. Elok Herawati, M.Pd.",
    date: "2026-06-10",
    serviceCategory: "Belajar",
    rawNotes: "Wali kelas melaporkan Rizky sering tertidur di jam pelajaran pertama, bahkan beberapa kali terlambat lebih dari 30 menit. Rizky mengaku begadang main Mobile Legends bersama teman luar sekolah sampai pukul 03.00 pagi hampir setiap malam.",
    summary: "Hambatan kedisiplinan dan penurunan konsentrasi belajar akibat manajemen waktu buruk dan kecanduan gim online larut malam (begadang hingga pukul 3 pagi).",
    problemAnalysis: "Kelemahan kontrol diri (self-regulation) siswa terhadap aktivitas rekreasional digital (gaming), mengganggu ritme sirkadian tubuh (begadang), yang berimplikasi langsung pada keletihan fisiologis di sekolah dan penurunan motivasi berprestasi.",
    actionPlan: "1. Membantu siswa membuat jadwal harian terperinci (kontrak perilaku).\n2. Membatasi durasi main gim maksimal 2 jam sehari dengan meletakkan ponsel luar kamar tidur saat jam istirahat.\n3. Melibatkan pemantauan orang tua untuk konsistensi di rumah.",
    formalReportMarkdown: `### LAPORAN KONSELING INDIVIDUAL (KONTRAK PERILAKU)
**UPT SMAN 1 MERDEKA**
*Jl. Pendidikan No. 45, Jakarta*

---

**I. IDENTITAS KONSELI & SESI**
* **Nama Siswa:** Rizky Aditya
* **Kelas:** XII-Bahasa
* **Jenis Kelamin:** Laki-laki
* **Bidang Layanan:** Bimbingan Belajar
* **Guru BK/Konselor:** Dra. Elok Herawati, M.Pd.
* **Tanggal Pelaksanaan:** 2026-06-10

**II. GEJALA/MASALAH YANG TAMPAK**
Mengantuk berat di kelas, sering terlambat masuk sekolah di jam pelajaran pertama, dan nilai tryout UTBK menurun signifikan pada subtes bahasa.

**III. ANALISIS DARI DINAMIKA PSIKOLOGIS**
Siswa kehilangan regulasi diri karena pelarian stres persiapan ujian akhir kelas XII ke ranah gim kompetitif daring. Kelelahan fisik kronis menghalangi fungsi fokus kognitif otak di siang hari, memperparah rasa tertinggal dalam materi pelajaran dan menciptakan lingkaran setan penundaan (prokrastinasi).

**IV. TEKNIK KONSELING YANG DIGUNAKAN**
Menggunakan pendekatan *Behavioral Therapy* dengan teknik *Behavior Modification (Kontrak Perilaku/Behavioral Contract)* dengan poin sanksi dan apresiasi yang disepakati bersama.

**V. HASIL INTEGRASI & TINDAK LANJUT**
Siswa menandatangan kontrak perilaku tertulis dengan batas waktu perbaikan selama 2 minggu ke depan.
* **Rencana Tindak Lanjut (RTL):**
  1. Rizky wajib menyetorkan foto screenshot grafik aktivitas asisten digital ponselnya ke Guru BK setiap pukul 17.00.
  2. Guru BK menghubungi orang tua Rizky melalui WhatsApp untuk meminta bantuan pengkondisian ponsel di atas jam 22.00 malam.

---
*Jakarta, 10 Juni 2026*

**Dra. Elok Herawati, M.Pd.**
NIP. 19780512 200501 2 003`,
    createdAt: "2026-06-10T14:15:00.000Z"
  }
];

export const initialRpls: RplTemplate[] = [
  {
    id: "rpl-1",
    topic: "Manajemen Waktu: Merdeka dari Prokrastinasi Akademik",
    classGrade: "X",
    serviceField: "Belajar",
    serviceType: "Bimbingan Klasikal",
    duration: "2 x 45 Menit",
    focusPoints: "Membekali siswa kelas X agar mampu mengatur jadwal harian mandiri di masa transisi SMA.",
    objectives: "1. Siswa mampu mengidentifikasi pencuri waktu pribadi (distraksi).\n2. Siswa mampu menyusun skala prioritas menggunakan Kuadran Eisenhower.\n3. Siswa membiasakan komitmen belajar teratur.",
    activities: "Tahap Awal: Salam, doa, kuis menyenangkan 'Seberapa Sering Kamu Menunda', penyampaian tujuan materi.\nTahap Inti: Pembagian kelompok kecil, pembuatan draf jadwal harian, bermain peran 'Godaan Penunda', pemaparan Kuadran Prioritas.\nTahap Penutup: Menyimpulkan bersama guru BK, menuliskan komitmen pribadi, refleksi evaluasi.",
    evaluation: "Evaluasi Proses: Guru BK mengamati partisipasi aktif siswa, dinamika dialog kelompok, dan antusiasme pengerjaan tugas harian.\nEvaluasi Hasil: Pengisian angket kepuasan siswa dan kesesuaian draf jadwal yang dikumpulkan.",
    fullRplMarkdown: `### RENCANA PELAKSANAAN LAYANAN (RPL)
**BIMBINGAN KLASIKAL**
**TAHUN AJARAN 2026/2027**

| Komponen | Penjelasan |
|---|---|
| **Sekolah** | UPT SMAN 1 Merdeka |
| **Kelas/Semester** | Kelas X / Ganjil |
| **Topik Layanan** | Manajemen Waktu: Merdeka dari Prokrastinasi |
| **Bidang Layanan** | Bimbingan Belajar |
| **Alokasi Waktu** | 2 x 45 Menit |

---

#### A. TUJUAN LAYANAN
1. **Tujuan Umum:** Peserta didik memiliki sikap bertanggung jawab dalam mendesain, mengendalikan, dan mengawasi alokasi waktu pribadi demi performa belajar yang optimal.
2. **Tujuan Khusus:**
   * Peserta didik dapat menganalisis faktor penyebab kebiasaan menunda-nunda pekerjaan sekolah (*procrastination*).
   * Peserta didik dapat mengklasifikasikan tugas kedalam Kuadran Prioritas Eisenhower.
   * Peserta didik merumuskan tindakan preventif menghindari pencuri waktu (gadget & sosmed).

#### B. LANGKAH-LANGKAH KEGIATAN

##### 1. Tahap Pendahuluan (15 Menit)
* **Apersepsi:** Guru BK membuka kelas dengan yel-yel penyemangat, memberi salam, doa bersama, dan presensi.
* **Pengantar:** Guru BK menceritakan kisah ilustratif pendek "Si Jago Menunda vs Si Cermat Waktu".
* **Transisi:** Guru BK menjelaskan tujuan umum pembelajaran hari ini dan kesepakatan tata tertib kelas.

##### 2. Tahap Inti (60 Menit)
* **Eksplorasi:** Siswa diberikan angket iseng "Seberapa Sering Kamu Menunda?". Guru BK memaparkan presentasi visual mengenai *Eisenhower Matrix*.
* **Kolaborasi:** Siswa dibagi menjadi kelompok-kelompok beranggotakan 5 murid. Setiap kelompok diberikan studi kasus fiktif tentang jadwal siswa padat kegiatan organisasi dan esktrakulikuler. Mereka bertugas menatanya ke dalam matriks kuadran.
* **Elaborasi:** Perwakilan kelompok mempresentasikan hasil matriknya di papan tulis kelompok. Tanya jawab terbimbing dipandu guru BK.

##### 3. Tahap Penutup & Refleksi (15 Menit)
* Siswa merangkum poin esensial bersama Guru BK.
* **Refleksi Diri:** Siswa mengisi kartu refleksi "Satu hal konkrit yang akan saya ubah malam ini adalah..."
* Sesi ditutup dengan doa keselamatan bersama.

#### C. EVALUASI
1. **Evaluasi Proses:** Guru BK memonitor kelancaran diskusi, keaktifan berpendapat siswa pemalu, dan keseriusan merancang prioritas kerja.
2. **Evaluasi Hasil:** Penilaian diri pasca layanan (Self-Assessment) menggunakan kuesioner digital sederhana yang dikirim oleh ketua kelas.

---
*Mengetahui,*
*Kepala Sekolah,*

**Drs. H. Mulyadi, M.M.**
NIP. 19690412 199303 1 004

*Jakarta, 12 Juni 2026*
*Guru BK,*

**Dra. Elok Herawati, M.Pd.**
NIP. 19780512 200501 2 003`,
    createdAt: "2026-06-12T08:00:00.000Z"
  }
];

export const initialCalendarEvents: CalendarEvent[] = [
  {
    id: "cal-1",
    title: "Konseling Individual Farhan",
    date: "2026-06-15",
    time: "09:00",
    type: "konseling",
    studentName: "Farhan Syahputra",
    description: "Sesi tindak lanjut eksplorasi beasiswa kuliah Teknik Sipil."
  },
  {
    id: "cal-2",
    title: "Mediasi Teman Sebaya Aisyah",
    date: "2026-06-16",
    time: "08:15",
    type: "konseling",
    studentName: "Aisyah & Sahabat",
    description: "Pertemuan rekonsiliasi kesalahpahaman ruang obrolan WA."
  },
  {
    id: "cal-3",
    title: "Bimbingan Klasikal Kelas XII",
    date: "2026-06-17",
    time: "10:30",
    type: "klasikal",
    description: "Tema: Strategi jitu lulus UTBK-SNBT tanpa stres akademis."
  },
  {
    id: "cal-4",
    title: "Home Visit Orang Tua Tono",
    date: "2026-06-18",
    time: "13:30",
    type: "home_visit",
    studentName: "Tono Wijaya",
    description: "Kunjungan ke rumah wali murid karena Tono tidak hadir sekolah tanpa keterangan selama 5 hari berturut-turut."
  },
  {
    id: "cal-5",
    title: "Konferensi Kasus Guru & Kepsek",
    date: "2026-06-19",
    time: "14:00",
    type: "konferensi",
    description: "Rapat koordinasi bersama wakasek kesiswaan dan wali kelas membahas program pencegahan kecanduan judi online di tingkat sekolah."
  }
];
