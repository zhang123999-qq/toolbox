# 血型配对

输入受血者血型（`O-`、`A+`、`AB` 等），查询 ABO/Rh 输血相容性：可接受的供血者与可捐献的对象，覆盖红细胞与血浆两种场景。纯前端计算，不上传数据。

## 用途

- 输血前快速查配对表（仅供参考，临床以血库配血为准）
- 了解 O- 为红细胞万能供者、AB 为血浆通用供者

## 输入

| 字段   | 类型   | 约束                                                              |
| ------ | ------ | ----------------------------------------------------------------- |
| `text` | string | 受血者血型（`O`/`A`/`B`/`AB` + 可选 `+`/`-`，大小写与空格不敏感） |

Rh 省略时（如只输入 `AB`）同时输出 `AB-` 与 `AB+` 两种结果。

## 输出

对每个受血者输出 5 行：

- 受血者血型
- 可接受的供血者（红细胞）
- 可捐献给（红细胞）
- 可接受的供血者（血浆）
- 可捐献给（血浆）

末尾附注：血浆相容规则与红细胞相反（AB 型血浆为通用供者，O 型血浆只能输给 O 型）。

## 选项

无。

## 公式

红细胞输血：供者红细胞携带的 ABO 抗原必须是受者拥有的子集（否则受者血浆中的抗体攻击供者红细胞）；Rh+ 只能输给 Rh+。

- O-：无 ABO 抗原、Rh- → 可输给全部 8 种（红细胞万能供者）
- AB+：拥有全部抗原 → 可接受全部 8 种（红细胞万能受者）

血浆输血：方向相反——受者红细胞携带的 ABO 抗原必须是供者拥有的子集；Rh(D) 抗原只存在于红细胞上，血浆输注不受 Rh 限制。

- AB 血浆：无 ABO 抗体 → 可输给全部 8 种（血浆通用供者）
- O 血浆：含抗 A、抗 B → 只能输给 O 型

相容表为 8×8 穷举（红细胞相容 27 对，血浆相容 36 对），由单元测试全量断言。

## 边界

- 输入留空 → 输出空（不报错）
- 非法血型（如 `X`、`A++`）→ 中英双语报错
- 大小写 / 空格不敏感：`a+`、`A +` 均可识别
- 省略 Rh（如 `AB`）→ 同时输出 `AB-` 与 `AB+`

## 数据流向

纯本地计算，不调用外部接口，不上传任何数据。

## 示例

输入：`A+`

输出：

```text
受血者：A+
可接受的供血者（红细胞）：O-、O+、A-、A+
可捐献给（红细胞）：A+、AB+
可接受的供血者（血浆）：A-、A+、AB-、AB+
可捐献给（血浆）：O-、O+、A-、A+
血浆相容规则与红细胞相反：AB 型血浆为通用供者，O 型血浆只能输给 O 型。
```

## 常见问题

- **这是医疗建议吗？** 不是。实际输血必须经过血库交叉配血，本工具仅用于学习与快速查询。
- **为什么血浆规则相反？** 红细胞看的是供者红细胞上的抗原，血浆看的是供者血浆中的抗体，两者方向正好相反。
- **Rh 对血浆有影响吗？** 没有。Rh(D) 抗原只在红细胞上，血浆输注不考虑 Rh。

## 相关工具

- `/tools/due-date`（预产期）：同一批，推算预产期与孕周
- `/tools/ovulation`（排卵期）：同一批，推算排卵日与易孕期

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #362                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P3                                  |
| 可行性   | A（纯查表）                         |
| 模板     | T2（两列查询）                      |
| 依赖     | 无                                  |

## English

Blood type compatibility lookup: enter a recipient blood type (e.g. `A+`, `O-`, `AB`) and get ABO/Rh transfusion compatibility — compatible donors and eligible recipients for both red blood cells and plasma. RBC rules: donor RBC antigens must be a subset of the recipient's; Rh+ can only go to Rh+. Plasma rules are the reverse, and Rh is irrelevant for plasma (RhD lives on red cells). O- is the universal RBC donor; AB plasma is the universal plasma donor. Fully client-side. For learning purposes only — real transfusions require a blood-bank crossmatch.

Example: `A+` → RBC donors `O-`, `O+`, `A-`, `A+`; RBC recipients `A+`, `AB+`; plasma donors `A-`, `A+`, `AB-`, `AB+`; plasma recipients `O-`, `O+`, `A-`, `A+`.
