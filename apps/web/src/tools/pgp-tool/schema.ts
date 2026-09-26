import { z } from 'zod'

/** 输入契约：一段或多段 OpenPGP ASCII Armor（-----BEGIN PGP ...-----） */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/** 离线结构检查，无可调选项 */
export const optionsSchema = z.object({})

export type PgpToolInput = z.infer<typeof inputSchema>
export type PgpToolOptions = z.infer<typeof optionsSchema>
