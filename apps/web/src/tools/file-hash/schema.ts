import { z } from 'zod'

/** 输入契约：text 为待哈希的文本；文件走模板的文件入口，不进这个对象 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：all 表示一次算出全部算法 */
export const optionsSchema = z.object({
  algorithm: z.union([
    z.literal('all'),
    z.literal('md5'),
    z.literal('sha1'),
    z.literal('sha256'),
    z.literal('sha384'),
    z.literal('sha512'),
  ]),
  format: z.union([z.literal('hex'), z.literal('base64')]),
})

export type FileHashInput = z.infer<typeof inputSchema>
export type FileHashOptions = z.infer<typeof optionsSchema>
