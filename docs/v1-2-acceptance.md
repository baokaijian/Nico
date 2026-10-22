# V1.2 分阶段验收记录

基线：master fa0169b（V1.1）。开发分支codex/v1-2-management。完整方案与操作路径矩阵见superpowers/specs/2026-10-22-v1-2-management-design.md。本文件只记录实际证据；尚未部署时不声称上线。

## 阶段1：信息架构与工作台

- 文件：src/App.jsx、services/management.js、components/Workbench.jsx、ManagementView.jsx、Profile.jsx、Practice.jsx、Skills.jsx、index.css、tests/management.test.mjs。
- 实现：四个一级入口；旧路由适配；工作台四快捷入口、真实待办/重点/本周摘要/目标/最近训练与成绩；设置按分区从账号菜单访问；按已验证身份恢复上次位置。
- 验证：完整110项测试及lint/typecheck/build/公开白名单通过。隔离浏览器验证四入口、训练计划、刷新回到上次二级位置、设置公开摘要可达、查看模式回三入口且无私有表单。
- 风险：旧按钮映射遗漏、角色入口误扩展、身份位置串用；已加白名单/身份失效测试。没有修改数据结构/API或稳定计算。
- 回滚：撤销阶段1导航与布局提交；位置缓存可忽略，业务记录保持原样。后续阶段在独立提交中继续。

## 阶段2：连续录入

- 文件：QuickEntry、EntryResume、TrainingFeedback；TrainingRecords、Records、Skills、MediaGallery适配；entry-flow、activity-records、drafts、api、useGrowthForm、useVideoProcessing及双运行时API。
- 实现：四类快捷表单；训练保存后同一摘要内补成绩/影像/反馈；自动关联本次训练；独立失败保留主记录；账号隔离草稿、请求标识和CAS冲突重试。成绩默认未核验，实际量、等级和成绩不复制。
- 验证：完整116项测试与lint/typecheck/build通过。隔离浏览器完成训练→成绩→PNG素材→反馈；模拟响应丢失、写入503、CAS冲突、刷新恢复后，最终仅1条训练/1条新成绩/1个素材且关联正确。视频转码的真人上传体验尚未验收，不能用图片测试代替。
- 风险：跨接口中断、旧客户端兼容、素材重试；双运行时契约测试覆盖幂等冲突与删除后禁止复活。没有数据库迁移或公开范围变化。
- 回滚：按逆序撤销阶段2前端和后端提交；新增关联为可选字段，既有JSON和素材可保留；原始业务记录不删除。

## 阶段3：成长同屏

待开发/验收。

## 阶段4：移动端与体验

待开发/验收。45秒基础训练录入为真人目标，尚未真实测量；真机和全站无障碍未验收。
