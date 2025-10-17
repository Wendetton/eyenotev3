// src/components/doctor/CallPatientBar.jsx
'use client';

import { useEffect, useMemo, useState } from "react";
import { callOnWebTV } from "@/utils/tvCaller";

function sanitize(s){ return String(s || "").replace(/\s+/g," ").trim().slice(0,80); }

// Labels para a UI, valores apenas o número (como a TV espera)
const CONSULTORIOS = [
  { value: "1", label: "Consultório 1" },
  { value: "2", label: "Consultório 2" },
];

const LS_KEY = "tv_last_consultorio";

// Converte qualquer valor legado (“Consultório 2”) para só “2”
function normalizeConsultorio(val) {
  if (!val) return "";
  const s = String(val).trim();
  // se já for "1" ou "2", mantém
  if (s === "1" || s === "2") return s;
  // se vier “Consultório X”
  const m = s.match(/consult[óo]rio\s*(\d+)/i);
  if (m && m[1]) return m[1];
  // tenta extrair apenas dígito
  const n = s.match(/(\d+)/);
  if (n && n[1]) return n[1];
  return s;
}

export default function CallPatientBar({ patient, compact = true }) {
  // nome pré-preenchido e editável
  const baseName = useMemo(() => sanitize(patient?.name || ""), [patient?.name]);
  const [nome, setNome] = useState(baseName);

  // consultório com “último usado” como padrão (normalizando valores legados)
  const [consultorio, setConsultorio] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(LS_KEY);
      const norm = normalizeConsultorio(saved);
      if (norm === "1" || norm === "2") return norm;
    }
    return "1"; // padrão
  });

  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => setNome(baseName), [baseName]);

  // Sempre persistir apenas “1” ou “2”
  useEffect(() => {
    try { window.localStorage.setItem(LS_KEY, consultorio); } catch {}
  }, [consultorio]);

  const handleCall = async () => {
    setOk(""); setErr("");
    const finalName = sanitize(nome);
    if (!finalName){ setErr("Informe um nome."); return; }
    try{
      setBusy(true);
      // IMPORTANTE: enviamos apenas "1" ou "2" para a TV
      await callOnWebTV({ nome: finalName, sala: consultorio });
      setOk(`Chamado: ${finalName} — Consultório ${consultorio}`);
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
            onChange={(e)=>setConsultorio(normalizeConsultorio(e.target.value))}
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

  // --- fallback completo (se algum dia quiser usar) ---
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
            onChange={(e)=>setConsultorio(normalizeConsultorio(e.target.value))}
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
