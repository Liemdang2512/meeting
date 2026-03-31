import React, { useState, useCallback, useEffect } from 'react';
import { authFetch } from '../../lib/api';
import { RefreshCw, UserPlus, ShieldCheck, AlertCircle, User, Trash2, Key } from 'lucide-react';

type SystemRole = 'free' | 'admin';

const PLAN_OPTIONS: { value: string; label: string }[] = [
  { value: 'reporter', label: 'Phóng viên' },
  { value: 'specialist', label: 'Chuyên viên' },
  { value: 'officer', label: 'Cán bộ' },
];

type Feature = 'transcription' | 'summary' | 'mindmap' | 'export_pdf' | 'export_docx' | 'email' | 'diagram';

const ALL_FEATURES: Feature[] = ['transcription', 'summary', 'mindmap', 'export_pdf', 'export_docx', 'email', 'diagram'];

const FEATURE_LABEL: Record<Feature, string> = {
  transcription: 'Ghi âm',
  summary: 'Tóm tắt',
  mindmap: 'Sơ đồ',
  export_pdf: 'PDF',
  export_docx: 'Word',
  email: 'Email',
  diagram: 'Biểu đồ',
};

interface UserRow {
  id: string;
  email: string;
  role: SystemRole;
  daily_limit: number | null;
  features: Feature[];
  created_at: string;
  tokens_used: number;
  plans: string[];
}

interface UserManagementPageProps {
  currentUserId: string;
  isAdmin: boolean;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ currentUserId, isAdmin }) => {
  const now = new Date();
  type TokenFilterMode = 'month' | 'custom' | 'all';
  const [tokenFilterMode, setTokenFilterMode] = useState<TokenFilterMode>('month');
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal tạo user mới
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<SystemRole>('free');
  const [createPlans, setCreatePlans] = useState<string[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal đổi mật khẩu
  const [editPasswordUserId, setEditPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Xác nhận xóa
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tokenFilterMode === 'month') {
        const m = parseInt(filterMonth, 10);
        const y = parseInt(filterYear, 10);
        const from = new Date(y, m - 1, 1);
        const to = new Date(y, m, 0, 23, 59, 59, 999);
        params.set('from', from.toISOString());
        params.set('to', to.toISOString());
      } else if (tokenFilterMode === 'custom' && customFrom && customTo) {
        params.set('from', new Date(customFrom).toISOString());
        params.set('to', new Date(customTo + 'T23:59:59').toISOString());
      }
      const res = await authFetch(`/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Không thể tải danh sách user');
      setUsers(data.users);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [tokenFilterMode, filterMonth, filterYear, customFrom, customTo]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto mt-8 bg-surface-container-lowest border border-error/20 shadow-sm rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-headline font-bold text-error mb-2">Không có quyền truy cập</h2>
        <p className="text-sm font-medium text-on-surface-variant">Trang này chỉ dành cho admin.</p>
      </div>
    );
  }

  const handleToggleAdmin = async (userId: string, currentRole: SystemRole) => {
    const newRole: SystemRole = currentRole === 'admin' ? 'free' : 'admin';
    try {
      const res = await authFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Cập nhật thất bại');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  const handleTogglePlan = async (userId: string, plan: string, currentPlans: string[]) => {
    const newPlans = currentPlans.includes(plan)
      ? currentPlans.filter((p) => p !== plan)
      : [...currentPlans, plan];
    try {
      const res = await authFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: newPlans }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Cập nhật thất bại');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, plans: newPlans } : u)));
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  const handleChangeDailyLimit = async (userId: string, value: string) => {
    const daily_limit = value === '' ? null : parseInt(value, 10);
    if (daily_limit !== null && (isNaN(daily_limit) || daily_limit < 1)) return;
    try {
      const res = await authFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_limit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Cập nhật thất bại');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, daily_limit } : u)));
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  const handleToggleFeature = async (userId: string, feature: Feature, currentFeatures: Feature[]) => {
    const newFeatures = currentFeatures.includes(feature)
      ? currentFeatures.filter((f) => f !== feature)
      : [...currentFeatures, feature];
    try {
      const res = await authFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: newFeatures }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Cập nhật thất bại');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, features: newFeatures } : u)));
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await authFetch('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: createEmail, password: createPassword, role: createRole, plans: createPlans }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Tạo user thất bại');
      setUsers((prev) => [{ ...data.user, plans: createPlans, features: [], tokens_used: 0, daily_limit: null }, ...prev]);
      setShowCreate(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateRole('free');
      setCreatePlans([]);
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPasswordUserId) return;
    setPwLoading(true);
    setPwError(null);
    try {
      const res = await authFetch(`/admin/users/${editPasswordUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Đổi mật khẩu thất bại');
      setEditPasswordUserId(null);
      setNewPassword('');
    } catch (e: any) {
      setPwError(e.message);
    } finally {
      setPwLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    setDeleteLoading(true);
    try {
      const res = await authFetch(`/admin/users/${deleteUserId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Xóa user thất bại');
      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId));
      setDeleteUserId(null);
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const editingUser = editPasswordUserId ? users.find((u) => u.id === editPasswordUserId) : null;
  const deletingUser = deleteUserId ? users.find((u) => u.id === deleteUserId) : null;

  return (
    <div className="space-y-8 mt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">Quản lý tài khoản</h2>
          <p className="text-on-surface-variant max-w-lg text-sm">Tạo, sửa, xóa và phân quyền tài khoản người dùng trong hệ thống.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Bộ lọc token-usage */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 bg-surface-container-lowest p-1 rounded-xl shadow-sm border border-outline-variant/10">
              <span className="text-xs font-medium text-on-surface-variant whitespace-nowrap pl-2">Token:</span>
              {([
                { id: 'month' as const, label: 'Theo tháng' },
                { id: 'custom' as const, label: 'Tùy chỉnh' },
                { id: 'all' as const, label: 'Tất cả' },
              ]).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTokenFilterMode(item.id)}
                  className={`px-3 py-1.5 text-xs font-bold transition-all rounded-lg cursor-pointer ${
                    tokenFilterMode === item.id
                      ? 'bg-primary text-white shadow-md'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {tokenFilterMode === 'month' && (
              <div className="flex items-center gap-1.5">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="text-xs font-medium text-on-surface bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>T{m}</option>
                  ))}
                </select>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="text-xs font-medium text-on-surface bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
            {tokenFilterMode === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="text-xs font-medium border border-outline-variant/20 rounded-lg px-2 py-1 bg-surface-container-lowest text-on-surface focus:outline-none"
                />
                <span className="text-xs text-on-surface-variant">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="text-xs font-medium border border-outline-variant/20 rounded-lg px-2 py-1 bg-surface-container-lowest text-on-surface focus:outline-none"
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            className="px-5 py-2.5 flex items-center gap-2 bg-surface-container-high text-primary font-bold text-sm rounded-full hover:bg-surface-container-highest transition-all active:scale-95"
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-6 py-2.5 flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm rounded-full shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
          >
            <UserPlus size={16} />
            + Tạo tài khoản
          </button>
        </div>
      </div>

      {/* Bảng danh sách user */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl shadow-on-surface/5 overflow-hidden border border-outline-variant/5">
        {isLoading ? (
          <div className="py-16 text-center text-on-surface-variant font-medium text-sm">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p>Đang tải...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-error font-medium text-sm">{error}</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant font-medium text-sm">Chưa có tài khoản nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Gói / Quyền</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center">Lần/ngày</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center hidden md:table-cell">
                    Token dùng
                    {tokenFilterMode === 'month' && (
                      <span className="ml-1 text-[10px] font-normal opacity-70">(T{filterMonth}/{filterYear})</span>
                    )}
                    {tokenFilterMode === 'custom' && customFrom && customTo && (
                      <span className="ml-1 text-[10px] font-normal opacity-70">({customFrom} → {customTo})</span>
                    )}
                    {tokenFilterMode === 'all' && (
                      <span className="ml-1 text-[10px] font-normal opacity-70">(tất cả)</span>
                    )}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest hidden sm:table-cell">Ngày tạo</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-container-low/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                          {u.email.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                            {u.email}
                          </span>
                          {u.id === currentUserId && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold self-start mt-1 uppercase">Bạn</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={u.id === currentUserId}
                          onClick={() => handleToggleAdmin(u.id, u.role)}
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border transition-all disabled:cursor-not-allowed ${
                            u.role === 'admin'
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20 opacity-50 hover:opacity-80'
                          }`}
                          title={u.id === currentUserId ? '' : u.role === 'admin' ? 'Bỏ quyền Admin' : 'Cấp quyền Admin'}
                        >
                          <ShieldCheck size={10} /> Admin
                        </button>
                        {PLAN_OPTIONS.map((plan) => (
                          <button
                            key={plan.value}
                            type="button"
                            onClick={() => handleTogglePlan(u.id, plan.value, u.plans ?? [])}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-all ${
                              (u.plans ?? []).includes(plan.value)
                                ? 'bg-secondary/10 text-secondary border-secondary/20'
                                : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20 opacity-50 hover:opacity-80'
                            }`}
                            title={(u.plans ?? []).includes(plan.value) ? `Bỏ gói ${plan.label}` : `Thêm gói ${plan.label}`}
                          >
                            {plan.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {true ? (
                        <input
                          type="number"
                          min={1}
                          key={`${u.id}-${u.daily_limit}`}
                          defaultValue={u.daily_limit ?? 1}
                          onBlur={(e) => handleChangeDailyLimit(u.id, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          className="w-16 text-sm font-medium border border-outline-variant/20 px-2 py-1 bg-surface-container-lowest text-on-surface focus:outline-none focus:bg-surface-container-low rounded-lg text-center"
                        />
                      ) : (
                        <span className="text-xs text-on-surface-variant font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center hidden md:table-cell">
                      {u.tokens_used > 0 ? (
                        <span className="text-sm font-bold text-on-surface">
                          {u.tokens_used.toLocaleString('vi-VN')}
                        </span>
                      ) : (
                        <span className="text-xs text-on-surface-variant font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-on-surface-variant text-sm hidden sm:table-cell">
                      {new Date(u.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditPasswordUserId(u.id);
                            setNewPassword('');
                            setPwError(null);
                          }}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="Đổi mật khẩu"
                        >
                          <Key size={16} />
                        </button>
                        {u.id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => setDeleteUserId(u.id)}
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-all"
                            title="Xóa tài khoản"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Table Footer */}
        {!isLoading && !error && users.length > 0 && (
          <div className="bg-surface-container-low/30 px-6 py-4 flex justify-between items-center border-t border-outline-variant/10">
            <p className="text-xs font-medium text-on-surface-variant">
              Hiển thị <span className="font-bold text-on-surface">{users.length}</span> tài khoản
            </p>
          </div>
        )}
      </div>

      {/* Modal tạo tài khoản */}
      {showCreate && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6 border border-outline-variant/10">
            <div className="border-b border-outline-variant/20 pb-4">
              <h3 className="text-2xl font-headline font-bold text-on-surface">Tạo tài khoản mới</h3>
              <p className="text-sm font-medium text-on-surface-variant mt-1">Điền thông tin để tạo tài khoản cho người dùng.</p>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface-container-low focus:bg-surface-container-lowest font-medium transition-colors rounded-xl text-on-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Mật khẩu</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface-container-low focus:bg-surface-container-lowest font-medium transition-colors rounded-xl text-on-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Quyền hệ thống</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as SystemRole)}
                  className="w-full border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface-container-low focus:bg-surface-container-lowest font-medium transition-colors rounded-xl text-on-surface"
                >
                  <option value="free">Free</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Gói đăng ký</label>
                <div className="flex flex-wrap gap-2">
                  {PLAN_OPTIONS.map((plan) => (
                    <button
                      key={plan.value}
                      type="button"
                      onClick={() => setCreatePlans(prev => prev.includes(plan.value) ? prev.filter(p => p !== plan.value) : [...prev, plan.value])}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                        createPlans.includes(plan.value)
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'
                      }`}
                    >
                      {plan.label}
                    </button>
                  ))}
                </div>
              </div>
              {createError && (
                <p className="text-xs font-medium text-error p-3 bg-error/5 border border-error/20 rounded-xl">{createError}</p>
              )}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateError(null); }}
                  className="flex-1 py-3 text-sm font-bold bg-surface-container-high text-on-surface rounded-full hover:bg-surface-container-highest transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-3 text-sm font-bold bg-gradient-to-r from-primary to-secondary text-white rounded-full shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {createLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal đổi mật khẩu */}
      {editPasswordUserId && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6 border border-outline-variant/10">
            <div className="border-b border-outline-variant/20 pb-4">
              <h3 className="text-2xl font-headline font-bold text-on-surface">Đổi mật khẩu</h3>
              <p className="text-sm font-medium text-on-surface-variant mt-1">{editingUser?.email}</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface-container-low focus:bg-surface-container-lowest font-medium transition-colors rounded-xl text-on-surface"
                  autoFocus
                />
              </div>
              {pwError && (
                <p className="text-xs font-medium text-error p-3 bg-error/5 border border-error/20 rounded-xl">{pwError}</p>
              )}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditPasswordUserId(null); setPwError(null); }}
                  className="flex-1 py-3 text-sm font-bold bg-surface-container-high text-on-surface rounded-full hover:bg-surface-container-highest transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex-1 py-3 text-sm font-bold bg-gradient-to-r from-primary to-secondary text-white rounded-full shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {pwLoading ? 'Đang lưu...' : 'Lưu mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {deleteUserId && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-sm w-full p-8 space-y-6 border border-error/20">
            <div className="border-b border-error/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                  <AlertCircle size={20} className="text-error" />
                </div>
                <h3 className="text-xl font-headline font-bold text-error">Xác nhận xóa</h3>
              </div>
            </div>
            <p className="text-sm font-medium text-on-surface">
              Bạn có chắc muốn xóa tài khoản{' '}
              <span className="font-bold text-on-surface">{deletingUser?.email}</span>?
              <br /><br />
              <span className="text-xs text-error font-medium">Thao tác này không thể hoàn tác.</span>
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setDeleteUserId(null)}
                className="flex-1 py-3 text-sm font-bold bg-surface-container-high text-on-surface rounded-full hover:bg-surface-container-highest transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-3 text-sm font-bold bg-error text-white rounded-full hover:brightness-110 transition-all disabled:opacity-50"
              >
                {deleteLoading ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
