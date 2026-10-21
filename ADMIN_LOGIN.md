# 管理员登录与公网数据管理

入口保持 https://baokaijian.github.io/Nico/ 。GitHub Pages提供网页，Supabase项目`oeyirzlgqixvcxofimit`提供经过账号验证的接口、事务数据库与私有素材存储。

记录、AI训练方案与数据分析报告默认可直接查看，登录不是查看内容的前提。管理员账号为`admin`，临时密码只保存在本机`data/admin-login-initial.txt`，首次登录必须设置自己的新密码，完成后才能录入、修改、导出或恢复记录。

未登录时同样显示今日、本周、打卡、记录、复盘、档案，只是不能提交。登录后可以维护实际成绩、训练、体能、恢复、个人档案、周计划与录像批注；新记录保存后即进入事实库，不需要把完整私有数据库提交到GitHub。

## 权限和保存

- 密码使用随机盐与PBKDF2-SHA256（600000次）派生，后台存放哈希。
- 云端会话最长1小时，随机会话凭据只保存在当前页面内存。刷新/重新打开页面需重新登录；退出立即撤销后台会话，不依赖跨站Cookie。
- 本机独立维护服务使用HttpOnly、SameSite=Strict会话Cookie及CSRF验证，首次设置需要仅保存在本机的初始化码；未登录只可查看公开摘要及授权影像；完整档案、原片、录入、修改、导出与恢复均需会话。
- Nico表开启RLS并撤销anon/authenticated直接权限；仅后台服务访问。账号、会话、完整档案和备份不进入公开构建。
- 写入使用记录版本和数据库事务；冲突返回409并保留输入，每次成功写入前备份旧版本。退出或过期后，不再接收旧会话迟到响应。
- Storage桶`nico-private`不公开。匿名素材接口每次核对公开白名单；原片、未选择素材只有登录后可读。
- 登录尝试有限流，错误不透露账号是否存在；首次更换密码会撤销旧会话。

## 真实数据与迁移

迁移源为现有`data/nico.sqlite`，保留4条成绩、3段影像及全部原始档案字段，不增加训练日志、确认课表或录像批注。原片、兼容副本及封面共9个关联文件按原字节复制到私有桶；本机原档案和素材保持不变。

新版接入云端后，以云端记录为网页当前数据来源。本机SQLite保留迁移前版本，不自动双向同步。云端完整备份可在档案页下载；本机备份按私有资料保管。

云端上传支持50MB以内的PNG/JPEG/WebP与MP4/MOV/WebM。Edge Function不运行FFmpeg，新上传视频会明确显示“已保存原片，兼容副本待处理”，不冒充已转码；现有3段视频的兼容副本和封面已迁移。未兼容的格式通过播放器错误提示反馈。

## 运行与部署

`VITE_API_URL=https://oeyirzlgqixvcxofimit.supabase.co/functions/v1/nico-api`是公开接口地址，不是密钥。已在本机`.env.local`和Pages流水线配置。使用`npm run client`可在本机访问同一云端后台；不要把`SUPABASE_SERVICE_ROLE_KEY`放入任何Vite变量。

初始数据库结构见`backend/nico-schema.sql`，随后执行逻辑删除升级`backend/nico-soft-delete.sql`，云端入口见`supabase/functions/nico-api/index.ts`，业务权限和校验见`server/cloud-api.mjs`。

Pages 工作流只发布前端程序，云 API 独立部署。配置仓库 secret `SUPABASE_ACCESS_TOKEN` 后，`.github/workflows/deploy-function.yml` 先检查代码再部署 `nico-api` 并运行访客权限检查；未配置时需用已连接 Supabase 工具单独部署。两者都要核对版本和结果。旧的 `NICO_REQUIRE_LOGIN_FOR_READ` 开关不再改变权限：完整档案始终需登录，公开白名单始终免登录。函数关闭平台 JWT 前置检查以支持公开摘要和自定义账号登录；函数内部校验数据库中可撤销且有有效期的管理员会话。没有匿名维护或访客注册接口。

RLS无公开策略为有意配置：Nico匿名/普通Supabase账号都不应直接访问完整表。[Supabase相关审查说明](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)。项目原有学习应用的表和策略没有修改。

参考：[GitHub Pages静态托管说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[Supabase函数认证](https://supabase.com/docs/guides/functions/auth)、[私有Storage访问规则](https://supabase.com/docs/guides/storage/serving/downloads)。

## 逻辑删除与数据保留

云端新增`nico_records`逐条业务记录表，覆盖成长、成绩、训练、体能、恢复、目标、计划、批注和影像。每条保留原始`payload`与版本，并增加`is_deleted`（默认false）、`deleted_at`、`deleted_by`。整份档案、历史备份和账号表也增加相同字段。账号删除后不能再登录，已有会话校验也会拒绝。

删除记录后，活跃列表与公开展示隐藏该记录，回收站仍保留内容、原ID、删除时间和管理员；恢复时原ID和内容返回，删除标志复位。恢复旧备份不会清空已有回收站；备份遗漏的较新记录自动进入回收站。公开白名单仍独立生效，不会自动公开新记录。

数据库触发器在同一事务内同步整份档案和逐条记录，版本冲突或失败一并回滚。读取也会在同一数据库语句中核对删除标记；直接在数据库标记删除的记录会从正常列表和公开内容中隐藏，并进入可恢复视图。业务表与备份禁止DELETE/TRUNCATE，后台角色也撤销这两项权限。会话与登录限流属于临时认证数据，仍按过期规则清理。影像删除保留私有存储原文件，没有业务素材永久删除接口。管理员数据库拥有者仍可显式修改保护机制；本方案不能替代独立异地备份。

本机SQLite增加`state`逻辑删除列及`records`逐条记录表，在写入事务中同步；禁止直接DELETE业务行。旧表无损升级，不改变业务内容或档案版本。原始录入文件保留，数据目录与迁移前SQLite备份均不提交公开仓库。
