import { useState, useEffect, useRef } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { IsbnService } from '@/services/isbn';
import type { IsbnQueryProgress } from '@/services/isbn/types';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ScanLine,
  BookOpen,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Check,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import type { Book } from '@/types';
import { bookStatusLabels } from '@/utils/statusLabels';

// 使用共享的状态标签工具函数

export default function BookManagement() {
  const { state, addBook, updateBook, deleteBook, searchBooks, getBookByBarcode } = useLibrary();
  const { books, categories } = state;

  // 搜索和筛选状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 弹窗状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  // 扫码输入
  const [scanMode, setScanMode] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // ISBN 自动填充状态
  const [isFetchingIsbn, setIsFetchingIsbn] = useState(false);
  const [isbnCacheStatus, setIsbnCacheStatus] = useState<'fresh' | 'cached' | null>(null);
  const [isbnProgress, setIsbnProgress] = useState<IsbnQueryProgress | null>(null);
  // ISBN 防抖定时器（扫码枪连续输入时等稳定后再查询）
  const isbnDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Book>>({
    barcode: '',
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    categoryId: '',
    totalStock: 1,
    availableStock: 1,
    status: 'available'
  });

  // 表单验证错误
  const [formErrors, setFormErrors] = useState<Record<string, string>>({
    barcode: '',
    title: '',
    author: '',
    isbn: ''
  });

  // 搜索书籍
  useEffect(() => {
    const results = searchBooks({
      keyword: searchKeyword,
      categoryId: filterCategory === 'all' ? undefined : filterCategory,
      status: filterStatus === 'all' ? undefined : filterStatus
    });
    setFilteredBooks(results);
    setCurrentPage(1);
  }, [searchKeyword, filterCategory, filterStatus, books]);

  // 扫码模式聚焦
  useEffect(() => {
    if (scanMode && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [scanMode]);

  // 清理防抖定时器，防止内存泄漏
  useEffect(() => {
    return () => {
      if (isbnDebounceRef.current) {
        clearTimeout(isbnDebounceRef.current);
      }
    };
  }, []);

  // 处理扫码
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcode = (e.target as HTMLInputElement).value.trim();
      processBarcode(barcode);
      (e.target as HTMLInputElement).value = '';
      setScanMode(false);
    }
  };

  // 处理摄像头扫码结果
  const handleCameraScan = (barcode: string) => {
    processBarcode(barcode);
  };

  // 处理条形码
  const processBarcode = (barcode: string) => {
    if (barcode) {
      // 检查是否是ISBN
      const cleanBarcode = barcode.replace(/[\s-]/g, '');
      if (IsbnService.isValidIsbn(cleanBarcode)) {
        // 是ISBN，自动填充书籍信息
        setFormData(prev => ({ ...prev, isbn: cleanBarcode }));
        handleIsbnChange(cleanBarcode);
        setIsAddDialogOpen(true);
        toast.success('ISBN扫描成功，正在自动填充书籍信息');
      } else {
        // 是普通条形码
        const existingBook = getBookByBarcode(barcode);
        if (existingBook) {
          toast.info(`找到书籍: 《${existingBook.title}》`);
          setSelectedBook(existingBook);
          setIsEditDialogOpen(true);
        } else {
          // 新书籍，打开添加弹窗并预填充条形码
          setFormData(prev => ({ ...prev, barcode }));
          setIsAddDialogOpen(true);
          toast.success('扫描成功，请完善书籍信息');
        }
      }
    }
  };

  // 加载状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 验证表单字段
  const validateField = (name: string, value: string) => {
    let error = '';
    switch (name) {
      case 'barcode':
        if (!value.trim()) {
          error = '条形码不能为空';
        }
        break;
      case 'title':
        if (!value.trim()) {
          error = '书名不能为空';
        }
        break;
      case 'author':
        if (!value.trim()) {
          error = '作者不能为空';
        }
        break;
      case 'isbn':
        if (value.trim() && !IsbnService.isValidIsbn(value.replace(/[\s-]/g, ''))) {
          error = '无效的ISBN格式';
        }
        break;
      default:
        break;
    }
    setFormErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  // 验证整个表单
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    errors.barcode = validateField('barcode', formData.barcode || '');
    errors.title = validateField('title', formData.title || '');
    errors.author = validateField('author', formData.author || '');
    if (formData.isbn) {
      errors.isbn = validateField('isbn', formData.isbn);
    }
    
    setFormErrors(errors);
    
    return Object.values(errors).every(error => error === '');
  };

  // 提交添加
  const handleAddSubmit = async () => {
    try {
      if (!validateForm()) {
        toast.error('请检查并修正表单错误');
        return;
      }
      
      setIsSubmitting(true);
      await addBook(formData as Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'borrowCount'>);
      toast.success('书籍添加成功');
      setIsAddDialogOpen(false);
      setFormData({
        barcode: '',
        isbn: '',
        title: '',
        author: '',
        publisher: '',
        categoryId: '',
        totalStock: 1,
        availableStock: 1,
        status: 'available'
      });
      setFormErrors({
        barcode: '',
        title: '',
        author: '',
        isbn: ''
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 提交编辑
  const handleEditSubmit = async () => {
    if (!selectedBook) return;
    try {
      if (!validateForm()) {
        toast.error('请检查并修正表单错误');
        return;
      }
      
      setIsSubmitting(true);
      await updateBook(selectedBook.id, formData);
      toast.success('书籍更新成功');
      setIsEditDialogOpen(false);
      setSelectedBook(null);
      setFormErrors({
        barcode: '',
        title: '',
        author: '',
        isbn: ''
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除书籍
  const handleDelete = async () => {
    if (!selectedBook) return;
    try {
      setIsSubmitting(true);
      await deleteBook(selectedBook.id);
      toast.success('书籍删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedBook(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开编辑弹窗
  const openEditDialog = (book: Book) => {
    setSelectedBook(book);
    setFormData(book);
    setIsEditDialogOpen(true);
  };

  // ISBN 变化处理：校验通过后自动查询（带防抖，适配扫码枪快速输入）
  const handleIsbnChange = (isbn: string) => {
    setFormData(prev => ({ ...prev, isbn }));
    setIsbnCacheStatus(null);
    setIsbnProgress(null);

    // 清除上一次的防抖定时器
    if (isbnDebounceRef.current) {
      clearTimeout(isbnDebounceRef.current);
    }

    const cleanIsbn = isbn.replace(/[-\s]/g, '');

    // ISBN 位数未到 10 或 13 位时不触发
    if (!cleanIsbn || !IsbnService.isValidIsbn(cleanIsbn)) {
      return;
    }

    // 300ms 防抖：等扫码枪输入完全稳定后再发请求
    isbnDebounceRef.current = setTimeout(async () => {
      setIsFetchingIsbn(true);
      try {
        // 检查是否是缓存命中
        const cacheStats = await IsbnService.getCacheStats();
        console.log(`[ISBN] 当前缓存大小: ${cacheStats.size}`);
        
        const bookInfo = await IsbnService.fetchByIsbn(cleanIsbn, (progress) => {
          setIsbnProgress(progress);
        });
        
        // 再次检查缓存状态（因为 fetchByIsbn 可能会更新缓存）
        const newCacheStats = await IsbnService.getCacheStats();
        if (newCacheStats.size === cacheStats.size && bookInfo) {
          // 缓存大小没变但有结果，说明是缓存命中
          setIsbnCacheStatus('cached');
        } else {
          setIsbnCacheStatus('fresh');
        }
        
        if (bookInfo) {
          setFormData(prev => ({
            ...prev,
            ...bookInfo,
            isbn: cleanIsbn,
          }));
          toast.success('书籍信息已自动填充');
        } else {
          toast.info('未找到书籍信息，请手动填写');
        }
      } catch (error) {
        console.error('ISBN 查询失败:', error);
        const errorType = (error as any).type || 'UNKNOWN_ERROR';
        const errorMessage = IsbnService.getErrorMessage(errorType);
        toast.error(errorMessage || '查询失败，请手动填写');
      } finally {
        setIsFetchingIsbn(false);
      }
    }, 300);
  };

  // 刷新 ISBN 缓存
  const handleRefreshIsbn = async () => {
    const cleanIsbn = formData.isbn?.replace(/[-\s]/g, '');
    if (!cleanIsbn || !IsbnService.isValidIsbn(cleanIsbn)) {
      toast.error('请输入有效的 ISBN');
      return;
    }

    setIsFetchingIsbn(true);
    setIsbnCacheStatus(null);
    try {
      const bookInfo = await IsbnService.refreshIsbn(cleanIsbn);
      if (bookInfo) {
        setFormData(prev => ({
          ...prev,
          ...bookInfo,
          isbn: cleanIsbn,
        }));
        setIsbnCacheStatus('fresh');
        toast.success('已刷新书籍信息');
      } else {
        toast.info('未找到更新的书籍信息');
      }
    } catch (error) {
      console.error('ISBN 刷新失败:', error);
      const errorType = (error as any).type || 'UNKNOWN_ERROR';
      const errorMessage = IsbnService.getErrorMessage(errorType);
      toast.error(errorMessage || '刷新失败，请稍后重试');
    } finally {
      setIsFetchingIsbn(false);
    }
  };

  // 打开删除弹窗
  const openDeleteDialog = (book: Book) => {
    setSelectedBook(book);
    setIsDeleteDialogOpen(true);
  };

  // 分页数据
  const totalPages = Math.ceil(filteredBooks.length / pageSize);
  const paginatedBooks = filteredBooks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 导出书籍数据
  const handleExport = () => {
    const data = JSON.stringify(books, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `books_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('书籍数据已导出');
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          {/* 搜索框 */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索书名、作者、条形码..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          {/* 分类筛选 */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-32 sm:w-32">
              <SelectValue placeholder="全部分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 状态筛选 */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 sm:w-32">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(bookStatusLabels).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchKeyword || filterCategory || filterStatus) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSearchKeyword('');
                setFilterCategory('all');
                setFilterStatus('all');
              }}
            >
              <X className="w-4 h-4 mr-1" />
              清除
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {/* 扫码按钮 */}
          <Button
            variant={scanMode ? "default" : "outline"}
            size="sm"
            onClick={() => setScanMode(!scanMode)}
            className="w-full sm:w-auto"
          >
            <ScanLine className="w-4 h-4 mr-2" />
            {scanMode ? '退出扫码' : '扫码'}
          </Button>

          {/* 摄像头扫码按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBarcodeScannerOpen(true)}
            className="w-full sm:w-auto"
          >
            <Camera className="w-4 h-4 mr-2" />
            摄像头扫码
          </Button>

          {/* 导出按钮 */}
          <Button variant="outline" size="sm" onClick={handleExport} className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>

          {/* 添加按钮 */}
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            添加
          </Button>
        </div>
      </div>

      {/* 扫码输入框 */}
      {scanMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <ScanLine className="w-6 h-6 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm text-blue-600 mb-2">请将扫码枪对准条形码，扫描后按回车键</p>
                <Input
                  ref={barcodeInputRef}
                  placeholder="请扫描条形码..."
                  className="bg-white"
                  onKeyDown={handleBarcodeScan}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 书籍列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] sm:min-w-[800px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">条形码</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">书名</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">作者</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 hidden sm:table-cell">出版社</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 hidden md:table-cell">分类</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">库存</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedBooks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>暂无书籍数据</p>
                    </td>
                  </tr>
                ) : (
                  paginatedBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-mono">{book.barcode}</td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium">{book.title}</td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-600">{book.author}</td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">{book.publisher}</td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {categories.find(c => c.id === book.categoryId)?.name || '未分类'}
                        </Badge>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                        {book.availableStock} / {book.totalStock}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${bookStatusLabels[book.status]?.color || 'bg-gray-100'}`}>
                          {bookStatusLabels[book.status]?.label || book.status}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(book)}
                            className="h-8 w-8"
                          >
                            <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 h-8 w-8"
                            onClick={() => openDeleteDialog(book)}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t gap-2 sm:gap-0">
              <p className="text-xs sm:text-sm text-gray-500">
                共 {filteredBooks.length} 条记录，第 {currentPage} / {totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加书籍弹窗 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>添加书籍</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>条形码 *</Label>
              <Input
                value={formData.barcode}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, barcode: value });
                  validateField('barcode', value);
                }}
                placeholder="扫描或输入条形码"
                className={formErrors.barcode ? 'border-red-300 focus:ring-red-500' : ''}
              />
              {formErrors.barcode && (
                <p className="text-xs text-red-500 mt-1">{formErrors.barcode}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                ISBN
                {isFetchingIsbn && <span className="text-xs text-muted-foreground ml-1 flex items-center"><span className="w-3 h-3 border-2 border-t-transparent border-blue-500 rounded-full animate-spin mr-1"></span>查询中...</span>}
                {isbnCacheStatus === 'cached' && !isFetchingIsbn && (
                  <span className="text-xs text-green-600 ml-1 flex items-center"><Check className="w-3 h-3 mr-1" />来自缓存</span>
                )}
                {isbnCacheStatus === 'fresh' && !isFetchingIsbn && (
                  <span className="text-xs text-blue-600 ml-1 flex items-center"><RefreshCw className="w-3 h-3 mr-1" />已刷新</span>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={formData.isbn}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleIsbnChange(value);
                    validateField('isbn', value);
                  }}
                  placeholder="扫描或输入ISBN号，自动填充书籍信息"
                  disabled={isFetchingIsbn}
                  className={`flex-1 ${formErrors.isbn ? 'border-red-300 focus:ring-red-500' : ''}`}
                />
                {formData.isbn && IsbnService.isValidIsbn(formData.isbn.replace(/[-\s]/g, '')) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRefreshIsbn}
                    disabled={isFetchingIsbn}
                    title="刷新书籍信息"
                  >
                    <RefreshCw className={`w-4 h-4 ${isFetchingIsbn ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
               {formErrors.isbn && (
                 <p className="text-xs text-red-500 mt-1">{formErrors.isbn}</p>
               )}
               {/* ISBN 查询进度指示器 */}
               {isbnProgress && !isbnProgress.isComplete && (
                 <div className="flex flex-wrap gap-1.5 mt-2">
                   {Object.entries(isbnProgress.sourceStatuses).map(([source, status]) => (
                     <span
                       key={source}
                       className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                         status === 'querying'
                           ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                           : status === 'success'
                           ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                           : status === 'failed' || status === 'timeout'
                           ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                           : 'bg-gray-50 text-gray-300 dark:bg-gray-800 dark:text-gray-600'
                       }`}
                     >
                       {status === 'querying' && (
                         <span className="w-2 h-2 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                       )}
                       {status === 'success' && '✓'}
                       {status === 'failed' && '✗'}
                       {status === 'timeout' && '⏱'}
                       {status === 'pending' && '○'}
                       {source === 'NLC' ? '国图' : source === 'DoubanWeb' ? '豆瓣' : source === 'GoogleBooks' ? 'Google' : source === 'OpenLibrary' ? 'OpenLib' : source}
                     </span>
                   ))}
                 </div>
               )}
               {/* 查询完成后的结果提示 */}
               {isbnProgress?.isComplete && isbnProgress.successfulSource && (
                 <p className="text-xs text-green-600 mt-1 flex items-center">
                   <Check className="w-3 h-3 mr-1" />
                   已从 {isbnProgress.successfulSource === 'NLC' ? '国家图书馆' : isbnProgress.successfulSource === 'DoubanWeb' ? '豆瓣' : isbnProgress.successfulSource} 获取
                 </p>
               )}
               {isbnProgress?.isComplete && !isbnProgress.successfulSource && (
                 <p className="text-xs text-gray-400 mt-1">所有数据源均未找到该 ISBN</p>
               )}
             </div>
             <div className="space-y-2 col-span-2">
               <Label>书名 *</Label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, title: value });
                  validateField('title', value);
                }}
                placeholder="请输入书名"
                className={formErrors.title ? 'border-red-300 focus:ring-red-500' : ''}
              />
              {formErrors.title && (
                <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>作者 *</Label>
              <Input
                value={formData.author}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, author: value });
                  validateField('author', value);
                }}
                placeholder="请输入作者"
                className={formErrors.author ? 'border-red-300 focus:ring-red-500' : ''}
              />
              {formErrors.author && (
                <p className="text-xs text-red-500 mt-1">{formErrors.author}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>出版社</Label>
              <Input
                value={formData.publisher}
                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                placeholder="请输入出版社"
              />
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Select 
                value={formData.categoryId || ''} 
                onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>总库存</Label>
              <Input
                type="number"
                min={1}
                value={formData.totalStock}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  totalStock: parseInt(e.target.value) || 1,
                  availableStock: parseInt(e.target.value) || 1
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>字数</Label>
              <Input
                type="number"
                value={formData.wordCount || ''}
                onChange={(e) => setFormData({ ...formData, wordCount: parseInt(e.target.value) })}
                placeholder="请输入字数"
              />
            </div>
            <div className="space-y-2">
              <Label>页数</Label>
              <Input
                type="number"
                value={formData.pageCount || ''}
                onChange={(e) => setFormData({ ...formData, pageCount: parseInt(e.target.value) })}
                placeholder="请输入页数"
              />
            </div>
            <div className="space-y-2">
              <Label>定价</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                placeholder="请输入定价"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>取消</Button>
            <Button onClick={handleAddSubmit} disabled={isSubmitting}>
              {isSubmitting && <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></span>}
              {isSubmitting ? '添加中...' : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑书籍弹窗 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>编辑书籍</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>条形码 *</Label>
              <Input
                value={formData.barcode}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, barcode: value });
                  validateField('barcode', value);
                }}
                className={formErrors.barcode ? 'border-red-300 focus:ring-red-500' : ''}
              />
              {formErrors.barcode && (
                <p className="text-xs text-red-500 mt-1">{formErrors.barcode}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                ISBN
                {isFetchingIsbn && <span className="text-xs text-muted-foreground ml-1 flex items-center"><span className="w-3 h-3 border-2 border-t-transparent border-blue-500 rounded-full animate-spin mr-1"></span>查询中...</span>}
                {isbnCacheStatus === 'cached' && !isFetchingIsbn && (
                  <span className="text-xs text-green-600 ml-1 flex items-center"><Check className="w-3 h-3 mr-1" />来自缓存</span>
                )}
                {isbnCacheStatus === 'fresh' && !isFetchingIsbn && (
                  <span className="text-xs text-blue-600 ml-1 flex items-center"><RefreshCw className="w-3 h-3 mr-1" />已刷新</span>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={formData.isbn}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleIsbnChange(value);
                    validateField('isbn', value);
                  }}
                  placeholder="扫描或输入ISBN号，自动填充书籍信息"
                  disabled={isFetchingIsbn}
                  className={`flex-1 ${formErrors.isbn ? 'border-red-300 focus:ring-red-500' : ''}`}
                />
                {formData.isbn && IsbnService.isValidIsbn(formData.isbn.replace(/[-\s]/g, '')) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRefreshIsbn}
                    disabled={isFetchingIsbn}
                    title="刷新书籍信息"
                  >
                    <RefreshCw className={`w-4 h-4 ${isFetchingIsbn ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
               {formErrors.isbn && (
                 <p className="text-xs text-red-500 mt-1">{formErrors.isbn}</p>
               )}
               {/* ISBN 查询进度指示器 */}
               {isbnProgress && !isbnProgress.isComplete && (
                 <div className="flex flex-wrap gap-1.5 mt-2">
                   {Object.entries(isbnProgress.sourceStatuses).map(([source, status]) => (
                     <span
                       key={source}
                       className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                         status === 'querying'
                           ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                           : status === 'success'
                           ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                           : status === 'failed' || status === 'timeout'
                           ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                           : 'bg-gray-50 text-gray-300 dark:bg-gray-800 dark:text-gray-600'
                       }`}
                     >
                       {status === 'querying' && (
                         <span className="w-2 h-2 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                       )}
                       {status === 'success' && '✓'}
                       {status === 'failed' && '✗'}
                       {status === 'timeout' && '⏱'}
                       {status === 'pending' && '○'}
                       {source === 'NLC' ? '国图' : source === 'DoubanWeb' ? '豆瓣' : source === 'GoogleBooks' ? 'Google' : source === 'OpenLibrary' ? 'OpenLib' : source}
                     </span>
                   ))}
                 </div>
               )}
               {/* 查询完成后的结果提示 */}
               {isbnProgress?.isComplete && isbnProgress.successfulSource && (
                 <p className="text-xs text-green-600 mt-1 flex items-center">
                   <Check className="w-3 h-3 mr-1" />
                   已从 {isbnProgress.successfulSource === 'NLC' ? '国家图书馆' : isbnProgress.successfulSource === 'DoubanWeb' ? '豆瓣' : isbnProgress.successfulSource} 获取
                 </p>
               )}
               {isbnProgress?.isComplete && !isbnProgress.successfulSource && (
                 <p className="text-xs text-gray-400 mt-1">所有数据源均未找到该 ISBN</p>
               )}
             </div>
             <div className="space-y-2 col-span-2">
               <Label>书名 *</Label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, title: value });
                  validateField('title', value);
                }}
                className={formErrors.title ? 'border-red-300 focus:ring-red-500' : ''}
              />
              {formErrors.title && (
                <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>作者 *</Label>
              <Input
                value={formData.author}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, author: value });
                  validateField('author', value);
                }}
                className={formErrors.author ? 'border-red-300 focus:ring-red-500' : ''}
              />
              {formErrors.author && (
                <p className="text-xs text-red-500 mt-1">{formErrors.author}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>出版社</Label>
              <Input
                value={formData.publisher}
                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Select 
                value={formData.categoryId || ''} 
                onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select 
                value={formData.status || 'available'} 
                onValueChange={(v) => setFormData({ ...formData, status: v as 'available' | 'borrowed' | 'reserved' | 'damaged' | 'lost' | 'under_repair' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(bookStatusLabels).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>总库存</Label>
              <Input
                type="number"
                min={1}
                value={formData.totalStock}
                onChange={(e) => {
                  const newTotal = parseInt(e.target.value) || 1;
                  const currentAvailable = formData.availableStock || 0;
                  // 如果当前可借库存大于新总库存，调整为新总库存
                  const newAvailable = Math.min(currentAvailable, newTotal);
                  setFormData({ 
                    ...formData, 
                    totalStock: newTotal,
                    availableStock: newAvailable
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>可借库存</Label>
              <Input
                type="number"
                min={0}
                max={formData.totalStock}
                value={formData.availableStock}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  // 确保可借库存不超过总库存
                  setFormData({ 
                    ...formData, 
                    availableStock: Math.min(value, formData.totalStock || 1)
                  });
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>取消</Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting && <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></span>}
              {isSubmitting ? '保存中...' : '保存修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            确定要删除书籍《{selectedBook?.title}》吗？此操作不可恢复。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></span>}
              {isSubmitting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 摄像头扫码弹窗 */}
      <BarcodeScanner
        isOpen={isBarcodeScannerOpen}
        onOpenChange={setIsBarcodeScannerOpen}
        onScan={handleCameraScan}
      />
    </div>
  );
}
