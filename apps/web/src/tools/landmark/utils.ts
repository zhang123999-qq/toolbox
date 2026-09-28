/**
 * landmark —— 地标角色分析的纯函数层
 *
 * 识别 HTML 地标（banner / navigation / main / complementary / contentinfo / search / region），
 * 检查缺失 main、多 banner、无障碍名称缺失等问题，并可生成标准地标骨架代码。
 */

export interface LandmarkItem {
  readonly role: string
  readonly tag: string
  readonly label: string
  readonly named: boolean
}

export interface LandmarkIssue {
  readonly severity: 'error' | 'warning' | 'info'
  readonly element: string
  readonly message: string
  readonly suggestion: string
}

export interface LandmarkAnalysis {
  readonly landmarks: LandmarkItem[]
  readonly issues: LandmarkIssue[]
  readonly stats: {
    readonly total: number
    readonly byRole: Record<string, number>
  }
}

/** HTML → Document 的构造器，可注入（测试用 jsdom 注入或自定义） */
export type DocFactory = (html: string) => Document

function defaultDocFactory(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

function parseHtml(html: string, createDoc: DocFactory = defaultDocFactory): Document {
  const trimmed = html.trim()
  if (trimmed === '') throw new Error('请输入 HTML')
  return createDoc(trimmed)
}

function short(text: string, max = 40): string {
  return text.length <= max ? text : text.slice(0, max) + '…'
}

/** 显式 role 中属于地标的 */
const EXPLICIT_LANDMARK_ROLES = new Set([
  'banner',
  'navigation',
  'main',
  'complementary',
  'contentinfo',
  'search',
  'region',
  'form',
])

/** 隐式地标：元素在 article/aside/main/nav/section 内时不算顶层地标 */
function inSectioning(el: Element): boolean {
  let p = el.parentElement
  while (p !== null) {
    if (p.matches('article,aside,main,nav,section')) return true
    p = p.parentElement
  }
  return false
}

/** 无障碍名称：aria-label / aria-labelledby 优先，其次文本 */
function accessibleName(el: Element): string {
  const labelledby = el.getAttribute('aria-labelledby')
  const label = el.getAttribute('aria-label')?.trim()
  if (label) return label
  if (labelledby) return `[aria-labelledby=${labelledby}]`
  return el.textContent!.trim().replace(/\s+/g, ' ')
}

/** 显式无障碍名称（aria-label / aria-labelledby） */
function hasExplicitName(el: Element): boolean {
  const labelledby = (el.getAttribute('aria-labelledby') ?? '').trim()
  const label = (el.getAttribute('aria-label') ?? '').trim()
  return label !== '' || labelledby !== ''
}

/**
 * 分析 HTML 的地标角色。
 * 先收显式 role，再收隐式语义元素；已收录元素不再重复计算。
 */
export function analyzeLandmarks(
  html: string,
  createDoc?: DocFactory,
): LandmarkAnalysis {
  const doc = parseHtml(html, createDoc)
  const body = doc.body
  const claimed = new Set<Element>()
  const landmarks: LandmarkItem[] = []

  function add(el: Element, role: string): void {
    if (claimed.has(el)) return
    claimed.add(el)
    const name = accessibleName(el)
    // region 按 ARIA 规范必须有显式名称，文本内容不算
    const named = role === 'region' ? hasExplicitName(el) : name !== ''
    landmarks.push({
      role,
      tag: el.tagName.toLowerCase(),
      label: short(name),
      named,
    })
  }

  for (const el of Array.from(body.querySelectorAll('[role]'))) {
    const role = el.getAttribute('role')!.trim().toLowerCase()
    if (EXPLICIT_LANDMARK_ROLES.has(role)) add(el, role)
  }
  for (const el of Array.from(body.querySelectorAll('header'))) {
    if (!inSectioning(el)) add(el, 'banner')
  }
  for (const el of Array.from(body.querySelectorAll('footer'))) {
    if (!inSectioning(el)) add(el, 'contentinfo')
  }
  for (const el of Array.from(body.querySelectorAll('nav'))) add(el, 'navigation')
  for (const el of Array.from(body.querySelectorAll('main'))) add(el, 'main')
  for (const el of Array.from(body.querySelectorAll('aside'))) {
    if (!inSectioning(el)) add(el, 'complementary')
  }

  const issues: LandmarkIssue[] = []
  const byRole: Record<string, number> = {}
  for (const lm of landmarks) byRole[lm.role] = (byRole[lm.role] ?? 0) + 1

  const count = (role: string): number => byRole[role] ?? 0

  if (count('main') === 0) {
    issues.push({
      severity: 'error',
      element: '（文档）',
      message: '缺少 main 地标：页面没有主要内容区',
      suggestion: '用 <main> 包裹页面主要内容，一个页面只保留一个 main',
    })
  } else if (count('main') > 1) {
    issues.push({
      severity: 'error',
      element: 'main',
      message: `发现 ${count('main')} 个 main 地标，页面只能有一个`,
      suggestion: '只保留一个 <main>，其余改为 <section> 或 <div>',
    })
  }

  if (count('banner') > 1) {
    issues.push({
      severity: 'warning',
      element: 'header',
      message: `发现 ${count('banner')} 个 banner 地标（顶层 header）`,
      suggestion: '只保留一个顶层 <header> 作为 banner，其余 header 应放在 article/section 内',
    })
  }
  if (count('contentinfo') > 1) {
    issues.push({
      severity: 'warning',
      element: 'footer',
      message: `发现 ${count('contentinfo')} 个 contentinfo 地标（顶层 footer）`,
      suggestion: '只保留一个顶层 <footer> 作为 contentinfo',
    })
  }

  if (count('navigation') > 1) {
    for (const lm of landmarks) {
      if (lm.role === 'navigation' && !lm.named) {
        issues.push({
          severity: 'warning',
          element: `<${lm.tag}>（navigation）`,
          message: '多个导航地标缺少无障碍名称，屏幕阅读器无法区分',
          suggestion: '为每个 <nav> 添加 aria-label，如 aria-label="主导航"、aria-label="页脚导航"',
        })
      }
    }
  }

  for (const lm of landmarks) {
    if (lm.role === 'region' && !lm.named) {
      issues.push({
        severity: 'error',
        element: `<${lm.tag}>（region）`,
        message: 'region 地标缺少无障碍名称（无名 region 不会被识别为地标）',
        suggestion: '为 role="region" 的元素添加 aria-label 或 aria-labelledby',
      })
    }
  }

  return { landmarks, issues, stats: { total: landmarks.length, byRole } }
}

/** 生成标准地标骨架 HTML */
export function generateLandmarkHtml(): string {
  return [
    '<header>',
    '  <!-- banner：网站级页眉 -->',
    '  <nav aria-label="主导航">',
    '    <!-- 主导航链接 -->',
    '  </nav>',
    '</header>',
    '<main id="main-content">',
    '  <!-- 主要内容 -->',
    '</main>',
    '<aside aria-label="相关推荐">',
    '  <!-- complementary：侧边栏 -->',
    '</aside>',
    '<footer>',
    '  <!-- contentinfo：网站级页脚 -->',
    '  <nav aria-label="页脚导航"></nav>',
    '</footer>',
  ].join('\n')
}

/** 分析结果 → 可复制的文本报告 */
/** 严重程度中文标签（查表，无分支） */
const SEVERITY_LABEL: Record<LandmarkIssue['severity'], string> = {
  error: '错误',
  warning: '警告',
  info: '提示',
}

export function formatLandmarkReport(a: LandmarkAnalysis): string {
  const lines: string[] = []
  lines.push(`地标总数：${a.landmarks.length}`)
  lines.push('')
  lines.push('地标列表：')
  if (a.landmarks.length === 0) {
    lines.push('（无）')
  } else {
    for (const lm of a.landmarks) {
      const name = lm.named ? ` "${lm.label}"` : '（未命名）'
      lines.push(`- ${lm.role}：<${lm.tag}>${name}`)
    }
  }
  lines.push('')
  if (a.issues.length === 0) {
    lines.push('未发现地标问题 ✓')
  } else {
    lines.push(`发现 ${a.issues.length} 个问题：`)
    for (const issue of a.issues) {
      const tag = SEVERITY_LABEL[issue.severity]
      lines.push(`[${tag}] ${issue.element}：${issue.message}`)
      lines.push(`  建议：${issue.suggestion}`)
    }
  }
  lines.push('')
  lines.push('标准地标骨架：')
  lines.push(generateLandmarkHtml())
  return lines.join('\n')
}
