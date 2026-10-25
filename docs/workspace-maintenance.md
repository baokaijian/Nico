# 工作区扫描与清理（2026-10-25）

基线 master `14b9cea`（V1.7.0），与远端一致；开始时工作区干净。已重新枚举项目目录（不展开Git内部和已安装依赖），读取全部262个受版本管理文件，其中254个文本文件约1.63MB；解析179个JS/TS/JSX模块的引用。前端入口可达87个模块，未发现可直接删除的闲置前端代码。核对最新V1.5.3/V1.6/V1.7代码差异和发布记录，保留尚待后端发布的独立分支。

## 本次清理

- 删除根目录旧 `favicon.svg`、`icons.svg`、`.nojekyll`；删除未引用的 `public/icons.svg`。当前图标仍来自 `public/favicon.svg`，Pages标记仍由 `scripts/prepare-public.mjs` 生成。
- 删除脚手架遗留 `src/assets/hero.png`、`react.svg`、`vite.svg`：项目源码、配置、脚本和文档均无引用。
- 清除旧 `dist-private/`、`node_modules/.vite/`（含过期deps_temp目录）和空 `.vite-temp/`。它们可由构建/启动重新生成；清理时没有Nico开发或展示服务在监听。
- 重新验证构建并保留当前可用的 `dist/`、`.generated-public/`，便于现有本地只读启动流程继续使用。检查产生的缓存随后再次清除。

删除的受版本管理文件可从基线提交恢复；缓存和私有构建可重新生成。精确文件/字节及摘要回执位于本机临时目录，未将私有材料上传。

## 保留依据

| 目录/文件 | 原因 |
| --- | --- |
| data、release、release.previous、legacy-archive | 当前事实、授权公开包、历史副本；不把“未被代码导入”误判为无用 |
| review、.superpowers、.workbuddy | 私有审计/验收/旧函数源码及工作记录，不能当缓存整批删除 |
| .env.local、认证配置 | 本地服务配置，未读取或展示凭据内容 |
| node_modules（除缓存） | 当前运行和测试依赖，保留锁文件及已安装包 |
| src/assets/fonts及许可、public/favicon.svg | 中文PDF和当前站点实际依赖 |
| 所有业务组件/服务/测试/SQL迁移/历史文档 | 均属于当前能力、验证或历史恢复依据，不为目录整洁删减 |
| .git和其他功能分支 | 不重写历史，不删除待部署工作 |

## 后续维护

构建和启动可能再次生成dist、dist-private、.generated-public和Vite缓存，这是正常现象。只在相关进程停止后清缓存；不要使用 `git clean -fdx`，它会一并删除被忽略的真实资料。私有构建用 `VITE_APP_MODE=private npm run build` 重建；常规公开构建使用 `npm run build`（需要云端实时内容时带既有VITE_API_URL）。

## 验证和发布

本次不改业务功能、后端依赖、数据结构、公开授权或任何真实记录。完整隔离检查已通过：217项测试、lint、typecheck、build及65个公开产物白名单检查。首轮实际移除184个文件，共92,035,891字节（87.77MiB）；验证产生的缓存随后再次清除。页面发布结果以本次提交对应Actions及实际资源核对为准。
