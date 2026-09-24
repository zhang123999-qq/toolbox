# ============================================================================
# Toolbox 服务单元
#
# 由 toolboxctl 从模板渲染后安装到 /etc/systemd/system/toolbox.service。
# 注意这里跑的是**独立的 nginx 实例**（-c 指向 PREFIX 内的主配置），
# 与系统 nginx.service 无关：停掉本服务不会影响机器上其它站点。
#
# 用 -g 'daemon off;' 让 nginx 前台运行，配合 Type=simple；
# 重载走 HUP（nginx 原生信号），停止走 QUIT（优雅退出，等在途请求结束）。
# ============================================================================
[Unit]
Description=Toolbox 静态工具站（独立 Nginx 实例，端口 @PORT@）
Documentation=@DOC_URL@
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=@NGINX_BIN@ -c @PREFIX@/shared/nginx.conf -g 'daemon off;'
ExecReload=/bin/kill -s HUP $MAINPID
ExecStop=/bin/kill -s QUIT $MAINPID
Restart=on-failure
RestartSec=2
KillSignal=SIGQUIT
TimeoutStopSec=10
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
