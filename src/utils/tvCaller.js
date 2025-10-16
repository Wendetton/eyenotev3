// src/utils/tvCaller.js
import { tvDb, serverTimestamp } from "@/lib/firebaseWebTV";
import { collection, addDoc, setDoc, doc } from "firebase/firestore";

// Normaliza o nome e a sala (igual ao padrão do admin)
function clean(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

/**
 * Grava no MESMO esquema que o seu admin:
 * 1) addDoc("calls", { nome, sala, timestamp })
 * 2) setDoc("config/announce", { nome, sala, idle:false, triggeredAt, nonce }, { merge:true })
 */
export async function callOnWebTV({ nome, sala }) {
  const n = clean(nome);
  const r = clean(sala);
  if (!n) throw new Error("Nome obrigatório.");

  // 1) Histórico
  await addDoc(collection(tvDb, "calls"), {
    nome: n,
    sala: r,
    timestamp: serverTimestamp(),
  });

  // 2) Anúncio imediato (sair do logo e falar o nome)
  await setDoc(
    doc(tvDb, "config", "announce"),
    {
      nome: n,
      sala: r,
      idle: false,
      triggeredAt: serverTimestamp(),
      nonce: Date.now() + "-" + Math.random().toString(36).slice(2),
    },
    { merge: true }
  );
}
