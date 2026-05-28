import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, User, Pencil, Check } from 'lucide-react';
import { Employee } from '../../types';
import { db, collection, query, where, onSnapshot, setDoc, doc, deleteDoc, handleFirestoreError, OperationType, updateDoc, sanitizeData } from '../firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  currentEmployeeRole?: 'admin' | 'staff';
}

const EmployeeManagementModal: React.FC<Props> = ({ isOpen, onClose, uid, currentEmployeeRole }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'staff'>('staff');

  useEffect(() => {
    if (!uid || !isOpen) return;
    const q = query(collection(db, 'employees'), where('uid', '==', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'employees'));
    return () => unsubscribe();
  }, [uid, isOpen]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    const id = crypto.randomUUID();
    try {
      await setDoc(doc(db, 'employees', id), sanitizeData({
        name: newName,
        pin: newPin || '',
        role: newRole,
        uid: uid
      }));
      setNewName('');
      setNewPin('');
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'employees');
    }
  };

  const handleDelete = async (id: string, empRole: string) => {
    if (currentEmployeeRole === 'staff') {
      alert("權限不足：店員無法刪除工作人員");
      return;
    }
    if (!window.confirm("確定要刪除這位員工嗎？")) return;
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'employees');
    }
  };

  const startEdit = (emp: Employee) => {
    if (currentEmployeeRole === 'staff') {
      alert("權限不足：店員無法編輯工作人員");
      return;
    }
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditPin(emp.pin);
    setEditRole(emp.role);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName) return;

    try {
      await updateDoc(doc(db, 'employees', editingId), sanitizeData({
        name: editName,
        pin: editPin || '',
        role: editRole
      }));
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'employees');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">銷售人員管理</h2>
              <p className="text-sm text-gray-500">在此增減結帳時可供選擇的銷售人員與設定 PIN 碼</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isAdding ? (
            <form onSubmit={handleAdd} className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">姓名</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="例如：王小明"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">PIN 碼 (可留空則不需 PIN)</label>
                  <input
                    type="password"
                    pattern="\d*"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="例如：1234"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">職位</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('staff')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all font-bold ${newRole === 'staff' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-500'}`}
                  >
                    店員
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentEmployeeRole === 'staff') return;
                      setNewRole('admin');
                    }}
                    disabled={currentEmployeeRole === 'staff'}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all font-bold ${newRole === 'admin' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-500'} ${currentEmployeeRole === 'staff' ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                  >
                    管理員
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                >
                  新增員工
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              新增工作人員
            </button>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">現有員工 ({employees.length})</h3>
            {employees.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400">目前尚無員工資料</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {employees.map((emp) => (
                  <div key={emp.id} className="bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all group overflow-hidden">
                    {editingId === emp.id ? (
                      <form onSubmit={handleUpdate} className="p-4 bg-blue-50/50 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-blue-600 uppercase">姓名</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full p-2 text-sm rounded border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-blue-600 uppercase">PIN</label>
                            <input
                              type="text"
                              value={editPin}
                              onChange={(e) => setEditPin(e.target.value)}
                              className="w-full p-2 text-sm rounded border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-blue-600 uppercase">職位</label>
                          <div className="flex gap-2">
                            {['staff', 'admin'].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setEditRole(r as any)}
                                className={`flex-1 py-1 px-3 rounded text-xs font-bold border ${editRole === r ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500'}`}
                              >
                                {r === 'admin' ? '管理員' : '店員'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="flex-1 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50"
                          >
                            取消
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            儲存變更
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${emp.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{emp.name}</span>
                              {emp.role === 'admin' && (
                                <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase">
                                  <Shield className="w-3 h-3" />
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-blue-600 font-mono font-bold bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-1">
                              PIN: {currentEmployeeRole === 'admin' ? (emp.pin || '(無)') : '****'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(emp)}
                            disabled={currentEmployeeRole !== 'admin'}
                            className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                              currentEmployeeRole === 'admin' 
                                ? 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50' 
                                : 'text-gray-200 cursor-not-allowed'
                            }`}
                            title={currentEmployeeRole === 'admin' ? "編輯人員" : "權限不足"}
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id, emp.role)}
                            disabled={currentEmployeeRole !== 'admin'}
                            className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                              currentEmployeeRole === 'admin' 
                                ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' 
                                : 'text-gray-200 cursor-not-allowed'
                            }`}
                            title={currentEmployeeRole === 'admin' ? "刪除人員" : "權限不足"}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagementModal;
