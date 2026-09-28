# 渐变生成 gradient-gen（#388）

## 用途 | Purpose

- 生成 CSS `background` 渐变代码，供 UI、海报、网页背景快速取用。
- Generate CSS `background` gradient code for UI, posters, and web backgrounds.

## 输入 | Input

- 文本框：颜色列表（可选）。每行一个 `#rrggbb`，至少 2 个颜色；留空则随机生成 2–4 色。
- Textarea: color list (optional). One `#rrggbb` per line, at least 2 colors; leave empty for a random 2–4 color palette.

## 选项 | Options

| 选项           | 说明                                                | Option        | Description                     |
| -------------- | --------------------------------------------------- | ------------- | ------------------------------- |
| 渐变类型 type  | linear（线性，默认）/ radial（径向）/ conic（锥形） | Gradient type | linear / radial / conic         |
| 角度 angle     | 0–360，默认 135，仅线性渐变有效                     | Angle         | 0–360, default 135, linear only |
| 径向形状 shape | circle / ellipse（默认），仅径向渐变有效            | Radial shape  | circle / ellipse, radial only   |

## 输出 | Output

- 完整 CSS：`.gradient { background: ...; }`。
- Full CSS wrapped in `.gradient { background: ...; }`.

## 限制 | Limits

- 颜色须为 `#rrggbb`；角度 0–360；非法输入显示中文错误。
- Colors must be `#rrggbb`; angle 0–360; invalid input shows a Chinese error.

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求、无第三方依赖。
- All computation happens locally in the browser; no network requests, no third-party deps.

## 示例 | Example

输入：

```
#ff5b8a
#6a5cff
```

类型 linear，角度 135 →

```css
.gradient {
  background: linear-gradient(135deg, #ff5b8a, #6a5cff);
}
```

## 元信息 | Meta

- 编号 #388 · category `random` · group `design` · 可行性 A · 纯前端 · deps: 无
