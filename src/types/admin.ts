import type { PlanType } from './translator';

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  country: string;
  countryFlag: string;
  plan: PlanType;
  remainingMinutes: number;
  totalUsedMinutes: number;
  totalPaidAmount: number;
  status: 'active' | 'paused' | 'expired';
  lastActive: string;
  registeredAt: string;
  primaryLanguages: string[];
}

export interface AdminTransaction {
  id: string;
  customerId: string;
  customerName: string;
  plan: PlanType;
  amount: number;
  currency: string;
  pgProvider: 'Toss Payments' | 'Stripe' | 'KakaoPay' | 'PayPay' | 'Alipay' | 'WeChat Pay';
  status: 'completed' | 'refunded' | 'failed';
  date: string;
  isYearly: boolean;
}

export interface AdminKPIStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  totalTranslationMinutes: number;
  activeLiveSessions: number;
  monthlyRevenue: number;
  yearlyProjectedRevenue: number;
  conversionRate: number;
}
