import React, { useState, useEffect } from 'react';
import { X, Lock, User, Check, AlertCircle } from 'lucide-react';
import { Employee } from '../../types';
import { db, collection, query, where, getDocs, handleFirestoreError, OperationType } from '../firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  onLogin: (employee: Employee) => void;
}

const EmployeeLoginModal: React.FC<Props> = ({ isOpen, onClose, uid, onLogin }) => {
  const [pin, setPin] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!uid || !isOpen) return;
    const fetchEmployees = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'employees'), where('uid', '==', uid));
        const snapshot = await getDocs(q);
        setEmployees(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'employees');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, [uid, isOpen]);

  const handleEmployeeSelect = (emp: Employee) => {
    if (!emp.pin) {
      // Auto-login if no PIN set
      onLogin(emp);
      onClose();
    } else {
      setSelectedEmployee(emp);
      setPin('');
      setError(null);
    }
  };

  const handlePinClick = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleLogin = (pinToTry: string) => {
    if (!selectedEmployee) {
      // Find mode (original behavior as fallback)
      const employee = employees.find(e => e.pin === pinToTry);
      if (employee) {
        onLogin(employee);
        setPin('');
        onClose();
      } else if (pinToTry.length >= 6) {
        setError("PIN 碼錯誤");
        setPin('');
      }
      return;
    }

    if (selectedEmployee.pin === pinToTry) {
      onLogin(selectedEmployee);
      setPin('');
      onClose();
    } else if (pinToTry.length >= selectedEmployee.pin.length) {
      setError("PIN 碼錯誤");
      setPin('');
    }
  };

  useEffect(() => {
    if (pin.length > 0) {
      if (selectedEmployee) {
        if (pin.length === selectedEmployee.pin.length) {
          handleLogin(pin);
        }
      } else {
        // Fallback: try to find by PIN if enough digits entered
        if (pin.length >= 4) {
          const match = employees.find(e => e.pin === pin);
          if (match) handleLogin(pin);
        }
      }
    }
  }, [pin, selectedEmployee]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center space-y-6">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12" /> {/* Spacer */}
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              {selectedEmployee ? (
                <div className="text-xl font-black">{selectedEmployee.name.charAt(0)}</div>
              ) : (
                <Lock className="w-8 h-8" />
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedEmployee ? `您好, ${selectedEmployee.name}` : '切換銷售人員'}
            </h2>
            <p className="text-sm text-gray-500">
              {selectedEmployee ? '請輸入您的 PIN 碼' : '請選擇人員或直接輸入 PIN 碼'}
            </p>
          </div>

          {!selectedEmployee ? (
            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1 custom-scrollbar">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => handleEmployeeSelect(emp)}
                  className="p-3 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-blue-200"
                >
                  <div className="truncate">{emp.name}</div>
                  {!emp.pin && <div className="text-[10px] text-green-500 font-normal">直接登入</div>}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex justify-center gap-3">
              {[...Array(selectedEmployee.pin.length)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    i < pin.length ? 'bg-blue-600 border-blue-600 scale-110 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'border-gray-200'
                  }`}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-bold animate-shake bg-red-50 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handlePinClick(num.toString())}
                className="aspect-square flex items-center justify-center text-2xl font-bold text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all active:scale-95 shadow-sm border border-transparent hover:border-blue-100"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => {
                if (selectedEmployee) setSelectedEmployee(null);
                setPin('');
                setError(null);
              }}
              className="aspect-square flex items-center justify-center text-sm font-bold text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-2xl transition-all active:scale-95 border border-transparent"
            >
              回列表
            </button>
            <button
              onClick={() => handlePinClick('0')}
              className="aspect-square flex items-center justify-center text-2xl font-bold text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all active:scale-95 shadow-sm border border-transparent"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="aspect-square flex items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all active:scale-95 border border-transparent"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLoginModal;
