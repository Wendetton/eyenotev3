'use client';

/**
 * SELETOR TIPO REFRATOR (experimental)
 * ------------------------------------------------------------------------------------------
 * Alternativa ao EyeForm de listas, inspirada no refrator de Greens:
 *   - Esférico e Cilindro: rodas serrilhadas que se gira com o dedo (15° = um passo de 0,25),
 *     com janela de leitura (negativo em vermelho). Toque em "−" / "+" na tampa = um passo.
 *   - Eixo: transferidor de 0° a 180° (toque ou arraste; passo de 5°).
 *
 * É um substituto direto do EyeForm: recebe as mesmas props e grava os mesmos valores, no mesmo
 * formato ("-3.00", "0.00", "165"), pelo mesmo onFieldChange. O box tem a mesma altura do atual.
 *
 * PARA REMOVER: apague este arquivo e, em src/app/doc/[docId]/page.js, os trechos marcados com
 * "REFRATOR (experimental)".
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Altura da área de controles = altura dos três campos de lista do EyeForm atual.
const AREA_HEIGHT = 233;
const GAP = 8;
const STEP_DEG = 15;       // giro necessário para um passo
const COMMIT_MS = 150;     // intervalo mínimo entre gravações enquanto gira

const C = {
  body: '#1d2026', cap: '#2b3038', knurl: '#cfd4dc', knurlEdge: '#8d95a3', drum: '#f6f2e6',
  plus: '#15171b', minus: '#c5202e', mark: '#e11d48', track: '#f6f7fa', line: '#dfe3ea',
  tick: '#9aa4b5', ink: '#1f2733', muted: '#667085',
};

const toNumber = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const fmtPower = (v) => {
  const s = Math.abs(v).toFixed(2);
  return v > 0 ? `+${s}` : v < 0 ? `-${s}` : '0.00';
};
// Mesmo formato dos <option value> do EyeForm
const powerToStored = (v) => (Object.is(v, -0) || v === 0 ? '0.00' : v.toFixed(2));

/** Grava com intervalo mínimo enquanto o dedo está girando; flush() grava o último valor na hora. */
function useThrottledCommit(onCommit) {
  const cbRef = useRef(onCommit);
  cbRef.current = onCommit;
  const timerRef = useRef(null);
  const pendingRef = useRef(undefined);
  const lastSentRef = useRef(undefined);

  const send = (v) => {
    if (v === lastSentRef.current) return;
    lastSentRef.current = v;
    cbRef.current(v);
  };
  const commit = (v) => {
    if (timerRef.current) { pendingRef.current = v; return; }
    send(v);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (pendingRef.current !== undefined) {
        const p = pendingRef.current;
        pendingRef.current = undefined;
        commit(p);
      }
    }, COMMIT_MS);
  };
  const flush = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (pendingRef.current !== undefined) {
      const p = pendingRef.current;
      pendingRef.current = undefined;
      send(p);
    }
    lastSentRef.current = undefined;
  };
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return { commit, flush };
}

/* ------------------------------ Roda serrilhada ------------------------------ */
function PowerKnob({ id, label, short, value, min, max, step, size, onChange }) {
  const svgRef = useRef(null);
  const gesture = useRef(null);            // { lastAngle, acc, turned, startX, startY, inCap }
  const [live, setLive] = useState(null);  // valor enquanto o dedo gira
  const [acc, setAcc] = useState(0);       // giro ainda não convertido em passo (para o desenho)
  const [turning, setTurning] = useState(false);
  const { commit, flush } = useThrottledCommit(onChange);

  const shown = live !== null ? live : value;
  const stepsFromMin = Math.round((shown - min) / step);
  const snap = (v) => clamp(+(Math.round(v / step) * step).toFixed(2), min, max);

  const geometry = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height * 0.52);
    return { x, y, dist: Math.hypot(x, y), radius: r.width / 2 };
  };

  const onPointerDown = (e) => {
    if (e.button) return;
    e.preventDefault();
    try { svgRef.current.setPointerCapture(e.pointerId); } catch {}
    const g = geometry(e);
    gesture.current = {
      lastAngle: g.dist < g.radius * 0.24 ? null : Math.atan2(g.y, g.x) * 180 / Math.PI,
      acc: 0, turned: false, startX: e.clientX, startY: e.clientY,
      inCap: g.dist < g.radius * 0.74, side: g.x < 0 ? -1 : 1, value: shown,
    };
    setTurning(true);
  };

  const onPointerMove = (e) => {
    const s = gesture.current;
    if (!s) return;
    if (!s.turned && Math.hypot(e.clientX - s.startX, e.clientY - s.startY) < 8) return;
    const g = geometry(e);
    if (g.dist < g.radius * 0.24) return;                 // perto do centro o ângulo é instável
    const a = Math.atan2(g.y, g.x) * 180 / Math.PI;       // cresce no sentido horário
    if (s.lastAngle === null) { s.lastAngle = a; return; }
    let d = a - s.lastAngle;
    if (d > 180) d -= 360; else if (d < -180) d += 360;
    s.lastAngle = a;
    s.turned = true;
    s.acc += d;
    let v = s.value;
    while (s.acc >= STEP_DEG) { s.acc -= STEP_DEG; v = snap(v + step); }
    while (s.acc <= -STEP_DEG) { s.acc += STEP_DEG; v = snap(v - step); }
    if ((s.acc > 0 && v >= max) || (s.acc < 0 && v <= min)) s.acc = 0;   // no limite não "enrola"
    if (v !== s.value) { s.value = v; setLive(v); commit(v); }
    setAcc(s.acc);
  };

  const finish = (e, cancelled) => {
    const s = gesture.current;
    if (!s) return;
    gesture.current = null;
    if (!cancelled && !s.turned && s.inCap) {
      // toque simples na tampa: lado esquerdo = um passo a menos, lado direito = um passo a mais
      const v = snap(s.value + s.side * step);
      if (v !== s.value) commit(v);
    }
    flush();
    setLive(null); setAcc(0); setTurning(false);
  };

  const onKeyDown = (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const v = snap(value + d * step);
    if (v !== value) { commit(v); flush(); }
  };

  const slot = (k) => {
    const v = +(shown + k * step).toFixed(2);
    return v < min || v > max ? null : v;
  };
  const clipId = `clip-${id}`;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={shown}
      aria-valuetext={fmtPower(shown)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
      onKeyDown={onKeyDown}
      style={{ touchAction: 'none', cursor: turning ? 'grabbing' : 'grab', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', flex: '0 0 auto', display: 'block' }}
    >
      <defs>
        <clipPath id={clipId}><rect x="40" y="62" width="120" height="84" rx="10" /></clipPath>
      </defs>
      <circle cx="100" cy="104" r="93" fill={C.body} />
      <g transform={`rotate(${(stepsFromMin * STEP_DEG + acc).toFixed(1)} 100 104)`}>
        <circle cx="100" cy="104" r="83" fill="none" stroke={turning ? '#ffffff' : C.knurl} strokeWidth="14" strokeDasharray="2.4 2.816" />
        <circle cx="100" cy="21" r="4.5" fill={C.body} />
      </g>
      <circle cx="100" cy="104" r="75.5" fill="none" stroke={C.knurlEdge} strokeWidth="1.5" />
      <circle cx="100" cy="104" r="74.5" fill={C.cap} stroke={C.body} strokeWidth="2" />
      <path d="M 100 17 L 91 2 L 109 2 Z" fill={C.mark} />
      <rect x="40" y="62" width="120" height="84" rx="10" fill={C.drum} stroke={C.body} strokeWidth="2" />
      <g clipPath={`url(#${clipId})`}>
        <g transform={`translate(0 ${(-(acc / STEP_DEG) * 27).toFixed(1)})`} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {[-1, 0, 1].map((k) => {
            const v = slot(k);
            if (v === null) return null;
            return (
              <text
                key={k}
                x="100"
                y={k === 0 ? 116 : k < 0 ? 82 : 141}
                fontSize={k === 0 ? 37 : 17}
                fontWeight="700"
                fill={v < 0 ? C.minus : C.plus}
                opacity={k === 0 ? 1 : 0.38}
              >
                {fmtPower(v)}
              </text>
            );
          })}
        </g>
      </g>
      <g fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" textAnchor="middle" fill={C.knurl}>
        <text x="58" y="168" fontSize="20">−</text>
        <text x="100" y="166" fontSize="11" letterSpacing="1.6">{short}</text>
        <text x="142" y="169" fontSize="20">+</text>
      </g>
    </svg>
  );
}

/* ------------------------------ Transferidor do eixo ------------------------------ */
// 0° à direita, 90° em cima, 180° à esquerda
const DW = 340, DH = 178, CX = 170, CY = 160, R = 130;
const polar = (deg, r) => {
  const a = deg * Math.PI / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
};
const DIAL_MARKS = (() => {
  const out = [];
  for (let d = 0; d <= 180; d += 5) {
    const major = d % 30 === 0;
    const [x1, y1] = polar(d, R);
    const [x2, y2] = polar(d, R - (major ? 16 : 8));
    const [tx, ty] = polar(d, R + 14);
    out.push({ d, major, x1, y1, x2, y2, tx, ty });
  }
  return out;
})();

function AxisDial({ label, value, width, height, onChange }) {
  const svgRef = useRef(null);
  const dragging = useRef(false);
  const [live, setLive] = useState(null);
  const { commit, flush } = useThrottledCommit(onChange);
  const shown = live !== null ? live : value;

  const angleAt = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    // o desenho fica centralizado (preserveAspectRatio padrão): converte para as coordenadas do viewBox
    const scale = Math.min(r.width / DW, r.height / DH);
    const x = (e.clientX - (r.left + (r.width - DW * scale) / 2)) / scale;
    const y = (e.clientY - (r.top + (r.height - DH * scale) / 2)) / scale;
    let deg = Math.atan2(CY - y, x - CX) * 180 / Math.PI;
    if (deg < 0) deg = x < CX ? 180 : 0;
    return clamp(Math.round(deg / 5) * 5, 0, 180);
  };
  const apply = (e) => { const v = angleAt(e); setLive(v); commit(v); };

  const [hx, hy] = polar(shown, R - 22);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${DW} ${DH}`}
      width={width}
      height={height}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={180}
      aria-valuenow={shown}
      onPointerDown={(e) => {
        if (e.button) return;
        e.preventDefault();
        try { svgRef.current.setPointerCapture(e.pointerId); } catch {}
        dragging.current = true;
        apply(e);
      }}
      onPointerMove={(e) => { if (dragging.current) apply(e); }}
      onPointerUp={() => { dragging.current = false; flush(); setLive(null); }}
      onPointerCancel={() => { dragging.current = false; flush(); setLive(null); }}
      onKeyDown={(e) => {
        const d = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? 5 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? -5 : 0;
        if (!d) return;
        e.preventDefault();
        const v = clamp(value + d, 0, 180);
        if (v !== value) { commit(v); flush(); }
      }}
      style={{ touchAction: 'none', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', flex: '0 0 auto', display: 'block' }}
    >
      <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY} Z`} fill={C.track} stroke={C.line} strokeWidth="1.5" />
      {DIAL_MARKS.map((m) => (
        <g key={m.d}>
          <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke={m.major ? C.ink : C.tick} strokeWidth={m.major ? 2 : 1.5} />
          {m.major && (
            <text x={m.tx} y={m.ty + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={C.muted} fontFamily="Arial, Helvetica, sans-serif">{m.d}</text>
          )}
        </g>
      ))}
      <text x="2" y="14" fontSize="12" fontWeight="700" fill={C.muted} fontFamily="Arial, Helvetica, sans-serif" letterSpacing="1.4">EIXO</text>
      <text x={DW - 2} y="28" textAnchor="end" fontSize="30" fontWeight="700" fill={C.ink} fontFamily="Arial, Helvetica, sans-serif" style={{ fontVariantNumeric: 'tabular-nums' }}>{shown}°</text>
      <line x1={CX} y1={CY} x2={hx} y2={hy} stroke={C.mark} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={hx} cy={hy} r="9" fill={C.mark} />
      <circle cx={CX} cy={CY} r="5" fill={C.ink} />
    </svg>
  );
}

/* ------------------------------ Box do olho ------------------------------ */
export default function RefractorEyeForm({ eyeLabel, eyeData, eyeKey, onFieldChange, colorClass }) {
  const areaRef = useRef(null);
  const [areaWidth, setAreaWidth] = useState(0);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => setAreaWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Aproveita o box: duas rodas lado a lado em cima, transferidor embaixo.
  const DIAL_MIN = 88;
  const knob = Math.floor(clamp(Math.min((areaWidth - GAP) / 2, AREA_HEIGHT - GAP - DIAL_MIN), 60, 190));
  const dialH = AREA_HEIGHT - GAP - knob;
  const dialW = Math.floor(Math.min(areaWidth, dialH * (DW / DH)));

  const esf = toNumber(eyeData?.esf);
  const cil = toNumber(eyeData?.cil);
  const eixo = Math.round(toNumber(eyeData?.eixo));

  return (
    <div className={`bg-white p-6 rounded-lg shadow-lg border-t-4 ${colorClass}`}>
      <h2 className="text-xl font-semibold mb-4 text-gray-700">{eyeLabel}</h2>
      <div ref={areaRef} style={{ height: AREA_HEIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
        {areaWidth > 0 && (
          <>
            <div style={{ display: 'flex', gap: GAP, justifyContent: 'space-evenly', width: '100%' }}>
              <PowerKnob
                id={`${eyeKey}-esf`} label={`${eyeLabel} — Esférico`} short="ESF"
                value={esf} min={-30} max={30} step={0.25} size={knob}
                onChange={(v) => onFieldChange(`${eyeKey}.esf`, powerToStored(v))}
              />
              <PowerKnob
                id={`${eyeKey}-cil`} label={`${eyeLabel} — Cilindro`} short="CIL"
                value={cil} min={-10} max={0} step={0.25} size={knob}
                onChange={(v) => onFieldChange(`${eyeKey}.cil`, powerToStored(v))}
              />
            </div>
            <AxisDial
              label={`${eyeLabel} — Eixo`} value={clamp(eixo, 0, 180)} width={dialW} height={dialH}
              onChange={(v) => onFieldChange(`${eyeKey}.eixo`, String(v))}
            />
          </>
        )}
      </div>
    </div>
  );
}
