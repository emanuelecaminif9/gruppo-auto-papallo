(() => {
  const grid = document.querySelector('#vehicle-grid');
  const empty = document.querySelector('#inventory-empty');
  const search = document.querySelector('#vehicle-search');
  const sort = document.querySelector('#vehicle-sort');
  const categoryButtons = [...document.querySelectorAll('[data-category]')];
  const categoryLinks = [...document.querySelectorAll('[data-category-link]')];

  const modal = document.querySelector('#vehicle-modal');
  const modalClose = document.querySelector('#vehicle-modal-close');
  const modalPrev = document.querySelector('#vehicle-modal-prev');
  const modalNext = document.querySelector('#vehicle-modal-next');
  const modalMainImage = document.querySelector('#vehicle-modal-main-image');
  const modalCounter = document.querySelector('#vehicle-modal-counter');
  const modalThumbs = document.querySelector('#vehicle-modal-thumbs');
  const modalCategory = document.querySelector('#vehicle-modal-category');
  const modalTitle = document.querySelector('#vehicle-modal-title');
  const modalStatus = document.querySelector('#vehicle-modal-status');
  const modalSpecs = document.querySelector('#vehicle-modal-specs');
  const modalDescription = document.querySelector('#vehicle-modal-description');
  const modalPrice = document.querySelector('#vehicle-modal-price');
  const modalPriceUnit = document.querySelector('#vehicle-modal-price-unit');
  const modalWhatsapp = document.querySelector('#vehicle-modal-whatsapp');
  const modalDuration = document.querySelector('#vehicle-modal-duration');
  const modalKm = document.querySelector('#vehicle-modal-km');
  const modalAdvance = document.querySelector('#vehicle-modal-advance');
  const modalVat = document.querySelector('#vehicle-modal-vat');
  const modalAppointment = document.querySelector('#vehicle-modal-appointment');

  const CATEGORIES = [
    'Noleggio Privati',
    'Noleggio Aziende',
    'Noleggio Professionisti',
    'Noleggio CHTEC',
    'Noleggio Veicoli Commerciali'
  ];

  let vehicles = [];
  let activeCategory = 'all';
  let currentVehicle = null;
  let currentImageIndex = 0;
  let lastFocusedElement = null;

  const euro = value => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char]);

  function normalizeCategory(value) {
    const category = String(value || '').trim();
    if (CATEGORIES.includes(category)) return category;

    const lower = category.toLowerCase();
    if (lower.includes('azienda') || lower.includes('fleet') || lower.includes('flotta')) return 'Noleggio Aziende';
    if (lower.includes('profession')) return 'Noleggio Professionisti';
    if (lower.includes('chtec')) return 'Noleggio CHTEC';
    if (lower.includes('commercial') || lower.includes('furgon') || lower.includes('van')) return 'Noleggio Veicoli Commerciali';
    return 'Noleggio Privati';
  }

  function getImages(vehicle) {
    const images = Array.isArray(vehicle?.images)
      ? vehicle.images.filter(image => typeof image === 'string' && image.trim())
      : [];
    return images.length ? images : ['assets/auto-placeholder.svg'];
  }

  function getSpecs(vehicle) {
    return [
      vehicle.fuel,
      vehicle.transmission,
      vehicle.seats ? `${vehicle.seats} posti` : '',
      vehicle.year ? `Anno ${vehicle.year}` : ''
    ].filter(Boolean);
  }

  function vehicleCard(vehicle) {
    const images = getImages(vehicle);
    const specs = getSpecs(vehicle);
    const category = normalizeCategory(vehicle.category);
    const isReserved = vehicle.status === 'reserved';
    const vatLabel = vehicle.vatMode === 'excluded' ? 'IVA esclusa' : 'IVA inclusa';
    const duration = vehicle.duration || 'Da definire';
    const includedKm = vehicle.includedKm || 'Da definire';
    const advance = Number(vehicle.advance || 0);
    const advanceLabel = advance > 0 ? euro(advance) : 'Anticipo zero';
    const message = encodeURIComponent(`Buongiorno, vorrei informazioni per il noleggio di ${vehicle.brand} ${vehicle.model}.`);

    return `
      <article class="vehicle-card rental-card reveal in-view" data-category="${escapeHtml(category)}">
        <div class="vehicle-card-top">
          ${vehicle.promo ? '<span class="promo-badge">🔥 PROMO</span>' : ''}
          <button class="vehicle-favourite" type="button" aria-label="Salva tra i preferiti">♡</button>
        </div>
        <button
          class="vehicle-photo rental-photo vehicle-photo-button"
          type="button"
          data-open-vehicle="${escapeHtml(vehicle.id)}"
          aria-label="Vedi dettagli e foto di ${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}"
        >
          <img src="${escapeHtml(images[0])}" alt="${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}" loading="lazy">
          <span class="vehicle-label ${isReserved ? 'reserved' : ''}">${isReserved ? 'Prenotata' : 'Disponibile'}</span>
          ${images.length > 1 ? `<span class="vehicle-photo-count">▧ ${images.length} foto</span>` : ''}
        </button>

        <div class="vehicle-body">
          <div class="vehicle-type">${escapeHtml(category)}</div>
          <h3>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</h3>
          <div class="vehicle-specs">${specs.map(spec => `<span>${escapeHtml(spec)}</span>`).join('')}</div>

          <div class="offer-data-grid">
            <div><small>Durata</small><strong>${escapeHtml(duration)}</strong></div>
            <div><small>Km inclusi</small><strong>${escapeHtml(includedKm)}</strong></div>
            <div><small>Anticipo</small><strong>${escapeHtml(advanceLabel)}</strong></div>
          </div>

          <div class="rental-price rental-price-new">
            <div><small>A partire da</small><strong>${euro(vehicle.price)} <span>/ ${escapeHtml(vehicle.priceUnit || 'mese')}</span></strong><em>${vatLabel}</em></div>
            <p>✓ Preventivo personalizzabile per anticipo, durata e chilometraggio.</p>
          </div>

          <div class="vehicle-actions">
            <a class="btn btn-primary" href="https://wa.me/393336063849?text=${message}" target="_blank" rel="noopener">Richiedi preventivo</a>
            <button class="btn btn-details" type="button" data-open-vehicle="${escapeHtml(vehicle.id)}">Vedi dettagli <span>→</span></button>
          </div>

          <div class="vehicle-trust-row">
            <span>Assistenza dedicata</span><span>Nessun costo nascosto</span><span>Consegna concordata</span>
          </div>
        </div>
      </article>
    `;
  }

  function setActiveButton() {
    categoryButtons.forEach(button => {
      const selected = button.dataset.category === activeCategory;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function render() {
    if (!grid || !empty) return;

    const term = (search?.value || '').trim().toLowerCase();
    let list = vehicles.filter(vehicle => {
      const category = normalizeCategory(vehicle.category);
      const matchesCategory = activeCategory === 'all' || category === activeCategory;
      const searchableText = `${vehicle.brand || ''} ${vehicle.model || ''} ${category} ${vehicle.fuel || ''}`.toLowerCase();
      return vehicle.active !== false && matchesCategory && searchableText.includes(term);
    });

    if (sort?.value === 'price-asc') {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort?.value === 'price-desc') {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else {
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    }

    grid.innerHTML = list.map(vehicleCard).join('');
    empty.hidden = list.length !== 0;
    setActiveButton();
  }

  function selectCategory(category, shouldScroll = false) {
    activeCategory = category === 'all' || CATEGORIES.includes(category) ? category : 'all';
    render();
    if (shouldScroll) {
      document.querySelector('#parco-auto')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function updateGallery() {
    if (!currentVehicle) return;
    const images = getImages(currentVehicle);
    const total = images.length;
    currentImageIndex = ((currentImageIndex % total) + total) % total;

    modalMainImage.src = images[currentImageIndex];
    modalMainImage.alt = `${currentVehicle.brand} ${currentVehicle.model} - foto ${currentImageIndex + 1}`;
    modalCounter.textContent = `${currentImageIndex + 1} / ${total}`;
    modalPrev.hidden = total <= 1;
    modalNext.hidden = total <= 1;
    modalThumbs.hidden = total <= 1;

    modalThumbs.innerHTML = images.map((image, index) => `
      <button
        type="button"
        class="vehicle-modal-thumb ${index === currentImageIndex ? 'active' : ''}"
        data-image-index="${index}"
        aria-label="Apri la foto ${index + 1}"
        aria-current="${index === currentImageIndex ? 'true' : 'false'}"
      >
        <img src="${escapeHtml(image)}" alt="" loading="lazy">
      </button>
    `).join('');
  }

  function openVehicleModal(vehicleId, trigger) {
    const vehicle = vehicles.find(item => String(item.id) === String(vehicleId));
    if (!vehicle || !modal) return;

    currentVehicle = vehicle;
    currentImageIndex = 0;
    lastFocusedElement = trigger || document.activeElement;
    const specs = getSpecs(vehicle);
    const isReserved = vehicle.status === 'reserved';
    const message = encodeURIComponent(`Buongiorno, vorrei informazioni per il noleggio di ${vehicle.brand} ${vehicle.model}.`);

    modalCategory.textContent = normalizeCategory(vehicle.category);
    modalTitle.textContent = `${vehicle.brand} ${vehicle.model}`;
    modalStatus.textContent = isReserved ? 'Prenotata' : 'Disponibile';
    modalStatus.classList.toggle('reserved', isReserved);
    modalSpecs.innerHTML = specs.map(spec => `<span>${escapeHtml(spec)}</span>`).join('');
    modalDescription.textContent = vehicle.description || 'Contattaci per ricevere tutte le informazioni sulla vettura e sulle condizioni di noleggio.';
    modalPrice.textContent = euro(vehicle.price);
    modalPriceUnit.textContent = `/ ${vehicle.priceUnit || 'mese'}`;
    modalDuration.textContent = vehicle.duration || 'Da definire';
    modalKm.textContent = vehicle.includedKm || 'Da definire';
    modalAdvance.textContent = Number(vehicle.advance || 0) > 0 ? euro(vehicle.advance) : 'Anticipo zero';
    modalVat.textContent = vehicle.vatMode === 'excluded' ? 'IVA esclusa' : 'IVA inclusa';
    modalWhatsapp.href = `https://wa.me/393336063849?text=${message}`;

    updateGallery();
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('vehicle-modal-open');
    modalClose?.focus();
  }

  function closeVehicleModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('vehicle-modal-open');
    currentVehicle = null;
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
  }

  function showPreviousImage() {
    if (!currentVehicle) return;
    currentImageIndex -= 1;
    updateGallery();
  }

  function showNextImage() {
    if (!currentVehicle) return;
    currentImageIndex += 1;
    updateGallery();
  }

  async function loadVehicles() {
    try {
      const response = await fetch('/api/vehicles', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Errore caricamento');
      vehicles = await response.json();
      render();
    } catch {
      if (grid) {
        grid.innerHTML = '<p class="load-error">Non è stato possibile caricare il parco auto. Riprova tra poco.</p>';
      }
    }
  }

  categoryButtons.forEach(button => {
    button.addEventListener('click', () => selectCategory(button.dataset.category || 'all'));
  });

  categoryLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      selectCategory(link.dataset.categoryLink || 'all', true);
    });
  });

  grid?.addEventListener('click', event => {
    const trigger = event.target.closest('[data-open-vehicle]');
    if (!trigger) return;
    openVehicleModal(trigger.dataset.openVehicle, trigger);
  });

  modalThumbs?.addEventListener('click', event => {
    const thumb = event.target.closest('[data-image-index]');
    if (!thumb) return;
    currentImageIndex = Number(thumb.dataset.imageIndex) || 0;
    updateGallery();
  });

  modalClose?.addEventListener('click', closeVehicleModal);
  modalPrev?.addEventListener('click', showPreviousImage);
  modalNext?.addEventListener('click', showNextImage);
  modalAppointment?.addEventListener('click', closeVehicleModal);

  modal?.addEventListener('click', event => {
    if (event.target.matches('[data-close-modal]')) closeVehicleModal();
  });

  document.addEventListener('keydown', event => {
    if (!modal || modal.hidden) return;
    if (event.key === 'Escape') closeVehicleModal();
    if (event.key === 'ArrowLeft') showPreviousImage();
    if (event.key === 'ArrowRight') showNextImage();
  });

  search?.addEventListener('input', render);
  sort?.addEventListener('change', render);

  loadVehicles();
})();
