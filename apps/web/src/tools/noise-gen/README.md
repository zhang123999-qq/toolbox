# 噪声生成

用自研 value noise（整数格点随机值 + 双线性插值）叠加 fBm 分形八度生成程序化噪声纹理，canvas 逐像素渲染，支持灰度 / viridis / plasma 配色。

## 用途

- 生成程序化纹理、地形高度图、噪点背景
- 调整尺度 / 八度得到从平滑到细碎的不同噪声
- 固定种子可复现同一张噪声图

## 输入

| 字段   | 类型   | 约束                                        |
| ------ | ------ | ------------------------------------------- |
| `text` | string | 种子数字（可选，0–99999，留空则用选项种子） |

## 选项

| 选项 | 默认值      | 范围 / 约束                  | 说明                   |
| ---- | ----------- | ---------------------------- | ---------------------- |
| 尺度 | `0.02`      | 0.005–0.1                    | 噪声频率（越大越细碎） |
| 八度 | `4`         | 1–8                          | fBm 叠加层数           |
| 种子 | （随机）    | 0–99999                      | 留空每次随机           |
| 配色 | `grayscale` | grayscale / viridis / plasma | 噪声值到颜色的映射     |
| 宽度 | `400`       | 1–1000                       | 画布宽（px）           |
| 高度 | `300`       | 1–1000                       | 画布高（px）           |

## 输出

- 右侧预览区：canvas 渲染的噪声图
- 复制 / 下载：噪声参数描述文本（`.txt` 文件）

## 算法

- **value noise**：在整数格点上用哈希取 [0,1) 随机值，双线性插值（smoothstep 平滑）得到任意浮点坐标的噪声
- **fBm**：叠加 N 层，每层频率 ×2、振幅 ×0.5，归一化到 [0,1]
- 全部纯 TS 纯函数，可在 `test.ts` 中测试

## 边界

- 尺度 / 八度 / 尺寸越界 → 中文报错
- 种子非数字或越界 → 中文报错
- 配色非法 → 中文报错

## 示例

默认参数（尺度 0.02、八度 4、灰度）即生成一张柔和的分形噪声图；把配色切到 `viridis` 可看到伪彩色高度图。

## 数据流向

纯本地：噪声在浏览器内逐像素计算并绘制到 canvas，不上传服务器。

## 元信息

| 项       | 位                          |
| -------- | --------------------------- |
| 全局编号 | #396                        |
| 域       | `random`                    |
| 大组     | `design`                    |
| 优先级   | P1                          |
| 可行性   | A（纯前端，自研算法无依赖） |
| 模板     | T3（canvas 可视化预览）     |
| 依赖     | 无                          |

---

# Noise Generator (English)

Generate procedural noise textures with self-implemented value noise (integer-lattice random values + bilinear interpolation) and fBm fractal octaves, rendered pixel-by-pixel on canvas. Grayscale / viridis / plasma colormaps.

## Purpose

- Procedural textures, terrain heightmaps, grainy backgrounds
- Tune scale / octaves from smooth to fine-grained
- Fixed seed reproduces the same noise

## Input

| Field  | Type   | Constraint                                                 |
| ------ | ------ | ---------------------------------------------------------- |
| `text` | string | Seed number (optional, 0–99999; falls back to option seed) |

## Options

| Option   | Default     | Constraint                   | Description              |
| -------- | ----------- | ---------------------------- | ------------------------ |
| Scale    | `0.02`      | 0.005–0.1                    | Noise frequency          |
| Octaves  | `4`         | 1–8                          | fBm layers               |
| Seed     | (random)    | 0–99999                      | Empty = random each time |
| Colormap | `grayscale` | grayscale / viridis / plasma | Value → color mapping    |
| Width    | `400`       | 1–1000                       | Canvas width (px)        |
| Height   | `300`       | 1–1000                       | Canvas height (px)       |

## Output

- Right preview panel: canvas-rendered noise image
- Copy / download: noise parameter description (`.txt` file)

## Algorithm

- **Value noise**: hash lattice points to [0,1), bilinear interpolation with smoothstep
- **fBm**: N layers, frequency ×2 / amplitude ×0.5 each, normalized to [0,1]
- Pure TS pure functions, unit-tested in `test.ts`

## Edge cases

- Out-of-range scale/octaves/size → Chinese error
- Non-numeric / out-of-range seed → Chinese error
- Unknown colormap → Chinese error

## Data flow

Fully local: noise computed per-pixel in the browser and drawn to canvas.

## Meta

| Item        | Value                               |
| ----------- | ----------------------------------- |
| Global No.  | #396                                |
| Category    | `random`                            |
| Group       | `design`                            |
| Priority    | P1                                  |
| Feasibility | A (frontend only, self-implemented) |
| Template    | T3 (canvas preview)                 |
| Deps        | none                                |
