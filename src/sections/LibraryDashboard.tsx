import { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  RotateCcw, 
  BarChart3, 
  Settings, 
  Menu,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// 导入各个模块
import DashboardOverview from './DashboardOverview';
import BookManagement from './BookManagement';
import MemberManagement from './MemberManagement';
import BorrowReturn from './BorrowReturn';
import DataManagement from './DataManagement';
import SystemSettings from './SystemSettings';

// 导航项
const navItems = [
  { id: 'dashboard', label: '数据概览', icon: BarChart3 },
  { id: 'books', label: '书籍管理', icon: BookOpen },
  { id: 'members', label: '会员管理', icon: Users },
  { id: 'borrow', label: '借阅归还', icon: RotateCcw },
  { id: 'data', label: '数据管理', icon: Database },
  { id: 'settings', label: '系统设置', icon: Settings },
];

export default function LibraryDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 渲染内容区域
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'books':
        return <BookManagement />;
      case 'members':
        return <MemberManagement />;
      case 'borrow':
        return <BorrowReturn />;
      case 'data':
        return <DataManagement />;
      case 'settings':
        return <SystemSettings />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 桌面端侧边栏 */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 6v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M9 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-gray-900">LibraHub</h1>
            <p className="text-xs text-gray-500">智能图书管理系统</p>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* 底部信息 */}
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">管</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">管理员</p>
              <p className="text-xs text-gray-500 truncate">在线</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 移动端头部 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900">LibraHub</span>
          </div>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="font-bold text-gray-900">LibraHub</span>
                  </div>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                          activeTab === item.id
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-auto lg:pt-0 pt-14">
        <div className="p-4 lg:p-8">
          {/* 页面标题 */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {navItems.find(item => item.id === activeTab)?.label}
            </h2>
            <p className="text-gray-500 mt-1">
              {activeTab === 'dashboard' && '查看图书馆运营数据和统计信息'}
              {activeTab === 'books' && '管理图书馆的书籍信息和库存'}
              {activeTab === 'members' && '管理会员信息和借阅权限'}
              {activeTab === 'borrow' && '处理书籍借阅和归还操作'}
              {activeTab === 'data' && '备份和恢复系统数据'}
              {activeTab === 'settings' && '配置系统参数和图书馆信息'}
            </p>
          </div>

          {/* 内容 */}
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
