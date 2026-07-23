(() => {
  const root = document.body;
  const category = root?.dataset.serviceCategory;
  const grid = document.querySelector('#service-vehicle-grid');
  const empty = document.querySelector('#service-empty');
  const serviceCatalog = window.PapalloServices;
  if (!category || !grid || !empty) return;

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const euro = value => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value||0));

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

  function card(v) {
    const image = Array.isArray(v.images) && v.images[0] ? v.images[0] : 'assets/auto-placeholder.svg';
    const vat = v.vatMode === 'excluded' ? 'IVA esclusa' : 'IVA inclusa';
    const message = encodeURIComponent(`Buongiorno, vorrei informazioni per il noleggio di ${v.brand} ${v.model}.`);
    return `<article class="vehicle-card rental-card">
      <div class="vehicle-card-top">${v.promo?'<span class="promo-badge">🔥 PROMO</span>':''}</div>
      <div class="vehicle-photo"><img src="${esc(image)}" alt="${esc(v.brand)} ${esc(v.model)}" loading="lazy"></div>
      <div class="vehicle-body">
        <div class="vehicle-type">${esc(v.category)}</div>
        <h3>${esc(v.brand)} ${esc(v.model)}</h3>
        <div class="vehicle-specs">${[v.fuel,v.transmission,v.seats?`${v.seats} posti`:''].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('')}</div>
        <div class="offer-data-grid">
          <div><small>Durata</small><strong>${esc(v.duration||'Da definire')}</strong></div>
          <div><small>Km inclusi</small><strong>${esc(v.includedKm||'Da definire')}</strong></div>
          <div><small>Anticipo</small><strong>${Number(v.advance||0)>0?euro(v.advance):'Anticipo zero'}</strong></div>
        </div>
        <div class="rental-price rental-price-new"><div><small>A partire da</small><strong>${euro(v.price)} <span>/ ${esc(v.priceUnit||'mese')}</span></strong><em>${vat}</em></div><p>✓ Il preventivo indica con chiarezza anticipo, durata e chilometri inclusi.</p></div>
        <div class="vehicle-actions"><a class="btn btn-primary" href="https://wa.me/393336063849?text=${message}" target="_blank" rel="noopener">Richiedi preventivo</a><a class="btn btn-details" href="index.html#parco-auto">Vedi nel parco auto</a></div>
        ${servicePackageMarkup(v)}
      </div>
    </article>`;
  }

  fetch('/api/vehicles',{headers:{Accept:'application/json'}})
    .then(r=>{if(!r.ok)throw new Error();return r.json()})
    .then(list=>{
      const filtered=list.filter(v=>v.active!==false && v.category===category);
      grid.innerHTML=filtered.map(card).join('');
      empty.hidden=filtered.length!==0;
    })
    .catch(()=>{
      grid.innerHTML='<p class="load-error">Non è stato possibile caricare le offerte. Riprova tra poco.</p>';
    });
})();
