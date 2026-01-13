
import { IncomeMainCategory, ExpenseMainCategory } from './types';

export const INCOME_CATEGORIES = [
  IncomeMainCategory.WORK,
  IncomeMainCategory.INVESTMENT,
  IncomeMainCategory.VARIABLE
];

export const EXPENSE_STRUCTURE: Record<string, string[]> = {
  [ExpenseMainCategory.LIVING]: [
    '吃(食材)', '衣(治裝)', '住(水電瓦斯)', '住(電信費與管理費)', 
    '房租房貸', '行(交通與車輛保養)', '育(進修)', '樂(運動休閒旅遊)', 
    '醫(營養保健)', '雜支'
  ],
  [ExpenseMainCategory.TAX]: [
    '房屋稅相關', '所得稅相關', '燃料牌照稅'
  ],
  [ExpenseMainCategory.INSURANCE]: [
    '健保費', '產險費', '人身保險費', '儲蓄與投資保險費'
  ],
  [ExpenseMainCategory.FAMILY]: [],
  [ExpenseMainCategory.SAVINGS]: [],
  [ExpenseMainCategory.VARIABLE]: []
};

export const COLORS = {
  primary: '#10b981', // Emerald 500
  secondary: '#3b82f6', // Blue 500
  accent: '#f59e0b', // Amber 500
  danger: '#ef4444', // Red 500
  income: '#34d399',
  expense: '#fb7185'
};
