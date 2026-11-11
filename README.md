# Affiliate Mock

Affiliate CPA 研发契约与 Mock 服务。评审原型已冻结为 `prototype/v0.21.html`，后续开发以本仓库的页面规范、OpenAPI 契约、Mock 场景和测试为准。

> 仓库定位：内部研发使用。所有 Mock 数据均为虚构，不代表业务参数已定稿；未确认数值集中在配置文件中，不得写死到页面代码。

## 快速开始

要求 Node.js 20+。

```bash
npm install
npm start
```

默认地址：<http://localhost:4000>

浏览器打开默认地址可使用零依赖Mock契约台；它不是新的前端技术栈，也不替代冻结原型。

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/me
curl http://localhost:4000/api/v1/parameters
curl http://localhost:4000/api/v1/commissions
```

## Mock 控制

### 场景

```http
X-Mock-Scenario: dynamic-hold
```

场景按请求生效，不同场景的内存态写入互不影响；未传场景时使用`normal-flow`。

支持场景：

- `normal-flow`
- `no-source`
- `ib-excluded`
- `high-risk`
- `dynamic-hold`
- `chargeback`
- `kyc-pending`
- `empty-state`
- `api-error`

也可以使用查询参数：

```bash
curl "http://localhost:4000/api/v1/commissions?scenario=dynamic-hold"
```

### 角色

```http
X-Mock-Role: operator
```

支持角色：

- `partner`
- `operator`
- `compliance`
- `finance`
- `admin`

权限矩阵见 [docs/rbac.md](docs/rbac.md)。

### 状态化操作与重置

审核、结算、风控操作会修改内存状态，便于演示流程。重启或调用以下接口恢复初始数据：

```bash
curl -X POST http://localhost:4000/__reset
```

## 常用命令

```bash
npm start              # 启动Mock
npm test               # 契约、场景、权限、发布清单与敏感信息检查
npm run check:openapi  # OpenAPI JSON结构检查
npm run check:links    # Markdown本地链接检查
npm run check:release  # release manifest哈希检查
```

## 阅读顺序

1. [START-HERE.md](START-HERE.md)
2. [docs/confirmed-decisions.md](docs/confirmed-decisions.md)
3. [docs/api-conventions.md](docs/api-conventions.md)
4. [contracts/openapi-ui.json](contracts/openapi-ui.json)
5. [docs/page-specs/00-使用说明.md](docs/page-specs/00-使用说明.md)
6. [traceability.json](traceability.json)

## 当前P0范围

| 端 | 页面 | 页面id | 契约来源 |
| --- | --- | --- | --- |
| 客户端 | 仪表盘 | `dash` | 01 |
| 客户端 | 业绩数据 | `perf` | 02 |
| 客户端 | 客户列表 | `clients` | 03 |
| 客户端 | 推广链接与活动 | `promo` | 04 |
| 客户端 | 收益与提现 | `pay` | 05 |
| 客户端 | 客户归属查询 | `lookup` | 06 |
| 客户端 | 入驻申请 | `apply` | 20 |
| 运营管理端 | 合作者列表 | `plist` | 07 |
| 运营管理端 | 合作者审核 | `paudit` | 08 |
| 运营管理端 | 结算审批 | `settle` | 09 |
| 运营管理端 | 风控事件处置 | `risk` | 11 |

## 重要边界

- 本仓库不包含竞品资料、授权截图、内部接口全量存档、WorkBuddy过程记录或真实客户数据。
- 冻结原型中未回填 Q-007 新文案；业务口径以 `docs/confirmed-decisions.md`、页面规范05/16和Mock配置为准。
- OpenAPI仍是设计稿，联调前须与后端确认路径、鉴权和最终字段。
