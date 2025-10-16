// src/components/doctor/CallPatientBar.jsx
'use client';

import { useEffect, useMemo, useState } from "react";
import { callOnWebTV } from "@/utils/tvCaller";

function sanitize(s){ return String(s || "").replace(/\s+/g," ").trim().slice(0,80); }

export default function CallPatientBar({ patient }) {
  const baseName = useMemo(() => sanitize(patient?.name || ""), [patient?.name]);
  const [nome, setNome] = useState(baseName);
  const [sala, setSala] = useState("");     // opcional
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => setNome(baseName), [baseName]);

  const handleCall = async () => {
    setOk(""); setErr("");
    const finalName = sanitize(nome);
    if (!finalName){ setErr("Informe um nome."); return; }
    try{
      setBusy(true);
      await callOnWebTV({ nome: finalName, sala });
      setOk(`Chamado enviado: ${finalName}${sala ? " (Sala " + sala + ")" : ""}`);
      setTimeout(() => setOk(""), 2500);
    }catch(e){
      console.error(e);
      setErr(e.message || "Falha ao chamar a TV.");
    }finally{
      setBusy(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-end md:gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome para a TV (editável)</label>
          <input
            type="text"
            value={nome}
            onChange={(e)=>setNome(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite/ajuste o nome do paciente"
          />
        </div>
        <div className="md:w-40 mt-3 md:mt-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">Sala (opcional)</label>
          <input
            type="text"
            value={sala}
            onChange={(e)=>setSala(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex.: 1"
          />
        </div>
        <button
          onClick={handleCall}
          disabled={busy || !sanitize(nome)}
          className={`mt-3 md:mt-0 inline-flex items-center justify-center rounded-md px-4 py-2 text-white font-medium shadow-sm ${
            busy || !sanitize(nome) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title="Enviar chamada para a TV"
        >
          {busy ? 'Chamando...' : 'Chamar na TV'}
        </button>
      </div>
      {ok && <p className="mt-2 text-sm text-green-600">{ok}</p>}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <p className="mt-3 text-xs text-gray-500">As TVs estão ouvindo <code>calls</code> e <code>config/announce</code> no projeto Firebase <strong>webtv-ee904</strong>.</p>
    </div>
  );
}
