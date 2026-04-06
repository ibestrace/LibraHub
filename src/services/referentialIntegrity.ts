// Referential Integrity Service - 引用完整性服务
// 确保数据操作不会破坏实体间的引用关系
// 支持 RESTRICT、CASCADE、SET_NULL 三种完整性策略

import type { Member } from '@/types';
import { storage } from './unifiedStorage';

/**
 * 完整性约束动作类型
 */
export type IntegrityAction = 'RESTRICT' | 'CASCADE' | 'SET_NULL';

/**
 * 引用约束定义
 */
export interface ReferentialConstraint {
  /** 约束名称 */
  name: string;
  /** 被引用的实体类型 */
  parentEntity: 'books' | 'members' | 'categories' | 'member_types' | 'member_groups';
  /** 引用该实体的子实体类型 */
  childEntity: 'books' | 'members' | 'borrow_records' | 'reservations';
  /** 外键字段（在子实体中） */
  foreignKey: string;
  /** 当被引用实体删除时的动作 */
  onDelete: IntegrityAction;
  /** 当被引用实体更新时的动作 */
  onUpdate: IntegrityAction;
  /** 描述信息 */
  description: string;
}

/**
 * 完整性检查错误
 */
export class IntegrityViolationError extends Error {
  constraint: ReferentialConstraint;
  parentId: string;
  violatingChildren: Array<{ id: string; name?: string }>;

  constructor(
    constraint: ReferentialConstraint,
    parentId: string,
    violatingChildren: Array<{ id: string; name?: string }>
  ) {
    const childNames = violatingChildren.map(c => c.name || c.id).slice(0, 3).join(', ');
    const more = violatingChildren.length > 3 ? ` 等${violatingChildren.length}条记录` : '';
    super(
      `无法删除：${constraint.description}。` +
      `有 ${violatingChildren.length} 条${getEntityLabel(constraint.childEntity)}引用此记录` +
      `(${childNames}${more})。请先处理这些记录。`
    );
    this.name = 'IntegrityViolationError';
    this.constraint = constraint;
    this.parentId = parentId;
    this.violatingChildren = violatingChildren;
  }
}

/**
 * 级联删除结果
 */
export interface CascadeResult {
  /** 成功删除的子记录数量 */
  deletedCount: number;
  /** 删除的子记录类型 */
  entityType: string;
  /** 被删除的记录ID列表 */
  deletedIds: string[];
}

/**
 * 删除操作结果
 */
export interface DeleteOperationResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息（如果失败） */
  error?: IntegrityViolationError;
  /** 级联删除的结果列表 */
  cascadeResults: CascadeResult[];
  /** 被设置为 null 的字段列表 */
  setNullResults: Array<{
    entityType: string;
    count: number;
    field: string;
  }>;
}

/**
 * 实体标签映射
 */
function getEntityLabel(entity: string): string {
  const labels: Record<string, string> = {
    books: '书籍',
    members: '会员',
    borrow_records: '借阅记录',
    categories: '分类',
    member_types: '会员类型',
    member_groups: '会员分组',
    reservations: '预约记录'
  };
  return labels[entity] || entity;
}

/**
 * 预定义的引用完整性约束
 */
export const REFERENTIAL_CONSTRAINTS: ReferentialConstraint[] = [
  // 书籍分类约束：删除分类时，如果有书籍引用该分类，阻止删除
  {
    name: 'FK_BOOK_CATEGORY',
    parentEntity: 'categories',
    childEntity: 'books',
    foreignKey: 'categoryId',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
    description: '该分类下存在书籍'
  },
  
  // 会员类型约束：删除会员类型时，阻止删除（会员类型是基础配置）
  {
    name: 'FK_MEMBER_TYPE',
    parentEntity: 'member_types',
    childEntity: 'members',
    foreignKey: 'memberType.id',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
    description: '该会员类型下有会员在使用'
  },
  
  // 会员分组约束：删除分组时，将会员的分组ID设为 null
  {
    name: 'FK_MEMBER_GROUP',
    parentEntity: 'member_groups',
    childEntity: 'members',
    foreignKey: 'groupId',
    onDelete: 'SET_NULL',
    onUpdate: 'CASCADE',
    description: '该分组下有会员'
  },
  
  // 借阅记录-书籍约束：删除书籍时，阻止删除（有借阅历史）
  {
    name: 'FK_BORROW_BOOK',
    parentEntity: 'books',
    childEntity: 'borrow_records',
    foreignKey: 'bookId',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
    description: '该书籍有借阅记录'
  },
  
  // 借阅记录-会员约束：删除会员时，阻止删除（有借阅历史）
  {
    name: 'FK_BORROW_MEMBER',
    parentEntity: 'members',
    childEntity: 'borrow_records',
    foreignKey: 'memberId',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
    description: '该会员有借阅记录'
  }
];

/**
 * 引用完整性服务
 */
export class ReferentialIntegrityService {
  private constraints: ReferentialConstraint[];

  constructor(constraints: ReferentialConstraint[] = REFERENTIAL_CONSTRAINTS) {
    this.constraints = constraints;
  }

  /**
   * 获取实体的所有引用约束（作为父实体被引用）
   */
  getConstraintsForParent(entityType: ReferentialConstraint['parentEntity']): ReferentialConstraint[] {
    return this.constraints.filter(c => c.parentEntity === entityType);
  }

  /**
   * 获取实体的所有外键约束（作为子实体引用别人）
   */
  getConstraintsForChild(entityType: ReferentialConstraint['childEntity']): ReferentialConstraint[] {
    return this.constraints.filter(c => c.childEntity === entityType);
  }

  /**
   * 检查删除操作是否会违反引用完整性
   * @returns 违反的约束列表和关联的子记录
   */
  async checkDeleteIntegrity(
    entityType: ReferentialConstraint['parentEntity'],
    entityId: string
  ): Promise<Array<{ constraint: ReferentialConstraint; children: Array<{ id: string; name?: string }> }>> {
    const constraints = this.getConstraintsForParent(entityType);
    const violations: Array<{ constraint: ReferentialConstraint; children: Array<{ id: string; name?: string }> }> = [];

    for (const constraint of constraints) {
      if (constraint.onDelete === 'RESTRICT') {
        const children = await this.findReferencingChildren(constraint, entityId);
        if (children.length > 0) {
          violations.push({ constraint, children });
        }
      }
    }

    return violations;
  }

  /**
   * 查找引用父实体的所有子记录
   */
  private async findReferencingChildren(
    constraint: ReferentialConstraint,
    parentId: string
  ): Promise<Array<{ id: string; name?: string }>> {
    switch (constraint.childEntity) {
      case 'books': {
        const books = await storage.getBooks();
        return books
          .filter(b => b.categoryId === parentId)
          .map(b => ({ id: b.id, name: b.title }));
      }
      
      case 'members': {
        const members = await storage.getMembers();
        if (constraint.foreignKey === 'groupId') {
          return members
            .filter(m => m.groupId === parentId)
            .map(m => ({ id: m.id, name: m.name }));
        } else if (constraint.foreignKey === 'memberType.id') {
          return members
            .filter(m => m.memberType.id === parentId)
            .map(m => ({ id: m.id, name: m.name }));
        }
        return [];
      }
      
      case 'borrow_records': {
        const records = await storage.getBorrowRecords();
        return records
          .filter(r => {
            if (constraint.foreignKey === 'bookId') {
              return r.bookId === parentId;
            } else if (constraint.foreignKey === 'memberId') {
              return r.memberId === parentId;
            }
            return false;
          })
          .map(r => ({ id: r.id, name: `${r.bookTitle} - ${r.memberName}` }));
      }
      
      default:
        return [];
    }
  }

  /**
   * 安全删除实体（带引用完整性检查）
   * 
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param options 选项
   * @returns 删除操作结果
   */
  async safeDelete(
    entityType: ReferentialConstraint['parentEntity'],
    entityId: string,
    options: {
      /** 是否强制级联删除（忽略 SET_NULL，直接删除） */
      forceCascade?: boolean;
      /** 是否忽略 RESTRICT 约束（不推荐） */
      ignoreRestrict?: boolean;
    } = {}
  ): Promise<DeleteOperationResult> {
    const result: DeleteOperationResult = {
      success: false,
      cascadeResults: [],
      setNullResults: []
    };

    // 1. 检查 RESTRICT 约束
    const violations = await this.checkDeleteIntegrity(entityType, entityId);
    
    if (violations.length > 0 && !options.ignoreRestrict) {
      result.error = new IntegrityViolationError(
        violations[0].constraint,
        entityId,
        violations[0].children
      );
      return result;
    }

    // 2. 处理 CASCADE 和 SET_NULL
    const constraints = this.getConstraintsForParent(entityType);
    
    for (const constraint of constraints) {
      if (constraint.onDelete === 'CASCADE' || options.forceCascade) {
        const cascadeResult = await this.cascadeDelete(constraint, entityId);
        if (cascadeResult.deletedCount > 0) {
          result.cascadeResults.push(cascadeResult);
        }
      } else if (constraint.onDelete === 'SET_NULL' && !options.forceCascade) {
        const setNullResult = await this.setNullReferences(constraint, entityId);
        if (setNullResult.count > 0) {
          result.setNullResults.push(setNullResult);
        }
      }
    }

    // 3. 执行实际删除
    try {
      await this.executeDelete(entityType, entityId);
      result.success = true;
    } catch (error) {
      throw new Error(`删除实体失败: ${error}`);
    }

    return result;
  }

  /**
   * 级联删除子记录
   */
  private async cascadeDelete(
    constraint: ReferentialConstraint,
    parentId: string
  ): Promise<CascadeResult> {
    const children = await this.findReferencingChildren(constraint, parentId);
    const deletedIds: string[] = [];

    for (const child of children) {
      try {
        await this.executeDelete(constraint.childEntity, child.id);
        deletedIds.push(child.id);
      } catch (error) {
        console.error(`级联删除失败: ${constraint.childEntity} ${child.id}`, error);
      }
    }

    return {
      deletedCount: deletedIds.length,
      entityType: getEntityLabel(constraint.childEntity),
      deletedIds
    };
  }

  /**
   * 将引用字段设为 null
   */
  private async setNullReferences(
    constraint: ReferentialConstraint,
    parentId: string
  ): Promise<{ entityType: string; count: number; field: string }> {
    let count = 0;

    if (constraint.childEntity === 'members' && constraint.foreignKey === 'groupId') {
      const members = await storage.getMembers();
      for (const member of members) {
        if (member.groupId === parentId) {
          await storage.saveMember({ ...member, groupId: undefined });
          count++;
        }
      }
    }

    return {
      entityType: getEntityLabel(constraint.childEntity),
      count,
      field: constraint.foreignKey
    };
  }

  /**
   * 执行实际删除操作
   */
  private async executeDelete(
    entityType: ReferentialConstraint['parentEntity'] | ReferentialConstraint['childEntity'],
    entityId: string
  ): Promise<void> {
    switch (entityType) {
      case 'books':
        await storage.deleteBook(entityId);
        break;
      case 'members':
        await storage.deleteMember(entityId);
        break;
      case 'categories':
        await storage.deleteCategory(entityId);
        break;
      case 'member_types':
        await storage.deleteMemberType(entityId);
        break;
      case 'member_groups':
        await storage.deleteMemberGroup(entityId);
        break;
      case 'borrow_records':
        await storage.deleteBorrowRecord(entityId);
        break;
      default:
        throw new Error(`未知的实体类型: ${entityType}`);
    }
  }

  /**
   * 检查外键值是否有效（用于新增/更新时验证）
   * 
   * @param entityType 子实体类型
   * @param field 字段名
   * @param value 字段值
   * @returns 是否有效
   */
  async validateForeignKey(
    entityType: ReferentialConstraint['childEntity'],
    field: string,
    value: string | undefined
  ): Promise<{ valid: boolean; error?: string }> {
    if (!value) {
      return { valid: true }; // 允许 null/undefined
    }

    const constraints = this.getConstraintsForChild(entityType);
    const constraint = constraints.find(c => c.foreignKey === field);

    if (!constraint) {
      return { valid: true }; // 没有约束，直接通过
    }

    let parentExists = false;

    switch (constraint.parentEntity) {
      case 'categories': {
        const categories = await storage.getCategories();
        parentExists = categories.some(c => c.id === value);
        break;
      }
      case 'member_types': {
        const types = await storage.getMemberTypes();
        parentExists = types.some(t => t.id === value);
        break;
      }
      case 'member_groups': {
        const groups = await storage.getMemberGroups();
        parentExists = groups.some(g => g.id === value);
        break;
      }
      case 'books': {
        const book = await storage.getBookById(value);
        parentExists = !!book;
        break;
      }
      case 'members': {
        const member = await storage.getMemberById(value);
        parentExists = !!member;
        break;
      }
    }

    if (!parentExists) {
      return {
        valid: false,
        error: `引用的${getEntityLabel(constraint.parentEntity)}不存在 (ID: ${value})`
      };
    }

    return { valid: true };
  }

  /**
   * 获取完整性报告（显示所有引用关系）
   */
  async generateIntegrityReport(): Promise<{
    totalConstraints: number;
    violations: Array<{
      constraint: ReferentialConstraint;
      orphanedCount: number;
      examples: string[];
    }>;
  }> {
    const violations: Array<{
      constraint: ReferentialConstraint;
      orphanedCount: number;
      examples: string[];
    }> = [];

    for (const constraint of this.constraints) {
      let orphanedCount = 0;
      const examples: string[] = [];

      // 获取所有子记录
      const children = await this.getAllChildren(constraint.childEntity);
      
      for (const child of children) {
        const fkValue = this.getForeignKeyValue(child, constraint.foreignKey);
        if (fkValue) {
          const parentExists = await this.checkParentExists(constraint.parentEntity, fkValue);
          if (!parentExists) {
            orphanedCount++;
            if (examples.length < 3) {
              examples.push(`${getEntityLabel(constraint.childEntity)} ${(child as any).id || 'unknown'} 引用了不存在的 ${getEntityLabel(constraint.parentEntity)} ${fkValue}`);
            }
          }
        }
      }

      if (orphanedCount > 0) {
        violations.push({ constraint, orphanedCount, examples });
      }
    }

    return {
      totalConstraints: this.constraints.length,
      violations
    };
  }

  /**
   * 获取所有子实体
   */
  private async getAllChildren(entityType: ReferentialConstraint['childEntity']): Promise<unknown[]> {
    switch (entityType) {
      case 'books':
        return storage.getBooks();
      case 'members':
        return storage.getMembers();
      case 'borrow_records':
        return storage.getBorrowRecords();
      default:
        return [];
    }
  }

  /**
   * 获取外键值
   */
  private getForeignKeyValue(child: unknown, foreignKey: string): string | undefined {
    const keys = foreignKey.split('.');
    let value: any = child;
    
    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }
    
    return value;
  }

  /**
   * 检查父实体是否存在
   */
  private async checkParentExists(
    parentEntity: ReferentialConstraint['parentEntity'],
    parentId: string
  ): Promise<boolean> {
    switch (parentEntity) {
      case 'categories': {
        const categories = await storage.getCategories();
        return categories.some(c => c.id === parentId);
      }
      case 'member_types': {
        const types = await storage.getMemberTypes();
        return types.some(t => t.id === parentId);
      }
      case 'member_groups': {
        const groups = await storage.getMemberGroups();
        return groups.some(g => g.id === parentId);
      }
      case 'books': {
        const book = await storage.getBookById(parentId);
        return !!book;
      }
      case 'members': {
        const member = await storage.getMemberById(parentId);
        return !!member;
      }
      default:
        return false;
    }
  }

  /**
   * 修复完整性问题（删除孤儿记录或将外键设为 null）
   */
  async repairIntegrity(
    constraint: ReferentialConstraint,
    strategy: 'DELETE_ORPHAN' | 'SET_NULL'
  ): Promise<{ repaired: number; errors: string[] }> {
    let repaired = 0;
    const errors: string[] = [];

    const children = await this.getAllChildren(constraint.childEntity);

    for (const child of children) {
      const fkValue = this.getForeignKeyValue(child, constraint.foreignKey);
      if (fkValue) {
        const parentExists = await this.checkParentExists(constraint.parentEntity, fkValue);
        if (!parentExists) {
          try {
            if (strategy === 'DELETE_ORPHAN') {
              await this.executeDelete(constraint.childEntity, (child as any).id);
              repaired++;
            } else if (strategy === 'SET_NULL' && constraint.onDelete === 'SET_NULL') {
              // 更新记录，将外键设为 null
              await this.updateSetNull(constraint, child);
              repaired++;
            }
          } catch (error) {
            errors.push(`修复失败 (${(child as any).id}): ${error}`);
          }
        }
      }
    }

    return { repaired, errors };
  }

  /**
   * 将记录的外键设为 null
   */
  private async updateSetNull(constraint: ReferentialConstraint, child: unknown): Promise<void> {
    if (constraint.childEntity === 'members' && constraint.foreignKey === 'groupId') {
      const member = child as Member;
      await storage.saveMember({ ...member, groupId: undefined });
    }
    // 可以根据需要添加其他实体的处理
  }
}

// 导出单例实例
export const integrityService = new ReferentialIntegrityService();

// 导出便捷函数
export async function safeDeleteBook(bookId: string): Promise<DeleteOperationResult> {
  return integrityService.safeDelete('books', bookId);
}

export async function safeDeleteMember(memberId: string): Promise<DeleteOperationResult> {
  return integrityService.safeDelete('members', memberId);
}

export async function safeDeleteCategory(categoryId: string): Promise<DeleteOperationResult> {
  return integrityService.safeDelete('categories', categoryId);
}

export async function safeDeleteMemberType(typeId: string): Promise<DeleteOperationResult> {
  return integrityService.safeDelete('member_types', typeId);
}

export async function safeDeleteMemberGroup(groupId: string): Promise<DeleteOperationResult> {
  return integrityService.safeDelete('member_groups', groupId);
}
