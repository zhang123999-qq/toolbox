import type { DataStorageInput, DataStorageOptions } from './schema'

/**
 * 各单位换算到基准单位（字节 B）的倍数
 * 注：KB/MB/GB/TB 为 SI 十进制（1 KB = 1000 B），
 * KiB/MiB/GiB/TiB 为二进制（1 KiB = 1024 B）
 */
export const UNITS: Record<string, { factor: number }> = {
  bit: { factor: 0.125 },
  B: { factor: 1 },
  KB: { factor: 1000 },
  MB: { factor: 1e6 },
  GB: { factor: 1e9 },
  TB: { factor: 1e12 },
  KiB: { factor: 1024 },
  MiB: { factor: 1048576 },
  GiB: { factor: 1073741824 },
  TiB: { factor: 1099511627776 },
}

/** 去浮点噪声、去尾零 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** T2 同步入口 */
export function transform(input: DataStorageInput, options: DataStorageOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const from = UNITS[options.from]
  const to = UNITS[options.to]
  if (!from || !to) throw new Error('未知单位')
  const value = Number(text)
  if (Number.isNaN(value)) throw new Error('请输入有效的数字')
  const result = (value * from.factor) / to.factor
  return `${text} ${options.from} = ${fmt(result)} ${options.to}`
}
