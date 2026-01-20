const authService = require('../services/auth.service');
const userAuthService = require('../services/userAuth.service');
const verificationService = require('../services/verification.service');
const ExcelUtils = require('../utils/excel');
const ResponseHandler = require('../utils/response');
const path = require('path');

/**
 * 认证控制器
 */
class AuthController {
  /**
   * 发送终端用户注册验证码
   */
  async sendUserRegisterCode(req, res, next) {
    try {
      const { email } = req.body;
      const result = await userAuthService.sendRegisterCode(email);
      return ResponseHandler.success(res, result, 'Verification code sent successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 终端用户注册（邮箱验证码注册 + 设备指纹）
   * 注册时创建 User 账号，分配基础角色 basic_user（未认证用户）
   */
  async registerUser(req, res, next) {
    try {
      const data = req.body;
      // 从请求头获取 IP 地址
      data.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const result = await userAuthService.register(data);
      return ResponseHandler.success(res, result, 'User registration successful', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 终端用户登录（使用邮箱 + 密码 + 设备指纹）
   * 不需要图形验证码
   */
  async loginUser(req, res, next) {
    try {
      const { email, password, deviceFingerprint } = req.body;
      // 从请求头获取 IP 地址
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const result = await userAuthService.login(email, password, deviceFingerprint, ipAddress);
      return ResponseHandler.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取登录验证码
   */
  async getLoginCaptcha(req, res, next) {
    try {
      const captchaService = require('../services/captcha.service');
      const result = await captchaService.generateLoginCaptcha();
      return ResponseHandler.success(res, result, 'Captcha generated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 管理员登录（使用邮箱 + 密码 + 图片验证码）
   */
  async login(req, res, next) {
    try {
      const { email, password, captchaCode, sessionId } = req.body;
      const result = await authService.login(email, password, captchaCode, sessionId);
      return ResponseHandler.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建管理员（仅 super_admin）
   */
  async createAdmin(req, res, next) {
    try {
      const data = req.body;
      const creatorId = req.user.id; // 从 token 中获取创建者ID
      const result = await authService.createAdmin(data, creatorId);
      return ResponseHandler.success(res, result, 'Admin created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取当前管理员信息
   */
  async getCurrentAdmin(req, res, next) {
    try {
      const admin = await authService.getCurrentAdmin(req.user.id);
      return ResponseHandler.success(res, admin, 'Admin info retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      await authService.changePassword(req.user.id, oldPassword, newPassword);
      return ResponseHandler.success(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Excel 批量导入注册
   */
  async batchImportRegister(req, res, next) {
    let filePath = null;

    try {
      // 检查是否有上传的文件
      if (!req.file) {
        return ResponseHandler.error(res, 'No file uploaded', 400);
      }

      filePath = req.file.path;
      const { defaultPassword } = req.body;

      // 读取 Excel 文件
      const excelData = ExcelUtils.readExcel(filePath);

      // 验证数据格式
      const validation = ExcelUtils.validateExcelData(excelData, ['username', 'email', 'role']);
      if (!validation.valid) {
        ExcelUtils.deleteFile(filePath);
        return ResponseHandler.error(res, 'Excel validation failed', 400, validation.errors);
      }

      // 批量注册
      const results = await authService.batchRegister(
        excelData,
        defaultPassword,
        req.user?.id,
        req.ip
      );

      // 统计结果
      const successCount = results.filter(r => r.status === 'success').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      // 删除临时文件
      ExcelUtils.deleteFile(filePath);

      // 返回结果
      return ResponseHandler.success(res, {
        total: results.length,
        success: successCount,
        failed: failedCount,
        results: results.map(r => ({
          row: r.row,
          username: r.username,
          email: r.email,
          role: r.role,
          status: r.status,
          message: r.message,
          // 成功时返回密码，失败时不返回
          password: r.status === 'success' ? r.password : undefined
        }))
      }, `Import completed. Success: ${successCount}, Failed: ${failedCount}`);

    } catch (error) {
      // 清理临时文件
      if (filePath) {
        ExcelUtils.deleteFile(filePath);
      }
      next(error);
    }
  }

  /**
   * 获取管理员批量导入 Excel 模板
   */
  async getAdminImportTemplate(req, res, next) {
    try {
      const templateBuffer = ExcelUtils.generateAdminImportTemplate();

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=admin-import-template-${Date.now()}.xlsx`);

      // 发送文件
      res.send(templateBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Excel 批量导入注册（返回 Excel 结果文件）
   */
  async batchImportRegisterWithFile(req, res, next) {
    let filePath = null;

    try {
      // 检查是否有上传的文件
      if (!req.file) {
        return ResponseHandler.error(res, 'No file uploaded', 400);
      }

      filePath = req.file.path;
      const { defaultPassword } = req.body;

      // 读取 Excel 文件
      const excelData = ExcelUtils.readExcel(filePath);

      // 验证数据格式
      const validation = ExcelUtils.validateExcelData(excelData, ['username', 'email', 'role']);
      if (!validation.valid) {
        ExcelUtils.deleteFile(filePath);
        return ResponseHandler.error(res, 'Excel validation failed', 400, validation.errors);
      }

      // 批量注册
      const results = await authService.batchRegister(
        excelData,
        defaultPassword,
        req.user?.id,
        req.ip
      );

      // 生成结果 Excel 文件
      const resultBuffer = ExcelUtils.generateResultExcel(results);

      // 删除临时文件
      ExcelUtils.deleteFile(filePath);

      // 返回 Excel 文件
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=import-results-${Date.now()}.xlsx`);
      res.send(resultBuffer);

    } catch (error) {
      // 清理临时文件
      if (filePath) {
        ExcelUtils.deleteFile(filePath);
      }
      next(error);
    }
  }
}

module.exports = new AuthController();
