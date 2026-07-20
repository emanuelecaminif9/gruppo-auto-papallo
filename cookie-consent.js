(() => {
  const KEY = 'papallo-cookie-consent-v2';
  const dialog = document.querySelector('#cookie-consent');

  const getChoice = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  };

  const loadExternalContent = () => {
    document.querySelectorAll('iframe[data-cookie-src]').forEach(frame => {
      if (!frame.src) frame.src = frame.dataset.cookieSrc;
      frame.closest('.map-consent-wrap')?.classList.add('loaded');
    });
  };

  const applyChoice = choice => {
    if (choice?.external === true) loadExternalContent();
    if (dialog) dialog.hidden = true;
  };

  const saveChoice = external => {
    const choice = { necessary: true, external, updatedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(choice));
    applyChoice(choice);
  };

  const openSettings = () => {
    if (dialog) dialog.hidden = false;
  };

  document.querySelectorAll('[data-cookie-accept]').forEach(btn => btn.addEventListener('click', () => saveChoice(true)));
  document.querySelectorAll('[data-cookie-essential]').forEach(btn => btn.addEventListener('click', () => saveChoice(false)));
  document.querySelectorAll('[data-cookie-settings]').forEach(btn => btn.addEventListener('click', openSettings));

  document.querySelectorAll('[data-load-map]').forEach(btn => btn.addEventListener('click', () => saveChoice(true)));

  const choice = getChoice();
  if (choice) applyChoice(choice);
  else openSettings();
})();