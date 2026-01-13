
export type TransactionType = 'income' | 'expense';

export enum IncomeMainCategory {
  WORK = '工作收入',
  INVESTMENT = '理財收入',
  VARIABLE = '短期不固定收入'
}

export enum ExpenseMainCategory {
  LIVING = '生活支出',
  FAMILY = '家庭撫育支出',
  TAX = '稅負',
  INSURANCE = '保險',
  SAVINGS = '儲蓄與投資',
  VARIABLE = '不固定與臨時支出'
}

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  color: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  mainCategory: string;
  subCategory?: string;
  amount: number;
  note: string;
  accountId: string; // 關聯的虛擬帳戶 ID
}

export interface MonthlyComparison {
  currentMonth: string;
  lastMonthSurplus: number;
  currentMonthSurplus: number;
  lastYearSameMonthIncome?: number;
  currentMonthInvestmentIncome?: number;
}
