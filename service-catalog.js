(function initPapalloServices(root, factory) {
  const catalog = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = catalog;
  }

  if (root) {
    root.PapalloServices = catalog;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createPapalloServices() {
  const includedServices = Object.freeze([
    { id: 'rca-250', label: 'RCA con franchigia di 250 €' },
    { id: 'kasko-500', label: 'Kasko con franchigia di 500 €' },
    { id: 'furto-incendio-10', label: 'Furto e incendio con scoperto del 10%' },
    { id: 'manutenzione', label: 'Manutenzione ordinaria e straordinaria' },
    { id: 'assistenza-24-7', label: 'Assistenza stradale 24/7' },
    { id: 'gestione-multe-bollo', label: 'Gestione amministrativa di multe e tassa di possesso' },
    { id: 'gestione-sinistri', label: 'Gestione completa dei sinistri' },
    { id: 'condizioni-fisse', label: 'Condizioni contrattuali non modificabili' }
  ]);

  const optionalServices = Object.freeze([
    { id: 'auto-sostitutiva', label: 'Auto sostitutiva' },
    { id: 'cambio-pneumatici', label: 'Cambio pneumatici' },
    { id: 'riduzione-franchigie', label: 'Riduzione delle franchigie assicurative' }
  ]);

  const standardIncluded = Object.freeze([
    'rca-250',
    'kasko-500',
    'furto-incendio-10',
    'manutenzione',
    'assistenza-24-7',
    'gestione-multe-bollo',
    'gestione-sinistri'
  ]);

  const standardOptional = Object.freeze([
    'auto-sostitutiva',
    'cambio-pneumatici',
    'riduzione-franchigie'
  ]);

  const profiles = Object.freeze({
    'Noleggio Privati': {
      label: 'Formula Privati',
      availableIncluded: standardIncluded,
      defaultIncluded: standardIncluded.slice(0, 5),
      availableOptional: standardOptional,
      defaultOptional: standardOptional
    },
    'Noleggio Aziende': {
      label: 'Formula Aziende',
      availableIncluded: standardIncluded,
      defaultIncluded: standardIncluded,
      availableOptional: standardOptional,
      defaultOptional: standardOptional
    },
    'Noleggio Professionisti': {
      label: 'Formula Professionisti',
      availableIncluded: standardIncluded,
      defaultIncluded: standardIncluded,
      availableOptional: standardOptional,
      defaultOptional: standardOptional
    },
    'Noleggio CHTEC': {
      label: 'Formula CHTEC',
      availableIncluded: Object.freeze([...standardIncluded, 'condizioni-fisse']),
      defaultIncluded: Object.freeze([...standardIncluded, 'condizioni-fisse']),
      availableOptional: Object.freeze(['auto-sostitutiva', 'cambio-pneumatici']),
      defaultOptional: Object.freeze(['auto-sostitutiva', 'cambio-pneumatici'])
    },
    'Noleggio Veicoli Commerciali': {
      label: 'Formula Veicoli Commerciali',
      availableIncluded: standardIncluded,
      defaultIncluded: standardIncluded,
      availableOptional: standardOptional,
      defaultOptional: Object.freeze(['auto-sostitutiva', 'cambio-pneumatici'])
    }
  });

  const includedById = new Map(includedServices.map(service => [service.id, service]));
  const optionalById = new Map(optionalServices.map(service => [service.id, service]));

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return [];
    return [value];
  }

  function profileForCategory(category) {
    return profiles[category] || profiles['Noleggio Privati'];
  }

  function normalizeIds(value, allowedIds) {
    const allowed = new Set(allowedIds);
    return [...new Set(toArray(value).map(String).filter(id => allowed.has(id)))];
  }

  function selectionForCategory(category, included, optional, configured = false) {
    const profile = profileForCategory(category);
    const hasSavedSelection = configured || Array.isArray(included) || Array.isArray(optional);
    const includedSource = hasSavedSelection ? included : profile.defaultIncluded;
    const optionalSource = hasSavedSelection ? optional : profile.defaultOptional;

    return {
      formulaLabel: profile.label,
      includedServices: normalizeIds(includedSource, profile.availableIncluded),
      optionalServices: normalizeIds(optionalSource, profile.availableOptional)
    };
  }

  function resolveVehicle(vehicle = {}) {
    const selection = selectionForCategory(
      vehicle.category,
      vehicle.includedServices,
      vehicle.optionalServices,
      vehicle.servicesConfigured === true
    );

    return {
      ...selection,
      included: selection.includedServices
        .map(id => includedById.get(id))
        .filter(Boolean),
      optional: selection.optionalServices
        .map(id => optionalById.get(id))
        .filter(Boolean)
    };
  }

  function choicesForCategory(category) {
    const profile = profileForCategory(category);
    return {
      formulaLabel: profile.label,
      included: profile.availableIncluded.map(id => includedById.get(id)).filter(Boolean),
      optional: profile.availableOptional.map(id => optionalById.get(id)).filter(Boolean),
      defaultIncluded: [...profile.defaultIncluded],
      defaultOptional: [...profile.defaultOptional]
    };
  }

  return Object.freeze({
    includedServices,
    optionalServices,
    profiles,
    profileForCategory,
    selectionForCategory,
    resolveVehicle,
    choicesForCategory
  });
});
