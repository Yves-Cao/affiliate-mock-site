# Frozen Prototype

`v0.21.html` 是2026-10-23冻结的交互基线，只用于查看布局和交互习惯。

## 使用规则

1. 不从原型复制业务文案。
2. 不从原型提取接口字段。
3. 不继续修改或升版本此HTML。
4. 页面结构以 `docs/page-specs/` 为准。
5. 接口以 `contracts/openapi-ui.json` 为准。

## Known divergences

| 位置 | 冻结原型表现 | 当前口径 |
| --- | --- | --- |
| 收益与提现、参数配置、结算文案 | 原型未回填Q-007新文案 | 日结、不设最低提现、动态Hold |

## mock-console.html

`mock-console.html`是零依赖契约调试台，用于切换角色/场景、调用OpenAPI接口并执行内存态决策。它不是研发前端技术栈，不作为页面视觉基线；页面实现仍以`docs/page-specs/`为准。
| 佣金文案 | 可能出现旧口径 | 读取页面规范05/16与Mock配置 |
| 风险分 | 原型仅表现结构 | 权重与R0-R4处置映射待评审 |

业务口径以 [docs/confirmed-decisions.md](../docs/confirmed-decisions.md) 为准。
