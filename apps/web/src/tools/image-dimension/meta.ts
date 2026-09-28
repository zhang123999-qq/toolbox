import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-dimension —— 全局编号 #472
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 图片尺寸调整（目标尺寸导向）：指定精确的目标宽×高 + 适配模式输出：
 *   contain（等比留白：整图完整可见，空白处填背景色，默认白）、
 *   cover（等比裁剪：填满目标尺寸，多余部分居中裁掉）、
 *   stretch（拉伸：直接拉伸到目标尺寸，可能变形，UI 有提示）。
 * 常用预设：1920×1080、1280×720、800×600、512×512、256×256、自定义；
 * 输出 jpeg/png/webp + 质量（jpeg/webp），全程本地 Canvas，不上传。
 * 与「图片缩放」（image-resize，#425）不重叠：#425 是通用缩放器
 * （按像素/百分比自由缩放、可锁定纵横比，等比为主）；本工具是
 * 「目标尺寸导向」——必须输出某种精确尺寸的场景（如头像、横幅），
 * 用适配模式（留白/裁剪/拉伸）解决纵横比不一致的问题。
 * 注：docs/tools/08-图片图形.md 中 #472 的规格描述只有"调整尺寸"四字，
 * 较简略；文档规格较简略，本工具按"目标尺寸 + 适配模式"实现，
 * 与 #425 通用缩放器不重叠。
 */
export const meta: ToolMeta = {
  id: 'image-dimension',
  slug: 'image-dimension',
  title: '图片尺寸调整',
  description:
    '本地把图片调整到精确的目标宽×高：等比留白 / 等比裁剪 / 拉伸三种适配模式，全程不上传',
  titleEn: 'Image Dimension',
  descriptionEn:
    'Resize images to exact target dimensions locally: contain / cover / stretch fit modes, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'dimension', 'avatar', 'banner', 'size'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['width', 'height', 'fit', 'bgColor', 'format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
