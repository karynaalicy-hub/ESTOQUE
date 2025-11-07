import React, { useState, useEffect, useMemo } from 'react';
import { Product, StockEntry, StockExit, Tab } from './types';
import * as db from './db';
import Products from './components/Products';
import Entries from './components/Entries';
import Exits from './components/Exits';
import StockControl from './components/StockControl';
import Reports from './components/Reports';
import Tabs from './components/Tabs';
import Notifications from './components/Notifications';
import { Box, Package, ArrowUpCircle, ArrowDownCircle, FileText, Warehouse, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('stock-control');
  const [isLoading, setIsLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [exits, setExits] = useState<StockExit[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [productsData, entriesData, exitsData] = await Promise.all([
          db.getAll<Product>('products'),
          db.getAll<StockEntry>('entries'),
          db.getAll<StockExit>('exits'),
        ]);
        setProducts(productsData);
        setEntries(entriesData);
        setExits(exitsData);
      } catch (error) {
        console.error("Falha ao carregar os dados do Firebase.", error);
        alert("Não foi possível conectar ao Firebase. Verifique sua conexão e se as credenciais em 'firebaseConfig.ts' estão corretas.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const newProduct = await db.add('products', product) as Product;
      setProducts(prev => [...prev, newProduct].sort((a,b) => a.name.localeCompare(b.name)));
    } catch(error) {
      console.error("Erro ao adicionar produto:", error);
      alert("Não foi possível adicionar o produto. Verifique sua conexão ou tente mais tarde.");
    }
  };

  const updateProduct = async (id: string, updatedData: Partial<Omit<Product, 'id'>>) => {
    const productToUpdate = products.find(p => p.id === id);
    if (!productToUpdate) return;
    const updatedProduct = { ...productToUpdate, ...updatedData };
    
    try {
      const returnedProduct = await db.update('products', updatedProduct);
      setProducts(prevProducts =>
        prevProducts.map(p => (p.id === id ? returnedProduct : p))
      );
    } catch(error) {
      console.error("Erro ao atualizar produto:", error);
      alert("Não foi possível atualizar o produto. Verifique sua conexão ou tente mais tarde.");
    }
  };

  const addEntry = async (entry: Omit<StockEntry, 'id'>) => {
    try {
      const newEntry = await db.add('entries', entry) as StockEntry;
      setEntries(prev => [...prev, newEntry].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch(error) {
      console.error("Erro ao adicionar entrada:", error);
      alert("Não foi possível adicionar a entrada. Verifique sua conexão ou tente mais tarde.");
    }
  };

  const addExit = async (exit: Omit<StockExit, 'id'>) => {
    try {
      const newExit = await db.add('exits', exit) as StockExit;
      setExits(prev => [...prev, newExit].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch(error) {
      console.error("Erro ao adicionar saída:", error);
      alert("Não foi possível adicionar a saída. Verifique sua conexão ou tente mais tarde.");
    }
  };

  const deleteProduct = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto? A exclusão é permanente e removerá todas as entradas e saídas associadas.')) {
        try {
            // Encontra entradas e saídas relacionadas a partir do estado atual
            const entriesToDelete = entries.filter(e => e.productId === id);
            const exitsToDelete = exits.filter(e => e.productId === id);
            
            // Cria uma lista de promessas para todas as exclusões no banco de dados
            const deletePromises = [
                db.deleteItem('products', id),
                ...entriesToDelete.map(e => db.deleteItem('entries', e.id)),
                ...exitsToDelete.map(x => db.deleteItem('exits', x.id))
            ];

            // Aguarda todas as exclusões serem concluídas
            await Promise.all(deletePromises);

            // Atualiza a interface do usuário após o sucesso das operações no banco de dados
            setProducts(prev => prev.filter(p => p.id !== id));
            setEntries(prev => prev.filter(e => e.productId !== id));
            setExits(prev => prev.filter(e => e.productId !== id));
        } catch (error) {
            console.error("Erro ao excluir o produto e seus dados relacionados:", error);
            alert("Ocorreu um erro ao excluir o produto. Tente novamente.");
        }
    }
  };

  const lowStockProducts = useMemo(() => {
     return products.map(product => {
      const totalEntries = entries
        .filter(e => e.productId === product.id)
        .reduce((sum, e) => sum + e.quantity, 0);

      const totalExits = exits
        .filter(e => e.productId === product.id)
        .reduce((sum, e) => sum + e.quantity, 0);
      
      const balance = totalEntries - totalExits;
      return { ...product, balance };
    }).filter(p => p.balance <= p.minStock);
  }, [products, entries, exits]);


  const tabOptions = [
    { id: 'stock-control', label: 'Controle de Estoque', icon: Box },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'entries', label: 'Entradas', icon: ArrowUpCircle },
    { id: 'exits', label: 'Saídas', icon: ArrowDownCircle },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'products':
        return <Products products={products} addProduct={addProduct} deleteProduct={deleteProduct} updateProduct={updateProduct} />;
      case 'entries':
        return <Entries products={products} entries={entries} addEntry={addEntry} />;
      case 'exits':
        return <Exits products={products} exits={exits} addExit={addExit} />;
      case 'stock-control':
        return <StockControl products={products} entries={entries} exits={exits} />;
      case 'reports':
        return <Reports products={products} entries={entries} exits={exits} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-brand-600 animate-spin" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">Conectando ao banco de dados...</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Carregando dados do seu estoque na nuvem.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-800 dark:text-gray-200">
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Warehouse className="h-8 w-8 text-brand-600" />
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    CONTEMPSICO
                    <span className="text-sm font-normal text-gray-500 ml-2">Gestão de Estoque</span>
                  </h1>
                </div>
                <Notifications lowStockProducts={lowStockProducts} onNotificationClick={() => setActiveTab('stock-control')} exits={exits} />
            </div>
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabOptions} />
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;