import { useState, useEffect } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
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
import { MemberGroupService } from '@/services/storage';
import type { MemberGroup, Member } from '@/types';

export default function MemberGroupManagement() {
  const { state, updateMember } = useLibrary();
  const { members } = state;
  
  const [groups, setGroups] = useState<MemberGroup[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  
  const [selectedGroup, setSelectedGroup] = useState<MemberGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  
  // 加载分组数据
  useEffect(() => {
    loadGroups();
  }, []);
  
  const loadGroups = () => {
    const allGroups = MemberGroupService.getAll();
    setGroups(allGroups);
  };
  
  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6'
    });
  };
  
  // 打开添加对话框
  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };
  
  // 打开编辑对话框
  const openEditDialog = (group: MemberGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color || '#3B82F6'
    });
    setIsEditDialogOpen(true);
  };
  
  // 打开删除对话框
  const openDeleteDialog = (group: MemberGroup) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };
  
  // 打开成员管理对话框
  const openMemberDialog = (group: MemberGroup) => {
    setSelectedGroup(group);
    const groupMembers = members.filter(m => m.groupId === group.id);
    setGroupMembers(groupMembers);
    setSelectedMemberId('');
    setIsMemberDialogOpen(true);
  };
  
  // 添加分组
  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入分组名称');
      return;
    }
    
    try {
      MemberGroupService.add({
        name: formData.name,
        description: formData.description,
        color: formData.color
      });
      toast.success('分组添加成功');
      setIsAddDialogOpen(false);
      resetForm();
      loadGroups();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加失败');
    }
  };
  
  // 编辑分组
  const handleEdit = async () => {
    if (!selectedGroup || !formData.name.trim()) {
      toast.error('请输入分组名称');
      return;
    }
    
    try {
      MemberGroupService.update(selectedGroup.id, {
        name: formData.name,
        description: formData.description,
        color: formData.color
      });
      toast.success('分组更新成功');
      setIsEditDialogOpen(false);
      setSelectedGroup(null);
      resetForm();
      loadGroups();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败');
    }
  };
  
  // 删除分组
  const handleDelete = async () => {
    if (!selectedGroup) return;
    
    try {
      MemberGroupService.delete(selectedGroup.id);
      toast.success('分组删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedGroup(null);
      loadGroups();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };
  
  // 添加成员到分组
  const handleAddMember = async () => {
    if (!selectedGroup || !selectedMemberId) {
      toast.error('请选择会员');
      return;
    }
    
    try {
      await updateMember(selectedMemberId, { groupId: selectedGroup.id });
      toast.success('成员添加成功');
      const groupMembers = members.filter(m => m.groupId === selectedGroup.id);
      setGroupMembers(groupMembers);
      setSelectedMemberId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加失败');
    }
  };
  
  // 从分组移除成员
  const handleRemoveMember = async (memberId: string) => {
    try {
      await updateMember(memberId, { groupId: undefined });
      toast.success('成员移除成功');
      if (selectedGroup) {
        const groupMembers = members.filter(m => m.groupId === selectedGroup.id);
        setGroupMembers(groupMembers);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '移除失败');
    }
  };
  
  // 获取分组成员数量
  const getMemberCount = (groupId: string) => {
    return members.filter(m => m.groupId === groupId).length;
  };
  
  // 获取可添加的会员（未分组或不在当前分组）
  const getAvailableMembers = () => {
    if (!selectedGroup) return [];
    return members.filter(m => m.groupId !== selectedGroup.id);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">会员分组管理</h2>
          <p className="text-gray-500 mt-1">管理会员分组，便于统计和排行</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          添加分组
        </Button>
      </div>
      
      {/* 分组列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500">暂无分组，点击右上角添加</p>
            </CardContent>
          </Card>
        ) : (
          groups.map(group => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </div>
                  <Badge variant="outline">{getMemberCount(group.id)}人</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {group.description && (
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openMemberDialog(group)}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    成员
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(group)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDeleteDialog(group)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* 添加分组对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加分组</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">分组名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入分组名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">分组描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入分组描述"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">分组颜色</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAdd}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 编辑分组对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑分组</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">分组名称 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入分组名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">分组描述</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入分组描述"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">分组颜色</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>确定要删除分组「{selectedGroup?.name}」吗？</p>
            <p className="text-sm text-gray-500 mt-2">
              注意：该分组下有 {getMemberCount(selectedGroup?.id || '')} 名会员，无法删除
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 成员管理对话框 */}
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>管理成员 - {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 添加成员 */}
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded-md px-3 py-2"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
              >
                <option value="">选择会员添加到分组</option>
                {getAvailableMembers().map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.cardNumber})
                  </option>
                ))}
              </select>
              <Button onClick={handleAddMember} disabled={!selectedMemberId}>
                <Plus className="w-4 h-4 mr-2" />
                添加
              </Button>
            </div>
            
            {/* 成员列表 */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">会员姓名</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">会员卡号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">累计阅读字数</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groupMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        暂无成员
                      </td>
                    </tr>
                  ) : (
                    groupMembers.map(member => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{member.name}</td>
                        <td className="px-4 py-3">{member.cardNumber}</td>
                        <td className="px-4 py-3">{(member.totalReadingWords || 0).toLocaleString()}字</td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            移除
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsMemberDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
