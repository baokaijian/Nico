# 数据模型与兼容策略

现状：本机/云端共同使用版本化 JSON 业务状态，SQLite/Postgres 台账、备份和逻辑删除字段提供保存保护。先增量增强业务实体及服务端约束，避免同时更换存储和业务界面。跨运行时 MJS 保留兼容；增量引入 TypeScript 契约与检查。

| 目标实体 | 现有位置/计划 | 关系 |
|---|---|---|
| Athlete | profile，当前单一 Nico 归属 | 全部记录 athleteId |
| TrainingSession | trainings | 计划课次、训练组、媒体 |
| TrainingSet | 计划新增实际组 | sessionId、泳姿、距离、实际次数 |
| TrainingPlan | plans / planHistory | 来源记录、版本、课次 |
| SwimPerformance | swim | 项目、timeMs、有效性、赛事/训练、媒体 |
| SkillDefinition / SkillAssessment | 后续新增集合 | 可配置标准、评估人/日期/依据、历史 |
| GrowthGoal | goals 增强 | 标准、基线、目标、计划和确认完成证据 |
| MediaAsset | media | recordId、标签、授权公开、原片/副本 |
| Competition / Milestone | 后续新增集合 | 成绩、技能、训练或独立人工记录 |
| CoachFeedback | 现有 coachNotes / annotations，后续结构化 | 来源、训练/媒体、作者与日期 |
| AuditLog | 计划新增服务端审计 | 操作、主体、时间、请求标识、前后版本 |

服务端关系验证是当前 JSON 模型的外键约束。增加关系必须校验目标存在、归属一致、被逻辑删除时的恢复语义。新记录使用唯一 ID、createdAt/updatedAt/athleteId；历史未知创建时间不可伪造为业务发生时间。

时间迁移：字符串原值保留；以精确解析得到整数 timeMs，旧 seconds 为兼容派生值，mm:ss:cc 为显示值。不同精度不能经显示字符串回写而丢失毫秒。无效或冲突值列入只读审计，不能猜测修复。既有有效录入不擅自改为失格；缺少有效性时保留兼容解释并提供人工确认。

迁移先在副本验证，生成迁移前备份与差异报告；CAS 成功才写入，重复执行不重复修改。回滚使用备份并保留迁移后新增记录/历史，不直接覆盖整个现有状态。关系型拆表和删除任何旧字段属于高风险变更，另给迁移、双读及回滚方案后执行。

计划恢复必须合并当前与备份历史；同 ID/版本不同内容不可静默覆盖；后续版本高于所有历史。媒体恢复不物理删除对象。业务逻辑删除继续保留 deletedAt/deletedBy；公开摘要剔除已撤回或删除项。

## 已有打卡集合的台账兼容补丁

线上台账仅允许旧九集合，而应用已有 weakpoints/checkins。迁移 `supabase/migrations/20261021095107_extend_nico_practice_ledger.sql` 在原有两份 backend SQL 之后执行：事务内放宽集合检查为十一类，并替换同步函数以覆盖十一类；保持 SECURITY INVOKER、空 search_path、仅服务角色调用。没有新增公开权限，不回写业务快照、不改变 revision、不回填虚构记录。读取时兼容历史快照缺少两类集合，损坏集合仍报错。

上线前核对旧约束、函数、表权限、真实快照版本与摘要；上线后核对新约束/函数、RLS/调用权限及快照摘要不变。应用回滚时保留扩展约束和台账，避免已有新类数据无法读取；只有两类都无数据并保存函数旧定义时才可恢复旧约束，禁止删除新类记录来完成回滚。
