import { useState, useEffect } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { 
  Building2, 
  Settings,
  Save,
  RotateCcw,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { SystemSettings } from '@/types';

export default function SystemSettingsPage() {
  const { state, updateSettings } = useLibrary();
  const { settings } = state;

  const [formData, setFormData] = useState<SystemSettings>(settings);

  // 同步设置变化
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // 保存设置
  const handleSave = async () => {
    try {
      await updateSettings(formData);
      toast.success('设置已保存');
    } catch (error) {
      toast.error('保存失败');
    }
  };

  // 重置设置
  const handleReset = () => {
    setFormData(settings);
    toast.info('已重置为当前设置');
  };

  return (
    <div className="space-y-6">
      {/* 图书馆信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            图书馆信息
          </CardTitle>
          <CardDescription>
            设置图书馆的基本信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>图书馆名称</Label>
              <Input
                value={formData.libraryName}
                onChange={(e) => setFormData({ ...formData, libraryName: e.target.value })}
                placeholder="请输入图书馆名称"
              />
            </div>
            <div className="space-y-2">
              <Label>联系电话</Label>
              <Input
                value={formData.libraryPhone || ''}
                onChange={(e) => setFormData({ ...formData, libraryPhone: e.target.value })}
                placeholder="请输入联系电话"
              />
            </div>
            <div className="space-y-2">
              <Label>电子邮箱</Label>
              <Input
                value={formData.libraryEmail || ''}
                onChange={(e) => setFormData({ ...formData, libraryEmail: e.target.value })}
                placeholder="请输入电子邮箱"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>地址</Label>
              <Input
                value={formData.libraryAddress || ''}
                onChange={(e) => setFormData({ ...formData, libraryAddress: e.target.value })}
                placeholder="请输入图书馆地址"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 借阅规则 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            借阅规则
          </CardTitle>
          <CardDescription>
            设置默认的借阅规则和限制
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>默认借阅天数</Label>
              <Input
                type="number"
                min={1}
                value={formData.maxBorrowDays}
                onChange={(e) => setFormData({ ...formData, maxBorrowDays: parseInt(e.target.value) || 30 })}
              />
              <p className="text-xs text-gray-500">会员默认可借阅的天数</p>
            </div>
            <div className="space-y-2">
              <Label>默认续借次数</Label>
              <Input
                type="number"
                min={0}
                value={formData.maxRenewTimes}
                onChange={(e) => setFormData({ ...formData, maxRenewTimes: parseInt(e.target.value) || 2 })}
              />
              <p className="text-xs text-gray-500">每本书最多可续借的次数</p>
            </div>
            <div className="space-y-2">
              <Label>续借天数</Label>
              <Input
                type="number"
                min={1}
                value={formData.renewDays}
                onChange={(e) => setFormData({ ...formData, renewDays: parseInt(e.target.value) || 15 })}
              />
              <p className="text-xs text-gray-500">每次续借可延长的天数</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 罚款设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            逾期罚款
          </CardTitle>
          <CardDescription>
            设置逾期归还的罚款规则
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>逾期罚款 (元/天)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={formData.overdueFinePerDay}
                onChange={(e) => setFormData({ ...formData, overdueFinePerDay: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">每逾期一天收取的罚款金额</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">允许逾期借阅</p>
              <p className="text-sm text-gray-500">会员有逾期未还书籍时，是否允许继续借阅新书</p>
            </div>
            <Switch
              checked={formData.allowOverdueBorrow}
              onCheckedChange={(checked) => setFormData({ ...formData, allowOverdueBorrow: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          重置
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          保存设置
        </Button>
      </div>

      {/* 系统信息 */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-600">
            <Settings className="w-5 h-5" />
            系统信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">系统版本</p>
              <p className="font-medium">v1.0.0</p>
            </div>
            <div>
              <p className="text-gray-500">数据存储</p>
              <p className="font-medium">浏览器本地存储</p>
            </div>
            <div>
              <p className="text-gray-500">技术栈</p>
              <p className="font-medium">React + TypeScript</p>
            </div>
            <div>
              <p className="text-gray-500">最后更新</p>
              <p className="font-medium">2024-02</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
