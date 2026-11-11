# API Conventions

版本：v0.1草案。OpenAPI与实现冲突时，以OpenAPI评审结论为准；未评审前不得自行扩展语义。

## 基础约定

| 项 | 约定 |
| --- | --- |
| API前缀 | `/api/v1` |
| 数据格式 | JSON，UTF-8 |
| 时间 | ISO 8601，UTC，例如`2026-10-23T08:30:00Z` |
| 日期 | `YYYY-MM-DD` |
| 金额 | 字符串保留两位小数，示例`"120.00"`；币种默认`USD` |
| 数量与分数 | number |
| ID | 字符串，带业务前缀，例如`P-001`、`C-001`、`st-001` |
| 枚举 | 小写中划线，例如`holding`、`frozen-manual-review` |

## 分页

列表接口统一支持：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `page` | integer >= 1 | 默认1 |
| `pageSize` | integer 1-100 | 默认10 |
| `sort` | string | 字段名，前面加`-`表示倒序 |

响应：

```json
{
  "data": [],
  "page": {
    "page": 1,
    "pageSize": 10,
    "total": 1
  }
}
```

## 成功响应

单对象：

```json
{
  "data": {}
}
```

列表：

```json
{
  "data": [],
  "page": {}
}
```

## 错误响应

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Current role cannot access this resource.",
    "details": [],
    "traceId": "mock-trace-001"
  }
}
```

常用错误码：`BAD_REQUEST`、`UNAUTHORIZED`、`FORBIDDEN`、`NOT_FOUND`、`CONFLICT`、`UNPROCESSABLE`、`SERVICE_UNAVAILABLE`。

## 幂等

写操作支持请求头：

```http
Idempotency-Key: random-string
```

Mock按“接口 + 角色 + 场景 + Key”记录并回放相同结果，不做持久化。真实接口的幂等保留时长由后端评审确定。

## Mock控制

| Header | 说明 |
| --- | --- |
| `X-Mock-Scenario` | 按请求选择场景；未传时使用`normal-flow` |
| `X-Mock-Role` | 覆盖默认角色 |

查询参数`scenario`优先级低于请求头，仅用于浏览器调试。
