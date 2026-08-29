import React, { useState } from 'react';
import { X, ShieldCheck, Lock, ArrowRight, Zap } from 'lucide-react';
import type { PlanType } from '../types/translator';
import type { UIStringDictionary, UILanguage } from '../i18n/translations';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: PlanType | null;
  isYearly: boolean;
  uiLang: UILanguage;
  t: UIStringDictionary;
  onSuccess: (planId: PlanType) => void;
}

// 통화 환율 환산 유틸
function getLocalPrice(usdPrice: number, lang: UILanguage): string {
  switch (lang) {
    case 'ko':
      return (Math.round(usdPrice * 1350 / 100) * 100).toLocaleString(); // 약 13,500원
    case 'ja':
      return Math.round(usdPrice * 155).toLocaleString(); // 약 1,550円
    case 'zh':
      return (usdPrice * 7.2).toFixed(1); // 약 72.0元
    case 'es':
    case 'fr':
    case 'de':
      return (usdPrice * 0.92).toFixed(2); // 약 9.19€
    case 'vi':
      return (Math.round(usdPrice * 25000 / 1000) * 1000).toLocaleString(); // 약 250,000đ
    default:
      return usdPrice.toFixed(2);
  }
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  planId,
  isYearly,
  uiLang,
  t,
  onSuccess,
}) => {
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !planId) return null;

  const planInfo = t.plans[planId];

  // 기본 가격: Lite $9.99, Standard $29.99, Premium $99.99 (연간 20% 할인 $7.99, $23.99, $79.99)
  const baseMonthlyPrice = planId === 'premium' ? 99.99 : planId === 'standard' ? 29.99 : 9.99;
  const currentPrice = isYearly ? baseMonthlyPrice * 0.8 : baseMonthlyPrice;
  const localPriceStr = getLocalPrice(currentPrice, uiLang);

  // 기본 선택된 PG 수단
  const currentSelectedMethod = selectedMethodId || t.paymentMethods[0]?.id;

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(planId);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col relative overflow-hidden">
        
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 헤더 */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t.checkoutTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.checkoutSubtitle}
            </p>
          </div>
        </div>

        {/* 선택된 플랜 요약 박스 */}
        <div className="my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {planInfo.name} Plan
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                {isYearly ? t.yearlyBilling : t.monthlyBilling}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {planInfo.tagline}
            </p>
          </div>

          <div className="text-right">
            <div className="text-lg sm:text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
              ${currentPrice.toFixed(2)}
              <span className="text-xs text-slate-400 font-normal"> / mo</span>
            </div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {t.approxLocalPrice.replace('{0}', localPriceStr)}
            </div>
          </div>
        </div>

        {/* 결제 수단 (선택된 국가 현지화 PG) */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t.selectPaymentMethod}
            </label>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              {t.popularLocalPG}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {t.paymentMethods.map((pm) => {
              const isSelected = currentSelectedMethod === pm.id;

              return (
                <div
                  key={pm.id}
                  onClick={() => setSelectedMethodId(pm.id)}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{pm.icon}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {pm.name}
                    </span>
                  </div>

                  {pm.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {pm.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 결제하기 액션 버튼 */}
        <button
          onClick={handlePay}
          disabled={isProcessing}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition active:scale-95 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>결제 승인 처리 중...</span>
            </div>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current" />
              <span>{t.payNowBtn} (${currentPrice.toFixed(2)})</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* 보안 보증 뱃지 */}
        <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>{t.securityNotice}</span>
        </div>

      </div>
    </div>
  );
};
