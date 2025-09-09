'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [docIdInput, setDocIdInput] = useState('');
  const router = useRouter();

  const handleNavigateToDocument = () => {
    const id = docIdInput.trim();
    if (id) {
      router.push(`/doc/${id}`);
    }
  };

  const generateDocId = () => {
    // ID simples e único o suficiente para a rota do documento
    return (
      Math.random().toString(36).slice(2, 8) +
      Date.now().toString(36)
    );
  };

  const handleCreateNewDocument = () => {
    const newId = generateDocId();
    router.push(`/doc/${newId}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNavigateToDocument();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">EyeNote</h1>
        <p className="text-gray-600">Sistema Colaborativo de Gestão Oftalmológica</p>
      </div>

      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Acessar Documento Existente</h2>
          <input
            type="text"
            value={docIdInput}
            onChange={(e) => setDocIdInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite o ID do Documento"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3 text-gray-800"
            aria-label="ID do Documento"
          />
          <button
            type="button"
            onClick={handleNavigateToDocument}
            className="w-full py-2.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Entrar
          </button>
        </div>

        <div className="border-t border-gray-200 my-4" />

        <div className="mt-4">
          <h3 className="text-base font-medium mb-3 text-gray-800">Ou criar um novo documento</h3>
          <button
            type="button"
            onClick={handleCreateNewDocument}
            className="w-full py-2.5 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
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
