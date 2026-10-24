# V1.4.1 质量收口验收（2026-10-24）

基线ea0f3b1。用户本轮明确先完成1.4，故仅实施V1.4.1，V1.5全部暂缓。设计/计划位于superpowers/specs及plans的2026-10-24-v141文件。

## 受影响文件和实现

- 发布：release-info/prepare-release/verify-deployment、两条Actions、Vite manifest。确定性依赖指纹；无凭据不再仅跳过；Pages也要求实际API匹配。
- 观测：runtime-health、cloud-api/Edge、本机server、api/health.js、HealthPanel及设置适配。固定类别和数字，内存窗口/平台日志分开；账号退出清空，不记录业务内容；私有健康接口。
- 展示缺陷：隔离浏览器发现仅录时长的训练在日历和报告中显示“0米”。增加回归后修复为“实际距离未记录”；真实0及已知部分仍区分，仅改展示，不改training.ts、事实快照、报告引擎nico-report-1或原始数据。
- 运维：operations-queries/audit-git-privacy、运维手册、独立协议浏览器服务、验收及状态矩阵。无新业务集合、无DDL迁移。

## 生产只读审计

发布前：Edge v13 ACTIVE（18文件）；PostgreSQL17.11；13条正式迁移，其中7个仓库增量文件均存在，最新四个准确对齐20261023124015/35/41/49。发现早期practice/templates仓库文件名未对齐正式记录，本轮将20261021095107→20261021095321、20261021131620→20261021133333，仅重命名既有SQL文件，内容不变；未重放迁移、修改数据库历史或执行db push。七个仓库增量文件现均与正式记录对齐。

业务revision20，台账22，私有对象9（94,317,512字节），12个写前备份，最新2026-10-22T08:03:14.802133Z/revision19。快照内容校验、完整私有备份及旧Edge源码存ignored review（600权限），无正式模拟记录写入。

Nico六表RLS全部开启；anon/authenticated均无表访问权；七个Nico函数非SECURITY DEFINER且无匿名/普通角色EXECUTE；存储桶private，50MB上限，无storage.objects公开策略。公开授权沿用原白名单，不增加训练、测评、报告、故事或原片公开范围。

共享项目边界：commit_learning/read_learning的authenticated SECURITY DEFINER告警属于其他业务，未修改；Supabase Auth泄漏密码保护关闭是项目级告警，Nico使用独立账号认证，不宣称因此已解决。Nico无策略的RLS提示属于service-only设计。相关[数据库告警说明](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)。

本机Node依赖审计另发现body-parser与multer的两项高危拒绝服务公告（云Edge不使用Express/Multer），已更新兼容修补版并锁定上传依赖；body-parser2.4.0、multer2.5.0已锁定并通过更新后的155项全量回归，npm audit复查0项漏洞。上游公告：[body-parser](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828)、[multer](https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m)。

Git本地可达对象路径盘点发现原uploads素材5项、已授权release素材6项；未发现已跟踪review或非example环境文件路径。此为路径盘点，不能代替完整内容/凭据审计，历史仍可能保留敏感信息。未删除内容、重写Git或调整既有授权，后续执行仍按独立隐私方案确认。

## 自动与隔离验收

完整检查：155/155通过，lint/typecheck/test/build及45文件公开产物白名单通过；最终生产配置构建在提交后再次核对。新增发布、指标和未知距离回归均先失败后通过。独立全分支审查1项Important（多行导入未计入指纹）、1项Minor（Cookie登录未清计数），均已在一轮修复中解决：使用已有Rolldown语法解析器，支持多行import/export及字面量动态导入，计算路径/语法错误拒绝；Cookie登录/首次设置同样隔离窗口。新增回归覆盖两项，无未处理审查发现。以下矩阵将协议测试、浏览器及人工项分开，不能用软件通过替代实际业务验收。

| 范围 | 本轮证据 | 限制 |
| --- | --- | --- |
| 训练→成绩→影像 | activity-api双后端含真实合成PNG上传、请求幂等、失败保留主记录；本轮浏览器25分钟训练→未核验成绩→合成视频关联→完成摘要 | 未测试真实训练视频转码 |
| 测评→短板→打卡→复测 | growth-api双后端完整人工链及标准版本冻结，本轮全量回归；前轮浏览器证据保留 | 本轮不冒称重新真人测评 |
| 目标→里程碑 | growth-api独立人工确认、重复确认不重复事件，前轮浏览器记录保留 | 不自动公开 |
| 时间轴及来源 | growth-timeline/growth-workspace，来源ID精确；前轮浏览器来源跳转记录保留 | 本轮复验软件路径 |
| 报告 | archive-api/report-drafts双后端新建、编辑不改事实、过期拒绝确认、刷新、确认和恢复；本轮浏览器503/409保留→刷新核对→保存 | PDF打印待真人验收 |
| 赛事多成绩 | archive-api双后端同日同池长比赛关联、归属冲突/回收恢复；前轮浏览器赛事→日历保留 | 不补造历史赛事 |
| 视频A/B | 本轮两段可解码合成MP4（12/10秒），起点3/1秒、0.75x同步时读到3.180624/1.182592秒，暂停/人工说明保存；协议覆盖边界与权限 | 非儿童原片和真实转码验收 |
| 日历 | 周月/闰年投影；本轮日历显示本次训练及未核验成绩，发现并修复缺失距离误显示0 | 计划不算实际 |
| 备份/恢复/迁移 | 本轮临时SQLite/协议云全回归；PGlite0.5.11 PostgreSQL18.6演练7迁移/19集合/状态不变/逻辑删除恢复/匿名拒绝 | 云实际PG17.11，未恢复正式库 |
| 网络/冲突/重复 | activity-api/client/entry-flow及浏览器503、409；旧请求、幂等重放、输入保留 | 真实弱网移动设备待验 |
| 会话/退出/草稿隔离 | accounts/cloud-api/client/drafts/app-view全回归；新browser-health覆盖退出清计数与旧响应隔离 | 前轮浏览器A/B草稿证据保留 |
| 健康与版本 | 新release-health/browser-health覆盖真实查询不匹配阻断、传递依赖指纹、隐私字段排除、限流与日志失败不影响业务；本机健康仅家长 | 内存不是全站持久趋势 |
| 新健康页 | 本轮浏览器显示指纹一致、实例/设备范围、未知备份与待验收；320/390/768/1440软件视口无页面横向溢出 | 非真机或完整WCAG |

协议浏览器可复现：先用ffmpeg生成两段仅testsrc/color的protocol-a.mp4（12秒）和protocol-b.mp4（10秒），放私人临时目录；以NICO_TEST_PROTOCOL_ONLY=true、NICO_PROTOCOL_MEDIA_DIR绝对路径启动tests/support/protocol-server.mjs（5293）；Vite构建API指向http://127.0.0.1:5293/functions/v1/nico-api。账号protocol-a/b，密码Protocol-Only-Drafts-2026仅此隔离进程；服务只能使用内存事实，无正式数据库配置入口。控制注入地址仅127.0.0.1。不得把该测试服务发布到生产。

## 明确待验与风险

真人45秒录入、真实手机和平板输入、真实训练视频转码、浏览器PDF打印、完整无障碍均待验收。定时离站备份、自动恢复验证、外部告警通知尚未配置；健康页及运维手册如实显示。平台日志已有可执行只读聚合，生产样本包含大量权限探测，暂不冒称建立了可靠业务错误率/转码基线。

回滚：无数据迁移，回退前端健康入口及包装即可；后端维持识别19集合的兼容版本；不可用旧备份覆盖新事实或部署不识别新历史的旧API。两条工作流版本门槛随回滚源码重新核对实际API。

## 实际发布

待最终检查、独立审查和生产回执后补录，不能将本地完成标成已上线。
