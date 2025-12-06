import { Subscription, SubWithDerivedStats, AppSettings } from './types';

export const generateId = (): string => Math.random().toString(36).substr(2, 9);

export const getRandomColor = (): string => {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981', 
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Helper: Parse YYYY-MM-DD to Local Date (00:00:00)
export const getLocalDateFromString = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper: Format Local Date to YYYY-MM-DD
export const formatLocalDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayString = (): string => {
  return formatLocalDateToString(new Date());
};

export const formatDate = (dateStr: string): string => {
  const date = getLocalDateFromString(dateStr);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export const getDaysDiff = (targetDate: string): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time for accurate day calc
  
  const target = getLocalDateFromString(targetDate);
  // target is already 00:00:00 local time from helper
  
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const calculateCosts = (sub: Subscription, rate: number): { costRub: number, monthlyRub: number } => {
  const priceInRub = sub.currency === 'USD' ? sub.price * rate : sub.price;
  
  let monthlyRub = 0;
  
  if (sub.periodUnit === 'month') {
    monthlyRub = priceInRub / sub.periodValue;
  } else if (sub.periodUnit === 'year') {
    monthlyRub = priceInRub / (sub.periodValue * 12);
  } else if (sub.periodUnit === 'day') {
    monthlyRub = (priceInRub / sub.periodValue) * 30; // Approx
  }

  return {
    costRub: priceInRub,
    monthlyRub: monthlyRub
  };
};

export const enrichSubscription = (sub: Subscription, rate: number): SubWithDerivedStats => {
  const daysLeft = getDaysDiff(sub.paidUntil);
  const { costRub, monthlyRub } = calculateCosts(sub, rate);
  
  let status: 'active' | 'soon' | 'overdue' | 'disabled' = 'active';
  
  if (!sub.active) {
    status = 'disabled';
  } else if (daysLeft < 0) {
    status = 'overdue';
  } else if (daysLeft <= 7) {
    status = 'soon';
  }

  return {
    ...sub,
    status,
    daysLeft,
    costInRub: costRub,
    monthlyCostRub: monthlyRub
  };
};

export const formatCurrency = (value: number, currency: 'RUB' | 'USD'): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
};