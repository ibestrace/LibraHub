import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSet: () => void;
}

export function SetPasswordModal({ 
  open, 
  onOpenChange, 
  onSet
}: SetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSet = async () => {
    if (!password) {
      setError('请输入密码');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为 6 位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { OperatorService } = await import('@/services/operator');
      await OperatorService.setPassword(password);
      onSet();
      setPassword('');
      setConfirmPassword('');
      toast.success('密码设置成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置失败');
      toast.error('密码设置失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>设置管理员密码</DialogTitle>
          <DialogDescription>
            首次使用需要设置管理员密码，用于保护重要操作
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">
              管理员密码
            </label>
            <Input
              id="newPassword"
              type="password"
              placeholder="至少 6 位"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              disabled={isLoading}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              确认密码
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleSet();
                }
              }}
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSet} disabled={isLoading}>
            {isLoading ? '设置中...' : '设置密码'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
