# 边缘日志（#819）

A 级工具：纯前端本地构造查询语句与解析日志，无网络、无第三方 API。

## 功能

- **查询模式（query）**：右侧表单填写起止时间（ISO 格式）、可选状态码（3 位数字）与节点代码（如 HKG），生成 Cloudflare GraphQL Analytics 查询语句；时间范围非法（开始不早于结束、格式非法）时中文报错。
- **解析模式（parse）**：左侧粘贴访问日志（支持 JSON 行与 Apache/Nginx combined 格式，多行批量解析），输出每行的结构化摘要（方法、路径、状态码、IP、时间）；无法识别的行标注序号中文报错。
- **复制 / 下载**：查询语句可复制或下载为 `.graphql`。

## 说明

- 生成的 GraphQL 语句需配合 Cloudflare API Token 在自有脚本中使用，本工具不发起任何请求。
- combined 格式正则兼容缺失 referer / user-agent 的行。
