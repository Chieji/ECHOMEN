import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { getSecureItem } from "./secureStorage";

/**
 * ECHO Firebase Memory Manager
 *
 * Provides persistent, cross-session long-term memory for ECHO agents.
 * Powered by Google Firebase Firestore.
 */

let db: any = null;

const initializeFirebase = async () => {
    if (db) return db;

    try {
        const firebaseConfigStr = await getSecureItem('firebase-config');
        if (!firebaseConfigStr) {
            console.warn("Firebase not configured. Memories will be local-only.");
            return null;
        }

        const config = JSON.parse(firebaseConfigStr);
        const app = initializeApp(config);
        db = getFirestore(app);
        return db;
    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        return null;
    }
};

/**
 * Save a memory item to Firestore.
 */
export const saveMemory = async (key: string, value: string, tags: string[] = []): Promise<string> => {
    const firestore = await initializeFirebase();
    if (!firestore) {
        // Fallback to localStorage if Firebase isn't ready
        localStorage.setItem(`echo_mem_${key}`, JSON.stringify({ value, tags, timestamp: Date.now() }));
        return `Memory '${key}' saved locally (Firebase not connected).`;
    }

    try {
        const memoriesRef = collection(firestore, "memories");
        const docRef = await addDoc(memoriesRef, {
            key,
            value,
            tags,
            timestamp: new Date().toISOString()
        });
        return `Memory '${key}' saved to Cloud Brain (Doc ID: ${docRef.id}).`;
    } catch (error) {
        console.error("Error saving memory:", error);
        throw new Error("Failed to save memory to Cloud Brain.");
    }
};

/**
 * Retrieve memory items by key or tags.
 */
export const retrieveMemory = async (key?: string, tags: string[] = []): Promise<any[]> => {
    const firestore = await initializeFirebase();
    if (!firestore) {
        if (key) {
            const local = localStorage.getItem(`echo_mem_${key}`);
            return local ? [JSON.parse(local)] : [];
        }
        return [];
    }

    try {
        const memoriesRef = collection(firestore, "memories");
        let q;
        if (key) {
            q = query(memoriesRef, where("key", "==", key));
        } else if (tags.length > 0) {
            q = query(memoriesRef, where("tags", "array-contains-any", tags));
        } else {
            return [];
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error retrieving memory:", error);
        return [];
    }
};

/**
 * Delete a memory item by key.
 */
export const deleteMemory = async (key: string): Promise<string> => {
    const firestore = await initializeFirebase();
    if (!firestore) {
        localStorage.removeItem(`echo_mem_${key}`);
        return `Memory '${key}' deleted locally.`;
    }

    try {
        const memoriesRef = collection(firestore, "memories");
        const q = query(memoriesRef, where("key", "==", key));
        const querySnapshot = await getDocs(q);
        
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(firestore, "memories", d.id)));
        await Promise.all(deletePromises);
        
        return `Memory '${key}' deleted from Cloud Brain.`;
    } catch (error) {
        console.error("Error deleting memory:", error);
        throw new Error("Failed to delete memory.");
    }
};
