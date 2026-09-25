/**
 * 站点级常量（SSG / sitemap / SEO 共用）
 * 放在 catalog 里是为了让「页面标题/描述」与「工具元数据」同属一个真源，
 * 避免 index.html、prerender、sitemap 三处各写一份。
 *
 * ⚠ 本文件会被打进**浏览器包**，因此只能放纯常量：
 *   不要在这里读 `process.env`（浏览器里没有 `process`，顶层求值会直接抛错）。
 *   构建期的环境变量覆盖留在 scripts/ 与 Dockerfile 里做。
 */
export const SITE_NAME = '工具库'

export const SITE_TITLE = `${SITE_NAME} · 870 个纯本地在线工具`

export const SITE_DESCRIPTION =
  '870 个纯前端在线工具，数据不上传、可离线使用。覆盖开发编码、设计媒体、办公文档、生活学习四大类。'

/**
 * 正式域名（唯一真源）。
 * 站点**已上线**，两个入口均可访问（`SITE_ORIGIN_ALIASES` 里的 www 是别名），
 * 见 docs/guide/getting-started.md §六；
 * 这里用正式域名而不是占位地址，是为了让 canonical、sitemap 与 JSON-LD 就是最终值——
 * 占位地址一旦发出去，索引要重新洗一遍。
 * 需要构建到别处（预发、临时环境）时用 SITE_ORIGIN 环境变量覆盖。
 */
export const SITE_ORIGIN = 'https://006336.xyz'

/** 同一站点的其他可达域名（canonical 只取 SITE_ORIGIN，其余用于登记与跳转） */
export const SITE_ORIGIN_ALIASES = ['https://www.006336.xyz'] as const
