/**
 * Worker 入口（位于 web 包内，Vite 才能稳定打包）：
 * 实际检索逻辑在 @toolbox/search 的 search.worker.ts，本文件只做转发引入。
 */
import '@toolbox/search/search.worker'
