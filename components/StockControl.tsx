import React, { useMemo, useState } from 'react';
import { Product, StockEntry, StockExit } from '../types';
import { ChevronUp, ChevronDown, History, Search } from 'lucide-react';
import HistoryModal from './HistoryModal';

interface StockControlProps {
  products: Product[];
  entries: StockEntry[];
  exits: StockExit[];
}

type SortKey = 'name' | 'balance' | 'status';
type SortDirection = 'ascending' | 'descending';

type ProcessedProduct = Product & {
    totalEntries: number;
    totalExits: number;
    balance: number;
}

const StockControl: React.FC<StockControlProps> = ({ products, entries, exits }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'ascending' });
  const [filterStatus, setFilterStatus] = useState<'all' | 'ok' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyModalProduct, setHistoryModalProduct] = useState<ProcessedProduct | null>(null);

  const processedData = useMemo(() => {
    let stockData: ProcessedProduct[] = products.map(product => {
      const totalEntries = entries
        .filter(e => e.productId === product.id)
        .reduce((sum, e) => sum + e.quantity, 0);

      const totalExits = exits
        .filter(e => e.productId === product.id)
        .reduce((sum, e) => sum + e.quantity, 0);

      const balance = totalEntries - totalExits;

      return {
        ...product,
        totalEntries,
        totalExits,
        balance,
      };
    });
    
    // Apply search query
    if (searchQuery) {
        stockData = stockData.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // Apply filtering
    if (filterStatus !== 'all') {
      stockData = stockData.filter(item => {
        const isLowStock = item.balance <= item.minStock;
        if (filterStatus === 'low') return isLowStock;
        if (filterStatus === 'ok') return !isLowStock;
        return true;
      });
    }
    
    // Apply sorting
    stockData.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortConfig.key === 'status') {
          aValue = a.balance <= a.minStock ? 1 : 0; // Low stock = 1, OK = 0
          bValue = b.balance <= b.minStock ? 1 : 0;
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (aValue.toLowerCase() < bValue.toLowerCase()) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue.toLowerCase() > bValue.toLowerCase()) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
      }
      return 0;
    });

    return stockData;
  }, [products, entries, exits, sortConfig, filterStatus, searchQuery]);
  
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return null;
    }
    if (sortConfig.direction === 'ascending') {
      return <ChevronUp className="h-4 w-4 inline-block ml-1" />;
    }
    return <ChevronDown className="h-4 w-4 inline-block ml-1" />;
  };

  const FilterButton: React.FC<{ status: 'all' | 'ok' | 'low'; label: string }> = ({ status, label }) => {
    const isActive = filterStatus === status;
    const baseClasses = "px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-brand-500 transition-colors";
    const activeClasses = "bg-brand-600 text-white";
    const inactiveClasses = "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600";
    return (
        <button onClick={() => setFilterStatus(status)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            {label}
        </button>
    )
  }

  return (
    <>
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-wrap">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Controle de Estoque</h2>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
                type="text"
                placeholder="Buscar produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
        </div>
        <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Filtrar:</span>
            <FilterButton status="all" label="Todos" />
            <FilterButton status="ok" label="OK" />
            <FilterButton status="low" label="Estoque Baixo" />
        </div>
      </div>
       <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('name')}>
                  Produto {getSortIcon('name')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Entradas</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Saídas</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('balance')}>
                  Saldo {getSortIcon('balance')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estoque Mín.</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('status')}>
                  Status {getSortIcon('status')}
                </th>
                 <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Histórico
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {processedData.length > 0 ? processedData.map(item => {
                const isLowStock = item.balance <= item.minStock;
                return (
                  <tr key={item.id} className={isLowStock ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">{item.totalEntries}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">{item.totalExits}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{item.balance}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.minStock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isLowStock ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-200">
                          Estoque Baixo
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-200">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button 
                            onClick={() => setHistoryModalProduct(item)}
                            className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                            aria-label={`Ver histórico de ${item.name}`}
                        >
                            <History className="h-5 w-5" />
                        </button>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {products.length === 0 ? "Nenhum produto para exibir. Adicione produtos na aba 'Produtos'." : "Nenhum produto corresponde à busca ou ao filtro selecionado."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
    </div>
    {historyModalProduct && (
        <HistoryModal
            product={historyModalProduct}
            entries={entries}
            exits={exits}
            onClose={() => setHistoryModalProduct(null)}
        />
    )}
    </>
  );
};

export default StockControl;