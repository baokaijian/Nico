# V2.0 家长核心体验验收记录（codex/parent-experience-v2）

## 1. 范围与目标

本次实现对应 `docs/pm-prd-parent-experience-v2.md`（FR-PX-01..23，P0 范围）与 `docs/superpowers/specs/2026-11-14-parent-experience-v2-design.md`：

1. **今日卡与渐进披露工作台（FR-PX-01..03）**：
   - 首屏展示当前运动员、今日训练状态（缺失测量值显示 `未记录`，不补 `0`）、本周已知训练汇总、主次分层快捷录入入口、最新 1 条真实教练反馈及前 3 条待办。
   - 首次使用引导收敛为可隐藏紧凑横幅，完整引导保留在工作台子导航。
   - 次级模块（阶段成长、进行中的目标、最近一次训练、最近成绩变化）默认折叠在「更多内容」展开面板中。
2. **极简录入主路径与保存后连续动作条（FR-PX-04..07）**：
   - 快速训练录入主表单精简为 4 项（日期、实际时长、实际总距离、完成情况），补充字段默认折叠，最近使用训练内容仅填 `trainingType`。
   - 成绩录入主表单精简为 6 项（日期、距离、泳姿、池长、成绩、有效性状态），非打腿隐藏 `testItem`，计时与条件及补充详细字段默认折叠。
   - 内联保存训练或成绩后展示连续动作条（添加成绩、关联影像、记录教练反馈、结束），不自动创建后续记录。
3. **教练反馈卡片与来源追溯（FR-PX-08..09）**：
   - 独立展示当前运动员最近 3 条含 `feedbackBy` 的教练反馈，标注「教练原话 · 只读」，支持跳转原训练记录并高亮反馈内容；原记录移入回收站时明确提示。
4. **当前运动员范围搜索与切换保护（FR-PX-10..14）**：
   - 搜索基于 `scopedData` 检索训练、成绩、影像、报告草稿四类记录，不跨运动员泄漏，区分「当前运动员尚无记录」与「无匹配结果」两类空态，支持跳回原记录工作区。
   - 单运动员家庭隐藏顶部切换下拉框；多运动员切换时若存在未保存草稿或打开的快捷录入弹窗则先弹出确认，切换后重置搜索状态。
5. **报告概览、运动员归属与打印预算（FR-PX-15..22）**：
   - 报告预览页顶部新增概览卡与粘性操作栏，样本不足（有效成绩 `< 2` 且训练 `< 2`）时诚实提示「样本不足」且不输出趋势结论。
   - 报告 HTML 与导出文件名包含当前运动员名称，补充 `@media print` 行内防断页规则。
   - 首屏加载骨架屏与保留旧数据的错误重试提示；新增 `scripts/check-bundle-budget.mjs` 校验首屏 JS gzip `<= 180KB` 且不含 `ffmpeg` / `pdf-document`。

## 2. 自动化验证结果（已完成）

- `npm run security:check`：通过（0 隐私泄漏）
- `npm run lint`：通过（0 warning / 0 error）
- `npm run typecheck`：通过
- `NICO_TEST_PROTOCOL_ONLY=true npm test`：通过（含新增 `tests/parent-experience.test.mjs` 及更新的 `tests/client.test.mjs`、`tests/report-drafts.test.mjs`）
- `npm run build && npm run check:bundle && npm run verify:public`：通过（首屏入口 JS gzip 80.3KB，初始总计 116.3KB，均 `<= 180KB`，且首屏未加载 `ffmpeg` / `pdf-document`）
- `NICO_TEST_PROTOCOL_ONLY=true npm run check`：全绿通过

## 3. 真人、真机与真实环境待验项（待验）

以下项目依赖真实家长、真实移动设备与浏览器打印/读屏环境，自动化检查不冒充已完成验收，状态明确标记为 **待验**：

| 验收项 | 状态 | 待验说明 |
| --- | --- | --- |
| 真人家长 45 秒训练录入与 60 秒成绩录入计时 | **待验** | 需由真实家长在池边或课后按日常习惯实测计时 |
| 真实手机（iOS Safari / Android Chrome 390px）触控与粘性操作栏体验 | **待验** | 已完成样式与响应式规则，真机软键盘弹起与单手点按待实测 |
| 浏览器打印 / 另存为 PDF 跨页排版核对 | **待验** | 已加入 `@media print` 防断行样式，需在真实桌面/移动浏览器打印预览核对分页 |
| 真实视频转码（FFmpeg Worker）与完整读屏无障碍（VoiceOver / TalkBack） | **待验** | 需使用真实视频素材与系统读屏软件逐项核验 |
| axe 自动扫描（390 / 768 / 1280 三档） | **待验** | 当前环境 Playwright MCP 连接失败；软件检查未执行 axe，不在验收记录中宣称 0 critical |

## 4. 验收方独立复核（2026-11-15）

- 独立运行 `NICO_TEST_PROTOCOL_ONLY=true npm run check`：268 项测试全部通过，lint / typecheck / build / `check:bundle` / `verify:public` 全绿；首屏入口 80.3KB gzip、初始总计 116.3KB gzip；公开产物 70 个文件通过。
- 复核发现并修复 3 项组件 prop 不匹配（修复提交 `a71f6aa`）：
  - `TodayCard` 由 `Workbench` 传入 `todayModel` 与 `onNavigate`；
  - `ReportOverview` 改为接收已计算的 `overview`，`Reports` 传入 `onPrint`；
  - `App` 向 `SearchResults` 传入 `onClear`。
- 修复后用 Vite SSR 渲染冒烟核验 `TodayCard`、`ReportOverview`、`SearchResults`、`Workbench` 四个组件，均能渲染出预期内容（今日卡、报告概览、搜索分组、工作台反馈卡）。
- 结论：**软件验收通过**；真人 45 秒/60 秒计时、真机 390px、真实打印/PDF、真实视频转码、完整读屏与 axe 扫描仍为**待验**，不得表述为已完成。
