import type { BookStatus, MemberStatus, BorrowStatus } from '@/types';

export interface StatusLabel {
  label: string;
  color: string;
}

// 书籍状态标签
export const bookStatusLabels: Record<BookStatus, StatusLabel> = {
  available: { label: '可借阅', color: 'bg-green-100 text-green-700' },
  borrowed: { label: '已借出', color: 'bg-blue-100 text-blue-700' },
  reserved: { label: '已预约', color: 'bg-yellow-100 text-yellow-700' },
  damaged: { label: '损坏', color: 'bg-red-100 text-red-700' },
  lost: { label: '丢失', color: 'bg-gray-100 text-gray-700' },
  under_repair: { label: '维修中', color: 'bg-orange-100 text-orange-700' }
};

// 会员状态标签
export const memberStatusLabels: Record<MemberStatus, StatusLabel> = {
  active: { label: '有效', color: 'bg-green-100 text-green-700' },
  expired: { label: '已过期', color: 'bg-red-100 text-red-700' },
  suspended: { label: '已暂停', color: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: '已注销', color: 'bg-gray-100 text-gray-700' }
};

// 借阅状态标签
export const borrowStatusLabels: Record<BorrowStatus, StatusLabel> = {
  borrowed: { label: '借阅中', color: 'bg-blue-100 text-blue-700' },
  returned: { label: '已归还', color: 'bg-green-100 text-green-700' },
  overdue: { label: '已逾期', color: 'bg-red-100 text-red-700' },
  renewed: { label: '已续借', color: 'bg-purple-100 text-purple-700' }
};

// 通用获取状态标签函数
export function getStatusLabel(
  status: BookStatus | MemberStatus | BorrowStatus,
  type: 'book' | 'member' | 'borrow'
): StatusLabel {
  switch (type) {
    case 'book':
      return bookStatusLabels[status as BookStatus];
    case 'member':
      return memberStatusLabels[status as MemberStatus];
    case 'borrow':
      return borrowStatusLabels[status as BorrowStatus];
    default:
      return { label: status, color: 'bg-gray-100 text-gray-700' };
  }
}
