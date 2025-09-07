import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Outfit } from '../../types';
import * as geminiService from '../../services/geminiService';

declare global {
  interface Window {
    scrollLockCount?: number;
  }
}

interface ChatbotProps {
    outfits: Outfit[];
    isDevMode: boolean;
    userName: string | null;
}

const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;

const Chatbot: React.FC<ChatbotProps> = ({ outfits, isDevMode, userName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        if(isOpen && messages.length === 0) {
             setMessages([{ id: 'welcome', text: `Hello ${userName || ''}! I'm AVA, your personal stylist. How can I help you style your collection today?`, sender: 'bot' }]);
        }
    }, [isOpen, messages.length, userName]);

    useEffect(() => {
      if (isOpen) {
        window.scrollLockCount = (window.scrollLockCount || 0) + 1;
        if (window.scrollLockCount === 1) {
          document.body.classList.add('no-scroll');
        }
      }
      return () => {
        if (isOpen) {
          window.scrollLockCount = Math.max(0, (window.scrollLockCount || 0) - 1);
          if (window.scrollLockCount === 0) {
            document.body.classList.remove('no-scroll');
          }
        }
      };
    }, [isOpen]);

    const handleSend = async () => {
        if (input.trim() === '' || isLoading) return;
        
        const userMessage: ChatMessage = { id: `msg-${Date.now()}`, text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            let botResponseText;
            if (isDevMode) {
                // Dev Mode: Return a mock response
                await new Promise(res => setTimeout(res, 500)); // Simulate network delay
                botResponseText = "This is a mock response from AVA in Developer Mode. I see you have some great styles in your closet! How about we try pairing that with some bold accessories?";
            } else {
                // Standard Mode: Call the API
                const savedOutfitsSummary = outfits.map(o => `${o.category} outfit`).join(', ') || "The user has no saved outfits yet.";
                const chatHistory = messages.concat([userMessage]).map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                }));
                botResponseText = await geminiService.getStylingAdvice(chatHistory, savedOutfitsSummary, userName);
            }
            const botMessage: ChatMessage = { id: `msg-${Date.now() + 1}`, text: botResponseText, sender: 'bot' };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMessage: ChatMessage = { id: `err-${Date.now()}`, text: "Sorry, I'm having trouble connecting right now.", sender: 'bot' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-[#f400f4] to-[#00f2ff] text-white flex items-center justify-center shadow-lg shadow-[#f400f4]/40 transition-transform duration-300 hover:scale-110 active:scale-100"
            >
                <div className="transform transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg) scale(0)' : 'rotate(0) scale(1)'}}><ChatIcon/></div>
                <div className="absolute transform transition-transform duration-300" style={{ transform: isOpen ? 'rotate(0) scale(1)' : 'rotate(-180deg) scale(0)'}}><CloseIcon/></div>
            </button>
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-40 w-full max-w-sm h-[60vh] bg-[#1a0a37]/80 backdrop-blur-xl border border-[#00f2ff]/30 rounded-lg shadow-2xl shadow-[#00f2ff]/20 flex flex-col page-transition-enter">
                    <div className="p-4 border-b border-[#00f2ff]/20">
                        <h3 className="text-lg font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">AVA - Your AI Stylist</h3>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`px-4 py-2 rounded-lg max-w-xs transition-colors hover:bg-opacity-80 ${msg.sender === 'user' ? 'bg-[#00f2ff]/20 text-white' : 'bg-white/10 text-gray-300'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="px-4 py-2 rounded-lg bg-white/10 text-gray-300">
                                    <div className="flex items-center gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t border-[#00f2ff]/20">
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask for styling advice..."
                                disabled={isLoading}
                                className="flex-1 bg-white/5 border border-white/20 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00f2ff] transition-all"
                            />
                            <button onClick={handleSend} disabled={isLoading} className="p-2 bg-gradient-to-r from-[#f400f4] to-[#00f2ff] rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-150 active:scale-90">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;