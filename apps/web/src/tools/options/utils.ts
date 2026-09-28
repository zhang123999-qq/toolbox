/**
 * options —— 全局编号 #781
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 浏览器扩展 Options 选项页模板生成：options.html / options.js 两文件。
 * 字段类型：text / checkbox / select / number，读写经 chrome.storage.sync。
 * 纯字符串模板，无任何运行时依赖。
 */

export type OptionFieldType = 'text' | 'checkbox' | 'select' | 'number'

export interface OptionField {
  key: string
  label: string
  type: OptionFieldType
  options?: string[]
  defaultValue?: string | boolean | number
}

export interface OptionsFiles {
  html: string
  js: string
}

export const FIELD_TYPE_VALUES: readonly OptionFieldType[] = [
  'text',
  'checkbox',
  'select',
  'number',
]

const KEY_RE = /^[A-Za-z][A-Za-z0-9_]*$/

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function validateOptionField(field: unknown): asserts field is OptionField {
  if (!field || typeof field !== 'object' || Array.isArray(field)) {
    throw new Error('字段必须是对象')
  }
  const o = field as Record<string, unknown>
  if (typeof o.key !== 'string' || !KEY_RE.test(o.key)) {
    throw new Error(`非法字段 key：${String(o.key)}（须字母开头，仅含字母、数字、下划线）`)
  }
  if (typeof o.label !== 'string' || o.label.trim() === '') {
    throw new Error(`字段 ${o.key} 的 label 不能为空`)
  }
  if (!FIELD_TYPE_VALUES.includes(o.type as OptionFieldType)) {
    throw new Error(`字段 ${o.key} 的 type 非法（可选 ${FIELD_TYPE_VALUES.join(' / ')}）`)
  }
  const type = o.type as OptionFieldType
  if (type === 'select') {
    if (!Array.isArray(o.options) || o.options.length === 0) {
      throw new Error(`select 字段 ${o.key} 需要非空 options 数组`)
    }
    for (const opt of o.options) {
      if (typeof opt !== 'string' || opt.trim() === '') {
        throw new Error(`select 字段 ${o.key} 的 options 必须是非空字符串数组`)
      }
    }
  }
  if (o.defaultValue !== undefined) {
    const dv = o.defaultValue
    if (type === 'text' && typeof dv !== 'string') {
      throw new Error(`字段 ${o.key} 的 defaultValue 类型不符（text 需要字符串）`)
    }
    if (type === 'checkbox' && typeof dv !== 'boolean') {
      throw new Error(`字段 ${o.key} 的 defaultValue 类型不符（checkbox 需要布尔值）`)
    }
    if (type === 'number' && typeof dv !== 'number') {
      throw new Error(`字段 ${o.key} 的 defaultValue 类型不符（number 需要数字）`)
    }
    if (type === 'select') {
      if (typeof dv !== 'string' || !(o.options as string[]).includes(dv)) {
        throw new Error(`字段 ${o.key} 的 defaultValue 必须是 options 中的一项`)
      }
    }
  }
}

function fieldToHtml(f: OptionField): string {
  const id = `field-${f.key}`
  const label = escapeHtml(f.label)
  if (f.type === 'checkbox') {
    const checked = f.defaultValue === true ? ' checked' : ''
    return `      <label><input id="${id}" type="checkbox"${checked} /> ${label}</label>`
  }
  if (f.type === 'select') {
    const opts = (f.options as string[])
      .map(
        (o) =>
          `        <option value="${escapeHtml(o)}"${o === f.defaultValue ? ' selected' : ''}>${escapeHtml(o)}</option>`,
      )
      .join('\n')
    return `      <label>${label}\n        <select id="${id}">\n${opts}\n        </select>\n      </label>`
  }
  const inputType = f.type === 'number' ? 'number' : 'text'
  const value = f.defaultValue !== undefined ? ` value="${escapeHtml(String(f.defaultValue))}"` : ''
  return `      <label>${label}\n        <input id="${id}" type="${inputType}"${value} />\n      </label>`
}

function fieldReadJs(f: OptionField): string {
  const id = `field-${f.key}`
  if (f.type === 'checkbox') {
    return `  values['${f.key}'] = document.getElementById('${id}').checked`
  }
  if (f.type === 'number') {
    return `  values['${f.key}'] = Number(document.getElementById('${id}').value)`
  }
  return `  values['${f.key}'] = document.getElementById('${id}').value`
}

function fieldWriteJs(f: OptionField): string {
  const id = `field-${f.key}`
  if (f.type === 'checkbox') {
    return `    if (result['${f.key}'] !== undefined) document.getElementById('${id}').checked = result['${f.key}']`
  }
  return `    if (result['${f.key}'] !== undefined) document.getElementById('${id}').value = result['${f.key}']`
}

export function generateOptionsPage(fields: OptionField[]): OptionsFiles {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error('至少需要一个选项字段')
  }
  const keys = new Set<string>()
  for (const f of fields) {
    validateOptionField(f)
    if (keys.has(f.key)) {
      throw new Error(`重复字段 key：${f.key}`)
    }
    keys.add(f.key)
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>扩展选项</title>
  <style>
    body { font-size: 14px; padding: 16px; max-width: 480px; }
    label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    #status { color: green; min-height: 1.2em; }
  </style>
</head>
<body>
  <h1>扩展选项</h1>
  <form id="options-form">
${fields.map(fieldToHtml).join('\n')}
    <button type="submit">保存</button>
  </form>
  <p id="status"></p>
  <script src="options.js"></script>
</body>
</html>
`

  const js = `// options.js 模板（#781 自动生成，Manifest V3）
// 在 manifest.json 中声明："options_page": "options.html"（或 options_ui）
const FIELD_KEYS = [${fields.map((f) => `'${f.key}'`).join(', ')}]

function readValues() {
  const values = {}
${fields.map(fieldReadJs).join('\n')}
  return values
}

function writeValues(result) {
${fields.map(fieldWriteJs).join('\n')}
}

// 恢复已保存的配置
chrome.storage.sync.get(FIELD_KEYS).then(writeValues)

document.getElementById('options-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  await chrome.storage.sync.set(readValues())
  const status = document.getElementById('status')
  status.textContent = '已保存'
  setTimeout(() => { status.textContent = '' }, 1500)
})
`

  return { html, js }
}

export function renderOptionsFiles(files: OptionsFiles): string {
  return [
    '===== options.html =====',
    files.html.trimEnd(),
    '',
    '===== options.js =====',
    files.js.trimEnd(),
  ].join('\n')
}

export function parseOptionsInput(text: string): OptionField[] {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('输入不能为空')
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('输入必须是 JSON 对象')
  }
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.fields)) {
    throw new Error('输入需要 fields 数组')
  }
  const fields = o.fields as OptionField[]
  // 复用生成器内的完整校验（含重复 key 检查）
  generateOptionsPage(fields)
  return fields
}

export const EXAMPLE_INPUT = {
  fields: [
    { key: 'apiHost', label: '接口地址', type: 'text', defaultValue: 'https://api.example.com' },
    { key: 'enableNotify', label: '启用通知', type: 'checkbox', defaultValue: true },
    {
      key: 'theme',
      label: '主题',
      type: 'select',
      options: ['light', 'dark'],
      defaultValue: 'light',
    },
    { key: 'refreshInterval', label: '刷新间隔（秒）', type: 'number', defaultValue: 60 },
  ] as OptionField[],
}
