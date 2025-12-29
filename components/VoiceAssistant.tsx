/**
 * Voice Assistant Component for Anna Bazaar
 * Real-time voice interaction using Google Gemini Multimodal Live API
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { MicrophoneIcon, XIcon } from './icons';
import {
  VOICE_API_KEY,
  ANNA_SYSTEM_PROMPT,
  encodeAudioToBase64,
  decodeBase64ToAudio,
  createPCMBlob,
  decodeAudioForPlayback,
  VoiceMessage,
  VoiceAssistantStatus,
  requestMicrophoneAccess,
  getAudioContext,
} from '../services/voiceAssistantService';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'farmer' | 'buyer';
  userName?: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  isOpen,
  onClose,
  userRole = 'farmer',
  userName,
}) => {
  const [status, setStatus] = useState<VoiceAssistantStatus>('idle');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for audio management
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextStartTimeRef = useRef(0);
  
  // Transcription buffers
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close session
    sessionPromiseRef.current?.then(session => session?.close?.()).catch(console.error);
    sessionPromiseRef.current = null;

    // Stop media stream
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;

    // Disconnect audio nodes
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    // Close audio contexts
    inputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
    outputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current = null;

    // Stop all playing audio
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch {}
    });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setAudioLevel(0);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    cleanup();
    setStatus('idle');
    setMessages([]);
    setError(null);
    onClose();
  }, [cleanup, onClose]);

  // Monitor audio levels for visualization
  const monitorAudioLevels = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  }, []);

  // Start voice session
  const startSession = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    setMessages([]);
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';

    try {
      // Get microphone access
      const stream = await requestMicrophoneAccess();
      mediaStreamRef.current = stream;

      // Initialize Gemini AI
      const ai = new GoogleGenAI({ apiKey: VOICE_API_KEY });

      // Create output audio context for playback (24kHz)
      outputAudioContextRef.current = getAudioContext(24000);

      // Personalized system prompt
      const personalizedPrompt = userName 
        ? `${ANNA_SYSTEM_PROMPT}\n\nThe current user is ${userName}, a ${userRole}. Address them by name when appropriate.`
        : `${ANNA_SYSTEM_PROMPT}\n\nThe current user is a ${userRole}.`;

      // Connect to Gemini Live API
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-preview-native-audio-dialog',
        callbacks: {
          onopen: () => {
            setStatus('connected');
            
            // Create input audio context (16kHz for Gemini)
            const inputAudioContext = getAudioContext(16000);
            inputAudioContextRef.current = inputAudioContext;

            // Create analyser for audio visualization
            const analyser = inputAudioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            // Create media stream source
            const source = inputAudioContext.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;

            // Create script processor for sending audio
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            // Process audio and send to Gemini
            scriptProcessor.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              const pcmBlob = createPCMBlob(inputData);
              
              sessionPromiseRef.current?.then((session) => {
                if (session?.sendRealtimeInput) {
                  session.sendRealtimeInput({ media: pcmBlob });
                }
              });
            };

            // Connect audio nodes
            source.connect(analyser);
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);

            // Start audio level monitoring
            monitorAudioLevels();

            // Add welcome message
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              text: userRole === 'farmer' 
                ? `Namaste${userName ? ` ${userName}` : ''}! I'm Anna, your farming assistant. How can I help you today? You can ask about listing crops, pricing, or negotiation tips.`
                : `Hello${userName ? ` ${userName}` : ''}! I'm Anna, your marketplace assistant. I can help you find quality produce, understand grading, or negotiate fair prices.`,
              timestamp: new Date(),
            }]);
          },

          onmessage: async (message: LiveServerMessage) => {
            // Handle input transcription (user's speech)
            if (message.serverContent?.inputTranscription) {
              setStatus('listening');
              currentInputTranscription.current += message.serverContent.inputTranscription.text || '';
            }

            // Handle output transcription (AI's response text)
            if (message.serverContent?.outputTranscription) {
              setStatus('speaking');
              currentOutputTranscription.current += message.serverContent.outputTranscription.text || '';
            }

            // Handle turn complete - save transcriptions to messages
            if (message.serverContent?.turnComplete) {
              const userText = currentInputTranscription.current.trim();
              const assistantText = currentOutputTranscription.current.trim();

              setMessages(prev => {
                const newMessages = [...prev];
                
                if (userText) {
                  newMessages.push({
                    id: `user-${Date.now()}`,
                    role: 'user',
                    text: userText,
                    timestamp: new Date(),
                  });
                }
                
                if (assistantText) {
                  newMessages.push({
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    text: assistantText,
                    timestamp: new Date(),
                  });
                }
                
                return newMessages;
              });

              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
              setStatus('connected');
            }

            // Handle audio playback
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              setStatus('speaking');
              
              const outputContext = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContext.currentTime);

              try {
                const audioBuffer = await decodeAudioForPlayback(
                  decodeBase64ToAudio(audioData),
                  outputContext,
                  24000,
                  1
                );

                const source = outputContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputContext.destination);

                source.addEventListener('ended', () => {
                  audioSourcesRef.current.delete(source);
                  if (audioSourcesRef.current.size === 0) {
                    setStatus('connected');
                  }
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
              } catch (err) {
                console.error('Audio playback error:', err);
              }
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(source => {
                try { source.stop(); } catch {}
              });
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },

          onerror: (e: ErrorEvent) => {
            console.error('Voice session error:', e);
            setStatus('error');
            setError('Connection error occurred. Please try again.');
          },

          onclose: (e: CloseEvent) => {
            if (status !== 'closed' && status !== 'idle') {
              setStatus('closed');
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: personalizedPrompt,
        },
      });

    } catch (err: any) {
      console.error('Failed to start voice session:', err);
      setStatus('error');
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please enable microphone permission in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Failed to start voice assistant. Please check your connection and try again.');
      }
    }
  }, [userRole, userName, monitorAudioLevels, status]);

  // Effect: Start session when modal opens
  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      cleanup();
      setStatus('idle');
      setMessages([]);
      setError(null);
    }

    return () => {
      if (isOpen) {
        cleanup();
      }
    };
  }, [isOpen]);

  // Get status display text
  const getStatusText = () => {
    switch (status) {
      case 'idle': return 'Initializing...';
      case 'connecting': return 'Connecting to Anna...';
      case 'connected': return 'Listening... Speak now';
      case 'listening': return 'Hearing you...';
      case 'processing': return 'Processing...';
      case 'speaking': return 'Anna is speaking...';
      case 'error': return 'Connection error';
      case 'closed': return 'Session ended';
      default: return 'Ready';
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
      case 'listening': return 'text-green-500';
      case 'speaking': return 'text-blue-500';
      case 'processing': return 'text-amber-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ animationDuration: '200ms' }}
    >
      <div className="bg-white w-full max-w-lg h-[85vh] max-h-[700px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-[#15803D]/5 to-[#15803D]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#15803D] flex items-center justify-center shadow-md">
              <MicrophoneIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Anna Voice Assistant</h2>
              <p className={`text-xs font-medium ${getStatusColor()}`}>{getStatusText()}</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close voice assistant"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </header>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFBFC]">
          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-red-500 text-3xl mb-2 block">error</span>
              <p className="text-red-700 text-sm font-medium">{error}</p>
              <button 
                onClick={startSession}
                className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${
                  msg.role === 'user' ? 'bg-blue-500' : 'bg-[#15803D]'
                }`}>
                  {msg.role === 'user' ? (userName?.charAt(0).toUpperCase() || 'U') : 'A'}
                </div>
                
                {/* Message bubble */}
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <span className={`text-[10px] mt-1 block ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Live transcription indicator */}
          {(status === 'listening' || status === 'speaking') && (
            <div className={`flex ${status === 'listening' ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-4 py-2 rounded-2xl ${
                status === 'listening' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  <span className="text-xs font-medium">
                    {status === 'listening' ? 'Listening...' : 'Anna is responding...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Footer with Microphone */}
        <footer className="p-5 border-t border-gray-200 bg-white">
          <div className="flex flex-col items-center gap-4">
            {/* Audio Level Visualization */}
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#15803D] to-green-400 rounded-full transition-all duration-100"
                style={{ width: `${Math.min(audioLevel * 100 * 2, 100)}%` }}
              />
            </div>

            {/* Microphone Button */}
            <div className="relative">
              {/* Pulsing ring when connected/listening */}
              {(status === 'connected' || status === 'listening') && (
                <div className="absolute inset-0 rounded-full bg-[#15803D]/20 animate-ping" />
              )}
              
              {/* Speaking animation */}
              {status === 'speaking' && (
                <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-pulse" />
              )}
              
              <button
                disabled={status === 'connecting' || status === 'error'}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  status === 'listening' 
                    ? 'bg-red-500 scale-110' 
                    : status === 'speaking'
                    ? 'bg-blue-500'
                    : status === 'connected'
                    ? 'bg-[#15803D] hover:bg-[#166534]'
                    : 'bg-gray-400'
                }`}
              >
                <MicrophoneIcon className="w-8 h-8 text-white" />
              </button>
            </div>

            {/* Instructions */}
            <p className="text-gray-500 text-sm text-center">
              {status === 'connected' && 'Speak naturally. Anna is listening.'}
              {status === 'listening' && 'Keep speaking...'}
              {status === 'speaking' && 'Anna is responding...'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'error' && 'Please try again'}
              {status === 'closed' && 'Session ended'}
            </p>

            {/* End Call Button */}
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold text-sm transition-colors shadow-md"
            >
              End Conversation
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default VoiceAssistant;
