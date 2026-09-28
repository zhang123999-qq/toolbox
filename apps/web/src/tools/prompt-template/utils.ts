/**
 * prompt-template —— 提示词模板库的纯函数层
 *
 * 约定：
 * - 模板正文用 {{变量名}} 做占位符（变量名可为中文，允许两侧空格）；
 * - fillTemplate 只做替换：缺失的变量保留占位符原样，
 *   由 missingVariables / assertAllFilled 报告缺失；
 * - 本文件不触碰浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 提示词模板定义 */
export interface PromptTemplateDef {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly description: string
  /** 模板正文，变量占位符形如 {{变量名}} */
  readonly template: string
}

/** 占位符正则：{{变量名}}，变量名不含花括号 */
const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g

/** 内置常用提示词模板库 */
export const PROMPT_TEMPLATES: readonly PromptTemplateDef[] = [
  {
    id: 'translate',
    name: '翻译助手',
    category: '语言',
    description: '把任意文本翻译成目标语言，只输出译文',
    template: '请将以下文本翻译成{{目标语言}}，只输出译文，不要添加任何解释或前后缀：\n\n{{原文}}',
  },
  {
    id: 'summarize',
    name: '文本摘要',
    category: '语言',
    description: '按指定长度要求总结长文本',
    template:
      '请对以下文本做摘要，长度要求：{{长度要求}}。直接输出摘要，不要添加解释：\n\n{{原文}}',
  },
  {
    id: 'rewrite',
    name: '文本改写',
    category: '语言',
    description: '按指定风格改写文本，保留原意',
    template: '请将以下文本改写为{{改写风格}}风格，保留原意，直接输出改写结果：\n\n{{原文}}',
  },
  {
    id: 'code-explain',
    name: '代码解释',
    category: '开发',
    description: '逐段解释代码的作用与关键逻辑',
    template:
      '请解释以下{{编程语言}}代码的作用：说明整体功能、关键逻辑与需要注意的地方，语言简洁：\n\n```{{编程语言}}\n{{代码}}\n```',
  },
  {
    id: 'email',
    name: '邮件撰写',
    category: '办公',
    description: '根据收件人与要点生成得体的邮件',
    template:
      '请帮我写一封邮件。收件人：{{收件人}}；主题：{{主题}}；要点如下：\n{{要点}}\n\n要求：语气得体、结构完整，直接输出邮件正文。',
  },
  {
    id: 'sql',
    name: 'SQL 生成',
    category: '开发',
    description: '根据需求描述与表结构生成 SQL',
    template:
      '请根据以下需求生成 SQL 查询语句，只输出 SQL 代码：\n\n需求：{{需求描述}}\n表结构：\n{{表结构}}',
  },
  {
    id: 'regex',
    name: '正则解释',
    category: '开发',
    description: '解释正则表达式的匹配规则并举例',
    template:
      '请解释以下正则表达式的匹配规则，逐段说明，并给出 2 个能匹配、2 个不能匹配的例子：\n\n{{正则表达式}}',
  },
  {
    id: 'brainstorm',
    name: '头脑风暴',
    category: '创意',
    description: '围绕主题发散指定数量的创意点子',
    template:
      '请围绕「{{主题}}」进行头脑风暴，给出{{数量}}个有创意的点子，每个点子一句话说明，并简述可行性。',
  },
]

/** 取模板定义；未知 id 抛中文错 */
export function getTemplate(id: string): PromptTemplateDef {
  const found = PROMPT_TEMPLATES.find((t) => t.id === id)
  if (!found) throw new Error(`未知的提示词模板："${id}"`)
  return found
}

/** 提取模板中的变量名（去重，保持出现顺序） */
export function extractVariables(template: string): string[] {
  const vars: string[] = []
  const seen = new Set<string>()
  PLACEHOLDER_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = PLACEHOLDER_RE.exec(template)) !== null) {
    const name = m[1]!.trim()
    if (name !== '' && !seen.has(name)) {
      seen.add(name)
      vars.push(name)
    }
  }
  return vars
}

/**
 * 填充模板：把 {{变量}} 替换为 values 中的值。
 * 缺失的变量保留占位符原样（由 missingVariables 报告）。
 */
export function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  PLACEHOLDER_RE.lastIndex = 0
  return template.replace(PLACEHOLDER_RE, (match, rawName: string) => {
    const key = rawName.trim()
    const value = values[key]
    return value === undefined ? match : value
  })
}

/** 列出未填写（缺失或全空白）的变量 */
export function missingVariables(
  template: string,
  values: Readonly<Record<string, string>>,
): string[] {
  return extractVariables(template).filter((v) => {
    const value = values[v]
    return value === undefined || value.trim() === ''
  })
}

/** 断言所有变量已填写；缺失抛中文错并列出变量名 */
export function assertAllFilled(template: string, values: Readonly<Record<string, string>>): void {
  const missing = missingVariables(template, values)
  if (missing.length > 0) {
    throw new Error(`请填写以下变量：${missing.join('、')}`)
  }
}

/** 一站式渲染：取模板 → 校验 → 填充，返回最终提示词 */
export function renderPrompt(templateId: string, values: Readonly<Record<string, string>>): string {
  const def = getTemplate(templateId)
  assertAllFilled(def.template, values)
  return fillTemplate(def.template, values)
}
