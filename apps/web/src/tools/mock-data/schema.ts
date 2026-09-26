import { z } from 'zod'

/** 输入契约：模板不需要很长，20,000 字符足够容纳几十个字段 */
export const inputSchema = z.object({
  text: z.string().max(20_000, '模板超过 20,000 字符上限'),
})

/**
 * 选项契约：
 *  count 用字符串承载，便于直接进 select 控件（TwoColumn 的 select 只能给字符串）；
 *  stable 决定随机数来源——开着时种子只由模板文本派生，同一份模板每次结果一致，
 *  便于把生成结果贴进测试夹具；关掉则用 Math.random，每点一次「运行」换一批数据。
 */
export const optionsSchema = z.object({
  count: z.union([
    z.literal('1'),
    z.literal('5'),
    z.literal('10'),
    z.literal('20'),
    z.literal('50'),
  ]),
  stable: z.boolean(),
})

export type MockDataInput = z.infer<typeof inputSchema>
export type MockDataOptions = z.infer<typeof optionsSchema>
