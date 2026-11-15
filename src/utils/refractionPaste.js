// Reconhece uma tabela de grau colada do prontuário (uma célula por linha, por tabulação
// ou por espaço) e devolve o texto compacto, no formato da receita:
//   OD  -3.00  -2.75  10°
//   OE  -6.50  -5.00  165°
//   Ad  +2.00
// Devolve null quando o texto não é uma tabela de grau — aí a colagem segue normal.

const RE_OD = /^(olho\s+direito|o\.?\s?d\.?)$/i;
const RE_OE = /^(olho\s+esquerdo|o\.?\s?e\.?)$/i;
const RE_LABEL_PREFIX = /^(olho\s+direito|olho\s+esquerdo|o\.?d\.?|o\.?e\.?)[\s:]+(.+)$/i;
const RE_NUMBER = /^[+-]?\d+(?:[.,]\d+)?\s*°?$/;
const RE_HEADER = /^(esf|esf[ée]rico|cil|cilindro|cil[íi]ndrico|eixo|para\s+perto|\(?ao\)?)\.?$/i;
const RE_ADDITION = /adi[çc][ãa]o\s*:?\s*([+-]?\s?\d+(?:[.,]\d+)?)/i;

export function formatPastedRefraction(text) {
  if (typeof text !== 'string' || !text.trim()) return null;

  // 1) quebra em células
  const cells = [];
  text.split(/[\t\r\n]+/).forEach((raw) => {
    const cell = raw.replace(/ /g, ' ').trim();
    if (!cell) return;
    const m = cell.match(RE_LABEL_PREFIX);
    if (m && !RE_ADDITION.test(cell)) {
      // "Olho Direito -3.00 -2.75 10" na mesma linha
      cells.push(m[1]);
      m[2].split(/\s+/).forEach((t) => t && cells.push(t));
    } else if (/^(?:[+-]?\d+(?:[.,]\d+)?\s*°?\s+)+[+-]?\d+(?:[.,]\d+)?\s*°?$/.test(cell)) {
      // só números separados por espaço
      cell.split(/\s+/).forEach((t) => t && cells.push(t));
    } else {
      cells.push(cell);
    }
  });

  // 2) interpreta
  const eyes = { OD: null, OE: null };
  let addition = null;
  let current = null;
  const leftover = [];

  for (const cell of cells) {
    if (RE_OD.test(cell)) { current = 'OD'; eyes.OD = eyes.OD || []; continue; }
    if (RE_OE.test(cell)) { current = 'OE'; eyes.OE = eyes.OE || []; continue; }
    if (current && RE_NUMBER.test(cell) && eyes[current].length < 3) {
      eyes[current].push(cell.replace(/\s*°$/, ''));
      continue;
    }
    const add = cell.match(RE_ADDITION);
    if (add) { addition = add[1].replace(/\s+/g, ''); current = null; continue; }
    if (RE_HEADER.test(cell)) continue;
    leftover.push(cell);
    current = null;
  }

  // Só é tabela de grau se algum olho veio com pelo menos esférico e cilindro
  const valid = ['OD', 'OE'].some((k) => eyes[k] && eyes[k].length >= 2);
  if (!valid) return null;

  const lines = [];
  ['OD', 'OE'].forEach((k) => {
    const v = eyes[k];
    if (!v || v.length === 0) return;
    const parts = [k, v[0]];
    if (v[1] !== undefined) parts.push(v[1]);
    if (v[2] !== undefined) parts.push(`${v[2]}°`);
    lines.push(parts.join('  '));
  });
  if (addition) lines.push(`Ad  ${/^[+-]/.test(addition) ? addition : `+${addition}`}`);

  // Qualquer outro texto colado junto é preservado abaixo, sem alteração
  return lines.concat(leftover).join('\n');
}
