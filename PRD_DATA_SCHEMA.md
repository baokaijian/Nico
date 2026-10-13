# Nico PRD 数据结构与整改

依据用户提供的《nico官网PRD.pdf》单页结构图。文档示例只说明字段和格式，不作为真实生日、比赛日期、排名或身体测量。

## 字段映射

继续使用稳定的记录 ID 和现有逻辑删除台账。身体记录在 `growth`；测试、比赛和训练成绩在 `swim`，由 `recordType` 区分，在管理页面可分别筛选。照片、视频在 `media`，通过 `recordId` 关联成绩 / 训练。保留原有目标、恢复、训练计划及批注数据。

| PRD 内容 | 字段 / 规则 |
| --- | --- |
| 出生年月、性别 | `profile.birthDate`：ISO 日期；`sex`：男 / 女 / 其他，未确认留空 |
| 身体记录时间 | `growth.date`：ISO 日期，页面显示年月日 |
| 身高、体重、手宽、手长、脚长 | `height/weight/handWidth/handLength/footLength`：数值，至多一位小数；页面固定显示一位，单位分别 cm / kg |
| 臂长 | `armLength`：独立 cm 数值；原有 `armSpan` 臂展保留，不能未经确认互换 |
| 坐位体前屈 | `growth.sitAndReach`：cm，一位小数；原有体能记录中的同名测量不自动搬移 |
| 测试 / 比赛时间和地点 | `swim.date/location` |
| 测试人员 | `testedBy`；原有记录者 `recordedBy` 保留，两者不自动等同 |
| 测试年龄组 | `testAgeGroup`：测试年份减出生年份；生日未知留空，比赛组别不由年龄代填 |
| 比赛年龄组、代表队伍 | `ageGroup/team`：来源中的原始文字 |
| 比赛场次、组别、道次 | `competitionSession/heat/lane`；道次为正整数 |
| 是否决赛、预赛排名 | `isFinal`：true / false / null；`preliminaryRank` 正整数，非决赛不能填决赛前预赛排名 |
| 泳池距离 | `poolLength`：25m / 50m / 其他 |
| 测试项目 | `testItem`：固定选项，包括抱板打腿等；打腿使用 `stroke=打腿`，与普通自由泳 PB 分开 |
| 测试 / 比赛长度 | `distance`：固定选择 25/50/100/200/400/800/1500m，保留已有的 10/15m 分段选项；新增长度须修改统一选项并验证 |
| 比赛项目名称 | `eventName`：文字，可记录具体赛事及项目名称 |
| 本次 / 上一次 / 第一名成绩 | `time/previousTime/winnerTime`：规范为分:秒:百分秒，例如 `00:56:17`；接受旧秒数和分:秒输入，保存时转换 |
| 测试 / 比赛排名 | `rank`：正整数；未知为 null，不以 0 代替 |
| 与第一名差距 | `gapTime`：已录入本次成绩减第一名成绩，精确至百分秒；并列第一可为 `00:00:00`，缺少来源则留空 |
| 测试 / 比赛照片视频 | `media.recordId` 关联；`swim.mediaIds` 派生关联清单，不向公开摘要增加私人关联字段 |

`00:00:00` 按“分:秒:百分秒”处理，满足现有游泳成绩精度；并非时:分:秒。日期存储保持 ISO 格式，便于排序、校验和浏览器日期控件，页面按 PRD 年月日显示。上一成绩由真实来源录入，不把不同计时 / 出发条件的历史成绩自动合并比较。

## 检查与数据保护

```sh
npm run audit:data
npm run audit:data -- --apply-local --update-release
npm run check
```

默认只读检查当前本地事实库、原始输入、所有 JSON 历史备份、保留的 SQLite 快照、每段影像的原片 / 播放副本 / 封面，以及现有公开发布包。报告和完整整改后的数据只写入已忽略的 `review` 目录。

`--apply-local` 用版本检查和事务写入当前本地事实库；先备份旧版本，再同步逐条逻辑删除台账。重复执行不增加版本，不重复改值。原始录入文件和历史备份保持原字节；不合规范的原值同时保存在记录的 `legacyValues` 中。恢复旧备份时，对已经整改的库继续采用新版格式，遗漏的新记录保留在回收站。

缺失真实信息列入报告待补录，不虚构。只在原始文字明确包含匹配的比赛标题且唯一时关联影像；仅同日期不构成关联依据。来源不明确的成绩分类保留为“未知”。公开包更新要求 ID 白名单、确认信息和故事与既有包完全相同，防止扩大公开范围。

## 云端执行顺序

本次云端连接的自动审批失败：审批额度用完，读取未执行。因此本次本地审计不能证明云端当前数据已符合要求，也未修改现有云端数据或部署后台。本次代码提交到独立分支，不触发 master 的 Pages 自动发布。

额度恢复后，必须读取云端最新的 `nico_read_state` / 管理员完整备份及版本，不能以本地数据或旧导出覆盖可能已有的新录入。对最新导出执行：

```sh
npm run audit:data -- --input review/latest-cloud-backup.json --report review/cloud-prd-audit.json --cloud-sql review/cloud-prd-rectification.sql
```

生成的 SQL 包含私人档案，仅保存在 `review`。复核后通过已授权 Supabase 连接执行；使用既有 `nico_save_state` 的版本检查、自动备份和逻辑删除同步事务。并发更新会拒绝整改，需重新读取，不跳过冲突检查。本次新增结构是现有 JSON 档案 / 台账 `payload` 的字段升级，不新增对匿名账号开放的表或权限。

云端应用新版数据前先部署兼容后台。Edge Function 完整依赖现在包括 `supabase/functions/nico-api/index.ts`、`server/cloud-api.mjs`、`shared/domain.mjs`、`shared/password.mjs`、`shared/deletion.mjs` 和新增 `shared/prd.mjs`。保留已有自定义认证和 `verify_jwt=false`；服务端密钥不进入前端。部署后重新验收管理员写入、旧备份恢复、匿名禁止写入和公开影像白名单，再发布前端。
