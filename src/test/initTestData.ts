// 测试数据初始化脚本
// 在浏览器控制台中运行此脚本来生成测试数据

import { BookService, MemberService, MemberTypeService, MemberGroupService, BorrowService, CategoryService } from '@/services/storage';
import type { Book, Member, MemberType, MemberGroup, BookCategory, BorrowRecord } from '@/types';
import { format, addDays, subDays, subMonths } from 'date-fns';

// 生成随机ID
const generateId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// 初始化测试数据
export function initializeTestData() {
  console.log('开始初始化测试数据...');
  
  // 1. 创建书籍分类
  console.log('创建书籍分类...');
  const categories: BookCategory[] = [
    {
      id: 'cat_1',
      name: '文学小说',
      code: 'LIT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cat_2',
      name: '科技计算机',
      code: 'TECH',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cat_3',
      name: '历史传记',
      code: 'HIS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  localStorage.setItem('library_categories', JSON.stringify(categories));
  
  // 2. 创建会员类型
  console.log('创建会员类型...');
  const memberTypes: MemberType[] = [
    {
      id: 'mt_1',
      name: '普通会员',
      durationMonths: 12,
      maxBorrowCount: 5,
      maxBorrowDays: 30,
      renewTimes: 2,
      renewDays: 15,
      depositAmount: 100,
      fee: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'mt_2',
      name: 'VIP会员',
      durationMonths: 12,
      maxBorrowCount: 10,
      maxBorrowDays: 45,
      renewTimes: 3,
      renewDays: 20,
      depositAmount: 200,
      fee: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  localStorage.setItem('library_member_types', JSON.stringify(memberTypes));
  
  // 3. 创建会员分组
  console.log('创建会员分组...');
  const groups: MemberGroup[] = [
    {
      id: 'group_1',
      name: '一年级',
      description: '一年级学生',
      color: '#3B82F6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'group_2',
      name: '二年级',
      description: '二年级学生',
      color: '#10B981',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'group_3',
      name: '三年级',
      description: '三年级学生',
      color: '#F59E0B',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  localStorage.setItem('library_member_groups', JSON.stringify(groups));
  
  // 4. 创建书籍
  console.log('创建书籍...');
  const books: Book[] = [
    {
      id: 'book_1',
      barcode: 'BK001',
      isbn: '978-7-111-12345-6',
      title: '三体',
      author: '刘慈欣',
      publisher: '重庆出版社',
      publishDate: '2008-01-01',
      categoryId: 'cat_1',
      categoryName: '文学小说',
      language: '中文',
      wordCount: 88000,
      pageCount: 302,
      price: 59.8,
      status: 'available',
      totalStock: 3,
      availableStock: 3,
      borrowCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'book_2',
      barcode: 'BK002',
      isbn: '978-7-111-23456-7',
      title: '百年孤独',
      author: '加西亚·马尔克斯',
      publisher: '南海出版公司',
      publishDate: '2011-06-01',
      categoryId: 'cat_1',
      categoryName: '文学小说',
      language: '中文',
      wordCount: 125000,
      pageCount: 360,
      price: 39.5,
      status: 'available',
      totalStock: 2,
      availableStock: 2,
      borrowCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'book_3',
      barcode: 'BK003',
      isbn: '978-7-111-34567-8',
      title: 'JavaScript高级程序设计',
      author: 'Nicholas C. Zakas',
      publisher: '人民邮电出版社',
      publishDate: '2020-10-01',
      categoryId: 'cat_2',
      categoryName: '科技计算机',
      language: '中文',
      wordCount: 520000,
      pageCount: 920,
      price: 129,
      status: 'available',
      totalStock: 4,
      availableStock: 4,
      borrowCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'book_4',
      barcode: 'BK004',
      isbn: '978-7-111-45678-9',
      title: '明朝那些事儿',
      author: '当年明月',
      publisher: '浙江人民出版社',
      publishDate: '2006-03-01',
      categoryId: 'cat_3',
      categoryName: '历史传记',
      language: '中文',
      wordCount: 780000,
      pageCount: 1700,
      price: 188,
      status: 'available',
      totalStock: 2,
      availableStock: 2,
      borrowCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'book_5',
      barcode: 'BK005',
      isbn: '978-7-111-56789-0',
      title: '活着',
      author: '余华',
      publisher: '作家出版社',
      publishDate: '2012-08-01',
      categoryId: 'cat_1',
      categoryName: '文学小说',
      language: '中文',
      wordCount: 120000,
      pageCount: 191,
      price: 29,
      status: 'available',
      totalStock: 3,
      availableStock: 3,
      borrowCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'book_6',
      barcode: 'BK006',
      isbn: '978-7-111-67890-1',
      title: 'React进阶之路',
      author: '徐超',
      publisher: '电子工业出版社',
      publishDate: '2019-05-01',
      categoryId: 'cat_2',
      categoryName: '科技计算机',
      language: '中文',
      wordCount: 350000,
      pageCount: 420,
      price: 89,
      status: 'available',
      totalStock: 3,
      availableStock: 3,
      borrowCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  localStorage.setItem('library_books', JSON.stringify(books));
  
  // 5. 创建会员
  console.log('创建会员...');
  const members: Member[] = [
    {
      id: 'member_1',
      cardNumber: 'M001',
      name: '张三',
      gender: 'male',
      phone: '13800138001',
      email: 'zhangsan@example.com',
      memberType: memberTypes[1], // VIP会员
      status: 'active',
      registerDate: subMonths(new Date(), 6).toISOString(),
      expireDate: addMonths(new Date(), 6).toISOString(),
      maxBorrowCount: 10,
      currentBorrowCount: 0,
      groupId: 'group_1', // 一年级
      totalReadingWords: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'member_2',
      cardNumber: 'M002',
      name: '李四',
      gender: 'female',
      phone: '13800138002',
      email: 'lisi@example.com',
      memberType: memberTypes[0], // 普通会员
      status: 'active',
      registerDate: subMonths(new Date(), 8).toISOString(),
      expireDate: addMonths(new Date(), 4).toISOString(),
      maxBorrowCount: 5,
      currentBorrowCount: 0,
      groupId: 'group_1', // 一年级
      totalReadingWords: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'member_3',
      cardNumber: 'M003',
      name: '王五',
      gender: 'male',
      phone: '13800138003',
      email: 'wangwu@example.com',
      memberType: memberTypes[1], // VIP会员
      status: 'active',
      registerDate: subMonths(new Date(), 3).toISOString(),
      expireDate: addMonths(new Date(), 9).toISOString(),
      maxBorrowCount: 10,
      currentBorrowCount: 0,
      groupId: 'group_2', // 二年级
      totalReadingWords: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'member_4',
      cardNumber: 'M004',
      name: '赵六',
      gender: 'female',
      phone: '13800138004',
      email: 'zhaoliu@example.com',
      memberType: memberTypes[0], // 普通会员
      status: 'active',
      registerDate: subMonths(new Date(), 10).toISOString(),
      expireDate: addMonths(new Date(), 2).toISOString(),
      maxBorrowCount: 5,
      currentBorrowCount: 0,
      groupId: 'group_2', // 二年级
      totalReadingWords: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'member_5',
      cardNumber: 'M005',
      name: '孙七',
      gender: 'male',
      phone: '13800138005',
      email: 'sunqi@example.com',
      memberType: memberTypes[1], // VIP会员
      status: 'active',
      registerDate: subMonths(new Date(), 5).toISOString(),
      expireDate: addMonths(new Date(), 7).toISOString(),
      maxBorrowCount: 10,
      currentBorrowCount: 0,
      groupId: 'group_3', // 三年级
      totalReadingWords: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'member_6',
      cardNumber: 'M006',
      name: '周八',
      gender: 'female',
      phone: '13800138006',
      email: 'zhouba@example.com',
      memberType: memberTypes[0], // 普通会员
      status: 'active',
      registerDate: subMonths(new Date(), 12).toISOString(),
      expireDate: new Date().toISOString(),
      maxBorrowCount: 5,
      currentBorrowCount: 0,
      groupId: 'group_3', // 三年级
      totalReadingWords: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  localStorage.setItem('library_members', JSON.stringify(members));
  
  // 6. 创建借阅记录（已归还，用于测试阅读统计）
  console.log('创建借阅记录...');
  const borrowRecords: BorrowRecord[] = [];
  
  // 张三阅读记录（一年级）
  borrowRecords.push(createBorrowRecord(
    'br_1',
    books[0], // 三体 88000字
    members[0],
    subDays(new Date(), 60),
    subDays(new Date(), 30),
    'returned'
  ));
  
  borrowRecords.push(createBorrowRecord(
    'br_2',
    books[2], // JavaScript高级程序设计 520000字
    members[0],
    subDays(new Date(), 50),
    subDays(new Date(), 25),
    'returned'
  ));
  
  // 李四阅读记录（一年级）
  borrowRecords.push(createBorrowRecord(
    'br_3',
    books[1], // 百年孤独 125000字
    members[1],
    subDays(new Date(), 45),
    subDays(new Date(), 20),
    'returned'
  ));
  
  borrowRecords.push(createBorrowRecord(
    'br_4',
    books[4], // 活着 120000字
    members[1],
    subDays(new Date(), 35),
    subDays(new Date(), 15),
    'returned'
  ));
  
  // 王五阅读记录（二年级）
  borrowRecords.push(createBorrowRecord(
    'br_5',
    books[0], // 三体 88000字
    members[2],
    subDays(new Date(), 40),
    subDays(new Date(), 18),
    'returned'
  ));
  
  borrowRecords.push(createBorrowRecord(
    'br_6',
    books[5], // React进阶之路 350000字
    members[2],
    subDays(new Date(), 30),
    subDays(new Date(), 12),
    'returned'
  ));
  
  borrowRecords.push(createBorrowRecord(
    'br_7',
    books[3], // 明朝那些事儿 780000字
    members[2],
    subDays(new Date(), 20),
    subDays(new Date(), 5),
    'returned'
  ));
  
  // 赵六阅读记录（二年级）
  borrowRecords.push(createBorrowRecord(
    'br_8',
    books[1], // 百年孤独 125000字
    members[3],
    subDays(new Date(), 55),
    subDays(new Date(), 28),
    'returned'
  ));
  
  // 孙七阅读记录（三年级）
  borrowRecords.push(createBorrowRecord(
    'br_9',
    books[2], // JavaScript高级程序设计 520000字
    members[4],
    subDays(new Date(), 25),
    subDays(new Date(), 8),
    'returned'
  ));
  
  borrowRecords.push(createBorrowRecord(
    'br_10',
    books[5], // React进阶之路 350000字
    members[4],
    subDays(new Date(), 15),
    subDays(new Date(), 3),
    'returned'
  ));
  
  // 周八阅读记录（三年级）
  borrowRecords.push(createBorrowRecord(
    'br_11',
    books[0], // 三体 88000字
    members[5],
    subDays(new Date(), 70),
    subDays(new Date(), 40),
    'returned'
  ));
  
  borrowRecords.push(createBorrowRecord(
    'br_12',
    books[4], // 活着 120000字
    members[5],
    subDays(new Date(), 65),
    subDays(new Date(), 35),
    'returned'
  ));
  
  borrowRecords.push(createBorrowRecord(
    'br_13',
    books[1], // 百年孤独 125000字
    members[5],
    subDays(new Date(), 60),
    subDays(new Date(), 32),
    'returned'
  ));
  
  localStorage.setItem('library_borrow_records', JSON.stringify(borrowRecords));
  
  // 7. 更新会员阅读字数统计
  console.log('更新会员阅读统计...');
  updateMemberReadingStats(members, borrowRecords);
  
  // 8. 创建阅读统计数据
  console.log('创建阅读统计数据...');
  createReadingStats(members, borrowRecords);
  
  console.log('✅ 测试数据初始化完成！');
  console.log('📊 数据统计：');
  console.log('  - 书籍分类：', categories.length);
  console.log('  - 会员类型：', memberTypes.length);
  console.log('  - 会员分组：', groups.length);
  console.log('  - 书籍：', books.length);
  console.log('  - 会员：', members.length);
  console.log('  - 借阅记录：', borrowRecords.length);
  console.log('  - 已归还记录：', borrowRecords.filter(r => r.status === 'returned').length);
  
  // 刷新页面
  window.location.reload();
}

// 创建借阅记录
function createBorrowRecord(
  id: string,
  book: Book,
  member: Member,
  borrowDate: Date,
  returnDate: Date,
  status: 'borrowed' | 'returned'
): BorrowRecord {
  const record: BorrowRecord = {
    id,
    bookId: book.id,
    bookBarcode: book.barcode,
    bookTitle: book.title,
    bookAuthor: book.author,
    memberId: member.id,
    memberCardNumber: member.cardNumber,
    memberName: member.name,
    borrowDate: borrowDate.toISOString(),
    dueDate: addDays(borrowDate, 30).toISOString(),
    returnDate: status === 'returned' ? returnDate.toISOString() : undefined,
    status,
    renewCount: 0,
    fineAmount: 0,
    operator: '系统',
    wordCount: status === 'returned' ? book.wordCount : undefined,
    readingYearMonth: status === 'returned' ? format(returnDate, 'yyyy-MM') : undefined,
    createdAt: borrowDate.toISOString(),
    updatedAt: returnDate.toISOString()
  };
  
  return record;
}

// 更新会员阅读统计
function updateMemberReadingStats(members: Member[], records: BorrowRecord[]) {
  members.forEach(member => {
    const memberRecords = records.filter(r => r.memberId === member.id && r.status === 'returned');
    const totalWords = memberRecords.reduce((sum, r) => sum + (r.wordCount || 0), 0);
    member.totalReadingWords = totalWords;
  });
  localStorage.setItem('library_members', JSON.stringify(members));
}

// 创建阅读统计数据
function createReadingStats(members: Member[], records: BorrowRecord[]) {
  const stats: any[] = [];
  
  records.forEach(record => {
    if (record.status === 'returned' && record.wordCount && record.readingYearMonth) {
      const member = members.find(m => m.id === record.memberId);
      if (member) {
        stats.push({
          id: `stat_${record.id}`,
          memberId: member.id,
          memberName: member.name,
          groupId: member.groupId,
          yearMonth: record.readingYearMonth,
          totalWords: record.wordCount,
          bookCount: 1,
          updatedAt: record.returnDate
        });
      }
    }
  });
  
  localStorage.setItem('library_reading_stats', JSON.stringify(stats));
}

// 辅助函数
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// 导出到全局作用域
(window as any).initTestData = initializeTestData;
