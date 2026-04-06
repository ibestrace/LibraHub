import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BarcodeScanner({ onScan, isOpen, onOpenChange }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 初始化扫码器
      codeReaderRef.current = new BrowserMultiFormatReader();
    } else {
      // 清理扫码器
      if (codeReaderRef.current) {
        codeReaderRef.current.stopContinuousDecode();
        codeReaderRef.current = null;
      }
      setIsScanning(false);
      setError(null);
    }

    return () => {
      // 组件卸载时清理
      if (codeReaderRef.current) {
        codeReaderRef.current.stopContinuousDecode();
      }
    };
  }, [isOpen]);

  const startScanning = async () => {
    if (!videoRef.current || !codeReaderRef.current) return;

    setError(null);
    setIsScanning(true);

    try {
      // 请求摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.current.srcObject = stream;

      // 开始连续解码
      codeReaderRef.current.decodeFromVideoElementContinuously(
        videoRef.current,
        (result, err) => {
          if (result) {
            // 扫描成功
            onScan(result.getText());
            onOpenChange(false);
            setIsScanning(false);
            if (codeReaderRef.current) {
              codeReaderRef.current.stopContinuousDecode();
            }
            // 停止视频流
            if (videoRef.current?.srcObject) {
              const stream = videoRef.current.srcObject as MediaStream;
              const tracks = stream.getTracks();
              tracks.forEach((track: MediaStreamTrack) => track.stop());
            }
          } else if (err && !(err instanceof NotFoundException)) {
            // 非"未找到"的错误
            setError(`扫描错误: ${err.message}`);
            setIsScanning(false);
          }
        }
      );
    } catch (err) {
      setError(`无法访问摄像头: ${(err as Error).message}`);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.stopContinuousDecode();
    }
    setIsScanning(false);
    // 停止视频流
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track: MediaStreamTrack) => track.stop());
    }
  };

  const handleClose = () => {
    stopScanning();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            扫码添加书籍
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {isScanning ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                />
                {/* 扫描线动画 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3/4 h-1 bg-blue-500 animate-scan"></div>
                </div>
                {/* 扫描框 */}
                <div className="absolute inset-0 border-4 border-dashed border-blue-500 m-4 rounded-lg"></div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Camera className="w-12 h-12 mb-2" />
                <p>点击开始按钮启动摄像头</p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button variant="ghost" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            取消
          </Button>
          {isScanning ? (
            <Button variant="destructive" onClick={stopScanning}>
              停止扫描
            </Button>
          ) : (
            <Button onClick={startScanning}>
              开始扫描
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
