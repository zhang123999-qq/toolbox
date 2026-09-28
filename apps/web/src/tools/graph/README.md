# 关系图

输入节点与边数据，用 ECharts 力导向布局渲染关系图，节点可拖拽，支持标题与画布尺寸，可导出 PNG。

## 用途

- 可视化人物 / 组织关系
- 展示网络拓扑、依赖关系
- 导出关系图 PNG 复用

## 输入

| 字段       | 类型   | 约束                   |
| ---------- | ------ | ---------------------- |
| `text`     | string | 节点数据（留空用示例） |
| `edgeText` | string | 边数据（留空用示例）   |

节点行格式（每行一个节点）：

```
节点名
节点名:类目
```

- 无类目（或类目为空）归入「未分类」
- 节点名不能为空、不能重复

边行格式（每行一条边）：

```
源 -> 目标
源 -> 目标:权重
```

- 权重默认 `1`，须为大于 0 的数字（决定连线粗细）
- 源 / 目标必须在节点中定义

示例：

```
节点：
张三:朋友
李四:朋友
王五:同事
赵六

边：
张三 -> 李四:5
李四 -> 王五:2
张三 -> 王五
```

## 选项

| 选项 | 默认值 | 范围 / 约束 | 说明         |
| ---- | ------ | ----------- | ------------ |
| 标题 | （空） | 任意文本    | 留空则无标题 |
| 宽度 | `600`  | 100–2000    | 画布宽（px） |
| 高度 | `400`  | 100–2000    | 画布高（px） |

## 输出

- 右侧预览区：ECharts 力导向关系图（节点可拖拽，滚轮缩放 / 平移）
- 「下载 PNG」：导出当前图表为 `graph.png`
- 复制 / 下载：节点数据文本（`.txt` 文件）

## 边界

- 节点为空 / 节点名为空 / 节点名重复 → 中文报错
- 边引用了未定义的节点 / 自环边 / 非法权重 / 边格式非法 → 中文报错
- 边可以为空：只渲染节点（孤立节点以默认大小显示）
- 节点越多、连边越多的节点画得越大
- 尺寸越界 → 中文报错
- 空输入自动使用示例数据

## 示例

留空直接渲染示例好友关系力导向图；拖动节点可调整布局，按「下载 PNG」导出图片。

## 数据流向

纯本地：ECharts 在浏览器内渲染，节点 / 边数据不上传服务器。

## 元信息

| 项       | 值                              |
| -------- | ------------------------------- |
| 全局编号 | #673                            |
| 域       | `random`                        |
| 大组     | `design`                        |
| 优先级   | P2                              |
| 可行性   | A（纯前端，echarts 动态导入）   |
| 模板     | T3（图表可视化预览）            |
| 依赖     | `echarts`（动态导入，独立分包） |

---

# Graph Chart (English)

Enter nodes and edges, render a force-directed graph locally with ECharts. Nodes are draggable, PNG export supported.

## Purpose

- Visualize people / organization relationships
- Show network topology and dependencies
- Export graph PNG for reuse

## Input

| Field      | Type   | Constraint                  |
| ---------- | ------ | --------------------------- |
| `text`     | string | Node data (empty = example) |
| `edgeText` | string | Edge data (empty = example) |

Node line format (one node per line):

```
name
name:category
```

- Missing or empty category falls back to "未分类"
- Node names must be non-empty and unique

Edge line format (one edge per line):

```
source -> target
source -> target:weight
```

- Weight defaults to `1`, must be a number greater than 0
- Source / target must be defined nodes

## Options

| Option | Default | Constraint | Description        |
| ------ | ------- | ---------- | ------------------ |
| Title  | (empty) | any text   | Empty = no title   |
| Width  | `600`   | 100–2000   | Canvas width (px)  |
| Height | `400`   | 100–2000   | Canvas height (px) |

## Output

- Right preview panel: ECharts force-directed graph (drag nodes, zoom / pan)
- "下载 PNG": export current chart as `graph.png`
- Copy / download: node data text (`.txt` file)

## Edge cases

- Empty nodes / empty node name / duplicate node names → Chinese error
- Edges referencing undefined nodes / self loops / invalid weights / malformed edges → Chinese error
- Empty edges are fine: isolated nodes render at default size
- More connected nodes render larger
- Out-of-range size → Chinese error
- Empty input falls back to example data

## Data flow

Fully local: ECharts renders in the browser; nodes / edges are not uploaded.

## Meta

| Item        | Value                                |
| ----------- | ------------------------------------ |
| Global No.  | #673                                 |
| Category    | `random`                             |
| Group       | `design`                             |
| Priority    | P2                                   |
| Feasibility | A (frontend, echarts dynamic import) |
| Template    | T3 (chart preview)                   |
| Deps        | `echarts` (dynamic import)           |
