
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [docIdInput, setDocIdInput] = useState('');
  const router = useRouter();

  const handleNavigateToDocument = () => {
    if (docIdInput.trim()) {
      router.push(`/doc/${docIdInput.trim()}`);
    }
  };

  const handleCreateNewDocument = () => {
    const newDocId = Math.random().toString(36).substring(2, 15);
    router.push(`/doc/${newDocId}`);
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-800">Eyenote</h1>
        <p className="text-gray-600">Sistema Colaborativo de Gestão Oftalmológica</p>
      </div>
      
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Acessar Documento Existente</h2>
          <input
            type="text"
            value={docIdInput}
            onChange={(e) => setDocIdInput(e.target.value)}
            placeholder="Digite o ID do Documento"
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 mb-3 text-gray-800"
            onKeyPress={(e) => e.key === 'Enter' && handleNavigateToDocument()}
          />
          <button
            onClick={handleNavigateToDocument}
            disabled={!docIdInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
          >
            Acessar Documento
          </button>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Ou Crie um Novo</h2>
          <button
            onClick={handleCreateNewDocument}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
          >
            Criar Novo Documento
          </button>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray-600 text-center max-w-md">
        Para testar a colaboração, abra o mesmo link de documento em duas janelas ou navegadores diferentes.
      </p>
    </div>
  );
}


