/**
 * Sinh file customers_raw.csv GIẢ mô phỏng hồ sơ khách hàng thô (case study mục 9): SĐT nhiều dạng,
 * tên hoa/thường lẫn lộn, thiếu trường, trùng SĐT / email / họ tên + ngày sinh.
 * Hạt giống cố định nên chạy lại ra đúng cùng một file.
 * Dùng: node scripts/gen-sample-csv.js [số dòng = 3000] [file ra = data/customers_raw.csv]
 */
const fs = require('node:fs');
const path = require('node:path');
const { prefixes } = require('../config/phone_prefixes.json');

const ROWS = Number(process.argv[2] || 3000);
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..', 'data', 'customers_raw.csv'));
const MAX_BYTES = 5 * 1024 * 1024; // BR8

// PRNG mulberry32: cùng seed thì cùng dãy số.
function makeRandom(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = makeRandom(20261017);
const int = (n) => Math.floor(rnd() * n);
const pick = (list) => list[int(list.length)];
const chance = (p) => rnd() < p;

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const DEM = ['Văn', 'Thị', 'Hữu', 'Minh', 'Quốc', 'Thanh', 'Ngọc', 'Anh', 'Gia', 'Hoàng', 'Thu', 'Thùy', 'Đức', 'Kim', 'Bảo'];
const TEN = ['An', 'Bình', 'Cường', 'Dũng', 'Hà', 'Hạnh', 'Hiếu', 'Hoa', 'Huy', 'Khoa', 'Lan', 'Linh', 'Long', 'Mai', 'Nam',
  'Nga', 'Phong', 'Phúc', 'Quân', 'Quang', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Tuấn', 'Vy', 'Yến', 'Bích', 'Châu', 'Đạt'];
const STREETS = ['Lê Lợi', 'Nguyễn Huệ', 'Trần Hưng Đạo', 'Hai Bà Trưng', 'Cách Mạng Tháng 8', 'Nguyễn Trãi', 'Võ Văn Tần', 'Lý Thường Kiệt'];
const AREAS = ['Q.1, TP.HCM', 'Q.3, TP.HCM', 'Q.10, TP.HCM', 'Ninh Kiều, Cần Thơ', 'Hoàn Kiếm, Hà Nội', 'Cầu Giấy, Hà Nội', 'Bình Thạnh, TP.HCM'];
const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
const BAD_PREFIXES = ['011', '044', '055', '066', '001']; // không thuộc danh mục đầu số

const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const pad = (n, w = 2) => String(n).padStart(w, '0');

function randomDate(fromYear, toYear) {
  const from = Date.UTC(fromYear, 0, 1);
  const to = Date.UTC(toYear, 8, 30);
  const d = new Date(from + Math.floor(rnd() * (to - from)));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}
const iso = ({ y, m, d }) => `${y}-${pad(m)}-${pad(d)}`;
const vn = ({ y, m, d }) => `${pad(d)}/${pad(m)}/${y}`;
const anyFormat = (date) => (chance(0.5) ? iso(date) : vn(date));

const usedPhones = new Set();
function newPhone() {
  for (;;) {
    const digits = pick(prefixes) + String(int(10000000)).padStart(7, '0');
    if (!usedPhones.has(digits)) {
      usedPhones.add(digits);
      return digits;
    }
  }
}

function formatPhone(digits) {
  const r = rnd();
  if (r < 0.55) return digits;
  if (r < 0.67) return `84${digits.slice(1)}`;
  if (r < 0.73) return `+84${digits.slice(1)}`;
  if (r < 0.85) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  if (r < 0.90) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (r < 0.95) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

function messName(name) {
  const r = rnd();
  if (r < 0.70) return name;
  if (r < 0.82) return name.toUpperCase();
  if (r < 0.92) return name.toLowerCase();
  return `  ${name.replace(/ /g, '   ')} `;
}

const stats = {
  rows: 0, missingName: 0, missingPhone: 0, missingCreated: 0, phoneLength: 0, phonePrefix: 0,
  phoneChar: 0, emailInvalid: 0, dateInvalid: 0, dupPhone: 0, dupEmail: 0, dupNameBirth: 0,
};
const goodRows = []; // dòng gốc không lỗi SĐT, để tạo trùng lặp

function makeRow() {
  const name = `${pick(HO)} ${pick(DEM)} ${pick(TEN)}`;
  const birth = chance(0.8) ? randomDate(1960, 2006) : null;
  const created = randomDate(2023, 2026);
  const email = chance(0.7)
    ? `${stripAccents(name).toLowerCase().replace(/ /g, '.')}${int(900) + 100}@${pick(DOMAINS)}`
    : '';
  const address = chance(0.6) ? `${int(200) + 1} ${pick(STREETS)}, ${pick(AREAS)}` : '';
  return { name, birth, created, email, address, phone: newPhone() };
}

function build(i) {
  let row = makeRow();
  let phoneText = null;

  // Trùng lặp: dùng lại SĐT / email / họ tên + ngày sinh của một dòng trước đó.
  if (goodRows.length > 50) {
    const r = rnd();
    const base = pick(goodRows);
    if (r < 0.05) {
      usedPhones.delete(row.phone);
      row = { ...makeRow(), phone: base.phone, name: base.name };
      phoneText = formatPhone(base.phone);
      stats.dupPhone += 1;
    } else if (r < 0.08 && base.email) {
      row.email = base.email;
      stats.dupEmail += 1;
    } else if (r < 0.11 && base.birth) {
      row.name = base.name;
      row.birth = base.birth;
      stats.dupNameBirth += 1;
    }
  }

  let phone = phoneText ?? formatPhone(row.phone);
  let { name, email } = row;
  let birth = row.birth ? anyFormat(row.birth) : '';
  let created = anyFormat(row.created);
  let phoneBad = false;

  // Tiêm lỗi chất lượng dữ liệu.
  if (chance(0.015)) { name = ''; stats.missingName += 1; }
  if (chance(0.010)) { phone = ''; phoneBad = true; stats.missingPhone += 1; }
  else if (chance(0.030)) {
    phone = chance(0.5) ? row.phone.slice(0, 8 + int(2)) : `${row.phone}1`;
    phoneBad = true; stats.phoneLength += 1;
  } else if (chance(0.020)) {
    phone = pick(BAD_PREFIXES) + String(int(10000000)).padStart(7, '0');
    phoneBad = true; stats.phonePrefix += 1;
  } else if (chance(0.015)) {
    phone = `${row.phone.slice(0, 6)}abc${row.phone.slice(9)}`;
    phoneBad = true; stats.phoneChar += 1;
  }
  if (email && chance(0.02)) { email = chance(0.5) ? email.replace('@', '') : email.split('@')[0] + '@'; stats.emailInvalid += 1; }
  if (chance(0.015)) { birth = pick(['31/02/2024', '2024-13-45', 'khong ro', '2030-01-01']); stats.dateInvalid += 1; }
  if (chance(0.015)) { created = ''; stats.missingCreated += 1; }

  if (!phoneBad && row.email && !goodRows.some((g) => g.phone === row.phone)) {
    goodRows.push({ phone: row.phone, name: row.name, birth: row.birth, email: row.email });
  }
  stats.rows = i + 1;
  return [messName(name), phone, email, row.address, birth, created];
}

const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const lines = ['ho_ten,so_dien_thoai,email,dia_chi,ngay_sinh,ngay_tao'];
for (let i = 0; i < ROWS; i += 1) lines.push(build(i).map(csvCell).join(','));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const content = `﻿${lines.join('\r\n')}\r\n`; // BOM + CRLF giống file xuất từ Excel
fs.writeFileSync(OUT, content, 'utf8');

const bytes = Buffer.byteLength(content);
process.stdout.write(`Đã sinh ${ROWS} dòng -> ${OUT} (${(bytes / 1024).toFixed(0)} KB)\n`);
process.stdout.write(`Lỗi/trùng đã tiêm: ${JSON.stringify(stats)}\n`);
if (bytes > MAX_BYTES) process.stdout.write('CẢNH BÁO: file lớn hơn 5 MB (BR8), ứng dụng sẽ từ chối. Hãy giảm số dòng.\n');
