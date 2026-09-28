# 浏览器信息（#859）

解析 User-Agent 识别浏览器、版本、操作系统与渲染引擎，并检测常用 Web 特性支持情况。

## 功能

- 识别 Chrome / Edge / Firefox / Safari（Edge 优先于 Chrome 匹配）。
- 识别 Windows / macOS / Linux / Android / iOS。
- 特性检测：Fetch、WebSocket、WebGL、Service Worker、WebGPU、Clipboard。

## 局限

- User-Agent 可被浏览器或扩展修改，结果仅供参考。
- 特性检测只反映 API 是否存在，不代表功能完整可用。
