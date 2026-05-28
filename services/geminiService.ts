
import { GoogleGenAI, Type } from "@google/genai";
import { Product, CartItem, Customer } from '../types';

let genAI: GoogleGenAI | null = null;

// Initialize the API client securely
export const initGemini = () => {
  // In a real app, this should be handled via a secure proxy or user input if appropriate.
  // For this environment, we rely on process.env.API_KEY
  if (process.env.GEMINI_API_KEY) {
      genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
};

export const getGeminiResponse = async (
  prompt: string,
  products: Product[],
  cart: CartItem[]
): Promise<string> => {
  if (!genAI) {
      initGemini();
      if (!genAI) return "錯誤：缺少 API Key，請檢查環境設定。";
  }

  // Create a context string about the current store state
  const productContext = products.map(p => 
    `- ${p.name} (ID: ${p.id}): $${p.price} [${p.categories.map(c => c.name).join(', ')}]`
  ).join('\n');

  const cartContext = cart.length > 0 
    ? cart.map(c => `- ${c.quantity}x ${c.name}`).join('\n')
    : "空";

  const systemInstruction = `
    你是一個零售店 POS 系統的熱情銷售助理。
    
    這是目前的商品庫存：
    ${productContext}

    這是顧客目前的購物車內容：
    ${cartContext}

    你的目標是幫助收銀員或顧客尋找商品、比較價格，或根據購物車內容建議加購商品。
    請使用繁體中文回答。
    保持回答簡潔（50字以內），除非被要求提供詳細資訊。
    如果被問及庫存中沒有的商品，請禮貌地告知無法提供。
  `;

  try {
    const ai = genAI!;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "我無法產生回應。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "抱歉，我目前無法連接到 AI 大腦。";
  }
};

export const parseCustomerDetails = async (input: string): Promise<Partial<Customer> & { note?: string }> => {
  if (!genAI) {
    initGemini();
    if (!genAI) throw new Error("API Key not found");
  }

  const ai = genAI!;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `從以下文字中擷取客戶資訊（姓名、電話、地址、Email、訂單備註）。如果欄位沒有資訊請留空。文字：${input}`,
      config: {
        systemInstruction: "你是一個資料輸入助手。請將非結構化文字轉換為 JSON 格式。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            first_name: { type: Type.STRING },
            last_name: { type: Type.STRING },
            phone: { type: Type.STRING },
            address: { type: Type.STRING },
            email: { type: Type.STRING },
            note: { type: Type.STRING, description: "訂單相關的特殊要求或備註" },
          }
        }
      }
    });
    
    if (response.text) {
      return JSON.parse(response.text);
    }
    return {};
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw error;
  }
};
