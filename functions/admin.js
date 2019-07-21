// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccount.json')),  
    databaseURL: 'https://kanta-6f9f5.firebaseio.com'
  });
//fix timestamps for firestore
admin.firestore().settings({timestampsInSnapshots: true});
const db = admin.firestore();
const auth = admin.auth();
const messaging = admin.messaging();
const fieldValue = admin.firestore.FieldValue;

module.exports = { db, auth, messaging, fieldValue }
