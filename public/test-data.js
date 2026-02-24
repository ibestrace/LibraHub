// 测试数据初始化脚本 - 在浏览器控制台粘贴运行
// 打开浏览器控制台（F12），粘贴以下代码并回车

(function() {
  console.log('开始初始化测试数据...');
  
  // 清空现有数据
  localStorage.clear();
  
  // 1. 书籍分类
  const categories = [
    { id: 'cat_1', name: '文学小说', code: 'LIT', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'cat_2', name: '科技计算机', code: 'TECH', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'cat_3', name: '历史传记', code: 'HIS', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  localStorage.setItem('library_categories', JSON.stringify(categories));
  
  // 2. 会员类型
  const memberTypes = [
    { id: 'mt_1', name: '普通会员', durationMonths: 12, maxBorrowCount: 5, maxBorrowDays: 30, renewTimes: 2, renewDays: 15, depositAmount: 100, fee: 50, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'mt_2', name: 'VIP会员', durationMonths: 12, maxBorrowCount: 10, maxBorrowDays: 45, renewTimes: 3, renewDays: 20, depositAmount: 200, fee: 100, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  localStorage.setItem('library_member_types', JSON.stringify(memberTypes));
  
  // 3. 会员分组
  const groups = [
    { id: 'group_1', name: '一年级', description: '一年级学生', color: '#3B82F6', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'group_2', name: '二年级', description: '二年级学生', color: '#10B981', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'group_3', name: '三年级', description: '三年级学生', color: '#F59E0B', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  localStorage.setItem('library_member_groups', JSON.stringify(groups));
  
  // 4. 书籍
  const books = [
    { id: 'book_1', barcode: 'BK001', isbn: '978-7-111-12345-6', title: '三体', author: '刘慈欣', publisher: '重庆出版社', categoryId: 'cat_1', categoryName: '文学小说', wordCount: 88000, pageCount: 302, price: 59.8, status: 'available', totalStock: 3, availableStock: 3, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'book_2', barcode: 'BK002', isbn: '978-7-111-23456-7', title: '百年孤独', author: '加西亚·马尔克斯', publisher: '南海出版公司', categoryId: 'cat_1', categoryName: '文学小说', wordCount: 125000, pageCount: 360, price: 39.5, status: 'available', totalStock: 2, availableStock: 2, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'book_3', barcode: 'BK003', isbn: '978-7-111-34567-8', title: 'JavaScript高级程序设计', author: 'Nicholas C. Zakas', publisher: '人民邮电出版社', categoryId: 'cat_2', categoryName: '科技计算机', wordCount: 520000, pageCount: 920, price: 129, status: 'available', totalStock: 4, availableStock: 4, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'book_4', barcode: 'BK004', isbn: '978-7-111-45678-9', title: '明朝那些事儿', author: '当年明月', publisher: '浙江人民出版社', categoryId: 'cat_3', categoryName: '历史传记', wordCount: 780000, pageCount: 1700, price: 188, status: 'available', totalStock: 2, availableStock: 2, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'book_5', barcode: 'BK005', isbn: '978-7-111-56789-0', title: '活着', author: '余华', publisher: '作家出版社', categoryId: 'cat_1', categoryName: '文学小说', wordCount: 120000, pageCount: 191, price: 29, status: 'available', totalStock: 3, availableStock: 3, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'book_6', barcode: 'BK006', isbn: '978-7-111-67890-1', title: 'React进阶之路', author: '徐超', publisher: '电子工业出版社', categoryId: 'cat_2', categoryName: '科技计算机', wordCount: 350000, pageCount: 420, price: 89, status: 'available', totalStock: 3, availableStock: 3, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  localStorage.setItem('library_books', JSON.stringify(books));
  
  // 5. 会员
  const members = [
    { id: 'member_1', cardNumber: 'M001', name: '张三', gender: 'male', phone: '13800138001', email: 'zhangsan@example.com', memberType: memberTypes[1], status: 'active', registerDate: new Date(Date.now() - 180*24*60*60*1000).toISOString(), expireDate: new Date(Date.now() + 180*24*60*60*1000).toISOString(), maxBorrowCount: 10, currentBorrowCount: 0, groupId: 'group_1', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'member_2', cardNumber: 'M002', name: '李四', gender: 'female', phone: '13800138002', email: 'lisi@example.com', memberType: memberTypes[0], status: 'active', registerDate: new Date(Date.now() - 240*24*60*60*1000).toISOString(), expireDate: new Date(Date.now() + 120*24*60*60*1000).toISOString(), maxBorrowCount: 5, currentBorrowCount: 0, groupId: 'group_1', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'member_3', cardNumber: 'M003', name: '王五', gender: 'male', phone: '13800138003', email: 'wangwu@example.com', memberType: memberTypes[1], status: 'active', registerDate: new Date(Date.now() - 90*24*60*60*1000).toISOString(), expireDate: new Date(Date.now() + 270*24*60*60*1000).toISOString(), maxBorrowCount: 10, currentBorrowCount: 0, groupId: 'group_2', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'member_4', cardNumber: 'M004', name: '赵六', gender: 'female', phone: '13800138004', email: 'zhaoliu@example.com', memberType: memberTypes[0], status: 'active', registerDate: new Date(Date.now() - 300*24*60*60*1000).toISOString(), expireDate: new Date(Date.now() + 60*24*60*60*1000).toISOString(), maxBorrowCount: 5, currentBorrowCount: 0, groupId: 'group_2', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'member_5', cardNumber: 'M005', name: '孙七', gender: 'male', phone: '13800138005', email: 'sunqi@example.com', memberType: memberTypes[1], status: 'active', registerDate: new Date(Date.now() - 150*24*60*60*1000).toISOString(), expireDate: new Date(Date.now() + 210*24*60*60*1000).toISOString(), maxBorrowCount: 10, currentBorrowCount: 0, groupId: 'group_3', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'member_6', cardNumber: 'M006', name: '周八', gender: 'female', phone: '13800138006', email: 'zhouba@example.com', memberType: memberTypes[0], status: 'active', registerDate: new Date(Date.now() - 365*24*60*60*1000).toISOString(), expireDate: new Date().toISOString(), maxBorrowCount: 5, currentBorrowCount: 0, groupId: 'group_3', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  
  // 6. 借阅记录
  const borrowRecords = [];
  const now = Date.now();
  
  // 张三借阅记录（一年级）
  borrowRecords.push({ id: 'br_1', bookId: 'book_1', bookBarcode: 'BK001', bookTitle: '三体', bookAuthor: '刘慈欣', memberId: 'member_1', memberCardNumber: 'M001', memberName: '张三', borrowDate: new Date(now - 60*24*60*60*1000).toISOString(), dueDate: new Date(now - 30*24*60*60*1000).toISOString(), returnDate: new Date(now - 30*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 88000, readingYearMonth: '2025-01', createdAt: new Date(now - 60*24*60*60*1000).toISOString(), updatedAt: new Date(now - 30*24*60*60*1000).toISOString() });
  borrowRecords.push({ id: 'br_2', bookId: 'book_3', bookBarcode: 'BK003', bookTitle: 'JavaScript高级程序设计', bookAuthor: 'Nicholas C. Zakas', memberId: 'member_1', memberCardNumber: 'M001', memberName: '张三', borrowDate: new Date(now - 50*24*60*60*1000).toISOString(), dueDate: new Date(now - 20*24*60*60*1000).toISOString(), returnDate: new Date(now - 25*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 520000, readingYearMonth: '2025-01', createdAt: new Date(now - 50*24*60*60*1000).toISOString(), updatedAt: new Date(now - 25*24*60*60*1000).toISOString() });
  
  // 李四借阅记录（一年级）
  borrowRecords.push({ id: 'br_3', bookId: 'book_2', bookBarcode: 'BK002', bookTitle: '百年孤独', bookAuthor: '加西亚·马尔克斯', memberId: 'member_2', memberCardNumber: 'M002', memberName: '李四', borrowDate: new Date(now - 45*24*60*60*1000).toISOString(), dueDate: new Date(now - 15*24*60*60*1000).toISOString(), returnDate: new Date(now - 20*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 125000, readingYearMonth: '2025-01', createdAt: new Date(now - 45*24*60*60*1000).toISOString(), updatedAt: new Date(now - 20*24*60*60*1000).toISOString() });
  borrowRecords.push({ id: 'br_4', bookId: 'book_5', bookBarcode: 'BK005', bookTitle: '活着', bookAuthor: '余华', memberId: 'member_2', memberCardNumber: 'M002', memberName: '李四', borrowDate: new Date(now - 35*24*60*60*1000).toISOString(), dueDate: new Date(now - 5*24*60*60*1000).toISOString(), returnDate: new Date(now - 15*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 120000, readingYearMonth: '2025-01', createdAt: new Date(now - 35*24*60*60*1000).toISOString(), updatedAt: new Date(now - 15*24*60*60*1000).toISOString() });
  
  // 王五借阅记录（二年级）
  borrowRecords.push({ id: 'br_5', bookId: 'book_1', bookBarcode: 'BK001', bookTitle: '三体', bookAuthor: '刘慈欣', memberId: 'member_3', memberCardNumber: 'M003', memberName: '王五', borrowDate: new Date(now - 40*24*60*60*1000).toISOString(), dueDate: new Date(now - 10*24*60*60*1000).toISOString(), returnDate: new Date(now - 18*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 88000, readingYearMonth: '2025-01', createdAt: new Date(now - 40*24*60*60*1000).toISOString(), updatedAt: new Date(now - 18*24*60*60*1000).toISOString() });
  borrowRecords.push({ id: 'br_6', bookId: 'book_6', bookBarcode: 'BK006', bookTitle: 'React进阶之路', bookAuthor: '徐超', memberId: 'member_3', memberCardNumber: 'M003', memberName: '王五', borrowDate: new Date(now - 30*24*60*60*1000).toISOString(), dueDate: new Date(now).toISOString(), returnDate: new Date(now - 12*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 350000, readingYearMonth: '2025-01', createdAt: new Date(now - 30*24*60*60*1000).toISOString(), updatedAt: new Date(now - 12*24*60*60*1000).toISOString() });
  borrowRecords.push({ id: 'br_7', bookId: 'book_4', bookBarcode: 'BK004', bookTitle: '明朝那些事儿', bookAuthor: '当年明月', memberId: 'member_3', memberCardNumber: 'M003', memberName: '王五', borrowDate: new Date(now - 20*24*60*60*1000).toISOString(), dueDate: new Date(now + 10*24*60*60*1000).toISOString(), returnDate: new Date(now - 5*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 780000, readingYearMonth: '2025-02', createdAt: new Date(now - 20*24*60*60*1000).toISOString(), updatedAt: new Date(now - 5*24*60*60*1000).toISOString() });
  
  // 赵六借阅记录（二年级）
  borrowRecords.push({ id: 'br_8', bookId: 'book_2', bookBarcode: 'BK002', bookTitle: '百年孤独', bookAuthor: '加西亚·马尔克斯', memberId: 'member_4', memberCardNumber: 'M004', memberName: '赵六', borrowDate: new Date(now - 55*24*60*60*1000).toISOString(), dueDate: new Date(now - 25*24*60*60*1000).toISOString(), returnDate: new Date(now - 28*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 125000, readingYearMonth: '2025-01', createdAt: new Date(now - 55*24*60*60*1000).toISOString(), updatedAt: new Date(now - 28*24*60*60*1000).toISOString() });
  
  // 孙七借阅记录（三年级）
  borrowRecords.push({ id: 'br_9', bookId: 'book_3', bookBarcode: 'BK003', bookTitle: 'JavaScript高级程序设计', bookAuthor: 'Nicholas C. Zakas', memberId: 'member_5', memberCardNumber: 'M005', memberName: '孙七', borrowDate: new Date(now - 25*24*60*60*1000).toISOString(), dueDate: new Date(now + 5*24*60*60*1000).toISOString(), returnDate: new Date(now - 8*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 520000, readingYearMonth: '2025-02', createdAt: new Date(now - 25*24*60*60*1000).toISOString(), updatedAt: new Date(now - 8*24*60*60*1000).toISOString() });
  borrowRecords.push({ id: 'br_10', bookId: 'book_6', bookBarcode: 'BK006', bookTitle: 'React进阶之路', bookAuthor: '徐超', memberId: 'member_5', memberCardNumber: 'M005', memberName: '孙七', borrowDate: new Date(now - 15*24*60*60*1000).toISOString(), dueDate: new Date(now + 15*24*60*60*1000).toISOString(), returnDate: new Date(now - 3*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 350000, readingYearMonth: '2025-02', createdAt: new Date(now - 15*24*60*60*1000).toISOString(), updatedAt: new Date(now - 3*24*60*60*1000).toISOString() });
  
  // 周八借阅记录（三年级）
  borrowRecords.push({ id: 'br_11', bookId: 'book_1', bookBarcode: 'BK001', bookTitle: '三体', bookAuthor: '刘慈欣', memberId: 'member_6', memberCardNumber: 'M006', memberName: '周八', borrowDate: new Date(now - 70*24*60*60*1000).toISOString(), dueDate: new Date(now - 40*24*60*60*1000).toISOString(), returnDate: new Date(now - 40*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 88000, readingYearMonth: '2024-12', createdAt: new Date(now - 70*24*60*60*1000).toISOString(), updatedAt: new Date(now - 40*24*60*60*1000).toISOString() });
  borrowRecords.push({ id: 'br_12', bookId: 'book_5', bookBarcode: 'BK005', bookTitle: '活着', bookAuthor: '余华', memberId: 'member_6', memberCardNumber: 'M006', memberName: '周八', borrowDate: new Date(now - 65*24*60*60*1000).toISOString(), dueDate: new Date(now - 35*24*60*60*1000).toISOString(), returnDate: new Date(now - 35*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 120000, readingYearMonth: '2024-12', createdAt: new Date(now - 65*24*60*60*1000).toISOString(), updatedAt: new Date(now - 35*24*60*60*1000).toISOString() });
  borrowRecords.push({ id: 'br_13', bookId: 'book_2', bookBarcode: 'BK002', bookTitle: '百年孤独', bookAuthor: '加西亚·马尔克斯', memberId: 'member_6', memberCardNumber: 'M006', memberName: '周八', borrowDate: new Date(now - 60*24*60*60*1000).toISOString(), dueDate: new Date(now - 30*24*60*60*1000).toISOString(), returnDate: new Date(now - 32*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 125000, readingYearMonth: '2024-12', createdAt: new Date(now - 60*24*60*60*1000).toISOString(), updatedAt: new Date(now - 32*24*60*60*1000).toISOString() });
  
  localStorage.setItem('library_borrow_records', JSON.stringify(borrowRecords));
  
  // 7. 更新会员阅读字数
  members.forEach(member => {
    const memberRecords = borrowRecords.filter(r => r.memberId === member.id && r.status === 'returned');
    const totalWords = memberRecords.reduce((sum, r) => sum + (r.wordCount || 0), 0);
    member.totalReadingWords = totalWords;
  });
  localStorage.setItem('library_members', JSON.stringify(members));
  
  // 8. 创建阅读统计
  const readingStats = [];
  borrowRecords.forEach(record => {
    if (record.status === 'returned' && record.wordCount && record.readingYearMonth) {
      const member = members.find(m => m.id === record.memberId);
      if (member) {
        readingStats.push({
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
  localStorage.setItem('library_reading_stats', JSON.stringify(readingStats));
  
  // 9. 系统设置
  const settings = {
    libraryName: 'LibraHub 图书馆',
    libraryAddress: '示例地址',
    libraryPhone: '010-12345678',
    libraryEmail: 'library@example.com',
    maxBorrowDays: 30,
    maxRenewTimes: 2,
    renewDays: 15,
    overdueFinePerDay: 1,
    allowOverdueBorrow: false
  };
  localStorage.setItem('library_settings', JSON.stringify(settings));
  
  console.log('✅ 测试数据初始化完成！');
  console.log('📊 数据统计：');
  console.log('  - 书籍分类：', categories.length);
  console.log('  - 会员类型：', memberTypes.length);
  console.log('  - 会员分组：', groups.length);
  console.log('  - 书籍：', books.length);
  console.log('  - 会员：', members.length);
  console.log('  - 借阅记录：', borrowRecords.length);
  console.log('  - 已归还记录：', borrowRecords.filter(r => r.status === 'returned').length);
  console.log('  - 阅读统计：', readingStats.length);
  console.log('\n📖 阅读字数排行预览：');
  members.sort((a, b) => b.totalReadingWords - a.totalReadingWords).forEach((m, i) => {
    console.log(`  ${i+1}. ${m.name} (${groups.find(g => g.id === m.groupId)?.name || '未分组'}): ${m.totalReadingWords.toLocaleString()}字`);
  });
  
  console.log('\n🔄 页面将在3秒后刷新...');
  setTimeout(() => window.location.reload(), 3000);
})();
