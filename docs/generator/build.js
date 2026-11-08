// Generador del informe "Caso Práctico Final" (Aseguramiento de la Calidad - ITM 2026)
// Lee los resultados reales de reports/ y produce docs/Informe-Caso-Practico-QA-ITM-2026.docx
const fs = require('fs')
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, HeadingLevel, ImageRun, Header, Footer, PageNumber, TableOfContents, VerticalAlign,
  HeightRule, TableLayoutType, PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
  PageBreak, ExternalHyperlink
} = require('docx')
const L = require('./lib')
const { C, F, CONTENT_W, rp, P, H1, H2, H3, bullet, num, table, kv, figure, tcap, gap, note } = L

const J = (p) => JSON.parse(fs.readFileSync(rp(p), 'utf8'))
const REPO = 'https://github.com/hstev/qa-caso-practico-itm-2026'

// ---------------- Datos reales ----------------
const pw = J('reports/playwright/results.json')
const k6 = J('reports/k6/k6-summary.json')
const k6s = J('reports/k6/k6-estres-summary.json')
const sonar = Object.fromEntries(J('reports/sonar/metricas.json').component.measures.map(m => [m.metric, m.value]))
const zapFull = J('reports/zap/zap-full-report.json')
const zapBase = J('reports/zap/zap-baseline.json')

const pwTests = []
;(function walk (s) {
  for (const sp of s.specs || []) for (const t of sp.tests) {
    const r = t.results[t.results.length - 1]
    const ann = (t.annotations || []).map(a => a.description).filter(Boolean)
    pwTests.push({ title: sp.title, project: t.projectName, status: r.status, ms: r.duration, ann, err: ((r.error || {}).message || '').split('\n')[0] })
  }
  for (const c of s.suites || []) walk(c)
})({ suites: pw.suites })
const pwStats = pw.stats
const pwPassed = pwTests.filter(t => t.status === 'passed').length
const pwFailed = pwTests.length - pwPassed
const byPrefix = (p) => pwTests.filter(t => t.title.startsWith(p))

const ratingL = (v) => ({ '1.0': 'A', '2.0': 'B', '3.0': 'C', '4.0': 'D', '5.0': 'E' }[v] || v)
const fmt = (n, d = 2) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: 0 })
const ms = (v) => v >= 1000 ? `${fmt(v / 1000, 2)} s` : `${fmt(v, 2)} ms`

const zapAlerts = (rep) => rep.site.flatMap(s => s.alerts).sort((a, b) => b.riskcode - a.riskcode)
const riskEs = { 3: 'Alto', 2: 'Medio', 1: 'Bajo', 0: 'Informativo' }
const confEs = { 'High': 'Alta', 'Medium': 'Media', 'Low': 'Baja', 'Confirmed': 'Confirmada' }

// ---------------- Casos manuales ----------------
const manual = [
  { id: 'CP-01', nombre: 'Inicio de sesión con credenciales válidas', req: 'RF01', tec: 'Partición de equivalencia (clase válida)', obj: 'Verificar que un usuario registrado accede al sistema.', pre: 'Usuario registrado con contraseña Itm2026*. Juice Shop en ejecución.', datos: 'Correo válido registrado; contraseña Itm2026*', pasos: ['Abrir /#/login.', 'Digitar correo y contraseña.', 'Pulsar «Iniciar sesión».', 'Abrir el menú «Cuenta».'], esp: 'Redirección al catálogo (/search) y el menú de cuenta muestra el correo del usuario.', obt: 'Redirige al catálogo (/search) y el menú «Cuenta» muestra el correo del usuario registrado.', estado: 'Aprobado', img: ['CP-01-b-sesion-iniciada'] },
  { id: 'CP-02', nombre: 'Inicio de sesión con correo de formato inválido', req: 'RF01', tec: 'Partición de equivalencia (clase inválida)', obj: 'Verificar el rechazo de credenciales con formato de correo inválido.', pre: 'Ninguna.', datos: 'Correo «usuario.itm» (sin @); contraseña Itm2026*', pasos: ['Abrir /#/login.', 'Digitar los datos.', 'Pulsar «Iniciar sesión».'], esp: 'No se inicia sesión; se muestra un mensaje de error genérico (sin revelar si el usuario existe).', obt: 'No se inicia sesión; se muestra «Invalid email or password.» (en inglés) y se permanece en /login.', estado: 'Aprobado', img: ['CP-02-login-email-invalido'] },
  { id: 'CP-03', nombre: 'Registro con contraseñas que no coinciden', req: 'RF02', tec: 'Tabla de decisión (contraseña = repetición)', obj: 'Validar la regla de confirmación de contraseña.', pre: 'Ninguna.', datos: 'Contraseña Itm2026*; repetición Itm2026#', pasos: ['Abrir /#/register.', 'Diligenciar todos los campos con contraseñas distintas.'], esp: 'Mensaje «Las contraseñas no coinciden» y botón «Registrar» deshabilitado.', obt: 'Se muestra «Las contraseñas no coinciden» y el botón «Registrar» queda deshabilitado.', estado: 'Aprobado', img: ['CP-03-registro-no-coinciden'] },
  { id: 'CP-04', nombre: 'Registro con correo inválido', req: 'RF02', tec: 'Partición de equivalencia (clase inválida)', obj: 'Validar el formato de correo en el registro.', pre: 'Ninguna.', datos: 'Correo «correo@»', pasos: ['Abrir /#/register.', 'Diligenciar el formulario con el correo inválido.'], esp: 'Mensaje de correo no válido y botón «Registrar» deshabilitado.', obt: 'Se muestra «La dirección de correo no es válida.» y el botón «Registrar» queda deshabilitado.', estado: 'Aprobado', img: ['CP-04-registro-email-invalido'] },
  { id: 'CP-05', nombre: 'Longitud del comentario de opinión (159/160/161)', req: 'RF05', tec: 'Valores límite (máx. 160)', obj: 'Verificar que la UI limita el comentario a 160 caracteres.', pre: 'Ninguna.', datos: 'Cadenas de 159, 160 y 161 caracteres', pasos: ['Abrir /#/contact.', 'Escribir cada cadena en «Comentario».', 'Observar el contador y el valor aceptado.'], esp: '159 y 160 se aceptan completos; 161 se trunca a 160.', obt: '159 y 160 caracteres se aceptan completos; con 161 el campo conserva solo 160 (contador 160/160).', estado: 'Aprobado', img: ['CP-05-feedback-161'] },
  { id: 'CP-06', nombre: 'Envío de opinión sin y con calificación', req: 'RF05', tec: 'Tabla de decisión (comentario, CAPTCHA, calificación)', obj: 'Verificar que la calificación es obligatoria.', pre: 'Ninguna.', datos: 'Comentario válido; CAPTCHA resuelto; calificación: ninguna y luego 5', pasos: ['Abrir /#/contact.', 'Diligenciar comentario y CAPTCHA sin calificación.', 'Asignar 5 estrellas.', 'Enviar.'], esp: 'Sin calificación el botón «Enviar» está deshabilitado; con 5 estrellas se habilita y la opinión se registra.', obt: 'Sin calificación el botón «Enviar» está deshabilitado; con 5 estrellas se habilita y la opinión se envía.', estado: 'Aprobado', img: ['CP-06-a-sin-calificacion', 'CP-06-b-calificacion-5'] },
  { id: 'CP-07', nombre: 'Límite de 5 unidades por producto en la canasta', req: 'RF04 / RNF03', tec: 'Valores límite (5 válido, 6 inválido)', obj: 'Verificar el límite de compra y la claridad del mensaje.', pre: 'Usuario autenticado con 1 unidad de «Jugo de manzana (1000ml)» en la canasta; interfaz en español.', datos: 'Incrementos sucesivos de 1 a 6 unidades', pasos: ['Abrir la canasta.', 'Pulsar «+» cinco veces.', 'Observar cantidad y mensajes.'], esp: 'La cantidad se detiene en 5 y se muestra un mensaje en español indicando el límite.', obt: 'La cantidad se detiene en 5 unidades, pero el mensaje se muestra en inglés: «You can order only up to 5 items of this product.»', estado: 'Fallido', def: 'DEF-12', img: ['CP-07-canasta-limite'] },
  { id: 'CP-08', nombre: 'Teléfono de la dirección (valores límite)', req: 'RF06', tec: 'Valores límite (1111111 – 9999999999)', obj: 'Verificar el rango numérico del teléfono.', pre: 'Usuario autenticado; formulario /#/address/create con los demás campos válidos.', datos: '1111110, 1111111, 9999999999, 10000000000', pasos: ['Digitar cada valor en «Número de teléfono».', 'Observar el estado del botón «Enviar».'], esp: '1111110 y 10000000000 rechazados; 1111111 y 9999999999 aceptados.', obt: '1111110 rechazado; 1111111 aceptado; 9999999999 aceptado; 10000000000 rechazado.', estado: 'Aprobado', img: ['CP-08-telefono-1111110', 'CP-08-telefono-10000000000'] },
  { id: 'CP-09', nombre: 'Código postal (valores límite)', req: 'RF06', tec: 'Valores límite (máx. 8)', obj: 'Verificar la longitud máxima del código postal.', pre: 'Usuario autenticado; formulario de dirección con los demás campos válidos.', datos: '12345678 (8) y 123456789 (9)', pasos: ['Digitar cada valor en «Código postal».', 'Observar validación y botón.'], esp: '8 caracteres aceptado; 9 caracteres rechazado.', obt: '8 caracteres: aceptado (botón habilitado). 9 caracteres: rechazado (botón deshabilitado).', estado: 'Aprobado', img: ['CP-09-zip-9'] },
  { id: 'CP-10', nombre: 'Búsqueda con contenido HTML/JavaScript (XSS)', req: 'RNF02', tec: 'Prueba exploratoria de seguridad (OWASP)', obj: 'Verificar que la búsqueda neutraliza contenido activo.', pre: 'Ninguna.', datos: 'Cadena de prueba XSS estándar (etiqueta embebida que invoca alert); ver evidence/manuales.spec.ts', pasos: ['Ingresar la cadena en el buscador.', 'Observar si el navegador ejecuta código.'], esp: 'El término se muestra como texto plano; no se ejecuta ningún script.', obt: 'El navegador ejecutó el script inyectado (se abrió un diálogo «XSS-ITM»).', estado: 'Fallido', def: 'DEF-03', img: ['CP-10-xss-busqueda'] },
  { id: 'CP-11', nombre: 'Acceso anónimo al directorio /ftp', req: 'RNF02', tec: 'Prueba exploratoria de seguridad (control de acceso)', obj: 'Verificar que no se exponen archivos internos.', pre: 'Sin sesión iniciada.', datos: 'URL /ftp', pasos: ['Navegar a /ftp sin autenticación.'], esp: 'Acceso denegado (401/403/404).', obt: 'Se muestra un listado público de 13 entradas, entre ellas acquisitions.md, coupons_2013.md.bak y encrypt.pyc.', estado: 'Fallido', def: 'DEF-04', img: ['CP-11-ftp'] },
  { id: 'CP-12', nombre: 'Usabilidad en móvil (375 px) e idioma', req: 'RNF03', tec: 'Prueba de usabilidad / responsive', obj: 'Verificar que la interfaz se adapta a móviles y se presenta en español.', pre: 'Idioma español seleccionado.', datos: 'Viewport 375×812', pasos: ['Abrir el catálogo con viewport móvil.', 'Revisar desbordamiento y navegación.'], esp: 'Sin desplazamiento horizontal; menú colapsado disponible; textos en español.', obt: 'Sin desplazamiento horizontal; menú colapsado visible; textos de la interfaz en español.', estado: 'Aprobado', img: ['CP-12-movil'] }
]

// ---------------- Casos automatizados ----------------
const auto = [
  { id: 'TA-01', p: 'TA-01', nombre: 'Login exitoso (UI)', req: 'RF01', tec: 'PE clase válida', datos: 'Usuario creado por API', esp: 'Redirección a /search y correo visible en menú' },
  { id: 'TA-02', p: 'TA-02', nombre: 'Login rechazado (UI)', req: 'RF01', tec: 'PE clase inválida', datos: 'Usuario inexistente', esp: 'Mensaje de error y permanece en /login' },
  { id: 'TA-03', p: 'TA-03', nombre: 'Botón login deshabilitado sin datos', req: 'RF01', tec: 'PE clase inválida', datos: 'Campos vacíos / solo correo', esp: 'Botón deshabilitado' },
  { id: 'TA-04', p: 'TA-04', nombre: 'Contraseña de registro 4/5/40/41 (UI)', req: 'RF02', tec: 'Valores límite', datos: '4, 5, 40, 41 caracteres', esp: '4 y 41 rechazadas; 5 y 40 aceptadas' },
  { id: 'TA-05', p: 'TA-05', nombre: 'Registro completo (UI)', req: 'RF02', tec: 'PE clase válida', datos: 'Datos válidos', esp: 'Redirección a /login' },
  { id: 'TA-06', p: 'TA-06', nombre: 'Búsqueda con resultados (UI)', req: 'RF03', tec: 'PE clase válida', datos: 'q=apple', esp: 'Al menos un producto' },
  { id: 'TA-07', p: 'TA-07', nombre: 'Búsqueda sin resultados (UI)', req: 'RF03', tec: 'PE clase inválida', datos: 'Término inexistente', esp: 'Cero productos' },
  { id: 'TA-08', p: 'TA-08', nombre: 'Agregar a la canasta (UI)', req: 'RF04', tec: 'Flujo E2E', datos: 'Apple Juice', esp: 'Producto listado en la canasta' },
  { id: 'TA-09', p: 'TA-09', nombre: 'Cantidad 1/5/6 en canasta (API)', req: 'RF04', tec: 'Valores límite', datos: 'quantity = 1, 5, 6', esp: '200, 200, 400' },
  { id: 'TA-10', p: 'TA-10', nombre: 'Calificación 0/1/5/6 (API)', req: 'RF05', tec: 'Valores límite', datos: 'rating = 0, 1, 5, 6', esp: '0 y 6 rechazadas (≥400); 1 y 5 aceptadas (201)' },
  { id: 'TA-11', p: 'TA-11', nombre: 'Comentario 160/161 (API)', req: 'RF05', tec: 'Valores límite', datos: '160 y 161 caracteres', esp: '160 aceptado; 161 rechazado' },
  { id: 'TA-12', p: 'TA-12', nombre: 'Login resiste inyección SQL (API)', req: 'RNF02', tec: 'Seguridad (OWASP A05:2025)', datos: 'Correo con metacaracteres SQL', esp: 'HTTP 401' },
  { id: 'TA-13', p: 'TA-13', nombre: 'Servidor rechaza contraseña de 4 (API)', req: 'RF02/RNF02', tec: 'Valores límite (servidor)', datos: 'Contraseña de 4 caracteres', esp: 'HTTP ≥400' },
  { id: 'TA-14', p: 'TA-14', nombre: '/api/Users exige autenticación (API)', req: 'RNF02', tec: 'Control de acceso', datos: 'Sin token', esp: 'HTTP 401' },
  { id: 'TA-15', p: 'TA-15', nombre: 'Búsqueda < 3 s (API)', req: 'RNF01', tec: 'Rendimiento', datos: 'q=juice', esp: 'HTTP 200 en < 3000 ms' }
].map(a => {
  const ex = byPrefix(a.p)
  const pass = ex.filter(t => t.status === 'passed').length
  const fails = ex.filter(t => t.status !== 'passed')
  let obt = `${pass}/${ex.length} ejecuciones conformes`
  if (a.id === 'TA-10') obt = 'rating 0 → 201 y rating 6 → 201 (aceptadas); 1 y 5 → 201'
  if (a.id === 'TA-11') obt = '160 → 201; 161 → 201 (aceptado)'
  if (a.id === 'TA-12') obt = 'HTTP 200 con token JWT del usuario id 1 (administrador)'
  if (a.id === 'TA-13') obt = 'HTTP 201: usuario creado'
  if (a.id === 'TA-09') obt = '200, 200, 400 «You can order only up to 5 items…»'
  if (a.id === 'TA-15') obt = `HTTP 200 en ${(ex[0]?.ann || [])[0] || '?'} ms`
  return { ...a, n: ex.length, pass, estado: fails.length ? 'Fallido' : 'Aprobado', obt, ms: ex.reduce((s, t) => s + t.ms, 0) }
})

// ---------------- Defectos ----------------
const defects = [
  { id: 'DEF-01', titulo: 'Inyección SQL en inicio de sesión permite autenticarse como administrador sin contraseña', sev: 'Crítico', pri: 'P1', comp: 'routes/login.ts (POST /rest/user/login)', owasp: 'A05:2025 Injection', ev: 'TA-12; Figura de detalle TA-12', estado: 'Abierto' },
  { id: 'DEF-02', titulo: 'Clave privada RSA de firma JWT y credenciales embebidas en el código fuente', sev: 'Crítico', pri: 'P1', comp: 'lib/insecurity.ts', owasp: 'A04:2025 Cryptographic Failures', ev: 'SonarQube secrets:S6706, typescript:S6437', estado: 'Abierto' },
  { id: 'DEF-03', titulo: 'XSS basado en DOM en el término de búsqueda', sev: 'Alto', pri: 'P1', comp: 'frontend search-result (bypassSecurityTrustHtml)', owasp: 'A05:2025 Injection', ev: 'CP-10; SonarQube typescript:S6268', estado: 'Abierto' },
  { id: 'DEF-04', titulo: 'Directorio /ftp con documentos internos y copias de respaldo accesible sin autenticación', sev: 'Alto', pri: 'P1', comp: 'routes/fileServer.ts, server.ts', owasp: 'A01:2025 Broken Access Control', ev: 'CP-11', estado: 'Abierto' },
  { id: 'DEF-05', titulo: 'Posible inyección SQL en el parámetro q de /rest/products/search', sev: 'Alto', pri: 'P1', comp: 'routes/search.ts', owasp: 'A05:2025 Injection', ev: 'ZAP 40018 (escaneo activo)', estado: 'Abierto' },
  { id: 'DEF-06', titulo: 'El servicio se detiene por agotamiento de memoria (heap) bajo tráfico de escaneo automatizado', sev: 'Alto', pri: 'P2', comp: 'Proceso Node.js (servidor)', owasp: 'A10:2025 Mishandling of Exceptional Conditions', ev: 'juice-shop-oom-crash.log (exit 139)', estado: 'Abierto (mitigado en laboratorio)' },
  { id: 'DEF-07', titulo: 'El servidor acepta contraseñas de 4 caracteres (regla 5–40 solo en el cliente)', sev: 'Alto', pri: 'P2', comp: 'POST /api/Users', owasp: 'A07:2025 Authentication Failures', ev: 'TA-13', estado: 'Abierto' },
  { id: 'DEF-08', titulo: 'El servidor acepta calificaciones fuera del rango 1–5 (0 y 6)', sev: 'Medio', pri: 'P2', comp: 'models/feedback.ts, POST /api/Feedbacks', owasp: 'A06:2025 Insecure Design', ev: 'TA-10', estado: 'Abierto' },
  { id: 'DEF-09', titulo: 'El servidor acepta comentarios de más de 160 caracteres', sev: 'Medio', pri: 'P3', comp: 'POST /api/Feedbacks', owasp: 'A06:2025 Insecure Design', ev: 'TA-11', estado: 'Abierto' },
  { id: 'DEF-10', titulo: 'Ausencia de cabeceras de seguridad (CSP, COEP) y CORS permisivo', sev: 'Medio', pri: 'P3', comp: 'server.ts (middleware HTTP)', owasp: 'A02:2025 Security Misconfiguration', ev: 'ZAP 10038, 10098, 90004', estado: 'Abierto' },
  { id: 'DEF-11', titulo: 'Divulgación de errores de aplicación y de IP privada en respuestas', sev: 'Bajo', pri: 'P3', comp: 'Manejador de errores Express, /rest/admin/application-configuration', owasp: 'A02:2025 Security Misconfiguration', ev: 'ZAP 90022, 2', estado: 'Abierto' },
  { id: 'DEF-12', titulo: 'Mensajes de error del servidor sin traducir con la interfaz en español (límite de compra, inicio de sesión)', sev: 'Bajo', pri: 'P4', comp: 'routes/basketItems.ts, routes/login.ts / i18n', owasp: '—', ev: 'CP-07, CP-02', estado: 'Abierto' }
]
const sevCount = (s) => defects.filter(d => d.sev === s).length

// ---------------- Portada ----------------
function cover () {
  const W = 12240; const leftW = 4700; const stripW = 180; const rightW = W - leftW - stripW
  const white = (t, size, opts = {}) => new TextRun({ text: t, color: 'FFFFFF', font: F.title, size, ...opts })
  const left = new TableCell({
    width: { size: leftW, type: WidthType.DXA },
    shading: { fill: C.navy, type: ShadingType.CLEAR, color: 'auto' },
    verticalAlign: VerticalAlign.CENTER,
    borders: noBorders(),
    margins: { left: 500, right: 400 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(rp('docs/assets/logo-itm-blanco.png')), transformation: { width: 250, height: Math.round(250 * 1560 / 2290) }, altText: { title: 'Logo ITM', description: 'Logo Institución Universitaria ITM', name: 'logo' } })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [white('FACULTAD DE INGENIERÍAS', 20, { bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [white('Ingeniería de Sistemas', 20)] })
    ]
  })
  const strip = new TableCell({ width: { size: stripW, type: WidthType.DXA }, shading: { fill: C.celeste, type: ShadingType.CLEAR, color: 'auto' }, borders: noBorders(), children: [new Paragraph({ children: [] })] })
  const t = (text, size, color, opts = {}) => new Paragraph({ spacing: { after: opts.after ?? 80 }, children: [new TextRun({ text, size, color, font: opts.font ?? F.title, bold: opts.bold, italics: opts.italics })] })
  const right = new TableCell({
    width: { size: rightW, type: WidthType.DXA },
    borders: noBorders(),
    verticalAlign: VerticalAlign.TOP,
    margins: { left: 700, right: 600, top: 1900 },
    children: [
      t('ASEGURAMIENTO DE LA CALIDAD', 22, C.celeste, { bold: true, after: 200 }),
      t('CASO PRÁCTICO', 64, C.grayTitle, { bold: true, after: 0 }),
      t('FINAL', 64, C.grayTitle, { bold: true, after: 240 }),
      t('PLAN, EJECUCIÓN Y EVALUACIÓN DE LA', 24, C.celeste, { after: 0 }),
      t('CALIDAD DE OWASP JUICE SHOP v20.3.0', 24, C.celeste, { after: 600 }),
      t('Integrantes', 20, C.navy, { bold: true, after: 60 }),
      t('[Nombre completo – Integrante 1]', 20, C.text, { font: F.body, after: 20 }),
      t('[Nombre completo – Integrante 2]', 20, C.text, { font: F.body, after: 20 }),
      t('[Nombre completo – Integrante 3]', 20, C.text, { font: F.body, after: 240 }),
      t('Docente', 20, C.navy, { bold: true, after: 60 }),
      t('[Nombre del docente]', 20, C.text, { font: F.body, after: 240 }),
      t('Medellín, 22 de noviembre de 2026', 20, C.navy, { after: 120 }),
      new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 200 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(rp('docs/assets/deco-portada.png')), transformation: { width: 340, height: Math.round(340 * 760 / 900) }, altText: { title: 'Decoración', description: 'Círculos institucionales', name: 'deco' } })] })
    ]
  })
  return [
    new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [leftW, stripW, rightW], layout: TableLayoutType.FIXED, rows: [new TableRow({ height: { value: 15700, rule: HeightRule.EXACT }, children: [left, strip, right] })] }),
    new Paragraph({ spacing: { after: 0, line: 20 }, children: [new TextRun({ text: '', size: 2 })] })
  ]
}
function noBorders () { const n = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }; return { top: n, bottom: n, left: n, right: n } }

// ---------------- Encabezado / pie (Manual ITM) ----------------
const header = new Header({
  children: [new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.gray, space: 4 } },
    children: [
      new TextRun({ text: 'Caso práctico final · Aseguramiento de la Calidad', size: 16, color: '808080', font: F.title }),
      new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: PositionalTabRelativeTo.MARGIN, leader: PositionalTabLeader.NONE })] }),
      new ImageRun({ type: 'png', data: fs.readFileSync(rp('docs/assets/logo-itm-azul.png')), transformation: { width: 62, height: 42 }, altText: { title: 'ITM', description: 'Logo ITM', name: 'logo-h' } })
    ]
  })]
})
const footer = new Footer({
  children: [new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: C.celeste, space: 6 } },
    children: [
      new TextRun({ text: '/// Aseguramiento de la Calidad ///', bold: true, color: C.celeste, font: F.title, size: 18 }),
      new TextRun({ text: ' Institución Universitaria ITM', color: C.celeste, font: F.title, size: 18 }),
      new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: PositionalTabRelativeTo.MARGIN, leader: PositionalTabLeader.NONE }), PageNumber.CURRENT], color: C.navy, font: F.title, size: 18, bold: true })
    ]
  })]
})

// ---------------- Contenido ----------------
const body = []
const add = (...x) => body.push(...x.flat())
const link = (text, url) => new Paragraph({ spacing: { after: 80 }, children: [new ExternalHyperlink({ link: url, children: [new TextRun({ text, style: 'Hyperlink', color: C.ing2, underline: {} })] })] })

// Tabla de contenido
add(new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.celeste, space: 4 } }, children: [new TextRun({ text: 'CONTENIDO', font: F.title, size: 32, bold: true, color: C.navy })] }))
add(new TableOfContents('Tabla de contenido', { hyperlink: true, headingStyleRange: '1-2' }))
add(note('si el índice aparece vacío, en Word haga clic derecho sobre él y elija «Actualizar campos» (o acepte la actualización al abrir el documento).', { label: 'Nota' }))

// 2. Introducción
add(H1('1. Introducción'))
add(P('Este informe documenta la planificación, el diseño, la ejecución y la evaluación de actividades de aseguramiento de la calidad sobre **OWASP Juice Shop v20.3.0**, una tienda en línea de código abierto desarrollada en TypeScript (Angular + Node.js/Express) y mantenida por la fundación OWASP. El trabajo integra pruebas funcionales manuales y automatizadas, pruebas de rendimiento, análisis estático (SAST) con SonarQube, análisis dinámico (DAST) con OWASP ZAP, gestión de defectos y métricas de calidad.'))
add(H2('1.1 Objetivo general'))
add(P('Aplicar de manera práctica e integrada técnicas de aseguramiento de la calidad de software —planificación según IEEE 829 / ISO/IEC/IEEE 29119, diseño de casos con partición de equivalencia y valores límite, automatización, evaluación de seguridad basada en OWASP Top 10 y análisis de métricas— sobre un sistema de software real y funcional, generando evidencia verificable de cada actividad.'))
add(H2('1.2 Justificación de la elección del sistema'))
add(bullet('**Es un sistema real y completo:** frontend SPA, API REST, autenticación JWT, base de datos relacional, carrito de compras, pagos simulados y gestión de direcciones; más de 30 000 líneas de código analizables.'))
add(bullet('**Código abierto y versionado:** permite el análisis estático del código fuente exacto que se despliega (etiqueta v20.3.0), lo que hace los hallazgos reproducibles.'))
add(bullet('**Reconocido en la industria de la seguridad:** OWASP lo mantiene como aplicación de referencia para entrenamiento, por lo que es idóneo para la evaluación OWASP Top 10 exigida (20 % de la nota).'))
add(bullet('**Despliegue aislado:** se distribuye como imagen Docker oficial, lo que permitió ejecutar todo el laboratorio en contenedores sin modificar el equipo de trabajo.'))

// 3. Contexto
add(H1('2. Contexto del proyecto'))
add(H2('2.1 Funcionalidad general y problema que resuelve'))
add(P('Juice Shop simula una tienda de comercio electrónico de jugos y artículos promocionales. Resuelve el ciclo completo de compra en línea: registro y autenticación de clientes, catálogo y búsqueda de productos, canasta de compras con límites por producto, direcciones de envío, métodos de pago, seguimiento de pedidos y opiniones de clientes. Adicionalmente, su propósito institucional es servir como plataforma de formación en seguridad de aplicaciones web.'))
add(H2('2.2 Arquitectura'))
add(P('La arquitectura es **cliente-servidor** con un **backend monolítico modular**: una SPA Angular consume una API REST servida por un único proceso Node.js/Express, que persiste en SQLite (vía Sequelize) y en una base NoSQL en memoria (MarsDB). La Figura 1 muestra la arquitectura del sistema y la del laboratorio de pruebas.'))
add(figure('docs/assets/arquitectura.png', 'Arquitectura del sistema bajo prueba y del laboratorio de pruebas aislado.', 6.5))
add(H2('2.3 Tecnologías'))
add(tcap('Tecnologías del sistema bajo prueba'))
add(table(['Capa', 'Tecnología'], [
  ['Frontend', 'Angular, Angular Material, TypeScript, RxJS'],
  ['Backend', 'Node.js 22, Express, finale-rest, Socket.IO, JSON Web Tokens (RS256)'],
  ['Base de datos', 'SQLite con ORM Sequelize; MarsDB (NoSQL en memoria)'],
  ['Frameworks de prueba del proyecto', 'Node test runner + nyc (unitarias), Cypress (E2E), Karma/Jasmine (frontend)'],
  ['Infraestructura', 'Imagen Docker oficial bkimminich/juice-shop:v20.3.0 (distroless); GitHub Actions en el repositorio original']
], [2600, 6760]))
add(H2('2.4 Alcance funcional cubierto por las pruebas'))
add(tcap('Alcance de las pruebas'))
add(table(['Módulo', 'Incluido', 'Observación'], [
  ['Autenticación (login)', 'Sí', 'UI y API; seguridad de credenciales'],
  ['Registro de usuarios', 'Sí', 'Validaciones de cliente y de servidor'],
  ['Catálogo y búsqueda', 'Sí', 'UI, API, rendimiento y seguridad'],
  ['Canasta de compras', 'Sí', 'Límite por producto (UI y API)'],
  ['Opiniones de clientes', 'Sí', 'Calificación, longitud, CAPTCHA'],
  ['Direcciones de envío', 'Sí', 'Valores límite de teléfono y código postal'],
  ['Pago, entrega, billetera, chatbot, retos (score board)', 'No', 'Fuera del alcance por tiempo; ver recomendaciones']
], [3300, 1100, 4960]))

// 4. Requerimientos
add(H1('3. Requerimientos y criterios de calidad'))
add(P('Los requisitos se derivaron de la funcionalidad observable y de las reglas de validación presentes en el código fuente (por ejemplo, `register.component.ts`, `contact.component.ts`, `address-create.component.ts` y `config/default.yml`).'))
add(H2('3.1 Requisitos funcionales'))
add(tcap('Requisitos funcionales'))
add(table(['ID', 'Requisito', 'Regla verificable (fuente)'], [
  ['RF01', 'El sistema deberá permitir la autenticación de usuarios con correo y contraseña.', 'Credenciales válidas → sesión; inválidas → error genérico'],
  ['RF02', 'El sistema deberá permitir el registro de nuevos usuarios.', 'Correo válido; contraseña de 5 a 40 caracteres; confirmación igual; pregunta y respuesta de seguridad'],
  ['RF03', 'El sistema deberá permitir buscar productos por nombre o descripción.', 'Resultados coincidentes; búsqueda sin coincidencias → lista vacía'],
  ['RF04', 'El sistema deberá permitir gestionar la canasta de compras.', 'Productos con limitPerUser = 5 admiten máximo 5 unidades'],
  ['RF05', 'El sistema deberá permitir registrar opiniones de clientes.', 'Calificación de 1 a 5; comentario obligatorio de máx. 160 caracteres; CAPTCHA'],
  ['RF06', 'El sistema deberá permitir registrar direcciones de envío.', 'Teléfono entre 1111111 y 9999999999; código postal máx. 8 caracteres']
], [800, 4060, 4500]))
add(H2('3.2 Requisitos no funcionales'))
add(tcap('Requisitos no funcionales'))
add(table(['ID', 'Atributo', 'Requisito'], [
  ['RNF01', 'Rendimiento', 'El percentil 95 del tiempo de respuesta deberá ser menor a 3 s con 20 usuarios concurrentes, con tasa de error < 1 %.'],
  ['RNF02', 'Seguridad', 'El sistema no deberá presentar vulnerabilidades de severidad alta o crítica del OWASP Top 10 (inyección, XSS, control de acceso, secretos expuestos).'],
  ['RNF03', 'Usabilidad', 'La interfaz deberá adaptarse a pantallas móviles (375 px) sin desplazamiento horizontal y presentar mensajes en el idioma seleccionado.'],
  ['RNF04', 'Fiabilidad', 'El servicio deberá permanecer disponible ante tráfico automatizado anómalo (escaneos, picos de carga).'],
  ['RNF05', 'Mantenibilidad', 'El código deberá obtener calificación de mantenibilidad A en SonarQube y duplicación < 3 %.']
], [900, 1500, 6960]))
add(H2('3.3 Criterios de aceptación'))
add(bullet('Un caso de prueba se considera **Aprobado** cuando el resultado obtenido coincide exactamente con el resultado esperado documentado; en caso contrario es **Fallido** y se registra un defecto.'))
add(bullet('Una funcionalidad cumple cuando el 100 % de sus casos de prueba asociados están aprobados y no tiene defectos abiertos de severidad Crítica o Alta.'))
add(bullet('Las validaciones de negocio deben aplicarse **en el servidor**; una regla aplicada solo en la interfaz no se considera cumplida (las peticiones pueden enviarse directamente a la API).'))
add(bullet('Rendimiento: umbrales k6 `p(95)<3000` y `http_req_failed<1%` en verde.'))
add(bullet('Seguridad: cero alertas ZAP de riesgo Alto y cero vulnerabilidades SonarQube Blocker/Critical.'))
add(H2('3.4 Atributos de calidad analizados (ISO/IEC 25010)'))
add(tcap('Atributos de calidad y forma de evaluación'))
add(table(['Atributo', 'Cómo se evaluó', 'Resultado resumido'], [
  ['Funcionalidad (adecuación funcional)', '12 casos manuales + 15 automatizados sobre RF01–RF06', 'Flujos principales correctos; reglas de negocio no validadas en el servidor (DEF-07, 08, 09)'],
  ['Usabilidad', 'CP-07, CP-12: mensajes, idioma, diseño adaptable', 'Diseño adaptable correcto; mensaje sin traducir (DEF-12)'],
  ['Fiabilidad', 'k6 estrés (150 VU), escaneo activo ZAP, pruebas unitarias', `Sin errores bajo carga; caída por memoria bajo escaneo (DEF-06); Reliability ${ratingL(sonar.reliability_rating)} en SonarQube`],
  ['Rendimiento (eficiencia)', 'k6 carga (20 VU) y estrés (150 VU); TA-15', `p95 = ${ms(k6.metrics.http_req_duration['p(95)'])} (20 VU) y ${ms(k6s.metrics.http_req_duration['p(95)'])} (150 VU)`],
  ['Seguridad', 'SonarQube (SAST), OWASP ZAP (DAST), pruebas exploratorias', `Security ${ratingL(sonar.security_rating)}; ${sonar.vulnerabilities} vulnerabilidades SAST; inyección SQL y XSS confirmadas`],
  ['Mantenibilidad', 'SonarQube: code smells, deuda técnica, duplicación', `Maintainability ${ratingL(sonar.sqale_rating)}; duplicación ${sonar.duplicated_lines_density} %`]
], [2200, 3400, 3760]))

// 5. Plan de pruebas
add(H1('4. Plan de pruebas'))
add(P('El plan sigue la estructura de IEEE 829-2008 y los conceptos de ISO/IEC/IEEE 29119-3 (identificador, elementos de prueba, características a probar y no probar, enfoque, criterios de aprobación/suspensión, entregables, ambiente, responsabilidades y cronograma).'))
add(H2('4.1 Identificación y objetivos de prueba'))
add(kv([
  ['Identificador del plan', 'PP-JS-2026-01'],
  ['Elemento de prueba', 'OWASP Juice Shop v20.3.0 (imagen Docker y código fuente, commit f189f52)'],
  ['Objetivo 1', 'Verificar que las funcionalidades RF01–RF06 cumplen sus reglas de negocio en la UI y en la API.'],
  ['Objetivo 2', 'Evaluar el tiempo de respuesta y la estabilidad bajo carga (RNF01, RNF04).'],
  ['Objetivo 3', 'Identificar vulnerabilidades OWASP Top 10 mediante SAST, DAST y pruebas exploratorias (RNF02).'],
  ['Objetivo 4', 'Medir la calidad interna del código (RNF05) e interpretar los indicadores de SonarQube.'],
  ['Objetivo 5', 'Automatizar pruebas de regresión y proponer su integración en un pipeline CI/CD.']
], { title: 'Ficha del plan de pruebas' }))
add(H2('4.2 Alcance'))
add(P('**Características a probar:** autenticación, registro, búsqueda, canasta, opiniones, direcciones, rendimiento de la API, seguridad de la aplicación y calidad del código. **Características que no se prueban:** pasarela de pago, entregas, billetera digital, chatbot, funciones de administración avanzadas y los retos del «score board». Tampoco se prueba la infraestructura de nube (Terraform) incluida en el repositorio.'))
add(H2('4.3 Tipos y niveles de prueba'))
add(tcap('Niveles de prueba'))
add(table(['Nivel', 'Qué se probó', 'Herramienta', 'Evidencia'], [
  ['Unitarias', `Suite de pruebas unitarias del servidor del propio proyecto (419 pruebas) con medición de cobertura`, 'Node test runner + nyc', 'reports/evidence/server-unit-tests.log'],
  ['Integración', 'Contratos de la API REST: /api/Users, /rest/user/login, /api/BasketItems, /api/Feedbacks', 'Playwright APIRequestContext', 'TA-09 a TA-15'],
  ['Sistema', 'Flujos extremo a extremo en navegador Chromium; carga y seguridad del sistema desplegado', 'Playwright, k6, OWASP ZAP', 'TA-01 a TA-08, k6, ZAP'],
  ['Aceptación', 'Casos manuales trazados a los criterios de aceptación de cada requisito', 'Navegador + capturas', 'CP-01 a CP-12']
], [1500, 3900, 1900, 2060]))
add(H2('4.4 Estrategias'))
add(bullet('**Funcionales (caja negra):** derivación de casos a partir de requisitos y reglas de validación.'))
add(bullet('**No funcionales:** rendimiento (carga y estrés con k6), seguridad (SAST/DAST), usabilidad (diseño adaptable e idioma) y mantenibilidad (SonarQube).'))
add(bullet('**Exploratorias:** sesiones orientadas por riesgo sobre entradas de usuario y rutas públicas (CP-10, CP-11) guiadas por OWASP Top 10.'))
add(bullet('**Automatizadas:** regresión de UI y API con Playwright + TypeScript, ejecutables en contenedor y en CI.'))
add(bullet('**Basada en riesgo:** se priorizaron autenticación, registro y entradas libres de texto por su impacto en seguridad.'))
add(H2('4.5 Técnicas de diseño aplicadas'))
add(tcap('Técnicas de diseño y su justificación'))
add(table(['Técnica', 'Aplicación', 'Justificación'], [
  ['Partición de equivalencia', 'Login (clase válida/inválida: CP-01, CP-02, TA-01–TA-03), registro (CP-04), búsqueda (TA-06/TA-07)', 'Reduce el número de casos manteniendo representatividad de cada clase de entrada.'],
  ['Valores límite', 'Contraseña 4/5/40/41 (TA-04, TA-13), canasta 1/5/6 (TA-09, CP-07), calificación 0/1/5/6 (TA-10), comentario 159/160/161 (CP-05, TA-11), teléfono y código postal (CP-08, CP-09)', 'Los defectos se concentran en los bordes de los rangos; todos los rangos del sistema fueron identificados en el código.'],
  ['Tabla de decisión', 'Registro (contraseña = repetición, CP-03); opinión (comentario × CAPTCHA × calificación, CP-06)', 'Reglas con varias condiciones combinadas.'],
  ['Pruebas basadas en riesgo / OWASP', 'Inyección SQL, XSS, control de acceso, secretos (TA-12, TA-14, CP-10, CP-11)', 'Mayor impacto de negocio y peso en la evaluación.']
], [2100, 4300, 2960]))
add(P('Ejemplo de tabla de decisión aplicada al envío de opiniones (RF05):', { keepNext: true }))
add(table(['Condición / Acción', 'R1', 'R2', 'R3', 'R4'], [
  ['Comentario 1–160 caracteres', 'S', 'S', 'S', 'N'],
  ['CAPTCHA correcto', 'S', 'S', 'N', 'S'],
  ['Calificación seleccionada (1–5)', 'S', 'N', 'S', 'S'],
  ['→ Botón «Enviar» habilitado', 'X', '', '', ''],
  ['→ Opinión registrada', 'X', '', '', '']
], [4560, 1200, 1200, 1200, 1200]))
add(H2('4.6 Criterios de suspensión y reanudación'))
add(P('Se suspenden las pruebas si el sistema no está disponible (healthcheck fallido) o si un defecto bloquea más del 30 % de los casos. Se reanudan cuando el contenedor vuelve a estado «healthy». Este criterio se aplicó durante el escaneo activo de ZAP (DEF-06): las pruebas se repitieron sobre una instancia nueva.'))
add(H2('4.7 Recursos'))
add(tcap('Recursos humanos, herramientas y ambiente'))
add(table(['Tipo', 'Recurso', 'Detalle'], [
  ['Humanos', 'Líder de pruebas / analista QA', '[Integrante 1]: plan, casos manuales, defectos'],
  ['Humanos', 'Ingeniero de automatización', '[Integrante 2]: Playwright, k6, CI/CD'],
  ['Humanos', 'Analista de seguridad', '[Integrante 3]: SonarQube, OWASP ZAP, análisis OWASP'],
  ['Herramientas', 'Playwright 1.64 + TypeScript', 'Automatización UI/API; reportes HTML, JUnit y JSON'],
  ['Herramientas', 'k6 1.8.2', 'Pruebas de carga y estrés'],
  ['Herramientas', 'SonarQube Community 26.9 + sonar-scanner 12.2', 'Análisis estático y métricas'],
  ['Herramientas', 'OWASP ZAP 2.17', 'Análisis dinámico (baseline y escaneo activo)'],
  ['Herramientas', 'GitHub (repositorio, Issues, Actions)', 'Versionamiento, gestión de defectos y CI'],
  ['Ambiente', 'Docker Compose (proyecto «qa-itm»)', 'Red aislada, puertos solo en 127.0.0.1, contenedores sin privilegios; Linux, 16 CPU, 31 GB RAM']
], [1500, 3400, 4460]))
add(H2('4.8 Cronograma'))
add(tcap('Cronograma de actividades'))
add(table(['#', 'Actividad', 'Responsable', 'Inicio', 'Fin'], [
  ['1', 'Selección del sistema y análisis de requisitos', 'Todos', '08/11/2026', '09/11/2026'],
  ['2', 'Montaje del laboratorio aislado (Docker)', '[Integrante 2]', '08/11/2026', '09/11/2026'],
  ['3', 'Plan de pruebas (IEEE 829)', '[Integrante 1]', '09/11/2026', '10/11/2026'],
  ['4', 'Diseño de casos manuales y automatizados', '[Integrante 1], [Integrante 2]', '10/11/2026', '12/11/2026'],
  ['5', 'Desarrollo de scripts Playwright y k6', '[Integrante 2]', '11/11/2026', '13/11/2026'],
  ['6', 'Ejecución de pruebas funcionales', '[Integrante 1]', '13/11/2026', '14/11/2026'],
  ['7', 'Pruebas de rendimiento', '[Integrante 2]', '14/11/2026', '15/11/2026'],
  ['8', 'SAST (SonarQube) y DAST (OWASP ZAP)', '[Integrante 3]', '13/11/2026', '16/11/2026'],
  ['9', 'Registro y seguimiento de defectos', '[Integrante 1]', '14/11/2026', '18/11/2026'],
  ['10', 'Pipeline CI/CD', '[Integrante 2]', '16/11/2026', '18/11/2026'],
  ['11', 'Métricas, análisis y redacción del informe', 'Todos', '18/11/2026', '21/11/2026'],
  ['12', 'Revisión final y entrega en Teams', 'Todos', '22/11/2026', '22/11/2026']
], [500, 4060, 2200, 1300, 1300]))
add(H2('4.9 Entregables'))
add(bullet('Plan y casos de prueba (este documento), scripts automatizados (`tests/`), reportes exportados (`reports/`), configuración del laboratorio (`docker-compose.yml`, `Makefile`, `.github/workflows/qa.yml`) y registro de defectos.'))

// 6. Casos de prueba
add(H1('5. Diseño de casos de prueba'))
add(P(`Se diseñaron **${manual.length} casos manuales** (CP-01 a CP-12) y **${auto.length} casos automatizados** (TA-01 a TA-15, ${pwTests.length} ejecuciones al parametrizar valores límite). Todos los casos están trazados a un requisito y a una técnica de diseño.`))
add(H2('5.1 Matriz de trazabilidad'))
add(tcap('Trazabilidad requisito → casos'))
const reqs = ['RF01', 'RF02', 'RF03', 'RF04', 'RF05', 'RF06', 'RNF01', 'RNF02', 'RNF03', 'RNF04', 'RNF05']
const otras = { RNF01: 'k6 carga', RNF02: 'SonarQube, ZAP', RNF04: 'k6 estrés, ZAP activo', RNF05: 'SonarQube' }
add(table(['Requisito', 'Casos manuales', 'Casos automatizados / otras pruebas'], reqs.map(r => [
  r,
  manual.filter(m => m.req.includes(r)).map(m => m.id).join(', ') || '—',
  [auto.filter(a => a.req.split('/').includes(r)).map(a => a.id).join(', '), otras[r]].filter(Boolean).join(', ') || '—'
]), [1500, 3500, 4360]))
add(H2('5.2 Casos de prueba manuales'))
for (const m of manual) {
  add(gap(80))
  add(kv([
    ['Identificador', m.id],
    ['Nombre del caso', m.nombre],
    ['Objetivo', m.obj],
    ['Requisito asociado', m.req],
    ['Técnica', m.tec],
    ['Precondiciones', m.pre],
    ['Datos de entrada', m.datos],
    ['Pasos de ejecución', m.pasos.map((p, i) => `${i + 1}. ${p}`)],
    ['Resultado esperado', m.esp],
    ['Resultado obtenido', m.obt || '—'],
    ['Estado', m.estado + (m.def ? ` (${m.def})` : '')]
  ], { title: `${m.id} · ${m.nombre}`, statusKey: 'Estado' }))
}
add(H2('5.3 Casos de prueba automatizados'))
add(P('Los casos automatizados están implementados en `tests/e2e/tests/` (Playwright + TypeScript). Cada caso parametrizado por valores límite genera una ejecución por valor. Los resultados obtenidos provienen del reporte `reports/playwright/results.json`.'))
add(tcap('Casos automatizados (resumen estructurado)'))
add(table(['ID', 'Nombre / requisito', 'Técnica', 'Datos de entrada', 'Resultado esperado', 'Resultado obtenido', 'Estado'],
  auto.map(a => [a.id, `${a.nombre} (${a.req})`, a.tec, a.datos, a.esp, a.obt, a.estado]),
  [700, 1700, 1100, 1300, 1600, 1900, 1060], { statusCol: 6, size: 16, headSize: 16 }))
add(P('Precondiciones comunes: Juice Shop disponible en la red del laboratorio; los usuarios de prueba se crean por API con correos únicos para que cada ejecución sea independiente del estado de la base de datos. Pasos: los definidos en cada script (`*.spec.ts`), con aserciones explícitas del resultado esperado.', { run: { size: 18 } }))

// 7. Ejecución y evidencias
add(H1('6. Ejecución y evidencias de pruebas'))
add(H2('6.1 Resumen de ejecución'))
add(tcap('Resumen de ejecución (08/11/2026)'))
const manPass = manual.filter(m => m.estado === 'Aprobado').length
add(table(['Conjunto', 'Casos', 'Ejecuciones', 'Aprobadas', 'Fallidas', 'Duración'], [
  ['Manuales (CP)', `${manual.length}`, `${manual.length}`, `${manPass}`, `${manual.length - manPass}`, '≈ 15 s (captura de evidencias)'],
  ['Automatizadas (TA)', `${auto.length}`, `${pwTests.length}`, `${pwPassed}`, `${pwFailed}`, ms(pwStats.duration)],
  ['Unitarias del servidor (proyecto)', '—', '419', '417', '0 (2 omitidas)', '7,3 s'],
  ['Carga k6 (20 VU)', '1', `${k6.metrics.http_reqs.count} peticiones`, 'Umbrales OK', '0', '1 min 45 s'],
  ['Estrés k6 (150 VU)', '1', `${k6s.metrics.http_reqs.count} peticiones`, 'Umbrales OK', '0', '2 min 15 s']
], [2600, 900, 1500, 1300, 1460, 1600]))
add(H2('6.2 Pruebas funcionales – evidencias de casos manuales'))
for (const m of manual) {
  for (const img of m.img) add(figure(`reports/evidence/manual/${img}.png`, `${m.id} – ${m.nombre}. Estado: ${m.estado}.`, 5.6, 3.6))
}
add(H2('6.3 Pruebas funcionales – evidencias de casos automatizados'))
add(figure('reports/capturas/playwright-consola.png', 'Salida de consola de la suite Playwright ejecutada en contenedor.', 6.5))
add(figure('reports/capturas/playwright-resumen.png', `Reporte HTML de Playwright: ${pwTests.length} ejecuciones, ${pwPassed} aprobadas y ${pwFailed} fallidas.`, 6.0, 6.5))
add(figure('reports/capturas/playwright-TA-12-detalle.png', 'Detalle del fallo TA-12: el login responde 200 con un token ante una entrada con metacaracteres SQL.', 6.0))
add(figure('reports/capturas/playwright-TA-10-detalle.png', 'Detalle del fallo TA-10: el servidor acepta una calificación de 6 estrellas (HTTP 201).', 6.0))
add(figure('reports/capturas/unit-servidor.png', 'Pruebas unitarias del servidor de Juice Shop con cobertura (nyc).', 6.0))
add(H2('6.4 Pruebas de rendimiento'))
const d1 = k6.metrics.http_req_duration; const d2 = k6s.metrics.http_req_duration
add(P('Se ejecutaron dos escenarios con k6 sobre los endpoints de catálogo, búsqueda e inicio de sesión: **carga** (rampa a 20 usuarios virtuales sostenidos 1 minuto) y **estrés** (rampa escalonada hasta 150 usuarios virtuales).'))
add(tcap('Resultados de rendimiento (k6)'))
add(table(['Métrica', 'Carga (20 VU)', 'Estrés (150 VU)', 'Umbral (RNF01)'], [
  ['Peticiones totales', fmt(k6.metrics.http_reqs.count, 0), fmt(k6s.metrics.http_reqs.count, 0), '—'],
  ['Throughput (req/s)', fmt(k6.metrics.http_reqs.rate, 1), fmt(k6s.metrics.http_reqs.rate, 1), '—'],
  ['Tiempo promedio', ms(d1.avg), ms(d2.avg), '—'],
  ['Mediana', ms(d1.med), ms(d2.med), '—'],
  ['Percentil 90', ms(d1['p(90)']), ms(d2['p(90)']), '—'],
  ['Percentil 95', ms(d1['p(95)']), ms(d2['p(95)']), '< 3 s'],
  ['Máximo', ms(d1.max), ms(d2.max), '—'],
  ['Tasa de error', `${fmt(k6.metrics.http_req_failed.value * 100, 2)} %`, `${fmt(k6s.metrics.http_req_failed.value * 100, 2)} %`, '< 1 %']
], [2700, 2200, 2200, 2260]))
add(P(`**Análisis:** con 20 usuarios el sistema responde con holgura (p95 = ${ms(d1['p(95)'])}). Con 150 usuarios no hay errores y se cumple el umbral, pero el p95 crece unas ${fmt(d2['p(95)'] / d1['p(95)'], 0)} veces y el throughput se estabiliza alrededor de ${fmt(k6s.metrics.http_reqs.rate, 0)} req/s aunque la concurrencia aumente: el servidor (un único proceso Node.js) llegó a su punto de saturación y las peticiones adicionales solo se encolan. RNF01 **se cumple**, pero la capacidad no escala linealmente; se recomienda escalar horizontalmente o usar el modo clúster de Node.js para cargas mayores.`))
add(figure('reports/capturas/k6-salida.png', 'Resumen de k6 – escenario de carga (20 VU).', 6.0, 6))
add(figure('reports/capturas/k6-estres-salida.png', 'Resumen de k6 – escenario de estrés (150 VU).', 6.0, 6))
add(H2('6.5 Pruebas no funcionales: estabilidad y usabilidad'))
add(P('**Estabilidad:** durante el primer escaneo activo de OWASP ZAP el proceso de Juice Shop terminó con el error «JavaScript heap out of memory» (código de salida 139), dejando el servicio indisponible (DEF-06). La evidencia es el log del contenedor (Figura siguiente). Para continuar se aplicó el criterio de suspensión/reanudación: se aumentó el heap a 1,5 GB, se añadió política de reinicio automático y el segundo escaneo terminó sin reinicios (RestartCount = 0).'))
add(figure('reports/capturas/juice-shop-oom.png', 'Caída del servicio por agotamiento de memoria durante el escaneo activo (DEF-06).', 6.0))
add(P('**Usabilidad:** la interfaz se adapta a 375 px sin desplazamiento horizontal y con menú colapsado (CP-12). Se detectó un mensaje de negocio sin traducir con la interfaz en español (CP-07, DEF-12), lo que afecta la consistencia del idioma.'))
add(H2('6.6 Comportamiento observado'))
add(bullet('La interfaz aplica correctamente las validaciones de formularios (longitudes, rangos, formatos), pero **el servidor no repite varias de esas validaciones**: las mismas reglas que la UI rechaza son aceptadas por la API (TA-10, TA-11, TA-13).'))
add(bullet('El control de acceso funciona en la API de administración de usuarios (TA-14), pero no en el directorio de archivos /ftp (CP-11).'))
add(bullet('La regla de límite por producto (5 unidades) sí se valida en el servidor (TA-09: HTTP 400), lo que demuestra que el patrón correcto existe en el código pero no se aplica de forma consistente.'))

// 8. Automatización
add(H1('7. Automatización de pruebas'))
add(kv([
  ['Herramienta', 'Playwright Test 1.64.0 (imagen oficial mcr.microsoft.com/playwright:v1.64.0-noble); k6 1.8.2 para rendimiento'],
  ['Lenguaje', 'TypeScript (Playwright) y JavaScript ES2015+ (k6)'],
  ['Patrón', 'Pruebas por requisito, funciones auxiliares reutilizables (`support/helpers.ts`), datos únicos por ejecución, parametrización por valores límite'],
  ['Navegador', 'Chromium (Desktop Chrome, 1366×768, locale es-CO)'],
  ['Reportes', 'HTML, JUnit XML (integrable en CI) y JSON; capturas, video y trazas en fallos'],
  ['Ejecución', '`make test` o `docker compose --profile tools run --rm playwright npx playwright test`']
], { title: 'Ficha de automatización' }))
add(H2('7.1 Descripción de los scripts'))
add(tcap('Scripts automatizados'))
add(table(['Archivo', 'Tipo', 'Escenarios cubiertos'], [
  ['tests/e2e/tests/ui/autenticacion.spec.ts', 'UI', 'TA-01 login válido, TA-02 login inválido, TA-03 validación de campos vacíos'],
  ['tests/e2e/tests/ui/registro.spec.ts', 'UI', 'TA-04 valores límite de contraseña (4/5/40/41), TA-05 registro completo'],
  ['tests/e2e/tests/ui/busqueda-canasta.spec.ts', 'UI', 'TA-06/07 búsqueda con y sin resultados, TA-08 agregar a la canasta'],
  ['tests/e2e/tests/api/canasta.api.spec.ts', 'API', 'TA-09 valores límite de cantidad (1/5/6)'],
  ['tests/e2e/tests/api/feedback.api.spec.ts', 'API', 'TA-10 calificación (0/1/5/6), TA-11 longitud de comentario (160/161)'],
  ['tests/e2e/tests/api/seguridad-rendimiento.api.spec.ts', 'API', 'TA-12 inyección SQL, TA-13 validación de servidor, TA-14 control de acceso, TA-15 tiempo de respuesta'],
  ['tests/e2e/evidence/manuales.spec.ts', 'Apoyo', 'Captura reproducible de evidencias de CP-01 a CP-12'],
  ['tests/perf/carga-basica.js, estres.js', 'Rendimiento', 'Carga (20 VU) y estrés (150 VU) con umbrales del RNF01']
], [3900, 1100, 4360]))
add(P('Fragmento representativo (valores límite de la cantidad en la canasta, `canasta.api.spec.ts`):', { keepNext: true }))
for (const line of [
  "for (const { qty, esperado } of [{ qty: 1, esperado: 200 }, { qty: 5, esperado: 200 }, { qty: 6, esperado: 400 }]) {",
  "  test(`TA-09 Cantidad ${qty} de Apple Juice => HTTP ${esperado}`, async ({ request }) => {",
  "    const { token, bid } = await loginApi(request, email, password)",
  "    const upd = await request.put(`/api/BasketItems/${itemId}`, { headers, data: { quantity: qty } })",
  "    expect(upd.status()).toBe(esperado)",
  '  })',
  '}'
]) add(new Paragraph({ spacing: { after: 0, line: 240 }, shading: { fill: 'F3F6FA', type: ShadingType.CLEAR, color: 'auto' }, children: [new TextRun({ text: line, font: 'Consolas', size: 16, color: C.ing1 })] }))
add(gap())
add(H2('7.2 Resultados obtenidos'))
add(P(`La suite automatizada se ejecutó en ${ms(pwStats.duration)} con ${pwTests.length} ejecuciones: **${pwPassed} aprobadas y ${pwFailed} fallidas**. Las ${pwFailed} fallas no son defectos de los scripts: corresponden a defectos reales del sistema (DEF-01, DEF-07, DEF-08, DEF-09) y se mantienen deliberadamente en rojo como pruebas de regresión que deberán pasar cuando los defectos se corrijan.`))
add(H2('7.3 Integración CI/CD'))
add(P('Juice Shop tiene su propio pipeline en GitHub Actions (`ci.yml`, CodeQL), pero no incluye nuestras pruebas. Para este proyecto se definió el pipeline `.github/workflows/qa.yml`, que se ejecuta en cada push o pull request:'))
add(num('**Job «pruebas»:** levanta Juice Shop como servicio de GitHub Actions, ejecuta la suite Playwright dentro de la imagen oficial y publica el reporte HTML/JUnit como artefacto.', 'numeros'))
add(num('**Job «rendimiento»:** ejecuta el escenario k6; los umbrales (p95 < 3 s, error < 1 %) hacen fallar el job si se incumple el RNF01.', 'numeros'))
add(num('**Job «dast»:** ejecuta el ZAP baseline (pasivo) contra el servicio efímero.', 'numeros'))
add(P('**Evolución propuesta:** (1) agregar un job de SonarQube (SonarQube Cloud o servidor propio) con quality gate bloqueante para vulnerabilidades nuevas; (2) quitar `continue-on-error` de Playwright una vez corregidos los defectos conocidos, de modo que una regresión bloquee la fusión; (3) ejecutar el escaneo activo de ZAP de forma programada (nocturna) y no en cada push, por su duración y su impacto sobre el servicio (DEF-06).'))

// 9. Defectos
add(H1('8. Gestión de defectos'))
add(P(`Se registraron **${defects.length} defectos**: ${sevCount('Crítico')} críticos, ${sevCount('Alto')} altos, ${sevCount('Medio')} medios y ${sevCount('Bajo')} bajos. La **severidad** mide el impacto técnico/negocio; la **prioridad** (P1 = inmediata … P4 = baja) indica el orden de corrección.`))
add(H2('8.1 Herramienta'))
add(P(`La gestión de defectos se realiza con **GitHub Issues** en el repositorio del proyecto (${REPO}), usando la plantilla \`.github/ISSUE_TEMPLATE/defecto.yml\` (campos: identificador, severidad, prioridad, pasos, resultado esperado/obtenido, evidencia) y etiquetas de severidad (\`sev:critico\`, \`sev:alto\`, \`sev:medio\`, \`sev:bajo\`) y de estado. El registro completo se exporta también en \`reports/defectos.csv\`.`))
add(H2('8.2 Listado de defectos'))
add(tcap('Registro de defectos'))
add(table(['ID', 'Descripción', 'Severidad', 'Prioridad', 'Estado', 'Evidencia'],
  defects.map(d => [d.id, d.titulo, d.sev, d.pri, d.estado, d.ev]),
  [800, 3700, 1000, 900, 1300, 1660], { sevCol: 2, size: 16, headSize: 16 }))
add(H2('8.3 Ficha de defectos representativos'))
for (const d of defects.slice(0, 4).concat(defects.filter(x => x.id === 'DEF-08'))) {
  add(gap(80))
  const extra = {
    'DEF-01': ['1. Enviar POST /rest/user/login con un correo que contiene metacaracteres SQL y cualquier contraseña (TA-12).', 'Esperado: 401. Obtenido: 200 y token JWT del usuario con id 1 (administrador).'],
    'DEF-02': ['Revisión de SonarQube: el archivo contiene la clave privada usada para firmar los JWT y una contraseña embebida.', 'Cualquiera con acceso al código puede firmar tokens válidos.'],
    'DEF-03': ['1. Buscar una cadena con HTML activo (CP-10).', 'Esperado: se muestra como texto. Obtenido: el navegador ejecuta el script (diálogo alert).'],
    'DEF-04': ['1. Navegar a /ftp sin sesión (CP-11).', 'Esperado: acceso denegado. Obtenido: listado con documentos internos y copias de respaldo.'],
    'DEF-08': ['1. Enviar POST /api/Feedbacks con rating 0 o 6 y CAPTCHA válido (TA-10).', 'Esperado: rechazo (≥ 400). Obtenido: 201 Created; el valor se almacena.']
  }[d.id]
  add(kv([
    ['Identificador', d.id], ['Descripción', d.titulo], ['Componente', d.comp], ['Categoría OWASP 2025', d.owasp],
    ['Severidad / Prioridad', `${d.sev} / ${d.pri}`], ['Pasos y resultado', extra], ['Estado', d.estado], ['Evidencia', d.ev]
  ], { title: `${d.id} · ${d.sev}` }))
}
add(H2('8.4 Ciclo de vida de un defecto representativo (DEF-08)'))
add(P('Se adoptó el flujo: **Nuevo → Confirmado → Asignado → En corrección → Resuelto → En verificación → Cerrado** (con la transición **Reabierto** si la verificación falla). Para DEF-08 el historial es:'))
add(tcap('Historial de DEF-08'))
add(table(['Fecha', 'Estado', 'Responsable', 'Detalle'], [
  ['08/11/2026', 'Nuevo', '[Integrante 2]', 'TA-10 falla: el servidor acepta rating 0 y 6 (HTTP 201).'],
  ['08/11/2026', 'Confirmado', '[Integrante 1]', 'Se reproduce en una segunda ejecución sobre una instancia limpia; se clasifica Medio/P2.'],
  ['[fecha]', 'Asignado', 'Equipo de desarrollo', 'Corrección sugerida: validación `min: 1, max: 5` en el modelo Sequelize `Feedback.rating`.'],
  ['[fecha]', 'Resuelto', 'Equipo de desarrollo', 'Pendiente: el sistema es de terceros; la corrección se propone al mantenedor.'],
  ['[fecha]', 'En verificación / Cerrado', '[Integrante 2]', 'Criterio de cierre: TA-10 pasa (0 y 6 → 400) y CP-06 sigue aprobado (no regresión).']
], [1300, 1700, 1800, 4560]))
add(note('Juice Shop es un sistema de terceros, por lo que los defectos no pueden corregirse en este proyecto: el ciclo se documenta hasta «Confirmado» con evidencia y los estados restantes con su criterio de verificación. Complete las filas «[fecha]» a medida que actualicen los issues en GitHub.', { label: 'Alcance' }))

// 10. Seguridad
add(H1('9. Pruebas de seguridad (OWASP Top 10)'))
add(P('La evaluación combinó tres fuentes: **SAST** con SonarQube sobre el código fuente v20.3.0, **DAST** con OWASP ZAP sobre la aplicación desplegada (escaneo pasivo y escaneo activo con plan del Automation Framework) y **pruebas exploratorias** dirigidas. Los hallazgos se mapean a OWASP Top 10:2025.'))
add(H2('9.1 Análisis estático (SonarQube)'))
add(P(`SonarQube Community 26.9 analizó ${fmt(sonar.ncloc, 0)} líneas de código e informó **${sonar.vulnerabilities} vulnerabilidades** (Security Rating **${ratingL(sonar.security_rating)}**). Las más relevantes se resumen a continuación.`))
const vulnIssues = J('reports/sonar/issues-VULNERABILITY.json').issues
const byRule = {}
for (const i of vulnIssues) { (byRule[i.rule] = byRule[i.rule] || { n: 0, sev: i.severity, msg: i.message, files: new Set() }); byRule[i.rule].n++; byRule[i.rule].files.add(i.component.split(':')[1].split('/').slice(-1)[0]) }
const ruleInfo = {
  'secrets:S6706': ['Clave privada en el código', 'A04 Cryptographic Failures', 'Mover claves a un gestor de secretos (Vault, variables de entorno cifradas); rotar la clave comprometida.'],
  'typescript:S6437': ['Contraseña comprometida embebida', 'A07 Authentication Failures', 'Eliminar credenciales del código y rotarlas.'],
  'typescript:S6268': ['Deshabilitar el sanitizador de Angular (bypassSecurityTrust*)', 'A05 Injection (XSS)', 'Usar interpolación segura; si se requiere HTML, sanear con DOMPurify antes de confiar.'],
  'typescript:S1523': ['Ejecución dinámica de código (eval / vm)', 'A05 Injection', 'Eliminar eval/vm; usar parsers seguros y listas blancas.'],
  'typescript:S4790': ['Algoritmo de hash débil (MD5)', 'A04 Cryptographic Failures', 'Usar bcrypt/Argon2 para contraseñas y SHA-256+ para integridad.'],
  'typescript:S2245': ['Generador pseudoaleatorio no criptográfico', 'A04 Cryptographic Failures', 'Usar crypto.randomInt / crypto.randomBytes en contextos sensibles.'],
  'typescript:S5332': ['Uso de HTTP en lugar de HTTPS', 'A04 Cryptographic Failures', 'Forzar HTTPS y HSTS.'],
  'typescript:S5693': ['Límite de tamaño de contenido elevado', 'A06 Insecure Design', 'Definir límites de payload acordes al caso de uso.'],
  'typescript:S4507': ['Función de depuración activa', 'A02 Security Misconfiguration', 'Desactivar en producción.']
}
add(tcap('Vulnerabilidades SAST agrupadas por regla'))
add(table(['Regla', 'Severidad', 'N.º', 'Descripción', 'OWASP 2025', 'Mitigación'],
  Object.entries(byRule).sort((a, b) => ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR'].indexOf(a[1].sev) - ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR'].indexOf(b[1].sev)).map(([r, v]) => {
    const inf = ruleInfo[r] || [v.msg, '—', 'Revisar y corregir según la regla.']
    return [r, v.sev, String(v.n), inf[0], inf[1], inf[2]]
  }), [1500, 1000, 500, 2200, 1500, 2660], { size: 15, headSize: 15 }))
add(figure('reports/sonar/02-issues-vulnerabilidades.png', 'Vulnerabilidades reportadas por SonarQube.', 6.2))
add(note('SonarQube Community **no** detectó la inyección SQL (DEF-01, DEF-05) ni el XSS en tiempo de ejecución (DEF-03): el análisis de flujo de datos (taint analysis) solo está disponible en ediciones comerciales, como lo advierte el propio panel («Limited security analysis»). Esto justifica combinar SAST con DAST y pruebas exploratorias.', { label: 'Hallazgo de análisis', bar: C.ing1 }))
add(H2('9.2 Análisis dinámico (OWASP ZAP)'))
const zf = zapAlerts(zapFull)
const zb = zapAlerts(zapBase)
add(P(`**Baseline (pasivo):** ${zb.length} tipos de alerta, ninguna de riesgo alto. **Escaneo activo** (spider + escaneo activo de 5 min 36 s con solicitudes sembradas a la API): ${zf.length} tipos de alerta, entre ellos **inyección SQL de riesgo Alto** en el parámetro de búsqueda.`))
add(tcap('Alertas del escaneo activo de OWASP ZAP'))
const zapMit = {
  40018: 'Consultas parametrizadas / ORM con reemplazos; validar entrada; mínimo privilegio en BD.',
  10038: 'Definir Content-Security-Policy restrictiva (default-src \'self\').',
  10098: 'Restringir Access-Control-Allow-Origin a orígenes confiables.',
  90022: 'Manejador de errores genérico; no devolver trazas en producción.',
  2: 'No exponer configuración interna sin autenticación.',
  10096: 'Evaluar si las marcas de tiempo exponen información sensible.',
  90004: 'Agregar Cross-Origin-Embedder-Policy.'
}
add(table(['Riesgo', 'Confianza', 'Alerta (ID ZAP)', 'CWE', 'Instancias', 'Mitigación'],
  zf.filter(a => a.riskcode >= 1).map(a => [riskEs[a.riskcode], confEs[(a.riskdesc.match(/\((\w+)\)/) || [])[1]] || '', `${a.name} (${a.pluginid})`, a.cweid, a.count, zapMit[a.pluginid] || 'Revisar recomendación de ZAP.']),
  [900, 1000, 2500, 700, 1000, 3260], { sevCol: 0, size: 16, headSize: 16 }))
add(figure('reports/capturas/zap-full-report.png', 'Resumen del reporte de OWASP ZAP (escaneo activo).', 6.0))
add(figure('reports/capturas/zap-baseline.png', 'Resumen del reporte de OWASP ZAP (baseline pasivo).', 6.0))
add(H2('9.3 Evaluación consolidada OWASP Top 10:2025'))
add(tcap('Vulnerabilidades, riesgos y recomendaciones'))
add(table(['Categoría', 'Hallazgo / evidencia', 'Impacto potencial', 'Recomendación de mitigación'], [
  ['A01 Broken Access Control', 'Directorio /ftp público (DEF-04, CP-11)', 'Fuga de documentos internos y copias de respaldo.', 'Denegar por defecto; servir archivos solo a usuarios autorizados; eliminar respaldos del servidor web.'],
  ['A02 Security Misconfiguration', 'Sin CSP/COEP, CORS permisivo, errores detallados (DEF-10, DEF-11)', 'Facilita XSS, clickjacking y reconocimiento.', 'Helmet con CSP estricta; CORS con lista blanca; errores genéricos.'],
  ['A04 Cryptographic Failures', 'Clave privada JWT en código, MD5, PRNG débil (DEF-02)', 'Falsificación de tokens y suplantación de cualquier usuario.', 'Gestor de secretos, rotación de claves, bcrypt/Argon2, crypto.randomBytes.'],
  ['A05 Injection', 'SQLi en login (DEF-01) y búsqueda (DEF-05); XSS DOM (DEF-03); eval (S1523)', 'Toma de cuenta de administrador, extracción de datos, ejecución de código en el navegador de la víctima.', 'Consultas parametrizadas; no concatenar SQL; no deshabilitar el sanitizador de Angular; eliminar eval.'],
  ['A06 Insecure Design', 'Validaciones solo en cliente (DEF-08, DEF-09)', 'Datos inconsistentes y abuso de reglas de negocio.', 'Validar en el servidor (modelos y DTO) toda regla de negocio.'],
  ['A07 Authentication Failures', 'Contraseña de 4 caracteres aceptada (DEF-07)', 'Cuentas con contraseñas triviales, ataques de diccionario.', 'Política de contraseñas en servidor; limitación de intentos; MFA.'],
  ['A10 Mishandling of Exceptional Conditions', 'Caída por agotamiento de memoria (DEF-06)', 'Denegación de servicio.', 'Límites de tasa (rate limiting), límites de tamaño, supervisión y reinicio, pruebas de estrés periódicas.']
], [2000, 2500, 2200, 2660], { size: 16, headSize: 16 }))
add(P('**Conclusión de seguridad:** RNF02 **no se cumple**. Existen dos vulnerabilidades críticas explotables sin autenticación (DEF-01, DEF-02) que comprometen la confidencialidad e integridad de todas las cuentas. La prioridad de remediación es: (1) consultas parametrizadas en login y búsqueda; (2) retirar y rotar secretos; (3) control de acceso en /ftp; (4) sanitización en el frontend; (5) validaciones de servidor y cabeceras de seguridad.'))

// 11. Métricas
add(H1('10. Métricas de calidad'))
add(H2('10.1 KPIs del proceso de pruebas'))
const totalExec = manual.length + pwTests.length
const totalPass = manPass + pwPassed
const kloc = sonar.ncloc / 1000
add(tcap('Indicadores clave'))
add(table(['KPI', 'Fórmula', 'Valor', 'Interpretación'], [
  ['Cobertura de requisitos', 'Requisitos con ≥1 caso / total', `${reqs.length}/${reqs.length} = 100 %`, 'Todos los RF y RNF definidos tienen pruebas.'],
  ['Cobertura de código (servidor)', 'Líneas ejecutadas por pruebas unitarias', '41,4 % líneas · 45,8 % ramas', 'Baja: más de la mitad del backend no tiene prueba unitaria.'],
  ['Cobertura global (SonarQube)', 'Líneas cubiertas / líneas a cubrir', `${sonar.coverage} %`, 'Incluye el frontend, sin reporte de cobertura cargado.'],
  ['Casos aprobados', 'Aprobadas / ejecutadas', `${totalPass}/${totalExec} = ${fmt(totalPass / totalExec * 100, 1)} %`, `Manuales ${manPass}/${manual.length}; automatizadas ${pwPassed}/${pwTests.length}.`],
  ['Casos fallidos', 'Fallidas / ejecutadas', `${totalExec - totalPass}/${totalExec} = ${fmt((totalExec - totalPass) / totalExec * 100, 1)} %`, 'Cada fallo está asociado a un defecto registrado.'],
  ['Tasa de detección de defectos', 'Defectos / casos diseñados', `${defects.length}/${manual.length + auto.length} = ${fmt(defects.length / (manual.length + auto.length), 2)}`, 'Alta: casi la mitad de los casos revela un defecto.'],
  ['Densidad de defectos', 'Defectos / KLOC', `${defects.length}/${fmt(kloc, 1)} = ${fmt(defects.length / kloc, 2)} def/KLOC`, 'Solo defectos confirmados por pruebas.'],
  ['Densidad de incidencias estáticas', 'Incidencias SonarQube / KLOC', `${Number(sonar.bugs) + Number(sonar.vulnerabilities) + Number(sonar.code_smells)}/${fmt(kloc, 1)} = ${fmt((Number(sonar.bugs) + Number(sonar.vulnerabilities) + Number(sonar.code_smells)) / kloc, 1)}`, 'Bugs + vulnerabilidades + code smells.'],
  ['Defectos críticos + altos', 'Conteo', `${sevCount('Crítico') + sevCount('Alto')}`, 'Bloquean la salida a producción según el criterio de aceptación.'],
  ['Tiempo de ejecución automatizada', 'Duración de la suite', ms(pwStats.duration), 'Apto para ejecutarse en cada push.'],
  ['Tiempo total de herramientas', 'Playwright + k6 + Sonar + ZAP', '≈ 12 min', 'k6 4 min; SonarQube 41 s; ZAP activo ≈ 6 min.']
], [2300, 2200, 2000, 2860], { size: 16, headSize: 16 }))
add(H2('10.2 Defectos por severidad y por técnica'))
add(table(['Severidad', 'Cantidad', 'Técnica que lo detectó', 'Defectos'], [
  ['Crítico', String(sevCount('Crítico')), 'Pruebas de seguridad / SAST', 'DEF-01, DEF-02'],
  ['Alto', String(sevCount('Alto')), 'Exploratoria, DAST, estrés, valores límite', 'DEF-03, DEF-04, DEF-05, DEF-06, DEF-07'],
  ['Medio', String(sevCount('Medio')), 'Valores límite, DAST', 'DEF-08, DEF-09, DEF-10'],
  ['Bajo', String(sevCount('Bajo')), 'DAST, valores límite (usabilidad)', 'DEF-11, DEF-12']
], [1500, 1200, 3500, 3160], { sevCol: 0 }))
add(P('La técnica de **valores límite** aplicada al servidor detectó 4 defectos (DEF-07, 08, 09, 12) que la misma técnica aplicada solo a la UI no habría revelado: la UI pasa, la API falla.'))
add(H2('10.3 Indicadores de SonarQube'))
add(tcap('Indicadores SonarQube (código global)'))
add(table(['Indicador', 'Valor', 'Interpretación técnica'], [
  ['Bugs', `${sonar.bugs} (111 incidencias de fiabilidad en el modelo de calidades)`, `Reliability Rating ${ratingL(sonar.reliability_rating)}: existen bugs mayores. Predominan reglas web de accesibilidad (inputs sin etiqueta, eventos de ratón sin equivalente de teclado), que también impactan la usabilidad.`],
  ['Vulnerabilidades', sonar.vulnerabilities, `Security Rating ${ratingL(sonar.security_rating)} (el peor posible): hay al menos una vulnerabilidad Blocker (claves privadas y desactivación del sanitizador).`],
  ['Code Smells', `${sonar.code_smells} (393 incidencias de mantenibilidad)`, `Deuda técnica de ${fmt(sonar.sqale_index / 60, 1)} h (${sonar.sqale_debt_ratio} % del costo de desarrollo).`],
  ['Duplicación', `${sonar.duplicated_lines_density} % (${sonar.duplicated_blocks} bloques)`, 'Muy baja; cumple RNF05 (< 3 %).'],
  ['Coverage', `${sonar.coverage} %`, 'Insuficiente frente a un objetivo usual de 80 % para código nuevo.'],
  ['Maintainability Rating', ratingL(sonar.sqale_rating), 'A: la deuda técnica es baja respecto al tamaño del código.'],
  ['Security Rating', ratingL(sonar.security_rating), 'E: vulnerabilidades Blocker abiertas.'],
  ['Security Hotspots', sonar.security_hotspots, 'Sin hotspots pendientes de revisión.'],
  ['Quality Gate', sonar.alert_status === 'OK' ? 'Passed' : 'Failed', 'Pasa porque el Quality Gate por defecto evalúa solo el «código nuevo»; en el primer análisis no hay código nuevo. No debe interpretarse como ausencia de riesgos.']
], [1900, 2300, 5160], { size: 16, headSize: 16 }))
add(figure('reports/sonar/01-dashboard.png', 'Dashboard de SonarQube del proyecto juice-shop-itm.', 6.2))
add(figure('reports/sonar/03-issues-bugs.png', 'Bugs reportados por SonarQube.', 6.2))
add(figure('reports/sonar/05-cobertura.png', 'Cobertura por directorio en SonarQube.', 6.2))
add(figure('reports/sonar/06-duplicacion.png', 'Duplicación por directorio en SonarQube.', 6.2))
add(H2('10.4 Interpretación general'))
add(P('El sistema muestra un contraste marcado: **buena mantenibilidad interna (A, 1,4 % de duplicación) y buen rendimiento**, frente a **seguridad deficiente (E) y fiabilidad mejorable (D)**. Las métricas de proceso confirman que las pruebas de seguridad y las de valores límite contra la API fueron las más efectivas para detectar defectos, mientras que las pruebas de la UI dieron una falsa sensación de calidad. La cobertura unitaria del 41 % explica por qué defectos de validación del servidor no se detectaron antes en el ciclo de desarrollo.'))

// 12. Reflexión
add(H1('11. Reflexión y lecciones aprendidas'))
add(note('Esta sección es un borrador. Cada integrante debe revisarla y ajustarla con su propia experiencia, en especial «Trabajo en equipo».', { label: 'Para el grupo', bar: C.celeste, fill: 'FFF8E6' }))
add(H2('11.1 Valor del aseguramiento de la calidad'))
add(P('El ejercicio demostró que la calidad no puede inferirse de la interfaz: todos los formularios parecían correctos, pero el servidor aceptaba datos inválidos y era vulnerable a inyección. El QA aportó valor al combinar técnicas complementarias (funcionales, rendimiento, SAST, DAST) y al producir evidencia objetiva y reproducible para priorizar la corrección.'))
add(H2('11.2 Problemas encontrados y retos técnicos'))
add(bullet('El escaneo activo de ZAP derribó la aplicación por falta de memoria; fue necesario aplicar criterios de suspensión/reanudación y ajustar el ambiente.'))
add(bullet('ZAP no rastrea bien una SPA con el spider tradicional y el spider AJAX no funcionó en el contenedor endurecido; se resolvió sembrando las URL de la API en un plan del Automation Framework.'))
add(bullet('SonarQube Community no detecta inyecciones (sin taint analysis); se compensó con DAST y pruebas dirigidas.'))
add(bullet('El primer «Quality Gate: Passed» podía interpretarse erróneamente como código sin problemas.'))
add(H2('11.3 Dificultades de automatización'))
add(bullet('Selectores dependientes del idioma (por ejemplo «Agregar a Carrito» vs. «Add to Basket»): se prefirieron identificadores y roles accesibles.'))
add(bullet('Estado compartido en la base de datos: se resolvió creando usuarios únicos por prueba vía API.'))
add(bullet('Elementos superpuestos (banner de bienvenida, aviso de cookies) bloqueaban clics: se descartan con cookies antes de cada prueba.'))
add(bullet('Decidir cómo tratar pruebas que fallan por defectos reales: se dejaron en rojo, documentadas, como pruebas de regresión.'))
add(H2('11.4 Aprendizajes'))
add(bullet('Las reglas de negocio deben validarse en el servidor; las pruebas de API son indispensables.'))
add(bullet('Los valores límite son especialmente efectivos cuando se aplican a cada capa (UI y API).'))
add(bullet('Un ambiente reproducible y aislado (Docker) facilita repetir pruebas y no compromete el equipo de trabajo.'))
add(H2('11.5 Trabajo en equipo'))
add(P('[Describir la distribución real de roles, la coordinación (reuniones, tablero, repositorio), las dificultades del grupo y cómo se resolvieron.]'))
add(H2('11.6 Recomendaciones para futuros proyectos'))
add(bullet('Integrar SAST, DAST y pruebas automatizadas en el pipeline desde el inicio (shift-left), con quality gates bloqueantes.'))
add(bullet('Exigir cobertura mínima del 80 % en código nuevo y pruebas de contrato de API.'))
add(bullet('Incluir pruebas de estrés y de resiliencia periódicas en un ambiente aislado.'))
add(bullet('Ampliar el alcance a pago, entregas y administración en una siguiente iteración.'))

// 13. Anexos
add(H1('12. Anexos'))
add(H2('A. Repositorio y recursos'))
add(link(`Repositorio del proyecto: ${REPO}`, REPO))
add(link('OWASP Juice Shop v20.3.0 (código fuente): https://github.com/juice-shop/juice-shop/tree/v20.3.0', 'https://github.com/juice-shop/juice-shop/tree/v20.3.0'))
add(link('OWASP Top 10:2025: https://owasp.org/Top10/', 'https://owasp.org/Top10/'))
add(link('Documentación de Playwright: https://playwright.dev', 'https://playwright.dev'))
add(link('Documentación de k6: https://grafana.com/docs/k6/', 'https://grafana.com/docs/k6/'))
add(link('OWASP ZAP Automation Framework: https://www.zaproxy.org/docs/automate/automation-framework/', 'https://www.zaproxy.org/docs/automate/automation-framework/'))
add(H2('B. Scripts y archivos de configuración'))
add(tcap('Archivos del repositorio'))
add(table(['Ruta', 'Contenido'], [
  ['docker-compose.yml', 'Definición del laboratorio aislado (SUT, SonarQube, Playwright, k6, ZAP, scanner)'],
  ['Makefile', 'Comandos: up, test, evidence, perf, zap-baseline, zap-full, sonar-scan, clean'],
  ['.github/workflows/qa.yml', 'Pipeline CI/CD propuesto'],
  ['tests/e2e/', 'Proyecto Playwright + TypeScript (configuración, helpers, specs UI/API, evidencias)'],
  ['tests/perf/', 'Scripts k6 de carga y estrés'],
  ['security/sonar/sonar-project.properties', 'Configuración del análisis estático'],
  ['security/zap/plan-full.yaml', 'Plan del Automation Framework de ZAP'],
  ['.github/ISSUE_TEMPLATE/defecto.yml', 'Plantilla de reporte de defectos'],
  ['docs/generator/', 'Generador de este informe a partir de los resultados']
], [3800, 5560]))
add(H2('C. Reportes exportados'))
add(table(['Ruta', 'Contenido'], [
  ['reports/playwright/html/', 'Reporte HTML interactivo de Playwright (+ junit.xml, results.json)'],
  ['reports/evidence/manual/', 'Capturas y observaciones de CP-01 a CP-12'],
  ['reports/k6/', 'Salidas y resúmenes JSON de carga y estrés'],
  ['reports/sonar/', 'Métricas e incidencias exportadas por la API de SonarQube y capturas'],
  ['reports/zap/', 'Reportes HTML/JSON/MD de baseline y escaneo activo'],
  ['reports/evidence/juice-shop-oom-crash.log', 'Log de la caída por memoria (DEF-06)'],
  ['reports/defectos.csv', 'Registro de defectos']
], [3800, 5560]))
add(H2('D. Reproducción del laboratorio'))
for (const l of ['make sut          # clona Juice Shop v20.3.0', 'make up           # http://127.0.0.1:3000', 'make test         # suite Playwright', 'make evidence     # capturas de casos manuales', 'make perf         # k6', 'make zap-baseline && make zap-full', 'make sonar-up && make sonar-scan', 'make clean        # elimina contenedores, red y volúmenes']) {
  add(new Paragraph({ spacing: { after: 0, line: 240 }, shading: { fill: 'F3F6FA', type: ShadingType.CLEAR, color: 'auto' }, children: [new TextRun({ text: l, font: 'Consolas', size: 16, color: C.ing1 })] }))
}

// ---------------- Documento ----------------
const doc = new Document({
  creator: 'Caso Práctico Final – Aseguramiento de la Calidad',
  title: 'Caso práctico final – OWASP Juice Shop',
  description: 'Plan, ejecución y evaluación de calidad',
  features: { updateFields: true },
  numbering: L.numberingConfig,
  styles: {
    default: { document: { run: { font: F.body, size: 22, color: C.text } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: F.title, size: 32, bold: true, color: C.navy, allCaps: true }, paragraph: { spacing: { before: 240, after: 200 }, keepNext: true, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.celeste, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: F.title, size: 26, bold: true, color: C.ing1 }, paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: F.title, size: 22, bold: true, color: C.ing2 }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 2 } }
    ]
  },
  sections: [
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 0, bottom: 0, left: 0, right: 0, header: 0, footer: 0 } } },
      children: cover()
    },
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1300, left: 1440, right: 1440, header: 560, footer: 560 }, pageNumbers: { start: 1 } } },
      headers: { default: header },
      footers: { default: footer },
      children: body
    }
  ]
})

const out = L.rp('docs/Informe-Caso-Practico-QA-ITM-2026.docx')
Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log('OK', out, b.length, 'bytes; figuras/tablas generadas') })

// CSV de defectos
fs.writeFileSync(L.rp('reports/defectos.csv'), 'id;descripcion;severidad;prioridad;estado;componente;owasp_2025;evidencia\n' + defects.map(d => [d.id, d.titulo, d.sev, d.pri, d.estado, d.comp, d.owasp, d.ev].map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n') + '\n')
