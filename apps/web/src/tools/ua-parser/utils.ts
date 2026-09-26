import type { UaInput, UaOptions } from './schema'

export interface UaResult {
  browser: string
  browserVersion: string
  os: string
  device: string
  engine: string
}

/** Windows NT 版本号 → 中文名 */
function windowsName(nt: string): string {
  switch (nt) {
    case '10.0':
      return 'Windows 10/11'
    case '6.3':
      return 'Windows 8.1'
    case '6.2':
      return 'Windows 8'
    case '6.1':
      return 'Windows 7'
    case '6.0':
      return 'Windows Vista'
    case '5.1':
      return 'Windows XP'
    default:
      return 'Windows (NT ' + nt + ')'
  }
}

/** 把下划线版本号（10_15_7）改成点分（10.15.7） */
function dots(v: string): string {
  return v.replace(/_/g, '.')
}

/**
 * 自研规则匹配 UA。规则顺序：更具体的先判（Edge 基于 Chromium，必须在 Chrome 之前）。
 */
export function parseUa(ua: string): UaResult {
  const s = ua

  // —— 操作系统 ——
  let os = '未知'
  const win = s.match(/Windows NT ([\d.]+)/)
  if (win) os = windowsName(win[1])
  else if (/iPhone/.test(s)) os = 'iOS ' + dots((s.match(/iPhone OS ([\d_]+)/) || ['', ''])[1])
  else if (/iPad/.test(s)) os = 'iPadOS ' + dots((s.match(/OS ([\d_]+)/) || ['', ''])[1])
  else if (/Mac OS X/.test(s)) os = 'macOS ' + dots((s.match(/Mac OS X ([\d_]+)/) || ['', ''])[1])
  else if (/Android/.test(s)) os = 'Android ' + ((s.match(/Android ([\d.]+)/) || ['', ''])[1] || '')
  else if (/Linux/.test(s)) os = 'Linux'

  // —— 设备类型 ——
  let device = '桌面'
  if (/iPad/.test(s)) device = '平板'
  else if (/iPhone|iPod/.test(s)) device = '手机'
  else if (/Android/.test(s)) device = /Mobile/.test(s) ? '手机' : '平板'
  else if (/Mobile/.test(s)) device = '手机'

  // —— 浏览器 + 引擎（顺序敏感）——
  let browser = '未知'
  let browserVersion = ''
  let engine = '未知'

  const edg = s.match(/Edg(?:e|A|iOS)?\/([\d.]+)/)
  const opr = s.match(/(?:OPR|OPT)\/([\d.]+)/)
  const chrome = s.match(/Chrome\/([\d.]+)/)
  const fxios = s.match(/FxiOS\/([\d.]+)/)
  const firefox = s.match(/Firefox\/([\d.]+)/)
  const safari = s.match(/Version\/([\d.]+).*Safari\//)

  if (edg) {
    browser = 'Microsoft Edge'
    browserVersion = edg[1]
    engine = 'Blink'
  } else if (opr) {
    browser = 'Opera'
    browserVersion = opr[1]
    engine = 'Blink'
  } else if (fxios) {
    browser = 'Firefox'
    browserVersion = fxios[1]
    engine = 'Gecko'
  } else if (firefox) {
    browser = 'Firefox'
    browserVersion = firefox[1]
    engine = 'Gecko'
  } else if (chrome) {
    browser = 'Chrome'
    browserVersion = chrome[1]
    engine = 'Blink'
  } else if (safari) {
    browser = 'Safari'
    browserVersion = safari[1]
    engine = 'WebKit'
  }

  return { browser, browserVersion, os, device, engine }
}

/** T2 同步入口 */
export function transform(input: UaInput, _options: UaOptions): string {
  const ua = input.text.trim()
  if (ua === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const r = parseUa(ua)
  return [
    `浏览器：${r.browser}${r.browserVersion ? ' ' + r.browserVersion : ''}`,
    `操作系统：${r.os}`,
    `设备类型：${r.device}`,
    `渲染引擎：${r.engine}`,
  ].join('\n')
}
