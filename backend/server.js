const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const store = require('./lib/store');
const catalog = require('./lib/catalog.json');
const { buildTokenPdf } = require('./lib/pdf');
const { sendCouponEmail } = require('./lib/mail');

const PORT = process.env.PORT || 4000;
const COUPON_RECIPIENT = process.env.COUPON_RECIPIENT || 'varungowdaj77@gmail.com';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://vjpg.vercel.app,http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000')
  .split(',').map((s) => s.trim()).filter(Boolean);

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[warn] JWT_SECRET not set - using a random one; logins reset on every restart.');
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: (origin, cb) => (!origin || ORIGINS.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))) }));
app.use(express.json({ limit: '20kb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please try again in a few minutes.' } });
const couponLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many coupon requests. Please try again later.' } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const clean = (v, max = 100) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const publicUser = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone });
const signToken = (u) => jwt.sign({ sub: u.id }, JWT_SECRET, { expiresIn: '7d' });

async function requireAuth(req, res, next) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return res.status(401).json({ error: 'Please log in to continue.' });
  try {
    const { sub } = jwt.verify(m[1], JWT_SECRET);
    const user = await store.findById(sub);
    if (!user) return res.status(401).json({ error: 'Account not found. Please log in again.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, emailConfigured: Boolean(process.env.RESEND_API_KEY) }));

app.post('/api/signup', authLimiter, async (req, res, next) => {
  try {
    const fullName = clean(req.body.fullName, 60);
    const email = clean(req.body.email, 100).toLowerCase();
    const phone = clean(req.body.phone, 10);
    const password = String(req.body.password ?? '');
    if (fullName.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!PHONE_RE.test(phone)) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be 8-72 characters.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await store.createUser({ fullName, email, phone, passwordHash });
    if (result.error === 'EMAIL_EXISTS') return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    res.status(201).json({ token: signToken(result.user), user: publicUser(result.user) });
  } catch (e) { next(e); }
});

app.post('/api/login', authLimiter, async (req, res, next) => {
  try {
    const email = clean(req.body.email, 100).toLowerCase();
    const password = String(req.body.password ?? '');
    const user = await store.findByEmail(email);
    // Compare against a dummy hash when the user is missing so response timing doesn't reveal which emails exist.
    const ok = await bcrypt.compare(password, user ? user.passwordHash : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
    if (!user || !ok) return res.status(401).json({ error: 'Incorrect email or password.' });
    await store.touchLogin(user.id);
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

app.get('/api/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

const SHARING_KEYS = { 'Single': 'single', '2 Sharing': 'double', '3 Sharing': 'triple', '4 Sharing': 'quad' };

app.post('/api/coupon', couponLimiter, requireAuth, async (req, res, next) => {
  try {
    const fullName = clean(req.body.fullName, 60);
    const phone = clean(req.body.phoneNumber, 10);
    const collegeName = clean(req.body.collegeName, 80);
    const sharingType = clean(req.body.sharingType, 20);
    const pg = catalog.find((p) => p.id === Number(req.body.pgId));

    if (!pg) return res.status(400).json({ error: 'Unknown PG.' });
    if (fullName.length < 2 || !collegeName) return res.status(400).json({ error: 'Please fill in all required fields.' });
    if (!PHONE_RE.test(phone)) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
    if (!SHARING_KEYS[sharingType]) return res.status(400).json({ error: 'Please select a sharing type.' });
    if (req.body.whatsapp !== true) return res.status(400).json({ error: 'Please confirm this is your active WhatsApp number.' });

    // Price comes from the server's catalog, never from the browser.
    const price = pg.sharing_prices[SHARING_KEYS[sharingType]] ?? pg.price;

    let tokenId;
    do { tokenId = 'VJ-' + Math.floor(10000 + Math.random() * 90000); } while (await store.tokenExists(tokenId));
    const issuedDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

    const details = { tokenId, issuedDate, fullName, phone, collegeName, pgName: pg.name, sharingType, price, accountEmail: req.user.email };
    await store.addCoupon({ tokenId, userId: req.user.id, accountEmail: req.user.email, fullName, phone, collegeName, pgName: pg.name, sharingType, price });

    const pdf = await buildTokenPdf({ tokenId, issuedDate, studentName: fullName, phone, collegeName, pgName: pg.name, sharingType, price });

    const mail = await sendCouponEmail({ to: COUPON_RECIPIENT, pdf, b: details });
    if (!mail.ok) console.error(`[mail] ${tokenId} not emailed: ${mail.error}`);
    await store.setCouponEmailStatus(tokenId, COUPON_RECIPIENT, mail.ok ? `sent (${mail.id})` : `FAILED: ${mail.error}`);

    res.status(201).json({ tokenId, filename: `VJ_Token_${tokenId}.pdf`, emailed: mail.ok, pdfBase64: pdf.toString('base64') });
  } catch (e) { next(e); }
});

// Download the Excel workbook (users + coupons). Disabled unless ADMIN_KEY is set.
app.get('/api/admin/export', (req, res) => {
  const given = Buffer.from(String(req.headers['x-admin-key'] || ''));
  const want = Buffer.from(ADMIN_KEY);
  if (!ADMIN_KEY || given.length !== want.length || !crypto.timingSafeEqual(given, want)) return res.status(404).json({ error: 'Not found' });
  res.download(store.file, 'vjpgs-data.xlsx');
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  if (err && err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'Origin not allowed' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

store.init().then(() => {
  app.listen(PORT, () => console.log(`VJ-PGs API on :${PORT} | Excel: ${store.file} | mail -> ${COUPON_RECIPIENT}`));
});
