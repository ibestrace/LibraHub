import { useLibrary } from '@/hooks/useLibrary';
import { 
  BookOpen, 
  Users, 
  RotateCcw, 
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function DashboardOverview() {
  const { state } = useLibrary();
  const { statistics } = state;

  // 统计卡片数据
  const statCards = [
    {
      title: '总藏书量',
      value: statistics.totalBooks,
      icon: BookOpen,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: '注册会员',
      value: statistics.totalMembers,
      icon: Users,
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      textColor: 'text-green-600',
      subtitle: `有效会员 ${statistics.activeMembers} 人`
    },
    {
      title: '当前借出',
      value: statistics.currentBorrows,
      icon: RotateCcw,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: '逾期未还',
      value: statistics.overdueBorrows,
      icon: AlertCircle,
      color: 'bg-red-500',
      lightColor: 'bg-red-50',
      textColor: 'text-red-600'
    }
  ];

  // 今日动态
  const todayStats = [
    { label: '今日借阅', value: statistics.todayBorrows, icon: TrendingUp },
    { label: '今日归还', value: statistics.todayReturns, icon: CheckCircle },
    { label: '本月新会员', value: statistics.newMembersThisMonth, icon: Users }
  ];

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <Card key={index} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                  {card.subtitle && (
                    <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
                  )}
                </div>
                <div className={`${card.lightColor} p-3 rounded-lg`}>
                  <card.icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 今日动态和快捷操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 今日动态 */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">今日动态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {todayStats.map((stat, index) => (
                <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                  <stat.icon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 系统信息 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">系统信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">当前时间</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">系统状态</p>
                <p className="font-medium text-green-600">运行正常</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">图书馆名称</p>
                <p className="font-medium text-gray-900">{state.settings.libraryName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷提示 */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-500 to-purple-600">
        <CardContent className="p-6">
          <div className="flex items-center justify-between text-white">
            <div>
              <h3 className="text-lg font-semibold mb-1">欢迎使用 LibraHub</h3>
              <p className="text-blue-100 text-sm">
                智能图书管理系统 - 您可以通过左侧菜单访问各个功能模块，使用扫码枪快速录入书籍和会员信息
              </p>
            </div>
            <BookOpen className="w-16 h-16 text-white/20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
