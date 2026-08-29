import React, { useState } from 'react';
import { X, Database, Plus, Trash2, Lock } from 'lucide-react';
import type { UserAccount } from '../types/translator';
import type { UIStringDictionary } from '../i18n/translations';

interface CustomDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAccount: UserAccount;
  onToggleDataset: (id: string) => void;
  onAddDataset: (name: string, description: string) => void;
  onDeleteDataset: (id: string) => void;
  onUpgradeClick: () => void;
  t: UIStringDictionary;
}

export const CustomDatasetModal: React.FC<CustomDatasetModalProps> = ({
  isOpen,
  onClose,
  userAccount,
  onToggleDataset,
  onAddDataset,
  onDeleteDataset,
  onUpgradeClick,
  t,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const maxAllowed =
    userAccount.currentPlan === 'premium' ? 3 : userAccount.currentPlan === 'standard' ? 2 : 1;
  const currentCount = userAccount.datasets.length;
  const canAddMore = currentCount < maxAllowed;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !canAddMore) return;
    onAddDataset(name.trim(), description.trim());
    setName('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t.datasetModalTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {t.datasetCurrentPlan}: <strong className="text-indigo-600 uppercase">{userAccount.currentPlan}</strong> ({currentCount}/{maxAllowed})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 데이터셋 목록 */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {userAccount.datasets.map((dataset) => (
            <div
              key={dataset.id}
              className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                dataset.active
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {dataset.name}
                  </h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                    {dataset.termsCount}{t.datasetTerms}
                  </span>
                </div>
                {dataset.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {dataset.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleDataset(dataset.id)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-xl transition ${
                    dataset.active
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {dataset.active ? t.datasetActive : t.datasetInactive}
                </button>
                <button
                  onClick={() => onDeleteDataset(dataset.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 새 데이터셋 추가 폼 또는 업그레이드 배너 */}
        {canAddMore ? (
          <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> {t.datasetAddNew}
            </h4>
            <input
              type="text"
              placeholder={t.datasetNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder={t.datasetDescPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              {t.datasetSubmit}
            </button>
          </form>
        ) : (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-semibold">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{t.datasetLimitReached}</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onUpgradeClick();
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-slate-900 hover:bg-amber-400 transition"
              >
                {t.datasetUpgradeBtn}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
