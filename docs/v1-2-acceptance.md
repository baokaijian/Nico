# V1.2 分阶段验收记录

基线：master fa0169b（V1.1）。开发分支codex/v1-2-management。完整方案与操作路径矩阵见superpowers/specs/2026-10-22-v1-2-management-design.md。本文件只记录实际证据；尚未部署时不声称上线。

## 阶段1：信息架构与工作台

- 文件：src/App.jsx、services/management.js、components/Workbench.jsx、ManagementView.jsx、Profile.jsx、Practice.jsx、Skills.jsx、index.css、tests/management.test.mjs。
- 实现：四个一级入口；旧路由适配；工作台四快捷入口、真实待办/重点/本周摘要/目标/最近训练与成绩；设置按分区从账号菜单访问；按已验证身份恢复上次位置。
- 验证：完整110项测试及lint/typecheck/build/公开白名单通过。隔离浏览器验证四入口、训练计划、刷新回到上次二级位置、设置公开摘要可达、查看模式回三入口且无私有表单。
- 风险：旧按钮映射遗漏、角色入口误扩展、身份位置串用；已加白名单/身份失效测试。没有修改数据结构/API或稳定计算。
- 回滚：撤销阶段1导航与布局提交；位置缓存可忽略，业务记录保持原样。后续阶段在独立提交中继续。

## 阶段2：连续录入

待开发/验收。

## 阶段3：成长同屏

待开发/验收。

## 阶段4：移动端与体验

待开发/验收。45秒基础训练录入为真人目标，尚未真实测量；真机和全站无障碍未验收。
