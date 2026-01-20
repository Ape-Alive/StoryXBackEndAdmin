const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * 邮件服务
 */
class EmailService {
  constructor() {
    // 初始化邮件传输器
    // 注意：生产环境需要配置真实的 SMTP 服务器
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'your-email@example.com',
        pass: process.env.SMTP_PASS || 'your-password'
      }
    });

    // 开发环境可以使用测试账户
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
      logger.warn('Using development email configuration. Set SMTP_* environment variables for production.');
    }
  }

  /**
   * 发送邮件
   */
  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // 如果没有纯文本版本，从 HTML 中提取
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { to, subject, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email', { to, subject, error: error.message });
      throw error;
    }
  }

  /**
   * 发送验证码邮件
   */
  async sendVerificationCode(email, code, type = 'register') {
    const subjectMap = {
      register: '注册验证码',
      reset_password: '重置密码验证码',
      change_email: '更换邮箱验证码'
    };

    const subject = subjectMap[type] || '验证码';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            color: #007bff;
            text-align: center;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 5px;
            margin: 20px 0;
            letter-spacing: 8px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #999;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>${subject}</h2>
          <p>您的验证码是：</p>
          <div class="code">${code}</div>
          <p>验证码有效期为 10 分钟，请勿泄露给他人。</p>
          <p>如果这不是您的操作，请忽略此邮件。</p>
          <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }
}

// 单例模式
module.exports = new EmailService();
