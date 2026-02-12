import { useState, useEffect, useRef } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { 
  BookOpen, 
  Users, 
  ArrowRightLeft,
  ScanLine,
  X,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Calendar,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import type { Book, Member, BorrowRecord } from '@/types';

// 借阅状态标签
const statusLabels: Record<string, { label: string; color: string }> = {
  borrowed: { label: '借阅中', color: 'bg-blue-100 text-blue-700' },
  returned: { label: '已归还', color: 'bg-green-100 text-green-700' },
  overdue: { label: '已逾期', color: 'bg-red-100 text-red-700' },
  renewed: { label: '已续借', color: 'bg-purple-100 text-purple-700' }
};

export default function BorrowReturn() {
  const { 
    state, 
    borrowBook, 
    returnBook, 
    renewBook, 
    getBookByBarcode, 
    getMemberByCardNumber,
    getOverdueBorrows 
  } = useLibrary();
  
  const { borrowRecords } = state;

  // 当前视图
  const [activeView, setActiveView] = useState<'borrow' | 'return' | 'records' | 'overdue'>('borrow');

  // 借阅流程状态
  const [step, setStep] = useState<'scan-member' | 'scan-book' | 'confirm'>('scan-member');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // 扫码输入
  const [scanMode, setScanMode] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // 弹窗状态
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BorrowRecord | null>(null);
  const [fineAmount, setFineAmount] = useState(0);
  const [fineReason, setFineReason] = useState('');

  // 搜索
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredRecords, setFilteredRecords] = useState<BorrowRecord[]>([]);

  // 扫码模式聚焦
  useEffect(() => {
    if (scanMode && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [scanMode, step]);

  // 筛选记录
  useEffect(() => {
    let records = borrowRecords;
    
    if (activeView === 'overdue') {
      records = getOverdueBorrows();
    } else if (activeView === 'records') {
      // 只显示未归还的记录
      records = borrowRecords.filter(r => r.status === 'borrowed' || r.status === 'overdue');
    }

    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      records = records.filter(r => 
        r.bookTitle.toLowerCase().includes(kw) ||
        r.memberName.toLowerCase().includes(kw) ||
        r.bookBarcode.toLowerCase().includes(kw)
      );
    }

    setFilteredRecords(records);
  }, [activeView, searchKeyword, borrowRecords]);

  // 处理扫码
  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = (e.target as HTMLInputElement).value.trim();
      if (!code) return;

      if (step === 'scan-member') {
        const member = getMemberByCardNumber(code);
        if (member) {
          if (member.status !== 'active') {
            toast.error('该会员状态异常，无法借阅');
            return;
          }
          setSelectedMember(member);
          setStep('scan-book');
          toast.success(`会员识别成功: ${member.name}`);
        } else {
          toast.error('未找到该会员，请先注册');
        }
      } else if (step === 'scan-book') {
        const book = getBookByBarcode(code);
        if (book) {
          if (book.status !== 'available' || book.availableStock <= 0) {
            toast.error('该书籍不可借阅');
            return;
          }
          setSelectedBook(book);
          setStep('confirm');
          toast.success(`书籍识别成功: 《${book.title}》`);
        } else {
          toast.error('未找到该书籍，请先录入');
        }
      }

      (e.target as HTMLInputElement).value = '';
    }
  };

  // 确认借阅
  const handleBorrow = async () => {
    if (!selectedMember || !selectedBook) return;

    try {
      await borrowBook({
        bookId: selectedBook.id,
        memberId: selectedMember.id,
        operator: '管理员'
      });
      toast.success('借阅成功');
      resetBorrowFlow();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '借阅失败');
    }
  };

  // 重置借阅流程
  const resetBorrowFlow = () => {
    setStep('scan-member');
    setSelectedMember(null);
    setSelectedBook(null);
    setScanMode(false);
  };

  // 打开归还弹窗
  const openReturnDialog = (record: BorrowRecord) => {
    setSelectedRecord(record);
    // 计算逾期罚款 - 使用系统设置的罚款金额
    const days = differenceInDays(new Date(), new Date(record.dueDate));
    const finePerDay = state.settings.overdueFinePerDay || 1;
    if (days > 0) {
      setFineAmount(days * finePerDay);
      setFineReason(`逾期 ${days} 天`);
    } else {
      setFineAmount(0);
      setFineReason('');
    }
    setIsReturnDialogOpen(true);
  };

  // 确认归还
  const handleReturn = async () => {
    if (!selectedRecord) return;

    try {
      await returnBook({
        recordId: selectedRecord.id,
        operator: '管理员',
        fineAmount,
        fineReason
      });
      toast.success('归还成功');
      setIsReturnDialogOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '归还失败');
    }
  };

  // 打开续借弹窗
  const openRenewDialog = (record: BorrowRecord) => {
    setSelectedRecord(record);
    setIsRenewDialogOpen(true);
  };

  // 确认续借
  const handleRenew = async () => {
    if (!selectedRecord) return;

    try {
      await renewBook({
        recordId: selectedRecord.id,
        operator: '管理员'
      });
      toast.success('续借成功');
      setIsRenewDialogOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '续借失败');
    }
  };

  // 检查是否逾期
  const isOverdue = (record: BorrowRecord) => {
    return new Date() > new Date(record.dueDate) && record.status === 'borrowed';
  };

  // 渲染借阅流程
  const renderBorrowFlow = () => {
    return (
      <div className="space-y-6">
        {/* 流程步骤 */}
        <div className="flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'scan-member' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
          }`}>
            <Users className="w-5 h-5" />
            <span className="font-medium">扫描会员卡</span>
          </div>
          <ArrowRightLeft className="w-5 h-5 text-gray-400" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'scan-book' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
          }`}>
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">扫描书籍</span>
          </div>
          <ArrowRightLeft className="w-5 h-5 text-gray-400" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'confirm' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
          }`}>
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">确认借阅</span>
          </div>
        </div>

        {/* 扫描区域 */}
        {!scanMode ? (
          <div className="text-center py-8">
            <Button size="lg" onClick={() => setScanMode(true)}>
              <ScanLine className="w-5 h-5 mr-2" />
              {step === 'scan-member' ? '扫描会员卡' : '扫描书籍条形码'}
            </Button>
          </div>
        ) : (
          <Card className="border-blue-200 bg-blue-50 max-w-md mx-auto">
            <CardContent className="p-6">
              <div className="text-center">
                <ScanLine className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <p className="text-blue-600 mb-4">
                  {step === 'scan-member' 
                    ? '请将扫码枪对准会员卡条形码' 
                    : '请将扫码枪对准书籍条形码'}
                </p>
                <Input
                  ref={scanInputRef}
                  placeholder="请扫描..."
                  className="bg-white text-center"
                  onKeyDown={handleScan}
                />
                <Button 
                  variant="ghost" 
                  className="mt-4"
                  onClick={() => setScanMode(false)}
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 已选信息 */}
        {(selectedMember || selectedBook) && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">借阅信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedMember && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedMember.name}</p>
                    <p className="text-sm text-gray-500">{selectedMember.cardNumber}</p>
                    <p className="text-sm text-gray-500">
                      可借: {selectedMember.maxBorrowCount - selectedMember.currentBorrowCount} 本
                    </p>
                  </div>
                  {step !== 'scan-member' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setStep('scan-member');
                        setSelectedMember(null);
                        setSelectedBook(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}

              {selectedBook && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">《{selectedBook.title}》</p>
                    <p className="text-sm text-gray-500">{selectedBook.author}</p>
                    <p className="text-sm text-gray-500">{selectedBook.barcode}</p>
                  </div>
                  {step === 'confirm' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setStep('scan-book');
                        setSelectedBook(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}

              {step === 'confirm' && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600">应还日期:</span>
                    <span className="font-medium">
                      {selectedMember && format(new Date(Date.now() + (selectedMember.memberType.maxBorrowDays || 30) * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={resetBorrowFlow}>
                      取消
                    </Button>
                    <Button className="flex-1" onClick={handleBorrow}>
                      确认借阅
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // 渲染记录列表
  const renderRecordsList = () => {
    return (
      <div className="space-y-4">
        {/* 搜索 */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索书名、会员、条形码..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 记录列表 */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">书籍</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">会员</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">借阅日期</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">应还日期</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>暂无记录</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">《{record.bookTitle}》</p>
                            <p className="text-sm text-gray-500">{record.bookBarcode}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{record.memberName}</p>
                            <p className="text-sm text-gray-500">{record.memberCardNumber}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {format(new Date(record.borrowDate), 'yyyy-MM-dd')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={isOverdue(record) ? 'text-red-600 font-medium' : ''}>
                            {format(new Date(record.dueDate), 'yyyy-MM-dd')}
                          </span>
                          {isOverdue(record) && (
                            <span className="ml-2 text-xs text-red-600">
                              (逾期 {differenceInDays(new Date(), new Date(record.dueDate))} 天)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            isOverdue(record) 
                              ? 'bg-red-100 text-red-700' 
                              : statusLabels[record.status]?.color || 'bg-gray-100'
                          }`}>
                            {isOverdue(record) ? '已逾期' : statusLabels[record.status]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReturnDialog(record)}
                            >
                              归还
                            </Button>
                            {!isOverdue(record) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRenewDialog(record)}
                              >
                                续借
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 视图切换 */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeView === 'borrow' ? 'default' : 'outline'}
          onClick={() => {
            setActiveView('borrow');
            resetBorrowFlow();
          }}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          借书
        </Button>
        <Button
          variant={activeView === 'return' ? 'default' : 'outline'}
          onClick={() => setActiveView('return')}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          还书/续借
        </Button>
        <Button
          variant={activeView === 'records' ? 'default' : 'outline'}
          onClick={() => setActiveView('records')}
        >
          <Calendar className="w-4 h-4 mr-2" />
          当前借阅
        </Button>
        <Button
          variant={activeView === 'overdue' ? 'default' : 'outline'}
          onClick={() => setActiveView('overdue')}
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          逾期提醒
          {getOverdueBorrows().length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {getOverdueBorrows().length}
            </Badge>
          )}
        </Button>
      </div>

      {/* 内容区域 */}
      {activeView === 'borrow' ? renderBorrowFlow() : renderRecordsList()}

      {/* 归还弹窗 */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认归还</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p><span className="text-gray-600">书籍:</span> 《{selectedRecord.bookTitle}》</p>
                <p><span className="text-gray-600">会员:</span> {selectedRecord.memberName}</p>
                <p><span className="text-gray-600">借阅日期:</span> {format(new Date(selectedRecord.borrowDate), 'yyyy-MM-dd')}</p>
                <p><span className="text-gray-600">应还日期:</span> {format(new Date(selectedRecord.dueDate), 'yyyy-MM-dd')}</p>
              </div>

              {fineAmount > 0 && (
                <div className="space-y-2">
                  <Label>逾期罚款 (元)</Label>
                  <Input
                    type="number"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-sm text-red-600">{fineReason}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>备注</Label>
                <Input
                  value={fineReason}
                  onChange={(e) => setFineReason(e.target.value)}
                  placeholder="请输入备注信息"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>取消</Button>
            <Button onClick={handleReturn}>确认归还</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 续借弹窗 */}
      <Dialog open={isRenewDialogOpen} onOpenChange={setIsRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认续借</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p><span className="text-gray-600">书籍:</span> 《{selectedRecord.bookTitle}》</p>
                <p><span className="text-gray-600">会员:</span> {selectedRecord.memberName}</p>
                <p><span className="text-gray-600">当前到期:</span> {format(new Date(selectedRecord.dueDate), 'yyyy-MM-dd')}</p>
                <p><span className="text-gray-600">已续借次数:</span> {selectedRecord.renewCount}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenewDialogOpen(false)}>取消</Button>
            <Button onClick={handleRenew}>确认续借</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
