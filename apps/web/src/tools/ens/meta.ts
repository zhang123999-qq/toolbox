import type { ToolMeta } from '@toolbox/catalog'

/**
 * ens —— 全局编号 #706
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：D｜模板：T3
 * ENS namehash 与链上正向解析（需公共 RPC，api:true） */
export const meta: ToolMeta = {
  id: 'ens',
  slug: 'ens',
  title: 'ENS 解析',
  description: 'ENS 域名 namehash 计算与链上正向解析（resolver / 地址记录）',
  titleEn: 'ENS Resolve',
  descriptionEn: 'ENS namehash computation and on-chain forward resolution',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'ens', 'namehash', 'web3'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
