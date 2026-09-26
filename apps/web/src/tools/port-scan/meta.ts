import type { ToolMeta } from '@toolbox/catalog'

/**
 * port-scan —— 全局编号 #253
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P3｜可行性：A｜模板：T2
 * 来源：docs/tools/03-开发运维云原生.md
 *
 * 说明：规划为 E 级（浏览器无法发起原生 TCP 连接做端口扫描）。浏览器沙箱不允许
 * 任意 TCP connect / SYN / UDP 探测，故降级为「命令生成器」：按目标主机、端口范围、
 * 扫描类型与速度，拼出可复制到终端执行的 nmap / nc / PowerShell / bash 命令，
 * 并附端口状态（open/closed/filtered）解释与常见端口服务表。绝不伪称已完成真扫。
 */
export const meta: ToolMeta = {
  id: 'port-scan',
  slug: 'port-scan',
  title: '端口扫描',
  description: '生成 nmap / nc / PowerShell / bash 端口扫描命令并解释端口状态（浏览器无法真扫）',
  titleEn: 'Port Scan Commands',
  descriptionEn:
    'Generate nmap / nc / PowerShell / bash port-scan commands and explain port states (no real scan from the browser)',

  category: 'devops',
  group: 'dev',
  tags: ['port', 'scan', 'nmap', 'network', 'devops'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['ports', 'scanType', 'speed'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
