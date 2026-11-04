/**
 * 构建期生成预建搜索索引：把 @toolbox/catalog 的 SEARCH_INDEX 序列化为
 * apps/web/public/search-index.json，供搜索 Web Worker 加载。
 *
 * 用法：pnpm generate:search-index（产物随 web 构建的 public 目录一同发布）
 * 索引只含检索所需字段（id/title/slug/category/description/tags），体积可控。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { SEARCH_INDEX } from '@toolbox/catalog'

const outDir = path.resolve('apps/web/public')
const outFile = path.join(outDir, 'search-index.json')

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, JSON.stringify(SEARCH_INDEX), 'utf8')
console.log(`[search-index] 已生成 ${SEARCH_INDEX.length} 条预建索引 → ${outFile}`)
