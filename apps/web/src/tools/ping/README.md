# Ping 测试

按目标主机与参数，生成跨平台（Windows / Linux / macOS）的 **ping / tcping** 命令并解释每个参数；可选做一次浏览器内的「HTTP 可达性」弱检测。

## 用途

判断一台机器「通不通」时第一反应就是 ping。但 **浏览器无法发送 ICMP Echo Request**——
网页没有原始套接字，`ping` 这个动作在沙箱里根本做不到。本工具把命令替你拼好，
你贴到自己的终端里跑；另外可选一次 `fetch(no-cors)` 当作「HTTP 层能不能通」的弱参考。

## 输入

| 字段   | 类型   | 约束                                 |
| ------ | ------ | ------------------------------------ |
| `text` | string | 目标主机名或 IPv4，最大 200,000 字符 |

填入目标，如 `127.0.0.1`、`example.com`。留空不产出任何内容。

## 输出

| 字段   | 类型   | 说明                                                                        |
| ------ | ------ | --------------------------------------------------------------------------- |
| `text` | string | 目标平台的 ping 命令 + tcping 命令 + 参数说明；勾选 HTTP 检测时追加检测结果 |

```text
## ping 命令
ping -n 4 -l 64 example.com
## tcping
tcping example.com 80
…
```

## 选项

| 选项 key     | 界面标签     | 取值 / 说明                                        |
| ------------ | ------------ | -------------------------------------------------- |
| `count`      | 发包数       | 1-10000，Windows `-n` / Linux·macOS `-c`           |
| `interval`   | 间隔(秒)     | 0.1-60，仅 Linux/macOS `-i`；Windows ping 无此参数 |
| `packetSize` | 包大小(字节) | 0-65500，Windows `-l` / Linux·macOS `-s`           |
| `platform`   | 平台         | `windows` / `linux` / `macos`                      |
| `httpCheck`  | HTTP 弱检测  | 额外对 `https://<主机>` 发一次 no-cors 请求并计时  |

## 为什么有 HTTP 弱检测

ICMP 经常被中间设备禁掉（很多服务器「禁 ping」），但 HTTP 服务其实是好的。
勾选「HTTP 弱检测」后，本页会对 `https://<你的主机>` 发一次 `fetch(url, {mode:'no-cors'})`，
并用 `performance.now()` 量耗时。**请注意：**

- 这是 **HTTP/TCP 层**的可达性，**不是 ICMP ping**——它通不代表 `ping` 通，反之亦然
- `no-cors` 的响应是不透明的，读不到状态码，只能证明「服务器在 80/443 端口有响应」
- 跨域、自签名证书、HSTS、CDN 缓存都会影响结果，仅作粗略参考

## 限制（浏览器边界，必须诚实说明）

- **本工具不发送 ICMP 包**。浏览器没有原始套接字能力，无法真正 `ping`
- Windows 版 `ping` 没有「间隔」参数，生成的命令也不带 `-i`
- HTTP 弱检测只打 `https://<主机>`，不带路径、不带自定义端口；目标 80/443 之外的服务测不到
- 不解析 ping 输出，也不做 MTR / 路由追踪
- 输入上限 200,000 字符

## 数据流向

命令生成**纯本地、零网络**。只有勾选「HTTP 弱检测」时才会发一次 `fetch(no-cors)` 请求到你输入的主机。
`meta.api = false`，无需自备 API/Key。

## 示例

输入：

```text
example.com
```

选项：发包数 `4`、间隔 `1`、包大小 `64`、平台 `windows`。

输出：

```text
## ping 命令（复制到终端执行；浏览器无法发送 ICMP）
ping -n 4 -l 64 example.com

## tcping（ICMP 被禁时的 TCP 层连通性）
tcping example.com 80
```

## 元信息

| 项       | 值                                   |
| -------- | ------------------------------------ |
| 全局编号 | #254                                 |
| 域       | `devops`（开发 / 运维 / 云原生）     |
| 大组     | `dev`                                |
| 优先级   | P3                                   |
| 可行性   | C（命令生成 + fetch Web API 弱检测） |
| 模板     | T2（双栏）                           |
