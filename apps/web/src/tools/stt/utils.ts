import type { SttOptions } from './schema'

/** 识别结果的置信度描述 */
export function confidenceText(confidence: number): string {
  if (!Number.isFinite(confidence) || confidence <= 0) return '（未给出置信度）'
  return '置信度：' + (confidence * 100).toFixed(0) + '%'
}

/** 结果报告：原文 + 备选（若有）+ 置信度 */
export function report(transcript: string, options: SttOptions, confidence: number): string {
  return [
    '识别语言：' + options.language,
    '识别结果：' + transcript,
    confidenceText(confidence),
  ].join('\n')
}

/** 不支持时的说明 */
export function unsupportedText(): string {
  return [
    '当前浏览器不支持语音识别（Web Speech API 的 SpeechRecognition）。',
    '已知可用：Chrome / Edge（走在线服务）、Safari（需在系统设置里开启）。',
    'Firefox 默认不提供该接口。',
  ].join('\n')
}
