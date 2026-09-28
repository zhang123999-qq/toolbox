import { z } from 'zod'

/**
 * 输入契约：text 为收据明细（每行"品名,数量,单价"），其余为收据字段。
 * 数字校验在 utils 里做（给出中文行号错误），schema 只做长度上限。
 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
  merchant: z.string().max(200, '商户超过 200 字符上限'),
  date: z.string().max(100, '日期超过 100 字符上限'),
  payment: z.string().max(100, '支付方式超过 100 字符上限'),
})

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type ReceiptInput = z.infer<typeof inputSchema>
export type ReceiptOptions = z.infer<typeof optionsSchema>
