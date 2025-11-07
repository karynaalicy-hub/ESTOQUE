import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  writeBatch,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from './firebaseConfig';
import { Product, StockEntry, StockExit, UserProfile } from './types';

type StoreName = 'products' | 'entries' | 'exits' | 'userProfiles';
type StoreType = Product | StockEntry | StockExit | UserProfile;

const getCollectionRef = (userId: string, storeName: StoreName) => {
    if (!userId && storeName !== 'userProfiles') throw new Error("ID do usuário é necessário para operações de banco de dados.");
    
    if (storeName === 'userProfiles') {
        return collection(db, 'userProfiles');
    }
    return collection(db, 'users', userId, storeName);
}

export const getUserProfile = async (userId: string, email: string): Promise<UserProfile> => {
    const userDocRef = doc(db, 'userProfiles', userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        return userDocSnap.data() as UserProfile;
    } else {
        // Cria um novo perfil se não existir
        const newUserProfile: UserProfile = {
            id: userId,
            email: email,
            isAdmin: false, // Padrão é não ser admin
        };
        await setDoc(userDocRef, newUserProfile);
        return newUserProfile;
    }
};

export const getAll = async <T extends {id: string}>(userId: string, storeName: StoreName): Promise<T[]> => {
  try {
    const collRef = getCollectionRef(userId, storeName);
    let q = query(collRef);

    if (storeName === 'entries' || storeName === 'exits') {
        q = query(collRef, orderBy('date', 'desc'));
    } else if (storeName === 'products') {
        q = query(collRef, orderBy('name'));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
  } catch (error: any) {
    console.error(`Erro ao buscar dados de '${storeName}' para o usuário ${userId}:`, error);
    if (error.code === 'failed-precondition' || error.message.includes('API key') || error.code === 'permission-denied') {
        throw new Error("Falha na conexão com o Firebase. Verifique suas credenciais e se as regras de segurança do Firestore permitem que usuários acessem seus próprios dados (ex: allow read, write: if request.auth.uid == userId;).");
    }
    throw error;
  }
};

export const add = async (userId: string, storeName: StoreName, item: Omit<StoreType, 'id'>): Promise<StoreType> => {
  const collRef = getCollectionRef(userId, storeName);
  const docRef = await addDoc(collRef, item);
  return { ...item, id: docRef.id } as StoreType;
};

export const update = async <T extends StoreType>(
  userId: string, 
  storeName: StoreName, 
  id: string,
  updateData: Partial<Omit<T, 'id'>>
): Promise<Partial<Omit<T, 'id'>>> => {
  if (!id) throw new Error("O ID do documento é necessário para a atualização.");
  const docRef = doc(db, 'users', userId, storeName, id);
  await updateDoc(docRef, updateData as any); // Usar 'any' aqui é uma concessão pragmática para a genericidade
  return updateData;
};


export const deleteItem = async (userId: string, storeName: StoreName, id: string): Promise<void> => {
   if (!id) throw new Error("O ID do documento é necessário para a exclusão.");
   const docRef = doc(db, 'users', userId, storeName, id);
   await deleteDoc(docRef);
};

export const addMultiple = async <T extends Omit<StoreType, 'id'>>(
    userId: string,
    storeName: StoreName,
    items: T[]
): Promise<(T & { id: string })[]> => {
    const collRef = getCollectionRef(userId, storeName);
    const batch = writeBatch(db);
    const newItems: (T & { id: string })[] = [];

    for (const item of items) {
        const docRef = doc(collRef); // Gera um novo ID automaticamente
        batch.set(docRef, item);
        newItems.push({ ...item, id: docRef.id });
    }

    await batch.commit();
    return newItems;
};

export const deleteProductAndRelatedData = async (
    userId: string,
    productId: string,
    entriesToDelete: StockEntry[],
    exitsToDelete: StockExit[]
) => {
    const batch = writeBatch(db);

    // Deletar produto
    const productRef = doc(db, 'users', userId, 'products', productId);
    batch.delete(productRef);

    // Deletar entradas
    for (const entry of entriesToDelete) {
        const entryRef = doc(db, 'users', userId, 'entries', entry.id);
        batch.delete(entryRef);
    }

    // Deletar saídas
    for (const exit of exitsToDelete) {
        const exitRef = doc(db, 'users', userId, 'exits', exit.id);
        batch.delete(exitRef);
    }

    await batch.commit();
};
