'use client';

import { useEffect, useState } from 'react';

export default function AlertModal({
  isOpen,
  onClose,
  defaultPatientName = '',
  onSend, // (payload) => void
}) {
  const [patientName, setPatientName] = useState(defaultPatientName || '');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPatientName(defaultPatientName || '');
      setMessage('');
    }
  }, [isOpen, defaultPatientName]);

  if (!isOpen) return null;

  const presets = [
    { label: 'Col', text: 'Comparecer ao consultório para Colírio' },
    { label: 'Ot',  text: 'Comparecer ao consultório para Otoscopia' },
    { label: 'Aval',text: 'Comparecer ao consultório para Avaliação' },
  ];

  const handlePreset = (t) => {
    // se vazio, substitui. Se já tem texto, adiciona com separador.
    setMessage((prev) => prev ? (prev + ' | ' + t) : t);
  };

  const handleSend = () => {
    const name = (patientName || '').trim();
    const msg  = (message || '').trim();
    onSend({ patientName: name, message: msg });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl">
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Emitir aviso para o Legacy</h3>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do paciente</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-black"
              placeholder="Ex.: Maria Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem do alerta</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-black resize-none"
              rows={3}
              placeholder="Digite a mensagem (ou use um dos atalhos abaixo)"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p.text)}
                  className="px-3 py-1.5 rounded-md text-sm font-semibold bg-orange-100 text-orange-800 hover:bg-orange-200"
                  title={p.text}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
