# 随机分组 random-group（#416）

## 用途 | Purpose

- 把名单随机分成 N 组（如抽签分组、课堂分队、团建分组）。
- Randomly split a name list into N groups (e.g. draw-based grouping, class teams, team-building).

## 输入 | Input

- 文本框：每行一个姓名 / 成员名，空行自动忽略。
- Textarea: one name per line; blank lines are ignored.

## 选项 | Options

| 选项          | 说明                | Option      | Description                            |
| ------------- | ------------------- | ----------- | -------------------------------------- |
| 分组数 groups | 正整数，范围 1–人数 | Group count | Positive integer, 1 – number of people |

## 输出 | Output

```
第 1 组（3 人）
张三
王五
钱七

第 2 组（3 人）
…
```

- 组大小尽量均衡（相差至多 1 人）。
- Groups are as balanced as possible (sizes differ by at most 1).

## 限制 | Limits

- 分组数必须为正整数，且不能超过名单人数。
- 洗牌使用 Fisher–Yates 算法，均匀随机。

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求。
- All computation happens locally in the browser; no network requests.

## 示例 | Example

输入：

```
张三
李四
王五
赵六
钱七
孙八
```

分组数：2 → 随机分成 2 组，每组 3 人。

## 元信息 | Meta

- 编号 #416 · category `random` · group `design` · 可行性 A · 纯前端
