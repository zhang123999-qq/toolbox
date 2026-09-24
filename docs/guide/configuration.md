# 配置说明

> **中文** | [English](configuration.en.md)
> 全站配置分成三层：**构建期环境变量**（决定产物内容）、**运行期配置文件**（决定怎么跑）、
> **浏览器端偏好**（决定用户看到什么）。三者互不覆盖，改错层会出现「改了没生效」的错觉。

---

## 一、配置分成三层

| 层       | 载体                        | 作用范围                               | 改动时机            |
| -------- | --------------------------- | -------------------------------------- | ------------------- |
| 构建期   | 环境变量 / `--build-arg`    | 产物内容（canonical、sitemap、站点名） | 重新构建            |
| 运行期   | `/etc/toolbox/toolbox.conf` | 端口、路径、升级源                     | `toolboxctl reload` |
| 浏览器端 | `localStorage`              | 语言、主题                             | 立即                |

---

## 二、构建期变量

### 2.1 SITE_ORIGIN

决定 sitemap 的 `<loc>`、页面的 `canonical` 与 JSON-LD 里的站点地址。
默认值是正式域名 `https://006336.xyz`（该站点尚未上线，见
[`getting-started.md`](getting-started.md) §六）。需要在别处部署时覆盖它：

```bash
SITE_ORIGIN=https://staging.example.com pnpm build:ssg
```

用 Docker 构建时传 `--build-arg SITE_ORIGIN=https://你的域名`。
**这一项错了不会报错**，只会让搜索引擎拿到别的地址，属于最容易漏掉的一类问题，
所以校验方式只能是构建后 `grep` 一下产物：

```bash
grep -o '<loc>[^<]*' apps/web/dist/sitemap.xml | head -3
```

### 2.2 依赖源与代理

国内网络下 pnpm 走 npmmirror（见 `.npmrc`）。Docker 构建时基础镜像与依赖源都可覆盖：

```bash
docker build -f deploy/docker/Dockerfile -t toolbox-web:dev \
  --build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:24-alpine \
  --build-arg HTTP_PROXY=http://host.docker.internal:10810 \
  --build-arg HTTPS_PROXY=http://host.docker.internal:10810 .
```

代理要**大小写各传一份**：corepack / undici 只读小写变量，只传大写会静默失败。

---

## 三、运行期配置

### 3.1 配置文件

`toolboxctl install` 会写出 `/etc/toolbox/toolbox.conf`，可以手工微调后 reload：

```sh
# Toolbox 运行配置（由 toolboxctl 维护，可手工微调后 reload）
PREFIX='/opt/toolbox'          # 安装根目录
PORT='80'                      # 监听端口
NGINX_USER='toolbox'           # 运行 nginx worker 的系统用户
NGINX_BIN=''                   # 留空则自动探测 nginx 二进制位置
UPDATE_SOURCE=''               # 升级源（目录或 HTTP 基址），留空则升级时必须显式 --source
SERVICE_NAME='toolbox'         # systemd 服务名（unit 为 toolbox.service）
INSTALLED_AT='2026-09-24T11:00:00+08:00'
```

### 3.2 常用改法

```bash
toolboxctl config                  # 先看当前生效值
sudo vi /etc/toolbox/toolbox.conf  # 改 PORT 或 UPDATE_SOURCE
toolboxctl reload                  # 重新渲染配置并重载
toolboxctl health                  # 确认新端口上健康
```

改端口要留意两件事：**80 以下端口需要 root**；`reload` 只重读配置，不会自动放行防火墙。

---

## 四、nginx 与 systemd

```text
/etc/toolbox/toolbox.conf            运行配置
/etc/systemd/system/toolbox.service  systemd unit（由模板渲染）
/opt/toolbox/shared/nginx.conf       渲染后的 nginx 主配置
/opt/toolbox/logs/{access,error}.log nginx 日志
/opt/toolbox/run/nginx.pid           nginx pid
/opt/toolbox/current -> releases/<v> 当前版本（原子切换点）
```

站点跑的是**独立 nginx 实例**：自带 pid、日志、临时目录与 MIME 表，只借用系统的 nginx
**二进制**，完全不读 `/etc/nginx`。因此 `toolboxctl stop` 只停本站点，
卸载也不会影响这台机器上其它站点。

---

## 五、浏览器端偏好

| key              | 取值             | 默认     | 谁在写                              |
| ---------------- | ---------------- | -------- | ----------------------------------- |
| `toolbox.locale` | `zh` / `en`      | `zh`     | 语言开关；`index.html` 内联脚本读取 |
| `toolbox.theme`  | `light` / `dark` | 跟随系统 | 主题开关；`index.html` 内联脚本读取 |

```js
localStorage.getItem('toolbox.locale') // 'zh'
localStorage.getItem('toolbox.theme') // 'dark'
```

两个 key 的定义真源在 `apps/web/src/lib/prefs.ts`，内联脚本与 React 两侧都用它，
避免「脚本写 `toolbox.theme`、代码读 `theme`」这类错位。

---

## 六、工具元数据字段

每个工具的 `apps/web/src/tools/<slug>/meta.ts` 是全站真源，字段由 Zod 契约约束：

```ts
export const meta = {
  id: 'json-formatter', // 必填：内部唯一 id
  slug: 'json-formatter', // 必填：路由 /tools/<slug>
  title: 'JSON 格式化', // 必填
  description: '格式化、压缩、校验 JSON', // 必填
  category: 'data-format', // 必填：20 域之一
  group: 'dev', // 必填：4 大组之一
  priority: 'P0', // 必填：P0-P3
  feasibility: 'A', // 必填：A-E
  template: 'T2', // 必填：T1-T6
  inputs: ['json'], // 必填
  outputs: ['json'], // 必填
  options: ['indent', 'sortKeys'], // 必填
  deps: [], // 必填
  worker: false, // 必填：是否用 Web Worker
  wasm: false, // 必填：是否加载 WASM
  api: false, // 必填：是否依赖外部 API
  titleEn: 'JSON Formatter', // 可选：英文标题（不计入 16 个必需字段）
  descriptionEn: 'Format, minify…', // 可选：英文描述
}
```

改完**必须**跑 `pnpm generate:catalog` 重建注册表，否则 `tools.generated.ts` 会落后于源
（表现为英文标题不生效，而类型检查不会报错）。

---

## 七、改完配置如何生效

| 改了什么               | 生效方式                                | 验证                                      |
| ---------------------- | --------------------------------------- | ----------------------------------------- |
| `SITE_ORIGIN`          | 重新构建（`pnpm build:ssg` 或重建镜像） | `grep <loc> dist/sitemap.xml`             |
| `SITE_NAME` / 站点文案 | 重新构建                                | 打开首页看标题                            |
| `.npmrc` / 镜像源      | 重新 `pnpm install`                     | `pnpm install --frozen-lockfile` 是否成功 |
| `meta.ts`              | `pnpm generate:catalog` + 重新构建      | `pnpm check:tools`                        |
| `toolbox.conf`         | `toolboxctl reload`                     | `toolboxctl status`                       |
| 浏览器偏好             | 立即                                    | 刷新后仍保持                              |
