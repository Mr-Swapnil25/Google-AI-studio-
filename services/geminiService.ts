

import { GoogleGenAI, Type, Content } from "@google/genai";
import { ProductCategory, Product, Farmer } from "../types";

// Use provided Gemini API key directly
const API_KEY = "AIzaSyDElpj5eaEXHsFSb_GfcQzwS0273mE11kw";

if (!API_KEY) {
  console.warn("GEMINI_API_KEY not configured. AI features will be disabled.");
}

// Initialize GoogleGenAI with the API key
const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * AGRICULTURAL GATEKEEPER SYSTEM INSTRUCTION
 * Strict verification to ensure only agricultural products are listed
 */
const AGRICULTURAL_GATEKEEPER_INSTRUCTION = `You are an Agricultural Verification Expert for Anna Bazaar, India's premier agricultural marketplace.

YOUR MISSION: Ensure ONLY genuine agricultural products are listed. Protect farmers from fraudulent listings.

STRICT VERIFICATION PROTOCOL:
1. ANALYZE the input image thoroughly for agricultural content.
2. STRICT FILTER: If the image does NOT contain a vegetable, fruit, grain, spice, pulse, oilseed, or agricultural produce:
   - REJECT immediately with error_code: "INVALID_COMMODITY"
   - is_valid_agri: false
3. REJECTED ITEMS (provide polite refusal in Hindi and English):
   - Clothing, textiles, fabrics
   - Electronics, phones, computers
   - Vehicles, machinery (except farm equipment in context)
   - Processed/packaged foods with brand labels
   - Animals (live or meat)
   - Non-food items
4. QUALITY ANALYSIS (if valid agricultural product):
   - Grade 'A': Premium quality - vibrant color, no defects, optimal size, fresh appearance
   - Grade 'B': Standard quality - minor imperfections, good overall condition
   - Grade 'C': Economy quality - visible defects, discoloration, or aging signs
5. Estimate moisture content based on visual appearance (produce shine, wrinkling, firmness indicators)
6. Detect any visual defects: spots, rot, pest damage, discoloration

ALWAYS return valid JSON. No conversational text outside the JSON structure.`;

// Response type for agricultural verification
export interface AgriculturalVerificationResult {
  is_valid_agri: boolean;
  error_code?: 'INVALID_COMMODITY';
  rejection_message?: string;
  commodity?: string;
  grade?: 'A' | 'B' | 'C';
  grade_label?: string;
  moisture_estimate?: string;
  visual_defects?: string;
  confidence?: number;
  category?: string;
  description?: string;
}

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

/**
 * AGRICULTURAL GATEKEEPER - Verify and analyze agricultural products
 * Returns detailed verification result with strict agriculture-only filtering
 */
export const verifyAgriculturalProduct = async (
  imageBase64: string, 
  mimeType: string
): Promise<AgriculturalVerificationResult> => {
  if (!API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  try {
    const imagePart = fileToGenerativePart(imageBase64, mimeType);
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: {
        parts: [
          imagePart,
          { text: "Analyze this image. Verify if it's a valid agricultural product (vegetable, fruit, grain, spice, pulse). If not agricultural, reject it. If valid, provide quality grading." },
        ]
      },
      config: {
        systemInstruction: AGRICULTURAL_GATEKEEPER_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_valid_agri: { type: Type.BOOLEAN, description: "True only if image contains valid agricultural produce" },
            error_code: { type: Type.STRING, description: "INVALID_COMMODITY if not agricultural" },
            rejection_message: { type: Type.STRING, description: "Polite refusal in Hindi and English if rejected" },
            commodity: { type: Type.STRING, description: "Name of the agricultural product" },
            grade: { type: Type.STRING, description: "Quality grade: A, B, or C" },
            grade_label: { type: Type.STRING, description: "Premium, Standard, or Economy" },
            moisture_estimate: { type: Type.STRING, description: "Estimated moisture content" },
            visual_defects: { type: Type.STRING, description: "Any visible defects" },
            confidence: { type: Type.NUMBER, description: "Confidence score 0-100" },
            category: { type: Type.STRING, description: "Fruit, Vegetable, Grain, or Other" },
            description: { type: Type.STRING, description: "Brief marketplace description" },
          },
          required: ["is_valid_agri"],
        },
      },
    });

    const text = result.text.trim();
    return JSON.parse(text) as AgriculturalVerificationResult;
  } catch (error) {
    console.error("Error in agricultural verification:", error);
    throw new Error("Failed to verify product. Please try again or enter details manually.");
  }
};

// FIX: Updated function to return ProductCategory enum type for category to match component state type.
export const generateProductDetails = async (imageBase64: string, mimeType: string): Promise<{ 
  name: string; 
  category: ProductCategory; 
  description: string;
  isValidAgri: boolean;
  grade: 'A' | 'B' | 'C';
  gradeLabel: string;
  moistureEstimate: string;
  visualDefects: string;
  confidence: number;
  rejectionMessage?: string;
}> => {
  if (!API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  try {
    // Use the agricultural gatekeeper for strict verification
    const verification = await verifyAgriculturalProduct(imageBase64, mimeType);
    
    // If not valid agricultural product, return rejection
    if (!verification.is_valid_agri) {
      return {
        name: '',
        category: ProductCategory.Other,
        description: '',
        isValidAgri: false,
        grade: 'C',
        gradeLabel: 'Rejected',
        moistureEstimate: 'N/A',
        visualDefects: 'N/A',
        confidence: 0,
        rejectionMessage: verification.rejection_message || 
          'यह एक कृषि उत्पाद नहीं है। कृपया केवल सब्जियां, फल, या अनाज अपलोड करें। / This is not an agricultural product. Please upload only vegetables, fruits, or grains.',
      };
    }

    // Valid agricultural product - return full details
    const categoryString = verification.category || 'Other';
    const categoryEnumValue = Object.values(ProductCategory).find(
      (c) => c.toLowerCase() === categoryString.toLowerCase()
    );

    return {
      name: verification.commodity || 'Fresh Produce',
      category: categoryEnumValue || ProductCategory.Other,
      description: verification.description || 'Quality agricultural produce from local farms.',
      isValidAgri: true,
      grade: (verification.grade as 'A' | 'B' | 'C') || 'B',
      gradeLabel: verification.grade_label || 'Standard',
      moistureEstimate: verification.moisture_estimate || 'Optimal',
      visualDefects: verification.visual_defects || 'None Detected',
      confidence: verification.confidence || 85,
    };
  } catch (error) {
    console.error("Error generating product details with Gemini:", error);
    throw new Error("Failed to generate product details. Please try again or enter manually.");
  }
};

export const verifyProductListing = async (productData: { name: string, description: string, imageBase64: string, mimeType: string }): Promise<{ isVerified: boolean; feedback: string }> => {
    if (!API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }
    
    try {
        const imagePart = fileToGenerativePart(productData.imageBase64, productData.mimeType);
        const prompt = `You are an agricultural product authenticity verifier. Analyze the image and compare it with the product name ("${productData.name}") and description ("${productData.description}"). Check for visual quality and authenticity. Respond with JSON containing 'isVerified' (boolean) and 'feedback' (string). 'isVerified' should be true only if the image clearly matches the product name and appears to be of good quality. The feedback should explain your reasoning concisely.`;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isVerified: { type: Type.BOOLEAN, description: "True if the product image matches the text and seems authentic." },
                        feedback: { type: Type.STRING, description: "A concise explanation for the verification status." }
                    },
                    required: ["isVerified", "feedback"]
                }
            }
        });

        const text = result.text.trim();
        return JSON.parse(text) as { isVerified: boolean; feedback: string };
    } catch (error) {
        console.error("Error verifying product listing with Gemini:", error);
        throw new Error("Failed to verify product. The AI service may be temporarily unavailable.");
    }
};

export const verifyFarmerProfile = async (farmer: Farmer): Promise<{ isVerified: boolean; feedback: string }> => {
    if (!API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }

    try {
        const prompt = `You are a trust and safety specialist for an agricultural marketplace called Anna Bazaar. Analyze the following farmer profile data for authenticity and trustworthiness. A plausible profile has a descriptive bio, a reasonable number of years farming, and a specific location. A generic, vague, or suspicious profile should be flagged.
        
        Data:
        - Name: "${farmer.name}"
        - Bio: "${farmer.bio}"
        - Years Farming: ${farmer.yearsFarming}
        - Location: "${farmer.location}"

        Respond ONLY with a JSON object containing 'isVerified' (boolean) and 'feedback' (string). The feedback should be a concise, one-sentence explanation for your decision. For example, if verified: "Profile details appear consistent and trustworthy." If not verified: "Profile bio is too generic and lacks specific details."`;
        
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isVerified: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING }
                    },
                    required: ["isVerified", "feedback"]
                }
            }
        });
        
        const text = result.text.trim();
        return JSON.parse(text) as { isVerified: boolean; feedback: string };
    } catch (error) {
        console.error("Error verifying farmer profile with Gemini:", error);
        throw new Error("Failed to verify farmer. The AI service may be temporarily unavailable.");
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
            contents: prompt,
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
  
  const contents: Content[] = [
    ...history,
    { role: 'user', parts: [{ text: newMessage }] }
  ];

  try {
    const result = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      // FIX: Correctly placed thinkingConfig inside the main config object.
      config: {
        systemInstruction: "You are Anna, a helpful assistant for the Anna Bazaar agricultural marketplace. You can answer questions about products, farming, negotiations, and general topics. Be friendly and concise.",
        ...(useThinkingMode && { thinkingConfig: { thinkingBudget: 32768 } })
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