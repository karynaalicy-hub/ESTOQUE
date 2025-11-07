import React, { useState } from 'react';
import { Product } from '../types';
import { Trash2, PlusCircle, Pencil, Save, XCircle, UploadCloud, FileScan, Loader2, X } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface ProductsProps {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  addMultipleProducts: (products: Omit<Product, 'id'>[]) => void;
  deleteProduct: (id: string) => void;
  updateProduct: (id: string, data: Partial<Omit<Product, 'id'>>) => void;
}

type ExtractedProduct = {
  key: string;
  name: string;
  unit: string;
  minStock: number;
  price: number;
}

// FIX: Define an interface for the expected JSON response from the Gemini API.
interface InvoiceItemsResponse {
  items: { name: string }[];
}

const Products: React.FC<ProductsProps> = ({ products, addProduct, addMultipleProducts, deleteProduct, updateProduct }) => {
  // State for manual entry form
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [minStock, setMinStock] = useState(0);
  const [price, setPrice] = useState(0);

  // State for editing existing products
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editedProduct, setEditedProduct] = useState<Partial<Omit<Product, 'id'>>>({});
  
  // State for invoice processing feature
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);

  const handleEditClick = (product: Product) => {
    setEditingProductId(product.id);
    setEditedProduct({ 
        name: product.name, 
        unit: product.unit, 
        minStock: product.minStock, 
        price: product.price,
    });
  };

  const handleCancelClick = () => {
    setEditingProductId(null);
  };

  const handleSaveClick = (id: string) => {
    if (editedProduct.name && editedProduct.unit && editedProduct.minStock >= 0 && editedProduct.price >= 0) {
      updateProduct(id, editedProduct);
      setEditingProductId(null);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedProduct(prev => ({
      ...prev,
      [name]: (name === 'minStock' || name === 'price') ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && unit && minStock >= 0 && price >= 0) {
      addProduct({ name, unit, minStock, price });
      setName('');
      setUnit('');
      setMinStock(0);
      setPrice(0);
    }
  };
  
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

  const handleProcessInvoice = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProcessingError(null);
    setExtractedProducts([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const filePart = await fileToGenerativePart(file);
      const prompt = `Extraia uma lista de nomes de produtos únicos desta nota fiscal. Não inclua quantidades ou preços, apenas os nomes dos itens. Retorne a resposta em formato JSON.`;
      
      const schema = {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'Nome do produto' },
              },
              required: ['name'],
            }
          }
        },
        required: ['items']
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, filePart] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      // FIX: Type the parsed JSON to prevent errors when accessing its properties.
      const data: InvoiceItemsResponse = JSON.parse(response.text);
      const existingProductNames = new Set(products.map(p => p.name.trim().toLowerCase()));
      
      const newProducts = data.items
        .map((item) => ({ name: item.name.trim() }))
        .filter((item) => item.name && !existingProductNames.has(item.name.toLowerCase()));

      const uniqueNewProducts = Array.from(new Map(newProducts.map(item => [item.name.toLowerCase(), item])).values());

      if (uniqueNewProducts.length === 0) {
        setProcessingError("Nenhum produto novo encontrado na nota fiscal ou todos já estão cadastrados.");
      } else {
        setExtractedProducts(uniqueNewProducts.map((item, index) => ({
            key: `${index}-${Date.now()}`,
            name: item.name,
            unit: '',
            minStock: 10,
            price: 0,
        })));
      }
      setFile(null);

    } catch (error) {
      console.error("Erro ao processar a nota fiscal:", error);
      setProcessingError("Não foi possível extrair os dados. Tente novamente com uma imagem mais nítida ou um arquivo diferente.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleExtractedProductChange = (key: string, field: 'name' | 'unit' | 'minStock' | 'price', value: string | number) => {
    setExtractedProducts(prev => prev.map(p => 
        p.key === key ? { ...p, [field]: value } : p
    ));
  };
  
  const handleRemoveExtractedProduct = (key: string) => {
    setExtractedProducts(prev => prev.filter(p => p.key !== key));
  };

  const handleCancelExtraction = () => {
    setFile(null);
    setExtractedProducts([]);
    setProcessingError(null);
    setIsProcessing(false);
  };
  
  const handleConfirmNewProducts = async () => {
    const productsToAdd = extractedProducts
      .filter(p => p.name && p.unit && p.minStock >= 0 && p.price >= 0)
      .map(({ key, ...rest }) => rest);

    if (productsToAdd.length > 0) {
      await addMultipleProducts(productsToAdd);
      handleCancelExtraction();
    } else if (extractedProducts.length > 0) {
      alert("Por favor, preencha todos os campos para os produtos que deseja adicionar.");
    } else {
      handleCancelExtraction();
    }
  };

  const formInputClass = "mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
  const tableInputClass = "w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-1";

  return (
    <div className="space-y-8">
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
              <FileScan className="mr-2 h-6 w-6 text-brand-500" /> Adicionar Produtos por Nota Fiscal (Beta)
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

      {extractedProducts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirmar Novos Produtos</h2>
                  <button onClick={handleCancelExtraction} aria-label="Cancelar extração"><X className="h-6 w-6 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" /></button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Encontramos os seguintes produtos novos na nota fiscal. Preencha os detalhes e adicione-os ao seu inventário.
              </p>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unidade</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estoque Mín.</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Preço (R$)</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ação</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {extractedProducts.map(p => (
                              <tr key={p.key}>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                      <input type="text" value={p.name} onChange={e => handleExtractedProductChange(p.key, 'name', e.target.value)} className={`${formInputClass} mt-0`} />
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                      <input type="text" value={p.unit} onChange={e => handleExtractedProductChange(p.key, 'unit', e.target.value)} placeholder="Ex: un, kg, caixa" className={`${formInputClass} mt-0`} />
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                      <input type="number" value={p.minStock} onChange={e => handleExtractedProductChange(p.key, 'minStock', Number(e.target.value))} min="0" className={`${formInputClass} mt-0 w-24`} />
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                      <input type="number" value={p.price} onChange={e => handleExtractedProductChange(p.key, 'price', Number(e.target.value))} min="0" step="0.01" className={`${formInputClass} mt-0 w-28`} />
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-center">
                                      <button onClick={() => handleRemoveExtractedProduct(p.key)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" aria-label="Remover produto"><Trash2 className="h-5 w-5"/></button>
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
                  <button onClick={handleConfirmNewProducts} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500">
                      Adicionar Produtos
                  </button>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center"><PlusCircle className="mr-2 h-6 w-6 text-brand-500" /> Adicionar Novo Produto</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item</label>
                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className={formInputClass}/>
              </div>
              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unidade de Medida</label>
                <input type="text" id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} required className={formInputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label htmlFor="minStock" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estoque Mínimo</label>
                      <input type="number" id="minStock" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} required min="0" className={formInputClass}/>
                  </div>
                   <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$)</label>
                      <input type="number" id="price" value={price} onChange={(e) => setPrice(Number(e.target.value))} required min="0" step="0.01" className={formInputClass}/>
                  </div>
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-gray-800"
              >
                Adicionar Produto
              </button>
            </form>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <h2 className="text-xl font-bold p-6 text-gray-900 dark:text-white">Lista de Produtos</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unidade</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estoque Mín.</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Preço</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {products.length > 0 ? products.map(product => (
                      editingProductId === product.id ? (
                        <tr key={product.id}>
                          <td className="px-6 py-2 whitespace-nowrap"><input type="text" name="name" value={editedProduct.name} onChange={handleEditInputChange} className={tableInputClass} autoFocus /></td>
                          <td className="px-6 py-2 whitespace-nowrap"><input type="text" name="unit" value={editedProduct.unit} onChange={handleEditInputChange} className={tableInputClass} /></td>
                          <td className="px-6 py-2 whitespace-nowrap"><input type="number" name="minStock" value={editedProduct.minStock} onChange={handleEditInputChange} min="0" className={tableInputClass} /></td>
                          <td className="px-6 py-2 whitespace-nowrap"><input type="number" name="price" value={editedProduct.price} onChange={handleEditInputChange} min="0" step="0.01" className={tableInputClass} /></td>
                          <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => handleSaveClick(product.id)} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300" aria-label="Salvar"><Save className="h-5 w-5"/></button>
                              <button onClick={handleCancelClick} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300" aria-label="Cancelar"><XCircle className="h-5 w-5"/></button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.minStock}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                  <button onClick={() => handleEditClick(product)} className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300" aria-label="Editar"><Pencil className="h-5 w-5"/></button>
                                  <button onClick={() => deleteProduct(product.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" aria-label="Excluir"><Trash2 className="h-5 w-5"/></button>
                              </div>
                          </td>
                        </tr>
                      )
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Nenhum produto adicionado ainda.</td>
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

export default Products;