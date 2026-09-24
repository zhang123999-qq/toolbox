#!/usr/bin/env bash
# 部署脚本机检：把 CI 里那段「bash -n + 发布源一致性」收进一个脚本，
# 这样容器内的全量测试和 CI 跑的是同一份校验，不会出现两边口径不一致。
set -uo pipefail

cd "$(dirname "$0")/../.."

status=0

for f in \
  deploy/binary/install.sh \
  deploy/binary/toolboxctl \
  deploy/binary/build-bundle.sh \
  deploy/binary/tests/verify-release-source.sh \
  deploy/binary/tests/verify-nginx-config.sh \
  deploy/docker/run-tests.sh \
  deploy/docker/verify-deploy-scripts.sh; do
  if bash -n "$f"; then
    echo "PASS  syntax: $f"
  else
    echo "FAIL  syntax: $f"
    status=1
  fi
done

if sh deploy/binary/tests/verify-release-source.sh; then
  echo 'PASS  release source consistency'
else
  echo 'FAIL  release source consistency'
  status=1
fi

# 注意：verify-nginx-config.sh 需要「bundle 包 + 本机 nginx」，不是无参脚本。
# 无参调用只会打印用法并以非 0 退出（round1 就是这么挂的），
# 因此不在这里调用——改由 run-tests.sh 的 deploy-nginx 阶段在打完 bundle 后跑。

if node --check deploy/docker/smoke.mjs; then
  echo 'PASS  node --check: deploy/docker/smoke.mjs'
else
  echo 'FAIL  node --check: deploy/docker/smoke.mjs'
  status=1
fi

exit "$status"
