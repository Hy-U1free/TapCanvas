# 镜像标签策略

镜像发布提供下列标签：

| 标签 | 用途 | 是否可变 |
| --- | --- | --- |
| `sha-<commit>` | 精确回滚、问题定位 | 否 |
| `main` | 日常集成环境 | 是 |
| `vX.Y.Z` | 指定正式版本 | 否 |
| `latest` | 最近一次正式发布版本 | 是 |

向 `main` 推送时，GitHub Actions 发布 `main` 和 `sha-<commit>`。

创建并推送 `vX.Y.Z` Git tag 时，GitHub Actions 发布 `vX.Y.Z`、`sha-<commit>` 和 `latest`。因此 `latest` 只跟随正式版本，不会被日常开发提交覆盖。

Zeabur 使用建议：

```text
# 日常环境
ghcr.io/<namespace>/tapcanvas-web:main

# 稳定环境
ghcr.io/<namespace>/tapcanvas-web:latest

# 固定正式版本
ghcr.io/<namespace>/tapcanvas-web:v1.2.3

# 精确回滚
ghcr.io/<namespace>/tapcanvas-web:sha-<commit>
```

镜像标签更新后，平台仍需重新部署或通过 GitHub/Webhook 自动触发部署；普通“重启服务”只重启当前已部署的镜像版本。
