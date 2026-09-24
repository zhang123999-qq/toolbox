import { useEffect, useLayoutEffect } from 'react'

/**
 * 客户端用 useLayoutEffect（在浏览器绘制前同步执行），
 * 服务端渲染（SSG 预渲染）回退为 useEffect，避免 React 打印
 * 「useLayoutEffect does nothing on the server」告警。
 *
 * 用途：首帧前把用户偏好（语言 / 主题）落到 DOM 上，避免可见闪动。
 */
export const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
