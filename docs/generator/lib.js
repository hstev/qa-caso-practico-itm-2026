// Utilidades de formato según el Manual de Imagen ITM 2025
const fs = require('fs')
const path = require('path')
const {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, HeadingLevel, ImageRun, LevelFormat, VerticalAlign, TableLayoutType
} = require('docx')

const C = {
  navy: '011C5B', // Pantone 2758 (R1 G28 B91)
  gray: 'C6C6C6', // Cool Gray 3 (R198)
  black: '000000',
  text: '1D1D1B',
  ing1: '102D69', ing2: '00A0B7', ing3: '56ACDE', // Facultad de Ingenierías
  celeste: '29ABE2',
  grayTitle: '7A7A7A',
  light: 'EEF4FA',
  ok: 'E6F4EA', okText: '1E6B34',
  bad: 'FDE8E8', badText: '9B1C1C',
  warn: 'FFF4E0'
}
const F = { title: 'Montserrat', body: 'Arial' }
const CONTENT_W = 9360 // Carta 8.5" con márgenes de 1"

const ROOT = path.resolve(__dirname, '../..')
const rp = (...p) => path.join(ROOT, ...p)

// Texto con **negrita** y `código`
function runs (text, base = {}) {
  const out = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0; let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }))
    const t = m[0]
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }))
    else out.push(new TextRun({ text: t.slice(1, -1), font: 'Consolas', size: (base.size || 22) - 2, color: C.ing1, ...base, ...{ font: 'Consolas' } }))
    last = m.index + t.length
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }))
  return out
}

const P = (text, opts = {}) => new Paragraph({
  children: runs(text, opts.run || {}),
  alignment: opts.align ?? AlignmentType.JUSTIFIED,
  spacing: { after: opts.after ?? 120, line: 300 },
  keepNext: opts.keepNext,
  ...(opts.indent ? { indent: opts.indent } : {})
})
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)], pageBreakBefore: true })
const H1nb = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] })
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] })
const bullet = (t, level = 0) => new Paragraph({ numbering: { reference: 'vinetas', level }, children: runs(t), spacing: { after: 60, line: 288 } })
const num = (t, ref = 'numeros') => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t), spacing: { after: 60, line: 288 } })

const numberingConfig = {
  config: [
    {
      reference: 'vinetas',
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } }, run: { color: C.ing2 } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } }, run: { color: C.ing2 } } }
      ]
    },
    ...['numeros', 'numeros2', 'numeros3', 'numeros4'].map(reference => ({
      reference,
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }]
    }))
  ]
}

const border = { style: BorderStyle.SINGLE, size: 4, color: 'B8C4D6' }
const borders = { top: border, bottom: border, left: border, right: border }

function cell (content, { w, fill, color, bold, align, size = 18, font, vAlign } = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map(c =>
    c instanceof Paragraph
      ? c
      : new Paragraph({ alignment: align ?? AlignmentType.LEFT, spacing: { after: 0, line: 252 }, children: runs(String(c ?? ''), { size, bold, color, ...(font ? { font } : {}) }) })
  )
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders,
    shading: fill ? { fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: vAlign ?? VerticalAlign.CENTER,
    children: paras
  })
}

/** Tabla con encabezado azul institucional. widths en DXA (deben sumar CONTENT_W). */
function table (headers, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0)
  const head = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h, i) => cell(h, { w: widths[i], fill: C.navy, color: 'FFFFFF', bold: true, size: opts.headSize ?? 18, font: F.title }))
  })
  const body = rows.map((r, ri) => new TableRow({
    cantSplit: true,
    children: r.map((v, i) => {
      let fill = ri % 2 ? 'F5F8FC' : undefined
      let color
      const s = String(v)
      if (opts.statusCol === i) {
        if (/^Aprobado|^Pasó|^PASS/.test(s)) { fill = C.ok; color = C.okText }
        if (/^Fallido|^Falló|^FAIL/.test(s)) { fill = C.bad; color = C.badText }
      }
      if (opts.sevCol === i) {
        const map = { Crítico: ['7F1D1D', 'FFFFFF'], Alto: ['F8D7DA', '9B1C1C'], Medio: ['FFF1D6', '8A5300'], Bajo: ['E3F1FB', C.ing1] }
        const k = Object.keys(map).find(k => s.startsWith(k))
        if (k) { fill = map[k][0]; color = map[k][1] }
      }
      return cell(v, { w: widths[i], fill, color, size: opts.size ?? 18, bold: (opts.statusCol === i || opts.sevCol === i) ? true : undefined })
    })
  }))
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, rows: [head, ...body] })
}

/** Tabla clave/valor (fichas de casos de prueba y defectos) */
function kv (pairs, { keyW = 2300, title, statusKey } = {}) {
  const KN = pairs.length <= 14
  const w2 = CONTENT_W - keyW
  const rows = []
  if (title) {
    rows.push(new TableRow({
      cantSplit: true,
      children: [new TableCell({
        columnSpan: 2, width: { size: CONTENT_W, type: WidthType.DXA }, borders,
        shading: { fill: C.navy, type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ keepNext: true, spacing: { after: 0 }, children: [new TextRun({ text: title, bold: true, color: 'FFFFFF', font: F.title, size: 20 })] })]
      })]
    }))
  }
  pairs.forEach(([k, v], idx) => {
    const keep = KN && idx < pairs.length - 1
    let fill; let color
    if (k === statusKey) {
      if (/^Aprobado/.test(v)) { fill = C.ok; color = C.okText }
      if (/^Fallido/.test(v)) { fill = C.bad; color = C.badText }
    }
    const mk = (x, o = {}) => new Paragraph({ keepNext: keep, spacing: { after: 20, line: 252 }, children: runs(String(x), { size: 18, ...o }) })
    const content = Array.isArray(v) ? v.map(x => mk(x)) : [mk(v, { bold: fill ? true : undefined, color })]
    rows.push(new TableRow({
      cantSplit: true,
      children: [
        cell([mk(k, { bold: true, color: C.ing1 })], { w: keyW, fill: C.light }),
        cell(content, { w: w2, fill })
      ]
    }))
  })
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [keyW, w2], layout: TableLayoutType.FIXED, rows })
}

let figN = 0; let tabN = 0
function pngSize (file) {
  const b = fs.readFileSync(file)
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}
/** Figura numerada con pie de figura. widthIn en pulgadas. */
function figure (file, caption, widthIn = 6.2, maxHeightIn = 7.6) {
  const abs = rp(file)
  if (!fs.existsSync(abs)) return [P(`[Figura no disponible: ${file}]`)]
  const { w, h } = pngSize(abs)
  let wi = widthIn; let hi = wi * h / w
  if (hi > maxHeightIn) { hi = maxHeightIn; wi = hi * w / h }
  figN++
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(abs), transformation: { width: Math.round(wi * 96), height: Math.round(hi * 96) }, altText: { title: caption, description: caption, name: path.basename(file) } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Figura ${figN}. `, bold: true, size: 18, color: C.ing1 }), new TextRun({ text: caption, italics: true, size: 18, color: '444444' }), new TextRun({ text: `  Fuente: ${file}`, size: 14, color: '888888' })] })
  ]
}
const tcap = (caption) => {
  tabN++
  return new Paragraph({ keepNext: true, spacing: { before: 160, after: 80 }, children: [new TextRun({ text: `Tabla ${tabN}. `, bold: true, size: 18, color: C.ing1 }), new TextRun({ text: caption, italics: true, size: 18, color: '444444' })] })
}
const gap = (after = 120) => new Paragraph({ spacing: { after }, children: [] })

/** Recuadro destacado (nota) */
function note (text, { fill = C.light, bar = C.ing2, label = 'Nota' } = {}) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { fill, type: ShadingType.CLEAR, color: 'auto' },
        borders: { left: { style: BorderStyle.SINGLE, size: 24, color: bar }, top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
        margins: { top: 100, bottom: 100, left: 180, right: 160 },
        children: [new Paragraph({ spacing: { after: 0, line: 276 }, children: [new TextRun({ text: label + ': ', bold: true, color: bar, size: 20 }), ...runs(text, { size: 20 })] })]
      })]
    })]
  })
}

module.exports = { C, F, CONTENT_W, rp, runs, P, H1, H1nb, H2, H3, bullet, num, numberingConfig, table, kv, figure, tcap, gap, note, cell, borders }
