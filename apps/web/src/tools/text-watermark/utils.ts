import { decodeHidden, encodeHidden } from '../../lib/zerowidth'
import type { TextWatermarkInput, TextWatermarkOptions } from './schema'

/**
 * 加水印：把水印编成零宽字符序列，追加到正文末尾。
 * 放在末尾是因为零宽字符在中间可能打断排版（连字、双向文本），末尾最稳。
 */
export function embed(text: string, watermark: string): string {
  if (watermark === '') return text
  return text + encodeHidden(watermark)
}

/** 读水印：从正文里把零宽序列解回原文 */
export function extract(text: string): string {
  const found = decodeHidden(text)
  return found === null ? '没有解出隐藏内容：这段文本里可能没有水印，或已被清洗过。' : found
}

/** 加水印 / 读水印 */
export function transform(input: TextWatermarkInput, options: TextWatermarkOptions): string {
  if (input.text === '') return ''
  return options.mode === 'extract' ? extract(input.text) : embed(input.text, input.watermark)
}
