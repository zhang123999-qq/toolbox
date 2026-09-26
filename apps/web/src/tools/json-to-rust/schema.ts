import { z } from 'zod'

/** 输入契约：JSON 样本原文，限长避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(2_000_000, '输入超过 2,000,000 字符上限'),
})

/** 选项契约：字段与 meta.options / Tool.tsx 的 optionDefs 一一对应 */
export const optionsSchema = z.object({
  // serde：加 Debug/Clone/Serialize/Deserialize 派生；plain：只保留 Debug/Clone
  mode: z.union([z.literal('serde'), z.literal('plain')]),
  // snake：字段名转 snake_case 并配 rename_all；keep：保留原名，逐字段 serde(rename)
  style: z.union([z.literal('snake'), z.literal('keep')]),
  indent: z.union([z.literal('2'), z.literal('4'), z.literal('tab')]),
})

export type JsonToRustInput = z.infer<typeof inputSchema>
export type JsonToRustOptions = z.infer<typeof optionsSchema>
