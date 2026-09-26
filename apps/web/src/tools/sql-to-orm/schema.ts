import { z } from 'zod'

/** 输入契约：限制长度，避免超长建表脚本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/** 选项契约：目标 ORM 框架 */
export const optionsSchema = z.object({
  target: z.union([z.literal('sequelize'), z.literal('typeorm')]),
})

export type SqlToOrmInput = z.infer<typeof inputSchema>
export type SqlToOrmOptions = z.infer<typeof optionsSchema>
