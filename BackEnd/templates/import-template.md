# Excel 批量导入注册模板说明

## 文件格式

- 支持格式：`.xlsx`, `.xls`
- 文件大小限制：10MB
- 工作表：使用第一个工作表

## Excel 列格式

| 列名 | 说明 | 必填 | 格式要求 |
|------|------|------|----------|
| username | 用户名 | 是 | 3-20个字符，只能包含字母、数字和下划线 |
| email | 邮箱 | 是 | 有效的邮箱格式 |
| role | 角色 | 是 | platform_admin, operator, risk_control, finance, read_only 之一 |
| password | 密码 | 否 | 如果为空，将使用默认密码或生成随机密码 |

## 角色说明

- `platform_admin` - 平台管理员
- `operator` - 运营人员
- `risk_control` - 风控人员
- `finance` - 财务人员
- `read_only` - 只读角色

**注意**：不能批量导入超级管理员（super_admin）角色。

## Excel 示例

```
username          | email              | role           | password
------------------|--------------------|----------------|-------------
operator001       | op001@example.com  | operator       |
operator002       | op002@example.com  | operator       | Pass123456
admin001          | admin001@example.com| platform_admin|
finance001        | finance001@example.com| finance      |
```

## API 使用说明

### 1. JSON 格式返回

**请求**
```bash
POST /api/auth/batch-import-register
Content-Type: multipart/form-data
Authorization: Bearer {token}

file: <Excel文件>
defaultPassword: (可选) 默认密码
```

**响应**
```json
{
  "success": true,
  "message": "Import completed. Success: 2, Failed: 1",
  "data": {
    "total": 3,
    "success": 2,
    "failed": 1,
    "results": [
      {
        "row": 2,
        "username": "operator001",
        "email": "op001@example.com",
        "role": "operator",
        "status": "success",
        "message": "Registered successfully",
        "password": "randomGeneratedPassword"
      },
      {
        "row": 3,
        "username": "operator002",
        "email": "op002@example.com",
        "role": "operator",
        "status": "failed",
        "message": "Email already registered"
      }
    ]
  }
}
```

### 2. Excel 文件格式返回

**请求**
```bash
POST /api/auth/batch-import-register-file
Content-Type: multipart/form-data
Authorization: Bearer {token}

file: <Excel文件>
defaultPassword: (可选) 默认密码
```

**响应**
- Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- 文件下载，包含导入结果详情

## 注意事项

1. 批量导入跳过邮箱验证码验证（因为是管理员操作）
2. 如果未提供密码且未设置默认密码，系统会生成随机密码
3. 成功注册的账号密码会在响应中返回，请妥善保管
4. 如果邮箱或用户名已存在，该行导入将失败，但不影响其他行的导入
5. 所有导入操作都会记录到操作日志中
6. 仅超级管理员和平台管理员可以使用此功能
