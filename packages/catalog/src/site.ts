/**
 * 站点级常量（SSG / sitemap / SEO 共用）
 * 放在 catalog 里是为了让「页面标题/描述」与「工具元数据」同属一个真源，
 * 避免 index.html、prerender、sitemap 三处各写一份。
 */
export const SITE_NAME = '工具库'

export const SITE_TITLE = `${SITE_NAME} · 870 个纯本地在线工具`

export const SITE_DESCRIPTION =
  '870 个纯前端在线工具，数据不上传、可离线使用。覆盖开发编码、设计媒体、办公文档、生活学习四大类。'
