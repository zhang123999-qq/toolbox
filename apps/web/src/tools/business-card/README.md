# 名片生成 · Business Card Generator

填写姓名、职位与联系方式，右侧输出标准尺寸（340×200）SVG 矢量名片代码，
复制后保存为 `.svg` 文件即可用浏览器打开、打印或转为图片。
纯前端处理，不上传数据。

Enter your name, title and contact info to get a standard-size (340×200) SVG vector
business card. Copy the code, save it as a `.svg` file, then open, print or convert
it in a browser. All processing is local; nothing is uploaded.

## 用途 / Purpose

- 快速制作个人 / 公司名片矢量底稿
- 名片信息沉淀为可复用的 SVG 资产

## 输入 / Inputs

| 字段              | 类型   | 约束                              |
| ----------------- | ------ | --------------------------------- |
| `text`（姓名）    | string | 必填（填了其他字段时），≤ 40 字符 |
| `title`（职位）   | string | 可选，≤ 60 字符                   |
| `company`（公司） | string | 可选，≤ 80 字符                   |
| `phone`（电话）   | string | 可选，≤ 30 字符                   |
| `email`（邮箱）   | string | 可选，≤ 80 字符                   |
| `website`（网址） | string | 可选，≤ 100 字符                  |

## 输出 / Outputs

- 右侧输出：完整的独立 `.svg` 文件内容（XML 声明 + 注释 + SVG）
- 复制：将 SVG 代码复制到剪贴板
- 下载：保存为 `business-card.json`（后缀手动改为 `.svg` 即可使用）

## 限制 / Limits

- 姓名为空但填了其他字段 → 「请填写姓名」
- 所有字段做 XML 转义（`&` `<` `>` `"` `'`），不会破坏 SVG 结构
- 不加载外部图片与外部字体：卡面为深蓝渐变 + 橙色装饰条的纯内联样式
- 纯 JS 实现，无导出依赖

## 数据流向 / Data flow

纯本地计算与渲染，不调用外部接口，不上传任何数据。

## 示例 / Example

输入：姓名 `陈静`、职位 `高级前端工程师`、公司 `星辰科技有限公司`

输出（节选）：

```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="340" height="200" viewBox="0 0 340 200">
  ...
  <text x="28" y="52" ...>陈静</text>
  ...
</svg>
```

## 边界行为 / Edge cases

- 全部留空 → 空态提示，不报错
- 仅填姓名 → 只输出姓名的名片（空字段整行跳过）
- 特殊字符 → 自动转义为 XML 实体

## 元信息 / Meta

| 项    | 值                               |
| ----- | -------------------------------- |
| slug  | `business-card`（全局编号 #408） |
| 域/组 | random / design                  |
| 模板  | T2                               |
| 依赖  | 无                               |
