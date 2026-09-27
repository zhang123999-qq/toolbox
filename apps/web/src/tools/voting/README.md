# 投票（voting）

## 工具用途 / Purpose

- 中文：从每行一个选项中发起简单投票，点按钮逐项投票，实时看票数与百分比，例如小组聚餐选地点。
- English: Start a simple poll from a line-separated option list; click buttons to vote per option and watch live counts and percentages (e.g. picking a dinner venue).

## 输入 / Inputs

- `input`：投票选项，每行一个，至少 2 个。

## 输出 / Outputs

- 投票面板：每个选项的票数、占比（进度条）与「投一票」按钮，总票数，开始投票/重新计票按钮。

## 选项 / Options

- 无额外选项开关。

## 限制 / Limits

- 选项 < 2 进入错误态（中英双语）。
- **投票结果仅保存在本页，刷新后丢失**（页面用中文与英文双语明确提示）。Results are kept only on this page and are lost on refresh.
- 输入最大 50000 字符（模板级限制）。

## 数据流向 / Data flow

- 全本地计算，不上传网络。票仓为组件本地 state，切换选项会按新选项重新初始化票仓；复制/下载通过 ref 镜像当前票仓。无随机性，唯一确定性来源是用户点击。

## 示例 / Example

```
看电影
吃火锅
去爬山
```

点「开始投票」，给“吃火锅”投 2 票、“看电影”投 1 票 → 总票数 3，占比 66.7% / 33.3% / 0%。
