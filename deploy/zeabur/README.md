# Zeabur 镜像部署

本项目在 Zeabur 中需要部署为 **6 个同项目服务**：PostgreSQL、Redis、New API、Agents Bridge、TapCanvas API 与 Web。不要只部署 Web 镜像；Web 仅是前端与 `/api/*` 反向代理。

所有服务间通信必须使用 Zeabur **Networking → Private** 中显示的私有主机名，例如 `api.zeabur.internal:8788`。不要使用公网域名，也不要猜测主机名：服务创建后复制控制台显示的实际值。

## 0. 配置 GHCR 访问

镜像地址：

```text
ghcr.io/hy-u1free/tapcanvas-web:main
ghcr.io/hy-u1free/tapcanvas-api:main
ghcr.io/hy-u1free/tapcanvas-agents-bridge:main
ghcr.io/hy-u1free/tapcanvas-new-api:main
ghcr.io/hy-u1free/tapcanvas-new-api-patch:main
```

若 GHCR 包为私有包，在 Zeabur 的 **Docker Images** 服务中添加 registry 凭据：

```text
Registry: ghcr.io
Username: Hy-U1free
Password: GitHub PAT（read:packages）
```

生产更新建议使用 `sha-<commit>` 标签或镜像 digest，而不是可变的 `main` 标签。

## 1. 创建基础服务

在同一个 Zeabur Project 中添加下列 Docker Images 服务；除 Web 外，其余端口均只用于私有网络，不要创建公网域名。

| 服务名 | 镜像 | 端口 | 持久卷 |
| --- | --- | --- | --- |
| `postgres` | `postgres:16-alpine` | `5432` / TCP | `/var/lib/postgresql/data` |
| `redis` | `redis:7-alpine` | `6379` / TCP | `/data` |
| `new-api` | `ghcr.io/hy-u1free/tapcanvas-new-api:main` | `4455` / HTTP | `/data`、`/app/logs` |
| `agents-bridge` | `ghcr.io/hy-u1free/tapcanvas-agents-bridge:main` | `8799` / HTTP | `/runtime/workspace/project-data`、`/runtime/workspace/.agents` |
| `api` | `ghcr.io/hy-u1free/tapcanvas-api:main` | `8788` / HTTP | `/app/project-data`、`/app/backups`；若启用文件型微信支付证书，再挂载 `/app/cert` |
| `web` | `ghcr.io/hy-u1free/tapcanvas-web:main` | `80` / HTTP | 无 |

为 `postgres` 设置：

```env
POSTGRES_DB=tapcanvas
POSTGRES_USER=tapcanvas
POSTGRES_PASSWORD=<强随机密码>
```

为 `redis` 设置启动命令：

```text
redis-server --appendonly yes
```

记录 PostgreSQL、Redis、New API、Agents Bridge 与 API 的实际 Private hostname，以下配置中的 `*_PRIVATE_HOST` 都应替换为这些值（不包含端口）。

## 2. 显式初始化空数据库

仅在确认 PostgreSQL 是本次部署专用的空数据库后，创建两个一次性 Docker Images 服务并查看日志。此步骤会创建数据库结构，不能跳过，也不会被应用服务自动执行。

### TapCanvas API schema initializer

- 镜像：`ghcr.io/hy-u1free/tapcanvas-api:main`
- 不暴露端口、不挂载公网域名
- 环境变量：

```env
DATABASE_URL=postgresql://tapcanvas:<POSTGRES_PASSWORD>@<POSTGRES_PRIVATE_HOST>:5432/tapcanvas?schema=public
```

- Start Command：

```text
node scripts/bootstrap-postgres-schema.mjs
```

日志出现 `[db] postgres schema ready` 后，删除或停止这个一次性服务。

### New API patch initializer

- 镜像：`ghcr.io/hy-u1free/tapcanvas-new-api-patch:main`
- 不暴露端口、不挂载公网域名
- 保持镜像默认启动命令
- 环境变量：

```env
PGPASSWORD=<POSTGRES_PASSWORD>
NEW_API_PATCH_DB_HOST=<POSTGRES_PRIVATE_HOST>
NEW_API_PATCH_DB_PORT=5432
NEW_API_PATCH_DB_NAME=tapcanvas_new_api
NEW_API_PATCH_DB_USER=tapcanvas
```

日志出现 `new-api patches applied` 后，删除或停止这个一次性服务。

## 3. 配置应用服务

### New API

```env
PORT=4455
SQL_DSN=postgresql://tapcanvas:<POSTGRES_PASSWORD>@<POSTGRES_PRIVATE_HOST>:5432/tapcanvas_new_api
REDIS_CONN_STRING=redis://<REDIS_PRIVATE_HOST>:6379
TAPCANVAS_INTERNAL_TOKEN=<随机长密钥>
```

New API 就绪后，在其管理后台创建供 Agents Bridge 使用的访问令牌，保存为下方的 `AGENTS_API_KEY`。同时按你的模型供应商配置渠道与模型；未配置渠道时，Agents 无法实际调用模型。

### Agents Bridge

```env
AGENTS_PROFILE=code
AGENTS_API_BASE_URL=http://<NEW_API_PRIVATE_HOST>:4455/v1
AGENTS_API_STYLE=responses
AGENTS_STREAM=true
AGENTS_API_KEY=<New API 后台创建的访问令牌>
AGENTS_BRIDGE_TIMEOUT_MS=1800000
AGENTS_BRIDGE_BODY_LIMIT_BYTES=8000000
AGENTS_REQUEST_TIMEOUT_MS=1800000
AGENTS_RESPONSES_POLL_TIMEOUT_MS=120000
AGENTS_RESPONSES_POLL_INTERVAL_MS=1000
AGENTS_RESPONSES_IN_PROGRESS_RETRIES=5
AGENTS_BRIDGE_MAX_CONCURRENCY=16
AGENTS_REDIS_URL=redis://<REDIS_PRIVATE_HOST>:6379
AGENTS_SESSION_CACHE_TTL_SECONDS=600
AGENTS_WORKSPACE_ROOT=/runtime/workspace
AGENTS_SKILLS_DIR=/opt/tapcanvas/skills
```

### TapCanvas API

```env
NODE_ENV=production
PORT=8788
DATABASE_URL=postgresql://tapcanvas:<POSTGRES_PASSWORD>@<POSTGRES_PRIVATE_HOST>:5432/tapcanvas?schema=public
REDIS_URL=redis://<REDIS_PRIVATE_HOST>:6379
AGENTS_BRIDGE_AUTOSTART=0
AGENTS_BRIDGE_BASE_URL=http://<AGENTS_BRIDGE_PRIVATE_HOST>:8799
NEW_API_INTERNAL_BASE_URL=http://<NEW_API_PRIVATE_HOST>:4455
NEW_API_SQL_DSN=postgresql://tapcanvas:<POSTGRES_PASSWORD>@<POSTGRES_PRIVATE_HOST>:5432/tapcanvas_new_api
TAPCANVAS_API_INTERNAL_BASE=http://<API_PRIVATE_HOST>:8788
PG_BACKUP_DIR=/app/backups

JWT_SECRET=<随机长密钥>
INTERNAL_WORKER_TOKEN=<随机长密钥>
NEW_API_INTERNAL_TOKEN=<与 New API 完全相同的随机长密钥>
NEW_API_SESSION_SECRET=<随机长密钥>
NEW_API_CRYPTO_SECRET=<随机长密钥>
```

按需补充对象存储、邮件、支付等集成变量；这些变量与 `deploy/.env.example` 一致。

### Web

仅为 Web 的 `80 / HTTP` 端口配置公网域名，并设置：

```env
API_UPSTREAM=http://<API_PRIVATE_HOST>:8788
```

Web 镜像在启动时会将此地址写入 Nginx 反向代理配置；`/api/*` 请求将通过 Zeabur 私有网络转发到 TapCanvas API。

## 4. 验收与更新

1. 确认 `new-api` 的 `/api/status`、`agents-bridge` 的 `/health` 与 `api` 的根路径均显示健康。
2. 访问 Web 的公网域名，确认登录、画布读取及一次实际的 Agents 请求均成功。
3. 更新时先在 Zeabur 将所有应用镜像改为同一个已验证的 `sha-<commit>` 标签或 digest；不要混用不同提交的镜像。
4. 若版本包含 schema 或 New API patch 变更，先审查变更和备份，再按第 2 节显式执行初始化服务。
