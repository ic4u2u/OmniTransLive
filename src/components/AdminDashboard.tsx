import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  DollarSign,
  Activity,
  Search,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Globe2,
  Sliders,
  Download,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Crown,
  Zap,
  Gift,
  RefreshCw,
  Edit,
  ShieldCheck,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import type { AdminCustomer, AdminTransaction, AdminKPIStats } from '../types/admin';
import type { PlanType } from '../types/translator';
import { INITIAL_CUSTOMERS, INITIAL_TRANSACTIONS, INITIAL_KPI_STATS } from '../data/mockAdminData';

interface AdminDashboardProps {
  onBackToService: () => void;
  onLogout?: () => void;
  showToast: (msg: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToService,
  onLogout,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'transactions' | 'analytics' | 'settings'>('customers');
  const [kpiStats, setKpiStats] = useState<AdminKPIStats>(INITIAL_KPI_STATS);
  const [customers, setCustomers] = useState<AdminCustomer[]>(INITIAL_CUSTOMERS);
  const [transactions] = useState<AdminTransaction[]>(INITIAL_TRANSACTIONS);

  // 검색 및 필터 상태
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<'ALL' | PlanType>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'active' | 'paused' | 'expired'>('ALL');

  // 고객 관리 모달
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [customAddMinutes, setCustomAddMinutes] = useState<number>(60);

  // 검색 및 필터링된 고객 목록
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.email.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.country.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.id.toLowerCase().includes(searchKeyword.toLowerCase());

      const matchPlan = selectedPlanFilter === 'ALL' || c.plan === selectedPlanFilter;
      const matchStatus = selectedStatusFilter === 'ALL' || c.status === selectedStatusFilter;

      return matchSearch && matchPlan && matchStatus;
    });
  }, [customers, searchKeyword, selectedPlanFilter, selectedStatusFilter]);

  // 원클릭 시간 충전 핸들러
  const handleAddMinutes = (customerId: string, minutes: number) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const newRemaining = c.remainingMinutes === 999999 ? 999999 : c.remainingMinutes + minutes;
          return {
            ...c,
            remainingMinutes: newRemaining,
            status: 'active',
          };
        }
        return c;
      })
    );
    showToast(`⏱️ ${minutes}분이 즉시 충전되었습니다.`);
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer((prev) => (prev ? { ...prev, remainingMinutes: prev.remainingMinutes + minutes } : null));
    }
  };

  // 플랜 강제 변경 핸들러
  const handleChangePlan = (customerId: string, newPlan: PlanType) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const defaultMinutes = newPlan === 'premium' ? 999999 : newPlan === 'standard' ? 500 : newPlan === 'lite' ? 100 : 10;
          return {
            ...c,
            plan: newPlan,
            remainingMinutes: defaultMinutes,
            status: 'active',
          };
        }
        return c;
      })
    );
    showToast(`👑 ${newPlan.toUpperCase()} 플랜으로 성공적으로 변경되었습니다.`);
    setSelectedCustomer(null);
  };

  // 계정 상태 토글
  const handleToggleStatus = (customerId: string) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const nextStatus = c.status === 'active' ? 'paused' : 'active';
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
    showToast('상태가 업데이트되었습니다.');
  };

  // CSV 데이터 내보내기
  const handleExportCSV = () => {
    const headers = ['고객ID,이름,이메일,국가,플랜,잔여분,사용분,총결제액,상태,최근접속일\n'];
    const rows = customers.map(
      (c) =>
        `"${c.id}","${c.name}","${c.email}","${c.country}","${c.plan}",${c.remainingMinutes},${c.totalUsedMinutes},$${c.totalPaidAmount},"${c.status}","${c.lastActive}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + headers.concat(rows.join('\n'));
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `omnitrans_customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 고객 데이터 CSV 다운로드가 완료되었습니다.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* 1. 어드민 상단 글로벌 내비게이션 바 */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                <span>OmniTrans LIVE</span>
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-extrabold text-xs">
                  ADMIN CRM
                </span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-black tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              글로벌 실시간 1:1 통역 통합 관제 및 고객 관리 콘솔
            </p>
          </div>
        </div>

        {/* 우측 서비스로 돌아가기 & 새로고침 & 로그아웃 버튼 */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              setKpiStats({ ...kpiStats, activeLiveSessions: Math.floor(Math.random() * 15) + 42 });
              showToast('🔄 실시간 지표가 갱신되었습니다.');
            }}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/80 transition-all active:scale-95 shadow-sm"
            title="데이터 새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={onBackToService}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>라이브 서비스 열기</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-extrabold transition-all active:scale-95 flex items-center gap-1.5"
              title="관리자 보안 로그아웃"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. 메인 대시보드 본문 컨테이너 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* 상단 KPI 4대 핵심 지표 Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* 총 활성 고객 카드 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl relative overflow-hidden group hover:border-indigo-500/40 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                총 활성 고객 (CRM)
              </span>
              <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-inner">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">
                {kpiStats.totalCustomers.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-emerald-400 flex items-center bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +{kpiStats.newCustomersThisMonth} 당월
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>무료 체험 68%</span>
              <span className="text-indigo-400 font-bold">전환율 14.8%</span>
            </div>
          </div>

          {/* 누적 실시간 통역 시간 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl relative overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                누적 실시간 통역 시간
              </span>
              <div className="w-9 h-9 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-inner">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">
                {(kpiStats.totalTranslationMinutes / 60).toLocaleString(undefined, { maximumFractionDigits: 0 })}시간
              </span>
              <span className="text-xs font-semibold text-purple-300">
                ({kpiStats.totalTranslationMinutes.toLocaleString()}분)
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>평균 세션 18.5분</span>
              <span className="text-purple-400 font-bold">지연율 &lt; 0.4s</span>
            </div>
          </div>

          {/* 당월 결제 매출 (MRR) */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                당월 결제 매출 (MRR)
              </span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                ${kpiStats.monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-emerald-400 flex items-center bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                <ArrowUpRight className="w-3 h-3" />
                +24.5%
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>연간 환산 (ARR)</span>
              <span className="text-emerald-400 font-bold">${(kpiStats.monthlyRevenue * 12).toLocaleString()}</span>
            </div>
          </div>

          {/* 현재 활성 1:1 통역 룸 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl relative overflow-hidden group hover:border-pink-500/40 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl group-hover:bg-pink-500/20 transition" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                현재 활성 1:1 세션
              </span>
              <div className="w-9 h-9 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center shadow-inner">
                <Activity className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-pink-400 tracking-tight">
                {kpiStats.activeLiveSessions}개 룸
              </span>
              <span className="text-xs font-bold text-pink-300 bg-pink-950/60 px-2 py-0.5 rounded-full border border-pink-800/50">
                P2P Live
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>STUN/WebRTC 정상</span>
              <span className="text-pink-400 font-bold">초저지연 무선</span>
            </div>
          </div>

        </div>

        {/* 3. 대시보드 탭 메뉴 */}
        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'customers'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>고객 및 이용권 관리 ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'transactions'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>결제 및 PG 승인 로그 ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Globe2 className="w-4 h-4" />
            <span>국가/언어별 점유율 통계</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>운영 정책 설정</span>
          </button>
        </div>

        {/* 4. [탭 1] 고객 및 이용권 관리 (CRM 통합 테이블) */}
        {activeTab === 'customers' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* 검색 및 필터 바 */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-3xl border border-slate-800/80 shadow-lg">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="고객명, 이메일, 국가, 고객 ID 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* 플랜 필터 */}
                <select
                  value={selectedPlanFilter}
                  onChange={(e) => setSelectedPlanFilter(e.target.value as any)}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">전체 요금제</option>
                  <option value="free">🎁 Free Trial (10분 무료)</option>
                  <option value="lite">🌱 Lite ($9.99)</option>
                  <option value="standard">⚡ Standard ($29.99)</option>
                  <option value="premium">👑 Premium ($99.99)</option>
                </select>

                {/* 상태 필터 */}
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">전체 상태</option>
                  <option value="active">🟢 정상 이용 중</option>
                  <option value="paused">🟡 일시정지</option>
                  <option value="expired">🔴 시간소진</option>
                </select>

                {/* CSV 엑셀 다운로드 */}
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold border border-slate-700 transition flex items-center gap-1.5 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>CSV 내보내기</span>
                </button>
              </div>
            </div>

            {/* 고객 목록 테이블 */}
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800/90 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-extrabold uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-5">고객 정보</th>
                      <th className="py-4 px-5">국가 & 주사용 언어</th>
                      <th className="py-4 px-5">현재 플랜</th>
                      <th className="py-4 px-5">잔여 시간 / 누적 사용</th>
                      <th className="py-4 px-5">총 결제액</th>
                      <th className="py-4 px-5">상태</th>
                      <th className="py-4 px-5 text-right">원클릭 조작 & 분 충전</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-slate-800/40 transition">
                        
                        {/* 고객 정보 */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/40 text-indigo-300 font-black flex items-center justify-center text-xs shadow-inner">
                              {cust.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="font-extrabold text-white text-sm">{cust.name}</div>
                              <div className="text-[11px] text-slate-400">{cust.email}</div>
                              <div className="text-[10px] text-slate-500 font-mono">ID: {cust.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* 국가 & 언어 */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-200">
                            <span className="text-base">{cust.countryFlag}</span>
                            <span>{cust.country}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {cust.primaryLanguages.map((lang, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-bold">
                                {lang}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 플랜 */}
                        <td className="py-4 px-5">
                          {cust.plan === 'premium' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 text-amber-400 border border-amber-700/60 text-xs font-black">
                              <Crown className="w-3.5 h-3.5 text-amber-400" />
                              Premium
                            </span>
                          )}
                          {cust.plan === 'standard' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/60 text-indigo-400 border border-indigo-700/60 text-xs font-black">
                              <Zap className="w-3.5 h-3.5 text-indigo-400" />
                              Standard
                            </span>
                          )}
                          {cust.plan === 'lite' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-black">
                              Lite
                            </span>
                          )}
                          {cust.plan === 'free' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-700/60 text-xs font-black">
                              <Gift className="w-3.5 h-3.5 text-emerald-400" />
                              Free Trial
                            </span>
                          )}
                        </td>

                        {/* 잔여 / 누적 사용 */}
                        <td className="py-4 px-5">
                          <div className="font-black text-white text-sm">
                            {cust.remainingMinutes === 999999 ? (
                              <span className="text-amber-400 font-extrabold">무제한 이용권</span>
                            ) : (
                              `${cust.remainingMinutes}분 남음`
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            총 {cust.totalUsedMinutes}분 사용됨
                          </div>
                        </td>

                        {/* 총 결제액 */}
                        <td className="py-4 px-5 font-black text-slate-100 text-sm">
                          ${cust.totalPaidAmount.toFixed(2)}
                        </td>

                        {/* 상태 */}
                        <td className="py-4 px-5">
                          {cust.status === 'active' && (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-black text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              정상
                            </span>
                          )}
                          {cust.status === 'paused' && (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-black text-xs">
                              <AlertCircle className="w-3.5 h-3.5" />
                              일시정지
                            </span>
                          )}
                          {cust.status === 'expired' && (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-black text-xs">
                              <XCircle className="w-3.5 h-3.5" />
                              시간소진
                            </span>
                          )}
                          <div className="text-[10px] text-slate-500 mt-1">{cust.lastActive}</div>
                        </td>

                        {/* 조작 버튼 */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAddMinutes(cust.id, 30)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-black transition-all active:scale-95"
                              title="30분 즉시 충전"
                            >
                              +30분
                            </button>

                            <button
                              onClick={() => handleAddMinutes(cust.id, 100)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 text-xs font-black transition-all active:scale-95"
                              title="100분 즉시 충전"
                            >
                              +100분
                            </button>

                            <button
                              onClick={() => setSelectedCustomer(cust)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                              title="상세 플랜 및 상태 변경"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 5. [탭 2] 결제 및 PG 로그 */}
        {activeTab === 'transactions' && (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800/90 overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">실시간 PG 결제 승인 내역</h3>
                <p className="text-xs text-slate-400 mt-0.5">Toss Payments, Stripe, PayPay, Alipay 전 세계 결제 승인 로그</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 text-xs font-black">
                Webhook LIVE
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-extrabold uppercase text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-5">영수증 ID</th>
                    <th className="py-4 px-5">고객명</th>
                    <th className="py-4 px-5">구입 플랜</th>
                    <th className="py-4 px-5">결제 PG 수단</th>
                    <th className="py-4 px-5">승인 금액</th>
                    <th className="py-4 px-5">결제 일시</th>
                    <th className="py-4 px-5">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-5 font-mono text-indigo-400 font-bold">{tx.id}</td>
                      <td className="py-4 px-5 font-black text-white">{tx.customerName}</td>
                      <td className="py-4 px-5 uppercase font-extrabold">{tx.plan} ({tx.isYearly ? '연간' : '월간'})</td>
                      <td className="py-4 px-5 font-bold text-slate-300">{tx.pgProvider}</td>
                      <td className="py-4 px-5 font-black text-emerald-400 text-sm">${tx.amount.toFixed(2)} {tx.currency}</td>
                      <td className="py-4 px-5 text-slate-400">{tx.date}</td>
                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-[11px] font-black border border-emerald-800">
                          승인완료
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. [탭 3] 언어 & 국가 통계 */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            
            {/* 언어별 사용량 순위 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-2xl space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-indigo-400" />
                <span>가장 많이 쓰이는 통역 언어 TOP 6</span>
              </h3>
              
              <div className="space-y-4 pt-2">
                {[
                  { name: '한국어 (Korean)', percent: 34, count: '62,730분', color: 'bg-indigo-500' },
                  { name: '영어 (English)', percent: 28, count: '51,660분', color: 'bg-blue-500' },
                  { name: '일본어 (Japanese)', percent: 18, count: '33,210분', color: 'bg-rose-500' },
                  { name: '중국어 (Chinese)', percent: 11, count: '20,295분', color: 'bg-amber-500' },
                  { name: '베트남어 (Vietnamese)', percent: 6, count: '11,070분', color: 'bg-emerald-500' },
                  { name: '스페인어 (Spanish)', percent: 3, count: '5,535분', color: 'bg-purple-500' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-300">
                      <span>{item.name}</span>
                      <span className="text-slate-400">{item.count} ({item.percent}%)</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 요금제별 고객 분포 */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-2xl space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>요금제별 고객 분포 및 기여도</span>
              </h3>

              <div className="space-y-3.5 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-black text-amber-400 flex items-center gap-1.5">
                      <Crown className="w-4 h-4" />
                      <span>Premium ($99.99 / 무제한)</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">기업/전문가용 · 매출 기여도 65%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-white">124개 기업</div>
                    <div className="text-xs text-emerald-400 font-bold">$12,398 /월</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-black text-indigo-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      <span>Standard ($29.99 / 500분)</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">글로벌 비즈니스 회화 · 매출 기여도 26%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-white">162명</div>
                    <div className="text-xs text-emerald-400 font-bold">$4,858 /월</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-black text-slate-300">Lite ($9.99 / 100분)</div>
                    <div className="text-xs text-slate-400 mt-0.5">개인 여행 및 일상 대화</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-white">116명</div>
                    <div className="text-xs text-emerald-400 font-bold">$1,158 /월</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-black text-emerald-400 flex items-center gap-1.5">
                      <Gift className="w-4 h-4" />
                      <span>Free Trial (10분 무료 체험)</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">신규 가입 즉시 체험자</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-white">846명</div>
                    <div className="text-xs text-slate-400 font-bold">잠재 고객</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 7. [탭 4] 운영 정책 설정 */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-slate-900/90 p-6 rounded-3xl border border-slate-800/90 space-y-6 animate-fade-in shadow-2xl">
            <div>
              <h3 className="text-base font-black text-white">시스템 정책 및 파라미터 제어</h3>
              <p className="text-xs text-slate-400 mt-1">글로벌 서비스 운영을 위한 기본값 및 규칙을 제어합니다.</p>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">신규 고객 무료 체험 시간 (Free Trial)</div>
                  <div className="text-[11px] text-slate-500">회원가입/카드 없이 즉시 부여되는 기본 분</div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-slate-800 font-black text-indigo-400 text-xs">
                  10분 (기본)
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">WebRTC P2P 무선 동기화 모드</div>
                  <div className="text-[11px] text-slate-500">Google STUN 서버 및 Twilio ICE 브로커 연동</div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-black border border-emerald-700">
                  ONLINE
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">자동 결제 웹훅 (Toss / Stripe / PayPay)</div>
                  <div className="text-[11px] text-slate-500">결제 즉시 실시간 시간 자동 충전 파이프라인</div>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-950 text-indigo-400 text-xs font-black border border-indigo-700">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 고객 상세 조작 팝업 모달 */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-800 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h4 className="text-base font-black text-white">{selectedCustomer.name}</h4>
                <p className="text-xs text-slate-400">{selectedCustomer.email} ({selectedCustomer.country})</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* 플랜 강제 변경 */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block">플랜 즉시 변경</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleChangePlan(selectedCustomer.id, 'premium')}
                    className="p-3 rounded-2xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>VIP 무제한 부여</span>
                  </button>
                  <button
                    onClick={() => handleChangePlan(selectedCustomer.id, 'standard')}
                    className="p-3 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Standard (500분)</span>
                  </button>
                  <button
                    onClick={() => handleChangePlan(selectedCustomer.id, 'lite')}
                    className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition"
                  >
                    Lite (100분)
                  </button>
                  <button
                    onClick={() => handleChangePlan(selectedCustomer.id, 'free')}
                    className="p-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Free Trial (10분)</span>
                  </button>
                </div>
              </div>

              {/* 커스텀 분 추가 충전 */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block">추가 통역 시간 충전</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customAddMinutes}
                    onChange={(e) => setCustomAddMinutes(Number(e.target.value))}
                    className="w-28 px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                    placeholder="분"
                  />
                  <button
                    onClick={() => {
                      handleAddMinutes(selectedCustomer.id, customAddMinutes);
                    }}
                    className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md transition"
                  >
                    +{customAddMinutes}분 즉시 충전
                  </button>
                </div>
              </div>

              {/* 계정 상태 전환 */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    handleToggleStatus(selectedCustomer.id);
                    setSelectedCustomer(null);
                  }}
                  className={`w-full py-3 rounded-2xl text-xs font-black border transition ${
                    selectedCustomer.status === 'active'
                      ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800 text-rose-400'
                      : 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-800 text-emerald-400'
                  }`}
                >
                  {selectedCustomer.status === 'active' ? '🚫 계정 일시정지 처리' : '🟢 계정 정상 활성화'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
