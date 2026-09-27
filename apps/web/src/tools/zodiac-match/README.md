# 星座配对

选两个星座，查 12×12 配对矩阵的配对评分、元素组合解析与相处建议。
纯前端计算，不上传数据，结果仅供娱乐参考。

> 与「星座查询」（#288 zodiac）的区别：星座查询是「输入月日 → 查单个太阳星座」；
> 本工具不做日期查询，只做**双人星座配对**。

## 用途

- 情侣 / 朋友间的星座配对娱乐
- 了解两个星座的元素组合特点

## 输入

| 字段    | 类型   | 约束                        |
| ------- | ------ | --------------------------- |
| `text`  | string | 你的名字（可选，≤100 字符） |
| `textB` | string | 对方名字（可选，≤100 字符） |

## 输出

配对报告（纯文本，6 行）：

```text
配对组合：小明（白羊座 Aries）× 小红（天秤座 Libra）
配对评分：93 / 100
元素组合：火象 × 风象
配对结论：天作之合
组合解析：火借风势，越烧越旺……
相处建议：保持现在的状态……
```

名字留空时直接用星座名展示。

## 选项

| 选项    | 类型   | 取值                 |
| ------- | ------ | -------------------- |
| `signA` | select | 十二星座（你的星座） |
| `signB` | select | 十二星座（对方星座） |

## 评分算法

12×12 配对矩阵，规则按优先级：

1. **同星座** → 92 分（高度同频）
2. **经典对宫组合**（如白羊—天秤 93、金牛—天蝎 91）→ 对宫分（互补型加成）
3. 其余按**四象元素无序对**基础分：火×风 88、土×水 86、土×土 84、水×水 83、风×风 82、火×火 80、风×土 62、火×土 60、风×水 58、火×水 55

矩阵对称：`score(A,B) === score(B,A)` 恒成立。

结论档位：≥90 天作之合；80–89 非常合拍；70–79 相当合拍；60–69 需要磨合；<60 挑战不小。

## 边界

- 名字留空 → 用星座名展示，不报错
- 非法星座（直接调函数时）→ 双语报错「未知星座」
- 纯本地计算，不调用任何接口

## 示例

输入：名字 `小明` / `小红`，星座 白羊座 × 天秤座

输出：

```text
配对组合：小明（白羊座 Aries）× 小红（天秤座 Libra）
配对评分：93 / 100
元素组合：火象 × 风象
配对结论：天作之合
组合解析：风象 × 火象：火借风势，越烧越旺；行动派配点子王，热闹又高效，注意别把小事也搞成大场面。
相处建议：保持现在的状态，多创造共同回忆；好缘分也需要用心经营。
```

## 数据流向

纯前端：配对计算在浏览器内完成，不上传任何数据，不调用外部接口。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #363                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P3                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T2（双栏）                          |
| 依赖     | 无                                  |

## English

Zodiac compatibility checker: pick two signs to get a 12×12 matrix compatibility score, element-pair analysis and dating advice. Pure client-side, for fun only.

Difference from #288 zodiac (date → single sign lookup): this tool only does pair matching, no date lookup.

Inputs: `text` (your name, optional), `textB` (partner's name, optional). Options `signA`/`signB`: the two signs.

Scoring: same sign → 92; classic oppositions (e.g. Aries–Libra 93) → opposition bonus; otherwise element-pair base scores (Fire×Air 88 … Fire×Water 55). Tiers: ≥90 soulmates; 80–89 highly compatible; 70–79 quite compatible; 60–69 needs work; <60 challenging.
