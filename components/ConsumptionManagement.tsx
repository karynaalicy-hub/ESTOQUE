import React, { useMemo } from 'react';
import { Product, StockExit } from '../types';
import { Target } from 'lucide-react';

interface ConsumptionManagementProps {
  products: Product[];
  exits: StockExit[];
  monthlyForecast: number;
  setMonthlyForecast: (value: number) => void;
}

const ConsumptionManagement: React.FC<ConsumptionManagementProps> = ({ products, exits, monthlyForecast, setMonthlyForecast }) => {
  const consumptionData = useMemo(() => {
    const relevantProducts = products.filter(p => p.consumptionUnit && p.consumptionRate && p.consumptionRate > 0);
    
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const exitsLast30Days = exits.filter(e => e.date >= thirtyDaysAgoStr);

    return relevantProducts.map(product => {
      const plannedConsumption = monthlyForecast * product.consumptionRate!;
      
      const actualConsumption = exitsLast30Days
        .filter(e => e.productId === product.id)
        .reduce((sum, e) => sum + e.quantity, 0);

      const balance = plannedConsumption - actualConsumption;
      const consumptionPercentage = plannedConsumption > 0 ? (actualConsumption / plannedConsumption) * 100 : 0;

      return {
        ...product,
        plannedConsumption,
        actualConsumption,
        balance,
        consumptionPercentage,
      };
    });
  }, [products, exits, monthlyForecast]);

  const ProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => {
    const safePercentage = Math.min(percentage, 100);
    let barColor = 'bg-green-500';
    if (percentage > 100) {
      barColor = 'bg-red-500';
    } else if (percentage > 80) {
      barColor = 'bg-yellow-500';
    }

    return (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div className={`h-4 rounded-full ${barColor}`} style={{ width: `${safePercentage}%` }}></div>
        </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
            <Target className="mr-2 h-6 w-6 text-brand-500" /> Configuração de Previsão Mensal
        </h2>
        <div className="max-w-sm">
          <label htmlFor="monthly-forecast" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Previsão de Atendimentos/Produção (para os próximos 30 dias)
          </label>
          <input
            type="number"
            id="monthly-forecast"
            value={monthlyForecast}
            onChange={(e) => setMonthlyForecast(Number(e.target.value))}
            min="0"
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Ex: 500"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Insira o número total da sua "Unidade de Consumo" (ex: pacientes, procedimentos) previsto para o período.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <h3 className="text-lg font-bold p-6 text-gray-900 dark:text-white">Controle de Consumo de Produtos</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Consumo Previsto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Consumo Real (30d)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Saldo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[200px]">Status do Consumo</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {consumptionData.length > 0 ? consumptionData.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{`${item.consumptionRate} / ${item.consumptionUnit}`}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-semibold">{item.plannedConsumption.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-semibold">{item.actualConsumption.toFixed(2)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${item.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{item.balance.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div className="flex items-center space-x-2">
                      <div className="w-full">
                         <ProgressBar percentage={item.consumptionPercentage} />
                      </div>
                      <span className={`font-semibold ${item.consumptionPercentage > 100 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{item.consumptionPercentage.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Nenhum produto com parâmetros de consumo definidos. Vá para a aba 'Produtos' para configurá-los.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConsumptionManagement;