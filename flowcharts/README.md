# 流程图 v2 / Flow Diagrams v2

Version: v1.0; Date: 2026-11-16; Status: Draft for review; production contracts and parameters remain pending
Source: [Core PRD](../../PRD_EN/01-CORE-PRD.md), [Architecture Boundary Change](../../PRD_EN/status/architecture-boundary-change-2026-11-16.md), [Delivery Status](../../PRD_EN/status/DELIVERY-STATUS.md)

> **English Summary**
>
> This folder contains 20 bilingual business flow diagrams in six grouped documents. Each diagram keeps Chinese and English in the same graph. Each group has a Markdown source, an offline HTML viewer, and a multi-page Drawio XML file. The diagrams describe confirmed target boundaries and pending limits; they do not prove production implementation.
>
> **中文摘要**
>
> 本文件夹包含 20 张双语业务流程图，按六份分组文档组织。每张图的中英文在同一图形内展示。每组都有 Markdown 源稿、离线 HTML 查看页和多页 Drawio XML。图示表达已确认目标边界和当前限制，不证明生产已实现。

## Six Groups / 六个分组

| Group | Source | Diagrams |
| --- | --- | --- |
| 01 | [业务全景与角色](01-业务全景与角色.md) | 1 全业务主链路；2 角色泳道 |
| 02 | [合作伙伴与身份](02-合作伙伴与身份.md) | 3 入驻；4 灰度首链；5 状态与终止；6 IB/CPA 转换 |
| 03 | [推广点击与归因](03-推广点击与归因.md) | 7 路径素材链接；8 点击注册归因；9 Web/App 差异；10 归因异常 |
| 04 | [资格佣金与风险](04-资格佣金与风险.md) | 11 资格佣金；12 佣金更正；13 风险处置；14 风险传播 |
| 05 | [资金结算与支付](05-资金结算与支付.md) | 15 结算保证金；16 提现支付；17 冲正债务；18 对账差异 |
| 06 | [系统边界与配置](06-系统边界与配置.md) | 19 系统数据流；20 配置发布回退 |

## Generated Files / 生成文件

Open [00.html](00.html) for the offline HTML index. Every HTML page uses the same global left menu: all bilingual parent groups and all 20 bilingual child-diagram links remain visible. Each page also has a fixed-size stage, fixed 1:1 SVG scaling, scrolling inside the stage, and a fullscreen button for each diagram. Every group also has a matching `*-Drawio.xml` file containing one editable Drawio page per diagram.

打开 [00.html](00.html) 查看离线 HTML 总索引。每个 HTML 页面都使用同一套全局左侧菜单：所有双语母菜单和 20 个双语子图链接同时常驻显示。每个页面也有统一尺寸画布、固定 1:1 SVG 缩放、画布内滚动和每图全屏按钮。每个分组还有对应的 `*-Drawio.xml`，每个流程图一页，可继续编辑。

## Boundaries / 边界

1. Diagrams do not create requirements, production parameters, API schemas, or database contracts.
2. A passing Mock check does not upgrade backend, integration, or business acceptance status.
3. The target payment boundary is CPA submitting withdrawal requests directly to the existing payment system; CRM does not execute payout.
4. Implementation authority remains in `docs/PRD_EN/`.

## Reading Rule / 阅读规则

Read group 01 first, then choose a group by business question. A diagram is a communication layer, not a substitute for the English PRD.

先读 01 建立全局语境，再按业务问题选择分组。流程图是沟通层，不能替代英文 PRD。
