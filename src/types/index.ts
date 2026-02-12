// 图书馆管理系统类型定义

// 书籍状态
export type BookStatus = 'available' | 'borrowed' | 'reserved' | 'damaged' | 'lost' | 'under_repair';

// 会员状态
export type MemberStatus = 'active' | 'expired' | 'suspended' | 'cancelled';

// 借阅状态
export type BorrowStatus = 'borrowed' | 'returned' | 'overdue' | 'renewed';

// 书籍分类
export interface BookCategory {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 书籍信息
export interface Book {
  id: string;
  barcode: string;              // 条形码（必备）
  isbn: string;                 // ISBN号
  title: string;                // 书名（必备）
  subtitle?: string;            // 副标题
  author: string;               // 作者（必备）
  translator?: string;          // 译者
  publisher: string;            // 出版社
  publishDate?: string;         // 出版日期
  edition?: string;             // 版次
  categoryId: string;           // 分类ID
  categoryName?: string;        // 分类名称
  language?: string;            // 语言
  wordCount?: number;           // 字数
  pageCount?: number;           // 页数
  price?: number;               // 定价
  description?: string;         // 简介
  cover?: string;               // 封面图片
  location?: string;            // 馆藏位置
  status: BookStatus;           // 状态
  totalStock: number;           // 总库存
  availableStock: number;       // 可借库存
  borrowCount: number;          // 借阅次数
  createdAt: string;
  updatedAt: string;
}

// 会员信息
export interface Member {
  id: string;
  cardNumber: string;           // 会员卡号（条形码）
  name: string;                 // 姓名
  gender?: 'male' | 'female' | 'other';
  phone: string;                // 电话
  email?: string;               // 邮箱
  address?: string;             // 地址
  idCard?: string;              // 身份证号
  birthDate?: string;           // 出生日期
  memberType: MemberType;       // 会员类型
  status: MemberStatus;         // 状态
  registerDate: string;         // 注册日期
  expireDate: string;           // 到期日期
  maxBorrowCount: number;       // 最大借阅数量
  currentBorrowCount: number;   // 当前借阅数量
  deposit?: number;             // 押金
  notes?: string;               // 备注
  createdAt: string;
  updatedAt: string;
}

// 会员类型
export interface MemberType {
  id: string;
  name: string;                 // 类型名称（如：普通会员、VIP会员）
  durationMonths: number;       // 有效期（月）
  maxBorrowCount: number;       // 最大借阅数量
  maxBorrowDays: number;        // 最大借阅天数
  renewTimes: number;           // 可续借次数
  renewDays: number;            // 续借天数
  depositAmount: number;        // 押金金额
  fee: number;                  // 会费
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 借阅记录
export interface BorrowRecord {
  id: string;
  bookId: string;               // 书籍ID
  bookBarcode: string;          // 书籍条形码
  bookTitle: string;            // 书名
  bookAuthor: string;           // 作者
  memberId: string;             // 会员ID
  memberCardNumber: string;     // 会员卡号
  memberName: string;           // 会员姓名
  borrowDate: string;           // 借阅日期
  dueDate: string;              // 应还日期
  returnDate?: string;          // 实际归还日期
  status: BorrowStatus;         // 状态
  renewCount: number;           // 续借次数
  fineAmount: number;           // 罚款金额
  fineReason?: string;          // 罚款原因
  notes?: string;               // 备注
  operator: string;             // 操作员
  createdAt: string;
  updatedAt: string;
}

// 预约记录
export interface ReservationRecord {
  id: string;
  bookId: string;
  memberId: string;
  reservationDate: string;
  expireDate: string;
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 操作日志
export interface OperationLog {
  id: string;
  type: 'book' | 'member' | 'borrow' | 'return' | 'renew' | 'system';
  action: string;
  targetId: string;
  targetName: string;
  operator: string;
  details?: string;
  ip?: string;
  createdAt: string;
}

// 系统设置
export interface SystemSettings {
  libraryName: string;
  libraryAddress?: string;
  libraryPhone?: string;
  libraryEmail?: string;
  maxBorrowDays: number;
  maxRenewTimes: number;
  renewDays: number;
  overdueFinePerDay: number;
  allowOverdueBorrow: boolean;
  backupPath?: string;
  lastBackupAt?: string;
}

// 统计数据
export interface Statistics {
  totalBooks: number;
  totalMembers: number;
  activeMembers: number;
  totalBorrows: number;
  currentBorrows: number;
  overdueBorrows: number;
  todayBorrows: number;
  todayReturns: number;
  newMembersThisMonth: number;
}

// 搜索条件
export interface BookSearchParams {
  keyword?: string;
  categoryId?: string;
  status?: BookStatus;
  author?: string;
  publisher?: string;
}

export interface MemberSearchParams {
  keyword?: string;
  status?: MemberStatus;
  memberTypeId?: string;
}

export interface BorrowSearchParams {
  memberId?: string;
  bookId?: string;
  status?: BorrowStatus;
  startDate?: string;
  endDate?: string;
}
