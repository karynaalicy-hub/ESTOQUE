import React, { useState } from 'react';
import { Product, StockExit, EditableExit } from '../types';
import { MinusCircle, Pencil, Save, XCircle, Trash2 } from 'lucide-react';

interface ExitsProps {
  products: Product[];
  exits: StockExit[];
  addExit: (exit: Omit<StockExit, 'id'>) => void;
  updateExit: (id: string, data: EditableExit) => void;
  deleteExit: (id: string) => void;
}

const Exits: React.FC<ExitsProps> = ({ products, exits, addExit, updateExit, deleteExit }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  const [editingExitId, setEditingExitId] = useState<string | null>(null);
  const [editedExit, setEditedExit] = useState<EditableExit>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date && productId && quantity > 0) {
      addExit({ date, productId, quantity });
      setProductId('');
      setQuantity(1);
    }
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Produto Desconhecido';
  
  const handleEditClick = (exit: StockExit) => {
    setEditingExitId(exit.id);
    setEditedExit({
        date: exit.date,
        productId: exit.productId,
        quantity: exit.quantity,
    });
  };

  const handleCancelEdit = () => {
    setEditingExitId(null);
    setEditedExit({});
  };

  const handleSaveEdit = (id: string) => {
    if (editedExit.date && editedExit.productId && editedExit.quantity && editedExit.quantity > 0) {
        updateExit(id, editedExit);
        handleCancelEdit();
    } else {
        alert("Todos os campos devem ser preenchidos e a quantidade deve ser maior que zero.");
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedExit(prev => ({
        ...prev,
        [name]: name === 'quantity' ? Number(value) : value,
    }));
  };
  
  const formInputClass = "mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
  const tableInputClass = "w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-1";

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
                className={formInputClass}
              />
            </div>
            <div>
              <label htmlFor="product" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Produto</label>
              <select
                id="product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className={formInputClass}
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
                className={formInputClass}
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
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {exits.length > 0 ? exits.map(exit => (
                    editingExitId === exit.id ? (
                      <tr key={exit.id}>
                        <td className="px-2 py-2 whitespace-nowrap"><input type="date" name="date" value={editedExit.date} onChange={handleEditInputChange} className={tableInputClass} /></td>
                        <td className="px-2 py-2 whitespace-nowrap">
                            <select name="productId" value={editedExit.productId} onChange={handleEditInputChange} className={tableInputClass}>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap"><input type="number" name="quantity" value={editedExit.quantity} onChange={handleEditInputChange} min="1" className={`${tableInputClass} w-20`} /></td>
                        <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => handleSaveEdit(exit.id)} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300" aria-label="Salvar"><Save className="h-5 w-5"/></button>
                              <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300" aria-label="Cancelar"><XCircle className="h-5 w-5"/></button>
                            </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={exit.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(exit.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{getProductName(exit.productId)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-semibold">-{exit.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                                <button onClick={() => handleEditClick(exit)} className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300" aria-label="Editar"><Pencil className="h-5 w-5"/></button>
                                <button onClick={() => deleteExit(exit.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" aria-label="Excluir"><Trash2 className="h-5 w-5"/></button>
                            </div>
                        </td>
                      </tr>
                    )
                  )): (
                     <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma saída registrada.</td>
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
