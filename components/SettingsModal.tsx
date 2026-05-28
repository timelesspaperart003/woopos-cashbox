
import React, { useState, useEffect } from 'react';
import { WCSettings } from '../types';
import { getSecretValue } from '../services/secretManagerService';
import { User } from 'firebase/auth';
import { Users, History } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WCSettings;
  onSave: (settings: WCSettings) => void;
  isOwner: boolean;
  user: User;
  activeStoreUid: string;
  onOpenEmployeeManagement?: () => void;
  onOpenOrderHistory?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, settings, onSave, isOwner, user, activeStoreUid,
  onOpenEmployeeManagement, onOpenOrderHistory
}) => {
  const [formData, setFormData] = useState<WCSettings>(settings);
  const [showSecret, setShowSecret] = useState(false);
  const [isSyncingSecrets, setIsSyncingSecrets] = useState(false);
  const [secretMsg, setSecretMsg] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Sync form data with settings prop whenever modal opens or settings change
  useEffect(() => {
    if (isOpen) {
      // Set defaults for secret names if empty
      setFormData({
        ...settings,
        secretKeyName: settings.secretKeyName || 'woocommerce-pos-key',
        secretSecretName: settings.secretSecretName || 'woocommerce-pos-secret'
      });
      setSecretMsg('');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(activeStoreUid);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFetchSecrets = async () => {
    if (!formData.gcpProjectId || !formData.gcpAccessToken || !formData.secretKeyName || !formData.secretSecretName) {
      setSecretMsg('錯誤：請填寫完整的 GCP 專案 ID、Token 與密鑰名稱');
      return;
    }

    setIsSyncingSecrets(true);
    setSecretMsg('正在連線 Secret Manager...');

    try {
      const [key, secret] = await Promise.all([
        getSecretValue(formData.gcpProjectId, formData.secretKeyName, formData.gcpAccessToken),
        getSecretValue(formData.gcpProjectId, formData.secretSecretName, formData.gcpAccessToken)
      ]);

      setFormData(prev => ({
        ...prev,
        consumerKey: key,
        consumerSecret: secret
      }));

      setSecretMsg('成功：已從 Secret Manager 獲取並填入密鑰！');
    } catch (error: any) {
      setSecretMsg(`失敗：${error.message}`);
    } finally {
      setIsSyncingSecrets(false);
    }
  };

  const handleAddMember = () => {
    const trimmedEmail = newMemberEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) return;
    const currentMembers = formData.members || [];
    if (currentMembers.includes(trimmedEmail)) {
      setNewMemberEmail('');
      return;
    }
    setFormData(prev => ({
      ...prev,
      members: [...currentMembers, trimmedEmail]
    }));
    setNewMemberEmail('');
  };

  const handleRemoveMember = (email: string) => {
    setFormData(prev => ({
      ...prev,
      members: (prev.members || []).filter(m => m !== email)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
       onClose();
       return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">WooCommerce 設定</h2>
          {!isOwner && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
              唯讀模式 (團隊成員)
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Account & Store ID Section */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              目前登入資訊
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 leading-none mb-1">登入帳號</span>
                  <span className="text-sm font-black text-gray-800 font-mono tracking-tight">{user.email}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isOwner ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                  {isOwner ? '主帳號 (OWNER)' : '工作人員 (STAFF)'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm group">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 leading-none mb-1">商店 ID (Store ID)</span>
                  <span className="text-sm font-black text-gray-800 font-mono tracking-tight">{activeStoreUid}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isCopied ? 'bg-green-500 text-white shadow-md' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm'}`}
                >
                  {isCopied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      已複製
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      複製 ID
                    </>
                  )}
                </button>
              </div>
            </div>
            {!isOwner && (
               <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] text-gray-500 italic">
                    * 您目前正以工作人員身份存取此商店。
                  </p>
                  <button 
                    type="button"
                    onClick={() => { localStorage.removeItem(`store_selection_${user.uid}`); window.location.reload(); }}
                    className="w-full py-2 bg-red-50 text-red-600 font-bold text-xs rounded-lg hover:bg-red-100 transition-colors border border-red-100"
                  >
                    結束協作，切換回個人商店
                  </button>
               </div>
            )}
            
            {/* Sales Management section */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                銷售與人員管理
              </h3>
              
              <div className="flex flex-col gap-2">
                 <button
                    type="button"
                    onClick={() => { onClose(); onOpenEmployeeManagement?.(); }}
                    className="w-full py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                 >
                    <Users className="h-4 w-4" />
                    管理店員清單 (銷售人員)
                 </button>
               {isOwner && (
                 <button
                    type="button"
                    onClick={() => { onClose(); (window as any).handleManualJoin?.(); }}
                    className="w-full py-2 bg-gray-50 text-gray-500 font-bold text-xs rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
                 >
                    切換存取其它商店
                 </button>
               )}
              </div>
            </div>
          </div>

          {/* POS History */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => { onClose(); onOpenOrderHistory?.(); }}
              className="w-full py-3 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50 transition-all group shadow-sm flex items-center justify-center gap-2 text-gray-700 font-bold"
            >
              <History className="h-4 w-4 text-indigo-500" />
              查看歷史訂單
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <input
                type="checkbox"
                id="useMockData"
                name="useMockData"
                checked={formData.useMockData}
                onChange={handleChange}
                disabled={!isOwner}
                className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="useMockData" className="text-gray-700 font-medium cursor-pointer select-none">
                使用展示模式 (Mock Data)
              </label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <input
                type="checkbox"
                id="enableCustomerSync"
                name="enableCustomerSync"
                checked={formData.enableCustomerSync ?? true}
                onChange={handleChange}
                disabled={!isOwner}
                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="enableCustomerSync" className="text-gray-700 font-medium cursor-pointer select-none">
                啟用客戶名單同步
              </label>
            </div>
          </div>

          {!formData.useMockData && (
            <>
              {/* Profile Section */}
              <div className="space-y-4 border-b border-gray-100 pb-6">
                <h3 className="font-bold text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  商店基本資料
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">商店名稱 (Store Name)</label>
                  <input
                    type="text"
                    name="storeName"
                    placeholder="Pos store"
                    value={formData.storeName || ''}
                    onChange={handleChange}
                    disabled={!isOwner}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">此名稱將顯示在列印明細的最上方。</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">商店網址 (Store URL)</label>
                  <input
                    type="url"
                    name="url"
                    placeholder="https://yourstore.com"
                    value={formData.url}
                    onChange={handleChange}
                    disabled={!isOwner}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
                    required={!formData.useMockData}
                  />
                </div>
              </div>

              {/* Secret Manager Section */}
              <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-700 flex items-center">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                   </svg>
                   Google Secret Manager (自動填入)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1 flex justify-between">
                      <span>GCP Access Token</span>
                      <a 
                        href="https://developers.google.com/oauthplayground/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-500 hover:underline font-normal"
                      >
                        如何取得？
                      </a>
                    </label>
                    <input
                      type="password"
                      name="gcpAccessToken"
                      placeholder="OAuth 2.0 Access Token"
                      value={formData.gcpAccessToken || ''}
                      onChange={handleChange}
                      disabled={!isOwner}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      提示：您可以使用 Google OAuth Playground 取得具有 `https://www.googleapis.com/auth/cloud-platform` 權限的 Access Token。
                    </p>
                  </div>
                  <div className="col-span-2">
                     <label className="block text-xs font-bold text-gray-500 mb-1">GCP Project ID</label>
                     <input
                      type="text"
                      name="gcpProjectId"
                      placeholder="my-gcp-project-id"
                      value={formData.gcpProjectId || ''}
                      onChange={handleChange}
                      disabled={!isOwner}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Key Secret Name</label>
                    <input
                      type="text"
                      name="secretKeyName"
                      placeholder="woocommerce-pos-key"
                      value={formData.secretKeyName || ''}
                      onChange={handleChange}
                      disabled={!isOwner}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Secret Secret Name</label>
                    <input
                      type="text"
                      name="secretSecretName"
                      placeholder="woocommerce-pos-secret"
                      value={formData.secretSecretName || ''}
                      onChange={handleChange}
                      disabled={!isOwner}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                    />
                  </div>
                </div>
                
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleFetchSecrets}
                    disabled={isSyncingSecrets}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {isSyncingSecrets ? '讀取中...' : '從 GCP 讀取並填入下方欄位'}
                  </button>
                )}
                {secretMsg && (
                  <p className={`text-xs p-2 rounded ${secretMsg.startsWith('錯誤') || secretMsg.startsWith('失敗') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {secretMsg}
                  </p>
                )}
              </div>

              {/* API Credentials (Auto-filled or Manual) */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Key</label>
                  <input
                    type="text"
                    name="consumerKey"
                    placeholder="ck_xxxxxxxx..."
                    value={isOwner ? formData.consumerKey : '************************'}
                    onChange={handleChange}
                    disabled={!isOwner}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none disabled:text-gray-400"
                    required={!formData.useMockData}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Secret</label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      name="consumerSecret"
                      placeholder="cs_xxxxxxxx..."
                      value={isOwner ? formData.consumerSecret : '************************'}
                      onChange={handleChange}
                      disabled={!isOwner}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none pr-10 disabled:text-gray-400"
                      required={!formData.useMockData}
                    />
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showSecret ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                  注意: 瀏覽器可能會因為 CORS 阻擋 API 請求。如遇連線問題，請使用 Demo 模式或安裝 CORS 擴充功能。
                </p>
              </div>

              {/* Team Management Section */}
              <div className="space-y-4 border-t border-gray-100 pt-6">
                <h3 className="font-bold text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  團隊帳號存取 (Shared Access)
                </h3>
                <p className="text-xs text-gray-500">
                  授權其他 Google 帳號存取此商店。受邀成員登入後將有完整或部分管理權限。<br/>
                  <span className="text-indigo-600 font-bold">※ 若只是要新增結帳時的銷售人員，請使用上方的「管理店員清單」。</span>
                </p>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="成員的 Google Email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      disabled={!isOwner}
                      className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100"
                    />
                    {isOwner && (
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        新增
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(formData.members || []).map(email => (
                      <div key={email} className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1.5 rounded-full text-xs font-medium text-gray-700 border border-gray-200">
                        <span>{email}</span>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(email)}
                            className="hover:text-red-500"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    {(formData.members || []).length === 0 && (
                      <span className="text-xs text-gray-400 italic">目前無其他受邀成員</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              {isOwner ? '儲存設定' : '關閉'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
