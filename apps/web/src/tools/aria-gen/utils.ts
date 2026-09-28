/** 支持的组件类型 */
export const ARIA_TYPES = [
  'button',
  'input',
  'dialog',
  'nav',
  'tabs',
  'switch',
  'slider',
  'alert',
] as const

export type AriaType = (typeof ARIA_TYPES)[number]

/** 组件类型中文名 */
export const ARIA_TYPE_NAMES: Record<AriaType, string> = {
  button: '按钮',
  input: '输入框',
  dialog: '对话框',
  nav: '导航',
  tabs: '选项卡',
  switch: '开关',
  slider: '滑块',
  alert: '提示框',
}

export interface AriaOptions {
  readonly label: string
  readonly id?: string
  readonly describedBy?: string
  readonly min?: number
  readonly max?: number
  readonly value?: number
}

export interface AriaSnippet {
  readonly html: string
  readonly notes: string[]
}

/** 校验组件类型取值 */
export function parseAriaType(raw: string): AriaType {
  if ((ARIA_TYPES as readonly string[]).includes(raw)) return raw as AriaType
  throw new Error(`不支持的组件类型：${raw}`)
}

/** 转义用户输入，防止 HTML 注入 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 解析数字选项：空串视为未提供，非数字抛中文错 */
function parseNumberOpt(raw: string | undefined, name: string): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined
  const n = Number(raw)
  if (!Number.isFinite(n)) throw new Error(`${name}必须是数字`)
  return n
}

/**
 * 解析原始选项：label 必填；min/max/value 为可选数字。
 * id / describedBy 为可选标识。
 */
export function parseAriaOptions(raw: {
  label: string
  id?: string
  describedBy?: string
  min?: string
  max?: string
  value?: string
}): AriaOptions {
  const label = raw.label.trim()
  if (label === '') throw new Error('请填写组件名称（label）')
  return {
    label,
    id: raw.id?.trim() === '' ? undefined : raw.id?.trim(),
    describedBy: raw.describedBy?.trim() === '' ? undefined : raw.describedBy?.trim(),
    min: parseNumberOpt(raw.min, '最小值'),
    max: parseNumberOpt(raw.max, '最大值'),
    value: parseNumberOpt(raw.value, '当前值'),
  }
}

function describedByAttr(opts: AriaOptions): string {
  return opts.describedBy ? ` aria-describedby="${escapeHtml(opts.describedBy)}"` : ''
}

function buildButton(opts: AriaOptions): AriaSnippet {
  return {
    html: `<button type="button" aria-label="${escapeHtml(opts.label)}">\n  ${escapeHtml(opts.label)}\n</button>`,
    notes: [
      '按钮可见文本即无障碍名称时可省略 aria-label；图标按钮必须保留。',
      '表示开关状态的按钮请改用 role="switch" 或加 aria-pressed。',
    ],
  }
}

function buildInput(opts: AriaOptions): AriaSnippet {
  if (!opts.id) throw new Error('输入框类型需要提供 id，用于 label 关联')
  const id = escapeHtml(opts.id)
  return {
    html: `<label for="${id}">${escapeHtml(opts.label)}</label>\n<input id="${id}" type="text"${describedByAttr(opts)} />`,
    notes: [
      'label 的 for 必须与 input 的 id 一致，这是屏幕阅读器朗读名称的依据。',
      '补充说明文字用 aria-describedby 指向帮助文本的 id。',
      '不要用 placeholder 代替 label：获得焦点后占位符消失，名称也随之丢失。',
    ],
  }
}

function buildDialog(opts: AriaOptions): AriaSnippet {
  const id = escapeHtml(opts.id ?? 'dialog-1')
  return {
    html: `<div role="dialog" aria-modal="true" aria-labelledby="${id}-title">\n  <h2 id="${id}-title">${escapeHtml(opts.label)}</h2>\n  <!-- 对话框内容 -->\n  <button type="button" data-close>关闭</button>\n</div>`,
    notes: [
      '打开后必须把焦点移到对话框内（focus trap），关闭后焦点返回触发元素。',
      'aria-modal="true" 告知辅助技术遮挡了背景内容；ESC 键应关闭对话框。',
    ],
  }
}

function buildNav(opts: AriaOptions): AriaSnippet {
  return {
    html: `<nav aria-label="${escapeHtml(opts.label)}">\n  <ul>\n    <li><a href="#">链接一</a></li>\n    <li><a href="#">链接二</a></li>\n  </ul>\n</nav>`,
    notes: [
      '页面有多个 nav 时必须用 aria-label 区分（如“主导航”“面包屑导航”）。',
      '当前页面链接加 aria-current="page"。',
    ],
  }
}

function buildTabs(opts: AriaOptions): AriaSnippet {
  const id = escapeHtml(opts.id ?? 'tabs-1')
  return {
    html: `<div role="tablist" aria-label="${escapeHtml(opts.label)}">\n  <button type="button" role="tab" id="${id}-tab-1" aria-selected="true" aria-controls="${id}-panel-1">选项卡一</button>\n  <button type="button" role="tab" id="${id}-tab-2" aria-selected="false" aria-controls="${id}-panel-2" tabindex="-1">选项卡二</button>\n</div>\n<div role="tabpanel" id="${id}-panel-1" aria-labelledby="${id}-tab-1" tabindex="0">面板一内容</div>\n<div role="tabpanel" id="${id}-panel-2" aria-labelledby="${id}-tab-2" tabindex="0" hidden>面板二内容</div>`,
    notes: [
      'tab 与 tabpanel 用 aria-controls / aria-labelledby 双向关联。',
      '方向键切换选项卡时移动焦点（roving tabindex），未选中 tab 设 tabindex="-1"。',
      '隐藏面板用 hidden 属性，不要仅用 CSS display:none 以外的手段。',
    ],
  }
}

function buildSwitch(opts: AriaOptions): AriaSnippet {
  return {
    html: `<button type="button" role="switch" aria-checked="false" aria-label="${escapeHtml(opts.label)}">\n  <span aria-hidden="true"></span>\n</button>`,
    notes: [
      '状态变化时同步更新 aria-checked，并确保有可见的开 / 关视觉差异。',
      '装饰性滑块加 aria-hidden="true"，避免被重复朗读。',
    ],
  }
}

function buildSlider(opts: AriaOptions): AriaSnippet {
  if (opts.min === undefined || opts.max === undefined || opts.value === undefined) {
    throw new Error('滑块类型需要提供最小值、最大值和当前值')
  }
  if (opts.min >= opts.max) throw new Error('滑块最小值必须小于最大值')
  if (opts.value < opts.min || opts.value > opts.max) {
    throw new Error('滑块当前值必须在最小值与最大值之间')
  }
  return {
    html: `<div role="slider" tabindex="0" aria-label="${escapeHtml(opts.label)}" aria-valuemin="${opts.min}" aria-valuemax="${opts.max}" aria-valuenow="${opts.value}"${describedByAttr(opts)}></div>`,
    notes: [
      '键盘必须可操作：方向键步进，Home / End 跳到两端。',
      '如有可见数值文本，用 aria-valuetext 提供本地化读法（如“50%”）。',
    ],
  }
}

function buildAlert(opts: AriaOptions): AriaSnippet {
  return {
    html: `<div role="alert">${escapeHtml(opts.label)}</div>`,
    notes: [
      'role="alert" 是 assertive live region：动态插入页面时会被立即朗读。',
      '不要把 role="alert" 写在初始 HTML 里长期存在，重复朗读会干扰用户。',
    ],
  }
}

/** 按组件类型生成 ARIA 代码片段与使用说明 */
export function buildAriaSnippet(type: AriaType, opts: AriaOptions): AriaSnippet {
  switch (type) {
    case 'button':
      return buildButton(opts)
    case 'input':
      return buildInput(opts)
    case 'dialog':
      return buildDialog(opts)
    case 'nav':
      return buildNav(opts)
    case 'tabs':
      return buildTabs(opts)
    case 'switch':
      return buildSwitch(opts)
    case 'slider':
      return buildSlider(opts)
    case 'alert':
      return buildAlert(opts)
  }
}
