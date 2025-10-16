// src/app/api/tv/call/route.js
import { NextResponse } from 'next/server';

/**
 * POST /api/tv/call
 * Body JSON: { name: string, documentId?: string, patientId?: string, calledBy?: string }
 *
 * Encaminha a chamada para o webhook configurado via variáveis de ambiente:
 * - TV_WEBHOOK_URL   (obrigatória)  ex: https://webtv-chi.vercel.app/api/call
 * - TV_WEBHOOK_TOKEN (opcional)     ex: um token/segredo para autenticação no seu admin
 */
export async function POST(req) {
  try {
    const { name, documentId, patientId, calledBy } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ ok: false, error: 'Campo "name" é obrigatório.' }, { status: 400 });
    }

    const url = process.env.TV_WEBHOOK_URL;
    if (!url) {
      return NextResponse.json(
        { ok: false, error: 'Variável de ambiente TV_WEBHOOK_URL não configurada.' },
        { status: 500 }
      );
    }

    const payload = {
      name: name.trim(),
      documentId: documentId || null,
      patientId: patientId || null,
      calledBy: calledBy || 'Medico',
      ts: Date.now(),
      source: 'eyenote-v3',
      version: 1,
    };

    const headers = { 'Content-Type': 'application/json' };
    if (process.env.TV_WEBHOOK_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.TV_WEBHOOK_TOKEN}`;
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      // Se o seu endpoint exigir keepalive/timeout custom, adicione aqui
    });

    const text = await resp.text();
    if (!resp.ok) {
      return NextResponse.json(
        { ok: false, status: resp.status, response: text },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, status: resp.status, response: safeJsonParse(text) });
  } catch (err) {
    console.error('TV call error:', err);
    return NextResponse.json({ ok: false, error: 'Erro interno ao chamar a TV.' }, { status: 500 });
  }
}

function safeJsonParse(text) {
  try { return JSON.parse(text); } catch { return text; }
}
