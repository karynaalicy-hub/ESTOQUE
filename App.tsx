import React, { useState, useEffect, useMemo } from 'react';
import { Product, StockEntry, StockExit, Tab, UserProfile, EditableEntry, EditableExit } from './types';
import * as db from './db';
import Products from './components/Products';
import Entries from './components/Entries';
import Exits from './components/Exits';
import StockControl from './components/StockControl';
import Reports from './components/Reports';
import Tabs from './components/Tabs';
import Notifications from './components/Notifications';
import Auth from './components/Auth';
import ConsumptionManagement from './components/ConsumptionManagement';
import { Box, Package, ArrowUpCircle, ArrowDownCircle, FileText, Warehouse, Loader2, LogOut, Target } from 'lucide-react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('stock-control');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [exits, setExits] = useState<StockExit[]>([]);
  const [monthlyForecast, setMonthlyForecast] = useState(100);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
          try {
              const profile = await db.getUserProfile(currentUser.uid, currentUser.email || '');
              setUserProfile(profile);
          } catch (error) {
              console.error("Erro ao buscar perfil do usuário:", error);
              // Lida com o erro, talvez fazendo logout do usuário
              await signOut(auth);
          }
      } else {
          setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDbError = (error: any, operation: string) => {
    console.error(`Erro ao ${operation}:`, error);
    if (error.code === 'permission-denied' || (error.message && error.message.includes('permission-denied'))) {
      alert(`Erro de permissão ao ${operation}. Verifique as regras de segurança do seu Firestore. Para acesso autenticado, use: 'allow read, write: if request.auth != null;'.`);
    } else {
      alert(`Não foi possível ${operation}. Verifique sua conexão ou tente mais tarde.`);
    }
  };

  useEffect(() => {
    if (!user) {
        // Limpa os dados quando o usuário faz logout
        setProducts([]);
        setEntries([]);
        setExits([]);
        setIsLoading(false);
        return;
    }
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [productsData, entriesData, exitsData] = await Promise.all([
          db.getAll<Product>(user.uid, 'products'),
          db.getAll<StockEntry>(user.uid, 'entries'),
          db.getAll<StockExit>(user.uid, 'exits'),
        ]);
        setProducts(productsData);
        setEntries(entriesData);
        setExits(exitsData);
      } catch (error: any) {
        console.error("Falha ao carregar os dados do Firebase.", error);
        alert(error.message || "Não foi possível carregar os dados. Verifique a conexão e as permissões do banco de dados.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    if (!user) return;
    try {
      const newProduct = await db.add(user.uid, 'products', product) as Product;
      setProducts(prev => [...prev, newProduct].sort((a,b) => a.name.localeCompare(b.name)));
    } catch(error) {
      handleDbError(error, 'adicionar produto');
    }
  };

  const addMultipleProducts = async (productsToAdd: Omit<Product, 'id'>[]) => {
    if (productsToAdd.length === 0 || !user) return;
    try {
        const newProducts = await db.addMultiple(user.uid, 'products', productsToAdd) as Product[];
        setProducts(prev => [...prev, ...newProducts].sort((a,b) => a.name.localeCompare(b.name)));
    } catch(error) {
        handleDbError(error, 'adicionar múltiplos produtos');
    }
  };

  const updateProduct = async (id: string, updatedData: Partial<Omit<Product, 'id'>>) => {
    if (!user) return;
    try {
      const returnedProduct = await db.update<Product>(user.uid, 'products', id, updatedData);
      setProducts(prevProducts =>
        prevProducts.map(p => (p.id === id ? { ...p, ...returnedProduct} : p))
      );
    } catch(error) {
      handleDbError(error, 'atualizar produto');
    }
  };

  const addEntry = async (entry: Omit<StockEntry, 'id'>) => {
    if (!user) return;
    try {
      const newEntry = await db.add(user.uid, 'entries', entry) as StockEntry;
      setEntries(prev => [...prev, newEntry].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch(error) {
      handleDbError(error, 'adicionar entrada');
    }
  };

  const addMultipleEntries = async (entriesToAdd: Omit<StockEntry, 'id'>[]) => {
    if (entriesToAdd.length === 0 || !user) return;
    try {
        const newEntries = await db.addMultiple(user.uid, 'entries', entriesToAdd) as StockEntry[];
        setEntries(prev => [...prev, ...newEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch(error) {
        handleDbError(error, 'adicionar múltiplas entradas');
    }
  };

  const updateEntry = async (id: string, updatedData: EditableEntry) => {
    if (!user) return;
    try {
        await db.update<StockEntry>(user.uid, 'entries', id, updatedData);
        setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e));
    } catch (error) {
        handleDbError(error, 'atualizar entrada');
    }
  };

  const deleteEntry = async (id: string) => {
      if (!user) return;
      if (window.confirm('Tem certeza que deseja excluir esta entrada?')) {
          try {
              await db.deleteItem(user.uid, 'entries', id);
              setEntries(prev => prev.filter(e => e.id !== id));
          } catch (error) {
              handleDbError(error, 'excluir entrada');
          }
      }
  };

  const addExit = async (exit: Omit<StockExit, 'id'>) => {
    if (!user) return;
    try {
      const newExit = await db.add(user.uid, 'exits', exit) as StockExit;
      setExits(prev => [...prev, newExit].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch(error) {
      handleDbError(error, 'adicionar saída');
    }
  };

  const updateExit = async (id: string, updatedData: EditableExit) => {
    if (!user) return;
    try {
        await db.update<StockExit>(user.uid, 'exits', id, updatedData);
        setExits(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e));
    } catch (error) {
        handleDbError(error, 'atualizar saída');
    }
  };

  const deleteExit = async (id: string) => {
      if (!user) return;
      if (window.confirm('Tem certeza que deseja excluir esta saída?')) {
          try {
              await db.deleteItem(user.uid, 'exits', id);
              setExits(prev => prev.filter(e => e.id !== id));
          } catch (error) {
              handleDbError(error, 'excluir saída');
          }
      }
  };

  const deleteProduct = async (id: string) => {
    if (!user) return;
    if (window.confirm('Tem certeza que deseja excluir este produto? A exclusão é permanente e removerá todas as entradas e saídas associadas.')) {
        try {
            const entriesToDelete = entries.filter(e => e.productId === id);
            const exitsToDelete = exits.filter(e => e.productId === id);
            
            await db.deleteProductAndRelatedData(user.uid, id, entriesToDelete, exitsToDelete);

            setProducts(prev => prev.filter(p => p.id !== id));
            setEntries(prev => prev.filter(e => e.productId !== id));
            setExits(prev => prev.filter(e => e.productId !== id));
        } catch (error) {
            handleDbError(error, 'excluir o produto e seus dados relacionados');
        }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      alert("Não foi possível sair. Tente novamente.");
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
    { id: 'consumption', label: 'Consumo', icon: Target },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'products':
        return <Products products={products} addProduct={addProduct} addMultipleProducts={addMultipleProducts} deleteProduct={deleteProduct} updateProduct={updateProduct} />;
      case 'entries':
        return <Entries products={products} entries={entries} addEntry={addEntry} addMultipleEntries={addMultipleEntries} updateEntry={updateEntry} deleteEntry={deleteEntry} />;
      case 'exits':
        return <Exits products={products} exits={exits} addExit={addExit} updateExit={updateExit} deleteExit={deleteExit} />;
      case 'stock-control':
        return <StockControl products={products} entries={entries} exits={exits} />;
      case 'consumption':
        return <ConsumptionManagement products={products} exits={exits} monthlyForecast={monthlyForecast} setMonthlyForecast={setMonthlyForecast} />;
      case 'reports':
        return <Reports products={products} entries={entries} exits={exits} />;
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-brand-600 animate-spin" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">Verificando autenticação...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

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
                    {userProfile?.isAdmin && (
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-300">
                            Admin
                        </span>
                    )}
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <Notifications lowStockProducts={lowStockProducts} onNotificationClick={() => setActiveTab('stock-control')} exits={exits} />
                  <button onClick={handleSignOut} className="p-2 text-gray-500 rounded-full hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-gray-800" aria-label="Sair">
                    <LogOut className="h-6 w-6" />
                  </button>
                </div>
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
