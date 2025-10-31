
import React, { useState, useEffect, useRef } from 'react';
// FIX: Removed `LiveSession` as it is not an exported member of the '@google/genai' package.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { LiveTranscript } from '../types';
import { MicrophoneIcon, XIcon } from './icons';

// Audio helper functions from guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// React component
interface LiveAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error' | 'closed';

export const LiveAssistantModal = ({ isOpen, onClose }: LiveAssistantModalProps) => {
    const [status, setStatus] = useState<ConnectionStatus>('idle');
    const [transcripts, setTranscripts] = useState<LiveTranscript[]>([]);
    
    // FIX: Changed `LiveSession` to `any` because the specific session type is not exported from the library.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
    
    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    const cleanup = () => {
        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
        
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current.onaudioprocess = null;
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        audioContextRef.current?.close().catch(console.error);
        audioContextRef.current = null;

        outputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current = null;

        nextStartTimeRef.current = 0;
        audioSourcesRef.current.clear();
        if (status !== 'closed') {
             setStatus('closed');
        }
    };

    const handleClose = () => {
        cleanup();
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            startSession();
        } else {
            cleanup();
            setStatus('idle');
            setTranscripts([]);
        }

        return () => {
            if (isOpen) {
                cleanup();
            }
        };
    }, [isOpen]);
    
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    const startSession = async () => {
        setStatus('connecting');
        setTranscripts([]);
        currentInputTranscription.current = '';
        currentOutputTranscription.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            // FIX: Cast window to `any` to allow `webkitAudioContext` for older browser compatibility without TypeScript errors.
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('connected');
                        
                        // FIX: Cast window to `any` to allow `webkitAudioContext` for older browser compatibility without TypeScript errors.
                        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        audioContextRef.current = inputAudioContext;
                        
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcriptions
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                             currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                        }
                        
                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscription.current.trim();
                            const fullOutput = currentOutputTranscription.current.trim();

                            setTranscripts(prev => {
                                const newTranscripts = [...prev];
                                if (fullInput) newTranscripts.push({ role: 'user', text: fullInput });
                                if (fullOutput) newTranscripts.push({ role: 'model', text: fullOutput });
                                return newTranscripts;
                            });

                            currentInputTranscription.current = '';
                            currentOutputTranscription.current = '';
                        }
                        
                        // Handle audio playback
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            setStatus('speaking');
                            const outputAudioContext = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(
                                nextStartTimeRef.current,
                                outputAudioContext.currentTime,
                            );

                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                            
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContext.destination);
                            
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                                if (audioSourcesRef.current.size === 0) {
                                    setStatus('connected');
                                }
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of audioSourcesRef.current.values()) {
                                source.stop();
                                audioSourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setStatus('error');
                        setTranscripts(prev => [...prev, { role: 'model', text: "Sorry, a connection error occurred." }]);
                    },
                    onclose: (e: CloseEvent) => {
                        if (status !== 'closed') {
                            setStatus('closed');
                        }
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: "You are Anna Assist, a friendly and knowledgeable AI assistant for farmers on the Anna Bazaar platform. You can provide information on market trends, crop management, weather, and help with business-related queries. Keep your answers practical and easy to understand.",
                },
            });
        } catch (error) {
            console.error("Failed to start session:", error);
            setStatus('error');
            setTranscripts([{ role: 'model', text: "Could not access the microphone. Please check permissions and try again." }]);
        }
    };
    
    const getStatusText = () => {
        switch(status) {
            case 'idle': return 'Initializing...';
            case 'connecting': return 'Connecting to Anna Assist...';
            case 'connected': return 'Connected. Start speaking.';
            case 'speaking': return 'Speaking...';
            case 'error': return 'An error occurred.';
            case 'closed': return 'Session ended.';
            default: return 'Listening...';
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center font-sans animate-fade-in" style={{ animationDuration: '300ms' }}>
            <div className="bg-stone-900 w-full h-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden border border-farmer-accent/30">
                <header className="flex items-center justify-between p-4 border-b border-stone-700/50">
                    <h2 className="text-xl font-bold font-heading text-stone-100">Anna Assist Live</h2>
                    <button onClick={handleClose} className="text-stone-400 hover:text-white">
                        <XIcon className="h-6 w-6" />
                    </button>
                </header>
                
                <main className="flex-1 p-6 overflow-y-auto space-y-4">
                    {transcripts.map((t, i) => (
                        <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-2 rounded-xl ${t.role === 'user' ? 'bg-farmer-accent text-white' : 'bg-stone-800 text-stone-200'}`}>
                                <p className="text-sm">{t.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={transcriptEndRef} />
                </main>

                <footer className="p-6 text-center border-t border-stone-700/50 bg-stone-900/50">
                     <div className="flex flex-col items-center justify-center space-y-4">
                        <div className={`relative w-24 h-24 flex items-center justify-center rounded-full bg-farmer-accent/10`}>
                           <div className={`absolute inset-0 rounded-full bg-farmer-accent-light animate-pulse-ring ${status === 'speaking' ? 'block' : 'hidden'}`}></div>
                           <div className={`w-20 h-20 flex items-center justify-center rounded-full transition-colors bg-farmer-accent`}>
                                <MicrophoneIcon className="h-10 w-10 text-white" />
                           </div>
                        </div>
                        <p className="text-stone-300 font-medium h-5">{getStatusText()}</p>
                        <button 
                            onClick={handleClose}
                            className="bg-red-600/80 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-red-600 transition-colors"
                        >
                            End Call
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};
