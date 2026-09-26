import { z } from 'zod'

export const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'] as const

/** 输入契约：域名 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：记录类型 */
export const optionsSchema = z.object({
  type: z.union([
    z.literal('A'),
    z.literal('AAAA'),
    z.literal('CNAME'),
    z.literal('MX'),
    z.literal('TXT'),
    z.literal('NS'),
  ]),
})

export type DnsQueryInput = z.infer<typeof inputSchema>
export type DnsQueryOptions = z.infer<typeof optionsSchema>
