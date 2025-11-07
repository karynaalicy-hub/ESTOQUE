import React, { useState } from 'react';
import { Product, StockEntry, EditableEntry } from '../types';
import { PlusCircle, UploadCloud, FileScan, Loader2, X, Pencil, Save, XCircle, Trash2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface EntriesProps {
  products: Product[];
  entries: StockEntry[];
  addEntry: (entry: Omit<StockEntry, 'id'>) => void;
  addMultipleEntries: (entries: Omit<StockEntry, 'id'>[]) => void;
  updateEntry: (id: string, data: EditableEntry) => void;
  deleteEntry: (id: string) => void;
}

type ExtractedEntry = {
  key: string;
  originalName: string;
  productId: string;
  quantity: number;
}

interface InvoiceEntriesResponse {
  supplier: string;
  date: string;
  items: { name: string; quantity: number }[];
}

const Entries: React.FC<EntriesProps> = ({ products, entries, addEntry, addMultipleEntries, updateEntry, deleteEntry }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [extractedEntries, setExtractedEntries] = useState<ExtractedEntry[]>([]);
  const [extractedSupplier, setExtractedSupplier] = useState('');
  const [extractedDate, setExtractedDate] = useState('');
  
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editedEntry, setEditedEntry] = useState<EditableEntry>({});

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date && productId && supplier && quantity > 0) {
      addEntry({ date, productId, supplier, quantity });
      setProductId('');
      setSupplier('');
      setQuantity(1);
    }
  };
  
  const handleEditClick = (entry: StockEntry) => {
    setEditingEntryId(entry.id);
    setEditedEntry({
        date: entry.date,
        productId: entry.productId,
        supplier: entry.supplier,
        quantity: entry.quantity,
    });
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditedEntry({});
  };

  const handleSaveEdit = (id: string) => {
    if (editedEntry.date && editedEntry.productId && editedEntry.supplier && editedEntry.quantity && editedEntry.quantity > 0) {
        updateEntry(id, editedEntry);
        handleCancelEdit();
    } else {
        alert("Todos os campos devem ser preenchidos e a quantidade deve ser maior que zero.");
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedEntry(prev => ({
        ...prev,
        [name]: name === 'quantity' ? Number(value) : value,
    }));
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Produto Desconhecido';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setProcessingError(null);
    }
  };

  const fileToGenerativePart = async (file: File) => {
    const base64EncodedData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: {
        data: base64EncodedData,
        mimeType: file.type,
      },
    };
  };

  const findBestProductMatch = (name: string, productList: Product[]): Product | null => {
    if (!name || productList.length === 0) return null;
    const lowerCaseName = name.toLowerCase().trim();
    
    let bestMatch: Product | null = null;
    let highestScore = 0;

    productList.forEach(product => {
        const productLowerCaseName = product.name.toLowerCase().trim();
        let score = 0;

        if (productLowerCaseName === lowerCaseName) {
            score = 1;
        } else if (productLowerCaseName.includes(lowerCaseName)) {
            score = lowerCaseName.length / productLowerCaseName.length * 0.9;
        } else if (lowerCaseName.includes(productLowerCaseName)) {
            score = productLowerCaseName.length / lowerCaseName.length * 0.9;
        }
        
        if (score > highestScore) {
            highestScore = score;
            bestMatch = product;
        }
    });

    return bestMatch;
  };

  const handleProcessInvoice = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProcessingError(null);
    setExtractedEntries([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const filePart = await fileToGenerativePart(file);
      const prompt = `Extraia as seguintes informações desta nota fiscal: o nome do fornecedor, a data da emissão (no formato AAAA-MM-DD), e uma lista de produtos com nome e quantidade. Retorne a resposta em formato JSON.`;
      
      const schema = {
        type: Type.OBJECT,
        properties: {
          supplier: { type: Type.STRING, description: 'Nome do fornecedor' },
          date: { type: Type.STRING, description: 'Data no formato AAAA-MM-DD' },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'Nome do produto' },
                quantity: { type: Type.NUMBER, description: 'Quantidade do produto' },
              },
              required: ['name', 'quantity'],
            }
          }
        },
        required: ['supplier', 'date', 'items']
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, filePart] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      const data: InvoiceEntriesResponse = JSON.parse(response.text);

      setExtractedSupplier(data.supplier || '');
      setExtractedDate(data.date || new Date().toISOString().slice(0, 10));

      const confirmed = data.items.map((item, index: number) => {
        const bestMatch = findBestProductMatch(item.name, products);
        return {
          key: `${index}-${Date.now()}`,
          originalName: item.name,
          productId: bestMatch ? bestMatch.id : '',
          quantity: item.quantity,
        };
      });
      setExtractedEntries(confirmed);
      setFile(null);

    } catch (error) {
      console.error("Erro ao processar a nota fiscal:", error);
      setProcessingError("Não foi possível extrair os dados. Tente novamente com uma imagem mais nítida ou um arquivo diferente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractedEntryChange = (key: string, field: 'productId' | 'quantity', value: string | number) => {
    setExtractedEntries(prev => prev.map(entry => 
        entry.key === key ? { ...entry, [field]: value } : entry
    ));
  };

  const handleCancelExtraction = () => {
    setFile(null);
    setExtractedEntries([]);
    setProcessingError(null);
    setIsProcessing(false);
  };
  
  const handleConfirmEntries = async () => {
    const entriesToAdd = extractedEntries
      .filter(entry => entry.productId && entry.quantity > 0)
      .map(entry => ({
          date: extractedDate,
          productId: entry.productId,
          supplier: extractedSupplier,
          quantity: Number(entry.quantity),
        }));
    
    if (entriesToAdd.length > 0) {
      await addMultipleEntries(entriesToAdd);
    }
    handleCancelExtraction();
  };

  const formInputClass = "mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
  const tableInputClass = "w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-1";

  return (
    <div className="space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
                <FileScan className="mr-2 h-6 w-6 text-brand-500" /> Adicionar por Nota Fiscal (Beta)
            </h2>
            <div className="space-y-4">
                 <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-800 focus-within:ring-brand-500">
                                <span>Carregue um arquivo</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, application/pdf" disabled={isProcessing} />
                            </label>
                            <p className="pl-1">ou arraste e solte</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                            PNG, JPG ou PDF
                        </p>
                    </div>
                </div>
                {file && <p className="text-sm text-gray-600 dark:text-gray-400">Arquivo selecionado: {file.name}</p>}
                
                {processingError && <p className="text-sm text-red-500">{processingError}</p>}
                
                <button 
                    onClick={handleProcessInvoice} 
                    disabled={!file || isProcessing}
                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:bg-gray-400 dark:focus:ring-offset-gray-800"
                >
                    {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : 'Processar Nota Fiscal'}
                </button>
            </div>
        </div>

        {extractedEntries.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirmar Entradas Extraídas</h2>
                    <button onClick={handleCancelExtraction} aria-label="Cancelar extração"><X className="h-6 w-6 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label htmlFor="extracted-supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fornecedor</label>
                        <input type="text" id="extracted-supplier" value={extractedSupplier} onChange={(e) => setExtractedSupplier(e.target.value)} className={formInputClass} />
                    </div>
                    <div>
                        <label htmlFor="extracted-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
                        <input type="date" id="extracted-date" value={extractedDate} onChange={(e) => setExtractedDate(e.target.value)} className={formInputClass} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item na Nota</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Produto no Sistema</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantidade</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {extractedEntries.map(entry => (
                                <tr key={entry.key}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{entry.originalName}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <select value={entry.productId} onChange={e => handleExtractedEntryChange(entry.key, 'productId', e.target.value)} className={formInputClass}>
                                            <option value="">Ignorar este item</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <input type="number" value={entry.quantity} onChange={e => handleExtractedEntryChange(entry.key, 'quantity', Number(e.target.value))} min="1" className={`${formInputClass} w-24`} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={handleCancelExtraction} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                        Cancelar
                    </button>
                    <button onClick={handleConfirmEntries} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500">
                        Adicionar Entradas
                    </button>
                </div>
            </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center"><PlusCircle className="mr-2 h-6 w-6 text-green-500" /> Adicionar Entrada Manualmente</h2>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data da Entrada</label>
                <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required className={formInputClass} />
              </div>
              <div>
                <label htmlFor="product" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Produto</label>
                <select id="product" value={productId} onChange={(e) => setProductId(e.target.value)} required className={formInputClass}>
                  <option value="">Selecione um produto</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fornecedor</label>
                <input type="text" id="supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} required className={formInputClass} />
              </div>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade</label>
                <input type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required min="1" className={formInputClass} />
              </div>
              <button type="submit" disabled={products.length === 0} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:bg-gray-400 dark:focus:ring-offset-gray-800">
                Adicionar Entrada
              </button>
              {products.length === 0 && <p className="text-xs text-center text-red-500 mt-2">Por favor, adicione um produto primeiro.</p>}
            </form>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <h2 className="text-xl font-bold p-6 text-gray-900 dark:text-white">Histórico de Entradas</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Produto</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fornecedor</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantidade</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {entries.length > 0 ? entries.map(entry => (
                    editingEntryId === entry.id ? (
                      <tr key={entry.id}>
                        <td className="px-2 py-2 whitespace-nowrap"><input type="date" name="date" value={editedEntry.date} onChange={handleEditInputChange} className={tableInputClass} /></td>
                        <td className="px-2 py-2 whitespace-nowrap">
                            <select name="productId" value={editedEntry.productId} onChange={handleEditInputChange} className={tableInputClass}>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap"><input type="text" name="supplier" value={editedEntry.supplier} onChange={handleEditInputChange} className={tableInputClass} /></td>
                        <td className="px-2 py-2 whitespace-nowrap"><input type="number" name="quantity" value={editedEntry.quantity} onChange={handleEditInputChange} min="1" className={`${tableInputClass} w-20`} /></td>
                        <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => handleSaveEdit(entry.id)} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300" aria-label="Salvar"><Save className="h-5 w-5"/></button>
                              <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300" aria-label="Cancelar"><XCircle className="h-5 w-5"/></button>
                            </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{getProductName(entry.productId)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{entry.supplier}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold">+{entry.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                                <button onClick={() => handleEditClick(entry)} className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300" aria-label="Editar"><Pencil className="h-5 w-5"/></button>
                                <button onClick={() => deleteEntry(entry.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" aria-label="Excluir"><Trash2 className="h-5 w-5"/></button>
                            </div>
                        </td>
                      </tr>
                    )
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma entrada registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Entries;
