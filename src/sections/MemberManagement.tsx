import { useState, useEffect, useRef } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ScanLine,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Calendar,
  Phone,
  Mail
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
import { format, addMonths } from 'date-fns';
import type { Member, MemberType } from '@/types';

// 会员状态标签
const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: '有效', color: 'bg-green-100 text-green-700' },
  expired: { label: '已过期', color: 'bg-red-100 text-red-700' },
  suspended: { label: '已暂停', color: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: '已注销', color: 'bg-gray-100 text-gray-700' }
};

export default function MemberManagement() {
  const { state, addMember, updateMember, deleteMember, searchMembers, getMemberByCardNumber } = useLibrary();
  const { members, memberTypes } = state;

  // 搜索和筛选状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 弹窗状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // 扫码输入
  const [scanMode, setScanMode] = useState(false);
  const cardInputRef = useRef<HTMLInputElement>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Member>>({
    cardNumber: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    gender: 'male',
    memberType: undefined as unknown as MemberType,
    status: 'active',
    registerDate: format(new Date(), 'yyyy-MM-dd'),
    expireDate: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    maxBorrowCount: 5,
    deposit: 0
  });

  // 当 memberTypes 加载完成后，初始化表单默认值
  useEffect(() => {
    if (memberTypes.length > 0 && !formData.memberType) {
      const defaultType = memberTypes[0];
      setFormData(prev => ({
        ...prev,
        memberType: defaultType,
        maxBorrowCount: defaultType.maxBorrowCount,
        deposit: defaultType.depositAmount,
        expireDate: format(addMonths(new Date(), defaultType.durationMonths), 'yyyy-MM-dd')
      }));
    }
  }, [memberTypes]);

  // 搜索会员
  useEffect(() => {
    const results = searchMembers({
      keyword: searchKeyword,
      status: filterStatus === 'all' ? undefined : filterStatus
    });
    setFilteredMembers(results);
    setCurrentPage(1);
  }, [searchKeyword, filterStatus, members]);

  // 扫码模式聚焦
  useEffect(() => {
    if (scanMode && cardInputRef.current) {
      cardInputRef.current.focus();
    }
  }, [scanMode]);

  // 处理会员卡扫码
  const handleCardScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cardNumber = (e.target as HTMLInputElement).value.trim();
      if (cardNumber) {
        const existingMember = getMemberByCardNumber(cardNumber);
        if (existingMember) {
          toast.info(`找到会员: ${existingMember.name}`);
          setSelectedMember(existingMember);
          setIsViewDialogOpen(true);
        } else {
          // 新会员，打开添加弹窗并预填充卡号
          setFormData(prev => ({ 
            ...prev, 
            cardNumber,
            registerDate: format(new Date(), 'yyyy-MM-dd'),
            expireDate: format(addMonths(new Date(), prev.memberType?.durationMonths || 12), 'yyyy-MM-dd')
          }));
          setIsAddDialogOpen(true);
          toast.success('扫描成功，请完善会员信息');
        }
        (e.target as HTMLInputElement).value = '';
        setScanMode(false);
      }
    }
  };

  // 会员类型变更时更新相关字段
  const handleMemberTypeChange = (typeId: string) => {
    const type = memberTypes.find(t => t.id === typeId);
    if (type) {
      setFormData(prev => ({
        ...prev,
        memberType: type,
        maxBorrowCount: type.maxBorrowCount,
        expireDate: format(addMonths(new Date(), type.durationMonths), 'yyyy-MM-dd')
      }));
    }
  };

  // 提交添加
  const handleAddSubmit = async () => {
    try {
      if (!formData.cardNumber || !formData.name || !formData.phone) {
        toast.error('请填写必填项：会员卡号、姓名、电话');
        return;
      }
      
      await addMember(formData as Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'currentBorrowCount'>);
      toast.success('会员添加成功');
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加失败');
    }
  };

  // 提交编辑
  const handleEditSubmit = async () => {
    if (!selectedMember) return;
    try {
      await updateMember(selectedMember.id, formData);
      toast.success('会员更新成功');
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败');
    }
  };

  // 删除会员
  const handleDelete = async () => {
    if (!selectedMember) return;
    try {
      await deleteMember(selectedMember.id);
      toast.success('会员删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  // 重置表单
  const resetForm = () => {
    const defaultType = memberTypes[0];
    setFormData({
      cardNumber: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      gender: 'male',
      memberType: defaultType,
      status: 'active',
      registerDate: format(new Date(), 'yyyy-MM-dd'),
      expireDate: defaultType 
        ? format(addMonths(new Date(), defaultType.durationMonths), 'yyyy-MM-dd')
        : format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
      maxBorrowCount: defaultType?.maxBorrowCount || 5,
      deposit: defaultType?.depositAmount || 0
    });
  };

  // 打开编辑弹窗
  const openEditDialog = (member: Member) => {
    setSelectedMember(member);
    setFormData(member);
    setIsEditDialogOpen(true);
  };

  // 打开查看弹窗
  const openViewDialog = (member: Member) => {
    setSelectedMember(member);
    setIsViewDialogOpen(true);
  };

  // 打开删除弹窗
  const openDeleteDialog = (member: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  // 分页数据
  const totalPages = Math.ceil(filteredMembers.length / pageSize);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 检查会员是否过期
  const isExpired = (member: Member) => {
    return new Date(member.expireDate) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索姓名、卡号、电话..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* 状态筛选 */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(statusLabels).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchKeyword || filterStatus) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSearchKeyword('');
                setFilterStatus('all');
              }}
            >
              <X className="w-4 h-4 mr-1" />
              清除筛选
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {/* 扫码按钮 */}
          <Button
            variant={scanMode ? "default" : "outline"}
            onClick={() => setScanMode(!scanMode)}
          >
            <ScanLine className="w-4 h-4 mr-2" />
            {scanMode ? '退出扫码' : '扫码识别'}
          </Button>

          {/* 添加按钮 */}
          <Button onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            添加会员
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
                <p className="text-sm text-blue-600 mb-2">请将扫码枪对准会员卡条形码，扫描后按回车键</p>
                <Input
                  ref={cardInputRef}
                  placeholder="请扫描会员卡..."
                  className="bg-white"
                  onKeyDown={handleCardScan}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 会员列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">会员卡号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">姓名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">电话</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">会员类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">到期日期</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">借阅/限额</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>暂无会员数据</p>
                    </td>
                  </tr>
                ) : (
                  paginatedMembers.map((member) => (
                    <tr 
                      key={member.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => openViewDialog(member)}
                    >
                      <td className="px-4 py-3 text-sm font-mono">{member.cardNumber}</td>
                      <td className="px-4 py-3 text-sm font-medium">{member.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{member.phone}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="secondary">{member.memberType.name}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={isExpired(member) ? 'text-red-600' : ''}>
                          {format(new Date(member.expireDate), 'yyyy-MM-dd')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {member.currentBorrowCount} / {member.maxBorrowCount}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusLabels[member.status]?.color || 'bg-gray-100'}`}>
                          {statusLabels[member.status]?.label || member.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(member);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => openDeleteDialog(member, e)}
                          >
                            <Trash2 className="w-4 h-4" />
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
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                共 {filteredMembers.length} 条记录，第 {currentPage} / {totalPages} 页
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

      {/* 添加会员弹窗 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>添加会员</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>会员卡号 *</Label>
              <Input
                value={formData.cardNumber}
                onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                placeholder="扫描或输入会员卡号"
              />
            </div>
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>性别</Label>
              <Select 
                value={formData.gender || 'male'} 
                onValueChange={(v) => setFormData({ ...formData, gender: v as 'male' | 'female' | 'other' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男</SelectItem>
                  <SelectItem value="female">女</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>电话 *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入电话"
              />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="请输入邮箱"
              />
            </div>
            <div className="space-y-2">
              <Label>会员类型</Label>
              <Select 
                value={formData.memberType?.id || ''} 
                onValueChange={handleMemberTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择会员类型" />
                </SelectTrigger>
                <SelectContent>
                  {memberTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} (可借{type.maxBorrowCount}本)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>注册日期</Label>
              <Input
                type="date"
                value={formData.registerDate}
                onChange={(e) => setFormData({ ...formData, registerDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>到期日期</Label>
              <Input
                type="date"
                value={formData.expireDate}
                onChange={(e) => setFormData({ ...formData, expireDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>押金 (元)</Label>
              <Input
                type="number"
                value={formData.deposit}
                onChange={(e) => setFormData({ ...formData, deposit: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>地址</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="请输入地址"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>备注</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="请输入备注信息"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>取消</Button>
            <Button onClick={handleAddSubmit}>确认添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑会员弹窗 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>编辑会员</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>会员卡号 *</Label>
              <Input
                value={formData.cardNumber}
                onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>性别</Label>
              <Select 
                value={formData.gender || 'male'} 
                onValueChange={(v) => setFormData({ ...formData, gender: v as 'male' | 'female' | 'other' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男</SelectItem>
                  <SelectItem value="female">女</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>电话 *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>会员类型</Label>
              <Select 
                value={formData.memberType?.id || ''} 
                onValueChange={handleMemberTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择会员类型" />
                </SelectTrigger>
                <SelectContent>
                  {memberTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select 
                value={formData.status || 'active'} 
                onValueChange={(v) => setFormData({ ...formData, status: v as 'active' | 'expired' | 'suspended' | 'cancelled' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>到期日期</Label>
              <Input
                type="date"
                value={formData.expireDate}
                onChange={(e) => setFormData({ ...formData, expireDate: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>地址</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleEditSubmit}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看会员详情弹窗 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>会员详情</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {selectedMember.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedMember.name}</h3>
                  <p className="text-gray-500">{selectedMember.memberType.name}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">卡号:</span>
                  <span className="font-mono">{selectedMember.cardNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">电话:</span>
                  <span>{selectedMember.phone}</span>
                </div>
                {selectedMember.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">邮箱:</span>
                    <span>{selectedMember.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">到期:</span>
                  <span className={isExpired(selectedMember) ? 'text-red-600' : ''}>
                    {format(new Date(selectedMember.expireDate), 'yyyy-MM-dd')}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">借阅情况</span>
                  <span className="text-sm font-medium">
                    {selectedMember.currentBorrowCount} / {selectedMember.maxBorrowCount} 本
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${(selectedMember.currentBorrowCount / selectedMember.maxBorrowCount) * 100}%` 
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    openEditDialog(selectedMember);
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  编辑信息
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            确定要删除会员 {selectedMember?.name} 吗？此操作不可恢复。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
