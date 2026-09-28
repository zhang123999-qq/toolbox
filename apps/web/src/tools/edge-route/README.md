# 路由调试（#812）

A 级工具：纯前端本地匹配，无网络、无第三方 API。

## 功能

- **路由规则**：左侧按「pattern => target」逐行填写，支持 `#` 注释。
- **三种写法**：精确（`example.com/api`）、前缀（`example.com/static/*`，仅末尾一个 `*`）、通配符（`*.example.com/*`）。
- **优先级**：精确 > 前缀 > 通配符；同级中规则越长越优先，再相同取靠前的一条——与 Cloudflare Workers 路由语义一致。
- **实时测试**：在「待测试 URL」输入框填 URL，右侧即时显示命中的 target；无命中或规则非法时中文提示。

## 说明

- 匹配对象为「主机名 + 路径」（不含协议、端口与查询串），例如 `https://example.com/a?x=1` 按 `example.com/a` 匹配。
- 本工具只做本地模拟，不会真实部署或调用 Cloudflare。
