# V1.5.3 差距、任务与风险（2026-10-24）

基线master c0b5141；Pages40084115863成功，实际API1.5.2/Edge17、源码指纹728cc4465db764efeff4f6763bcbf65b998903876c1f0d7a7bb97f1f5224d38c。正式迁移15条，原始审计回执保留在忽略目录，无生产测试写入。

## 只读数据分布

| 集合 | 条数 | 含义 |
|---|---:|---|
| swim | 8 | 有效1、未核验7，不自动核验 |
| goals / media | 6 / 3 | 已有目标待家长复核；影像实体数不同于存储对象数 |
| childViews / plans / growth | 1 / 1 / 3 | 已有儿童配置、计划及测量 |
| trash / planHistory / growthHistory | 1 / 2 / 1 | 保留回收与历史 |
| trainings / trainingTemplates | 0 / 0 | 尚未录入，不认定没有训练 |
| skillDefinitions / skillAssessments | 0 / 0 | 尚无人工配置/测评，不推断等级 |
| weakpoints / checkins / milestones | 0 / 0 / 0 | 不补造 |
| growthStories / reportDrafts / yearbooks | 0 / 0 / 0 | 可通过真实资料逐步启用 |
| competitionEvents / videoComparisons / annotations | 0 / 0 / 0 | 不自动创建 |
| fitness / nutrition | 0 / 0 | 无记录不等于真实0 |

snapshot revision22；存储9对象/94,317,512字节。本文仅统计，不发布姓名、原话、完整档案或私有媒体地址。公开范围保持8条成绩/3项影像的原有授权选择。

## 差距与实施矩阵

| 需求 | 现有能力/缺口 | 本轮实施文件 | 数据及权限风险 | 验收 |
|---|---|---|---|---|
| 首次启用 | QuickEntry/原记录已有，缺少连贯缺口引导 | shared/growth-setup、GrowthSetupWizard、setup-progress | 仅事实推导；偏好不能假完成，不写第二事实库 | 空数据、同版本确认、跳过、刷新及身份隔离 |
| 统一待办 | 工作台仅4类待确认，质量诊断未含过期报告 | shared/admin-tasks、TodoCenter、Workbench | 不能旁路确认，来源稳定；保持原权限 | 八类及原有短板、去重、排序、失效来源 |
| 公开成绩分区 | 所有项目占PB位，列表混排 | shared/public-results、Showcase | 仅白名单输入，核心毫秒/有效性不改 | 未核验不占PB、历史不丢、池长隔离/未公开具体打腿不作可比PB |
| 真人验收 | 已有软件回归，真人状态分散 | manual-acceptance-template | 实际结果私有保存，不能自动标通过 | 可执行步骤、结果栏默认待验 |
| 运维可靠性 | 写前备份/临时健康统计已有，缺独立加密/持久告警 | v1-6-reliability-design | 离站目的地和解密人未定；不能公开上传 | 本轮设计，未启用或冒称完成 |

## 风险与回滚

- 向导状态是当前资料推导，未录入不表示未发生；无“填示例完成”或批量核验。
- 跳过偏好只在当前账号设备保存，禁存储时无法记住位置；重新进入仍按事实计算。
- 待办只链接原记录；已确认报告来源过期需新草稿，不回写旧事实。退出/撤销后不保留私有管理视图。
- 新投影模块不进入既有Edge依赖图；无迁移/新实体。若最终源码指纹不变，沿用v17并明确前端1.5.3/API1.5.2兼容，不能把工作流绿色称作后端新部署。
- 公开卡片仅有效组，历史保留原白名单及状态，不新增授权或读取完整档案。
- 真实45秒、手机/平板、原片转码、PDF打印、大文件内存和全量无障碍由家长按模板验收；软件视口不等于真机。
- 回滚前端本轮提交，保留兼容后端/当前事实/新历史；不使用旧备份覆盖后续保存。
- Supabase审计中Nico6表RLS无策略是服务角色专用的预期隔离；共享项目commit_learning/read_learning的SECURITY DEFINER警告及SupabaseAuth配置不属于Nico自有认证，未修改。参考[官方告警说明](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)。
