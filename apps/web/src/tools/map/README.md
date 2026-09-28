# 地图可视化

输入地区数值，用 ECharts 渲染中国 / 世界分级设色（choropleth）地图，支持标题与画布尺寸，可导出 PNG。

## 用途

- 各省份销量、人口等地区数据的分级设色展示
- 切换中国 / 世界地图对比同一份数据
- 导出地图 PNG 图片复用

## 输入

| 字段   | 类型   | 约束                                       |
| ------ | ------ | ------------------------------------------ |
| `text` | string | 地区数据：每行 `地区名:数值`（留空用示例） |

格式示例：

```
广东:120
北京:80
上海:95
四川:60
```

- 全角冒号 `：` 自动归一为半角
- 地区名必须与地图数据中的名称一致，否则该地区不着色：
  - 中国地图：省 / 直辖市中文名（如 `广东`、`北京`），数据来自阿里云 DataV
  - 世界地图：英文国名（如 `China`、`United States`），数据来自 ECharts 官方示例

## 地图数据来源与联网要求

本工具为 D 级：地图 geoJSON 不打包进前端，运行时从 CDN 获取（每个地图类型只加载一次，之后走内存缓存）：

| 地图 | 数据源 URL                                                       |
| ---- | ---------------------------------------------------------------- |
| 中国 | `https://geo.datav.aliyun.com/areas_v3/bound/100000.json`        |
| 世界 | `https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json` |

- 离线或 CDN 不可达时，输出区明确报错（`地图数据加载失败：…，地图 geoJSON 需联网加载`）
- geoJSON 返回非 JSON / 缺少 `features` 数组时同样中文报错

## 选项

| 选项 | 默认值  | 范围 / 约束   | 说明         |
| ---- | ------- | ------------- | ------------ |
| 地图 | `china` | china / world | 地图类型     |
| 标题 | （空）  | 任意文本      | 留空则无标题 |
| 宽度 | `600`   | 100–2000      | 画布宽（px） |
| 高度 | `400`   | 100–2000      | 画布高（px） |

## 输出

- 右侧预览区：ECharts 渲染的地图（支持滚轮缩放 / 拖拽漫游，悬停显示数值）
- 颜色条：按数值区间自动分级设色
- 「下载 PNG」按钮：导出当前地图为 `map.png`
- 复制 / 下载：地区数据文本（`.txt` 文件）

## 边界

- 空输入自动使用示例数据（广东 / 北京 / 上海 / 四川）
- 行无冒号 / 地区名为空 / 地区名重复 / 数值非法 → 中文报错
- 尺寸越界 → 中文报错
- 地图数据加载失败 → 中文报错并提示需联网

## 示例

留空直接渲染中国示例数据分级设色图；把「地图」切到 `world` 后填英文国名可渲染世界地图。

## 数据流向

地区数据纯本地渲染；地图 geoJSON 运行时从上述 CDN 拉取（仅地图形状数据，不含你的输入）。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #674                                |
| 域       | `random`                            |
| 大组     | `design`                            |
| 优先级   | P2                                  |
| 可行性   | D（地图 geoJSON 运行时从 CDN 加载） |
| 模板     | T3（图表可视化预览）                |
| 依赖     | `echarts`（动态导入，独立分包）     |
| API      | 是（运行时请求 CDN）                |

---

# Map Visualization (English)

Render ECharts choropleth maps of China / world from region values, with title and canvas size options, and PNG export.

## Purpose

- Choropleth rendering of per-region values (sales, population, …)
- Switch China / world maps for the same data
- Export the map as a PNG image

## Input

| Field  | Type   | Constraint                                                 |
| ------ | ------ | ---------------------------------------------------------- |
| `text` | string | Region values: one `name:value` per line (empty = example) |

- Full-width colons `：` are normalized automatically
- Region names must match the map data's names or they won't be colored:
  - China map: province / municipality Chinese names (e.g. `广东`), from Alibaba DataV
  - World map: English country names (e.g. `China`), from the ECharts examples

## Map data sources & network requirement

This is a feasibility-D tool: map GeoJSON is not bundled; it is fetched at runtime from a CDN (once per map kind, then cached in memory):

| Map   | Source URL                                                       |
| ----- | ---------------------------------------------------------------- |
| China | `https://geo.datav.aliyun.com/areas_v3/bound/100000.json`        |
| World | `https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json` |

- Offline or unreachable CDN → clear Chinese error (`地图数据加载失败：…`)
- Non-JSON responses or missing `features` arrays → Chinese error too

## Options

| Option | Default | Constraint  | Description        |
| ------ | ------- | ----------- | ------------------ |
| Map    | `china` | china/world | Map kind           |
| Title  | (empty) | any text    | Empty = no title   |
| Width  | `600`   | 100–2000    | Canvas width (px)  |
| Height | `400`   | 100–2000    | Canvas height (px) |

## Output

- Right preview panel: ECharts-rendered map (scroll zoom / drag roam, hover tooltip)
- Color legend graded by value range
- "下载 PNG" button: exports the current map as `map.png`
- Copy / download: region data text (`.txt` file)

## Edge cases

- Empty input falls back to the example data
- Lines without a colon / empty region name / duplicate region / invalid number → Chinese error
- Out-of-range size → Chinese error
- Map data load failure → Chinese error noting the network requirement

## Data flow

Region values render locally; only the map-shape GeoJSON is fetched from the CDNs above.

## Meta

| Item        | Value                                  |
| ----------- | -------------------------------------- |
| Global No.  | #674                                   |
| Category    | `random`                               |
| Group       | `design`                               |
| Priority    | P2                                     |
| Feasibility | D (GeoJSON loaded from CDN at runtime) |
| Template    | T3 (chart preview)                     |
| Deps        | `echarts` (dynamic import)             |
| API         | true (runtime CDN requests)            |
