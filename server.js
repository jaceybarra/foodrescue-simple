import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { getDb } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Twilio (optional: if env is missing, SMS is skipped)
const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
const twilioAuth = process.env.TWILIO_AUTH_TOKEN || '';
const twilioFrom = process.env.TWILIO_FROM_NUMBER || '';
let twilioClient = null;
if (twilioSid && twilioAuth) {
  const twilio = await import('twilio');
  twilioClient = twilio.default(twilioSid, twilioAuth);
}
async function sendSMS(to, body) {
  if (!twilioClient || !twilioFrom || !to) return;
  try { await twilioClient.messages.create({ to, from: twilioFrom, body }); }
  catch (e) { console.error('SMS error', e?.message || e); }
}

app.use(cors());
app.use(express.json());

// Uploads: env-configurable so we can mount a Railway/Render volume
const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Multer storage to the same uploadsDir
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = file?.originalname ? path.extname(file.originalname) : '.jpg';
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// -------- API ROUTES --------

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Create job (sends SMS to active drivers)
app.post('/api/jobs', async (req, res) => {
  const { title, location, food_type, expires_at, contact_name, contact_phone } = req.body || {};
  if (!title || !location) return res.status(400).json({ error: 'title and location are required' });

  const db = await getDb();
  const result = await db.run(
    `INSERT INTO jobs (title, location, food_type, expires_at, contact_name, contact_phone)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, location, food_type || '', expires_at || null, contact_name || '', contact_phone || '']
  );
  const job = await db.get(`SELECT * FROM jobs WHERE id = ?`, [result.lastID]);

  // Notify active drivers via SMS (best-effort)
  try {
    const drivers = await db.all(`SELECT phone FROM drivers WHERE is_active = 1 AND phone IS NOT NULL`);
    if (drivers?.length) {
      const msg = `New pickup: ${job.title} @ ${job.location}${job.expires_at ? ` (expires ${job.expires_at})` : ''}.`;
      await Promise.all(drivers.map(d => sendSMS(d.phone, msg)));
    }
  } catch (e) {
    console.error('Notify drivers failed', e?.message || e);
  }

  res.json(job);
});

// List jobs (optional ?status=)
app.get('/api/jobs', async (req, res) => {
  const { status } = req.query;
  const db = await getDb();
  const rows = status
    ? await db.all(`SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC`, [status])
    : await db.all(`SELECT * FROM jobs ORDER BY created_at DESC`);
  res.json(rows);
});

// Claim job
app.post('/api/jobs/:id/claim', async (req, res) => {
  const { id } = req.params;
  const { driver_name } = req.body || {};
  if (!driver_name) return res.status(400).json({ error: 'driver_name is required' });
  const db = await getDb();
  const existing = await db.get(`SELECT * FROM jobs WHERE id = ?`, [id]);
  if (!existing) return res.status(404).json({ error: 'job not found' });
  if (existing.status !== 'open') return res.status(400).json({ error: 'job is not open' });

  await db.run(`UPDATE jobs SET status = 'claimed', claimed_by = ?, updated_at = datetime('now') WHERE id = ?`,
    [driver_name, id]);
  const updated = await db.get(`SELECT * FROM jobs WHERE id = ?`, [id]);
  res.json(updated);
});

// Update status
app.post('/api/jobs/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const allowed = ['open', 'claimed', 'en_route', 'picked_up', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });

  const db = await getDb();
  const existing = await db.get(`SELECT * FROM jobs WHERE id = ?`, [id]);
  if (!existing) return res.status(404).json({ error: 'job not found' });

  await db.run(`UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id]);
  const updated = await db.get(`SELECT * FROM jobs WHERE id = ?`, [id]);
  res.json(updated);
});

// Upload pickup photo
app.post('/api/jobs/:id/photo', upload.single('photo'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'photo file required' });
  const relPath = '/uploads/' + req.file.filename;

  const db = await getDb();
  const existing = await db.get(`SELECT * FROM jobs WHERE id = ?`, [id]);
  if (!existing) return res.status(404).json({ error: 'job not found' });

  await db.run(`UPDATE jobs SET photo_path = ?, updated_at = datetime('now') WHERE id = ?`, [relPath, id]);
  const updated = await db.get(`SELECT * FROM jobs WHERE id = ?`, [id]);
  res.json(updated);
});

// Drivers (opt-in for SMS)
app.get('/api/drivers', async (req, res) => {
  const db = await getDb();
  const rows = await db.all(`SELECT id, name, phone, is_active FROM drivers ORDER BY created_at DESC`);
  res.json(rows);
});

app.post('/api/drivers', async (req, res) => {
  const { name, phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const db = await getDb();
  await db.run(`INSERT OR IGNORE INTO drivers (name, phone, is_active) VALUES (?, ?, 1)`, [name || '', phone]);
  const row = await db.get(`SELECT id, name, phone, is_active FROM drivers WHERE phone = ?`, [phone]);
  res.json(row);
});

app.post('/api/drivers/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  const row = await db.get(`SELECT * FROM drivers WHERE id = ?`, [id]);
  if (!row) return res.status(404).json({ error: 'not found' });
  const next = row.is_active ? 0 : 1;
  await db.run(`UPDATE drivers SET is_active = ? WHERE id = ?`, [next, id]);
  const updated = await db.get(`SELECT id, name, phone, is_active FROM drivers WHERE id = ?`, [id]);
  res.json(updated);
});

// Serve built frontend in production
app.use(express.static('client/dist'));
app.get('*', (req, res) => {
  const indexPath = path.join(process.cwd(), 'client', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
