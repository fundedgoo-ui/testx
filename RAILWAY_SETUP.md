# Ghid Configurare Railway - FundedGoo

Acest document explică cum să muți aplicația de pe AI Studio pe Railway și cum să configurezi bazele de date (Firestore și PostgreSQL).

## 1. Pregătire GitHub & Railway
1. **Push pe GitHub**: Folosește opțiunea "Export to GitHub" din meniul AI Studio (Settings).
2. **Conectare Railway**: Mergi pe [railway.app](https://railway.app), loghează-te cu GitHub și alege "New Project" -> "Deploy from GitHub repo".
3. **Setări Build**: Railway va detecta automat `package.json`. Asigură-te că portul este setat pe `3000`.

---

## 2. Configurare Firestore (Firebase) pe Railway

Deoarece Firestore este un serviciu extern (Google), nu îl vei "instala" pe Railway, ci vei conecta aplicația ta la proiectul existent folosind **Environment Variables**.

### Pași:
1. Mergi în **Firebase Console** -> Project Settings -> **Service Accounts**.
2. Apasă pe **"Generate New Private Key"**. Se va descărca un fișier `.json`.
3. Deschide acel fișier și copiază tot conținutul (este un obiect JSON).
4. În Railway, mergi la tab-ul **Variables** și adaugă:
   - `FIREBASE_SERVICE_ACCOUNT`: (Paste la tot conținutul JSON-ului de mai sus)
   - `STRIPE_SECRET_KEY`: (Cheia ta SECRETĂ de la Stripe, începe cu `sk_...`)
   - `ENCRYPTION_KEY`: (Cheie secretă pentru criptare. DACĂ AI SALVAT CHEI ÎN ADMIN PANEL PE AI STUDIO, folosește aceeași cheie și aici!)
   - `DATABASE_URL`: (Se generează automat dacă adaugi PostgreSQL în Railway)
   - `VITE_FIREBASE_API_KEY`: (Din Firebase Console -> Settings -> General -> Web App Config)
   - `VITE_FIREBASE_AUTH_DOMAIN`: (Din Firebase Console)
   - `VITE_FIREBASE_PROJECT_ID`: (Din Firebase Console)
   - `VITE_FIREBASE_STORAGE_BUCKET`: (Din Firebase Console)
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: (Din Firebase Console)
   - `VITE_FIREBASE_APP_ID`: (Din Firebase Console)
   - `SMTP_HOST`: (ex: smtp.gmail.com)
   - `SMTP_PORT`: (ex: 587)
   - `SMTP_USER`: (email-ul de pe care trimiți)
   - `SMTP_PASS`: (parola de aplicație pentru email)
   - `APP_URL`: (URL-ul tău de pe Railway, ex: https://proiectul-tau.up.railway.app)

---

## 3. Configurare PostgreSQL pe Railway

Codul serverului este deja configurat să folosească variabila `DATABASE_URL` (pe care Railway o injectează automat după ce adaugi baza de date). Tabelele necesare (`sql_transactions`, `sql_user_verifications`, etc.) sunt create automat de server la pornire.

1. În proiectul tău Railway, apasă pe **"Add"** -> **"Database"** -> **"Add PostgreSQL"**.

---

## 4. Email de Confirmare (Custom Flow)
Am adăugat suport pentru trimiterea de email-uri de confirmare folosind PostgreSQL pentru stocarea token-urilor:
- Endpoint-ul `/api/auth/send-verification` (POST) generează un token și trimite email.
- Endpoint-ul `/api/auth/verify-email` (GET) confirmă token-ul în baza de date SQL.

## 5. !!! CRITIC - CONFIGURARE OBLIGATORIE FIREBASE (EVITARE ERORI AUTH/PERMISSION) !!!

PENTRU CA APLICAȚIA SĂ FUNCȚIONEZE CORECT ȘI SĂ NU AI ERORI LA LOGIN SAU PERMISIUNI, URMEAZĂ ACEȘTI PAȘI ÎN CONSOLA FIREBASE:

### A. ACTIVARE LOGIN (AUTH ERROR: OPERATION-NOT-ALLOWED)
1. MERGI ÎN **FIREBASE CONSOLE** -> **AUTHENTICATION** -> **SIGN-IN METHOD**.
2. APASĂ PE **ADD NEW PROVIDER**.
3. ALEGE **EMAIL/PASSWORD** ȘI DĂ-I **ENABLE**. 
   - *FĂRĂ ACEST PAS, NIMENI NU SE POATE LOGA SAU ÎNREGISTRA!*

### B. CONFIGURARE FIRESTORE RULES (PERMISSION DENIED)
1. COPIAZĂ TOT CONȚINUTUL FIȘIERULUI `firestore.rules` DIN ACEST PROIECT.
2. MERGI ÎN **FIREBASE CONSOLE** -> **FIRESTORE DATABASE** -> TAB-UL **RULES**.
3. ȘTERGE CE E ACOLO ȘI DĂ **PASTE** LA CODUL DIN PROIECT.
4. APASĂ **PUBLISH**.
   - *REGULILE DIN ACEST PROIECT INCLUD HARDCODĂRI PENTRU ADMIN (admin@prop.com), FĂRĂ ELE NU VEI PUTEA ACCESA BAZA DE DATE!*

### C. ADĂUGARE ADMIN MANUAL (DACĂ ESTE NEVOIE)
DACĂ TE-AI LOGAT CU UN ALT EMAIL ȘI VREI ACCES TOTAL:
1. MERGI ÎN **FIRESTORE DATABASE** -> **DATA**.
2. CREEAZĂ O COLECȚIE NOUĂ NUMITĂ `admins`.
3. ADĂUGĂ UN DOCUMENT ÎN EA UNDE **DOCUMENT ID** ESTE `USER_ID`-UL TĂU (ÎL GĂSEȘTI ÎN TAB-UL AUTHENTICATION).
4. LASĂ DOCUMENTUL GOL, EXISTENȚA LUI E SUFICIENTĂ PENTRU PERMISIUNI DE ADMIN.

---

## 6. Fluxul de lucru (CD)
- Ori de câte ori faci `git push` în repo-ul tău de GitHub, Railway va vedea schimbarea și va re-deploy-a automat aplicația (Continuous Deployment).
- Nu uita să adaugi variabilele de mediu în Railway înainte de primul deploy reușit!
