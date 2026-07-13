import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
process.env.GOOGLE_CLOUD_PROJECT = config.projectId;

const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
const faApp = saVar ? admin.initializeApp({ credential: admin.credential.cert(JSON.parse(saVar)), projectId: config.projectId }) : admin.initializeApp({ projectId: config.projectId });

const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || config.firestoreDatabaseId || undefined;
const db = getFirestore(faApp, databaseId);

async function check() {
  const ref = db.collection('system').doc('competitionsList');
  const s = await ref.get();
  const data = s.data();
  if (data && data.list) {
    data.list.forEach((c: any) => {
       c.botsEnabled = true;
       c.botIntensityModifier = 5.0; // make them trade frequently
    });
    await ref.set(data);
    console.log("Updated competitions to botsEnabled");
  }
}
check();
