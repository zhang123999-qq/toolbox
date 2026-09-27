import type { Translate } from '../../i18n'
import { inputSchema, optionsSchema } from './schema'
import type { RandomGroupInput, RandomGroupOptions } from './schema'

/** 分组数的输入上限长度之外，暂无数值上限：上限即人数本身（超过人数直接报错） */

/** 解析名单：按行切分，去首尾空白、丢弃空行 */
export function parseNames(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

/** 解析分组数：须为正整数；非法抛双语错误 */
export function parseGroupCount(raw: string, t: Translate): number {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) {
    throw new Error(t('randomGroup.error.invalidGroupCount', { value: raw }))
  }
  const count = Number(value)
  if (count < 1) {
    throw new Error(t('randomGroup.error.invalidGroupCount', { value: raw }))
  }
  return count
}

export interface GroupParams {
  readonly names: string[]
  readonly groupCount: number
}

/**
 * 解析并校验全部参数；非法抛双语错误。
 * 名单为空返回 null（调用方输出空串，不进入错误态）。
 */
export function parseParams(
  input: RandomGroupInput,
  options: RandomGroupOptions,
  t: Translate,
): GroupParams | null {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  const names = parseNames(parsedInput.text)
  if (names.length === 0) return null
  const groupCount = parseGroupCount(parsedOptions.groups, t)
  if (groupCount > names.length) {
    throw new Error(
      t('randomGroup.error.tooManyGroups', {
        groups: String(groupCount),
        count: String(names.length),
      }),
    )
  }
  return { names, groupCount }
}

/**
 * Fisher–Yates 洗牌（返回新数组，不修改输入）。
 * 禁止 `sort(() => Math.random() - 0.5)`：它不是均匀洗牌。
 */
export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const swap = arr[i]
    arr[i] = arr[j]
    arr[j] = swap
  }
  return arr
}

/**
 * 均衡分组：先洗牌，再按「前 remainder 组多一人」依次分配，
 * 任意两组人数差不超过 1。
 */
export function splitGroups(
  names: readonly string[],
  groupCount: number,
  rand: () => number = Math.random,
): string[][] {
  const shuffled = shuffle(names, rand)
  const base = Math.floor(shuffled.length / groupCount)
  const remainder = shuffled.length % groupCount
  const groups: string[][] = []
  let offset = 0
  for (let g = 0; g < groupCount; g++) {
    const size = base + (g < remainder ? 1 : 0)
    groups.push(shuffled.slice(offset, offset + size))
    offset += size
  }
  return groups
}

/** T2 同步入口：输出「第 N 组（M 人）」标题 + 成员，组间空行分隔 */
export function transform(
  input: RandomGroupInput,
  options: RandomGroupOptions,
  t: Translate,
  rand: () => number = Math.random,
): string {
  const params = parseParams(input, options, t)
  if (params === null) return ''
  const groups = splitGroups(params.names, params.groupCount, rand)
  const lines: string[] = []
  groups.forEach((members, index) => {
    lines.push(
      t('randomGroup.groupHeader', { n: String(index + 1), count: String(members.length) }),
    )
    for (const name of members) lines.push(name)
    if (index < groups.length - 1) lines.push('')
  })
  return lines.join('\n')
}
