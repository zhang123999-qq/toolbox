# ============================================================================
# Toolbox 站点配置（完整 nginx 主配置，不是 server 片段）
#
# 本文件由 toolboxctl 从模板渲染生成，**请勿手工编辑**：
# 下次 install / upgrade / rollback 都会按模板重新渲染覆盖。
# 需要调整请修改 bundle 内的 conf/nginx.conf.tpl 后重新打包。
#
# 设计要点：把 toolbox 做成**独立的 nginx 实例**（自己的 pid / 日志 / 临时目录 /
# MIME 表 / 监听端口），只用系统里的 nginx 二进制，不读 /etc/nginx 任何配置。
# 这样 start/stop/reload 只影响本站点，卸载也不会碰到机器上其它 nginx 站点。
# ============================================================================

worker_processes  auto;
pid               @PREFIX@/run/nginx.pid;
error_log         @PREFIX@/logs/error.log warn;

# worker 以专用低权限用户运行；master 仍为 root（需要绑定 <1024 端口并 setuid）
user              @NGINX_USER@;

events {
    worker_connections 1024;
}

http {
    # 自带 MIME 表，避免依赖目标机的 /etc/nginx/mime.types
    include       @PREFIX@/current/conf/mime.types;
    default_type  application/octet-stream;

    access_log    @PREFIX@/logs/access.log;

    sendfile           on;
    tcp_nopush         on;
    keepalive_timeout  65;
    server_tokens      off;

    # 临时目录全部落在 PREFIX 内，卸载时可一并清理，不与系统 nginx 争用
    client_body_temp_path  @PREFIX@/run/client_temp;
    proxy_temp_path        @PREFIX@/run/proxy_temp;
    fastcgi_temp_path      @PREFIX@/run/fastcgi_temp;
    uwsgi_temp_path        @PREFIX@/run/uwsgi_temp;
    scgi_temp_path         @PREFIX@/run/scgi_temp;

    gzip              on;
    gzip_comp_level   6;
    gzip_min_length   1024;
    gzip_proxied      any;
    gzip_vary         on;
    # 注意：text/html 是 nginx 内建默认值，重复声明会产生 duplicate MIME type 警告
    gzip_types
        text/plain text/css text/xml
        application/javascript application/json
        application/wasm image/svg+xml;

    charset utf-8;

    server {
        listen       @PORT@;
        server_name  _;

        root  @PREFIX@/current/app;
        index index.html;

        # —— 健康检查端点 ——
        # 升级流程据此判定「切换是否成功」，失败则自动回滚。
        # 版本号写在响应体里，可作为「当前真的跑的是哪个版本」的证据。
        location = /healthz {
            access_log off;
            add_header Cache-Control "no-store";
            default_type text/plain;
            return 200 "ok v@VERSION@\n";
        }

        # —— 带 hash 的构建产物：长缓存 ——
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        location /wasm/ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # —— sitemap / robots：可短缓存 ——
        location ~ ^/(sitemap\.xml|robots\.txt)$ {
            expires 1h;
            add_header Cache-Control "public, max-age=3600";
        }

        # —— 未知路径返回**真正的 404** ——
        # 兜底写成 /index.html 会让拼错的 URL 以 200 返回首页（软 404），
        # 对搜索引擎是明确反模式；SSG 已产出 404.html，用它。
        error_page 404 /404.html;
        location = /404.html {
            internal;
            add_header Cache-Control "no-cache";
        }

        # 静态路由：先精确文件，再目录 index.html（SSG 产物形态），最后交 404。
        # 用 $uri/index.html 而非 $uri/——后者会触发「目录自动补斜杠」的 301，
        # 与 SSG 产物的 canonical（无尾斜杠）不一致，还多一跳。
        location / {
            try_files $uri $uri/index.html =404;
            add_header Cache-Control "no-cache";
        }
    }
}
