// Convierte el logo extraído del Manual de Imagen ITM (positivo, una tinta) a PNG transparente
// en versión azul institucional y versión blanca (negativo). No altera proporciones (Manual: usos incorrectos).
const fs = require('fs'); const { PNG } = require('pngjs')
const src = PNG.sync.read(fs.readFileSync('../assets/src/logo-itm-manual.png'))
const { width: W, height: H } = src
const make = (rgb) => {
  const out = new PNG({ width: W, height: H })
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (W * y + x) << 2
    const r = src.data[i]
    // zona superior izquierda contiene arcos decorativos del manual (no forman parte del logo)
    const deco = x < 360 && y < 300
    const a = deco ? 0 : Math.max(0, Math.min(255, Math.round((235 - r) * 255 / 234)))
    out.data[i] = rgb[0]; out.data[i + 1] = rgb[1]; out.data[i + 2] = rgb[2]; out.data[i + 3] = a
  }
  return PNG.sync.write(out)
}
fs.writeFileSync('../assets/logo-itm-azul.png', make([1, 28, 91]))
fs.writeFileSync('../assets/logo-itm-blanco.png', make([255, 255, 255]))
console.log('logos', W, H)
