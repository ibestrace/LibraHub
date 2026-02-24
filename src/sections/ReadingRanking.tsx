import { useState, useMemo } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { Trophy, TrendingUp, Users, BookOpen, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReadingStatsService, MemberGroupService } from '@/services/storage';
import { format } from 'date-fns';
import type { TotalRankingItem, GroupRankingItem, MonthlyRankingItem } from '@/types';

export default function ReadingRanking() {
  const { state } = useLibrary();
  const { members } = state;
  
  const [activeTab, setActiveTab] = useState<'total' | 'group' | 'monthly'>('total');
  const [selectedYearMonth, setSelectedYearMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  
  // 获取分组列表
  const groups = useMemo(() => {
    return MemberGroupService.getAll();
  }, []);
  
  // 总榜单数据
  const totalRanking = useMemo<TotalRankingItem[]>(() => {
    return ReadingStatsService.getTotalRanking().map((item, index) => ({
      ...item,
      rank: index + 1,
      badgeCount: members.find(m => m.id === item.memberId)?.badges?.length || 0
    }));
  }, [members]);
  
  // 分组人均榜单数据
  const groupRanking = useMemo<GroupRankingItem[]>(() => {
    return ReadingStatsService.getGroupRanking().map((item, index) => ({
      ...item,
      rank: index + 1,
      badgeCount: 0 // TODO: 实现分组徽章统计
    }));
  }, []);
  
  // 月度榜单数据
  const monthlyRanking = useMemo<MonthlyRankingItem[]>(() => {
    return ReadingStatsService.getMonthlyRanking(selectedYearMonth, selectedGroupId || undefined)
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }));
  }, [selectedYearMonth, selectedGroupId]);
  
  // 获取最近12个月
  const recentMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'yyyy年MM月')
      });
    }
    return months;
  }, []);
  
  // 排名徽章
  const RankBadge = ({ rank }: { rank: number }) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-lg font-bold text-gray-600">{rank}</span>;
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">阅读排行榜</h2>
        <p className="text-gray-500 mt-1">查看会员和分组的阅读字数排名</p>
      </div>
      
      {/* 标签切换 */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeTab === 'total' ? 'default' : 'outline'}
          onClick={() => setActiveTab('total')}
        >
          <Trophy className="w-4 h-4 mr-2" />
          总榜单
        </Button>
        <Button
          variant={activeTab === 'group' ? 'default' : 'outline'}
          onClick={() => setActiveTab('group')}
        >
          <Users className="w-4 h-4 mr-2" />
          分组榜单
        </Button>
        <Button
          variant={activeTab === 'monthly' ? 'default' : 'outline'}
          onClick={() => setActiveTab('monthly')}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          月度榜单
        </Button>
      </div>
      
      {/* 总榜单 */}
      {activeTab === 'total' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              全站总榜
            </CardTitle>
            <p className="text-sm text-gray-500">所有会员累计阅读字数排名</p>
          </CardHeader>
          <CardContent>
            {totalRanking.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>暂无阅读数据</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-20">排名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">会员姓名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">所属分组</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">累计阅读字数</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">阅读书籍</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {totalRanking.map((item) => (
                      <tr key={item.memberId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <RankBadge rank={item.rank} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.memberName}</span>
                            {item.badgeCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Award className="w-3 h-3 mr-1" />
                                {item.badgeCount}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-600">{item.groupName}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium text-blue-600">
                            {item.totalWords.toLocaleString()}
                          </span>
                          <span className="text-gray-500 text-sm ml-1">字</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-600">{item.bookCount}</span>
                          <span className="text-gray-500 text-sm ml-1">本</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 分组榜单 */}
      {activeTab === 'group' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              分组人均榜
            </CardTitle>
            <p className="text-sm text-gray-500">各分组按人均阅读字数排名</p>
          </CardHeader>
          <CardContent>
            {groupRanking.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>暂无分组数据</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-20">排名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">分组名称</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">会员人数</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">总阅读字数</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">人均阅读字数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {groupRanking.map((item) => (
                      <tr key={item.groupId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <RankBadge rank={item.rank} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{item.groupName}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-600">{item.memberCount}</span>
                          <span className="text-gray-500 text-sm ml-1">人</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-600">
                            {item.totalWords.toLocaleString()}
                          </span>
                          <span className="text-gray-500 text-sm ml-1">字</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium text-blue-600">
                            {item.avgWords.toLocaleString()}
                          </span>
                          <span className="text-gray-500 text-sm ml-1">字/人</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 月度榜单 */}
      {activeTab === 'monthly' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  月度榜单
                </CardTitle>
                <p className="text-sm text-gray-500">按月份查看会员阅读排名</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 筛选条件 */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择月份
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={selectedYearMonth}
                  onChange={(e) => setSelectedYearMonth(e.target.value)}
                >
                  {recentMonths.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择分组
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="">全部分组</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* 月度排名列表 */}
            {monthlyRanking.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>该月份暂无阅读数据</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-20">排名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">会员姓名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">所属分组</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">月度阅读字数</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">阅读书籍</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {monthlyRanking.map((item) => (
                      <tr key={item.memberId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <RankBadge rank={item.rank} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{item.memberName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-600">{item.groupName}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium text-blue-600">
                            {item.monthlyWords.toLocaleString()}
                          </span>
                          <span className="text-gray-500 text-sm ml-1">字</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-600">{item.monthlyBookCount}</span>
                          <span className="text-gray-500 text-sm ml-1">本</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
