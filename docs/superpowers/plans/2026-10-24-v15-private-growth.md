# V1.5 实施计划

Goal：在V1.4.1上完成受限儿童视图、年度纪念册、私人归档和阶段驾驶舱，逐阶段独立发布。

Architecture：复用React/Vite、JSON事实及growth版本合同、双后端、CAS/请求收据、私有媒体和报告。新增childViews/childReflections/yearbooks三集合；儿童持久限权会话；档案/驾驶舱纯投影。

Tech Stack：Node24+、React19、Supabase Edge/Postgres；pdf-lib/fontkit/OFL中文字体仅客户端惰性加载；ZIP store/CRC/SHA256，无外部模型服务。

Spec：[设计与差距矩阵](../specs/2026-10-24-v15-private-growth-design.md)。Global Constraints：生产只读核验、兼容DDL及部署；隔离测试、无真实模拟档案、无公开扩大/删除。已有持续推送合并上线授权，按当前会话自行实现。

## Task 1 儿童视图（独立发布）

- Interfaces：childProjection(data,viewId,day)返回严格摘要与允许照片/训练ID；validateChildContext(data,session)验证配置版本；反思保存复用saveGrowth；issueChild(parent,context)返回child scope令牌/期限。
- RED：双后端角色越权、父失效、配置改变、只读照片白名单、反思幂等/CAS及人工确认；客户端loadAppView子角色无完整snapshot/家长令牌；空/不足/旧备份历史。
- GREEN：growth-model/records/domain+新模块；cloud/local/accounts/API/App；ChildSettings/View及草稿白名单；CLI生成兼容迁移（21集合+session列）。
- 验证：完整check、隔离PG、协议浏览器家长→儿童→留感受→交还登录→独立确认。保存私有备份/旧API，应用兼容迁移并对齐正式时间戳，部署API、推送合并、实际Pages/指纹/77+匿名边界/生产事实未变。

## Task 2 年度纪念册（独立发布）

- Interfaces：freezeYearbook(data,input)、yearbookStale(data,book)；renderPrivatePDF(document,{fontBytes,photoLoader,signal})→Uint8Array。复用报告facts及中文可再分发字体。
- RED：事实注入拒绝、确认/过期、原报告不变、编排白名单、媒体版本、PDF分页中文及隐私链接排除。
- GREEN：yearbooks领域与第三集合（22集合兼容迁移）、Yearbooks UI/导航、私有PDF；下载不写事实。
- 验证与发布同Task1；隔离PDF提取/渲染；已确认报告/纪念册历史不覆盖。记录风险与回滚入口。

## Task 3 私人归档（独立发布）

- Interfaces：yearArchive(data,year)返回年度/支持记录/关系/缺口；archiveCSV()；createZip(files)及manifest SHA256；export队列按会话epoch、重试、大小、分卷控制。
- RED：跨年支持引用、失效/回收关系、CSV注入、未知量、ZIP CRC及SHA、私有媒体401/失败/重试/取消/分卷/退出失效，独立解包验证。
- GREEN：PrivateArchive、archive领域/ZIP与队列、复用PDF；无新事实集合、无公开存储。
- 验证与前端发布；归档不可作为完整备份覆盖恢复；无大型真实媒体假验收。

## Task 4 阶段驾驶舱（独立发布）

- Interfaces：growthCockpit(data,{start,end})→来源化指标和不足提示，复用training/performance/timeline/quality。
- RED：池长/泳姿/距离/测试项目隔离、未核验不算PB、标准版本不同不比、实际缺失不补0、来源跳转及空数据。
- GREEN：GrowthCockpit、导航与Workbench入口；无数据迁移/AI或排名。
- 完整check+浏览器四尺寸/来源入口；一次独立全分支审查（最有能力模型）；一轮修复后最终发布与事实/权限复验。

Review Focus：1儿童令牌不得读完整资料且父撤销跨冷启动有效；2客户端不保留父凭据/旧事实；3纪念册冻结事实不可注入且旧版本可恢复；4归档必须标明失败与边界且内存有上限；5PB/技能可比性与未知真实量保留；6每阶段线上回执与人工待验不得混淆。

Ledger：ignored review/V15_EXECUTION_LEDGER.md逐任务记录RED/GREEN、提交、部署/迁移、裁定及未测项，支持连续执行。
