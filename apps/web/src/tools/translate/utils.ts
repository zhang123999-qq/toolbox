import { chat } from '../../lib/ai'
import type { TranslateInput, TranslateOptions } from './schema'

/** 语言代码 → 展示名，用于拼指令 */
const LANG_NAME: Record<string, string> = {
  auto: '自动识别',
  zh: '中文',
  en: '英文',
  ja: '日文',
  ko: '韩文',
  fr: '法文',
  de: '德文',
  es: '西班牙文',
  ru: '俄文',
}

/** 拼出给模型的指令（导出便于测试） */
export function promptOf(
  source: TranslateOptions['source'],
  target: TranslateOptions['target'],
  text: string,
): string {
  const from = LANG_NAME[source] ?? source
  const to = LANG_NAME[target] ?? target
  return (
    '请把下面的内容翻译成' +
    to +
    (source === 'auto' ? '' : '（源语言：' + from + '）') +
    '：\n\n' +
    text
  )
}

/** 翻译：调你自备的模型接口，返回译文 */
export async function transform(input: TranslateInput, options: TranslateOptions): Promise<string> {
  const text = input.text.trim()
  if (text === '') return ''
  return chat(
    { apiBase: input.apiBase, apiKey: input.apiKey, model: input.model },
    '你是翻译助手：只输出译文，不要解释、不要加前后缀、不要保留原文。',
    promptOf(options.source, options.target, text),
  )
}
