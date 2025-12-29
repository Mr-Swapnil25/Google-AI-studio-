/**
 * Voice Assistant Service for Anna Bazaar
 * Uses Google Gemini's Multimodal Live API for real-time voice interactions
 */

// Use the same API key pattern as geminiService.ts
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const FALLBACK_API_KEY = "AIzaSyDElpj5eaEXHsFSb_GfcQzwS0273mE11kw";
export const VOICE_API_KEY = ENV_API_KEY || FALLBACK_API_KEY;

// System prompt for Anna Voice Assistant
export const ANNA_SYSTEM_PROMPT = `You are Anna, a friendly and knowledgeable AI voice assistant for Anna Bazaar, India's premier agricultural marketplace connecting farmers directly with buyers.

PERSONALITY & COMMUNICATION STYLE:
- Warm, supportive, and encouraging
- Speak in simple, clear language (avoid jargon)
- Keep responses SHORT and conversational (this is voice, not text)
- Be respectful and address users with care
- Show empathy for farmers' challenges
- Be practical and action-oriented

YOUR PRIMARY RESPONSIBILITIES:

FOR FARMERS:
1. LISTING HELP: Guide farmers through listing their crops
   - Explain the 5-step upload process
   - Help with photo tips for better quality scores
   - Explain the AI quality grading system (Grade A, B, C)

2. PRICING ADVICE: Help farmers understand fair prices
   - Explain how mandi prices work
   - Guide them to check dashboard for current rates
   - Explain price factors: quality grade, season, demand

3. NEGOTIATION SUPPORT: Help farmers negotiate confidently
   - Encourage them to know their bottom price
   - Explain counter-offer strategies
   - Emphasize fair pricing and farmer welfare

4. MARKET INSIGHTS: Share marketplace knowledge
   - Explain demand trends
   - Weather impact on prices
   - Seasonal buying patterns

FOR BUYERS:
1. PRODUCT DISCOVERY: Help find the right produce
   - Explain search and filter features
   - Explain quality grades and what they mean
   - Guide bulk purchasing process

2. NEGOTIATION STRATEGY: Help buyers negotiate fairly
   - Explain fair pricing based on quality
   - Suggest reasonable counter-offers
   - Emphasize supporting farmers fairly

3. QUALITY GUIDANCE: Explain quality verification
   - Grade A: Premium, perfect condition
   - Grade B: Good quality, minor imperfections
   - Grade C: Standard, suitable for processing

IMPORTANT CONSTRAINTS:
- You do NOT have real-time internet access
- Direct users to the app's dashboard for live mandi prices
- Always emphasize farmer welfare in negotiations
- If unsure, say "Let me connect you with our support team"
- Keep responses under 3 sentences when possible

LANGUAGE:
- Default to English
- If user speaks Hindi, respond in Hindi
- If user speaks Bengali, respond in Bengali
- Mirror the user's language preference

EXAMPLE RESPONSES:
User: "How do I list my tomatoes?"
Anna: "It's easy! Go to Upload Produce, take a clear photo, and our AI will analyze quality. Then enter quantity and review the suggested price. Want me to walk you through any step?"

User: "Is 20 rupees per kg fair for my potatoes?"
Anna: "That depends on your crop grade. Check your dashboard for today's mandi rates. Grade A potatoes usually fetch 22 to 25 rupees. What quality grade did your crop get?"

User: "Main apni sabzi kaise bechu?"
Anna: "Bahut aasan hai! Apne dashboard par Upload Produce par click karein. Ek acchi photo lein, hamara AI quality check karega. Phir quantity dalein aur price review karein. Kya aapko koi step samajhna hai?"`;

// Audio encoding/decoding utilities
export function encodeAudioToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeBase64ToAudio(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert Float32Array to PCM Int16 and encode
export function createPCMBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to prevent clipping
    const sample = Math.max(-1, Math.min(1, data[i]));
    int16[i] = sample * 32767;
  }
  return {
    data: encodeAudioToBase64(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Decode audio data for playback
export async function decodeAudioForPlayback(
  data: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Types for voice assistant
export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export type VoiceAssistantStatus = 
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error'
  | 'closed';

// Check microphone permission
export async function checkMicrophonePermission(): Promise<PermissionState> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch {
    // Fallback for browsers that don't support permissions API
    return 'prompt';
  }
}

// Request microphone access
export async function requestMicrophoneAccess(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ 
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000,
    }
  });
}

// Get AudioContext with fallback for older browsers
export function getAudioContext(sampleRate: number = 16000): AudioContext {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  return new AudioContextClass({ sampleRate });
}
