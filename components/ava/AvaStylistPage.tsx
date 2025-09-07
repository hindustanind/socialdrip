import React, { useState, useEffect, useRef } from 'react';
import { Outfit, AvaTone } from '../../types';
import * as geminiService from '../../services/geminiService';
import { useSpeech } from '../../hooks/useSpeech';
import useLocalStorage from '../../hooks/useLocalStorage';

interface AvaStylistPageProps {
    userName: string | null;
    outfits: Outfit[];
    isDevMode: boolean;
}

interface AvaChatMessage {
    id: string;
    sender: 'user' | 'ava';
    text: string;
    suggestedOutfits?: Outfit[];
}

// --- SVG Icons ---
const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" />
    </svg>
);
const SpeakerOnIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);
const SpeakerOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
);


const AvaStylistPage: React.FC<AvaStylistPageProps> = ({ userName, outfits, isDevMode }) => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<AvaChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(false);
    const [avaTone, setAvaTone] = useLocalStorage<AvaTone>('dripsocial-ava-tone', AvaTone.CASUAL);
    const { isListening, transcript, startListening, stopListening, speak, cancelSpeech, isSupported, recognitionError, clearRecognitionError } = useSpeech();
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Set initial welcome message
    useEffect(() => {
        setMessages([
            {
                id: 'ava-welcome',
                sender: 'ava',
                text: `Hello, ${userName || 'Style Star'}! I'm AVA, your personal AI stylist. How can I inspire your look today?`,
            }
        ]);
    }, [userName]);

    // Auto-scroll to latest message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Update query from speech-to-text transcript
    useEffect(() => {
        if (transcript) {
            setQuery(transcript);
        }
    }, [transcript]);

    const handleSendQuery = async (currentQuery: string) => {
        const userQuery = currentQuery.trim();
        if (!userQuery || isLoading) return;

        const isFirstUserMessage = messages.length === 1 && messages[0].id === 'ava-welcome';
        const userMessage: AvaChatMessage = { id: `user-${Date.now()}`, sender: 'user', text: userQuery };
        
        const baseMessages = isFirstUserMessage ? [] : messages;
        const newMessages = [...baseMessages, userMessage];

        setMessages(newMessages);
        setQuery('');
        setIsLoading(true);

        try {
            let botResponse;
            if (isDevMode) {
                await new Promise(res => setTimeout(res, 1000));
                const mockSuggestedOutfit = outfits.length > 0 ? outfits[Math.floor(Math.random() * outfits.length)] : null;
                botResponse = {
                    advice: `In Dev Mode with ${avaTone} tone: You asked, "${userQuery}". That's a great question! Based on your closet, I'd suggest this look. It really captures that vibe you're going for.`,
                    outfits: mockSuggestedOutfit ? [mockSuggestedOutfit] : [],
                };
            } else {
                if (!geminiService.isApiKeySet()) {
                    throw new Error("API key is not configured.");
                }
                const savedOutfitsSummary = outfits.map(o => `[id: ${o.id}, category: ${o.category}]`).join(', ') || "The user has no saved outfits yet.";
                const apiHistory = newMessages.map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                }));

                const { advice, outfitIds } = await geminiService.getAvaStyleAdvice(apiHistory, savedOutfitsSummary, userName || 'friend', avaTone);
                const suggestedOutfits = outfitIds
                    .map(id => outfits.find(o => o.id === id))
                    .filter((o): o is Outfit => !!o);

                botResponse = {
                    advice,
                    outfits: suggestedOutfits
                };
            }

            const newAvaMessage: AvaChatMessage = {
                id: `ava-${Date.now()}`,
                sender: 'ava',
                text: botResponse.advice,
                suggestedOutfits: botResponse.outfits
            };

            setMessages(prev => [...prev, newAvaMessage]);
            if (isVoiceOutputEnabled && botResponse.advice) {
                speak(botResponse.advice);
            }

        } catch (err) {
            console.error("AVA Page error:", err);
            const errorMessage = err instanceof geminiService.QuotaExceededError
                ? `Looks like I've given all the advice I can for today, ${userName}! Please check back tomorrow for more styling tips. ✨`
                : (err instanceof Error ? err.message : "Sorry, I'm having trouble connecting right now.");
            const errorAvaMessage: AvaChatMessage = {
                id: `ava-error-${Date.now()}`,
                sender: 'ava',
                text: errorMessage,
            };
            setMessages(prev => [...prev, errorAvaMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleToggleVoice = () => {
        const newIsEnabled = !isVoiceOutputEnabled;
        setIsVoiceOutputEnabled(newIsEnabled);
        if (!newIsEnabled) {
            cancelSpeech();
        }
    };

    const examplePrompts = [
        "What should I wear for a casual brunch?",
        "I have a date tonight, help me pick an outfit.",
        "Suggest an office look that's professional but stylish.",
        "What's a good party outfit from my closet?"
    ];

    const isPristine = messages.length === 1 && messages[0].id === 'ava-welcome';

    return (
        <div className="container mx-auto max-w-4xl flex flex-col h-[calc(100vh-140px)]">
             <div className="text-center pt-8 pb-4 shrink-0">
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">
                        AVA Stylist
                    </span>
                </h1>
                <div className="mt-4 flex justify-center">
                    <div className="flex items-center p-1 bg-white/10 rounded-full">
                        {Object.values(AvaTone).map(tone => (
                            <button
                                key={tone}
                                onClick={() => setAvaTone(tone)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 transform active:scale-95 ${
                                    avaTone === tone
                                        ? 'bg-gradient-to-r from-[#f400f4] to-[#00f2ff] shadow-[0_0_10px_#f400f4]'
                                        : 'hover:bg-white/20'
                                }`}
                            >
                                {tone}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-6 chat-scroll-area">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'ava' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f400f4] to-[#00f2ff] flex-shrink-0"></div>}
                        <div className={`px-4 py-3 rounded-2xl max-w-lg animate-fade-in ${msg.sender === 'user' ? 'bg-[#00f2ff]/20 text-white rounded-br-none' : 'bg-white/10 text-gray-300 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.suggestedOutfits && msg.suggestedOutfits.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <div className="flex flex-wrap gap-2">
                                        {msg.suggestedOutfits.map(outfit => (
                                            <div key={outfit.id} className="w-20 h-28 rounded-md overflow-hidden border-2 border-transparent hover:border-[#00f2ff] transition-all cursor-pointer">
                                                <img 
                                                    src={`data:image/jpeg;base64,${outfit.images[0]}`} 
                                                    alt={outfit.category} 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-end gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f400f4] to-[#00f2ff] flex-shrink-0"></div>
                        <div className="px-4 py-3 rounded-2xl bg-white/10 rounded-bl-none">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Example Prompts */}
            {isPristine && !isLoading && (
                 <div className="shrink-0 p-4 flex flex-wrap justify-center gap-2 animate-fade-in">
                    {examplePrompts.map(prompt => (
                        <button 
                            key={prompt}
                            onClick={() => handleSendQuery(prompt)}
                            className="px-4 py-2 bg-white/10 border border-transparent rounded-full text-sm text-gray-300 hover:border-[#00f2ff] hover:text-white transition-all transform hover:scale-105"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}
            
            {/* Input Area */}
            <div className="shrink-0 p-4">
                 {recognitionError && (
                    <div className="max-w-3xl mx-auto mb-2 p-3 bg-red-500/20 border border-red-500 text-red-300 rounded-md text-sm flex justify-between items-center animate-fade-in">
                        <span>{recognitionError}</span>
                        <button onClick={clearRecognitionError} className="p-1 rounded-full hover:bg-white/10" title="Dismiss">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                <div className="relative w-full max-w-3xl mx-auto">
                     <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendQuery(query);
                            }
                        }}
                        placeholder="Ask for styling advice..."
                        disabled={isLoading}
                        className="w-full bg-white/5 border-2 border-white/20 rounded-xl px-5 py-3 pr-28 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00f2ff] transition-all resize-none no-scrollbar max-h-40"
                        rows={1}
                        onInput={(e) => {
                            const target = e.currentTarget;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {isSupported && (
                             <button
                                onClick={handleToggleVoice}
                                className={`p-2 rounded-full transition-colors ${isVoiceOutputEnabled ? 'bg-[#00f2ff]/20 text-[#00f2ff]' : 'hover:bg-white/10 text-gray-400'}`}
                                title={isVoiceOutputEnabled ? "Disable voice output" : "Enable voice output"}
                            >
                                {isVoiceOutputEnabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
                            </button>
                        )}
                        {isSupported && (
                            <button 
                                onClick={isListening ? stopListening : startListening}
                                className={`p-2 rounded-full transition-colors relative ${isListening ? 'bg-[#f400f4]/20 text-[#f400f4]' : 'hover:bg-white/10 text-gray-400'}`}
                                title={isListening ? 'Stop listening' : 'Ask with voice'}
                                disabled={isLoading}
                            >
                                <MicIcon />
                                {isListening && <span className="absolute inset-0 rounded-full bg-[#f400f4] animate-ping opacity-50"></span>}
                            </button>
                        )}
                        <button onClick={() => handleSendQuery(query)} disabled={isLoading || !query.trim()} className="p-2 bg-gradient-to-r from-[#f400f4] to-[#00f2ff] rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-150 active:scale-90 text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default AvaStylistPage;