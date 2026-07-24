# TapCanvas 镜像部署

`deploy/compose.yml` 是生产环境的镜像消费清单：运行时不挂载仓库源码、不在容器启动阶段安装依赖，也不会自动执行数据库结构修改。New API 的管理界面由镜像内嵌的已构建静态资产提供，不依赖宿主机的 `WEB_DIST_DIR` 目录。

Web 容器的 API 反向代理地址由 `API_UPSTREAM` 控制，默认值为 Compose 网络中的 `http://api:8788`。在 Zeabur 等使用私有服务域名的平台中，应设置为该平台提供的 API 私有地址。

API 与 Agents Bridge 在启动时会校正其持久目录的权限，然后以非 root 的 `node` 用户运行；这使 Docker volume 与 Zeabur persistent volume 都可写，而不会让应用进程以 root 身份执行。

## 镜像组成

| 服务 | 镜像变量 | 说明 |
| --- | --- | --- |
| Web | `TAPCANVAS_WEB_IMAGE` | 内置 Nginx；浏览器通过同源 `/api/*` 访问 API。 |
| API | `TAPCANVAS_API_IMAGE` | Node API 及只读共享 schema。 |
| Agents Bridge | `TAPCANVAS_AGENTS_BRIDGE_IMAGE` | 编译后的 agents-cli 与内置 skills。 |
| New API | `NEW_API_IMAGE` | 模型网关。 |
| New API 初始化器 | `TAPCANVAS_NEW_API_PATCH_IMAGE` | 仅在显式初始化时运行的数据库 patch 镜像。 |

Postgres 和 Redis 使用上游镜像，均通过具名 volume 持久化。业务项目数据、Agents 运行态、API 备份、证书及 New API 数据也各自使用具名 volume；更新镜像不会覆盖这些数据。

## 构建并推送镜像

在 CI 或具备 Docker Buildx 的构建机中执行。先从示例创建仅供构建标签使用的环境文件，并将镜像地址替换为实际 registry/repository：

```bash
cd deploy
cp .env.example .env
# 编辑 .env：替换 5 个镜像变量和所有生产密钥

docker compose -f compose.yml -f compose.build.yml build
docker compose -f compose.yml -f compose.build.yml push
```

`compose.build.yml` 只是构建覆盖层；正式服务器只需要 `compose.yml`、`.env` 和 Docker，不需要源码树。

仓库推送到 `main` 或创建 `v*` tag 后，GitHub Actions 会自动发布同名镜像到 GHCR。五个镜像采用独立矩阵任务发布：一个镜像失败不会阻断其他镜像的构建与日志输出。部署时应优先使用 `sha-<commit>` 标签或镜像 digest，而不是可变的分支标签。

## 首次部署

1. 将 `deploy/compose.yml` 和基于 `deploy/.env.example` 填写好的 `.env` 放到服务器同一目录。所有镜像变量必须使用已推送的镜像标签或 digest。
2. 登录私有 registry 后拉取镜像：

   ```bash
   docker compose pull
   ```

3. 先启动基础数据服务：

   ```bash
   docker compose up -d postgres redis
   ```

4. **确认目标数据库为本次部署专用数据库后**，显式执行初始化。该步骤会创建数据库、表、索引和允许的新增列，因此不会被 `up` 自动触发：

   ```bash
   docker compose --profile database-init run --rm database-init
   docker compose --profile database-init run --rm new-api-database-init
   ```

5. 启动应用：

   ```bash
   docker compose up -d
   docker compose ps
   ```

Web 默认监听 `http://<server>:8080`，可用 `WEB_PORT` 修改。API、Postgres、Redis、Agents Bridge 与 New API 均不直接暴露宿主机端口；Web 只将 `/api/*` 反代到内部 API 网络。

## 升级

```bash
docker compose pull
docker compose up -d
```

如果新版本附带数据库 schema 或 New API patch 变更，先审查该版本变更及备份策略，再重新显式运行两个 `database-init` 命令。不要使用 `docker compose down -v`，该命令会删除全部具名 volume 中的持久化数据。

## 运行时配置

- `.env` 不应提交到版本库；至少替换 `POSTGRES_PASSWORD`、`JWT_SECRET`、`INTERNAL_WORKER_TOKEN`、`NEW_API_*_SECRET` 与 `AGENTS_API_KEY`。
- 其他 API 集成配置（R2、邮件、支付等）可直接追加到 `.env`，它会被 API 与 Agents Bridge 注入。
- 微信支付证书位于 `tapcanvas_wechat_cert` volume。若启用文件型证书，需通过受控运维方式写入该 volume，不能写入镜像层。
- 默认网络只暴露 Web；如确有运维调试需求，应通过额外的 Compose override 明确暴露相应端口，而不是修改基础生产清单。
