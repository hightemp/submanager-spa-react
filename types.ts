export type Currency = 'RUB' | 'USD';

export type PeriodUnit = 'month' | 'year' | 'day';

export interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: Currency;
  periodUnit: PeriodUnit;
  periodValue: number; // e.g., 1 for "every 1 month", 30 for "every 30 days"
  paidUntil: string; // ISO Date String YYYY-MM-DD
  url?: string;
  description?: string;
  color: string; // Hex color for UI
  active: boolean; // Enables/Disables the subscription
}

export interface AppSettings {
  exchangeRate: number; // USD to RUB
  openRouterApiKey?: string;
  aiModel?: string;
}

export type SubStatus = 'active' | 'soon' | 'overdue' | 'disabled';

export interface SubWithDerivedStats extends Subscription {
  status: SubStatus;
  daysLeft: number;
  costInRub: number;
  monthlyCostRub: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface ExportData {
  version: number;
  timestamp: string;
  settings: AppSettings;
  subscriptions: Subscription[];
}