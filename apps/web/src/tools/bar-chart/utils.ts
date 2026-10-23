import type { BarChartInput, BarChartOptions } from './schema'

export function generateSvg(input: BarChartInput, options: BarChartOptions): string {
  const lines = input.text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length === 0) return ''
  const rows = lines.map((line) => {
    const [label, ...rest] = line.split(/[,\t]/).map((s) => s.trim())
    const value = rest.length > 0 ? parseFloat(rest[0]) : 0
    return { label, value: isNaN(value) ? 0 : value }
  })
  const maxValue = Math.max(...rows.map((r) => r.value), 1)
  const width = 400
  const height = 200 + rows.length * 30
  const barHeight = 20
  const color = (options.barColor ?? '#3b82f6').trim() || '#3b82f6'
  const bars = rows.map((r, i) => {
    const y = 30 + i * 30
    const barW = Math.round((r.value / maxValue) * 300)
    return `<rect x="100" y="${y}" width="${barW}" height="${barHeight}" fill="${color}" rx="2"/>` +
      `<text x="90" y="${y + 15}" text-anchor="end" font-size="10" fill="#334155">${escapeXml(r.label)}</text>` +
      `<text x="${105 + barW}" y="${y + 15}" font-size="10" fill="#334155">${r.value}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<text x="200" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">Bar Chart</text>` +
    bars + '</svg>'
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
