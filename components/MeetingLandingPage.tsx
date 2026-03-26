import React from 'react';

type WorkflowGroup = 'reporter' | 'specialist' | 'officer';

interface MeetingLandingUser {
  userId: string;
  email: string;
  role: string;
  workflowGroups?: string[];
  activeWorkflowGroup?: string;
}

interface Props {
  user: MeetingLandingUser;
  navigate: (path: string) => void;
}

const WORKFLOW_CARDS: { group: WorkflowGroup; label: string; description: string }[] = [
  { group: 'reporter', label: 'Bài phỏng vấn', description: 'Ghi chép & tổng hợp phỏng vấn báo chí' },
  { group: 'specialist', label: 'Thư ký họp', description: 'Biên bản cuộc họp chuyên nghiệp' },
  { group: 'officer', label: 'Thông tin vụ án', description: 'Ghi chép hồ sơ pháp lý' },
];

export function MeetingLandingPage({ user, navigate }: Props) {
  const visibleCards = WORKFLOW_CARDS.filter((c) =>
    user.workflowGroups?.includes(c.group)
  );

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 font-display">Chọn loại nội dung</h1>
        <p className="text-sm text-slate-600 mt-1">Chọn nhóm làm việc để bắt đầu</p>
      </div>

      {visibleCards.length === 0 ? (
        <div className="p-6 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 text-center">
          Bạn chưa được phân vào nhóm nào. Liên hệ quản trị viên để được hỗ trợ.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visibleCards.map((card) => (
            <button
              key={card.group}
              type="button"
              onClick={() => navigate('/' + card.group)}
              className="flex flex-col gap-2 p-6 border border-slate-200 rounded-xl text-left bg-white hover:border-[#1E40AF] hover:shadow-sm transition-colors duration-200 cursor-pointer min-h-[44px]"
            >
              <span className="text-base font-semibold text-slate-800">{card.label}</span>
              <span className="text-sm text-slate-500 mt-1">{card.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
