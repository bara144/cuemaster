
import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  CACHE_SIZE_UNLIMITED,
  doc, 
  setDoc, 
  updateDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  arrayUnion
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBAqbOtXhlau7z1cZej-jhqYvOgt64oTYY",
  authDomain: "play-center-001.firebaseapp.com",
  projectId: "play-center-001",
  storageBucket: "play-center-001.firebasestorage.app",
  messagingSenderId: "41481926722",
  appId: "1:41481926722:web:e5aa0c8762240e16b995db",
  measurementId: "G-Z6RJ524JJS"
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  })
});

/**
 * Compresses an image to a very small Base64 string for Firestore compatibility.
 * Resolution: max 400px, Quality: 0.5
 */
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; 
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Use JPEG 0.5 for aggressive size reduction
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
    };
  });
};

const sanitizeData = (obj: any, seen = new WeakSet()): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (seen.has(obj)) return '[Circular]';
  if (obj instanceof Timestamp) return obj.toMillis();
  if (obj instanceof Date) return obj.getTime();
  seen.add(obj);
  if (Array.isArray(obj)) return obj.map(item => sanitizeData(item, seen));
  const cleaned: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val !== undefined) cleaned[key] = sanitizeData(val, seen);
    }
  }
  return cleaned;
};

/**
 * Global sync helper. ALWAYS uses serverTimestamp metadata to ensure consistency.
 */
export const syncToCloud = async (collectionName: string, data: any, hallId?: string) => {
  if (!db) return;
  try {
    const path = hallId && hallId !== 'MAIN' 
      ? `halls/${hallId}/data/${collectionName}` 
      : `billiard_hall/${collectionName}`;
    
    const docRef = doc(db, path);
    const cleanData = sanitizeData(data);
    
    await setDoc(docRef, { 
      data: cleanData, 
      updatedAt: serverTimestamp(), // Avoids device-time future errors
      hallReference: hallId || 'MAIN'
    }, { merge: true });
  } catch (error) {
    console.error("Sync Error:", error);
  }
};

/**
 * Atomic update using arrayUnion. Ensures items are added without risk of deleting existing ones.
 */
export const updateHallDataAtomic = async (collectionName: string, itemToAdd: any, hallId: string) => {
  if (!db || !hallId) return;
  try {
    const path = hallId === 'MAIN' ? `billiard_hall/${collectionName}` : `halls/${hallId}/data/${collectionName}`;
    const docRef = doc(db, path);
    const cleanedItem = sanitizeData(itemToAdd);
    
    await updateDoc(docRef, {
      data: arrayUnion(cleanedItem),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    // Document might not exist, initialize it
    await syncToCloud(collectionName, [itemToAdd], hallId);
  }
};

export const subscribeToCloudData = (collectionName: string, callback: (data: any) => void, hallId?: string) => {
  if (!db) return () => {};
  const path = hallId && hallId !== 'MAIN' 
    ? `halls/${hallId}/data/${collectionName}` 
    : `billiard_hall/${collectionName}`;
  const docRef = doc(db, path);
  
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data().data);
    }
  }, (error) => {
    // Quietly fail for unauthorized initial loads
  });
};
