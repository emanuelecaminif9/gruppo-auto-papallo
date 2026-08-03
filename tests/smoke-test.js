const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'papallo-smoke-'));
process.env.NODE_ENV = 'development';
process.env.STORAGE_DIR = storage;
process.env.ADMIN_EMAIL = 'admin@example.test';
process.env.ADMIN_PASSWORD = 'Test-Papallo-123!';
process.env.JWT_SECRET = 'test-locale-papallo-con-una-chiave-superiore-a-48-caratteri';

const serviceCatalog = require('../service-catalog');
const { normalizeVehicle, normalizeAvailabilityStatus } = require('../server');

try {
  const selectedServices = [
    'pai-conducente',
    'rimborso-medicine',
    'tutela-legale',
    'furto-incendio-0',
    'kasko-0',
    'kasko-250',
    'kasko-1000',
    'rca-0'
  ];
  const description = `Descrizione completa\n${'testo senza limite applicativo '.repeat(220)}`;
  const vehicle = normalizeVehicle({
    brand: 'Test',
    model: 'Auto completa',
    category: 'Noleggio Professionisti',
    price: '499',
    priceUnit: 'mese',
    fuel: 'Plug-in Hybrid',
    status: 'order',
    active: 'true',
    description,
    servicesConfigured: 'true',
    includedServices: selectedServices,
    optionalServices: []
  });

  assert.equal(vehicle.status, 'order');
  assert.equal(vehicle.description, description.trim());
  assert.ok(vehicle.description.length > 5000);
  assert.deepEqual(vehicle.includedServices, selectedServices);
  assert.equal(normalizeAvailabilityStatus('available'), 'stock');
  assert.equal(normalizeAvailabilityStatus('reserved'), 'order');

  const choices = serviceCatalog.choicesForCategory('Noleggio Professionisti');
  const choiceIds = new Set(choices.included.map(service => service.id));
  selectedServices.forEach(id => assert.ok(choiceIds.has(id), `Servizio mancante: ${id}`));

  const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  const adminScript = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const rentalHtml = fs.readFileSync(path.join(root, 'noleggio.html'), 'utf8');
  const rentalScript = fs.readFileSync(path.join(root, 'rental.js'), 'utf8');
  const serviceScript = fs.readFileSync(path.join(root, 'service-page.js'), 'utf8');

  assert.doesNotMatch(serverSource, /MAX_IMAGES|upload\.array\('images',/);
  assert.doesNotMatch(adminScript, /slice\(0,\s*10\)/);
  assert.doesNotMatch(adminHtml, /textarea[^>]*name="description"[^>]*maxlength/i);
  assert.match(adminHtml, /option value="stock">In stock/);
  assert.match(adminHtml, /option value="order">Su ordine/);
  assert.match(indexHtml, /href="nuove\.html"/);
  assert.match(indexHtml, /href="usate\.html"/);
  assert.match(indexHtml, /href="noleggio\.html"/);
  assert.match(rentalHtml, /id="vehicle-fuel"/);
  assert.match(rentalScript, /matchesFuel/);
  assert.match(serviceScript, /service-fuel-filter/);
  assert.match(serviceScript, /service-photo-strip/);
  assert.match(serviceScript, /service-vehicle-description/);

  console.log('Test completato: disponibilità, descrizione, foto senza limite, servizi e filtro alimentazione sono configurati.');
} finally {
  fs.rmSync(storage, { recursive: true, force: true });
}
