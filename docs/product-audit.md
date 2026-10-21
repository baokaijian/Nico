# Nico Growth 现状审计

审计基线：2026-10-21，`859d6e2`。本文区分代码能力、已执行验证和待验收功能。真实档案、媒体原件、账号及备份不进入文档或公开仓库。

## 工程与页面

React 19 / Vite 8，前端 JSX、跨 Node/浏览器/Deno 共用 MJS，Express 5 本机服务、Supabase Edge 云端服务。现有工程没有 TypeScript 编译检查。页面通过 `src/App.jsx` 状态切换，未使用 URL 路由；保留当前传统网页、侧栏、移动导航和品牌样式，避免整站重建。

| 页面/组件 | 已有能力 | 审计状态 |
|---|---|---|
| Showcase | 公开概览、按距离/泳姿/池长分组的成绩、精选影像 | EXISTING |
| Dashboard | 事实摘要、主项成绩、数据缺口、快速录入 | PARTIAL：无完整能力评估和成长事件 |
| Records | 成绩、水上训练、体能、恢复、身体测量增改查删 | PARTIAL：无实际训练组、模板和成绩有效性 |
| PlanViewer | 草稿、人工确认计划、课次、来源版本 | PARTIAL：恢复时历史可能被旧备份覆盖 |
| Practice | 家长确认薄弱点、练习打卡、热图 | EXISTING；不能替代正式技能等级模型 |
| Reports | 周期训练量、计划覆盖、成绩分析、导出 | PARTIAL：技能及可编辑成长报告缺失 |
| MediaGallery | 上传、播放副本、封面、来源关联、时间点复盘 | PARTIAL：技术标签、前后比较、比赛关系缺失 |
| Profile | 档案、目标、公开白名单、备份、恢复、回收站 | PARTIAL：目标生命周期和操作审计待增强 |
| LoginPanel / ChangePassword | 登录、初始改密、退出 | RISK：初始密码会话在私有快照读取失败后才设置 |
| ui / RecordSources | 模态框、反馈、来源追溯 | EXISTING；完整键盘及读屏实测待执行 |

服务层 `api.js` 维护内存令牌、会话代次、版本 CAS 和上传进度；`useVideoProcessing.js` / `video-processing.js` 按需载入 FFmpeg。媒体保留原件，播放副本与原件哈希绑定。

## 数据、接口与统计

`shared/domain.mjs` 管理 growth / swim / trainings / fitness / nutrition / goals / plans / annotations / media / weakpoints / checkins 共 11 个集合，以及 profile、publishing、trash、planHistory。实体关系由业务校验执行；尚无所有实体统一归属及时间戳。成绩目前以格式化字符串及浮点秒计算，需要兼容迁移至整数毫秒。

| 接口族 | 当前实现 | 关键风险 |
|---|---|---|
| auth/session、login、logout、password | 本机会话 Cookie + CSRF；云端可撤销且有过期时间的 opaque token | 保留现有账号，不重置密码 |
| snapshot、各集合 GET/POST/PUT/DELETE | 集合校验、关联检查、CAS、逻辑删除 | RISK：匿名完整读取与新确认的访问范围冲突 |
| media/:id/content、上传及变体 | 私有存储、范围读取、校验、处理失败重试 | RISK：匿名原片读取；新媒体不得自动公开 |
| public-summary、public-media | 白名单摘要、精选播放文件及封面 | 静态发布副本撤回要重新发布；云端不应退回过期摘要 |
| backup、restore、trash、publishing | 导出、写前备份、恢复、发布范围控制 | RISK：旧备份恢复可回退计划版本并丢失当前历史 |

PB 已区分泳姿、距离、池长；未区分有效/无效成绩。主项分析、周报、打卡及计划草稿依据已录入记录，未知值有提示。训练量来自已录入训练记录，尚无实际完成组的汇总。自动计划草稿不代表已执行训练或教练处方。技能等级不得由成绩推算。

## 保存、部署与验证

本机 SQLite WAL、事务、版本检查、逻辑删除记录台账、写前原子备份；云端 Nico 独立表、私有 bucket、服务端访问和备份。共享删除保护保留已删除记录。现有 `planHistory` 有数量上限，长期档案需要无损保留及导出。

GitHub Pages 发布 `dist`，云 API 独立部署；私有构建为 `dist-private`。`release` 包含先前确认可公开的成绩和影像；原始数据在忽略的 `data`，审阅材料在忽略的 `review`。云端构建目前仍复制静态媒体，撤回不能即时覆盖这些副本。Docker 为静态只读入口，当前未验证容器运行。

现有检查：oxlint、Node 单元/接口测试、Vite 构建、公开产物白名单检查；没有 typecheck。2026-10-21 基线 `npm run check` 已运行完成，日志保留在本机临时目录；详细数量以 test-plan 的已执行记录为准。移动适配已有断点、折叠导航、滚动表格、减弱动效规则；不能据此宣称 WCAG 全量合规或 60 秒真人录入验收。

## 整改顺序

P0：前后端一致的公开范围、原片认证、初始改密流程、撤回一致性、历史保留、整数毫秒兼容迁移、成绩有效性、实际训练组及重复提交保护。P1：技能标准与评估、目标闭环、模板/计划增强。P2：成长档案、媒体技术标签、可编辑报告及协作辅助能力。范围与验收见其余六份文档。

## 云端安全复核（第一阶段）

实际检查确认 Nico 六表开启 RLS，anon/authenticated 均无 SELECT 权限，同步函数仅服务角色调用，私有 bucket 未开放。六项“RLS 已启用但无策略”提示与当前只允许服务端访问的设计一致，不能为消除提示新增公共策略，见[数据库检查说明](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)。同一 Supabase 项目的其他业务函数有两项既有 SECURITY DEFINER 提示，未擅自修改无关业务权限，需另行确认其调用设计，见[修复说明](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)。原生 Supabase Auth 未开启[泄露密码保护](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)，Nico 当前使用独立账号及会话；这不是本次新增的授权通路。

## 第二阶段实施复核

成绩计算已由 shared/performance.ts 统一为整数毫秒及明确有效性，typecheck 纳入 check；旧记录保留且标为未核验，不自动认定有效。旧展示字段和备份兼容，旧备份恢复保持当前毫秒版本。Vite 升级8.1.6安全补丁，当前依赖审计为零已知问题。以上为已实施结果，训练实际组、归属时间戳、幂等审计及技能目标仍按差距清单推进，不能视为整个V1.0已完成。
