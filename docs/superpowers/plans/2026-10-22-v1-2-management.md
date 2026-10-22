# Nico Growth V1.2 Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 用四入口管理界面及连续工作区降低家长日常录入复杂度，保留原有数据、安全、证据与保存可靠性。

**Architecture:** 路由适配器复用现有组件，QuickEntry组合既有表单和独立实体事务，技能工作区组合测评/短板/打卡/目标。新增可选swim.trainingId和成绩/媒体创建收据；不迁移或改写业务快照，不改performance.ts/training.ts计算。

**Tech Stack:** React 19、Vite 8、现有Node24+测试及SQLite/云处理器；无新增运行时依赖。

**Spec:** docs/superpowers/specs/2026-10-22-v1-2-management-design.md

## Global Constraints

- 管理端一级入口：工作台、训练记录、成长管理、分析复盘；公开入口保持三项及人工白名单。
- 实际量与计划量分离；成绩整数毫秒/有效性/池长隔离、技能人工测评、目标和里程碑独立确认、CAS/请求幂等、历史/回收站、身份草稿、私有媒体保留。
- 使用codex/v1-2-management分支，阶段独立提交；无破坏性数据库迁移，无正式模拟记录或真实媒体上传。
- 日期与业务上下文可预填；实际量、等级、证据及成绩不从上一条复制。成绩默认未核验。
- 全部协议样本/日志/截图留忽略的review；文档明确开发/验收/发布状态，45秒真人目标未测量前标为待验。

## Review Focus

- 同账号不同API、不同账号及注销后旧引用：导航/工作流/草稿不能串用（Task1/2）。
- 主记录已写但响应丢失、媒体原片已存但兼容处理失败：重试同ID、主训练不回滚（Task3/4）。
- 恢复流程引用已删除训练、标准停用、其他设备先改：禁止猜测或静默覆盖，显式核对（Task2/4/5）。
- 选定技能切换时未保存表单与其他技能数据：保留草稿，不能重挂绕过恢复保护（Task5）。
- 手机固定入口、长表单和模态框：不遮挡保存、焦点返回、可关闭恢复（Task6）。

---

### Task 1: 四入口、位置恢复与工作台（阶段1）

**Files:** Create src/services/management.js, src/components/Workbench.jsx, src/components/ManagementView.jsx, tests/management.test.mjs; Modify src/App.jsx, src/components/Profile.jsx, src/index.css.

**Interfaces:**
- resolveManagementLocation(legacyTab, type?) -> {section,view}; sanitizeLocation(value) -> safe location。
- createManagementPosition({scope,storage,isCurrent}) -> {read(),write(location)}；只存白名单位置。
- workbenchModel(data, day) -> {pending,summary,goals,latestTraining,recentScores,focus}，复用既有事实规则。
- ManagementView({location,setLocation,data,api,onSaved,reload,readOnly,role,openQuickEntry,navigate})适配既有组件。

- [x] 写tests/management.test.mjs：old week映射训练计划、profile映射管理设置；非法路径回工作台；A/B/API位置隔离，旧身份引用无效；空库无待办，待确认只来自真实状态，取消训练不算实际量。
- [x] 运行node --test tests/management.test.mjs，预期缺少新模块失败。
- [x] 实现导航服务、Workbench和适配视图，拆Profile的settings/archive区域，App接四入口和角色边界。
- [x] 运行专项测试、npm run check及隔离浏览器验证导航/详情/查看模式；记录结果。
- [x] 提交阶段1及验收台账。回滚为导航/布局提交回退，数据/API保持兼容。

### Task 2: QuickEntry与可恢复流程状态（阶段2基础）

**Files:** Create src/services/entry-flow.js, src/components/QuickEntry.jsx, tests/entry-flow.test.mjs; Modify src/App.jsx, src/services/drafts.js（仅需要的验证接口）。

**Interfaces:**
- newEntryFlow(type, context?) -> {version:1,id,type,step,trainingId,scoreIds,mediaIds,...}。
- advanceEntryFlow(flow,event) -> new flow；事件只记录已获服务端确认的实体，绝不把后续错误变为主记录未保存。
- entryContext(flow,data)验证主记录存在且可继续；无视频字节写本地。
- QuickEntry({type,context,data,api,onSaved,onClose})组合训练/成绩/技能/媒体；流程草稿使用现有身份/TTL机制。

- [x] 写entry-flow.test：后续失败保留trainingId、刷新重新定位有效主记录、主记录删除阻止继续、各类型上下文不复制成绩/等级/实际量、未知步骤/损坏草稿拒绝。
- [x] 跑专项红测试，再实现纯状态机及QuickEntry骨架；已有业务表单用props嵌入，不新建第二套业务校验。
- [x] 跑专项绿测试，确认账户/档案/API草稿测试仍绿；阶段2最终提交随Task4。

### Task 3: 成绩/上传的收据及最小关联（阶段2可靠性）

**Files:** Create shared/activity-records.mjs, tests/activity-api.test.mjs; Modify shared/domain.mjs, server/server.js, server/cloud-api.mjs, src/services/api.js。

**Interfaces:**
- activityRelations(key,record,data,previous)验证可选swim.trainingId；旧无关联保持未知。
- 复用creationRequest/creationReplay，成绩POST和媒体multipart接受clientRequestId；原片收据哈希包含服务端文件SHA256及白名单元数据。
- 同请求重试返回原记录；不同内容/已删除409，未经认证401，协作者上传权限不扩大。

- [x] 写两后端协议测试：同训练保存成绩/关联媒体、无效关联拒绝、收据重试只创建一次、变内容409、已删除不复活、陈旧CAS不写、原片失败不影响训练、匿名写拒绝。
- [x] 跑红测试证明现有端缺创建保护，再增量接入两个后端；只清理失败请求临时产生的文件，不删除已有素材。
- [x] 跑两后端绿测试及既有训练/成绩/媒体/恢复测试；校验performance.ts/training.ts未修改。
- [x] 提交可靠性子提交；不做业务数据迁移。回滚保留可选字段/收据，前端可退回旧入口。

### Task 4: 训练→成绩/影像/反馈→摘要（阶段2完成）

**Files:** Modify QuickEntry.jsx, TrainingRecords.jsx, Records.jsx, MediaGallery.jsx, record-form.js, App.jsx; Create needed focused continuation/feedback component and tests.

**Interfaces:**
- 表单适配props：entryOnly,initialContext,onRecordSaved；训练保存回调必须在后续操作前触发。
- QuickEntry成功摘要actions进入swim/media/feedback/结束；swim.trainingId/media.recordId使用已保存训练，反馈PUT保留开始输入CAS。
- 上传原片成功回调与处理结束回调分别报告，摘要能区分原片保存/副本处理失败。

- [x] 先加上下文/表单字段/请求ID稳定性专项断言，红后修改。
- [x] 接入复用表单、收据、上下文选择器、成功摘要和可跳过分支；嵌入表单不展示整个历史列表。
- [x] 隔离浏览器跑训练→成绩→上传/已有影像→反馈→结束；模拟断网/响应丢失、409、刷新、退出/账号切换、草稿恢复，验证总记录数与关联ID。
- [x] 完整check，记录阶段2文件/风险/回滚及实测交互次数，提交。

### Task 5: 技能工作区与连续目标审核（阶段3）

**Files:** Create src/components/GrowthWorkspace.jsx; Modify Skills.jsx, Practice.jsx, GrowthGoals.jsx, ManagementView.jsx; Add tests/growth-workspace.test.mjs。

**Interfaces:**
- skillWorkspace(data,skillId) -> confirmed/history/pointIds/checkins/goals，纯引用组合，不改实体。
- Skills支持focusedSkillId/entryOnly/initialContext/onCreatePoint；Practice支持上下文来源和onRetest；保留完整模式默认。
- GrowthGoals支持focusedSkillId及确认后的待审核里程碑入口，同页两个独立确认动作。

- [x] 红测试：不同技能互不混用、撤销评估不作为当前等级、无关联项保留全部视图、候选不达成、目标确认不确认里程碑。
- [x] 实现同屏选择器和上下文面板，保留未保存表单/草稿处理；折叠来源/版本但不删除。
- [x] 两后端增长测试及隔离浏览器闭环；确认打卡后等级不变、复测等级为空、两次确认分别操作。
- [x] 完整check，记录并提交阶段3。

### Task 6: 四尺寸、可靠性复验与交付（阶段4）

**Files:** Modify src/index.css and targeted UI; Create docs/v1-2-acceptance.md; Update docs/changelog.md, requirements-gap.md, test-plan.md, data-model.md, README.md。

- [x] 检查320/390/768/1440视口、44px触控、固定入口不遮挡、弹窗Tab/Esc焦点和返回位置；记录可复现缺陷后修复。
- [x] 完整lint/typecheck/test/build/verify:public；API与静态产物分开校验，所有新写操作在隔离后端测试。
- [x] 汇总四阶段实际文件、测试、风险、提交及回滚；真人45秒、真机、完整无障碍仍待真人/专门验收。
- [x] 新上下文整分支审查并修复重要问题；最终提交/推送开发分支，记录实际交付状态，现网发布单独记证据。
