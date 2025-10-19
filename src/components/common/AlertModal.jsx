'use client';

import { useEffect, useState } from 'react';

export default function AlertModal({ isOpen, onClose, defaultPatientName = '', onSend }) {
  const [patientName, setPatientName] = useState(defaultPatientName || '');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPatientName(defaultPatientName || '');
      setMessage('');
    }
  }, [isOpen, defaultPatientName]);

  if (!isOpen) return null;

  const pushCode = (code) => {
    const next = (message ? message + ' | ' : '') + code;
    setMessage(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!onSend) return;
    onSend({
      patientName: (patientName || '').trim(),
      message: (message || '').toUpperCase().replace(/\s+/g, ' ').trim() // "COL | AVAL | OT"
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">Emitir aviso (Legacy)</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-black"
              placeholder="Nome do paciente"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem (códigos curtos)</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-black"
              placeholder="Ex.: COL | AVAL | OT"
            />
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => pushCode('COL')} className="px-2 py-1 bg-gray-100 rounded">COL</button>
              <button type="button" onClick={() => pushCode('AVAL')} className="px-2 py-1 bg-gray-100 rounded">AVAL</button>
              <button type="button" onClick={() => pushCode('OT')} className="px-2 py-1 bg-gray-100 rounded">OT</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Use apenas códigos (COL | AVAL | OT). Eles serão exibidos exatamente assim no Legacy.</p>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-md border">Cancelar</button>
            <button type="submit" className="px-3 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-semibold">Enviar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
