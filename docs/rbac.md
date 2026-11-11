# Mock Role and Permission Matrix

状态：草案，用于前端路由和接口权限开发；真实组织权限待业务确认。

## 角色

| Role | 定位 |
| --- | --- |
| `partner` | 已通过审核的Affiliate合作方 |
| `operator` | 运营人员 |
| `compliance` | 合规复核 |
| `finance` | 财务复核 |
| `admin` | 内部管理员，仅用于演示，不代表上线权限 |

默认角色为`operator`，便于开发运营端页面。开发客户端页面时显式传`X-Mock-Role: partner`。

## 权限

|能力 | partner | operator | compliance | finance | admin |
| --- | ---: | ---: | ---: | ---: | ---: |
| 查看当前用户 `/me` | Yes | Yes | Yes | Yes | Yes |
| 查看客户列表 | Yes | Yes | Yes | No | Yes |
| 查看合作者列表 | No | Yes | Yes | Yes | Yes |
| 合作者审核 | No | Yes | Yes | No | Yes |
| 结算审批 | No | Yes | No | Yes | Yes |
| 风控处置 | No | Yes | Yes | No | Yes |
| 重置Mock | Yes | Yes | Yes | Yes | Yes |

## 403测试

```bash
curl -i -H 'X-Mock-Role: partner' \
  http://localhost:4000/api/v1/partners
```

期望返回：

```json
{
  "error": {
    "code": "FORBIDDEN"
  }
}
```
