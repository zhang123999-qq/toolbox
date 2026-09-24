import * as OpenCC from 'opencc-js'
import type { ZhConvertInput, ZhConvertOptions } from './schema'

/** 三种方向的 OpenCC 配置：t 为繁体字形，tw 为台湾正体（含词汇差异） */
const PRESETS = {
  s2t: { from: 'cn', to: 't' },
  t2s: { from: 't', to: 'cn' },
  s2tw: { from: 'cn', to: 'tw' },
} as const

export type ZhMode = keyof typeof PRESETS

export function convert(text: string, mode: string): string {
  const preset = PRESETS[mode as ZhMode] ?? PRESETS.s2t
  return OpenCC.Converter({ from: preset.from, to: preset.to })(text)
}

export function transform(input: ZhConvertInput, options: ZhConvertOptions): string {
  if (input.text === '') return ''
  return convert(input.text, options.mode)
}
