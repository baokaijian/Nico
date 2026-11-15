# 家长核心体验 V2 设计

| 项目 | 内容 |
|---|---|
| 日期 | 2026-11-14 |
| 基线 | `master` `68884b4`，`NICO_TEST_PROTOCOL_ONLY=true npm run check` 全绿，261 项测试通过，公开产物 67 个文件校验通过 |
| 状态 | 方案 A 已确认，待开发 |
| 产品需求 | [`docs/pm-prd-parent-experience-v2.md`](../../pm-prd-parent-experience-v2.md) |
| 范围 | 家长主路径的展示与交互层；不新增集合、不做数据库迁移 |

## 1. 问题陈述

产品能力已经完整：多运动员、教练授权、周期对比、技能目标、报告、媒体、备份都已存在。真正的短板不在“有没有功能”，而在家长每天使用时**看不快、填得多、找不到、读不动**：

1. **工作台信息密度高。** `src/components/Workbench.jsx` 首屏同时出现快捷操作、首次引导、阶段成长、统一待办、当前重点、本周摘要、成长目标、最近训练、最近成绩九类区块；390px 下需要长距离滚动才能找到“记录一次训练”之外的信息。
2. **快速录入字段仍偏多。** `src/components/TrainingRecords.jsx:93` 快速模式常显日期、训练内容、时长、距离、完成情况五个字段；`src/services/record-form.js:3-9` 与 `src/components/Records.jsx:97` 让成绩快速表单在非打腿泳姿下仍显示“具体测试项目”。
3. **搜索只落到成绩。** `src/App.jsx:142-147` 的 `runSearch` 无条件跳转 `training/swim`，家长搜训练备注、影像标题或报告时找不到。
4. **教练反馈没有入口。** 教练原话存在 `trainings.coachNotes` / `feedbackBy`，但工作台没有汇总入口；家长只能在训练列表里逐条翻。
5. **报告阅读缺少上下文。** `src/components/Reports.jsx:23` 用 iframe 预览，`shared/report-drafts.mjs:53` 的报告头没有运动员姓名；家长无法一眼确认“这是哪个孩子、哪个周期、样本够不够”，导出文件名也不带运动员。
6. **多儿童身份只在顶栏一个 `select`。** `src/App.jsx:172-179` 使用内联样式；切换时没有“当前运动员”语义提示，也不确认未保存草稿；报告和导出文件不带运动员名。
7. **质量状态不统一。** App 加载态是“正在读取记录…”文本；读取失败与上次成功数据的区分、冲突三动作、骨架屏在各页面不一致。
8. **390px 与无障碍没有为新增的多运动员控件回归。** 顶栏新增运动员切换器后，窄屏可用宽度更紧张；触控目标、焦点顺序与状态播报需要重新验收。

## 2. 目标与非目标

### 目标

- 家长主路径压缩为三屏：**今日 → 记录 → 复盘**。
- 快速训练录入常显字段降到 **4 个**；快速成绩录入常显字段 **6 个**（打腿时才出现“具体打腿项目”）。
- 工作台首屏只保留“今天/本周/下一步”，其余渐进披露。
- 当前运动员在私有界面、报告头、导出文件名中始终可见。
- 搜索覆盖当前运动员的训练、成绩、影像、报告，且不跨运动员。
- P0 页面五态齐全；390px 无横向滚动；axe 0 critical；首屏 JS ≤180KB gzip。
- 所有结论仍可回源；不改变 PB、有效性、公开白名单、权限、CAS、幂等、逻辑删除。

### 非目标

- 不新增 AI 生成、成绩预测、儿童排名、综合评分。
- 不新增集合、不迁移数据库、不改公开摘要字段。
- 不扩大公开内容；**公开页不自动加入运动员姓名**（如未来需要，另立显式授权项）。
- 不重做四入口信息架构（方案 B 不在本期）。
- 不引入 UI 库、图表库、日期库、状态管理库。
- 不修改真实档案；测试只用隔离协议数据。

## 3. 方案选择

| 方案 | 内容 | 风险 | 结论 |
|---|---|---|---|
| **A 主路径聚焦式增量** | 保留四入口与业务规则，新增今日卡、渐进披露、录入瘦身、反馈卡、全局搜索、报告头、多儿童身份与质量收口 | 低；回归面集中在展示层 | **采用** |
| B 三入口信息架构重排 | 今日/记录/复盘为主，成长与设置降级 | 高；破坏深链、位置记忆、文档与测试 | 不采用 |
| C 纯质量收口 | 只做 390px、五态、无障碍、性能 | 低但用户可感知价值小 | 作为 A 的验收门槛吸收 |

## 4. 模块设计

### 4.1 新增纯投影：`shared/parent-experience.mjs`

把“今日卡、反馈卡、搜索结果、报告摘要”的计算从组件中抽出，前端与 Node 测试共用同一份，避免各写一套。输入均为已经按运动员作用域裁剪后的 `scopedData`。

```js
parentToday(data, day)        // 今日训练、本周摘要、最近成绩、最近教练反馈、待办前 3
coachFeedbackList(data, limit) // 仅 feedbackBy 存在的训练，按 feedbackAt/date 倒序
searchAthleteRecords(data, q)  // trainings / swim / media / reportDrafts 分组结果
reportOverview(data, report)   // 周期范围、事实计数、样本是否充足、过期状态
```

约束：

- 缺失值保持 `null` / `''`，不得补 0。
- 不读取 `trash` 之外的已删除记录；不跨运动员。
- 搜索只匹配允许检索的字段，返回摘要与记录 ID，不返回完整私有字段。
- 反馈卡只读 `coachNotes` 与 `feedbackBy/feedbackAt`，不新增“已读”事实。

### 4.2 组件

| 文件 | 变更 |
|---|---|
| `src/components/Workbench.jsx` | 拆为今日卡 + 本周摘要 + 更多；接入 `parentToday` 与反馈卡 |
| `src/components/TodayCard.jsx`（新增） | 今日状态、本周三项、主/次按钮、最近反馈、前 3 待办 |
| `src/components/CoachFeedbackCard.jsx`（新增） | 最近 3 条教练原话，来源可点回训练 |
| `src/components/SearchResults.jsx`（新增） | 分组搜索结果、两种空态、清除搜索 |
| `src/components/ReportOverview.jsx`（新增） | 报告周期、事实计数、样本状态、固定操作条 |
| `src/components/TrainingRecords.jsx` | 快速模式 4 字段；训练内容优先用最近使用 chip，无最近内容时放补充字段；补充字段折叠 |
| `src/components/Records.jsx` | 成绩快速 6 字段；`testItem` 仅打腿显示；下一步条 |
| `src/services/record-form.js` | 新增 `quickFields(type, values)` 纯函数，返回常显/折叠字段 |
| `src/services/management.js` | `workbenchModel` 复用 `parentToday`，避免重复计算 |
| `src/App.jsx` | 全局搜索状态、运动员切换确认、顶栏切换器类名化、加载骨架 |
| `src/components/Reports.jsx` | 接入报告摘要、运动员头、导出文件名、固定操作条 |
| `shared/report-drafts.mjs` | `growthReportHTML(report, stale, athlete)` 增加运动员头 |
| `src/index.css` | 今日卡、渐进披露、搜索、报告操作条、移动端顶栏、骨架屏、打印 |
| `scripts/check-bundle-budget.mjs`（新增） | 解析 `dist/index.html` 入口 chunk，gzip 后 ≤180KB |

### 4.3 数据流

```
API → state → scopeStateForAthlete(state, effectiveAthleteId)
      → scopedData → parent-experience 纯投影 → 组件
      → 写入仍走原 api.request：If-Match、clientRequestId、409 处理
```

- 不新增写接口；不新增实体。
- 报告头只读 `scopedData.profile.name`，属于私有展示，不进入公开产物。
- 导出文件名使用运动员名时做文件名安全化，不改变文件内容。
- 搜索结果只来自当前 `scopedData`，切换运动员时清空搜索并重新计算。

## 5. 状态与错误处理

P0 页面统一采用五态：

| 状态 | 表现 | 禁止 |
|---|---|---|
| 加载中 | 骨架屏，保留上次内容轮廓；`aria-busy` | 空白页 + 转圈超过 1 秒 |
| 首次为空 | 说明“还没有记录”+ 主按钮 | 填示例数据 |
| 筛选无结果 | “没有符合筛选的记录”+ 清除筛选 | 与首次为空同一文案 |
| 读取失败 | 有上次数据时“读取失败，显示的是上次成功的数据”+ 重试；无数据时说明原因 + 重试 | 伪装成空数据 |
| 保存冲突 409 | 查看最新 / 用我的版本覆盖（二次确认） / 已核对最新允许重试 | 静默覆盖 |
| 保存中 | 按钮禁用并显示“正在保存…” | 允许双击产生两条 |
| 未提交草稿 | 顶部常驻提示 + 继续/丢弃 | 自动提交 |

## 6. 多运动员与权限

- 私有域：`scopeStateForAthlete` 已按 `athleteId` 裁剪集合；新增投影必须沿用，不得读全量 `data`。
- 切换运动员：关闭快捷录入、清空搜索、保留各自身份草稿；若有未提交草稿，先确认“草稿按原运动员保留”。
- 报告头与导出文件名使用当前运动员 `displayName`；不写入报告事实，不改变报告基线。
- 公开域：**本期不动** `shared/publication.mjs`、`shared/public-results.mjs`、`public-summary` 字段。公开页仍只展示家长已勾选内容；不因多儿童改造自动加入姓名或身份。
- 教练权限仍由服务端 `authorizeCoachRequest` 逐请求判定；前端只展示，不替代鉴权。

## 7. 测试与验收

### 自动化

- 新增 `tests/parent-experience.test.mjs`：今日卡缺失值不补 0；反馈卡只取 `feedbackBy`；搜索不跨运动员；报告摘要样本不足不给结论；快速字段集合正确。
- 扩展 `tests/client.test.mjs`：`quickFields('trainings')` 恰为 4 个常显字段；`quickFields('swim')` 为 6 个，非打腿不含 `testItem`。
- 扩展 `tests/report-drafts.test.mjs`：报告头含运动员名；过期仍显示过期。
- 新增 `scripts/check-bundle-budget.mjs` 并在 `npm run check` 中执行。
- 完整检查：`NICO_TEST_PROTOCOL_ONLY=true npm run check`。

### 浏览器/人工抽检

- 390 / 768 / 1280 三档：工作台、快速训练、快速成绩、搜索、报告、多儿童切换。
- 390px 无横向滚动；主要触控目标 ≥44×44px；软键盘不遮保存按钮。
- 键盘完成一次快速训练录入；焦点可见；状态不只靠颜色；减少动效。
- axe 0 critical。
- 首屏 LCP / JS 预算；500 条训练列表滚动无掉帧。
- 报告导出 HTML 与页面一致；打印 PDF 分页不切断表格行。

### 诚实边界

- 软件测试通过 ≠ 真人验收通过。45 秒录入、真机、真实视频转码、完整无障碍需真人实测，未测写“待验”。

## 8. 发布与回滚

- 分支 `codex/parent-experience-v2`；非破坏性增量。
- 本期预期为前端改动；若实现触及 Edge Function 依赖，必须重新生成 `_release.mjs`、部署 `nico-api` 并验证源码指纹与访客权限，不能用 Pages 成功推断后端已发布。
- 发布前核对：最新 master、完整检查、公开产物、实际公开范围未扩大。
- 回滚：回退前端入口或向前修复；不删除任何新事实；不做 Git 历史重写。

## 9. 明确不做（防止范围蔓延）

- 公开摘要新增运动员姓名或 `athleteDisplayName`。
- 新增数据库集合或迁移。
- 教练端 UI 重做（本期只保留现有服务端权限与提示）。
- 训练计划引擎、报告事实引擎、PB 判定规则重写。
- AI 文本生成、成绩预测、儿童排名、综合评分。
- 新第三方依赖。

## 10. 待确认事项

无。若实现中发现必须改动公开字段或后端迁移，先停止并回到产品确认，不自行扩大范围。
