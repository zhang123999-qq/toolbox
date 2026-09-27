# 随机排序 random-sort（#417）

## 用途 | Purpose

- 把列表随机打乱顺序（如抽奖顺序、随机点名、出场顺序）。
- Randomly shuffle a list (e.g. lottery order, random roll call, turn order).

## 输入 | Input

- 文本框：每行一项，空行自动忽略。
- Textarea: one item per line; blank lines are ignored.

## 选项 | Options

- 无。
- None.

## 输出 | Output

- 与输入相同的集合，顺序随机打乱，每行一项。
- The same set of items in a random order, one per line.

## 限制 | Limits

- 空输入直接返回空（不报错）。
- 洗牌使用 Fisher–Yates 算法，均匀随机，每次结果都不同（概率上）。

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
```

输出（每次不同）：

```
王五
张三
赵六
李四
```

## 元信息 | Meta

- 编号 #417 · category `random` · group `design` · 可行性 A · 纯前端
