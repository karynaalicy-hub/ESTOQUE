import React, { useMemo } from 'react';
import { Product, StockEntry, StockExit } from '../types';
import { DollarSign, AlertTriangle, Archive, Package, Download } from 'lucide-react';

interface ReportsProps {
  products: Product[];
  entries: StockEntry[];
  exits: StockExit[];
}

interface ReportData {
  totalStockValue: number;
  lowStockCount: number;
  totalItemsInStock: number;
  productDiversity: number;
  lowStockProducts: (Product & { balance: number })[];
  mostMovedProducts: (Product & { totalExits: number })[];
}

const Reports: React.FC<ReportsProps> = ({ products, entries, exits }) => {
  const reportData: ReportData = useMemo(() => {
    let totalStockValue = 0;
    let lowStockCount = 0;
    let totalItemsInStock = 0;
    const productDiversity = products.length;

    const stockCalculations = products.map(product => {
      const totalEntries = entries
        .filter(e => e.productId === product.id)
        .reduce((sum, e) => sum + e.quantity, 0);

      const totalExits = exits
        .filter(e => e.productId === product.id)
        .reduce((sum, e) => sum + e.quantity, 0);
      
      const balance = totalEntries - totalExits;
      
      totalStockValue += balance * product.price;
      totalItemsInStock += balance;

      if (balance <= product.minStock) {
        lowStockCount++;
      }
      
      return { ...product, balance, totalExits };
    });

    const lowStockProducts = stockCalculations
      .filter(p => p.balance <= p.minStock)
      .sort((a,b) => a.name.localeCompare(b.name));

    const mostMovedProducts = [...stockCalculations]
      .sort((a, b) => b.totalExits - a.totalExits)
      .slice(0, 5);

    return { 
      totalStockValue, 
      lowStockCount, 
      totalItemsInStock,
      productDiversity,
      lowStockProducts,
      mostMovedProducts,
     };
  }, [products, entries, exits]);

  const handleExport = (data: any[], headers: { key: string, label: string }[], fileName: string) => {
    const formatValue = (value: any) => {
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerRow = headers.map(h => h.label).join(',');
    const dataRows = data.map(row =>
      headers.map(h => formatValue(row[h.key])).join(',')
    );

    const csvContent = [headerRow, ...dataRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportProducts = () => {
    const headers = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nome do Produto' },
      { key: 'unit', label: 'Unidade' },
      { key: 'minStock', label: 'Estoque Mínimo' },
      { key: 'price', label: 'Preço (R$)' },
    ];
    handleExport(products, headers, 'produtos.csv');
  };

  const exportEntries = () => {
    const dataToExport = entries.map(entry => ({
      ...entry,
      productName: products.find(p => p.id === entry.productId)?.name || 'N/A',
    }));
    const headers = [
      { key: 'id', label: 'ID da Entrada' },
      { key: 'date', label: 'Data' },
      { key: 'productName', label: 'Produto' },
      { key: 'supplier', label: 'Fornecedor' },
      { key: 'quantity', label: 'Quantidade' },
      { key: 'productId', label: 'ID do Produto' },
    ];
    handleExport(dataToExport, headers, 'entradas.csv');
  };

  const exportExits = () => {
    const dataToExport = exits.map(exit => ({
      ...exit,
      productName: products.find(p => p.id === exit.productId)?.name || 'N/A',
    }));
    const headers = [
      { key: 'id', label: 'ID da Saída' },
      { key: 'date', label: 'Data' },
      { key: 'productName', label: 'Produto' },
      { key: 'quantity', label: 'Quantidade' },
      { key: 'productId', label: 'ID do Produto' },
    ];
    handleExport(dataToExport, headers, 'saidas.csv');
  };
  
  const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number, color: string }> = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-start">
        <div className={`p-3 rounded-full mr-4 ${color}`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Relatório de Estoque</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                icon={DollarSign} 
                title="Valor Total do Estoque" 
                value={reportData.totalStockValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                color="bg-green-500"
            />
            <StatCard 
                icon={AlertTriangle} 
                title="Produtos com Estoque Baixo" 
                value={reportData.lowStockCount} 
                color="bg-red-500"
            />
            <StatCard 
                icon={Archive} 
                title="Total de Itens em Estoque" 
                value={reportData.totalItemsInStock} 
                color="bg-blue-500"
            />
            <StatCard 
                icon={Package} 
                title="Diversidade de Produtos" 
                value={reportData.productDiversity} 
                color="bg-brand-500"
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <h3 className="text-lg font-bold p-6 text-gray-900 dark:text-white">Alerta de Estoque Baixo</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Produto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Saldo Atual</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estoque Mín.</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {reportData.lowStockProducts.length > 0 ? reportData.lowStockProducts.map(p => (
                                <tr key={p.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-400">{p.balance}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{p.minStock}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Nenhum produto com estoque baixo.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <h3 className="text-lg font-bold p-6 text-gray-900 dark:text-white">Top 5 Produtos Mais Movimentados (por saídas)</h3>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Produto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total de Saídas</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                           {reportData.mostMovedProducts.filter(p => p.totalExits > 0).length > 0 ? reportData.mostMovedProducts.filter(p => p.totalExits > 0).map(p => (
                                <tr key={p.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-gray-200">{p.totalExits}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma saída registrada ainda.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Exportar Dados</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Faça o download dos dados do seu inventário em formato CSV para análise externa ou backup.
          </p>
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
            <button
              onClick={exportProducts}
              className="flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-brand-600 bg-brand-100 hover:bg-brand-200 dark:text-brand-300 dark:bg-brand-900/50 dark:hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-gray-800"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Produtos
            </button>
            <button
              onClick={exportEntries}
              className="flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-brand-600 bg-brand-100 hover:bg-brand-200 dark:text-brand-300 dark:bg-brand-900/50 dark:hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-gray-800"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Entradas
            </button>
            <button
              onClick={exportExits}
              className="flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-brand-600 bg-brand-100 hover:bg-brand-200 dark:text-brand-300 dark:bg-brand-900/50 dark:hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-gray-800"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Saídas
            </button>
          </div>
        </div>
    </div>
  );
};

export default Reports;