
import { GoogleGenAI, Type, Content } from "@google/genai";
import { ProductCategory } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

// FIX: Updated function to return ProductCategory enum type for category to match component state type.
export const generateProductDetails = async (imageBase64: string, mimeType: string): Promise<{ name: string; category: ProductCategory; description: string }> => {
  if (!API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  try {
    const imagePart = fileToGenerativePart(imageBase64, mimeType);
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            imagePart,
            { text: "Analyze this image of an agricultural product. Suggest a product name, a category from ('Fruit', 'Vegetable', 'Grain', 'Other'), and a brief, appealing description for a marketplace listing. Return the result as JSON." },
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The suggested name of the product." },
            category: { type: Type.STRING, description: "The suggested category: Fruit, Vegetable, Grain, or Other." },
            description: { type: Type.STRING, description: "A brief, appealing description for the product." }
          },
          required: ["name", "category", "description"],
        },
      },
    });

    const text = result.text.trim();
    const parsedResult = JSON.parse(text) as { name: string; category: string; description: string };

    // Validate category and convert string to ProductCategory enum
    const categoryString = parsedResult.category || '';
    const categoryEnumValue = Object.values(ProductCategory).find(
      (c) => c.toLowerCase() === categoryString.toLowerCase()
    );

    return {
      name: parsedResult.name,
      description: parsedResult.description,
      category: categoryEnumValue || ProductCategory.Other,
    };
  } catch (error) {
    console.error("Error generating product details with Gemini:", error);
    throw new Error("Failed to generate product details. Please try again or enter manually.");
  }
};

export const generateCounterOfferSuggestion = async (details: { productName: string; originalPrice: number; offeredPrice: number; quantity: number }): Promise<number> => {
    if (!API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }
    
    const { productName, originalPrice, offeredPrice, quantity } = details;

    try {
        const prompt = `As a negotiation expert for an agricultural marketplace, suggest a reasonable counter-offer price. The product is '${productName}'. The original price per item is ₹${originalPrice}. The buyer has offered ₹${offeredPrice} per item for a quantity of ${quantity}. Your counter-offer should be fair to both the farmer and the buyer, encouraging a successful deal. Respond only with a JSON object containing a single key 'suggestedPrice' which is a number.`;
        
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestedPrice: { type: Type.NUMBER }
                    },
                    required: ["suggestedPrice"]
                }
            }
        });

        const text = result.text.trim();
        const parsedResult = JSON.parse(text) as { suggestedPrice: number };

        return parsedResult.suggestedPrice;
    } catch (error) {
        console.error("Error generating counter-offer suggestion with Gemini:", error);
        throw new Error("Failed to generate suggestion. Please try again.");
    }
};

export const getChatResponse = async (
  history: Content[],
  newMessage: string,
  useThinkingMode: boolean
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  const modelName = useThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  const config = useThinkingMode 
    ? { thinkingConfig: { thinkingBudget: 32768 } } 
    : {};
  
  const contents: Content[] = [
    ...history,
    { role: 'user', parts: [{ text: newMessage }] }
  ];

  try {
    const result = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        ...config,
        systemInstruction: "You are Anna, a helpful assistant for the Anna Bazaar agricultural marketplace. You can answer questions about products, farming, negotiations, and general topics. Be friendly and concise."
      }
    });

    const text = result.text;
    if (!text) {
      throw new Error("Received an empty response from the AI.");
    }
    return text;
  } catch (error) {
    console.error(`Error getting chat response with ${modelName}:`, error);
    throw new Error("Sorry, I'm having trouble connecting to my brain right now. Please try again later.");
  }
};
