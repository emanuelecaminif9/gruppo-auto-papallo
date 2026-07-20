GRUPPO AUTO PAPALLO – RESTYLING NOLEGGIO + PANNELLO PROTETTO

COSA CONTIENE QUESTA VERSIONE
- nuovo front-end nero, antracite, bianco e rosso coordinato al logo Papallo;
- hero con richiesta preventivo immediata;
- categorie: Noleggio Privati, Aziende, Professionisti, CHTEC e Veicoli Commerciali;
- sezione "Come funziona il noleggio";
- servizi configurabili e vantaggi;
- parco auto dinamico con ricerca, ordinamento e filtro per categoria;
- scheda dettagli auto con galleria fotografica;
- richiesta preventivo e appuntamento tramite WhatsApp;
- menu mobile completamente riscritto con sfondo cliccabile;
- pannello admin protetto per inserire, modificare ed eliminare i veicoli;
- selezione obbligatoria della categoria dal pannello admin.

AVVIO LOCALE
1. Apri il Terminale nella cartella.
2. Esegui: npm install --no-audit --no-fund
3. Esegui: cp .env.example .env
4. Esegui: npm start
5. Il Terminale mostra il link pubblico e il percorso del pannello riservato.

ACCESSO LOCALE PREDEFINITO
Email: admin@gruppoautopapallo.it
Password: Papallo123!
Queste credenziali servono solo per la prova locale e vanno cambiate prima della pubblicazione.

CATEGORIE NEL PANNELLO ADMIN
Quando inserisci o modifichi un veicolo devi scegliere una di queste categorie:
- Noleggio Privati
- Noleggio Aziende
- Noleggio Professionisti
- Noleggio CHTEC
- Noleggio Veicoli Commerciali

Il sito mostrerà automaticamente il veicolo nel filtro corretto.

CONFIGURAZIONE SICURA PER LA PUBBLICAZIONE
1. Scegli una password lunga e unica.
2. Genera l'hash:
   node generate-password-hash.js 'LA-TUA-PASSWORD-LUNGA'
3. Copia il risultato nella variabile ADMIN_PASSWORD_HASH su Render.
4. In produzione NON impostare ADMIN_PASSWORD.
5. Genera JWT_SECRET:
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
6. Imposta NODE_ENV=production.
7. Imposta PUBLIC_URL con il dominio HTTPS completo.
8. Imposta ADMIN_PATH con un percorso riservato, per esempio:
   gestione-papallo-9x7k

VARIABILI RENDER
NODE_ENV=production
PUBLIC_URL=https://tuo-servizio.onrender.com
ADMIN_PATH=gestione-papallo-9x7k
ADMIN_EMAIL=admin@gruppoautopapallo.it
ADMIN_PASSWORD_HASH=HASH_BCRYPT_GENERATO
JWT_SECRET=CHIAVE_LUNGA_GENERATA
STORAGE_DIR=/var/data   (solo se è collegato il disco persistente)

COMANDI RENDER
Build Command: npm install
Start Command: npm start

DATI E FOTO
- dati dei veicoli: data/vehicles.json
- fotografie: uploads/
- con STORAGE_DIR=/var/data: /var/data/data/vehicles.json e /var/data/uploads/

Per la consegna reale al cliente è necessario usare un disco persistente oppure un database/storage esterno. Sul filesystem temporaneo del piano gratuito, nuovi veicoli e foto caricati dall'admin possono andare persi dopo deploy o riavvii.

PROTEZIONI PRESENTI
- password bcrypt;
- cookie HttpOnly, Secure e SameSite Strict;
- sessione con scadenza dopo 4 ore;
- rate limiting del login;
- controllo origine delle richieste amministrative;
- pannello escluso dall'indicizzazione;
- API amministrative protette lato server;
- Helmet e Content Security Policy;
- verifica reale di JPEG, PNG e WEBP;
- massimo 10 foto per veicolo, 6 MB ciascuna;
- scrittura atomica del database JSON.

AGGIORNAMENTO SU GITHUB E RENDER
Dopo aver sostituito i file nella cartella collegata al repository:

git add .
git commit -m "Restyling noleggio Gruppo Auto Papallo"
git push

Render avvierà automaticamente il nuovo deploy. In caso contrario:
Manual Deploy > Deploy latest commit.
