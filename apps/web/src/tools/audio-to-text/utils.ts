/**
 * audio-to-text —— 音频转文字（连续听写）的纯函数层
 *
 * 约定：
 * - 听写结果按「段」累积：每句最终识别结果为一段，临时候选单独显示；
 * - 本文件不触碰任何浏览器 API（SpeechRecognition 只在 Tool.tsx），
 *   可在 node 下被 vitest 完整测试。
 */

/** 支持的识别语言 */
export interface LangOption {
  readonly code: string
  readonly label: string
}

export const SUPPORTED_LANGS: readonly LangOption[] = [
  { code: 'zh-CN', label: '中文（简体）' },
  { code: 'zh-TW', label: '中文（繁体）' },
  { code: 'zh-HK', label: '粤语（香港）' },
  { code: 'en-US', label: '英语（美国）' },
  { code: 'en-GB', label: '英语（英国）' },
  { code: 'ja-JP', label: '日语' },
  { code: 'ko-KR', label: '韩语' },
  { code: 'fr-FR', label: '法语' },
  { code: 'de-DE', label: '德语' },
  { code: 'es-ES', label: '西班牙语' },
]

/** 语言代码合法性校验，返回规范化后的代码；非法抛中文错 */
export function normalizeLang(code: string): string {
  const found = SUPPORTED_LANGS.find((l) => l.code === code)
  if (!found) {
    throw new Error(
      `不支持的语言：${code}（可选 ${SUPPORTED_LANGS.map((l) => l.code).join(' / ')}）`,
    )
  }
  return found.code
}

/**
 * 追加一段最终识别结果（纯函数，返回新数组）。
 * 空白文本忽略，避免产生空段。
 */
export function appendFinalSegment(segments: readonly string[], text: string): string[] {
  const t = text.trim()
  if (t === '') return [...segments]
  return [...segments, t]
}

/** 合并已定稿段落与临时候选，供界面展示 */
export function buildTranscript(segments: readonly string[], interim: string): string {
  const parts = [...segments]
  const t = interim.trim()
  if (t !== '') parts.push(t)
  return parts.join('\n')
}

/** 字符数统计（去空白，按 Unicode 码点计） */
export function countChars(text: string): number {
  return Array.from(text.replace(/\s+/g, '')).length
}

/** 听写结果的中文摘要：段数与字数 */
export function summarizeTranscript(segments: readonly string[]): string {
  const chars = countChars(segments.join(''))
  return `共 ${segments.length} 段，${chars} 字`
}

/** 识别错误码 → 中文提示 */
export function speechErrorToChinese(error: string): string {
  switch (error) {
    case 'no-speech':
      return '没有检测到语音：请靠近麦克风说话后重试'
    case 'audio-capture':
      return '无法打开麦克风：请检查设备是否被占用'
    case 'not-allowed':
      return '麦克风权限被拒绝：请在浏览器地址栏允许麦克风访问后重试'
    case 'network':
      return '网络异常：语音识别需要联网，请检查网络后重试'
    case 'aborted':
      return '识别已中止'
    default:
      return `识别出错（${error}），请重试`
  }
}
