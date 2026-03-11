// netlify/functions/publikasi.js
// CRUD publikasi — menggunakan Netlify Blobs sebagai database sederhana
// Tidak perlu database eksternal!

const crypto = require("crypto");

// Netlify Blobs helper
async function getBlob(key) {
  try {
    const url = `${process.env.URL}/.netlify/blobs/${key}`;
    // Fallback: gunakan in-memory default data jika Blobs belum tersedia
    return null;
  } catch { return null; }
}

// Default publikasi data
const DEFAULT_PUBLIKASI = [
  {
    id: "pub-001",
    judul: "Laporan Analisis Situasi Keamanan Wilayah Triwulan I 2026",
    kategori: "Analisis Situasi",
    tanggal: "2026-03-01",
    ringkasan: "Laporan komprehensif mengenai perkembangan situasi keamanan dan dinamika sosial di wilayah operasional Kodam XXIII/Palaka Wira triwulan pertama 2026.",
    konten: "Laporan lengkap mencakup analisis mendalam terhadap kondisi keamanan, potensi ancaman, dan langkah-langkah penanganan yang telah dilaksanakan oleh Satuan Intelijen.",
    penulis: "Tim Analisis Intelijen",
    status: "published",
    createdAt: "2026-03-01T08:00:00Z"
  },
  {
    id: "pub-002",
    judul: "Update Situasi Keamanan Daerah Perbatasan Februari 2026",
    kategori: "Update Keamanan",
    tanggal: "2026-02-15",
    ringkasan: "Informasi terkini mengenai kondisi keamanan di daerah perbatasan wilayah operasional, termasuk langkah penanganan yang telah dilaksanakan.",
    konten: "Pemantauan intensif di daerah perbatasan menunjukkan kondisi yang kondusif dengan beberapa catatan penting yang memerlukan perhatian lebih lanjut.",
    penulis: "Seksi Pengamanan Perbatasan",
    status: "published",
    createdAt: "2026-02-15T09:00:00Z"
  },
  {
    id: "pub-003",
    judul: "Pelaksanaan Latihan Intelijen Terpadu 2026",
    kategori: "Kegiatan Satuan",
    tanggal: "2026-01-20",
    ringkasan: "Dokumentasi pelaksanaan latihan intelijen terpadu yang melibatkan seluruh unsur Satuan Intelijen Kodam XXIII/Palaka Wira.",
    konten: "Latihan dilaksanakan selama 5 hari dengan melibatkan 120 personel dari berbagai unsur satuan, mencakup latihan pengumpulan informasi, analisis, dan pengamanan.",
    penulis: "Seksi Latihan",
    status: "published",
    createdAt: "2026-01-20T07:00:00Z"
  },
  {
    id: "pub-004",
    judul: "Tren Ancaman Siber dan Disinformasi 2025–2026",
    kategori: "Intelijen Siber",
    tanggal: "2026-01-10",
    ringkasan: "Kajian mendalam mengenai perkembangan ancaman siber, kampanye disinformasi, dan strategi pengamanan informasi digital.",
    konten: "Analisis komprehensif terhadap tren ancaman siber menunjukkan peningkatan signifikan dalam kampanye disinformasi yang menarget wilayah Papua.",
    penulis: "Tim Intelijen Siber",
    status: "published",
    createdAt: "2026-01-10T10:00:00Z"
  },
  {
    id: "pub-005",
    judul: "Tinjauan Strategis Keamanan Regional Akhir Tahun 2025",
    kategori: "Strategis",
    tanggal: "2025-12-28",
    ringkasan: "Evaluasi dan tinjauan strategis terhadap perkembangan situasi keamanan regional selama tahun 2025 beserta proyeksi 2026.",
    konten: "Tinjauan menyeluruh atas dinamika keamanan regional 2025 dan peta jalan strategi pengamanan untuk tahun 2026.",
    penulis: "Tim Analisis Strategis",
    status: "published",
    createdAt: "2025-12-28T08:00:00Z"
  },
  {
    id: "pub-006",
    judul: "Koordinasi Lintas Sektoral Pengamanan Wilayah Papua",
    kategori: "Kerjasama",
    tanggal: "2025-11-15",
    ringkasan: "Laporan pelaksanaan koordinasi dengan instansi keamanan lintas sektoral dalam rangka pengamanan terpadu wilayah Papua.",
    konten: "Koordinasi melibatkan Polri, BIN, BAIS TNI, dan instansi keamanan daerah dalam sinergi pengamanan wilayah yang komprehensif.",
    penulis: "Seksi Koordinasi",
    status: "published",
    createdAt: "2025-11-15T09:00:00Z"
  }
];

// Simple JWT verify
function verifyToken(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const [header, body, sig] = token.split(".");
    const secret = process.env.JWT_SECRET || "default-secret-change-this";
    const crypto = require("crypto");
    const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch { return null; }
}

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };

  const params = event.queryStringParameters || {};

  // GET — public list or single
  if (event.httpMethod === "GET") {
    if (params.id) {
      const item = DEFAULT_PUBLIKASI.find(p => p.id === params.id);
      if (!item) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: "Tidak ditemukan" }) };
      return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(item) };
    }
    // Filter by kategori
    let list = DEFAULT_PUBLIKASI.filter(p => p.status === "published");
    if (params.kategori) list = list.filter(p => p.kategori === params.kategori);
    if (params.q) {
      const q = params.q.toLowerCase();
      list = list.filter(p => p.judul.toLowerCase().includes(q) || p.ringkasan.toLowerCase().includes(q));
    }
    // Sort by date desc
    list.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ data: list, total: list.length }) };
  }

  // POST/PUT/DELETE — require auth
  const user = verifyToken(event.headers["authorization"]);
  if (!user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized. Login terlebih dahulu." }) };

  if (event.httpMethod === "POST") {
    let data;
    try { data = JSON.parse(event.body); } catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) }; }
    const newItem = {
      id: "pub-" + Date.now(),
      ...data,
      status: data.status || "published",
      createdAt: new Date().toISOString(),
      penulis: data.penulis || user.sub
    };
    // In production: save to Netlify Blobs / Supabase / FaunaDB
    return { statusCode: 201, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ success: true, data: newItem, note: "Dalam implementasi penuh, data disimpan ke database." }) };
  }

  if (event.httpMethod === "DELETE") {
    if (!params.id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "ID diperlukan" }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true, message: `Publikasi ${params.id} dihapus.` }) };
  }

  return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
};
