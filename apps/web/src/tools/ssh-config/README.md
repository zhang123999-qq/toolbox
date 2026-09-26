# SSH 配置

生成一段可直接追加到 `~/.ssh/config` 的主机片段，覆盖日常最常用的指令。

## 用途

手敲 `ssh user@host -p 2222 -i ~/.ssh/id_xxx -J bastion` 又长又容易漏；
把常用连接写成 ssh_config 别名后，以后只要 `ssh myserver` 一条命令即可。
本工具按你填的字段拼出规范的配置片段，空字段自动省略。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

**输入框只作触发用**：留空不产出，点「示例」或随手输入即按当前选项生成。

## 选项

| 选项             | 落到 ssh_config 的指令 | 说明                              |
| ---------------- | ---------------------- | --------------------------------- |
| 主机别名（Host） | `Host`                 | 必填，不能含空白，例如 `myserver` |
| 真实主机名       | `HostName`             | IP 或域名                         |
| 端口             | `Port`                 | 1–65535 的数字                    |
| 登录用户         | `User`                 | 远程用户名                        |
| 私钥路径         | `IdentityFile`         | 例如 `~/.ssh/id_ed25519`          |
| 跳板机           | `ProxyJump`            | 例如 `bastion`，经跳板机跳转      |
| ForwardAgent     | `ForwardAgent yes`     | 是否把本地 SSH Agent 转发到远程   |

## 输出

```ssh-config
# 追加到 ~/.ssh/config（Linux/macOS）或 %USERPROFILE%\.ssh\config（Windows）
Host myserver
  HostName 1.2.3.4
  User root
  Port 22
  IdentityFile ~/.ssh/id_ed25519
```

## 常见用法

- **ProxyJump**：`HostName inner` + `ProxyJump bastion` 表示先连跳板机再连内网机，
  比老式 `ProxyCommand ssh -W %h:%p bastion` 干净
- **ForwardAgent**：远程服务器上要 `git pull` 走你本地的 SSH key 时打开；
  注意它会让远程机器在连接期间能用你的身份，共用服务器上慎用
- **Host `*`**：想给所有主机设默认 `User` / `IdentityFile`，可在片段最后再加一段 `Host *`
- **权限**：`~/.ssh/config` 权限必须是 `600`，否则 ssh 会忽略它

## 限制

- 只生成**单主机片段**，不做通配批量、`Match` 块、`LocalForward` 端口转发等进阶指令
- 不校验 `HostName` 是否真实可达
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** 纯字符串拼接，不发送任何网络请求。`meta.api = false`，无需 API/Key。

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #249                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P2                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |
