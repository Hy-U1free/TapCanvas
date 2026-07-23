## 🗂️ 包/目录建议

- `apps/web`：前台画布（React-Flow + Remotion Player）
- `apps/compose`：合成/导出微服务（Remotion Renderer 或 Editly + FFmpeg）
- `infra/activepieces`：AP flows、pieces 与部署
- `packages/schemas`：`timeline.json` / `shot` / `track` 的 zod 校验
- `packages/sdk`：前后端共享类型与 API 客户端
- `packages/pieces`：自定义 Activepieces Pieces（如 `GenericAsyncJob`、`ComposeVideo`）

## 🚀 快速开始

1. 启动 Activepieces（需 Postgres；可选 Redis）：`docker compose up -d`
2. `apps/web`：`pnpm i && pnpm dev`（本地打开画布，配置 API Key）
3. 导入示例 Flow：`infra/activepieces/flows/*.json`
4. 点“生成”，观察节点状态更新；点击“导出”生成成片 URL。

## 🔐 安全与回调

- 所有 Webhook/回调使用 `HMAC-SHA256` 体签（`X-Signature`），支持 `X-Idempotency-Key` 防重。
- 多租户隔离：`X-Tenant-Id` / 独立凭证与配额。

## 📄 许可

- 前台与合成代码建议 **MIT**；Activepieces 自身遵循其官方许可。
