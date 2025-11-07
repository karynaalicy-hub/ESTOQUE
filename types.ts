
export interface Product {
  id: string;
  name: string;
  unit: string;
  minStock: number;
  price: number;
  consumptionUnit?: string;
  consumptionRate?: number;
}

export interface StockEntry {
  id: string;
  date: string;
  productId: string;
  supplier: string;
  quantity: number;
}

export interface StockExit {
  id: string;
  date: string;
  productId: string;
  quantity: number;
}

export interface UserProfile {
  id: string;
  email: string;
  isAdmin: boolean;
}

export type Tab = 'products' | 'entries' | 'exits' | 'stock-control' | 'reports' | 'consumption';

export type EditableEntry = Partial<Omit<StockEntry, 'id'>>;
export type EditableExit = Partial<Omit<StockExit, 'id'>>;
