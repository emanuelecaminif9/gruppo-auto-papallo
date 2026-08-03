(() => {
  const root = document.body;
  const category = root?.dataset.serviceCategory;
  const grid = document.querySelector('#service-vehicle-grid');
  const empty = document.querySelector('#service-empty');
  const serviceCatalog = window.PapalloServices;
  if (!category || !grid || !empty) return;

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);

  const euro = value => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

  const toolbar = document.createElement('div');
  toolbar.className = 'rental-toolbar service-rental-toolbar';
  toolbar.innerHTML = `
    <label class="rental-search">
      <span>⌕</span>
      <input id="service-vehicle-search" type="search" placeholder="Cerca marca o modello" aria-label="Cerca un veicolo">
    </label>
    <select id="service-fuel-filter" aria-label="Filtra per alimentazione">
      <option value="all">Tutte le alimentazioni</option>
      <option value="Plug-in Hybrid">Plug-in Hybrid</option>
      <option value="Hybrid">Hybrid</option>
      <option value="Elettrica">Elettrica</option>
      <option value="Termica">Termica</option>
    </select>`;
  grid.before(toolbar);

  const search = toolbar.querySelector('#service-vehicle-search');
  const fuelFilter = toolbar.querySelector('#service-fuel-filter');
  let vehicles = [];

  function normalizeFuel(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('plug')) return 'Plug-in Hybrid';
    if (normalized.includes('elettr') || normalized.includes('electric')) return 'Elettrica';
    if (normalized.includes('hybrid') || normalized.includes('ibrid')) return 'Hybrid';
    if (
      normalized.includes('termic')
      || ['benzina', 'diesel', 'gpl', 'metano', 'gas'].some(type => normalized.includes(type))
    ) return 'Termica';
    return '';
  }

  function availabilityInfo(value) {
    const isOrder = value === 'order' || value === 'reserved';
    return {
      label: isOrder ? 'Su ordine' : 'In stock',
      className: isOrder ? 'order' : 'stock'
    };
  }

  function getImages(vehicle) {
    const images = Array.isArray(vehicle?.images)
      ? vehicle.images.filter(image => typeof image === 'string' && image.trim())
      : [];
    return images.length ? images : ['assets/auto-placeholder.svg'];
  }

  function formatOfferDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return '';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  function offerDisclaimerMarkup(vehicle) {
    const validUntil = formatOfferDate(vehicle.validUntil);
    const enabled = vehicle.showOfferDisclaimer === true
      || String(vehicle.showOfferDisclaimer).toLowerCase() === 'true';
    if (!enabled || !validUntil) return '';
    return `<p class="vehicle-offer-disclaimer">
      Immagine illustrativa. Offerta soggetta a disponibilità e conferma del noleggiatore. Valida fino al <strong>${esc(validUntil)}</strong>.
    </p>`;
  }

  function servicePackageMarkup(vehicle) {
    if (!serviceCatalog) return '';
    const packageInfo = serviceCatalog.resolveVehicle(vehicle);
    const includedMarkup = packageInfo.included.length
      ? `<ul>${packageInfo.included.map(service => `<li>${esc(service.label)}</li>`).join('')}</ul>`
      : '<p class="vehicle-services-empty">Servizi da definire con il consulente.</p>';
    const optionalMarkup = packageInfo.optional.length
      ? `<div class="vehicle-optional-services"><small>Servizi opzionali a pagamento</small><div>${packageInfo.optional.map(service => `<span>${esc(service.label)}</span>`).join('')}</div></div>`
      : '';

    return `<section class="vehicle-services-box" aria-label="Servizi della ${esc(packageInfo.formulaLabel)}">
      <div class="vehicle-services-head"><div><small>Servizi inclusi</small><strong>${esc(packageInfo.formulaLabel)}</strong></div><span>${packageInfo.included.length}</span></div>
      ${includedMarkup}
      ${optionalMarkup}
    </section>`;
  }

  function galleryMarkup(vehicle) {
    const images = getImages(vehicle);
    const availability = availabilityInfo(vehicle.status);
    const thumbs = images.length > 1
      ? `<div class="service-photo-strip" aria-label="Foto di ${esc(vehicle.brand)} ${esc(vehicle.model)}">
          ${images.map((image, index) => `<button type="button" class="service-photo-thumb ${index === 0 ? 'active' : ''}" data-service-image="${esc(image)}" aria-label="Mostra foto ${index + 1}"><img src="${esc(image)}" alt="" loading="lazy"></button>`).join('')}
        </div>`
      : '';

    return `<div class="service-card-gallery">
      <div class="vehicle-photo">
        <img class="service-gallery-main" src="${esc(images[0])}" alt="${esc(vehicle.brand)} ${esc(vehicle.model)}" loading="lazy">
        <span class="vehicle-label ${availability.className}">${availability.label}</span>
        ${images.length > 1 ? `<span class="vehicle-photo-count">▧ ${images.length} foto</span>` : ''}
      </div>
      ${thumbs}
    </div>`;
  }

  function card(vehicle) {
    const vat = vehicle.vatMode === 'excluded' ? 'IVA esclusa' : 'IVA inclusa';
    const message = encodeURIComponent(`Buongiorno, vorrei informazioni per il noleggio di ${vehicle.brand} ${vehicle.model}.`);
    const description = String(vehicle.description || '').trim();

    return `<article class="vehicle-card rental-card service-rental-card">
      <div class="vehicle-card-top">${vehicle.promo ? '<span class="promo-badge">🔥 PROMO</span>' : ''}</div>
      ${galleryMarkup(vehicle)}
      <div class="vehicle-body">
        <div class="vehicle-type">${esc(vehicle.category)}</div>
        <h3>${esc(vehicle.brand)} ${esc(vehicle.model)}</h3>
        <div class="vehicle-specs">${[vehicle.fuel, vehicle.transmission, vehicle.seats ? `${vehicle.seats} posti` : '', vehicle.year ? `Anno ${vehicle.year}` : ''].filter(Boolean).map(value => `<span>${esc(value)}</span>`).join('')}</div>
        ${description ? `<div class="service-vehicle-description">${esc(description)}</div>` : ''}
        <div class="offer-data-grid">
          <div><small>Durata</small><strong>${esc(vehicle.duration || 'Da definire')}</strong></div>
          <div><small>Km inclusi</small><strong>${esc(vehicle.includedKm || 'Da definire')}</strong></div>
          <div><small>Anticipo</small><strong>${Number(vehicle.advance || 0) > 0 ? euro(vehicle.advance) : 'Anticipo zero'}</strong></div>
        </div>
        <div class="rental-price rental-price-new"><div><small>A partire da</small><strong>${euro(vehicle.price)} <span>/ ${esc(vehicle.priceUnit || 'mese')}</span></strong><em>${vat}</em></div><p>✓ Il preventivo indica con chiarezza anticipo, durata e chilometri inclusi.</p></div>
        <div class="vehicle-actions"><a class="btn btn-primary" href="https://wa.me/393336063849?text=${message}" target="_blank" rel="noopener">Richiedi preventivo</a><a class="btn btn-details" href="noleggio.html#parco-auto">Vedi nel parco auto</a></div>
        ${servicePackageMarkup(vehicle)}
        ${offerDisclaimerMarkup(vehicle)}
      </div>
    </article>`;
  }

  function render() {
    const term = String(search?.value || '').trim().toLowerCase();
    const selectedFuel = fuelFilter?.value || 'all';
    const filtered = vehicles.filter(vehicle => {
      const searchable = `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.description || ''}`.toLowerCase();
      const matchesFuel = selectedFuel === 'all' || normalizeFuel(vehicle.fuel) === selectedFuel;
      return vehicle.active !== false
        && vehicle.category === category
        && matchesFuel
        && searchable.includes(term);
    });

    grid.innerHTML = filtered.map(card).join('');
    empty.hidden = filtered.length !== 0;
  }

  grid.addEventListener('click', event => {
    const thumb = event.target.closest('[data-service-image]');
    if (!thumb) return;
    const gallery = thumb.closest('.service-card-gallery');
    const mainImage = gallery?.querySelector('.service-gallery-main');
    if (!mainImage) return;
    mainImage.src = thumb.dataset.serviceImage;
    gallery.querySelectorAll('.service-photo-thumb').forEach(button => {
      button.classList.toggle('active', button === thumb);
    });
  });

  search.addEventListener('input', render);
  fuelFilter.addEventListener('change', render);

  fetch('/api/vehicles', { cache: 'no-store', headers: { Accept: 'application/json' } })
    .then(response => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then(list => {
      vehicles = Array.isArray(list) ? list : [];
      render();
    })
    .catch(() => {
      grid.innerHTML = '<p class="load-error">Non è stato possibile caricare le offerte. Riprova tra poco.</p>';
    });
})();
