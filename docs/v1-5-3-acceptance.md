# V1.5.3 交付与验收（2026-10-24）

## 范围与实际数据

基线master c0b5141/V1.5.2。开始前只读核实revision22：成绩8（有效1/未核验7）、目标6、影像3；训练、技能定义/评估、故事、报告草稿、纪念册等均0。存储9对象/94,317,512字节。无自动补造、核验、删除、扩大公开授权；详见[差距/风险清单](v1-5-3-gap-and-risks.md)。

## 设计与受影响文件

| 阶段 | 文件 | 实现与风险 | 回滚 |
| --- | --- | --- | --- |
| 审计/设计 | specs/2026-10-24-v153-activation-design、plans/2026-10-24-v153-activation、v1-5-3-gap-and-risks | 仅数字分布，私有完整回执在忽略目录 | 文档可独立回退，不操作事实 |
| 引导与待办 | shared/admin-tasks.mjs、growth-setup.mjs；GrowthSetupWizard、TodoCenter、Workbench、ManagementView；management.js、setup-progress.js、index.css | 纯投影+本机枚举偏好；原表单保存，确认独立；设备位置不同步，禁存储不能记位置 | 回退入口/投影，不迁移数据库 |
| 来源适配 | SourceWorkspace、Records、TrainingRecords、MediaGallery | 明确原集合/ID、角色；打卡/模板适配；素材说明和批注限制到所选素材，关联选择仍可合法选其他来源 | 保留已有后端/新事实，回退前端 |
| 公开成绩 | shared/public-results.mjs、Showcase | 有效PB与全部授权历史，未知具体打腿不混合比较；不改performance.ts/publicSummary | 前端回退，不撤销家长公开选择 |
| 证据与运维设计 | activation/public-results/source-focus测试、management样本、protocol-server端口、release-info；需求/数据/验收/变更文档 | V1.6尚未启用，真人全部待验 | 无新计划任务、外部数据目的地或服务费用 |

无新集合、无SQL迁移、无后端业务源码改动。前端版本1.5.3；实际API源码指纹应保持728cc4465db764efeff4f6763bcbf65b998903876c1f0d7a7bb97f1f5224d38c，兼容复用API1.5.2/Edge17。不能将后端工作流触发当作新函数发布。

## 软件验收

- 完整隔离检查初轮189/189通过。媒体精确来源发现旧嵌套列表显示无关记录，增加SSR回归，RED确认无关批注可见，修复后GREEN；最终完整数量与发布回执在下方补记。
- 5294内存协议服务，合成素材、独立protocol账号；前端API明确指向本机，未向正式档案写测试内容。
- 浏览器：访客无有效记录时PB区域为空而原始历史保留；登录家长→五步引导0/5→原成绩精确定位、人工填写计时条件/有效性保存→1/5；跳过不增完成，刷新会话/步骤恢复；真实协议训练100米/20分钟→保存摘要→返回原引导2/5；待办过滤空状态、排序、媒体精确原记录→手动关联训练保存→待办2减1。以上均为模拟协议操作，不是儿童实际事实。
- 媒体原记录的嵌套说明/批注只显示所选素材，SSR分别覆盖只读和家长可编辑，保留其他数据与关联选项。
- 手机尺寸软件检查与跨账号交互按实际补记；不把软件视口称作真实手机。

## 人工待验和运行限制

九类[可执行模板](manual-acceptance-template.md)全部待验：真人45秒、真实手机/平板、真实视频上传/播放/转码、中文报告PDF及浏览器打印、纪念册照片、分卷SHA256、儿童会话、真实弱网及基础无障碍。没有真实测量不能标达成。

现有Git历史隐私风险、共享Supabase非Nico业务告警没有擅自清理。V1.6离站加密备份/独立恢复演练/持续通知与监控仅[设计](v1-6-reliability-design.md)，须真实启用和家长验收后再推进，未猜测目标/密钥/阈值。

## 发布回执（2026-10-24实际结果）

- 本地检查：`NICO_TEST_PROTOCOL_ONLY=true npm run check` 全绿；190项测试（含activation/public-results/source-focus新增）、lint、typecheck、构建、公开白名单64文件通过。
- 分支与合并：`codex/v1-5-3-onboarding`（378f9c3）推送远端；master快进 `c0b5141..378f9c3`，无冲突，未改写历史。
- Actions：[Publish selected Nico summary run 40091497334](https://github.com/baokaijian/Nico/actions/runs/40091497334) success；Deploy Nico cloud API run 40091497323 success（函数源码未变，复部署同一指纹，不作为新API版本）。
- Pages实际资源：https://baokaijian.github.io/Nico/ 线上 `index-B9U_lfSq.js` 与本地验收构建哈希一致；`nico-build.json` 为 release 1.5.3、frontendCommit 378f9c3、contentSource api。
- API实际版本：`/api/version` 返回 1.5.2 / 指纹 728cc4465d…/commit 3da87dc，与验收合同一致（前端1.5.3兼容复用API1.5.2/Edge17）。
- 访客权限：`npm run verify:guest` 89项通过（匿名写全拒、授权媒体200、未授权404、GET/HEAD均覆盖）。
- 公开范围：公开摘要只读核对仍为8条成绩/3项影像、publishedAt 2026-10-22，未扩大授权；无迁移/新集合/后端业务变更。
- 正式事实：发布过程零生产写入；真人/真机九类模板验收仍全部待验，见[人工验收模板](manual-acceptance-template.md)。
