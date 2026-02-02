// import { initializeApp } from "firebase/app";
// import { getFirestore, doc, setDoc, onSnapshot, enableIndexedDbPersistence } from "firebase/firestore";

// // کلیلە ڕاستەقینەکانی تۆ کە ئێستا ناردت
// const firebaseConfig = {
//   apiKey: "AIzaSyBAqbOtXhlau7z1cZej-jhqYvOgt64oTYY",
//   authDomain: "play-center-001.firebaseapp.com",
//   projectId: "play-center-001",
//   storageBucket: "play-center-001.firebasestorage.app",
//   messagingSenderId: "41481926722",
//   appId: "1:41481926722:web:e5aa0c8762240e16b995db",
//   measurementId: "G-Z6RJ524JJS"
// };

// // دەستپێکردنی فایەربەیس
// const app = initializeApp(firebaseConfig);
// export const db = getFirestore(app);

// // ڕێگەدان بە کارکردن بەبێ ئینتەرنێت (Offline Support)
// enableIndexedDbPersistence(db).catch((err) => {
//   console.error("Firebase Persistence Error:", err.code);
// });

// /**
//  * سەیڤکردنی داتا بەپێی Hall ID
//  * ئەگەر hallId نەبوو، لە شوێنە گشتییەکە سەیڤ دەبێت
//  */
// export const syncToCloud = async (collectionName: string, data: any, hallId?: string) => {
//   if (!db) return;
//   try {
//     const path = hallId && hallId !== 'MAIN' 
//       ? `halls/${hallId}/data/${collectionName}` 
//       : `billiard_hall/${collectionName}`;
    
//     const docRef = doc(db, path);
//     await setDoc(docRef, { 
//       data, 
//       updatedAt: Date.now(),
//       hallReference: hallId || 'MAIN'
//     }, { merge: true });
    
//     console.log(`Synced ${collectionName} for ${hallId || 'Global'}`);
//   } catch (error) {
//     console.error("Sync Error:", error);
//   }
// };

// /**
//  * هێنانەوەی داتا (Real-time) بەپێی Hall ID
//  */
// export const subscribeToCloudData = (collectionName: string, callback: (data: any) => void, hallId?: string) => {
//   if (!db) return () => {};
  
//   const path = hallId && hallId !== 'MAIN' 
//     ? `halls/${hallId}/data/${collectionName}` 
//     : `billiard_hall/${collectionName}`;
    
//   const docRef = doc(db, path);
//   return onSnapshot(docRef, (snapshot) => {
//     if (snapshot.exists()) {
//       callback(snapshot.data().data);
//     }
//   }, (error) => {
//     console.error("Subscribe Error:", error);
//   });
// };

import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  CACHE_SIZE_UNLIMITED,
  doc, 
  setDoc, 
  onSnapshot 
} from "firebase/firestore";

// کلیلە ڕاستەقینەکانی تۆ کە ئێستا ناردت
const firebaseConfig = {
  apiKey: "AIzaSyBAqbOtXhlau7z1cZej-jhqYvOgt64oTYY",
  authDomain: "play-center-001.firebaseapp.com",
  projectId: "play-center-001",
  storageBucket: "play-center-001.firebasestorage.app",
  messagingSenderId: "41481926722",
  appId: "1:41481926722:web:e5aa0c8762240e16b995db",
  measurementId: "G-Z6RJ524JJS"
};

// دەستپێکردنی فایەربەیس
const app = initializeApp(firebaseConfig);

/**
 * ڕێکخستنی فایەستۆر بۆ ئەوەی داتاکان بە شێوەیەکی هەمیشەیی لەسەر ئامێرەکە بمێننەوە (Persistence)
 * بەکارهێنانی CACHE_SIZE_UNLIMITED بۆ ئەوەی مێژووی پارەدان و داتاکان هەرگیز نەسرێنەوە تەنانەت ئەگەر بێ ئینتەرنێتیش بێت
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  })
});

/**
 * سەیڤکردنی داتا بەپێی Hall ID
 * Firestore Persistence ڕێگە دەدات داتاکە یەکسەر لە ناوخۆدا پاشەکەوت بێت
 * و کاتێک ئینتەرنێت پەیوەست بووەوە خۆی سینک دەبێتەوە لەگەڵ سێرڤەر
 */
export const syncToCloud = async (collectionName: string, data: any, hallId?: string) => {
  if (!db) return;
  try {
    const path = hallId && hallId !== 'MAIN' 
      ? `halls/${hallId}/data/${collectionName}` 
      : `billiard_hall/${collectionName}`;
    
    const docRef = doc(db, path);
    
    // سەیڤکردنەکە یەکەمجار دەچێتە ناو کاشی ئۆفلاین (Offline Cache)
    await setDoc(docRef, { 
      data, 
      updatedAt: Date.now(),
      hallReference: hallId || 'MAIN'
    }, { merge: true });
    
    console.log(`Synced ${collectionName} for ${hallId || 'Global'} (Cached locally if offline)`);
  } catch (error) {
    console.error("Sync Error:", error);
  }
};

/**
 * هێنانەوەی داتا (Real-time) بەپێی Hall ID
 * ئەم مێتۆدە یەکسەر داتا لە کاشی ناوخۆییەوە دەهێنێت ئەگەر ئینتەرنێت نەبوو
 */
export const subscribeToCloudData = (collectionName: string, callback: (data: any) => void, hallId?: string) => {
  if (!db) return () => {};
  
  const path = hallId && hallId !== 'MAIN' 
    ? `halls/${hallId}/data/${collectionName}` 
    : `billiard_hall/${collectionName}`;
    
  const docRef = doc(db, path);
  
  // onSnapshot یەکسەر لە ئۆفلایندا کار دەکات ئەگەر داتای پاشەکەوتکراو هەبێت
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data().data);
    }
  }, (error) => {
    console.error("Subscribe Error:", error);
  });
};

