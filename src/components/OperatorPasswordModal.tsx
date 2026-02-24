import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OperatorPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}

export function OperatorPasswordModal({ 
  open, 
  onOpenChange, 
  onVerified,
  title = '请输入管理员密码',
  description = '此操作需要管理员权限'
}: OperatorPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!password) {
      setError('请输入密码');
      return;
    }

    setIsLoading(true);
    setError('');

    // 延迟一下模拟验证过程
    await new Promise(resolve => setTimeout(resolve, 300));

    const { OperatorService } = await import('@/services/operator');
    
    if (OperatorService.verify(password)) {
      onVerified();
      setPassword('');
      onOpenChange(false);
      toast.success('验证成功');
    } else {
      setError('密码错误');
      toast.error('密码验证失败');
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              管理员密码
            </label>
            <Input
              id="password"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleVerify();
                }
              }}
              disabled={isLoading}
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setPassword('');
              setError('');
              onOpenChange(false);
            }}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button onClick={handleVerify} disabled={isLoading}>
            {isLoading ? '验证中...' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
