(() => {
  const serviceCatalog = window.PapalloServices;
  const loginView = document.querySelector('#login-view');
  const dashboard = document.querySelector('#dashboard');
  const loginForm = document.querySelector('#login-form');
  const loginStatus = document.querySelector('#login-status');
  const list = document.querySelector('#admin-list');
  const dialog = document.querySelector('#vehicle-dialog');
  const form = document.querySelector('#vehicle-form');
  const formStatus = document.querySelector('#form-status');
  const preview = document.querySelector('#image-preview');
  const formulaLabel = document.querySelector('#service-formula-label');
  const serviceColumns = document.querySelector('#service-option-columns');
  const serviceEmptyNote = document.querySelector('#service-empty-note');
  const includedOptions = document.querySelector('#included-service-options');
  const optionalOptions = document.querySelector('#optional-service-options');
  const offerNoteConfig = document.querySelector('#offer-note-config');
  const offerNotePreview = document.querySelector('#offer-note-preview');
  let vehicles = [];

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char]);

  const euro = value => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

  function normalizeFuelSelection(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('plug')) return 'Plug-in Hybrid';
    if (normalized.includes('elettr') || normalized.includes('electric')) return 'Elettrica';
    if (normalized.includes('hybrid') || normalized.includes('ibrid')) return 'Hybrid';
    if (normalized && ['termica', 'benzina', 'diesel', 'gpl', 'metano', 'gas'].some(name => normalized.includes(name))) {
      return 'Termica';
    }
    return '';
  }

  function formatOfferDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return '[data]';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '[data]';
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  function syncOfferNoteControls() {
    const enabled = form.elements.showOfferDisclaimer.checked;
    const validUntil = form.elements.validUntil;
    validUntil.disabled = !enabled;
    validUntil.required = enabled;
    offerNoteConfig.classList.toggle('is-enabled', enabled);
    offerNotePreview.innerHTML = `Immagine illustrativa. Offerta soggetta a disponibilità e conferma del noleggiatore. Valida fino al <strong>${formatOfferDate(validUntil.value)}</strong>.`;
  }

  async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Operazione non riuscita');
    return data;
  }

  async function check() {
    try {
      await api('/api/admin/session');
      showDashboard();
      await load();
    } catch {
      loginView.hidden = false;
      dashboard.hidden = true;
    }
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboard.hidden = false;
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginStatus.textContent = 'Accesso in corso...';

    try {
      await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(loginForm)))
      });
      showDashboard();
      await load();
    } catch (error) {
      loginStatus.textContent = error.message;
    }
  });

  document.querySelector('#logout').onclick = async () => {
    await api('/api/admin/logout', { method: 'POST' });
    location.reload();
  };

  async function load() {
    vehicles = await api('/api/admin/vehicles');
    render();
  }

  function render() {
    document.querySelector('#total-count').textContent = vehicles.length;
    document.querySelector('#active-count').textContent = vehicles.filter(vehicle => vehicle.active).length;
    document.querySelector('#reserved-count').textContent = vehicles.filter(vehicle => vehicle.status === 'reserved').length;

    if (!vehicles.length) {
      list.innerHTML = '<div class="empty-admin">Non hai ancora inserito auto a noleggio.</div>';
      return;
    }

    list.innerHTML = vehicles.map(vehicle => {
      const packageInfo = serviceCatalog.resolveVehicle(vehicle);
      const selectedCount = packageInfo.included.length;
      const offerDate = vehicle.showOfferDisclaimer && vehicle.validUntil
        ? formatOfferDate(vehicle.validUntil)
        : '';

      return `<article class="admin-car">
        <img src="${esc(vehicle.images?.[0] || 'assets/auto-placeholder.svg')}" alt="">
        <div>
          <h3>${esc(vehicle.brand)} ${esc(vehicle.model)}
            <span class="badge ${vehicle.status === 'reserved' ? 'reserved' : ''}">${vehicle.status === 'reserved' ? 'Prenotata' : 'Disponibile'}</span>
            ${!vehicle.active ? '<span class="badge hidden">Nascosta</span>' : ''}
          </h3>
          <p>${esc(packageInfo.formulaLabel)} · ${esc(vehicle.fuel || 'Alimentazione non indicata')} · ${esc(vehicle.transmission || 'Cambio non indicato')}</p>
          <div class="admin-service-summary">${selectedCount} servizi inclusi · ${packageInfo.optional.length} opzionali</div>
          ${offerDate ? `<div class="admin-offer-note-summary">Nota offerta attiva fino al ${esc(offerDate)}</div>` : ''}
          <span class="price">${euro(vehicle.price)} / ${esc(vehicle.priceUnit || 'mese')}</span>
        </div>
        <div class="car-actions">
          <button data-edit="${esc(vehicle.id)}">Modifica</button>
          <button class="delete" data-delete="${esc(vehicle.id)}">Elimina</button>
        </div>
      </article>`;
    }).join('');
  }

  function checkboxMarkup(name, service, checked) {
    return `<label class="service-check">
      <input type="checkbox" name="${name}" value="${esc(service.id)}" ${checked ? 'checked' : ''}>
      <span>${esc(service.label)}</span>
    </label>`;
  }

  function renderServiceOptions(category, selection) {
    if (!category) {
      formulaLabel.textContent = 'Seleziona una formula';
      serviceColumns.hidden = true;
      serviceEmptyNote.hidden = false;
      includedOptions.innerHTML = '';
      optionalOptions.innerHTML = '';
      return;
    }

    const choices = serviceCatalog.choicesForCategory(category);
    const includedSelection = new Set(selection?.includedServices ?? choices.defaultIncluded);
    const optionalSelection = new Set(selection?.optionalServices ?? choices.defaultOptional);

    formulaLabel.textContent = choices.formulaLabel;
    serviceColumns.hidden = false;
    serviceEmptyNote.hidden = true;
    includedOptions.innerHTML = choices.included
      .map(service => checkboxMarkup('includedServices', service, includedSelection.has(service.id)))
      .join('');
    optionalOptions.innerHTML = choices.optional
      .map(service => checkboxMarkup('optionalServices', service, optionalSelection.has(service.id)))
      .join('');
  }

  function openNew() {
    form.reset();
    form.elements.id.value = '';
    form.active.checked = true;
    form.elements.showOfferDisclaimer.checked = false;
    form.elements.validUntil.value = '';
    preview.innerHTML = '';
    formStatus.textContent = '';
    renderServiceOptions('');
    syncOfferNoteControls();
    document.querySelector('#modal-kicker').textContent = 'NUOVA AUTO';
    document.querySelector('#modal-title').textContent = 'Inserisci un’auto';
    dialog.showModal();
  }

  function openEdit(vehicle) {
    if (!vehicle) return;

    form.reset();
    for (const [key, value] of Object.entries(vehicle)) {
      const field = form.elements[key];
      if (!field || key === 'images' || key === 'fuel' || key === 'includedServices' || key === 'optionalServices') continue;
      if (field.type === 'checkbox') field.checked = Boolean(value);
      else field.value = value ?? '';
    }

    const fuelValue = normalizeFuelSelection(vehicle.fuel);
    const fuelOption = [...form.querySelectorAll('input[name="fuel"]')]
      .find(input => input.value === fuelValue);
    if (fuelOption) fuelOption.checked = true;

    const selection = serviceCatalog.resolveVehicle(vehicle);
    renderServiceOptions(vehicle.category, selection);
    syncOfferNoteControls();
    preview.innerHTML = (vehicle.images || [])
      .map(src => `<img src="${esc(src)}" alt="Foto attuale">`)
      .join('');
    formStatus.textContent = '';
    document.querySelector('#modal-kicker').textContent = 'MODIFICA AUTO';
    document.querySelector('#modal-title').textContent = `${vehicle.brand} ${vehicle.model}`;
    dialog.showModal();
  }

  document.querySelector('#new-vehicle').onclick = openNew;
  document.querySelector('#close-dialog').onclick = () => dialog.close();
  document.querySelector('#cancel-dialog').onclick = () => dialog.close();

  form.elements.category.addEventListener('change', event => {
    renderServiceOptions(event.target.value);
  });

  form.elements.showOfferDisclaimer.addEventListener('change', syncOfferNoteControls);
  form.elements.validUntil.addEventListener('input', syncOfferNoteControls);

  list.addEventListener('click', async event => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      openEdit(vehicles.find(vehicle => vehicle.id === editId));
    }

    if (deleteId && confirm('Vuoi eliminare definitivamente questa auto dal sito?')) {
      try {
        await api(`/api/admin/vehicles/${deleteId}`, { method: 'DELETE' });
        await load();
      } catch (error) {
        alert(error.message);
      }
    }
  });

  form.images.addEventListener('change', () => {
    preview.innerHTML = '';
    [...form.images.files].slice(0, 10).forEach(file => {
      const image = document.createElement('img');
      image.src = URL.createObjectURL(file);
      preview.appendChild(image);
    });
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    formStatus.textContent = 'Salvataggio in corso...';
    const data = new FormData(form);
    const selectedFuel = form.querySelector('input[name="fuel"]:checked');
    data.set('active', String(form.active.checked));
    data.set('servicesConfigured', 'true');
    data.set('fuel', selectedFuel?.value || '');
    data.set('showOfferDisclaimer', String(form.elements.showOfferDisclaimer.checked));
    data.set('validUntil', form.elements.showOfferDisclaimer.checked ? form.elements.validUntil.value : '');
    const id = form.elements.id.value;

    if (form.elements.showOfferDisclaimer.checked && !form.elements.validUntil.value) {
      formStatus.textContent = 'Seleziona la data di validità dell’offerta.';
      form.elements.validUntil.focus();
      return;
    }

    try {
      await api(id ? `/api/admin/vehicles/${id}` : '/api/admin/vehicles', {
        method: id ? 'PUT' : 'POST',
        body: data
      });
      dialog.close();
      formStatus.textContent = '';
      await load();
    } catch (error) {
      formStatus.textContent = error.message;
    }
  });

  if (!serviceCatalog) {
    throw new Error('Catalogo servizi non disponibile.');
  }

  check();
})();
