import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { LogIn, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('彈出視窗被瀏覽器攔截，請允許此網站開啟彈出視窗。');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setError('登入視窗已關閉。');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('此網域尚未在 Firebase 授權列中，請聯繫管理員。');
      } else if (err.code === 'auth/network-request-failed') {
        setError('網路請求失敗。這通常是因為瀏覽器擋住了 Firebase 的通訊，或是您目前處於無痕模式且未允許第三方 Cookie。請嘗試：1. 關閉無痕模式 2. 允許第三方 Cookie 3. 重新整理頁面。');
      } else {
        setError('登入失敗：' + (err.message || '未知錯誤'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg rotate-3">
          <span className="text-white font-black text-3xl">POS</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">WooCommerce POS</h1>
          <p className="text-gray-500">請登入以開始管理您的商店</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 text-sm text-left">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-700 font-bold py-4 px-6 rounded-xl transition-all duration-200 group ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogIn className="w-5 h-5 group-hover:text-blue-600" />
          )}
          {isLoading ? '處理中...' : '使用 Google 帳號登入'}
        </button>
        <div className="pt-4 text-xs text-gray-400">
          登入後您的資料將會自動同步至雲端
          {error && <div className="mt-2 text-blue-500 underline cursor-help" onClick={() => window.location.reload()}>點此重新整理頁面</div>}
        </div>
      </div>
    </div>
  );
};

export default Login;
