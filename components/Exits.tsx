import React, { useState } from 'react';
import { Product, StockExit } from '../types';
import { MinusCircle } from 'lucide-react';

interface ExitsProps {
  products: Product[];
  exits: StockExit[];
  addExit: (exit: Omit<StockExit, 'id'>) => void;
}

const Exits: React.FC<ExitsProps> = ({ products, exits, addExit }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date && productId && quantity > 0) {
      addExit({ date, productId, quantity });
      setProductId('');
      setQuantity(1);
    }
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Produto Desconhecido';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center"><MinusCircle className="mr-2 h-6 w-6 text-red-500" /> Registrar Saída de Estoque</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data da Saída</label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label htmlFor="product" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Produto</label>
              <select
                id="product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Selecione um produto</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade</label>
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                min="1"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              type="submit"
              disabled={products.length === 0}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:bg-gray-400 dark:focus:ring-offset-gray-800"
            >
              Registrar Saída
            </button>
            {products.length === 0 && <p className="text-xs text-center text-red-500 mt-2">Por favor, adicione um produto primeiro.</p>}
          </form>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <h2 className="text-xl font-bold p-6 text-gray-900 dark:text-white">Histórico de Saídas</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Produto</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {exits.length > 0 ? exits.map(exit => (
                    <tr key={exit.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(exit.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{getProductName(exit.productId)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-semibold">-{exit.quantity}</td>
                    </tr>
                  )): (
                     <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma saída registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exits;