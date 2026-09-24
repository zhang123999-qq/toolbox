import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect'

/**
 * 设置文档标题（随语言切换而更新）。
 *
 * SSG 产出的 <title> 是构建期的中文口径，供爬虫直接读取；
 * 页面挂载后再按当前语言覆写，使浏览器标签页与正文语言一致。
 */
export function useDocumentTitle(title: string): void {
  useIsomorphicLayoutEffect(() => {
    document.title = title
  }, [title])
}
