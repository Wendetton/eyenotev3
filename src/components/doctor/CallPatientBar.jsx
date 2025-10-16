// src/components/doctor/CallPatientBar.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { sanitizeName, callPatientViaApi } from '@/utils/tvUtils';

export default function CallPatientBar({ documentId, patient, userName }) {
  const baseName = useMemo(() => sanitizeName(patient?.name || ''), [patient?.name]);
  const [name, setName] = useState(baseName);
  const [isCalling, setIsCalling] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { setName(baseName); }, [baseName]);

  const handleCall = async () => {
    setErr(null); setMsg(null);
    const finalName = sanitizeName(name);
    if (!finalName) { setErr('Informe um nome.'); return; }
    try {
      setIsCalling(true);
      await callPatientViaApi({
        name: finalName,
        documentId,
        patientId: patient?.id || null,
        calledBy: userName || 'Medico',
      });
      setMsg(`Chamado enviado para a TV: ${finalName}`);
    } catch (e) {
      console.error(e);
      setErr(e.message || 'Falha ao chamar a TV.');
    } finally {
      setIsCalling(false);
      setTimeout(() => { setMsg(null); setErr(null); }, 3000);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-end md:gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome a chamar na TV (editável)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite/ajuste o nome do paciente"
          />
        </div>
        <button
          onClick={handleCall}
          disabled={isCalling || !sanitizeName(name)}
          className={`mt-3 md:mt-0 inline-flex items-center justify-center rounded-md px-4 py-2 text-white font-medium shadow-sm ${
            isCalling || !sanitizeName(name)
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title="Enviar chamada para a TV"
        >
          {isCalling ? 'Chamando...' : 'Chamar na TV'}
        </button>
      </div>

      {msg && <p className="mt-2 text-sm text-green-600">{msg}</p>}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      <p className="mt-3 text-xs text-gray-500">
        A TV deve ouvir o seu webhook configurado (ver variável <code>TV_WEBHOOK_URL</code>).
      </p>
    </div>
  );
}
