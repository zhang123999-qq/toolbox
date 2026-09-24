/**
 * 搜索能力门面（packages/search）
 *
 * 当前转发 @toolbox/catalog 的轻量实现。
 * 后续接入 Orama 时只改本文件，调用方（Cmd+K 弹窗、首页 Hero）无需改动。
 */
export { searchTools, SEARCH_INDEX } from '@toolbox/catalog'
export type { SearchDoc } from '@toolbox/catalog'
