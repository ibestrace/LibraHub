import { useLibrary } from '@/hooks/useLibrary';
import { useStorageMonitor } from '@/hooks/useStorageMonitor';
import { useEffect, useState, useRef } from 'react';
import {
  BookOpen,
  Users,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  HardDrive,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 数字动画组件
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  
  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };
    
    animate();
  }, [value, duration]);
  
  return <span className="count-up">{displayValue}</span>;
}

export default function DashboardOverview() {
  const { state } = useLibrary();
  const { statistics } = state;
  const { 
    stats, 
    warning, 
    formatSize, 
    formatLimit,
    getWarningColor,
    getWarningIcon,
    getWarningMessage,
  } = useStorageMonitor();
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // 统计卡片数据
  const statCards = [
    {
      title: '总藏书量',
      value: statistics.totalBooks,
      icon: BookOpen,
      gradient: 'from-blue-500 to-cyan-400',
      lightGradient: 'from-blue-500/10 to-cyan-400/10',
      borderColor: 'border-blue-200',
      delay: 0
    },
    {
      title: '注册会员',
      value: statistics.totalMembers,
      icon: Users,
      gradient: 'from-emerald-500 to-teal-400',
      lightGradient: 'from-emerald-500/10 to-teal-400/10',
      borderColor: 'border-emerald-200',
      subtitle: `有效会员 ${statistics.activeMembers} 人`,
      delay: 100
    },
    {
      title: '当前借出',
      value: statistics.currentBorrows,
      icon: RotateCcw,
      gradient: 'from-violet-500 to-purple-400',
      lightGradient: 'from-violet-500/10 to-purple-400/10',
      borderColor: 'border-violet-200',
      delay: 200
    },
    {
      title: '逾期未还',
      value: statistics.overdueBorrows,
      icon: AlertCircle,
      gradient: 'from-rose-500 to-pink-400',
      lightGradient: 'from-rose-500/10 to-pink-400/10',
      borderColor: 'border-rose-200',
      delay: 300
    }
  ];

  // 今日动态
  const todayStats = [
    { 
      label: '今日借阅', 
      value: statistics.todayBorrows, 
      icon: TrendingUp,
      gradient: 'from-blue-500 to-indigo-500'
    },
    { 
      label: '今日归还', 
      value: statistics.todayReturns, 
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-teal-500'
    },
    { 
      label: '本月新会员', 
      value: statistics.newMembersThisMonth, 
      icon: Users,
      gradient: 'from-violet-500 to-fuchsia-500'
    }
  ];

  return (
    <div className={`space-y-6 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <Card 
            key={index} 
            className={`border-0 shadow-lg card-hover overflow-hidden ${card.borderColor} border`}
            style={{ 
              animationDelay: `${card.delay}ms`,
              animation: mounted ? 'fade-in-up 0.5s ease-out forwards' : 'none'
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.lightGradient} opacity-50`} />
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-4xl font-bold text-foreground mt-2">
                    <AnimatedNumber value={card.value} />
                  </p>
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground/70 mt-1">{card.subtitle}</p>
                  )}
                </div>
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 今日动态和系统信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 今日动态 */}
        <Card 
          className="border-0 shadow-lg lg:col-span-2 overflow-hidden"
          style={{ animation: mounted ? 'fade-in-up 0.5s ease-out 0.2s forwards' : 'none', opacity: 0 }}
        >
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              今日动态
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              {todayStats.map((stat, index) => (
                <div 
                  key={index} 
                  className="text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 border border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    <AnimatedNumber value={stat.value} />
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 系统信息 */}
        <Card 
          className="border-0 shadow-lg overflow-hidden"
          style={{ animation: mounted ? 'fade-in-up 0.5s ease-out 0.3s forwards' : 'none', opacity: 0 }}
        >
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-violet-500" />
              系统信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">当前时间</p>
                <p className="font-semibold text-foreground">
                  {format(new Date(), 'yyyy 年 MM 月 dd 日 HH:mm', { locale: zhCN })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">系统状态</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="font-semibold text-emerald-600">运行正常</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">图书馆名称</p>
                <p className="font-semibold text-foreground">{state.settings.libraryName}</p>
              </div>
            </div>
            
            {/* 存储监控 */}
            {stats && (
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                  warning === 'critical' ? 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/25' :
                  warning === 'high' ? 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/25' :
                  warning === 'medium' ? 'bg-gradient-to-br from-yellow-500 to-amber-500 shadow-yellow-500/25' :
                  'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/25'
                }`}>
                  <HardDrive className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">存储空间</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{formatSize(stats.used)}</p>
                    <p className="text-xs text-muted-foreground">/ {formatLimit()}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        stats.percentUsed > 90 ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                        stats.percentUsed > 75 ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                        stats.percentUsed > 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' : 
                        'bg-gradient-to-r from-blue-500 to-cyan-500'
                      }`}
                      style={{ width: `${Math.min(stats.percentUsed, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 存储警告提示 */}
      {warning && ['medium', 'high', 'critical'].includes(warning) && (
        <Card 
          className={`border-0 shadow-lg ${getWarningColor(warning)}`}
          style={{ animation: 'fade-in-up 0.5s ease-out' }}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <span className="text-2xl">{getWarningIcon(warning)}</span>
              <div>
                <h3 className="font-semibold text-lg">{getWarningMessage(warning)}</h3>
                <p className="text-sm mt-1 opacity-90">
                  已使用 {stats?.percentUsed.toFixed(1)}% ({formatSize(stats?.used || 0)})，
                  剩余 {formatSize(stats?.available || 0)}
                </p>
                <p className="text-xs mt-2 opacity-70">
                  建议：定期备份数据并清理旧的借阅记录
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 快捷提示 */}
      <Card 
        className="border-0 shadow-xl overflow-hidden relative"
        style={{ animation: mounted ? 'fade-in-up 0.5s ease-out 0.4s forwards' : 'none', opacity: 0 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <CardContent className="p-8 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-yellow-300" />
                <span className="text-blue-100 text-sm font-medium">智能图书管理系统</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">欢迎使用 LibraHub</h3>
              <p className="text-blue-100/80 text-sm max-w-lg leading-relaxed">
                您可以通过左侧菜单访问各个功能模块，使用扫码枪快速录入书籍和会员信息。
                系统支持 ISBN 自动识别、借阅归还管理、逾期提醒等功能。
              </p>
            </div>
            <div className="hidden md:block">
              <BookOpen className="w-24 h-24 text-white/10" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
