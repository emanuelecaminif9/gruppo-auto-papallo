require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const serviceCatalog = require('./service-catalog');

const app = express();
const ROOT = __dirname;
const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : ROOT;
const DATA_FILE = path.join(STORAGE_DIR, 'data', 'vehicles.json');
const UPLOAD_DIR = path.join(STORAGE_DIR, 'uploads');
const SEED_DATA_FILE = path.join(ROOT, 'data', 'vehicles.json');
const SEED_UPLOAD_DIR = path.join(ROOT, 'uploads');
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const JWT_SECRET = String(process.env.JWT_SECRET || '');
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const ADMIN_PASSWORD_HASH = String(process.env.ADMIN_PASSWORD_HASH || '');
const ADMIN_PATH = normalizeAdminPath(process.env.ADMIN_PATH || '/gestione-papallo');
const PUBLIC_URL = String(process.env.PUBLIC_URL || '').replace(/\/$/, '');
const COOKIE_NAME = 'papallo_admin';
const MAX_IMAGES = 10;
const RENTAL_CATEGORIES = [
  'Noleggio Privati',
  'Noleggio Aziende',
  'Noleggio Professionisti',
  'Noleggio CHTEC',
  'Noleggio Veicoli Commerciali'
];
const FUEL_TYPES = ['Plug-in Hybrid', 'Hybrid', 'Elettrica', 'Termica'];

function normalizeAdminPath(value) {
  const cleaned = `/${String(value || '').trim().replace(/^\/+|\/+$/g, '')}`;
  if (!/^\/[a-zA-Z0-9_-]{8,80}$/.test(cleaned)) return '/gestione-papallo';
  return cleaned;
}

function assertSecureConfiguration() {
  if (!IS_PRODUCTION) return;
  const problems = [];
  if (JWT_SECRET.length < 48) problems.push('JWT_SECRET deve contenere almeno 48 caratteri.');
  if (!ADMIN_EMAIL.includes('@')) problems.push('ADMIN_EMAIL non è valido.');
  if (!/^\$2[aby]\$/.test(ADMIN_PASSWORD_HASH)) problems.push('ADMIN_PASSWORD_HASH deve essere un hash bcrypt.');
  if (!PUBLIC_URL.startsWith('https://')) problems.push('PUBLIC_URL deve iniziare con https://');
  if (problems.length) {
    console.error('\nCONFIGURAZIONE DI PRODUZIONE NON SICURA:');
    problems.forEach(problem => console.error(`- ${problem}`));
    process.exit(1);
  }
}
assertSecureConfiguration();

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Al primo avvio su un disco persistente vuoto, copia i dati iniziali inclusi nel progetto.
if (!fs.existsSync(DATA_FILE)) {
  if (fs.existsSync(SEED_DATA_FILE) && path.resolve(SEED_DATA_FILE) !== path.resolve(DATA_FILE)) {
    fs.copyFileSync(SEED_DATA_FILE, DATA_FILE);
  } else {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

if (path.resolve(SEED_UPLOAD_DIR) !== path.resolve(UPLOAD_DIR) && fs.existsSync(SEED_UPLOAD_DIR)) {
  for (const name of fs.readdirSync(SEED_UPLOAD_DIR)) {
    if (name === '.gitkeep') continue;
    const source = path.join(SEED_UPLOAD_DIR, name);
    const destination = path.join(UPLOAD_DIR, name);
    if (fs.statSync(source).isFile() && !fs.existsSync(destination)) {
      fs.copyFileSync(source, destination);
    }
  }
}

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", 'https://www.google.com'],
      upgradeInsecureRequests: IS_PRODUCTION ? [] : null
    }
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(express.json({ limit: '250kb' }));
app.use(express.urlencoded({ extended: false, limit: '250kb' }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 250,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

function readVehicles() {
  try {
    const value = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeVehicles(vehicles) {
  const temp = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(vehicles, null, 2), { mode: 0o600 });
  fs.renameSync(temp, DATA_FILE);
}

function cleanText(value, max = 180) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function normalizeFuelType(value) {
  const cleaned = cleanText(value, 40);
  const normalized = cleaned.toLowerCase();
  if (normalized.includes('plug')) return 'Plug-in Hybrid';
  if (normalized.includes('elettr') || normalized.includes('electric')) return 'Elettrica';
  if (normalized.includes('hybrid') || normalized.includes('ibrid')) return 'Hybrid';
  if (['termica', 'benzina', 'diesel', 'gpl', 'metano', 'gas'].some(name => normalized.includes(name))) {
    return 'Termica';
  }
  return FUEL_TYPES.includes(cleaned) ? cleaned : '';
}

function normalizeOfferDate(value) {
  const cleaned = cleanText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return '';
  const [year, month, day] = cleaned.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return '';
  return cleaned;
}

function normalizeVehicle(body, existing = {}) {
  const price = Number(body.price);
  const seats = body.seats ? Number(body.seats) : null;
  const year = body.year ? Number(body.year) : null;
  const brand = cleanText(body.brand, 60);
  const model = cleanText(body.model, 80);
  const requestedCategory = cleanText(body.category, 60);
  const showOfferDisclaimer = body.showOfferDisclaimer === 'true'
    || body.showOfferDisclaimer === true
    || body.showOfferDisclaimer === 'on';
  const validUntil = normalizeOfferDate(body.validUntil);

  if (!brand || !model) throw new Error('Marca e modello sono obbligatori.');
  if (!Number.isFinite(price) || price < 0 || price > 1000000) throw new Error('Inserisci un prezzo valido.');
  if (showOfferDisclaimer && !validUntil) throw new Error('Seleziona una data valida per l’offerta.');

  const category = RENTAL_CATEGORIES.includes(requestedCategory) ? requestedCategory : 'Noleggio Privati';
  const servicesConfigured = body.servicesConfigured === 'true'
    || body.servicesConfigured === true
    || body.servicesConfigured === 'on';
  const previousConfigured = existing.servicesConfigured === true
    || Array.isArray(existing.includedServices)
    || Array.isArray(existing.optionalServices);
  const serviceSelection = serviceCatalog.selectionForCategory(
    category,
    servicesConfigured ? body.includedServices : existing.includedServices,
    servicesConfigured ? body.optionalServices : existing.optionalServices,
    servicesConfigured || previousConfigured
  );

  return {
    ...existing,
    brand,
    model,
    category,
    price: Math.round(price * 100) / 100,
    priceUnit: ['giorno', 'settimana', 'mese'].includes(body.priceUnit) ? body.priceUnit : 'mese',
    fuel: normalizeFuelType(body.fuel || existing.fuel),
    transmission: cleanText(body.transmission, 40),
    seats: Number.isInteger(seats) && seats >= 1 && seats <= 30 ? seats : null,
    year: Number.isInteger(year) && year >= 1950 && year <= new Date().getFullYear() + 1 ? year : null,
    duration: cleanText(body.duration, 40),
    includedKm: cleanText(body.includedKm, 40),
    advance: Number.isFinite(Number(body.advance)) && Number(body.advance) >= 0 ? Math.round(Number(body.advance) * 100) / 100 : 0,
    vatMode: body.vatMode === 'excluded' ? 'excluded' : 'included',
    promo: body.promo === 'true' || body.promo === true || body.promo === 'on',
    status: body.status === 'reserved' ? 'reserved' : 'available',
    active: body.active === 'true' || body.active === true || body.active === 'on',
    description: cleanText(body.description, 1000),
    showOfferDisclaimer,
    validUntil: showOfferDisclaimer ? validUntil : '',
    servicesConfigured: servicesConfigured || previousConfigured,
    includedServices: serviceSelection.includedServices,
    optionalServices: serviceSelection.optionalServices
  };
}

function resolveUpload(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return null;
  const filename = path.basename(imagePath);
  const target = path.resolve(UPLOAD_DIR, filename);
  return target.startsWith(`${path.resolve(UPLOAD_DIR)}${path.sep}`) ? target : null;
}

function deleteUploadedImage(imagePath) {
  const target = resolveUpload(imagePath);
  if (target && fs.existsSync(target)) fs.unlinkSync(target);
}

function hasValidImageSignature(filePath, mimetype) {
  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 12, 0);
  fs.closeSync(fd);
  if (mimetype === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimetype === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (mimetype === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
  return false;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[file.mimetype];
    if (!ext) return cb(new Error('Formato immagine non consentito.'));
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024, files: MAX_IMAGES, fields: 50 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});

function validateUploadedFiles(req, _res, next) {
  try {
    for (const file of req.files || []) {
      if (!hasValidImageSignature(file.path, file.mimetype)) {
        (req.files || []).forEach(item => { if (fs.existsSync(item.path)) fs.unlinkSync(item.path); });
        return next(new Error('Il file caricato non è un’immagine valida.'));
      }
      fs.chmodSync(file.path, 0o600);
    }
    next();
  } catch (error) {
    next(error);
  }
}

function auth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Accesso richiesto.' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET || 'solo-sviluppo-locale', { algorithms: ['HS256'] });
    next();
  } catch {
    res.clearCookie(COOKIE_NAME, cookieOptions());
    return res.status(401).json({ error: 'Sessione scaduta.' });
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: IS_PRODUCTION,
    path: '/',
    maxAge: 4 * 60 * 60 * 1000
  };
}

function sameOrigin(req, res, next) {
  const origin = req.get('origin');
  const host = req.get('host');
  if (!origin) return next();
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return next();
  } catch {}
  return res.status(403).json({ error: 'Richiesta non autorizzata.' });
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi. Riprova tra 15 minuti.' }
});

app.post('/api/admin/login', sameOrigin, loginLimiter, async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const configuredHash = ADMIN_PASSWORD_HASH || bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Papallo123!', 12);
  const validPassword = await bcrypt.compare(password, configuredHash);
  const validEmail = crypto.timingSafeEqual(
    Buffer.from(email.padEnd(ADMIN_EMAIL.length, '\0').slice(0, ADMIN_EMAIL.length)),
    Buffer.from(ADMIN_EMAIL)
  );

  if (!validEmail || !validPassword) {
    await new Promise(resolve => setTimeout(resolve, 600));
    return res.status(401).json({ error: 'Credenziali non corrette.' });
  }

  const token = jwt.sign(
    { email: ADMIN_EMAIL, role: 'admin', nonce: crypto.randomUUID() },
    JWT_SECRET || 'solo-sviluppo-locale',
    { algorithm: 'HS256', expiresIn: '4h', issuer: 'gruppo-auto-papallo' }
  );
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ ok: true, email: ADMIN_EMAIL });
});

app.post('/api/admin/logout', sameOrigin, (_req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({ ok: true });
});
app.get('/api/admin/session', auth, (req, res) => res.json({ authenticated: true, email: req.admin.email }));

app.get('/api/vehicles', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(readVehicles().filter(vehicle => vehicle.active !== false));
});
app.get('/api/admin/vehicles', auth, (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(readVehicles());
});

app.post('/api/admin/vehicles', sameOrigin, auth, upload.array('images', MAX_IMAGES), validateUploadedFiles, (req, res) => {
  try {
    const now = new Date().toISOString();
    const vehicle = normalizeVehicle(req.body, { id: crypto.randomUUID(), createdAt: now });
    vehicle.updatedAt = now;
    vehicle.images = req.files?.length ? req.files.map(file => `/uploads/${file.filename}`) : ['assets/auto-placeholder.svg'];
    const vehicles = readVehicles();
    vehicles.push(vehicle);
    writeVehicles(vehicles);
    res.status(201).json(vehicle);
  } catch (error) {
    req.files?.forEach(file => deleteUploadedImage(`/uploads/${file.filename}`));
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/admin/vehicles/:id', sameOrigin, auth, upload.array('images', MAX_IMAGES), validateUploadedFiles, (req, res) => {
  try {
    const vehicles = readVehicles();
    const index = vehicles.findIndex(vehicle => vehicle.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Auto non trovata.' });
    const existing = vehicles[index];
    const updated = normalizeVehicle(req.body, existing);
    updated.updatedAt = new Date().toISOString();
    if (req.files?.length) {
      existing.images?.forEach(deleteUploadedImage);
      updated.images = req.files.map(file => `/uploads/${file.filename}`);
    } else {
      updated.images = existing.images?.length ? existing.images : ['assets/auto-placeholder.svg'];
    }
    vehicles[index] = updated;
    writeVehicles(vehicles);
    res.json(updated);
  } catch (error) {
    req.files?.forEach(file => deleteUploadedImage(`/uploads/${file.filename}`));
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/admin/vehicles/:id', sameOrigin, auth, (req, res) => {
  const vehicles = readVehicles();
  const index = vehicles.findIndex(vehicle => vehicle.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Auto non trovata.' });
  const [removed] = vehicles.splice(index, 1);
  removed.images?.forEach(deleteUploadedImage);
  writeVehicles(vehicles);
  res.json({ ok: true });
});

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', immutable: true, dotfiles: 'deny' }));
app.use('/assets', express.static(path.join(ROOT, 'assets'), { maxAge: '7d', dotfiles: 'deny' }));
app.get('/style.css', (_req, res) => res.sendFile(path.join(ROOT, 'style.css')));
app.get('/script.js', (_req, res) => res.sendFile(path.join(ROOT, 'script.js')));
app.get('/rental.js', (_req, res) => res.sendFile(path.join(ROOT, 'rental.js')));
app.get('/service-catalog.js', (_req, res) => res.sendFile(path.join(ROOT, 'service-catalog.js')));
app.get('/admin.css', (_req, res) => res.sendFile(path.join(ROOT, 'admin.css')));
app.get('/admin.js', (_req, res) => res.sendFile(path.join(ROOT, 'admin.js')));
app.get('/', (_req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/privacy', (_req, res) => res.sendFile(path.join(ROOT, 'privacy.html')));
app.get('/cookie', (_req, res) => res.sendFile(path.join(ROOT, 'cookie.html')));
app.get('/privacy.html', (_req, res) =>
  res.sendFile(path.join(ROOT, 'privacy.html'))
);

app.get('/cookie.html', (_req, res) =>
  res.sendFile(path.join(ROOT, 'cookie.html'))
);
app.get('/index.html', (_req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/noleggio-privati', (_req, res) => res.sendFile(path.join(ROOT, 'noleggio-privati.html')));
app.get('/noleggio-aziende', (_req, res) => res.sendFile(path.join(ROOT, 'noleggio-aziende.html')));
app.get('/noleggio-professionisti', (_req, res) => res.sendFile(path.join(ROOT, 'noleggio-professionisti.html')));
app.get('/noleggio-chtec', (_req, res) => res.sendFile(path.join(ROOT, 'noleggio-chtec.html')));
app.get('/veicoli-commerciali', (_req, res) => res.sendFile(path.join(ROOT, 'veicoli-commerciali.html')));
app.get('/noleggio-privati.html', (_req, res) =>
  res.sendFile(path.join(ROOT, 'noleggio-privati.html'))
);

app.get('/noleggio-aziende.html', (_req, res) =>
  res.sendFile(path.join(ROOT, 'noleggio-aziende.html'))
);

app.get('/noleggio-professionisti.html', (_req, res) =>
  res.sendFile(path.join(ROOT, 'noleggio-professionisti.html'))
);

app.get('/noleggio-chtec.html', (_req, res) =>
  res.sendFile(path.join(ROOT, 'noleggio-chtec.html'))
);

app.get('/veicoli-commerciali.html', (_req, res) =>
  res.sendFile(path.join(ROOT, 'veicoli-commerciali.html'))
);
app.get('/service-page.js', (_req, res) => res.sendFile(path.join(ROOT, 'service-page.js')));
app.get('/cookie-consent.js', (_req, res) => res.sendFile(path.join(ROOT, 'cookie-consent.js')));
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: ${ADMIN_PATH}\nDisallow: /api/admin/\n`);
});
app.get(ADMIN_PATH, (_req, res) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' });
  res.sendFile(path.join(ROOT, 'admin.html'));
});
app.get('/admin', (_req, res) => res.status(404).send('Pagina non trovata.'));
app.get('/admin.html', (_req, res) => res.status(404).send('Pagina non trovata.'));

app.use((_req, res) => res.status(404).send('Pagina non trovata.'));
app.use((err, req, res, _next) => {
  req.files?.forEach(file => { if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path); });
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Foto non valida. Massimo ${MAX_IMAGES} foto e 6 MB per foto.` });
  }
  if (err?.message?.includes('immagine')) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Errore interno del server.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sito: http://localhost:${PORT}`);
  console.log(`Pannello riservato: http://localhost:${PORT}${ADMIN_PATH}`);
});
