import { z } from 'zod'

/** 输入契约：一次通常查十来个扩展名，10,000 字符足够（每行一个查询词） */
export const inputSchema = z.object({
  text: z.string().max(10_000, '输入超过 10,000 字符上限'),
})

/**
 * 选项契约：
 *  mode 决定查的方向；
 *  strict 决定未命中时的口径——关掉输出「未收录」、打开则直接报错中断，
 *  用于在 CI / 配置校验一类「必须全部命中」的场景里快速暴露问题。
 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('ext2mime'), z.literal('mime2ext'), z.literal('search')]),
  strict: z.boolean(),
})

export type MimeLookupInput = z.infer<typeof inputSchema>
export type MimeLookupOptions = z.infer<typeof optionsSchema>
