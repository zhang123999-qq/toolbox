import { z } from 'zod'

/** 每条指令可选的 source 预设值 */
export const SRC_PRESETS = ['self', 'none', 'all', 'self-inline', 'data'] as const

/** 输入契约：触发用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

const src = z.union([
  z.literal('self'),
  z.literal('none'),
  z.literal('all'),
  z.literal('self-inline'),
  z.literal('data'),
])

/** 选项契约：每条指令一个 source 预设 */
export const optionsSchema = z.object({
  defaultSrc: src,
  scriptSrc: src,
  styleSrc: src,
  imgSrc: src,
  connectSrc: src,
  fontSrc: src,
  frameSrc: src,
  mediaSrc: src,
  objectSrc: src,
  baseUri: src,
  formAction: src,
  frameAncestors: src,
  upgradeInsecure: z.boolean(),
  reportOnly: z.boolean(),
})

export type CspConfigInput = z.infer<typeof inputSchema>
export type CspConfigOptions = z.infer<typeof optionsSchema>
