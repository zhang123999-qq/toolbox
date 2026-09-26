import { z } from 'zod'

/**
 * 输入契约：
 * - text：`.proto` 定义文本
 * - values：编码模式下是「字段值」的 JSON 对象；解码模式下是字节串（hex 或 base64）
 */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
  values: z.string().max(200_000, '字段值超过 200,000 字符上限'),
})

/** 选项契约：target 留空表示取文件里第一个 message */
export const optionsSchema = z.object({
  mode: z.union([z.literal('structure'), z.literal('encode'), z.literal('decode')]),
  target: z.string().max(200, '目标 message 名过长'),
  format: z.union([z.literal('hex'), z.literal('base64')]),
})

export type ProtobufCodecInput = z.infer<typeof inputSchema>
export type ProtobufCodecOptions = z.infer<typeof optionsSchema>
