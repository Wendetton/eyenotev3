// src/components/doctor/CallPatientBar.jsx
'use client';

import { useEffect, useMemo, useState } from "react";
import { callOnWebTV } from "@/utils/tvCaller";

function sanitize(s){ return String(s || "").replace(/\s+/g," ").trim().slice(0,80); }

const CONSULTORIOS = [
  { value: "Consultório 1", label: "Consultório 1" },
  { value: "Consultório 2", label: "Consultório 2" },
];

const LS_KEY = "tv_last_consultorio";

export default function CallPatientBar({ patient, compact = true }) {
  // nome pré-preenchido e editável
  const baseName = useMemo(() => sanitize(patient?.name || ""), [patient?.name]);
  const [nome, setNome] = useState(baseName);

  // consultório com “último usado” como padrão
  const [consultorio, setConsultorio] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(LS_KEY);
      if (saved && CONSULTORIOS.some(c => c.value === saved)) return saved;
    }
    return CONSULTORIOS[0].value; // fallback
  });

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
      await callOnWebTV({ nome: finalName, sala: consultorio });
      // persiste “último consultório” para as próximas chamadas
      try { window.localStorage.setItem(LS_KEY, consultorio); } catch {}
      setOk(`Chamado: ${finalName} — ${consultorio}`);
      setTimeout(() => setOk(""), 2000);
    }catch(e){
      console.error(e);
      setErr(e.message || "Falha ao chamar a TV.");
    }finally{
      setBusy(false);
    }
  };

  // --- layout “compacto” para caber no canto direito do header ---
  if (compact) {
    return (
      <div
        className="flex items-end gap-2"
        aria-label="Chamar paciente na TV"
      >
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Nome (editável)</label>
          <input
            type="text"
            value={nome}
            onChange={(e)=>setNome(e.target.value)}
            className="w-[220px] rounded-md border border-gray-300 px-2 py-1.5 text-black shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nome do paciente"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Consultório</label>
          <select
            value={consultorio}
            onChange={(e)=>setConsultorio(e.target.value)}
            className="w-[160px] rounded-md border border-gray-300 px-2 py-1.5 text-black shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {CONSULTORIOS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCall}
          disabled={busy || !sanitize(nome)}
          className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-white text-sm font-medium shadow-sm ${
            busy || !sanitize(nome) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title="Enviar chamada para a TV"
        >
          {busy ? 'Chamando...' : 'Chamar'}
        </button>

        {/* feedback discreto */}
        {(ok || err) && (
          <span className={`ml-1 text-xs ${ok ? 'text-green-600' : 'text-red-600'}`}>
            {ok || err}
          </span>
        )}
      </div>
    );
  }

  // --- fallback (não usado aqui, mas mantém compatibilidade) ---
  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-end md:gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome (editável)</label>
          <input
            type="text"
            value={nome}
            onChange={(e)=>setNome(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nome do paciente"
          />
        </div>
        <div className="md:w-48 mt-3 md:mt-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">Consultório</label>
          <select
            value={consultorio}
            onChange={(e)=>setConsultorio(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {CONSULTORIOS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCall}
          disabled={busy || !sanitize(nome)}
          className={`mt-3 md:mt-0 inline-flex items-center justify-center rounded-md px-4 py-2 text-white font-medium shadow-sm ${
            busy || !sanitize(nome) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {busy ? 'Chamando...' : 'Chamar na TV'}
        </button>
      </div>

      {(ok || err) && (
        <p className={`mt-2 text-sm ${ok ? 'text-green-600' : 'text-red-600'}`}>{ok || err}</p>
      )}
    </div>
  );
}
