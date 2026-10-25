# V1.7.1 服务端收口与验收（2026-10-25）

## 最新基线及差距

master d3f610b，前端V1.7.0；开始时实际API1.5.2/Edge17/728cc446…，15迁移。旧分支实现两字段裁决，缺人工理由、不可注入历史、owner专用写入与前端能力预检，本次逐项复用含义并补齐，未整分支覆盖最新master。

生产只读revision22/校验344b33243eb2e0094c643b6876c370e7、23台账、14备份、8成绩/6目标/3影像、9对象94,317,512字节；训练/测评仍0。私有备份与旧函数完整源码已保存忽略review/V171_*（0600），无正式模拟记录写入。

## 受影响文件和实现

- shared/score-decisions.mjs：复用conditionsKeptUnknownAt/By，加入人工理由和不可直接填写的裁决历史；服务端actor/时间/当时条件快照。撤销、条件变化失效、旧恢复保留新审计，拒绝矛盾历史。
- shared/domain.mjs：恢复与读取校验，通用PUT拒绝裁决系统字段；核心performance计算和公开投影不改。
- server/cloud-api.mjs、server/server.js：owner专用POST /api/swim/:id/conditions-decision，稳定请求/同负载重试、CAS、删除后不复活；/api/version显式能力。无新表、SQL迁移或额外公开字段。
- src/services/api-capabilities.js、useApiCapabilities.js、components/ScoreDecision.jsx、Records.jsx：实际API未确认不开放表单，旧API无可预见失败填写；人工理由、身份草稿、错误/冲突保留、撤销和历史查询。
- scripts/release-info.mjs版本1.7.1；新增模型、双后端和能力测试；原版本响应断言增加能力合同，儿童接口拒绝测试扩展。修正旧加密反例测试偶尔未改变密文字节的样本错误，无加密产品行为变化。

## 软件结果

完整 `NICO_TEST_PROTOCOL_ONLY=true npm run check`：225/225测试、lint、typecheck、build和65文件白名单通过。覆盖人工理由/白名单/注入、有效性不变、条件变化、保留/撤销、重试/请求冲突、CAS、旧恢复、匿名/教练/儿童、旧API能力及查询失败。浏览器仅5294内存协议服务与合成素材：实际能力确认→家长填写裁决依据→保存→模拟503输入保留→恢复连接同请求重试撤销→两条历史可见，原成绩60.000秒和未核验状态不变。独立审查两项恢复边界已补RED→GREEN回归：遗漏的已裁决成绩保留到私有回收记录；已有记录拒绝备份追加未核实审计。生产回执完成后补记，不作真人成功声明。

## 风险、人工待验与回滚

裁决不是核验有效，也不补全未知条件；历史不会自动公开。旧API默认无能力；混用旧前端的裁决PUT仍被拒绝，普通编辑兼容。新的审计写入后应隐藏前端入口或向前修复，保留兼容后端，不能用旧函数或旧备份抹掉新历史。

真人45秒、真实手机/平板、真实视频、PDF/ZIP大文件和读屏均待验，按[私人模板](manual-acceptance-template.md)执行。本阶段不配置外部备份或通知。

## 生产发布

已发布源码8909062。连接Supabase实际部署Edge18 ACTIVE/API1.7.1，25文件逐字节回读一致；实际指纹ef38b3dd7e358f48038b99f3e51acbd2a5469c77407da4d9721bb78d8c8616e8，版本接口显式能力true。

[Pages40161755634](https://github.com/baokaijian/Nico/actions/runs/40161755634)及[函数40161755584](https://github.com/baokaijian/Nico/actions/runs/40161755584)均success；后端工作流无CLI凭据时通过实际匹配指纹核对，本次实际部署依据是连接器Edge18回执与源码回读，不能把跳过CLI称为部署。89项访客权限通过；6表RLS且anon/authenticated无直接权限，Nico RPC同样拒绝这两个角色，存储桶private。

部署前后正式revision22、校验344b33243eb2e0094c643b6876c370e7、台账23、备份14、9对象94,317,512字节一致；15迁移不变，本阶段无新DDL。旧分支仍保留备查，其两字段raw PUT方案被本次更严格专用接口取代，未重复合并旧UI或核心计算。真人业务裁决未代家长执行。
