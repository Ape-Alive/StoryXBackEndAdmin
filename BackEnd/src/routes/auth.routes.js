const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { ROLES } = require('../constants/roles');

/**
 * 发送终端用户注册验证码验证
 */
const sendUserRegisterCodeValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
];

/**
 * 终端用户注册验证
 */
const registerUserValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6, max: 50 })
        .withMessage('Password must be between 6 and 50 characters'),
    body('verificationCode')
        .notEmpty()
        .withMessage('Verification code is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('Verification code must be 6 digits')
        .isNumeric()
        .withMessage('Verification code must be numeric'),
    body('deviceFingerprint')
        .notEmpty()
        .withMessage('Device fingerprint is required')
        .isLength({ min: 1, max: 255 })
        .withMessage('Device fingerprint must be between 1 and 255 characters')
];

/**
 * 终端用户登录验证（使用邮箱 + 密码 + 设备指纹）
 */
const loginUserValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('deviceFingerprint')
        .notEmpty()
        .withMessage('Device fingerprint is required')
        .isLength({ min: 1, max: 255 })
        .withMessage('Device fingerprint must be between 1 and 255 characters')
];


/**
 * 登录验证（使用邮箱 + 密码 + 图片验证码）
 */
const loginValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('captchaCode')
        .notEmpty()
        .withMessage('Captcha code is required')
        .isLength({ min: 4, max: 4 })
        .withMessage('Captcha code must be 4 characters'),
    body('sessionId')
        .notEmpty()
        .withMessage('Session ID is required')
];

/**
 * 创建管理员验证（仅 super_admin）
 */
const createAdminValidator = [
    body('username')
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6, max: 50 })
        .withMessage('Password must be between 6 and 50 characters'),
    body('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['platform_admin', 'operator', 'risk_control', 'finance', 'read_only'])
        .withMessage('Invalid role. Super admin cannot be created.')
];

/**
 * 修改密码验证
 */
const changePasswordValidator = [
    body('oldPassword')
        .notEmpty()
        .withMessage('Old password is required'),
    body('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters')
];

/**
 * @swagger
 * /api/auth/user/send-register-code:
 *   post:
 *     summary: 发送终端用户注册邮箱验证码
 *     description: |
 *       用于终端用户（C端用户）注册，发送6位数字邮箱验证码到用户邮箱。
 *
 *       **验证码类型**：邮箱验证码（6位数字）
 *       - 通过邮件发送到用户邮箱
 *       - 有效期：10分钟
 *       - 防刷机制：1分钟内不能重复发送
 *       - 用于：终端用户注册验证
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *                 description: 邮箱地址（验证码将发送到此邮箱）
 *     responses:
 *       200:
 *         description: 邮箱验证码发送成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: Verification code sent to email
 *                   data:
 *                     expiresIn: 600
 *       400:
 *         description: 请求参数错误或邮箱已注册
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 发送终端用户注册验证码（无需认证）
router.post(
    '/user/send-register-code',
    sendUserRegisterCodeValidator,
    validate,
    authController.sendUserRegisterCode.bind(authController)
);

/**
 * @swagger
 * /api/auth/user/register:
 *   post:
 *     summary: 终端用户注册（邮箱验证码注册 + 设备指纹）
 *     description: |
 *       注册时创建 User 账号，自动分配基础角色 basic_user（未认证用户）。后续可通过认证流程升级角色。
 *
 *       **验证码类型**：邮箱验证码（6位数字）
 *       - 从用户邮箱中获取（通过 /api/auth/user/send-register-code 发送）
 *       - 格式：6位纯数字（如：123456）
 *       - 有效期：10分钟
 *       - 使用后自动失效
 *
 *       **设备指纹**：桌面端程序需要获取设备指纹并传入
 *       - 用于设备管理和数量限制控制
 *       - 注册时会自动创建设备记录
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - verificationCode
 *               - deviceFingerprint
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *                 description: 邮箱地址
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 50
 *                 example: password123
 *                 description: 密码（6-50个字符）
 *               verificationCode:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 example: '123456'
 *                 description: 6位数字邮箱验证码（从邮箱中获取，通过 /api/auth/user/send-register-code 发送）
 *               deviceFingerprint:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: 'device_fingerprint_hash_12345'
 *                 description: 设备指纹（桌面端程序生成，用于设备管理和数量限制）
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: User registration successful
 *                   data:
 *                     token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       id: clx123456789
 *                       email: user@example.com
 *                       role: basic_user
 *                       status: normal
 *       400:
 *         description: 请求参数错误、验证码错误或设备数量超限
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 终端用户注册（无需认证）
router.post(
    '/user/register',
    registerUserValidator,
    validate,
    authController.registerUser.bind(authController)
);

/**
 * @swagger
 * /api/auth/user/login:
 *   post:
 *     summary: 终端用户登录（使用邮箱 + 密码 + 设备指纹）
 *     description: |
 *       终端用户（C端用户）登录接口，需要邮箱、密码和设备指纹。
 *
 *       **注意**：终端用户登录不需要图形验证码，使用设备指纹进行安全验证。
 *
 *       **设备指纹**：桌面端程序需要获取设备指纹并传入
 *       - 用于设备管理和数量限制控制
 *       - 如果设备已存在，会更新最后使用时间
 *       - 如果设备不存在，会检查用户套餐的设备数量限制
 *       - 超过设备数量限制时会返回错误
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - deviceFingerprint
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *                 description: 用户邮箱地址
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *                 description: 用户密码
 *               deviceFingerprint:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: 'device_fingerprint_hash_12345'
 *                 description: 设备指纹（桌面端程序生成，用于设备管理和数量限制）
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: Login successful
 *                   data:
 *                     token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       id: clx123456789
 *                       email: user@example.com
 *                       phone: null
 *                       role: basic_user
 *                       status: normal
 *       400:
 *         description: 请求参数错误或设备数量超限
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 登录失败（邮箱/密码错误或账号状态异常）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 终端用户登录（无需认证，需要设备指纹，不需要图形验证码）
router.post(
    '/user/login',
    loginUserValidator,
    validate,
    authController.loginUser.bind(authController)
);

/**
 * @swagger
 * /api/auth/captcha:
 *   get:
 *     summary: 获取登录图形验证码
 *     description: |
 *       获取管理员登录所需的图形验证码（SVG图片）。
 *
 *       **验证码类型**：图形验证码（4位字符）
 *       - 格式：SVG图片，Base64编码
 *       - 字符数：4位（字母和数字组合）
 *       - 不区分大小写
 *       - 有效期：5分钟
 *       - 用于：管理员登录验证（防止暴力破解和脚本攻击）
 *     tags: [认证]
 *     responses:
 *       200:
 *         description: 返回图形验证码图片和会话ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Captcha generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                       example: abc123def456ghi789
 *                       description: 验证码会话ID（用于登录时验证）
 *                     imageUrl:
 *                       type: string
 *                       format: data-uri
 *                       example: data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIi4uLg==
 *                       description: Base64编码的SVG图片（可直接在img标签中使用）
 *                     expiresIn:
 *                       type: integer
 *                       example: 300
 *                       description: 验证码有效期（秒）
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 获取管理员登录图形验证码（无需认证）
router.get(
    '/captcha',
    authController.getLoginCaptcha.bind(authController)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 管理员登录（使用邮箱 + 密码 + 图形验证码）
 *     description: |
 *       管理员登录接口，需要邮箱、密码和图形验证码，防止暴力破解和脚本攻击。
 *
 *       **验证码类型**：图形验证码（4位字符）
 *       - 从 /api/auth/captcha 接口获取
 *       - 格式：4位字母和数字组合（如：A3B7）
 *       - 不区分大小写
 *       - 有效期：5分钟
 *       - 使用后自动失效
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - captchaCode
 *               - sessionId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *                 description: 管理员邮箱地址
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *                 description: 管理员密码
 *               captchaCode:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 4
 *                 example: 'A3B7'
 *                 description: 4位图形验证码（从 /api/auth/captcha 获取，不区分大小写）
 *               sessionId:
 *                 type: string
 *                 example: abc123def456ghi789
 *                 description: 验证码会话ID（从 /api/auth/captcha 获取）
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: Login successful
 *                   data:
 *                     token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     admin:
 *                       id: clx123456789
 *                       username: admin
 *                       email: admin@example.com
 *                       role: super_admin
 *       401:
 *         description: 登录失败（邮箱/密码错误或验证码错误）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 管理员登录（无需认证）
router.post(
    '/login',
    loginValidator,
    validate,
    authController.login.bind(authController)
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前管理员信息
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *               example:
 *                 success: true
 *                 message: Admin info retrieved successfully
 *                 data:
 *                   id: clx123456789
 *                   username: admin
 *                   email: admin@example.com
 *                   role: super_admin
 *                   status: active
 *                   lastLogin: '2024-01-01T00:00:00.000Z'
 *                   createdAt: '2024-01-01T00:00:00.000Z'
 *       401:
 *         description: 未认证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 获取当前管理员信息（需要认证）
router.get(
    '/me',
    authenticate,
    authController.getCurrentAdmin.bind(authController)
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: 修改密码
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: oldpassword123
 *                 description: 旧密码
 *               newPassword:
 *                 type: string
 *                 example: newpassword123
 *                 description: 新密码（至少6个字符）
 *     responses:
 *       200:
 *         description: 密码修改成功
 *       401:
 *         description: 旧密码错误
 */
// 修改密码（需要认证）
router.post(
    '/change-password',
    authenticate,
    changePasswordValidator,
    validate,
    authController.changePassword.bind(authController)
);

/**
 * @swagger
 * /api/auth/admin/create:
 *   post:
 *     summary: 创建管理员（仅 super_admin）
 *     description: |
 *       由 super_admin 创建其他管理员账号，不需要邮箱验证码。
 *
 *       **权限要求**：仅 super_admin 可以调用此接口
 *       **角色限制**：不能创建 super_admin 角色
 *       **可用角色**：platform_admin, operator, risk_control, finance, read_only
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 example: admin001
 *                 description: 用户名（3-20个字符，只能包含字母、数字和下划线）
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin001@example.com
 *                 description: 邮箱地址
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 50
 *                 example: password123
 *                 description: 密码（6-50个字符）
 *               role:
 *                 type: string
 *                 enum: [platform_admin, operator, risk_control, finance, read_only]
 *                 example: platform_admin
 *                 description: |
 *                   管理员角色：
 *                   - platform_admin # 平台管理员
 *                   - operator # 运营人员
 *                   - risk_control # 风控人员
 *                   - finance # 财务人员
 *                   - read_only # 只读角色
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *                 example: active
 *                 description: 账号状态（可选，默认为 active）
 *     responses:
 *       201:
 *         description: 管理员创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: Admin created successfully
 *                   data:
 *                     id: clx123456789
 *                     username: admin001
 *                     email: admin001@example.com
 *                     role: platform_admin
 *                     status: active
 *       400:
 *         description: 请求参数错误或角色无效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未授权（非 super_admin）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: 用户名或邮箱已存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 创建管理员（需要 super_admin 权限）
router.post(
    '/admin/create',
    authenticate,
    authorize(ROLES.SUPER_ADMIN),
    createAdminValidator,
    validate,
    authController.createAdmin.bind(authController)
);

/**
 * @swagger
 * /api/auth/admin/import-template:
 *   get:
 *     summary: 获取管理员批量导入 Excel 模板
 *     description: 下载管理员批量导入的 Excel 模板文件，包含示例数据
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 返回 Excel 模板文件
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: 未授权（非 super_admin）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 获取管理员批量导入模板（需要 super_admin 权限）
router.get(
    '/admin/import-template',
    authenticate,
    authorize(ROLES.SUPER_ADMIN),
    authController.getAdminImportTemplate.bind(authController)
);

/**
 * @swagger
 * /api/auth/batch-import-register:
 *   post:
 *     summary: Excel 批量导入注册（返回 JSON）
 *     description: 仅 super_admin 可以使用此功能批量导入管理员
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel 文件（.xlsx 或 .xls），可通过 /api/auth/admin/import-template 获取模板
 *               defaultPassword:
 *                 type: string
 *                 example: default123
 *                 description: 默认密码（可选，如果 Excel 中未提供密码且未设置此参数，将生成随机密码）
 *     responses:
 *       200:
 *         description: 批量导入完成
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *               example:
 *                 success: true
 *                 message: "Import completed. Success: 2, Failed: 1"
 *                 data:
 *                   total: 3
 *                   success: 2
 *                   failed: 1
 *                   results:
 *                     - row: 2
 *                       username: operator001
 *                       email: op001@example.com
 *                       role: operator
 *                       status: success
 *                       message: Registered successfully
 *                       password: randomGeneratedPassword
 *       400:
 *         description: 文件格式错误或验证失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未授权（非 super_admin）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Excel 批量导入注册（需要认证，仅 super_admin 可操作）
router.post(
    '/batch-import-register',
    authenticate,
    authorize(ROLES.SUPER_ADMIN),
    upload.single('file'),
    authController.batchImportRegister.bind(authController)
);

/**
 * @swagger
 * /api/auth/batch-import-register-file:
 *   post:
 *     summary: Excel 批量导入注册（返回 Excel 结果文件）
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel 文件（.xlsx 或 .xls）
 *               defaultPassword:
 *                 type: string
 *                 example: default123
 *                 description: 默认密码（可选）
 *     responses:
 *       200:
 *         description: 返回 Excel 结果文件
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: 文件格式错误或验证失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Excel 批量导入注册（返回 Excel 结果文件，需要认证，仅 super_admin 可操作）
router.post(
    '/batch-import-register-file',
    authenticate,
    authorize(ROLES.SUPER_ADMIN),
    upload.single('file'),
    authController.batchImportRegisterWithFile.bind(authController)
);

module.exports = router;
