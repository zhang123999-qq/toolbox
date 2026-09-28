# 面包屑生成 Breadcrumb Generator（#665）

由层级列表生成语义化面包屑 HTML（含 aria 属性）与
JSON-LD `BreadcrumbList`（与 #625 JSON-LD 工具的面包屑格式兼容）。

## 使用方法

1. 左侧输入层级列表，每行一条，格式为「名称 || URL」
   （与 #625 的面包屑输入格式相同；末项 URL 可留空表示当前页）；
2. 右侧实时显示可视化预览、HTML 代码与 JSON-LD 代码；
3. 复制/下载得到 HTML + `<script type="application/ld+json">` 组合文件。

## 校验

- 名称不能为空；
- URL 建议填写且为 http(s) 绝对地址；
- JSON-LD 的 `position` 自动从 1 连续编号。

## English

Generate semantic breadcrumb HTML (`nav` + `ol` + aria) and a
JSON-LD `BreadcrumbList` (compatible with tool #625) from a list of
"name || URL" lines. Includes live preview and copy/download.
