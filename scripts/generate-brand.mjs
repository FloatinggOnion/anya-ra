import { readFile, writeFile, mkdir } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const mark = JSON.parse(await readFile(new URL('src/lib/assets/brand.json', root), 'utf8'))
const symbol = (color) => `<g fill="none" stroke="${color}" stroke-width="${mark.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="${mark.arch}"/><path d="${mark.bridge}"/></g><circle cx="${mark.point.x}" cy="${mark.point.y}" r="${mark.point.radius}" fill="${color}"/>`
const svg = (content, size = 64) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${content}</svg>\n`
const tile = `<rect width="64" height="64" rx="14" fill="${mark.ink}"/>${symbol(mark.paper)}`
await mkdir(new URL('src-tauri/icons-src/', root), { recursive: true })
await writeFile(new URL('src-tauri/icons-src/app-icon.svg', root), svg(tile, 1024))
await writeFile(new URL('public/favicon.svg', root), svg(tile))
await writeFile(new URL('public/anya-mark.svg', root), svg(symbol(mark.ink)))
