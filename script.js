(() => {
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  const navBackdrop = document.querySelector('#nav-backdrop');

  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 22);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const closeMobileMenu = () => {
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'Apri il menu');
    navToggle?.classList.remove('active');
    mainNav?.classList.remove('open');
    document.body.classList.remove('menu-open');
  };

  const openMobileMenu = () => {
    navToggle?.setAttribute('aria-expanded', 'true');
    navToggle?.setAttribute('aria-label', 'Chiudi il menu');
    navToggle?.classList.add('active');
    mainNav?.classList.add('open');
    document.body.classList.add('menu-open');
  };

  navToggle?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMobileMenu() : openMobileMenu();
  });

  navBackdrop?.addEventListener('click', closeMobileMenu);
  mainNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileMenu));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMobileMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) closeMobileMenu();
  });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px' });

    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  } else {
    document.querySelectorAll('.reveal').forEach(element => element.classList.add('in-view'));
  }

  document.querySelectorAll('input[type="date"]').forEach(input => {
    const now = new Date();
    input.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
  });

  const markValidity = input => {
    const valid = input.type === 'checkbox' ? input.checked : input.checkValidity();
    input.classList.toggle('invalid', !valid);
    return valid;
  };

  const prepareValidation = form => {
    form?.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('input', () => markValidity(input));
      input.addEventListener('change', () => markValidity(input));
    });
  };

  const validateForm = (form, status) => {
    const required = [...form.querySelectorAll('[required]')];
    const valid = required.every(markValidity);
    if (!valid) {
      status.textContent = 'Controlla i campi evidenziati prima di inviare.';
      status.style.color = '#b10f17';
      required.find(input => input.classList.contains('invalid'))?.focus();
    }
    return valid;
  };

  const quoteForm = document.querySelector('#quote-form');
  const quoteStatus = document.querySelector('#quote-status');
  prepareValidation(quoteForm);

  quoteForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!validateForm(quoteForm, quoteStatus)) return;

    const data = new FormData(quoteForm);
    const message = [
      'Buongiorno, vorrei ricevere un preventivo di noleggio da Gruppo Auto Papallo.',
      '',
      `Nome: ${data.get('name')}`,
      `Telefono: ${data.get('phone')}`,
      `Email: ${data.get('email')}`,
      `Tipologia: ${data.get('interest')}`,
      data.get('message') ? `Esigenza: ${data.get('message')}` : ''
    ].filter(Boolean).join('\n');

    quoteStatus.textContent = 'Richiesta pronta. Si aprirà WhatsApp per confermare l’invio.';
    quoteStatus.style.color = '#34724e';
    window.open(`https://wa.me/393336063849?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  });

  const appointmentForm = document.querySelector('#appointment-form');
  const appointmentStatus = document.querySelector('#form-status');
  prepareValidation(appointmentForm);

  appointmentForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!validateForm(appointmentForm, appointmentStatus)) return;

    const data = new FormData(appointmentForm);
    const message = [
      'Buongiorno, vorrei prenotare una consulenza presso Gruppo Auto Papallo.',
      '',
      `Nome: ${data.get('name')}`,
      `Telefono: ${data.get('phone')}`,
      `Email: ${data.get('email')}`,
      `Tipologia: ${data.get('interest')}`,
      `Data preferita: ${data.get('date')}`,
      `Fascia oraria: ${data.get('time')}`,
      data.get('message') ? `Messaggio: ${data.get('message')}` : ''
    ].filter(Boolean).join('\n');

    appointmentStatus.textContent = 'Richiesta pronta. Si aprirà WhatsApp per confermare l’invio.';
    appointmentStatus.style.color = '#34724e';
    window.open(`https://wa.me/393336063849?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  });

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

})();
