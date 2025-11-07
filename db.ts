import { Product, StockEntry, StockExit } from './types';

// IMPORTANTE: TROQUE PELA URL DA SUA API PUBLICADA NA VERCEL!
const API_BASE_URL = 'https://sua-api-na-vercel.vercel.app/api'; 

type StoreName = 'products' | 'entries' | 'exits';
type StoreType = Product | StockEntry | StockExit;

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

export const getAll = async <T extends StoreType>(storeName: StoreName): Promise<T[]> => {
  const response = await fetch(`${API_BASE_URL}/${storeName}`);
  return handleResponse(response);
};

export const add = async (storeName: StoreName, item: Omit<StoreType, 'id'>): Promise<StoreType> => {
  const response = await fetch(`${API_BASE_URL}/${storeName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });
  return handleResponse(response);
};

export const update = async (storeName: 'products', item: Product): Promise<Product> => {
  // Omit 'id' from the body for some backend conventions, but pass it in the URL
  const { id, ...updateData } = item;
  const response = await fetch(`${API_BASE_URL}/${storeName}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  return handleResponse(response);
};

export const deleteItem = async (storeName: StoreName, id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/${storeName}/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(response);
};