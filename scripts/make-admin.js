const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDK'yı initialize et
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function makeUserAdmin(email) {
  try {
    // Kullanıcıyı email ile bul
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;
    
    // Firestore'da kullanıcı dokümantını güncelle
    await db.collection('users').doc(uid).update({
      role: 'ADMIN'
    });
    
    console.log(`✅ Kullanıcı ${email} ADMIN rolüne yükseltildi`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

// Komut satırından email al
const email = process.argv[2];
if (!email) {
  console.error('❌ Kullanım: node make-admin.js email@example.com');
  process.exit(1);
}

makeUserAdmin(email);