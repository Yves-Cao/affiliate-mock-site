# 已确认业务口径摘要

更新日期：2026-10-23。来源：Affiliate项目《待决事项》与当前主档；本文件是研发摘要，完整过程和被替代口径以Affiliate主档为准。

## 状态说明

| 状态 | 含义 |
| --- | --- |
| `confirmed` | 用户已确认，研发可按结构实现 |
| `structural` | 机制方向已确认，具体数值待评审 |
| `pending` | 尚未确认，不得默认实现 |
| `mock-only` | 仅用于演示或测试，不是业务决定 |

## 研发必须遵守的口径

| 编号 | 口径 | 状态 | Mock落点 |
| --- | --- | --- | --- |
| Q-008 | 归因采用首次点击优先；30天内注册有效；注册时锁定不改；无来源不默认归因 | confirmed | `no-source`场景 |
| CFD-D-009 | IB与Affiliate身份和客户归属双向隔离 | confirmed | `ib-excluded`场景 |
| CFD-D-013 | 有效FTD=CRM成功FTD事实×Affiliate合规校验通过 | confirmed | `normal-flow`客户资格状态 |
| CFD-D-014 | 用户只能归属IB推荐或Affiliate推荐之一，以首触为准 | confirmed | `no-source`、归属查询 |
| CFD-D-015 | 真实交易计入“有过交易”，模拟盘不计 | confirmed |客户交易状态 |
| Q-007 | 质量条件为入金+真实交易组合；具体门槛待评审 | structural | `parameters.json` |
| Q-007 | 佣金日结，不设最低提现限制 | confirmed | `settlement-rules.json` |
| Q-007 | 动态Hold：初始1天，按账户风险分递增，超过30天转冻结并人工审核 | confirmed；递增映射待评审 | `dynamic-hold`场景 |
| Q-007 | 拒付/退款全额冲正，不足挂负 | confirmed | `chargeback`场景 |
| Q-014 | 不允许自荐及亲属推广 | confirmed | 准入检查 |
| Q-014 | 多级CPA分佣暂不讨论 | confirmed | 不建模下级分佣 |

## 重要待评审项

| 项目 | 当前处理 |
| --- | --- |
| 入金与交易具体门槛 | `parameters.json`中标记`pending`，页面显示配置值 |
| 达标期限具体天数 | `parameters.json`中标记`pending` |
| CPA国家档价 | 不提供真实价格，仅提供`mock-only`档位结构 |
| 风险事件权重与R0-R4动作映射 | `risk-bands.json`仅保留分数带结构 |
| 动态Hold递增映射 | Mock使用显式`mock-only`映射 |
| 接口鉴权与回传架构 | OpenAPI安全定义待技术评审 |

## 原型差异提醒

冻结原型v0.21仍包含部分旧结算文案。研发不得从原型HTML反推Q-007口径；收益提现、参数配置和佣金相关逻辑以本文件、页面规范05/16和Mock契约为准。
