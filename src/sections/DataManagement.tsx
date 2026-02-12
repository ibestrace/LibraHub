import { useState, useRef } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { 
  Download, 
  Upload, 
  Database,
  Trash2,
  AlertTriangle,
  HardDrive
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
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DataManagement() {
  const { state, exportData, importData } = useLibrary();
  const { statistics } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 弹窗状态
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

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
      toast.error('备份失败: ' + (error instanceof Error ? error.message : '未知错误'));
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
    
    // 清空input，允许重复选择同一文件
    e.target.value = '';
  };

  // 确认导入
  const handleImport = () => {
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
      toast.error('导入失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
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
              将所有数据导出为JSON文件，用于备份或迁移
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
          <Button 
            variant="destructive" 
            onClick={() => setIsClearDialogOpen(true)}
            className="w-full md:w-auto"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            清空所有数据
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
            <Button onClick={handleImport}>确认恢复</Button>
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
    </div>
  );
}
