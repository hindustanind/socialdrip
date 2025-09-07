import { useState, useRef, useEffect, useCallback } from 'react';

// FIX: Add an interface for the SpeechRecognition API to resolve TypeScript errors and name collisions.
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

// Polyfill for browser compatibility
// FIX: Cast `window` to `any` to access non-standard browser APIs and provide a type for the constructor.
// FIX: Renamed variable from `SpeechRecognition` to `SpeechRecognitionAPI` to avoid collision with the global type.
const SpeechRecognitionAPI: { new (): ISpeechRecognition } | undefined = 
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const synthesis = window.speechSynthesis;

export const useSpeech = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(false);
    const [recognitionError, setRecognitionError] = useState<string | null>(null);
    const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);
    
    // FIX: Use the `ISpeechRecognition` interface to avoid name collision with the `SpeechRecognition` variable.
    const recognitionRef = useRef<ISpeechRecognition | null>(null);

    useEffect(() => {
        const getAndSetVoice = () => {
            const voices = synthesis.getVoices();
            if (voices.length > 0) {
                const bestVoice = 
                    voices.find(voice => voice.name.includes('Google') && voice.lang === 'en-US') ||
                    voices.find(voice => voice.localService && voice.lang === 'en-US' && voice.name.includes('English')) ||
                    voices.find(voice => voice.lang === 'en-US' && voice.default) ||
                    voices.find(voice => voice.lang.startsWith('en-')) ||
                    null;
                setPreferredVoice(bestVoice);
            }
        };

        getAndSetVoice();
        synthesis.onvoiceschanged = getAndSetVoice;

        return () => {
            synthesis.onvoiceschanged = null;
        };
    }, []);

    useEffect(() => {
        if (SpeechRecognitionAPI) {
            setIsSupported(true);
            recognitionRef.current = new SpeechRecognitionAPI();
            const recognition = recognitionRef.current;
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = false;

            recognition.onresult = (event) => {
                const speechResult = event.results[0][0].transcript;
                setTranscript(speechResult);
                setIsListening(false);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed') {
                    setRecognitionError('Microphone permission denied. Please allow microphone access in your browser settings to use voice input.');
                } else {
                    setRecognitionError(`A speech recognition error occurred: ${event.error}`);
                }
                setIsListening(false);
            };
            
            recognition.onend = () => {
                setIsListening(false);
            };

        } else {
            setIsSupported(false);
        }
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setRecognitionError(null); // Clear previous errors
            setTranscript('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    }, [isListening]);
    
    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, [isListening]);
    
    const speak = useCallback((text: string) => {
        if (synthesis && text) {
            // Cancel any previous speech
            synthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            synthesis.speak(utterance);
        }
    }, [preferredVoice]);

    const cancelSpeech = useCallback(() => {
        if (synthesis) {
            synthesis.cancel();
        }
    }, []);


    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        speak,
        cancelSpeech,
        isSupported,
        recognitionError,
        clearRecognitionError: () => setRecognitionError(null),
    };
};
