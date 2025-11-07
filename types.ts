
export interface Product {
  id: string;
  name: string;
  unit: string;
  minStock: number;
  price: number;
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

export type Tab = 'products' | 'entries' | 'exits' | 'stock-control' | 'reports';