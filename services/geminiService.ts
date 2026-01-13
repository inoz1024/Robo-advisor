
import { GoogleGenAI } from "@google/genai";
import { Transaction, Account } from "../types";

export const getFinancialAdvice = async (
  transactions: Transaction[], 
  accounts: Account[],
  currentMonth: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 計算本月數據
  const thisMonthT = transactions.filter(t => t.date.startsWith(currentMonth));
  const income = thisMonthT.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = thisMonthT.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  // 找出投資收入
  const investmentIncome = thisMonthT
    .filter(t => t.mainCategory === '理財收入')
    .reduce((sum, t) => sum + t.amount, 0);

  // 取得上個月數據 (簡單邏輯：日期減一個月)
  const lastMonthDate = new Date(currentMonth + "-01");
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);
  const lastMonthT = transactions.filter(t => t.date.startsWith(lastMonthStr));
  const lastMonthExpense = lastMonthT.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const lastMonthSurplus = lastMonthT.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) - lastMonthExpense;

  const prompt = `
    你是一位極度可愛、溫馨且有點俏皮的財務小管家。
    這是我本月的財務報告：
    - 本月總收入：${income} 元
    - 本月總支出：${expense} 元
    - 理財投資收入：${investmentIncome} 元
    - 上個月盈餘：${lastMonthSurplus} 元
    - 目前擁有的虛擬帳戶：${accounts.map(a => a.name).join(', ')}

    請根據這些數據，給我三條「對話式」的觀察與建議：
    1. 比對本月與上月的盈餘/支出變化 (例如：這個月比上個月多存了...元)。
    2. 針對投資收入給予鼓勵 (例如：哇！投資收入變多了呢！)。
    3. 檢視是否有異常開銷或值得誇獎的地方。

    要求：
    - 語氣要像好朋友，多用「哇！」、「嘿嘿」、「加油」等詞彙。
    - 每一條建議控制在 40 字以內。
    - 加入豐富的 Emoji。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "小管家還在算帳中，等等我唷！✨";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "小管家剛才不小心睡著了，我們繼續努力存錢吧！🍵";
  }
};
