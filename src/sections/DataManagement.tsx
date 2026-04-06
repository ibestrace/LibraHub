import { useState, useRef, useEffect } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { OperatorService } from '@/services/operator';
import { IsbnService } from '@/services/isbn';
import {
  Download,
  Upload,
  Database,
  Trash2,
  AlertTriangle,
  HardDrive,
  TestTube2,
  Lock,
  BookOpen,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { OperatorPasswordModal } from '@/components/OperatorPasswordModal';
import { SetPasswordModal } from '@/components/SetPasswordModal';
import type { Book } from '@/types';

export default function DataManagement() {
  const { state, exportData, importData, addBook } = useLibrary();
  const { statistics } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 弹窗状态
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isPasswordSet, setIsPasswordSet] = useState(false);

  // ISBN 批量导入状态
  const [isIsbnImportOpen, setIsIsbnImportOpen] = useState(false);
  const [isbnTextInput, setIsbnTextInput] = useState('');
  const [isbnImportResults, setIsbnImportResults] = useState<Array<{
    isbn: string;
    originalIsbn: string;
    result: Partial<Book> | null;
    error: string | null;
    status: 'pending' | 'processing' | 'success' | 'failed';
  }>>([]);
  const [isIsbnProcessing, setIsIsbnProcessing] = useState(false);
  const isbnFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsPasswordSet(OperatorService.isPasswordSet());
  }, []);

  // 计算数据大小
  const calculateDataSize = () => {
    const data = exportData();
    const sizeInBytes = new Blob([data]).size;
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 导出数据
  const handleExport = () => {
    try {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `library_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('数据备份成功');
    } catch (error) {
      toast.error('备份失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 选择导入文件
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // 读取导入文件
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);

        // 验证数据格式
        if (!data.version || !data.books || !data.members) {
          toast.error('无效的备份文件格式');
          return;
        }

        setImportPreview({
          version: data.version,
          exportTime: data.exportTime,
          booksCount: data.books?.length || 0,
          membersCount: data.members?.length || 0,
          borrowRecordsCount: data.borrowRecords?.length || 0,
          data: event.target?.result as string
        });
        setIsImportDialogOpen(true);
      } catch (error) {
        toast.error('文件解析失败');
      }
    };
    reader.readAsText(file);

    // 清空 input，允许重复选择同一文件
    e.target.value = '';
  };

  // 确认导入
  const handleImportConfirm = () => {
    if (!importPreview?.data) return;

    try {
      const success = importData(importPreview.data);
      if (success) {
        toast.success('数据恢复成功');
        setIsImportDialogOpen(false);
        setImportPreview(null);
      } else {
        toast.error('数据恢复失败');
      }
    } catch (error) {
      toast.error('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 要求密码验证
  const requirePassword = (action: () => void) => {
    if (!isPasswordSet) {
      // 未设置密码，先设置
      setIsSetPasswordModalOpen(true);
    } else {
      // 已设置密码，验证
      setPendingAction(() => action);
      setIsPasswordModalOpen(true);
    }
  };

  // 密码验证通过后的回调
  const handlePasswordVerified = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // 密码设置后的回调
  const handlePasswordSet = () => {
    setIsPasswordSet(true);
    setIsSetPasswordModalOpen(false);
  };

  // 清空所有数据
  const handleClearAll = () => {
    try {
      localStorage.clear();
      toast.success('所有数据已清空，页面将刷新');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('清空失败');
    }
  };

  // 带密码验证的清空数据
  const handleClearAllWithPassword = () => {
    requirePassword(handleClearAll);
  };

  // 带密码验证的导入
  const handleImportWithPassword = () => {
    requirePassword(handleImportConfirm);
  };

  // 初始化测试数据
  const handleInitTestData = () => {
    try {
      // 清空现有数据
      localStorage.clear();

      const now = Date.now();

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
        { id: 'mt_2', name: 'VIP 会员', durationMonths: 12, maxBorrowCount: 10, maxBorrowDays: 45, renewTimes: 3, renewDays: 20, depositAmount: 200, fee: 100, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
      localStorage.setItem('library_member_types', JSON.stringify(memberTypes));

      // 3. 会员分组
      const groups = [
        { id: 'group_1', name: '一年级', description: '一年级学生', color: '#3B82F6', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'group_2', name: '二年级', description: '二年级学生', color: '#10B981', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'group_3', name: '三年级', description: '三年级学生', color: '#F59E0B', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
      localStorage.setItem('library_member_groups', JSON.stringify(groups));

      // 4. 书籍（包含字数信息）
      const books = [
        { id: 'book_1', barcode: 'BK001', isbn: '978-7-111-12345-6', title: '三体', author: '刘慈欣', publisher: '重庆出版社', categoryId: 'cat_1', categoryName: '文学小说', wordCount: 88000, pageCount: 302, price: 59.8, status: 'available', totalStock: 3, availableStock: 3, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'book_2', barcode: 'BK002', isbn: '978-7-111-23456-7', title: '百年孤独', author: '加西亚·马尔克斯', publisher: '南海出版公司', categoryId: 'cat_1', categoryName: '文学小说', wordCount: 125000, pageCount: 360, price: 39.5, status: 'available', totalStock: 2, availableStock: 2, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'book_3', barcode: 'BK003', isbn: '978-7-111-34567-8', title: 'JavaScript 高级程序设计', author: 'Nicholas C. Zakas', publisher: '人民邮电出版社', categoryId: 'cat_2', categoryName: '科技计算机', wordCount: 520000, pageCount: 920, price: 129, status: 'available', totalStock: 4, availableStock: 4, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'book_4', barcode: 'BK004', isbn: '978-7-111-45678-9', title: '明朝那些事儿', author: '当年明月', publisher: '浙江人民出版社', categoryId: 'cat_3', categoryName: '历史传记', wordCount: 780000, pageCount: 1700, price: 188, status: 'available', totalStock: 2, availableStock: 2, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'book_5', barcode: 'BK005', isbn: '978-7-111-56789-0', title: '活着', author: '余华', publisher: '作家出版社', categoryId: 'cat_1', categoryName: '文学小说', wordCount: 120000, pageCount: 191, price: 29, status: 'available', totalStock: 3, availableStock: 3, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'book_6', barcode: 'BK006', isbn: '978-7-111-67890-1', title: 'React 进阶之路', author: '徐超', publisher: '电子工业出版社', categoryId: 'cat_2', categoryName: '科技计算机', wordCount: 350000, pageCount: 420, price: 89, status: 'available', totalStock: 3, availableStock: 3, borrowCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
      localStorage.setItem('library_books', JSON.stringify(books));

      // 5. 会员（已分配分组）
      const members = [
        { id: 'member_1', cardNumber: 'M001', name: '张三', gender: 'male', phone: '13800138001', email: 'zhangsan@example.com', memberType: memberTypes[1], status: 'active', registerDate: new Date(now - 180*24*60*60*1000).toISOString(), expireDate: new Date(now + 180*24*60*60*1000).toISOString(), maxBorrowCount: 10, currentBorrowCount: 0, groupId: 'group_1', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'member_2', cardNumber: 'M002', name: '李四', gender: 'female', phone: '13800138002', email: 'lisi@example.com', memberType: memberTypes[0], status: 'active', registerDate: new Date(now - 240*24*60*60*1000).toISOString(), expireDate: new Date(now + 120*24*60*60*1000).toISOString(), maxBorrowCount: 5, currentBorrowCount: 0, groupId: 'group_1', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'member_3', cardNumber: 'M003', name: '王五', gender: 'male', phone: '13800138003', email: 'wangwu@example.com', memberType: memberTypes[1], status: 'active', registerDate: new Date(now - 90*24*60*60*1000).toISOString(), expireDate: new Date(now + 270*24*60*60*1000).toISOString(), maxBorrowCount: 10, currentBorrowCount: 0, groupId: 'group_2', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'member_4', cardNumber: 'M004', name: '赵六', gender: 'female', phone: '13800138004', email: 'zhaoliu@example.com', memberType: memberTypes[0], status: 'active', registerDate: new Date(now - 300*24*60*60*1000).toISOString(), expireDate: new Date(now + 60*24*60*60*1000).toISOString(), maxBorrowCount: 5, currentBorrowCount: 0, groupId: 'group_2', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'member_5', cardNumber: 'M005', name: '孙七', gender: 'male', phone: '13800138005', email: 'sunqi@example.com', memberType: memberTypes[1], status: 'active', registerDate: new Date(now - 150*24*60*60*1000).toISOString(), expireDate: new Date(now + 210*24*60*60*1000).toISOString(), maxBorrowCount: 10, currentBorrowCount: 0, groupId: 'group_3', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'member_6', cardNumber: 'M006', name: '周八', gender: 'female', phone: '13800138006', email: 'zhouba@example.com', memberType: memberTypes[0], status: 'active', registerDate: new Date(now - 365*24*60*60*1000).toISOString(), expireDate: new Date().toISOString(), maxBorrowCount: 5, currentBorrowCount: 0, groupId: 'group_3', totalReadingWords: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];

      // 6. 借阅记录（已归还，包含阅读字数）
      const borrowRecords = [
        // 张三（一年级）
        { id: 'br_1', bookId: 'book_1', bookBarcode: 'BK001', bookTitle: '三体', bookAuthor: '刘慈欣', memberId: 'member_1', memberCardNumber: 'M001', memberName: '张三', borrowDate: new Date(now - 60*24*60*60*1000).toISOString(), dueDate: new Date(now - 30*24*60*60*1000).toISOString(), returnDate: new Date(now - 30*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 88000, readingYearMonth: '2025-01', createdAt: new Date(now - 60*24*60*60*1000).toISOString(), updatedAt: new Date(now - 30*24*60*60*1000).toISOString() },
        { id: 'br_2', bookId: 'book_3', bookBarcode: 'BK003', bookTitle: 'JavaScript 高级程序设计', bookAuthor: 'Nicholas C. Zakas', memberId: 'member_1', memberCardNumber: 'M001', memberName: '张三', borrowDate: new Date(now - 50*24*60*60*1000).toISOString(), dueDate: new Date(now - 20*24*60*60*1000).toISOString(), returnDate: new Date(now - 25*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 520000, readingYearMonth: '2025-01', createdAt: new Date(now - 50*24*60*60*1000).toISOString(), updatedAt: new Date(now - 25*24*60*60*1000).toISOString() },
        // 李四（一年级）
        { id: 'br_3', bookId: 'book_2', bookBarcode: 'BK002', bookTitle: '百年孤独', bookAuthor: '加西亚·马尔克斯', memberId: 'member_2', memberCardNumber: 'M002', memberName: '李四', borrowDate: new Date(now - 45*24*60*60*1000).toISOString(), dueDate: new Date(now - 15*24*60*60*1000).toISOString(), returnDate: new Date(now - 20*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 125000, readingYearMonth: '2025-01', createdAt: new Date(now - 45*24*60*60*1000).toISOString(), updatedAt: new Date(now - 20*24*60*60*1000).toISOString() },
        { id: 'br_4', bookId: 'book_5', bookBarcode: 'BK005', bookTitle: '活着', bookAuthor: '余华', memberId: 'member_2', memberCardNumber: 'M002', memberName: '李四', borrowDate: new Date(now - 35*24*60*60*1000).toISOString(), dueDate: new Date(now - 5*24*60*60*1000).toISOString(), returnDate: new Date(now - 15*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 120000, readingYearMonth: '2025-01', createdAt: new Date(now - 35*24*60*60*1000).toISOString(), updatedAt: new Date(now - 15*24*60*60*1000).toISOString() },
        // 王五（二年级）- 阅读最多
        { id: 'br_5', bookId: 'book_1', bookBarcode: 'BK001', bookTitle: '三体', bookAuthor: '刘慈欣', memberId: 'member_3', memberCardNumber: 'M003', memberName: '王五', borrowDate: new Date(now - 40*24*60*60*1000).toISOString(), dueDate: new Date(now - 10*24*60*60*1000).toISOString(), returnDate: new Date(now - 18*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 88000, readingYearMonth: '2025-01', createdAt: new Date(now - 40*24*60*60*1000).toISOString(), updatedAt: new Date(now - 18*24*60*60*1000).toISOString() },
        { id: 'br_6', bookId: 'book_6', bookBarcode: 'BK006', bookTitle: 'React 进阶之路', bookAuthor: '徐超', memberId: 'member_3', memberCardNumber: 'M003', memberName: '王五', borrowDate: new Date(now - 30*24*60*60*1000).toISOString(), dueDate: new Date(now).toISOString(), returnDate: new Date(now - 12*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 350000, readingYearMonth: '2025-01', createdAt: new Date(now - 30*24*60*60*1000).toISOString(), updatedAt: new Date(now - 12*24*60*60*1000).toISOString() },
        { id: 'br_7', bookId: 'book_4', bookBarcode: 'BK004', bookTitle: '明朝那些事儿', bookAuthor: '当年明月', memberId: 'member_3', memberCardNumber: 'M003', memberName: '王五', borrowDate: new Date(now - 20*24*60*60*1000).toISOString(), dueDate: new Date(now + 10*24*60*60*1000).toISOString(), returnDate: new Date(now - 5*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 780000, readingYearMonth: '2025-02', createdAt: new Date(now - 20*24*60*60*1000).toISOString(), updatedAt: new Date(now - 5*24*60*60*1000).toISOString() },
        // 赵六（二年级）
        { id: 'br_8', bookId: 'book_2', bookBarcode: 'BK002', bookTitle: '百年孤独', bookAuthor: '加西亚·马尔克斯', memberId: 'member_4', memberCardNumber: 'M004', memberName: '赵六', borrowDate: new Date(now - 55*24*60*60*1000).toISOString(), dueDate: new Date(now - 25*24*60*60*1000).toISOString(), returnDate: new Date(now - 28*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 125000, readingYearMonth: '2025-01', createdAt: new Date(now - 55*24*60*60*1000).toISOString(), updatedAt: new Date(now - 28*24*60*60*1000).toISOString() },
        // 孙七（三年级）
        { id: 'br_9', bookId: 'book_3', bookBarcode: 'BK003', bookTitle: 'JavaScript 高级程序设计', bookAuthor: 'Nicholas C. Zakas', memberId: 'member_5', memberCardNumber: 'M005', memberName: '孙七', borrowDate: new Date(now - 25*24*60*60*1000).toISOString(), dueDate: new Date(now + 5*24*60*60*1000).toISOString(), returnDate: new Date(now - 8*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 520000, readingYearMonth: '2025-02', createdAt: new Date(now - 25*24*60*60*1000).toISOString(), updatedAt: new Date(now - 8*24*60*60*1000).toISOString() },
        { id: 'br_10', bookId: 'book_6', bookBarcode: 'BK006', bookTitle: 'React 进阶之路', bookAuthor: '徐超', memberId: 'member_5', memberCardNumber: 'M005', memberName: '孙七', borrowDate: new Date(now - 15*24*60*60*1000).toISOString(), dueDate: new Date(now + 15*24*60*60*1000).toISOString(), returnDate: new Date(now - 3*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 350000, readingYearMonth: '2025-02', createdAt: new Date(now - 15*24*60*60*1000).toISOString(), updatedAt: new Date(now - 3*24*60*60*1000).toISOString() },
        // 周八（三年级）
        { id: 'br_11', bookId: 'book_1', bookBarcode: 'BK001', bookTitle: '三体', bookAuthor: '刘慈欣', memberId: 'member_6', memberCardNumber: 'M006', memberName: '周八', borrowDate: new Date(now - 70*24*60*60*1000).toISOString(), dueDate: new Date(now - 40*24*60*60*1000).toISOString(), returnDate: new Date(now - 40*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 88000, readingYearMonth: '2024-12', createdAt: new Date(now - 70*24*60*60*1000).toISOString(), updatedAt: new Date(now - 40*24*60*60*1000).toISOString() },
        { id: 'br_12', bookId: 'book_5', bookBarcode: 'BK005', bookTitle: '活着', bookAuthor: '余华', memberId: 'member_6', memberCardNumber: 'M006', memberName: '周八', borrowDate: new Date(now - 65*24*60*60*1000).toISOString(), dueDate: new Date(now - 35*24*60*60*1000).toISOString(), returnDate: new Date(now - 35*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 120000, readingYearMonth: '2024-12', createdAt: new Date(now - 65*24*60*60*1000).toISOString(), updatedAt: new Date(now - 35*24*60*60*1000).toISOString() },
        { id: 'br_13', bookId: 'book_2', bookBarcode: 'BK002', bookTitle: '百年孤独', bookAuthor: '加西亚·马尔克斯', memberId: 'member_6', memberCardNumber: 'M006', memberName: '周八', borrowDate: new Date(now - 60*24*60*60*1000).toISOString(), dueDate: new Date(now - 30*24*60*60*1000).toISOString(), returnDate: new Date(now - 32*24*60*60*1000).toISOString(), status: 'returned', renewCount: 0, fineAmount: 0, operator: '系统', wordCount: 125000, readingYearMonth: '2024-12', createdAt: new Date(now - 60*24*60*60*1000).toISOString(), updatedAt: new Date(now - 32*24*60*60*1000).toISOString() }
      ];
      localStorage.setItem('library_borrow_records', JSON.stringify(borrowRecords));

      // 更新会员阅读字数
      members.forEach(member => {
        const memberRecords = borrowRecords.filter(r => r.memberId === member.id && r.status === 'returned');
        const totalWords = memberRecords.reduce((sum, r) => sum + (r.wordCount || 0), 0);
        member.totalReadingWords = totalWords;
      });
      localStorage.setItem('library_members', JSON.stringify(members));

      // 创建阅读统计
      const readingStats: Array<{
        id: string;
        memberId: string;
        memberName: string;
        groupId?: string;
        yearMonth: string;
        totalWords: number;
        bookCount: number;
        updatedAt?: string;
      }> = [];
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

      // 系统设置
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

      toast.success('测试数据初始化成功！页面即将刷新', { duration: 2000 });
      setIsTestDialogOpen(false);

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast.error('初始化失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // ==================== ISBN 批量导入 ====================

  // 处理 ISBN 文本输入（每行一个 ISBN）
  const handleIsbnTextInput = async () => {
    const isbns = isbnTextInput
      .split(/[\n,;，；]/)
      .map(line => line.trim())
      .filter(Boolean);

    if (isbns.length === 0) {
      toast.error('请输入至少一个 ISBN');
      return;
    }

    if (isbns.length > 50) {
      toast.error('单次最多处理 50 个 ISBN');
      return;
    }

    setIsIsbnProcessing(true);
    setIsbnImportResults(isbns.map(isbn => ({
      isbn,
      originalIsbn: isbn,
      result: null,
      error: null,
      status: 'pending' as const,
    })));

    // 更新状态为 processing
    setIsbnImportResults(prev => prev.map(item => ({ ...item, status: 'processing' as const })));

    try {
      const results = await IsbnService.batchProcessIsbns(isbns, 3);
      
      setIsbnImportResults(results.map(r => ({
        ...r,
        status: r.result ? 'success' as const : 'failed' as const,
      })));

      const successCount = results.filter(r => r.result).length;
      const failCount = results.filter(r => !r.result).length;
      
      toast.success(`查询完成：${successCount} 个成功，${failCount} 个失败`);
    } catch (error) {
      toast.error('批量查询失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsIsbnProcessing(false);
    }
  };

  // 处理 CSV 文件导入
  const handleIsbnCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // 解析 CSV：支持逗号、制表符分隔
        const lines = text.split(/[\r\n]+/).filter(Boolean);
        const isbns: string[] = [];
        
        for (const line of lines) {
          // 跳过表头
          if (line.toLowerCase().includes('isbn') && isbns.length === 0) continue;
          
          const cols = line.split(/[,\t;，；]/);
          for (const col of cols) {
            const cleaned = col.trim().replace(/["'\s]/g, '');
            if (cleaned && /^\d{9}[\dXx]$|^\d{13}$/.test(cleaned)) {
              isbns.push(cleaned);
            }
          }
        }

        if (isbns.length === 0) {
          toast.error('CSV 文件中未找到有效的 ISBN');
          return;
        }

        setIsbnTextInput(isbns.join('\n'));
        toast.success(`已解析 ${isbns.length} 个 ISBN`);
      } catch (error) {
        toast.error('CSV 解析失败');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 将查询成功的书籍添加到图书馆
  const handleAddIsbnBooks = () => {
    const successResults = isbnImportResults.filter(r => r.result && r.status === 'success');
    
    let addedCount = 0;
    let skippedCount = 0;

    for (const item of successResults) {
      if (!item.result) continue;
      
      const bookInfo = item.result;
      // 生成条形码
      const barcode = `ISBN_${item.isbn}`;

      // 检查是否已存在
      const existingBook = state.books.find((b: Book) => b.isbn === item.isbn);
      if (existingBook) {
        skippedCount++;
        continue;
      }

      addBook({
        barcode,
        isbn: item.isbn,
        title: bookInfo.title || '未知书名',
        author: bookInfo.author || '',
        publisher: bookInfo.publisher || '',
        publishDate: bookInfo.publishDate || '',
        pageCount: bookInfo.pageCount || 0,
        price: bookInfo.price || undefined,
        cover: bookInfo.cover || '',
        categoryId: '',
        status: 'available',
        totalStock: 1,
        availableStock: 1,
      });
      addedCount++;
    }

    toast.success(`已添加 ${addedCount} 本书${skippedCount > 0 ? `，跳过 ${skippedCount} 本已存在的` : ''}`);
    setIsIsbnImportOpen(false);
    setIsbnTextInput('');
    setIsbnImportResults([]);
  };

  return (
    <div className="space-y-6">
      {/* 数据概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">书籍数据</p>
                <p className="text-2xl font-bold">{statistics.totalBooks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">会员数据</p>
                <p className="text-2xl font-bold">{statistics.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">借阅记录</p>
                <p className="text-2xl font-bold">{statistics.totalBorrows}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">数据大小</p>
                <p className="text-2xl font-bold">{calculateDataSize()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 备份和恢复 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 数据备份 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              数据备份
            </CardTitle>
            <CardDescription>
              将所有数据导出为 JSON 文件，用于备份或迁移
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">备份内容:</span>
                <span className="font-medium">书籍、会员、借阅记录、分类、设置</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">文件格式:</span>
                <span className="font-medium">JSON</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">数据大小:</span>
                <span className="font-medium">{calculateDataSize()}</span>
              </div>
            </div>
            <Button onClick={handleExport} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              立即备份
            </Button>
          </CardContent>
        </Card>

        {/* 数据恢复 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              数据恢复
            </CardTitle>
            <CardDescription>
              从备份文件恢复数据，将覆盖现有数据
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">警告</p>
                  <p>恢复数据将覆盖当前所有数据，请确保已备份重要数据。</p>
                </div>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button onClick={handleSelectFile} variant="outline" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              选择备份文件
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 数据清理 */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            数据清理
          </CardTitle>
          <CardDescription>
            清空所有数据，此操作不可恢复
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium">危险操作</p>
                <p>此操作将永久删除所有数据，包括书籍、会员、借阅记录等。请确保已备份重要数据。</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {isPasswordSet ? '已启用密码保护' : '未设置密码，首次操作将设置管理员密码'}
            </span>
          </div>
          <Button
            variant="destructive"
            onClick={handleClearAllWithPassword}
            className="w-full md:w-auto mt-4"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            清空所有数据
          </Button>
        </CardContent>
      </Card>

      {/* ISBN 批量导入 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-600">
            <BookOpen className="w-5 h-5" />
            ISBN 批量导入
          </CardTitle>
          <CardDescription>
            通过 ISBN 批量查询书籍信息并添加到图书馆
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg mb-4">
            <div className="text-sm text-indigo-800">
              <p className="font-medium mb-2">支持以下方式：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>手动输入 ISBN（每行一个，支持逗号/分号分隔）</li>
                <li>上传 CSV 文件（自动识别 ISBN 列）</li>
                <li>单次最多处理 50 个 ISBN</li>
                <li>自动查询 5 个数据源，智能填充书籍信息</li>
              </ul>
            </div>
          </div>
          <Button
            onClick={() => setIsIsbnImportOpen(true)}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            ISBN 批量导入
          </Button>
        </CardContent>
      </Card>

      {/* 测试数据初始化 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-600">
            <TestTube2 className="w-5 h-5" />
            测试数据
          </CardTitle>
          <CardDescription>
            初始化测试数据，体验完整功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-4">
            <div className="text-sm text-purple-800">
              <p className="font-medium mb-2">将生成以下测试数据：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>3 个会员分组（一年级、二年级、三年级）</li>
                <li>6 本书籍（含字数信息）</li>
                <li>6 名会员（已分配分组）</li>
                <li>13 条借阅记录（已归还，含阅读统计）</li>
              </ul>
              <p className="mt-3 text-xs text-purple-600">注意：这将清空现有数据</p>
            </div>
          </div>
          <Button
            onClick={() => setIsTestDialogOpen(true)}
            className="w-full md:w-auto bg-purple-600 hover:bg-purple-700"
          >
            <TestTube2 className="w-4 h-4 mr-2" />
            初始化测试数据
          </Button>
        </CardContent>
      </Card>

      {/* 导入预览弹窗 */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认恢复数据</DialogTitle>
          </DialogHeader>
          {importPreview && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">备份版本:</span>
                  <span className="font-medium">{importPreview.version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">备份时间:</span>
                  <span className="font-medium">
                    {importPreview.exportTime
                      ? format(new Date(importPreview.exportTime), 'yyyy-MM-dd HH:mm:ss')
                      : '未知'
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">书籍数量:</span>
                  <span className="font-medium">{importPreview.booksCount} 本</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">会员数量:</span>
                  <span className="font-medium">{importPreview.membersCount} 人</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">借阅记录:</span>
                  <span className="font-medium">{importPreview.borrowRecordsCount} 条</span>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <p className="text-sm text-red-800">
                  <span className="font-medium">注意:</span> 恢复数据将覆盖当前所有数据，此操作不可撤销。
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>取消</Button>
            <Button onClick={handleImportWithPassword}>确认恢复</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清空确认弹窗 */}
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">确认清空所有数据</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">此操作将永久删除以下数据：</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>所有书籍信息 ({statistics.totalBooks} 本)</li>
                    <li>所有会员信息 ({statistics.totalMembers} 人)</li>
                    <li>所有借阅记录 ({statistics.totalBorrows} 条)</li>
                    <li>所有分类和设置</li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-gray-600">
              确定要继续吗？此操作不可恢复！
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleClearAll}>确认清空</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 测试数据确认弹窗 */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-purple-600">确认初始化测试数据</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <div className="text-sm text-purple-800">
                <p className="font-medium mb-2">将生成以下测试数据：</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>✅ 3 个会员分组（一年级、二年级、三年级）</li>
                  <li>✅ 6 本书籍（含字数信息）</li>
                  <li>✅ 6 名会员（已分配分组）</li>
                  <li>✅ 13 条借阅记录（已归还，含阅读统计）</li>
                  <li>✅ 完整的阅读排行榜数据</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-center text-gray-600">
              这将清空现有数据并替换为测试数据，确定继续吗？
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>取消</Button>
            <Button onClick={handleInitTestData} className="bg-purple-600 hover:bg-purple-700">
              确认初始化
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ISBN 批量导入弹窗 */}
      <Dialog open={isIsbnImportOpen} onOpenChange={setIsIsbnImportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <BookOpen className="w-5 h-5" />
              ISBN 批量导入
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>输入 ISBN（每行一个，支持逗号/分号分隔）</Label>
              <textarea
                value={isbnTextInput}
                onChange={(e) => setIsbnTextInput(e.target.value)}
                placeholder={"9787111123456\n9787111234567\n9787111345678"}
                className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isIsbnProcessing}
              />
            </div>

            <div className="space-y-2">
              <Label>或上传 CSV 文件</Label>
              <input
                ref={isbnFileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleIsbnCsvFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => isbnFileInputRef.current?.click()}
                disabled={isIsbnProcessing}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                选择 CSV 文件
              </Button>
            </div>

            <Button
              onClick={handleIsbnTextInput}
              disabled={isIsbnProcessing || !isbnTextInput.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isIsbnProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  查询中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  开始查询
                </>
              )}
            </Button>

            {isbnImportResults.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>查询结果</Label>
                  <div className="flex gap-2">
                    <span className="text-xs text-green-600">
                      ✓ {isbnImportResults.filter(r => r.status === 'success').length}
                    </span>
                    <span className="text-xs text-red-500">
                      ✗ {isbnImportResults.filter(r => r.status === 'failed').length}
                    </span>
                  </div>
                </div>

                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {isbnImportResults.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-md text-sm ${
                        item.status === 'success'
                          ? 'bg-green-50 border border-green-200'
                          : item.status === 'failed'
                          ? 'bg-red-50 border border-red-200'
                          : item.status === 'processing'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.status === 'processing' && (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
                        )}
                        {item.status === 'success' && (
                          <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                        )}
                        {item.status === 'failed' && (
                          <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                        )}
                        {item.status === 'pending' && (
                          <span className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
                        )}
                        <span className="truncate font-mono text-xs">{item.isbn}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {item.status === 'success' && item.result?.title
                          ? item.result.title.slice(0, 15)
                          : item.status === 'failed'
                          ? item.error || '查询失败'
                          : item.status === 'processing'
                          ? '查询中...'
                          : '等待中'}
                      </span>
                    </div>
                  ))}
                </div>

                {isbnImportResults.some(r => r.status === 'success') && !isIsbnProcessing && (
                  <Button
                    onClick={handleAddIsbnBooks}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加 {isbnImportResults.filter(r => r.status === 'success').length} 本书到图书馆
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsIsbnImportOpen(false);
              setIsbnTextInput('');
              setIsbnImportResults([]);
            }}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ISBN 批量导入弹窗 */}
      <Dialog open={isIsbnImportOpen} onOpenChange={setIsIsbnImportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <BookOpen className="w-5 h-5" />
              ISBN 批量导入
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>输入 ISBN（每行一个，支持逗号/分号分隔）</Label>
              <textarea
                value={isbnTextInput}
                onChange={(e) => setIsbnTextInput(e.target.value)}
                placeholder={"9787111123456\n9787111234567\n9787111345678"}
                className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isIsbnProcessing}
              />
            </div>

            <div className="space-y-2">
              <Label>或上传 CSV 文件</Label>
              <input
                ref={isbnFileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleIsbnCsvFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => isbnFileInputRef.current?.click()}
                disabled={isIsbnProcessing}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                选择 CSV 文件
              </Button>
            </div>

            <Button
              onClick={handleIsbnTextInput}
              disabled={isIsbnProcessing || !isbnTextInput.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isIsbnProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  查询中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  开始查询
                </>
              )}
            </Button>

            {isbnImportResults.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>查询结果</Label>
                  <div className="flex gap-2">
                    <span className="text-xs text-green-600">
                      ✓ {isbnImportResults.filter(r => r.status === 'success').length}
                    </span>
                    <span className="text-xs text-red-500">
                      ✗ {isbnImportResults.filter(r => r.status === 'failed').length}
                    </span>
                  </div>
                </div>

                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {isbnImportResults.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-md text-sm ${
                        item.status === 'success'
                          ? 'bg-green-50 border border-green-200'
                          : item.status === 'failed'
                          ? 'bg-red-50 border border-red-200'
                          : item.status === 'processing'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.status === 'processing' && (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
                        )}
                        {item.status === 'success' && (
                          <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                        )}
                        {item.status === 'failed' && (
                          <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                        )}
                        {item.status === 'pending' && (
                          <span className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
                        )}
                        <span className="truncate font-mono text-xs">{item.isbn}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {item.status === 'success' && item.result?.title
                          ? item.result.title.slice(0, 15)
                          : item.status === 'failed'
                          ? item.error || '查询失败'
                          : item.status === 'processing'
                          ? '查询中...'
                          : '等待中'}
                      </span>
                    </div>
                  ))}
                </div>

                {isbnImportResults.some(r => r.status === 'success') && !isIsbnProcessing && (
                  <Button
                    onClick={handleAddIsbnBooks}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加 {isbnImportResults.filter(r => r.status === 'success').length} 本书到图书馆
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsIsbnImportOpen(false);
              setIsbnTextInput('');
              setIsbnImportResults([]);
            }}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 密码验证弹窗 */}
      <OperatorPasswordModal
        open={isPasswordModalOpen}
        onOpenChange={setIsPasswordModalOpen}
        onVerified={handlePasswordVerified}
        title="管理员验证"
        description="此操作需要管理员权限"
      />

      {/* 设置密码弹窗 */}
      <SetPasswordModal
        open={isSetPasswordModalOpen}
        onOpenChange={setIsSetPasswordModalOpen}
        onSet={handlePasswordSet}
      />
    </div>
  );
}
