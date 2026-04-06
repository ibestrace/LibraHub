// 表单验证工具 - 提供可复用的验证函数和验证器组合
// 支持同步和异步验证，错误信息本地化

// 验证结果类型
export interface ValidationResult {
  valid: boolean;
  error: string;
}

// 验证器函数类型
export type Validator = (value: any) => ValidationResult;

// 异步验证器函数类型
export type AsyncValidator = (value: any) => Promise<ValidationResult>;

// 验证规则配置
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  isbn?: boolean;
  custom?: (value: any) => boolean;
  message?: string;
}

// 字段验证配置
export type FieldValidationConfig = Record<string, ValidationRule>;

// 验证错误对象
export type ValidationErrors = Record<string, string>;

/**
 * 创建验证结果
 */
function createResult(valid: boolean, error: string = ''): ValidationResult {
  return { valid, error };
}

/**
 * 必填验证
 * @param message 自定义错误消息
 */
export const required = (message: string = '此项为必填项'): Validator => {
  return (value: any) => {
    if (value === undefined || value === null || value === '') {
      return createResult(false, message);
    }
    if (Array.isArray(value) && value.length === 0) {
      return createResult(false, message);
    }
    return createResult(true);
  };
};

/**
 * 最小长度验证
 * @param min 最小长度
 * @param message 自定义错误消息
 */
export const minLength = (min: number, message?: string): Validator => {
  return (value: any) => {
    if (typeof value !== 'string') {
      return createResult(false, message || `长度至少为 ${min} 个字符`);
    }
    if (value.length < min) {
      return createResult(false, message || `长度至少为 ${min} 个字符`);
    }
    return createResult(true);
  };
};

/**
 * 最大长度验证
 * @param max 最大长度
 * @param message 自定义错误消息
 */
export const maxLength = (max: number, message?: string): Validator => {
  return (value: any) => {
    if (typeof value !== 'string') {
      return createResult(true);
    }
    if (value.length > max) {
      return createResult(false, message || `长度不能超过 ${max} 个字符`);
    }
    return createResult(true);
  };
};

/**
 * 最小值验证（用于数字）
 * @param min 最小值
 * @param message 自定义错误消息
 */
export const min = (min: number, message?: string): Validator => {
  return (value: any) => {
    const num = Number(value);
    if (isNaN(num) || num < min) {
      return createResult(false, message || `最小值为 ${min}`);
    }
    return createResult(true);
  };
};

/**
 * 最大值验证（用于数字）
 * @param max 最大值
 * @param message 自定义错误消息
 */
export const max = (max: number, message?: string): Validator => {
  return (value: any) => {
    const num = Number(value);
    if (isNaN(num) || num > max) {
      return createResult(false, message || `最大值为 ${max}`);
    }
    return createResult(true);
  };
};

/**
 * 范围验证（用于数字）
 * @param min 最小值
 * @param max 最大值
 * @param message 自定义错误消息
 */
export const range = (min: number, max: number, message?: string): Validator => {
  return (value: any) => {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      return createResult(false, message || `取值范围为 ${min} 到 ${max}`);
    }
    return createResult(true);
  };
};

/**
 * 正则表达式模式验证
 * @param pattern 正则表达式
 * @param message 自定义错误消息
 */
export const pattern = (pattern: RegExp, message: string): Validator => {
  return (value: any) => {
    if (typeof value !== 'string' || !pattern.test(value)) {
      return createResult(false, message);
    }
    return createResult(true);
  };
};

/**
 * 邮箱格式验证
 * @param message 自定义错误消息
 */
export const email = (message: string = '请输入有效的邮箱地址'): Validator => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern(emailPattern, message);
};

/**
 * 手机号格式验证（中国大陆）
 * @param message 自定义错误消息
 */
export const phone = (message: string = '请输入有效的手机号码'): Validator => {
  const phonePattern = /^1[3-9]\d{9}$/;
  return pattern(phonePattern, message);
};

/**
 * ISBN 格式验证
 * @param message 自定义错误消息
 */
export const isbn = (message: string = '无效的 ISBN 格式'): Validator => {
  return (value: any) => {
    if (!value || typeof value !== 'string') {
      return createResult(true); // 允许空值，如需必填请结合 required 使用
    }
    
    const cleanIsbn = value.replace(/[\s-]/g, '');
    
    // ISBN-10 验证
    if (cleanIsbn.length === 10) {
      if (!/^\d{9}[\dX]$/i.test(cleanIsbn)) {
        return createResult(false, message);
      }
      return createResult(true);
    }
    
    // ISBN-13 验证
    if (cleanIsbn.length === 13) {
      if (!/^\d{13}$/.test(cleanIsbn)) {
        return createResult(false, message);
      }
      // ISBN-13 校验位验证
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(cleanIsbn[i]) * (i % 2 === 0 ? 1 : 3);
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      if (checkDigit !== parseInt(cleanIsbn[12])) {
        return createResult(false, message);
      }
      return createResult(true);
    }
    
    return createResult(false, message);
  };
};

/**
 * 自定义验证器
 * @param validator 自定义验证函数
 * @param message 错误消息
 */
export const custom = (validator: (value: any) => boolean, message: string): Validator => {
  return (value: any) => {
    if (!validator(value)) {
      return createResult(false, message);
    }
    return createResult(true);
  };
};

/**
 * 组合多个验证器
 * @param validators 验证器数组
 */
export const compose = (...validators: Validator[]): Validator => {
  return (value: any) => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) {
        return result;
      }
    }
    return createResult(true);
  };
};

/**
 * 验证单个字段
 * @param value 字段值
 * @param rules 验证规则配置
 * @returns 验证结果
 */
export function validateField(value: any, rules: ValidationRule): ValidationResult {
  // 必填验证
  if (rules.required) {
    const requiredResult = required(rules.message)(value);
    if (!requiredResult.valid) {
      return requiredResult;
    }
  }
  
  // 如果值为空且不是必填，跳过其他验证
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return createResult(true);
  }
  
  // 如果值为空且不是必填，跳过其他验证
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return createResult(true);
  }
  
  // 最小长度验证
  if (rules.minLength !== undefined) {
    const result = minLength(rules.minLength, rules.message)(value);
    if (!result.valid) return result;
  }
  
  // 最大长度验证
  if (rules.maxLength !== undefined) {
    const result = maxLength(rules.maxLength, rules.message)(value);
    if (!result.valid) return result;
  }
  
  // 最小值验证
  if (rules.min !== undefined) {
    const result = min(rules.min, rules.message)(value);
    if (!result.valid) return result;
  }
  
  // 最大值验证
  if (rules.max !== undefined) {
    const result = max(rules.max, rules.message)(value);
    if (!result.valid) return result;
  }
  
  // 正则表达式验证
  if (rules.pattern) {
    const result = pattern(rules.pattern, rules.message || '格式不正确')(value);
    if (!result.valid) return result;
  }
  
  // 如果值为空且不是必填，跳过其他验证
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return createResult(true);
  }
  
  // 邮箱验证（空值已在上一步处理）
  if (rules.email && value) {
    const result = email(rules.message)(value);
    if (!result.valid) return result;
  }
  
  // 手机号验证（空值已在上一步处理）
  if (rules.phone && value) {
    const result = phone(rules.message)(value);
    if (!result.valid) return result;
  }
  
  // ISBN 验证（空值已在上一步处理）
  if (rules.isbn && value) {
    const result = isbn(rules.message)(value);
    if (!result.valid) return result;
  }
  
  // 自定义验证
  if (rules.custom) {
    const result = custom(rules.custom, rules.message || '验证失败')(value);
    if (!result.valid) return result;
  }
  
  return createResult(true);
}

/**
 * 验证整个表单
 * @param data 表单数据对象
 * @param config 字段验证配置
 * @returns 验证错误对象和是否有效
 */
export function validateForm<T extends Record<string, any>>(
  data: T,
  config: FieldValidationConfig
): { valid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};
  
  for (const [field, rules] of Object.entries(config)) {
    const value = data[field];
    const result = validateField(value, rules);
    if (!result.valid) {
      errors[field] = result.error;
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * 书籍表单验证配置
 */
export const bookValidationConfig: FieldValidationConfig = {
  barcode: { required: true, message: '条形码不能为空' },
  title: { required: true, message: '书名不能为空' },
  author: { required: true, message: '作者不能为空' },
  isbn: { isbn: true, message: '无效的 ISBN 格式' },
  totalStock: { required: true, min: 1, message: '总库存至少为 1' },
  availableStock: { required: true, min: 0, message: '可借库存不能为负数' }
};

/**
 * 会员表单验证配置
 */
export const memberValidationConfig: FieldValidationConfig = {
  cardNumber: { required: true, message: '会员卡号不能为空' },
  name: { required: true, message: '姓名不能为空' },
  phone: { required: true, phone: true, message: '请输入有效的手机号码' },
  email: { email: true, message: '请输入有效的邮箱地址' }
};

/**
 * 会员类型表单验证配置
 */
export const memberTypeValidationConfig: FieldValidationConfig = {
  name: { required: true, message: '类型名称不能为空' },
  maxBorrowCount: { required: true, min: 1, message: '最大借阅数量至少为 1' },
  maxBorrowDays: { required: true, min: 1, message: '最大借阅天数至少为 1' },
  fee: { required: true, min: 0, message: '费用不能为负数' }
};

/**
 * 分类表单验证配置
 */
export const categoryValidationConfig: FieldValidationConfig = {
  name: { required: true, message: '分类名称不能为空' }
};

// 默认导出
export default {
  required,
  minLength,
  maxLength,
  min,
  max,
  range,
  pattern,
  email,
  phone,
  isbn,
  custom,
  compose,
  validateField,
  validateForm,
  bookValidationConfig,
  memberValidationConfig,
  memberTypeValidationConfig,
  categoryValidationConfig
};
