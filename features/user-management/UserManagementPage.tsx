import React, { useState, useCallback, useEffect } from 'react';
import { authFetch } from '../../lib/api';

type WorkflowGroup = 'reporter' | 'specialist' | 'officer';

const ALL_GROUPS: WorkflowGroup[] = ['reporter', 'specialist', 'officer'];

const GROUP_LABEL: Record<WorkflowGroup, string> = {
  reporter: 'Phóng viên',
  specialist: 'Chuyên viên',
  officer: 'Cán bộ',
};

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
  role: 'free' | 'pro' | 'enterprise' | 'admin';
  daily_limit: number | null;
  features: Feature[];
  workflow_groups: WorkflowGroup[];
  active_workflow_group: WorkflowGroup;
  created_at: string;
  tokens_used: number;
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
  const [createRole, setCreateRole] = useState<'free' | 'pro' | 'enterprise' | 'admin'>('free');
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
      <div className="max-w-3xl mx-auto mt-8 bg-white border-red-500 shadow-sm rounded-xl p-8 text-center">
        <h2 className="text-2xl font-medium font-sans text-red-700 mb-2">Không có quyền truy cập</h2>
        <p className="text-sm font-medium text-red-600">Trang này chỉ dành cho admin.</p>
      </div>
    );
  }

  const handleChangeRole = async (userId: string, newRole: 'free' | 'pro' | 'enterprise' | 'admin') => {
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

  const handleToggleGroup = async (userId: string, group: WorkflowGroup, currentGroups: WorkflowGroup[]) => {
    const isRemoving = currentGroups.includes(group);
    if (isRemoving && currentGroups.length <= 1) {
      alert('Tài khoản phải có ít nhất 1 nhóm');
      return;
    }
    const newGroups = isRemoving
      ? currentGroups.filter((g) => g !== group)
      : [...currentGroups, group];
    try {
      const res = await authFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_groups: newGroups }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Cập nhật thất bại');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, workflow_groups: newGroups } : u)));
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
        body: JSON.stringify({ email: createEmail, password: createPassword, role: createRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Tạo user thất bại');
      setUsers((prev) => [data.user, ...prev]);
      setShowCreate(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateRole('free');
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
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-3xl font-sans font-medium text-slate-800">Quản lý tài khoản</h2>
          <p className="text-slate-500 font-medium mt-1 text-sm">Tạo, sửa, xóa và phân quyền tài khoản người dùng.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Bộ lọc token-usage */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Token dùng:</span>
              {([
                { id: 'month' as const, label: 'Theo tháng' },
                { id: 'custom' as const, label: 'Tùy chỉnh' },
                { id: 'all' as const, label: 'Tất cả' },
              ]).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTokenFilterMode(item.id)}
                  className={`px-2.5 py-1 border text-xs font-medium transition-all rounded-lg cursor-pointer ${ tokenFilterMode === item.id ? 'bg-[#1E3A8A] border-slate-200 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' }`}
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
                  className="text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>T{m}</option>
                  ))}
                </select>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
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
                  className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-800 focus:outline-none"
                />
                <span className="text-xs text-slate-400">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-800 focus:outline-none"
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            className="px-4 py-2 text-sm font-medium bg-white border-slate-200 text-slate-800 shadow-sm rounded-xl transition-all active:bg-slate-50 border"
          >
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium bg-[#1E3A8A] border-slate-200 text-white shadow-sm rounded-xl hover:bg-[#1E40AF] transition-all active:bg-[#1E40AF] border"
          >
            + Tạo tài khoản
          </button>
        </div>
      </div>

      {/* Bảng danh sách user */}
      <div className="bg-white border-slate-200 shadow-sm rounded-xl overflow-x-auto border">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 font-medium text-sm">Đang tải...</div>
        ) : error ? (
          <div className="py-16 text-center text-red-600 font-medium text-sm">{error}</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-medium text-sm">Chưa có tài khoản nào.</div>
        ) : (
          <table className="w-full text-base whitespace-nowrap">
            <thead className="bg-[#1E3A8A] text-white border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-4 font-medium text-sm">Email</th>
                <th className="text-left px-5 py-4 font-medium text-sm">Role</th>
                <th className="text-left px-5 py-4 font-medium text-sm hidden md:table-cell">Nhóm</th>
                <th className="text-left px-5 py-4 font-medium text-sm">Lần/ngày</th>
                <th className="text-left px-5 py-4 font-medium text-sm hidden md:table-cell">
                  Token dùng
                  {tokenFilterMode === 'month' && (
                    <span className="ml-1 text-xs font-normal opacity-70">(T{filterMonth}/{filterYear})</span>
                  )}
                  {tokenFilterMode === 'custom' && customFrom && customTo && (
                    <span className="ml-1 text-xs font-normal opacity-70">({customFrom} → {customTo})</span>
                  )}
                  {tokenFilterMode === 'all' && (
                    <span className="ml-1 text-xs font-normal opacity-70">(tất cả)</span>
                  )}
                </th>
                <th className="text-left px-5 py-4 font-medium text-sm hidden sm:table-cell">Ngày tạo</th>
                <th className="px-5 py-4 text-right font-medium text-sm">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 bg-white rounded-2xl">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-slate-800 font-medium text-sm">
                    {u.email}
                    {u.id === currentUserId && (
                      <span className="ml-3 text-xs bg-[#1E40AF] border-slate-200 text-white font-black px-2 py-1 align-middle border rounded-2xl">BẠN</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={u.role}
                      disabled={u.id === currentUserId}
                      onChange={(e) => handleChangeRole(u.id, e.target.value as 'free' | 'pro' | 'enterprise' | 'admin')}
                      className="text-sm font-medium border-slate-200 px-3 py-1.5 bg-white text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:bg-slate-50 cursor-pointer border rounded-xl"
                    >
                      <option value="free">FREE</option>
                      <option value="pro">PRO</option>
                      <option value="enterprise">ENTERPRISE</option>
                      <option value="admin">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {ALL_GROUPS.map((g) => {
                        const active = (u.workflow_groups ?? []).includes(g);
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => handleToggleGroup(u.id, g, u.workflow_groups ?? ['specialist'])}
                            title={active ? `Bỏ nhóm ${GROUP_LABEL[g]}` : `Thêm nhóm ${GROUP_LABEL[g]}`}
                            className={`text-xs font-medium px-2 py-0.5 rounded-lg border transition-all ${
                              active
                                ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            {GROUP_LABEL[g]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {u.role === 'free' ? (
                      <input
                        type="number"
                        min={1}
                        value={u.daily_limit ?? 1}
                        onChange={(e) => handleChangeDailyLimit(u.id, e.target.value)}
                        className="w-16 text-sm font-medium border border-slate-200 px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:bg-slate-50 rounded-xl text-center"
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    {u.tokens_used > 0 ? (
                      <span className="text-sm font-medium text-slate-800">
                        {u.tokens_used.toLocaleString('vi-VN')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-sm font-medium hidden sm:table-cell">
                    {new Date(u.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditPasswordUserId(u.id);
                          setNewPassword('');
                          setPwError(null);
                        }}
                        className="text-xs font-medium px-3 py-2 border-slate-200 bg-white text-slate-800 shadow-sm rounded-xl hover:bg-slate-100 transition-all active:bg-slate-200 whitespace-nowrap border"
                      >
                        Đổi MK
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => setDeleteUserId(u.id)}
                          className="text-xs font-medium px-3 py-2 border-red-900 bg-white text-red-600 shadow-sm rounded-xl hover:bg-red-50 hover:text-red-700 transition-all active:bg-red-100 whitespace-nowrap"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal tạo tài khoản */}
      {showCreate && (
        <div className="fixed inset-0 bg-indigo-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 rounded-2xl">
          <div className="bg-white border-slate-200 shadow-sm rounded-xl max-w-md w-full p-8 space-y-6 border">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-2xl font-sans font-medium text-slate-800">Tạo tài khoản mới</h3>
              <p className="text-sm font-medium text-slate-500 mt-2">Điền thông tin để tạo tài khoản cho người dùng.</p>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-800 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-slate-200 bg-slate-50 focus:bg-white font-medium transition-colors border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-800 mb-2">Mật khẩu</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-slate-200 bg-slate-50 focus:bg-white font-medium transition-colors border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-800 mb-2">Role</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as 'free' | 'pro' | 'enterprise' | 'admin')}
                  className="w-full border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-slate-200 bg-slate-50 focus:bg-white font-medium transition-colors border rounded-xl"
                >
                  <option value="free">FREE</option>
                  <option value="pro">PRO</option>
                  <option value="enterprise">ENTERPRISE</option>
                  <option value="admin">ADMIN</option>
                </select>
              </div>
              {createError && <p className="text-xs font-medium text-red-600 p-3 bg-red-50 border-red-200 rounded-2xl">{createError}</p>}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateError(null); }}
                  className="flex-1 py-3 text-sm font-medium bg-white border-slate-200 text-slate-800 shadow-sm rounded-xl transition-all border"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-3 text-sm font-medium bg-[#1E3A8A] border-slate-200 text-white shadow-sm rounded-xl hover:bg-[#1E40AF] transition-all disabled:opacity-50 border"
                >
                  {createLoading ? 'ĐANG TẠO...' : 'TẠO TÀI KHOẢN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal đổi mật khẩu */}
      {editPasswordUserId && (
        <div className="fixed inset-0 bg-indigo-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 rounded-2xl">
          <div className="bg-white border-slate-200 shadow-sm rounded-xl max-w-md w-full p-8 space-y-6 border">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-2xl font-sans font-medium text-slate-800">Đổi mật khẩu</h3>
              <p className="text-sm font-medium text-slate-500 mt-2">{editingUser?.email}</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-800 mb-2">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-slate-200 bg-slate-50 focus:bg-white font-medium transition-colors border rounded-xl"
                  autoFocus
                />
              </div>
              {pwError && <p className="text-xs font-medium text-red-600 p-3 bg-red-50 border-red-200 rounded-2xl">{pwError}</p>}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setEditPasswordUserId(null); setPwError(null); }}
                  className="flex-1 py-3 text-sm font-medium bg-white border-slate-200 text-slate-800 shadow-sm rounded-xl transition-all border"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex-1 py-3 text-sm font-medium bg-[#1E3A8A] border-slate-200 text-white shadow-sm rounded-xl hover:bg-[#1E40AF] transition-all disabled:opacity-50 border"
                >
                  {pwLoading ? 'ĐANG LƯU...' : 'LƯU MẬT KHẨU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {deleteUserId && (
        <div className="fixed inset-0 bg-indigo-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 rounded-2xl">
          <div className="bg-white border-red-600 shadow-sm rounded-xl max-w-sm w-full p-8 space-y-6">
            <div className="border-b border-red-600 pb-4">
              <h3 className="text-2xl font-sans font-medium text-red-600">Xác nhận xóa</h3>
            </div>
            <p className="text-base font-medium text-slate-800">
              Bạn có chắc muốn xóa tài khoản{' '}
              <span className="font-medium border-b border-red-600">{deletingUser?.email}</span>?
              <br/><br/><span className="text-xs text-red-600 font-medium">Thao tác này không thể hoàn tác.</span>
            </p>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setDeleteUserId(null)}
                className="flex-1 py-3 text-sm font-medium bg-white border-slate-200 text-slate-800 shadow-sm rounded-xl transition-all border"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-3 text-sm font-medium bg-red-500 border-red-600 text-white shadow-sm rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {deleteLoading ? 'ĐANG XÓA...' : 'XÓA LUÔN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
