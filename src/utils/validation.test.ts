import { describe, it, expect } from 'vitest';
import {
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
  memberValidationConfig
} from './validation';

describe('Validation Utils', () => {
  describe('required', () => {
    it('应该验证必填字段', () => {
      const validator = required();
      expect(validator('').valid).toBe(false);
      expect(validator(null).valid).toBe(false);
      expect(validator(undefined).valid).toBe(false);
      expect(validator('test').valid).toBe(true);
      expect(validator(0).valid).toBe(true);
    });

    it('应该支持自定义错误消息', () => {
      const validator = required('自定义错误');
      expect(validator('').error).toBe('自定义错误');
    });

    it('应该验证空数组', () => {
      const validator = required();
      expect(validator([]).valid).toBe(false);
      expect(validator([1]).valid).toBe(true);
    });
  });

  describe('minLength', () => {
    it('应该验证最小长度', () => {
      const validator = minLength(3);
      expect(validator('ab').valid).toBe(false);
      expect(validator('abc').valid).toBe(true);
      expect(validator('abcd').valid).toBe(true);
    });

    it('非字符串应该返回错误', () => {
      const validator = minLength(3);
      expect(validator(123).valid).toBe(false);
    });
  });

  describe('maxLength', () => {
    it('应该验证最大长度', () => {
      const validator = maxLength(5);
      expect(validator('abcdef').valid).toBe(false);
      expect(validator('abcde').valid).toBe(true);
      expect(validator('abc').valid).toBe(true);
    });
  });

  describe('min', () => {
    it('应该验证最小值', () => {
      const validator = min(10);
      expect(validator(5).valid).toBe(false);
      expect(validator(10).valid).toBe(true);
      expect(validator(15).valid).toBe(true);
    });

    it('应该处理字符串数字', () => {
      const validator = min(10);
      expect(validator('5').valid).toBe(false);
      expect(validator('10').valid).toBe(true);
    });

    it('NaN 应该返回错误', () => {
      const validator = min(10);
      expect(validator('abc').valid).toBe(false);
    });
  });

  describe('max', () => {
    it('应该验证最大值', () => {
      const validator = max(100);
      expect(validator(150).valid).toBe(false);
      expect(validator(100).valid).toBe(true);
      expect(validator(50).valid).toBe(true);
    });
  });

  describe('range', () => {
    it('应该验证数值范围', () => {
      const validator = range(1, 10);
      expect(validator(0).valid).toBe(false);
      expect(validator(11).valid).toBe(false);
      expect(validator(1).valid).toBe(true);
      expect(validator(10).valid).toBe(true);
      expect(validator(5).valid).toBe(true);
    });
  });

  describe('pattern', () => {
    it('应该验证正则表达式', () => {
      const validator = pattern(/^\d+$/, '只能输入数字');
      expect(validator('abc').valid).toBe(false);
      expect(validator('123').valid).toBe(true);
      expect(validator('12a3').valid).toBe(false);
    });

    it('应该返回自定义错误消息', () => {
      const validator = pattern(/^\d+$/, '自定义错误');
      expect(validator('abc').error).toBe('自定义错误');
    });
  });

  describe('email', () => {
    it('应该验证有效邮箱', () => {
      const validator = email();
      expect(validator('test@example.com').valid).toBe(true);
      expect(validator('user.name@domain.co.uk').valid).toBe(true);
    });

    it('应该拒绝无效邮箱', () => {
      const validator = email();
      expect(validator('invalid').valid).toBe(false);
      expect(validator('@example.com').valid).toBe(false);
      expect(validator('test@').valid).toBe(false);
      expect(validator('test@.com').valid).toBe(false);
    });
  });

  describe('phone', () => {
    it('应该验证有效手机号', () => {
      const validator = phone();
      expect(validator('13800138000').valid).toBe(true);
      expect(validator('15912345678').valid).toBe(true);
      expect(validator('18887654321').valid).toBe(true);
    });

    it('应该拒绝无效手机号', () => {
      const validator = phone();
      expect(validator('12345678901').valid).toBe(false); // 不以 1 开头
      expect(validator('1380013800').valid).toBe(false); // 不足 11 位
      expect(validator('138001380001').valid).toBe(false); // 超过 11 位
      expect(validator('12800138000').valid).toBe(false); // 第二位不在 3-9
    });
  });

  describe('isbn', () => {
    it('应该验证有效 ISBN-10', () => {
      const validator = isbn();
      expect(validator('0-306-40615-2').valid).toBe(true);
      expect(validator('0306406152').valid).toBe(true);
    });

    it('应该验证有效 ISBN-13', () => {
      const validator = isbn();
      expect(validator('978-3-16-148410-0').valid).toBe(true);
      expect(validator('9783161484100').valid).toBe(true);
    });

    it('应该拒绝无效 ISBN', () => {
      const validator = isbn();
      expect(validator('123456789').valid).toBe(false); // 长度不对
      expect(validator('abcdefghij').valid).toBe(false); // 非数字
    });

    it('应该允许空值（非必填）', () => {
      const validator = isbn();
      expect(validator('').valid).toBe(true);
      expect(validator(null).valid).toBe(true);
      expect(validator(undefined).valid).toBe(true);
    });
  });

  describe('custom', () => {
    it('应该支持自定义验证逻辑', () => {
      const validator = custom(
        (v) => v > 0 && v % 2 === 0,
        '必须是正偶数'
      );
      expect(validator(2).valid).toBe(true);
      expect(validator(3).valid).toBe(false);
      expect(validator(-2).valid).toBe(false);
      expect(validator(3).error).toBe('必须是正偶数');
    });
  });

  describe('compose', () => {
    it('应该组合多个验证器', () => {
      const validator = compose(
        required(),
        minLength(3),
        maxLength(10)
      );
      expect(validator('').valid).toBe(false); // 未通过 required
      expect(validator('ab').valid).toBe(false); // 未通过 minLength
      expect(validator('abcdefghijk').valid).toBe(false); // 未通过 maxLength
      expect(validator('abcde').valid).toBe(true); // 全部通过
    });
  });

  describe('validateField', () => {
    it('应该验证必填规则', () => {
      const result = validateField('', { required: true, message: '必填' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('必填');
    });

    it('空值非必填应该通过', () => {
      const result = validateField('', { required: false, minLength: 3 });
      expect(result.valid).toBe(true);
    });

    it('应该验证最小长度', () => {
      const result = validateField('ab', { minLength: 3 });
      expect(result.valid).toBe(false);
    });

    it('应该验证最大长度', () => {
      const result = validateField('abcdef', { maxLength: 5 });
      expect(result.valid).toBe(false);
    });

    it('应该验证数值范围', () => {
      const result = validateField(15, { min: 1, max: 10 });
      expect(result.valid).toBe(false);
    });

    it('应该验证邮箱格式', () => {
      const result = validateField('invalid', { email: true });
      expect(result.valid).toBe(false);
    });

    it('应该验证手机号格式', () => {
      const result = validateField('12345678901', { phone: true });
      expect(result.valid).toBe(false);
    });

    it('应该验证 ISBN 格式', () => {
      const result = validateField('123456789', { isbn: true });
      expect(result.valid).toBe(false);
    });

    it('应该支持自定义验证', () => {
      const result = validateField(5, {
        custom: (v) => v > 10,
        message: '必须大于 10'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('必须大于 10');
    });
  });

  describe('validateForm', () => {
    it('应该验证整个表单', () => {
      const data = {
        name: '',
        email: 'invalid',
        age: 15
      };

      const config = {
        name: { required: true },
        email: { email: true },
        age: { min: 18 }
      };

      const { valid, errors } = validateForm(data, config);

      expect(valid).toBe(false);
      expect(errors.name).toBeDefined();
      expect(errors.email).toBeDefined();
      expect(errors.age).toBeDefined();
    });

    it('应该通过有效表单', () => {
      const data = {
        name: '张三',
        email: 'test@example.com',
        age: 25
      };

      const config = {
        name: { required: true },
        email: { email: true },
        age: { min: 18, max: 60 }
      };

      const { valid, errors } = validateForm(data, config);

      expect(valid).toBe(true);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('应该只返回错误字段', () => {
      const data = {
        name: '张三',
        email: 'invalid'
      };

      const config = {
        name: { required: true },
        email: { email: true }
      };

      const { valid, errors } = validateForm(data, config);

      expect(valid).toBe(false);
      expect(errors.name).toBeUndefined();
      expect(errors.email).toBeDefined();
    });
  });

  describe('bookValidationConfig', () => {
    it('应该包含正确的验证规则', () => {
      expect(bookValidationConfig.barcode.required).toBe(true);
      expect(bookValidationConfig.title.required).toBe(true);
      expect(bookValidationConfig.author.required).toBe(true);
      expect(bookValidationConfig.isbn.isbn).toBe(true);
    });

    it('应该验证书籍表单', () => {
      const validBook = {
        barcode: '123456',
        title: '测试书籍',
        author: '测试作者',
        isbn: '9783161484100',
        totalStock: 5,
        availableStock: 5
      };

      const { valid, errors } = validateForm(validBook, bookValidationConfig);
      expect(valid).toBe(true);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('应该检测无效书籍数据', () => {
      const invalidBook = {
        barcode: '',
        title: '',
        author: '',
        isbn: 'invalid',
        totalStock: 0,
        availableStock: -1
      };

      const { valid, errors } = validateForm(invalidBook, bookValidationConfig);
      expect(valid).toBe(false);
      expect(errors.barcode).toBeDefined();
      expect(errors.title).toBeDefined();
      expect(errors.author).toBeDefined();
      expect(errors.isbn).toBeDefined();
    });
  });

  describe('memberValidationConfig', () => {
    it('应该验证会员表单', () => {
      const validMember = {
        cardNumber: 'M001',
        name: '张三',
        phone: '13800138000',
        email: 'test@example.com'
      };

      const { valid, errors } = validateForm(validMember, memberValidationConfig);
      expect(valid).toBe(true);
    });

    it('应该检测无效手机号', () => {
      const invalidMember = {
        cardNumber: 'M001',
        name: '张三',
        phone: '12345678901', // 无效手机号
        email: 'test@example.com'
      };

      const { valid, errors } = validateForm(invalidMember, memberValidationConfig);
      expect(valid).toBe(false);
      expect(errors.phone).toBeDefined();
    });

    it('应该检测无效邮箱', () => {
      const invalidMember = {
        cardNumber: 'M001',
        name: '张三',
        phone: '13800138000',
        email: 'invalid-email'
      };

      const { valid, errors } = validateForm(invalidMember, memberValidationConfig);
      expect(valid).toBe(false);
      expect(errors.email).toBeDefined();
    });
  });
});
