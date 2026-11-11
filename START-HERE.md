# 研发起步

## 10分钟路径

1. 读 [confirmed decisions](docs/confirmed-decisions.md)：先分清已确认、结构确认、数值待评审。
2. 读 [API conventions](docs/api-conventions.md)：分页、时间、金额、错误响应和幂等规则。
3. 读 [RBAC](docs/rbac.md)：确认页面和接口角色。
4. 打开 [OpenAPI](contracts/openapi-ui.json) 或启动服务查看响应。
5. 按 [traceability.json](traceability.json) 找到自己页面对应的业务口径、接口和场景。

## 第一条开发链路

```text
GET /me
  -> GET /partners
  -> GET /partner-audits
  -> POST /partner-audits/pa-001/decision
  -> GET /settlements
  -> POST /settlements/st-001/decision
```

使用角色：

```http
X-Mock-Role: operator
```

使用场景：

```http
X-Mock-Scenario: dynamic-hold
```

## 当前必须覆盖的场景

- `normal-flow`
- `dynamic-hold`
- `chargeback`
- `empty-state`
- `api-error`
- 无权限访问

## 不要做的事

- 不要从冻结原型复制业务文案。
- 不要把 Mock 金额、天数、比例写成正式业务参数。
- 不要直接修改生成文件里的口径说明；先提 Issue 或 PR 说明来源。
- 不要提交真实账号、客户编号、截图、密钥或内部系统地址。
