# V1.4.1 运维与真实部署核验

## 发布门槛

`npm run release:prepare` 生成唯一被排除的 `_release.mjs`，剩余 Edge 相对依赖图（使用[Rolldown语法解析器](https://rolldown.rs/reference/Function.parseAst)，支持多行import/export及字面量动态导入，无法静态确定的路径拒绝发布）以路径和原文生成 SHA256。CLI 与连接器打包均必须运行此准备步骤。`npm run release:verify -- <API地址>` 读取真实 `/api/version`，失败/旧版本/非JSON都停止；`--wait` 最多24次、每次10秒超时及间隔10秒，不会无限重试。Pages 和后端工作流都要求此校验通过。无 CLI 凭据时，只能预先通过连接器部署同指纹版本，不再把“跳过”当作部署完成。

发布核验分开记录：代码 master 提交、构建、Pages 部署回执、实际 nico-build.json/JS、Edge 部署回执与源码对比、迁移历史、生产权限、人工业务验收。前端提交与 API 部署提交可以因纯前端/文档修改而不同，必须比较 API sourceHash；开发/本机 sourceHash=null 表示未进行生产部署证明。

## 采集口径与只读查询

账号 → 管理设置 → 运行健康：设备指标只存内存、不上传；退出/新登录清空，跨账号旧请求不能再写指标。仅计数运行异常，不读错误文本/堆栈。当前后端实例同样是内存窗口，冷启动重置。Edge 仅写 `nico_health_v1`、固定类别、状态、耗时和 API 指纹；最多60条/10秒/实例，丢弃数量单独显示，日志异常不影响业务。没有姓名、记录ID、路径、正文、视频地址、请求头、令牌和完整档案。

跨实例趋势使用平台 invocation 日志，不能把单实例截图当趋势。运行 `node scripts/operations-queries.mjs`，将输出传给已连接 Supabase `query_logs`，project_id=oeyirzlgqixvcxofimit，明确指定 start/end ISO UTC，单次≤24小时。只返回按小时/固定类别/状态聚合的数量、P50/P95；不返回请求路径、IP、headers 或日志原文。平台原有访问元数据并非本次新增采集，其权限/保留期受 Supabase 项目设置限制，不能声称没有平台日志。

| 指标 | 分母与含义 | 缺失边界 |
| --- | --- | --- |
| API服务错误 | 同窗口同类别 HTTP5xx / 所有已到达函数的请求 | 网络未到达不在分母；401/403/409单列，不能当服务故障 |
| 登录失败趋势 | login类别401/429数量 / login全部尝试，按小时 | 不含用户名/IP；Nico自有认证，不用Supabase Auth报告冒充 |
| 请求延迟 | 同类别有 execution_time_ms 的 P50/P95 | 无耗时样本不可当0ms健康；排除OPTIONS/健康探测解释业务分布 |
| 原片上传API | upload类别2xx / upload全部请求 | 重试为请求次数，不是独立素材成功率；响应丢失需核对幂等结果 |
| 兼容处理API | processing 2xx与processingFailure上报分别计数 | 客户端中断/未上报未知；处理失败上报200不代表转码成功 |
| 当前视频状态 | 真实media中的已处理/失败/未知数量 | 不是历史尝试成功率；原片保留、未处理不能算失败或成功 |
| 存储与备份 | `node scripts/operations-queries.mjs --database` → execute_sql，只查nico表/桶 | 健康页存储列表上限1000或遇目录则标不完整；运维SQL是桶总数/字节 |
| 恢复验证 | 隔离PostgreSQL、临时SQLite和协议云恢复测试记录 | 生产只读；没有向生产回灌，无定时自动恢复演练 |

当前备份为写前自动快照；无写入时不会定时新增。未配置定时离站备份及自动恢复校验，健康页明确显示。发布前完整私有备份及旧函数源码存ignored review（600权限），不推公网。备份内含档案，需家长妥善保管。

## 基线与告警

2026-10-24只读24小时样本：104次函数请求，200×32、204×6、401×65、404×1，200样本P50=1226ms、P95≈1968ms。样本包含上次发布权限探测，不能作为训练写入/登录/上传生产基线。业务样本不足，错误率/延迟/登录/转码趋势均处于观察期，不生成“健康通过”或预测。

立即阻止发布：API指纹不一致/不可查询、Pages产物不匹配、匿名读到私有内容、Nico表权限异常。备份缺失（已有事实但无任何写前备份/私有发布恢复点）或存储列表不完整须人工核对。错误率/延迟阈值在每类别至少100个真实业务样本、覆盖至少7天后按P95及故障分布设定并记录版本；100/7天是启用门槛，不是测得的故障阈值。尚未连接外部推送告警或定时监控，CI只在发布时阻断不一致，不能称24小时自动监控。

平台日志参考：[Supabase Functions Logging](https://supabase.com/docs/guides/functions/logging)、[Reports](https://supabase.com/docs/guides/observability/reports)。只使用其日志能力，不照搬文档示例中输出用户内容或请求头的做法。

## 安全和回滚

Nico表/函数仅service_role可访问，Edge内部验证可撤销会话；verify_jwt=false配合现有自有认证，不改为匿名档案。共享项目其他learning模型及Supabase Auth告警单独记录，未经授权不改。Git只读路径盘点：`node scripts/audit-git-privacy.mjs`，不是完整秘密扫描；历史隐私整改仍需家长逐项授权，见v13-v14-privacy-cleanup-plan.md。

本次无迁移、新实体或事实更新。回滚可回退健康入口和包装，保留支持19集合的兼容后端、历史和逻辑删除，不部署早期不认识新实体的服务；绝不以旧快照覆盖新事实。
