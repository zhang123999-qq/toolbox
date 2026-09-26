import { z } from 'zod'

/** 输入契约：字段定义，每行或逗号分隔 `name:type` */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const TARGETS = ['plain-json', 'express', 'json-server'] as const

/** 选项契约：生成条数与目标形态 */
export const optionsSchema = z.object({
  count: z.union([z.literal('1'), z.literal('5'), z.literal('10'), z.literal('50')]),
  target: z.union([z.literal('plain-json'), z.literal('express'), z.literal('json-server')]),
})

export type MockApiDevInput = z.infer<typeof inputSchema>
export type MockApiDevOptions = z.infer<typeof optionsSchema>
