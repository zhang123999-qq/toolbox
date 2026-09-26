import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
})

/**
 * 选项契约：mode 决定是缩进树还是平铺路径，sortKeys 决定对象键是否按字典序排。
 * T2 模板的选择框取的是原始字符串字面量，故 values 与这里的 union 必须一致。
 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('tree'), z.literal('path')]),
  sortKeys: z.boolean(),
})

export type JsonTreeInput = z.infer<typeof inputSchema>
export type JsonTreeOptions = z.infer<typeof optionsSchema>
