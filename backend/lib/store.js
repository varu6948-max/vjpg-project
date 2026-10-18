// Excel-backed storage. All signup/login info and issued coupons live in one .xlsx workbook.
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, process.env.EXCEL_FILE || 'vjpgs-data.xlsx');

const USER_COLS = [
  ['User ID', 10], ['Full Name', 26], ['Email', 32], ['Phone', 14],
  ['Password (bcrypt hash)', 64], ['Created At', 22], ['Last Login', 22],
];
const COUPON_COLS = [
  ['Token ID', 12], ['Issued At', 22], ['User ID', 10], ['Account Email', 32],
  ['Student Name', 26], ['Phone', 14], ['College', 28], ['PG Name', 28],
  ['Sharing Type', 14], ['Final Price (Rs)', 16], ['Emailed To', 30], ['Email Status', 40],
];

let queue = Promise.resolve();
function withLock(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}
function ensureSheet(wb, name, cols) {
  let ws = wb.getWorksheet(name);
  if (!ws) {
    ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = cols.map(([header, width]) => ({ header, width }));
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0073D2' } };
    head.alignment = { vertical: 'middle' };
  }
  return ws;
}
async function load() {
  const wb = new ExcelJS.Workbook();
  if (fs.existsSync(FILE)) await wb.xlsx.readFile(FILE);
  ensureSheet(wb, 'Users', USER_COLS);
  ensureSheet(wb, 'Coupons', COUPON_COLS);
  return wb;
}
async function save(wb) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  await wb.xlsx.writeFile(tmp);
  fs.renameSync(tmp, FILE);
}
const safeText = (v) => {
  const s = String(v ?? '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
};
const cellText = (v) => v == null ? '' : (v instanceof Date ? v.toISOString() : String(v));
const rowToUser = (r) => ({
  id: Number(r.getCell(1).value),
  fullName: String(r.getCell(2).value ?? ''),
  email: String(r.getCell(3).value ?? ''),
  phone: String(r.getCell(4).value ?? ''),
  passwordHash: String(r.getCell(5).value ?? ''),
});
function findUser(ws, pred) {
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    if (!row.getCell(1).value) continue;
    const u = rowToUser(row);
    if (pred(u)) return { user: u, row };
  }
  return null;
}
const iso = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const store = {
  file: FILE,
  init: () => withLock(async () => { const wb = await load(); await save(wb); }),
  createUser: ({ fullName, email, phone, passwordHash }) => withLock(async () => {
    const wb = await load();
    const ws = wb.getWorksheet('Users');
    if (findUser(ws, (u) => u.email === email)) return { error: 'EMAIL_EXISTS' };
    let maxId = 0;
    for (let i = 2; i <= ws.rowCount; i++) maxId = Math.max(maxId, Number(ws.getRow(i).getCell(1).value) || 0);
    const id = maxId + 1;
    ws.addRow([id, safeText(fullName), email, String(phone), passwordHash, iso(), '']);
    await save(wb);
    return { user: { id, fullName, email, phone } };
  }),
  findByEmail: (email) => withLock(async () => {
    const wb = await load();
    const hit = findUser(wb.getWorksheet('Users'), (u) => u.email === email);
    return hit ? hit.user : null;
  }),
  findById: (id) => withLock(async () => {
    const wb = await load();
    const hit = findUser(wb.getWorksheet('Users'), (u) => u.id === Number(id));
    return hit ? hit.user : null;
  }),
  touchLogin: (id) => withLock(async () => {
    const wb = await load();
    const hit = findUser(wb.getWorksheet('Users'), (u) => u.id === Number(id));
    if (hit) { hit.row.getCell(7).value = iso(); await save(wb); }
  }),
  tokenExists: (tokenId) => withLock(async () => {
    const ws = (await load()).getWorksheet('Coupons');
    for (let i = 2; i <= ws.rowCount; i++) if (ws.getRow(i).getCell(1).value === tokenId) return true;
    return false;
  }),
  addCoupon: (c) => withLock(async () => {
    const wb = await load();
    wb.getWorksheet('Coupons').addRow([
      c.tokenId, iso(), c.userId, c.accountEmail, safeText(c.fullName), String(c.phone),
      safeText(c.collegeName), c.pgName, c.sharingType, c.price, '', 'pending',
    ]);
    await save(wb);
  }),
  setCouponEmailStatus: (tokenId, to, status) => withLock(async () => {
    const wb = await load();
    const ws = wb.getWorksheet('Coupons');
    for (let i = 2; i <= ws.rowCount; i++) {
      const row = ws.getRow(i);
      if (row.getCell(1).value === tokenId) {
        row.getCell(11).value = to;
        row.getCell(12).value = status;
        break;
      }
    }
    await save(wb);
  }),
  adminData: () => withLock(async () => {
    const wb = await load();
    const usersWs = wb.getWorksheet('Users');
    const couponsWs = wb.getWorksheet('Coupons');
    const users = [];
    const coupons = [];
    for (let i = 2; i <= usersWs.rowCount; i++) {
      const r = usersWs.getRow(i);
      if (!r.getCell(1).value) continue;
      users.push({
        id: Number(r.getCell(1).value), fullName: cellText(r.getCell(2).value),
        email: cellText(r.getCell(3).value), phone: cellText(r.getCell(4).value),
        createdAt: cellText(r.getCell(6).value), lastLogin: cellText(r.getCell(7).value),
      });
    }
    for (let i = 2; i <= couponsWs.rowCount; i++) {
      const r = couponsWs.getRow(i);
      if (!r.getCell(1).value) continue;
      coupons.push({
        tokenId: cellText(r.getCell(1).value), issuedAt: cellText(r.getCell(2).value),
        userId: cellText(r.getCell(3).value), accountEmail: cellText(r.getCell(4).value),
        studentName: cellText(r.getCell(5).value), phone: cellText(r.getCell(6).value),
        college: cellText(r.getCell(7).value), pgName: cellText(r.getCell(8).value),
        sharingType: cellText(r.getCell(9).value), price: cellText(r.getCell(10).value),
        emailedTo: cellText(r.getCell(11).value), emailStatus: cellText(r.getCell(12).value),
      });
    }
    return { users: users.reverse(), coupons: coupons.reverse() };
  }),
};
module.exports = store;
