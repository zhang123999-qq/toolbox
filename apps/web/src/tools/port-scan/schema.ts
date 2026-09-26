import { z } from 'zod'

/** 输入契约：目标主机名或 IPv4 地址（上限按通用文本口径） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 * - ports：端口范围写法，如 `1-1000` 或 `22,80,443`（nmap -p 直接接受）
 * - scanType：TCP connect(-sT) / SYN 半开(-sS) / UDP(-sU)
 * - speed：nmap 时序模板 -T2(慢) / -T3(正常) / -T4(快)
 */
export const optionsSchema = z.object({
  ports: z.string(),
  scanType: z.union([z.literal('connect'), z.literal('syn'), z.literal('udp')]),
  speed: z.union([z.literal('slow'), z.literal('normal'), z.literal('fast')]),
})

export type PortScanInput = z.infer<typeof inputSchema>
export type PortScanOptions = z.infer<typeof optionsSchema>
