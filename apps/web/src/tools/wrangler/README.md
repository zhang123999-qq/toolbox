# Wrangler 命令（#810）

A 级工具：纯前端本地拼装，无网络、无第三方 API。

## 功能

- **命令速查**：7 条常用命令（deploy / dev / tail / kv-put / kv-get / d1-execute / r2-upload），中文说明与示例一键展开查看。
- **命令拼装**：选择命令后，在左侧按 `key=value` 逐行填写参数，右侧实时拼出完整命令；缺少必填参数或格式非法时中文报错。
- **复制 / 下载**：拼好的命令可复制或下载为 `.sh` 文件。

## 说明

- 命令需在已安装 wrangler（`npm i -g wrangler` 或 `npx wrangler`）且已登录（`npx wrangler login`）的终端中执行。
- 参数值含空格时请自行加引号；SQL 语句已自动用双引号包裹。
- 本工具只做字符串拼装，不执行任何命令、不访问网络。
