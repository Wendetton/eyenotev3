// src/utils/tvUtils.js

export function sanitizeName(raw) {
  if (!raw) return '';
  const s = String(raw).replace(/\s+/g, ' ').trim();
  return s.slice(0, 80); // limite para TV
}

/**
 * Envia a chamada para a rota serverless /api/tv/call (proxy para o seu webhook)
 * Retorna { ok: boolean, ... }
 */
export async function callPatientViaApi({ name, documentId, patientId, calledBy }) {
  const body = {
    name: sanitizeName(name),
    documentId: documentId || null,
    patientId: patientId || null,
    calledBy: calledBy || 'Medico',
  };

  const resp = await fetch('/api/tv/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let data = null;
  try { data = await resp.json(); } catch { /* noop */ }

  if (!resp.ok || !data?.ok) {
    const errorMsg = data?.error || 'Falha ao chamar a TV.';
    throw new Error(errorMsg);
  }
  return data;
}
