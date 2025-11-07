import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product, StockExit } from '../types';
import { Bell, AlertTriangle } from 'lucide-react';

interface NotificationsProps {
  lowStockProducts: (Product & { balance: number })[];
  onNotificationClick: () => void;
  exits: StockExit[];
}

const Notifications: React.FC<NotificationsProps> = ({ lowStockProducts, onNotificationClick, exits }) => {
  const [isOpen, setIsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const notificationCount = lowStockProducts.length;
  
  const lastExitDates = useMemo(() => {
    const dateMap = new Map<string, string>();
    // As saídas já são ordenadas por data em App.tsx, então a primeira que encontrarmos é a mais recente
    for (const exit of exits) {
      if (!dateMap.has(exit.productId)) {
        dateMap.set(exit.productId, exit.date);
      }
    }
    return dateMap;
  }, [exits]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = () => {
    setIsOpen(false);
    onNotificationClick();
  }

  return (
    <div className="relative" ref={notificationRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-gray-500 rounded-full hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-gray-800"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell className="h-6 w-6" />
        {notificationCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {notificationCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden z-20"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="notifications-menu"
        >
          <div className="py-2">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-white">Notificações</h3>
            </div>
            {notificationCount > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
                {lowStockProducts.map(product => {
                    const lastExitDate = lastExitDates.get(product.id);
                    return (
                      <li key={product.id} className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={handleItemClick}>
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 pt-1">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Estoque Baixo: {product.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Atual: <span className="font-semibold">{product.balance}</span> | Mínimo: <span className="font-semibold">{product.minStock}</span>
                            </p>
                            {lastExitDate && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Última saída: {new Date(lastExitDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                })}
              </ul>
            ) : (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma notificação nova.
                </div>
            )}
             <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-center">
                <button onClick={handleItemClick} className="text-sm font-medium text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300">
                   Ver Controle de Estoque
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;