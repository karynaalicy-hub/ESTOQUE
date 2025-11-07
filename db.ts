import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from './firebaseConfig';
import { Product, StockEntry, StockExit } from './types';

type StoreName = 'products' | 'entries' | 'exits';
type StoreType = Product | StockEntry | StockExit;

export const getAll = async <T extends {id: string}>(storeName: StoreName): Promise<T[]> => {
  try {
    const collRef = collection(db, storeName);
    let q = query(collRef);

    // Ordena os resultados para uma exibição consistente
    if (storeName === 'entries' || storeName === 'exits') {
        q = query(collRef, orderBy('date', 'desc'));
    } else if (storeName === 'products') {
        q = query(collRef, orderBy('name'));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
  } catch (error: any) {
    console.error(`Erro ao buscar dados de '${storeName}':`, error);
    // Adiciona uma verificação para orientar o usuário em caso de erro de configuração
    if (error.code === 'failed-precondition' || error.message.includes('API key') || error.message.includes('permission-denied')) {
        throw new Error("Falha na conexão com o Firebase. Verifique se você preencheu corretamente o arquivo firebaseConfig.ts com as suas credenciais e se as regras de segurança do Firestore permitem leitura e escrita.");
    }
    throw error; // Propaga outros erros
  }
};

export const add = async (storeName: StoreName, item: Omit<StoreType, 'id'>): Promise<StoreType> => {
  const docRef = await addDoc(collection(db, storeName), item);
  // O Firestore não retorna o objeto, então nós o construímos com o novo ID.
  return { ...item, id: docRef.id } as StoreType;
};

export const update = async (storeName: 'products', item: Product): Promise<Product> => {
  const { id, ...updateData } = item;
  if (!id) throw new Error("O ID do documento é necessário para a atualização.");
  const docRef = doc(db, storeName, id);
  await updateDoc(docRef, updateData as Partial<Product>);
  return item; // Retorna o item atualizado, como o aplicativo espera
};

export const deleteItem = async (storeName: StoreName, id: string): Promise<void> => {
   if (!id) throw new Error("O ID do documento é necessário para a exclusão.");
   const docRef = doc(db, storeName, id);
   await deleteDoc(docRef);
};
