const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Excel 工具类
 */
class ExcelUtils {
  /**
   * 读取 Excel 文件
   * @param {string} filePath - Excel 文件路径
   * @param {number} sheetIndex - 工作表索引（默认第一个）
   * @returns {Array} 解析后的数据数组
   */
  static readExcel(filePath, sheetIndex = 0) {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      // 读取 Excel 文件
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        throw new Error('Excel file has no sheets');
      }

      // 获取指定的工作表
      const sheetName = sheetNames[sheetIndex];
      const worksheet = workbook.Sheets[sheetName];

      // 转换为 JSON 数组
      const data = XLSX.utils.sheet_to_json(worksheet, {
        defval: '', // 空单元格的默认值
        raw: false // 将日期转换为字符串
      });

      return data;
    } catch (error) {
      throw new Error(`Failed to read Excel file: ${error.message}`);
    }
  }

  /**
   * 验证 Excel 数据格式
   * @param {Array} data - Excel 数据数组
   * @param {Array} requiredFields - 必需字段列表
   * @returns {Object} { valid: boolean, errors: Array }
   */
  static validateExcelData(data, requiredFields = ['username', 'email', 'role']) {
    const errors = [];

    if (!Array.isArray(data) || data.length === 0) {
      return {
        valid: false,
        errors: ['Excel file is empty or invalid format']
      };
    }

    // 检查必需的列是否存在
    const firstRow = data[0];
    const missingFields = requiredFields.filter(field => !(field in firstRow));

    if (missingFields.length > 0) {
      return {
        valid: false,
        errors: [`Missing required columns: ${missingFields.join(', ')}`]
      };
    }

    // 验证每一行数据
    data.forEach((row, index) => {
      const rowNum = index + 2; // Excel 行号（第一行是标题）
      const rowErrors = [];

      // 检查必需字段
      requiredFields.forEach(field => {
        if (!row[field] || String(row[field]).trim() === '') {
          rowErrors.push(`Row ${rowNum}: ${field} is required`);
        }
      });

      // 验证邮箱格式
      if (row.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(row.email).trim())) {
          rowErrors.push(`Row ${rowNum}: Invalid email format`);
        }
      }

      // 验证角色
      const validRoles = ['platform_admin', 'operator', 'risk_control', 'finance', 'read_only'];
      if (row.role && !validRoles.includes(String(row.role).trim())) {
        rowErrors.push(`Row ${rowNum}: Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // 验证用户名格式
      if (row.username) {
        const username = String(row.username).trim();
        if (username.length < 3 || username.length > 20) {
          rowErrors.push(`Row ${rowNum}: Username must be between 3 and 20 characters`);
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          rowErrors.push(`Row ${rowNum}: Username can only contain letters, numbers, and underscores`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 删除临时文件
   * @param {string} filePath - 文件路径
   */
  static deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  /**
   * 生成导入结果 Excel 文件
   * @param {Array} results - 导入结果数组
   * @returns {Buffer} Excel 文件 Buffer
   */
  static generateResultExcel(results) {
    const data = results.map((result, index) => ({
      'Row': index + 2,
      'Username': result.username || '',
      'Email': result.email || '',
      'Role': result.role || '',
      'Status': result.status || '',
      'Message': result.message || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Results');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * 生成管理员批量导入模板 Excel 文件
   * @returns {Buffer} Excel 文件 Buffer
   */
  static generateAdminImportTemplate() {
    // 模板数据（包含标题行和示例数据）
    const templateData = [
      {
        'username': 'operator001',
        'email': 'operator001@example.com',
        'role': 'operator',
        'password': ''
      },
      {
        'username': 'platform_admin001',
        'email': 'admin001@example.com',
        'role': 'platform_admin',
        'password': ''
      },
      {
        'username': 'risk_control001',
        'email': 'risk001@example.com',
        'role': 'risk_control',
        'password': ''
      },
      {
        'username': 'finance001',
        'email': 'finance001@example.com',
        'role': 'finance',
        'password': ''
      },
      {
        'username': 'read_only001',
        'email': 'readonly001@example.com',
        'role': 'read_only',
        'password': ''
      }
    ];

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 20 }, // username
      { wch: 30 }, // email
      { wch: 20 }, // role
      { wch: 20 }  // password
    ];

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '管理员导入模板');

    // 生成 Excel Buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = ExcelUtils;
