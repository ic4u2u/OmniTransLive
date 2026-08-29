import React, { useState } from 'react';
import { Check, Zap, Crown, Sparkles, Download, Database } from 'lucide-react';
import type { PlanType, UserAccount } from '../types/translator';
import type { UIStringDictionary } from '../i18n/translations';

interface PricingSectionProps {
  userAccount: UserAccount;
  onOpenCheckout: (plan: PlanType, isYearly: boolean) => void;
  onBackToChat: () => void;
  t: UIStringDictionary;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  userAccount,
  onOpenCheckout,
  onBackToChat,
  t,
}) => {
  const [isYearly, setIsYearly] = useState(false);

  // 개편된 공식 가격 체계: Lite $9.99, Standard $29.99, Premium $99.99
  const PLANS: {
    id: PlanType;
    popular?: boolean;
    priceMonthly: number;
    priceYearly: number;
    minutesPerMonth: number | 'unlimited';
    customDatasets: number;
  }[] = [
    {
      id: 'lite',
      priceMonthly: 9.99,
      priceYearly: 7.99,
      minutesPerMonth: 100,
      customDatasets: 1,
    },
    {
      id: 'standard',
      popular: true,
      priceMonthly: 29.99,
      priceYearly: 23.99,
      minutesPerMonth: 500,
      customDatasets: 2,
    },
    {
      id: 'premium',
      priceMonthly: 99.99,
      priceYearly: 79.99,
      minutesPerMonth: 'unlimited',
      customDatasets: 3,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto w-full py-6 sm:py-10 px-4">
      
      {/* 헤더 안내 */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t.pricingBadge}</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t.pricingTitle}
        </h2>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
          {t.pricingSubtitle}
        </p>

        {/* 연간 결제 할인 토글 */}
        <div className="mt-6 inline-flex items-center gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              !isYearly
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.monthlyBilling}
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isYearly
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>{t.yearlyBilling}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {t.discount20}
            </span>
          </button>
        </div>
      </div>

      {/* 요금제 3단 카드 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {PLANS.map((plan) => {
          const isCurrent = userAccount.currentPlan === plan.id;
          const price = isYearly ? plan.priceYearly : plan.priceMonthly;
          const planContent = t.plans[plan.id];

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                plan.popular
                  ? 'bg-gradient-to-b from-indigo-50/80 via-white to-white dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[11px] font-extrabold shadow-sm flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>{t.popularChoice}</span>
                </div>
              )}

              <div>
                {/* 플랜 이름 및 순수 현지화 태그라인 */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {planContent.name}
                  </h3>
                  {plan.id === 'premium' && <Crown className="w-5 h-5 text-amber-500" />}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 min-h-[32px]">
                  {planContent.tagline}
                </p>

                {/* 가격 표시 ($9.99 / $29.99 / $99.99) */}
                <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                    ${price.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ mo</span>
                </div>

                {/* 핵심 제공 항목 배지 */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="p-1 rounded bg-indigo-50 dark:bg-slate-800 text-indigo-600">⏱️</span>
                    <span>
                      {plan.minutesPerMonth === 'unlimited'
                        ? t.unlimitedMinutes
                        : t.minutesMonth.replace('{0}', String(plan.minutesPerMonth))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="p-1 rounded bg-indigo-50 dark:bg-slate-800 text-indigo-600"><Database className="w-3 h-3" /></span>
                    <span>{t.customDatasetsCount.replace('{0}', String(plan.customDatasets))}</span>
                  </div>
                  {plan.id !== 'lite' && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span className="p-1 rounded bg-indigo-50 dark:bg-slate-800 text-indigo-600"><Download className="w-3 h-3" /></span>
                      <span>{t.downloadSupported}</span>
                    </div>
                  )}
                </div>

                {/* 세부 기능 리스트 (100% 선택 언어) */}
                <div className="space-y-3 mb-8">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t.includedBenefits}
                  </span>
                  {planContent.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 구독/결제 PG 모달 열기 버튼 */}
              <button
                onClick={() => !isCurrent && onOpenCheckout(plan.id, isYearly)}
                disabled={isCurrent}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs transition-all shadow-sm ${
                  isCurrent
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default border border-slate-200 dark:border-slate-700'
                    : plan.popular
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 active:scale-95'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-95'
                }`}
              >
                {isCurrent ? t.currentPlan : `${planContent.name} ${t.startPlan}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* 하단 FAQ 및 돌아가기 */}
      <div className="mt-12 text-center">
        <button
          onClick={onBackToChat}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {t.backToChat}
        </button>
      </div>

    </div>
  );
};
