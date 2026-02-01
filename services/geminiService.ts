
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

/**
 * داهات و چالاکییەکانی هۆڵەکە شیکار دەکات بە بەکارهێنانی زیرەکی دەستکرد
 */
export const getBusinessInsights = async (transactions: Transaction[]): Promise<string> => {
  if (transactions.length === 0) {
    return "هیچ داتایەک بەردەست نییە بۆ شیکردنەوە.";
  }

  // دروستکردنی ئینستانسێکی نوێ لە کاتی بانگکردنی فەنکشنەکە بۆ دڵنیابوونەوە لە بەکارهێنانی نوێترین کلیل
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // ئامادەکردنی کورتەیەک لە داتاکان بۆ ئەوەی بنێردرێت بۆ مۆدێلەکە
  const dataSummary = transactions.map(t => ({
    amount: t.totalPaid,
    method: t.paymentMethod,
    games: t.gameStartTimes?.length || 1,
    time: new Date(t.timestamp).getHours() + ":00",
    staff: t.collectedBy
  }));

  const prompt = `
    وەک ڕاوێژکارێکی بازرگانی لێهاتوو، ئەم داتایانەی خوارەوەی هۆڵی بیلیاردەکە شیکار بکە:
    ${JSON.stringify(dataSummary)}

    تکایە ٣ بۆ ٤ خاڵی کورت و گرنگ (Actionable Insights) بنووسە بە زمانی کوردی (سۆرانی) دەربارەی:
    ١. کاتەکانی قەرەباڵغی (Peak Hours).
    ٢. شێوازی پارەدان و داهات.
    ٣. پێشنیار بۆ زیادکردنی داهات.
    
    وەڵامەکە تەنها بە کوردی بێت و بە شێوازێکی مۆدێرن و هاندەرانە بێت.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // مۆدێلی پێشکەوتوو بۆ شیکردنەوەی ئاڵۆز
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "تۆ یاریدەدەرێکی بازرگانی زیرەکیت بۆ خاوەن هۆڵەکانی بیلیارد لە کوردستان.",
        temperature: 0.7,
        topP: 0.95,
      },
    });

    // بەکارهێنانی .text وەک پڕۆپەرتی (نەک میتۆد) بەپێی ڕێنمایی نوێی SDK
    return response.text || "نەتوانرا شیکارییەکان بەدەست بهێنرێت.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "هەڵەیەک ڕوویدا لە پەیوەندی کردن بە سێرڤەری AI. تکایە دڵنیابەرەوە لە بوونی ئینتەرنێت.";
  }
};
