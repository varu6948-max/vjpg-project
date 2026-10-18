// End-to-end smoke test: real API process + mock Resend server. Run: npm test
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const ExcelJS = require('exceljs');
const assert = require('assert');

const API = 'http://127.0.0.1:4555';
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vjpg-'));
let mailed = [];

const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    mailed.push({ auth: req.headers.authorization, body: JSON.parse(body) });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ id: 'mock-email-id' }));
  });
});

const call = async (p, method = 'GET', body, token) => {
  const r = await fetch(API + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};

(async () => {
  await new Promise((r) => mock.listen(4999, r));
  const srv = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: 4555, DATA_DIR: dataDir, JWT_SECRET: 'test', RESEND_API_KEY: 're_test', RESEND_API_URL: 'http://127.0.0.1:4999/emails', ADMIN_KEY: 'k3y' },
    stdio: 'inherit',
  });
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(API + '/api/health'); break; } catch { await new Promise((r) => setTimeout(r, 250)); } }

    const u = { fullName: 'Test Student', email: 'Test@Example.com', phone: '9876543210', password: 'secret123' };
    let r = await call('/api/signup', 'POST', u);
    assert.strictEqual(r.status, 201); const token = r.json.token;
    assert.strictEqual(r.json.user.email, 'test@example.com');
    assert.strictEqual((await call('/api/signup', 'POST', u)).status, 409, 'duplicate email rejected');
    assert.strictEqual((await call('/api/signup', 'POST', { ...u, email: 'x@y.com', phone: '12345' })).status, 400, 'bad phone rejected');
    assert.strictEqual((await call('/api/signup', 'POST', { ...u, email: 'x@y.com', password: 'short' })).status, 400, 'short password rejected');
    assert.strictEqual((await call('/api/login', 'POST', { email: 'test@example.com', password: 'wrong' })).status, 401);
    r = await call('/api/login', 'POST', { email: 'TEST@example.com', password: 'secret123' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await call('/api/me', 'GET', null, r.json.token)).json.user.fullName, 'Test Student');

    const form = { pgId: 4, sharingType: '2 Sharing', fullName: 'Test Student', phoneNumber: '9876543210', collegeName: 'Cambridge Institute', whatsapp: true };
    assert.strictEqual((await call('/api/coupon', 'POST', form)).status, 401, 'coupon requires login');
    assert.strictEqual((await call('/api/coupon', 'POST', { ...form, pgId: 99 }, token)).status, 400);
    r = await call('/api/coupon', 'POST', form, token);
    assert.strictEqual(r.status, 201); assert.strictEqual(r.json.emailed, true);
    assert.match(r.json.tokenId, /^VJ-\d{5}$/);
    const pdf = Buffer.from(r.json.pdfBase64, 'base64');
    assert.strictEqual(pdf.slice(0, 5).toString(), '%PDF-');
    fs.writeFileSync(path.join(os.tmpdir(), 'sample-token.pdf'), pdf);

    // Mail went to the right person with the PDF attached
    assert.strictEqual(mailed.length, 1);
    assert.deepStrictEqual(mailed[0].body.to, ['varungowdaj77@gmail.com']);
    assert.strictEqual(mailed[0].auth, 'Bearer re_test');
    assert.strictEqual(mailed[0].body.attachments[0].filename, `VJ_Token_${r.json.tokenId}.pdf`);
    assert.strictEqual(mailed[0].body.attachments[0].content, r.json.pdfBase64);

    // Everything landed in Excel
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(dataDir, 'vjpgs-data.xlsx'));
    const users = wb.getWorksheet('Users'); const coupons = wb.getWorksheet('Coupons');
    assert.strictEqual(users.rowCount, 2);
    assert.strictEqual(users.getRow(2).getCell(3).value, 'test@example.com');
    assert.ok(String(users.getRow(2).getCell(5).value).startsWith('$2'), 'password stored as bcrypt hash');
    assert.ok(users.getRow(2).getCell(7).value, 'last login recorded');
    assert.strictEqual(coupons.getRow(2).getCell(1).value, r.json.tokenId);
    assert.strictEqual(coupons.getRow(2).getCell(10).value, 11500, 'price from server catalog (Royal Inn double)');
    assert.ok(String(coupons.getRow(2).getCell(12).value).startsWith('sent'));

    // Admin export
    const ex = await fetch(API + '/api/admin/export', { headers: { 'x-admin-key': 'k3y' } });
    assert.strictEqual(ex.status, 200);
    assert.strictEqual((await fetch(API + '/api/admin/export')).status, 404);

    // Concurrent signups don't corrupt the workbook
    const many = await Promise.all([1, 2, 3, 4, 5].map((i) => call('/api/signup', 'POST', { ...u, email: `c${i}@ex.com` })));
    assert.ok(many.every((m) => m.status === 201));
    const wb2 = new ExcelJS.Workbook(); await wb2.xlsx.readFile(path.join(dataDir, 'vjpgs-data.xlsx'));
    assert.strictEqual(wb2.getWorksheet('Users').rowCount, 7);
    console.log('\nALL CHECKS PASSED');
  } catch (e) { console.error('\nFAILED:', e); process.exitCode = 1; }
  finally { srv.kill(); mock.close(); }
})();
