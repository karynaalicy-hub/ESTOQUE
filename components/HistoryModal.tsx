import React, { useMemo } from 'react';
import { Product, StockEntry, StockExit } from '../types';
import { X } from 'lucide-react';

interface HistoryModalProps {
  product: Product;
  entries: StockEntry[];
  exits: StockExit[];
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ product, entries, exits, onClose }) => {
  const { productEntries, productExits } = useMemo(() => {
    const sortedEntries = entries
      .filter(e => e.productId === product.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    const sortedExits = exits
      .filter(e => e.productId === product.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return { productEntries: sortedEntries, productExits: sortedExits };
  }, [product.id, entries, exits]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="history-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
            Histórico de Movimentação: <span className="text-brand-600 dark:text-brand-400">{product.name}</span>
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <main className="p-6 overflow-y-auto space-y-6">
          <div>
            <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200">Últimas 5 Entradas</h3>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fornecedor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {productEntries.length > 0 ? productEntries.map(entry => (
                    <tr key={entry.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.supplier}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold">+{entry.quantity}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma entrada registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200">Últimas 5 Saídas</h3>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {productExits.length > 0 ? productExits.map(exit => (
                    <tr key={exit.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(exit.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-semibold">-{exit.quantity}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={2} className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma saída registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HistoryModal;