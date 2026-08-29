import React, { useState } from 'react';
import { Check, Zap, Crown, Sparkles, Download, Database, Gift, ArrowRight } from 'lucide-react';
import type { PlanType, UserAccount } from '../types/translator';
import type { UIStringDictionary } from '../i18n/translations';

interface PricingSectionProps {
  userAccount: UserAccount;
  onOpenCheckout: (plan: PlanType, isYearly: boolean) => void;
  onBackToChat: () => void;
  onSelectFreeTrial?: () => void;
  t: UIStringDictionary;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  userAccount,
  onOpenCheckout,
  onBackToChat,
  onSelectFreeTrial,
  t,
}) => {
  const [isYearly, setIsYearly] = useState(false);

  // 플랜 목록: Free (10분 무료) + Lite ($9.99) + Standard ($29.99) + Premium ($99.99)
  const PLANS: {
    id: PlanType;
    isFree?: boolean;
    popular?: boolean;
    priceMonthly: number;
    priceYearly: number;
    minutesPerMonth: number | 'unlimited';
    customDatasets: number;
  }[] = [
    {
      id: 'free',
      isFree: true,
      priceMonthly: 0,
      priceYearly: 0,
      minutesPerMonth: 10,
      customDatasets: 0,
    },
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
    <div className="max-w-7xl mx-auto w-full py-6 sm:py-10 px-4">
      
      {/* 헤더 안내 */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold mb-3">
          <Gift className="w-4 h-4 text-pink-500 animate-bounce" />
          <span>{t.freeTrialBadge || '10분 무료 체험 제공'}</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t.pricingTitle}
        </h2>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
          {t.pricingSubtitle}
        </p>

        {/* 연간 결제 할인 토글 */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-xs sm:text-sm font-bold ${!isYearly ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
            {t.monthlyBilling}
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              isYearly ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            aria-label="Toggle yearly billing"
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                isYearly ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs sm:text-sm font-bold ${isYearly ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              {t.yearlyBilling}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold border border-emerald-300 dark:border-emerald-800">
              {t.discount20}
            </span>
          </div>
        </div>
      </div>

      {/* 4단 반응형 플랜 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
        {PLANS.map((plan) => {
          const isCurrent = userAccount.currentPlan === plan.id;
          const planInfo = t.plans[plan.id];
          const price = isYearly ? plan.priceYearly : plan.priceMonthly;

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all relative ${
                plan.popular
                  ? 'bg-gradient-to-b from-indigo-50/80 to-purple-50/40 dark:from-indigo-950/40 dark:to-slate-900 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 lg:-translate-y-2'
                  : plan.isFree
                  ? 'bg-gradient-to-b from-emerald-50/80 to-slate-50 dark:from-emerald-950/20 dark:to-slate-900 border-2 border-emerald-500/40 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm'
              }`}
            >
              {/* 상단 배지 */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-black rounded-full shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{t.popularBadge}</span>
                </div>
              )}

              {plan.isFree && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-[11px] font-black rounded-full shadow-md flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  <span>{t.freeTrialBadge}</span>
                </div>
              )}

              <div>
                {/* 플랜 이름 및 태그라인 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {planInfo?.name}
                    </h3>
                    {plan.id === 'premium' && <Crown className="w-5 h-5 text-amber-500" />}
                    {plan.id === 'standard' && <Zap className="w-5 h-5 text-indigo-500" />}
                    {plan.isFree && <Gift className="w-5 h-5 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium min-h-[32px]">
                    {planInfo?.tagline}
                  </p>
                </div>

                {/* 가격 표시 */}
                <div className="mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      {plan.isFree ? '$0' : `$${price.toFixed(2)}`}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {plan.isFree ? '/ 10분 무료' : t.perMonth}
                    </span>
                  </div>
                  {isYearly && !plan.isFree && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      {t.yearlyDiscountBadge}
                    </p>
                  )}
                  {plan.isFree && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      카드 등록 불필요 · 즉시 체험
                    </p>
                  )}
                </div>

                {/* 주요 수치 혜택 */}
                <div className="space-y-2 mb-5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>
                      {plan.minutesPerMonth === 'unlimited'
                        ? t.unlimitedMinutes
                        : `${plan.minutesPerMonth} ${t.minutesMonth || '분 제공'}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {plan.customDatasets === 0
                        ? '기본 사전 제공'
                        : `${plan.customDatasets} ${t.customDatasetsCount}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span className={plan.id === 'lite' || plan.isFree ? 'text-slate-400 line-through font-normal' : ''}>
                      {t.downloadSupported}
                    </span>
                  </div>
                </div>

                {/* 포함된 상세 혜택 리스트 */}
                <div className="space-y-2 mb-6">
                  <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {t.includedBenefits}
                  </p>
                  {planInfo?.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 하단 시작 버튼 */}
              <div>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold cursor-default"
                  >
                    {t.currentPlan}
                  </button>
                ) : plan.isFree ? (
                  <button
                    onClick={() => {
                      if (onSelectFreeTrial) onSelectFreeTrial();
                      else onBackToChat();
                    }}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>무료로 지금 체험하기</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenCheckout(plan.id, isYearly)}
                    className={`w-full py-3 rounded-2xl text-xs font-extrabold transition-all active:scale-95 shadow-md ${
                      plan.popular
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/25'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-slate-900/10'
                    }`}
                  >
                    {t.startPlan}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 1:1 통역으로 돌아가기 버튼 */}
      <div className="text-center mt-8">
        <button
          onClick={onBackToChat}
          className="text-xs sm:text-sm font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          {t.backToChat}
        </button>
      </div>

    </div>
  );
};

export default PricingSection;
