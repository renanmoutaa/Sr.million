import { useChatStore } from '../store/useChatStore';
import { useAccessibilityStore } from '../store/useAccessibilityStore';
import { AccessibilityMenu } from './AccessibilityMenu';
import { FlowDisplay } from './FlowDisplay';
import { AnimatePresence, motion } from 'motion/react';
import { Mic, Send } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

const SUGGESTED = [
    "Como fazer setup de empacotamento?",
    "Quais são as etapas do Marketing?",
    "Aplicação técnica comercial?",
    "Nutrição Animal Grão",
];

export const UI = () => {
    const { status, setStatus, addMessage, messages, displayCards, setDisplayCards } = useChatStore();
    const { fontSizeMult, highContrast, textMode, showSubtitles } = useAccessibilityStore();
    const [hasInteracted, setHasInteracted] = useState(false);
    const [visibleCount, setVisibleCount] = useState(0);
    const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const lastStatus = useRef(status);

    // When agent finishes speaking, show all cards, then auto-close after 2s
    useEffect(() => {
        if (status === 'idle' && displayCards.length > 0) {
            setVisibleCount(displayCards.length);
            const t = setTimeout(() => {
                setDisplayCards([]);
                setVisibleCount(0);
            }, 2000);
            return () => clearTimeout(t);
        }
    }, [status, displayCards.length]);

    // Auto-Listen after speaking + mic control
    useEffect(() => {
        if (lastStatus.current === 'speaking' && status === 'idle' && hasInteracted) {
            setTimeout(() => handleTalk(), 500);
        }
        if (status === 'listening') {
            import('../utils/AudioManager').then(({ audioManager }) => audioManager.startMic());
        } else if ((lastStatus.current as string) === 'listening' && (status as string) !== 'listening') {
            import('../utils/AudioManager').then(({ audioManager }) => audioManager.stopMic());
        }
        lastStatus.current = status;
    }, [status, hasInteracted]);

    const processText = async (text: string) => {
        addMessage('user', text);
        setStatus('thinking');
        setDisplayCards([]);
        setVisibleCount(0);

        try {
            const { chatWithAgent } = await import('../utils/api');
            const { audioManager } = await import('../utils/AudioManager');
            const response = await chatWithAgent(text);
            addMessage('assistant', response.response);

            const cards = response.display_cards?.length
                ? response.display_cards
                : [{ type: 'highlight', content: response.response.slice(0, 100) }];

            setDisplayCards(cards);

            const scheduleSteps = (totalMs: number) => {
                timerRef.current.forEach(clearTimeout);
                timerRef.current = [];

                // 1. Calculate how many total characters are in all cards combined
                const totalChars = cards.reduce((acc: number, card: any) => acc + (card.content?.length || 0), 0) || 1;

                // 2. We leave 15% (or max 1.5s) for the intro/highlight before showing the first card
                const introDelay = Math.min(totalMs * 0.15, 1500);

                // 3. We leave an 800ms buffer at the end so the final card doesn't disappear right as he stops talking
                const timeForCards = Math.max(0, totalMs - introDelay - 800);

                let accumulatedTime = introDelay;

                cards.forEach((card: any, i: number) => {
                    // Schedule this card to appear at accumulatedTime
                    const t = setTimeout(() => setVisibleCount(i + 1), accumulatedTime);
                    timerRef.current.push(t);

                    // Add the proportional time this card takes to "speak" based on its char count
                    const charWeight = (card.content?.length || 1) / totalChars;
                    const cardDurationMs = timeForCards * charWeight;
                    accumulatedTime += cardDurationMs;
                });

                // Mark all cards as completed exactly when the audio finishes
                const tEnd = setTimeout(() => {
                    setVisibleCount(cards.length + 1);
                }, totalMs);
                timerRef.current.push(tEnd);
            };

            if (response.audio_content) {
                const durationSec = await audioManager.playAudio(response.audio_content);
                scheduleSteps((durationSec || 5) * 1000);
            } else {
                const wordCount = response.response.split(/\s+/).length;
                const estimatedMs = (wordCount / 2.5) * 1000;
                const utterance = new SpeechSynthesisUtterance(response.response);
                utterance.lang = 'pt-BR';
                utterance.onstart = () => { setStatus('speaking'); scheduleSteps(estimatedMs); };
                utterance.onend = () => setStatus('idle');
                window.speechSynthesis.speak(utterance);
            }
        } catch (error: any) {
            setStatus('idle');
            const errMsg = error?.response?.data?.detail || error?.message || 'Erro desconhecido';
            addMessage('assistant', `Erro: ${errMsg}`);
            setDisplayCards([{ type: 'warning', content: errMsg.slice(0, 80) }]);
            setVisibleCount(1);
        }
    };

    const handleTalk = () => {
        if (!('webkitSpeechRecognition' in window)) return;
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        setStatus('listening');
        if (!hasInteracted) setHasInteracted(true);
        recognition.onresult = (e: any) => processText(e.results[0][0].transcript);
        recognition.onerror = () => setStatus('idle');
        recognition.onend = () => {
            if (useChatStore.getState().status === 'listening') setStatus('idle');
        };
        recognition.start();
    };

    const lastMessage = messages[messages.length - 1];
    const isListening = status === 'listening';
    const isAnswering = status === 'speaking' || status === 'thinking';

    return (
        <>
            <AccessibilityMenu />

            {/* Full-screen flex column — header / content / mic bar stacked naturally */}
            <div className="absolute inset-0 flex flex-col" style={{ zIndex: 50 }}>

                {/* ── HEADER ── */}
                <header className="shrink-0 flex justify-between items-start px-6 pt-5 pointer-events-none z-20">
                    <div>
                        <p className="text-xs font-light tracking-[0.3em] text-cyan-400/80 uppercase">Sistema Online</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Sr. Million • Conectado</p>
                    </div>
                    <AnimatePresence>
                        {showSubtitles && lastMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="max-w-xs text-right pointer-events-auto"
                            >
                                <div className={`px-4 py-2 rounded-xl border inline-block ${highContrast ? 'bg-black border-white text-white' : 'bg-white/5 backdrop-blur-md border-white/10'}`}>
                                    <span className="text-[10px] text-cyan-400 uppercase tracking-wider block mb-0.5">Legenda</span>
                                    <p className="text-xs text-slate-300 font-light leading-snug">{lastMessage.content}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </header>

                {/* ── CONTENT: flow panel OR suggested question chips ── */}
                <div className="flex-1 flex flex-col items-center justify-end px-4 pb-3 overflow-y-auto pointer-events-auto min-h-0">
                    <AnimatePresence mode="wait">
                        {displayCards.length > 0 ? (
                            <motion.div
                                key="flow"
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10, transition: { duration: 0.3 } }}
                                transition={{ type: 'spring', stiffness: 60 }}
                                className="w-full max-w-lg"
                            >
                                <FlowDisplay
                                    cards={displayCards}
                                    visibleCount={visibleCount}
                                    fontSizeMult={fontSizeMult}
                                    highContrast={highContrast}
                                />
                            </motion.div>
                        ) : status === 'idle' ? (
                            <motion.div
                                key="suggested"
                                className="flex gap-2 flex-wrap justify-center px-2"
                            >
                                {SUGGESTED.map((q, i) => (
                                    <motion.button
                                        key={i}
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.09, type: 'spring', stiffness: 75 }}
                                        onClick={() => processText(q)}
                                        className={`px-3 py-1.5 rounded-full text-xs border transition-all hover:scale-105 active:scale-95
                                            ${highContrast
                                                ? 'bg-black border-white text-white hover:bg-white hover:text-black'
                                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-cyan-500/40 hover:text-cyan-300 backdrop-blur-sm'}
                                        `}
                                        style={{ fontSize: `${0.75 * fontSizeMult}rem` }}
                                    >
                                        {q}
                                    </motion.button>
                                ))}
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>

                {/* ── MIC / TEXT INPUT — shrink-0 so it always stays below content ── */}
                <motion.div
                    animate={{
                        opacity: isAnswering ? 0.35 : 1,
                        y: isAnswering ? 6 : 0,
                        pointerEvents: isAnswering ? 'none' : 'auto',
                    }}
                    transition={{ duration: 0.35 }}
                    className="shrink-0 flex flex-col items-center gap-2 pb-8 pt-2 pointer-events-auto"
                >
                    {textMode ? (
                        <div className="flex gap-2 items-center w-full max-w-sm px-6">
                            <input
                                type="text"
                                placeholder="Digite sua pergunta..."
                                className={`flex-1 px-4 py-2.5 rounded-full text-sm outline-none border transition-all
                                    ${highContrast ? 'bg-black text-white border-white placeholder-gray-500' : 'bg-white/5 text-white border-white/10 backdrop-blur-md placeholder-white/30 focus:border-cyan-500/50'}`}
                                style={{ fontSize: `${0.875 * fontSizeMult}rem` }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const v = (e.target as HTMLInputElement).value.trim();
                                        if (v) { processText(v); (e.target as HTMLInputElement).value = ''; }
                                    }
                                }}
                            />
                            <button
                                className={`p-2.5 rounded-full transition-all hover:scale-105 active:scale-95 ${highContrast ? 'bg-white text-black' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'}`}
                                onClick={(e) => {
                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                    if (input.value.trim()) { processText(input.value); input.value = ''; }
                                }}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={handleTalk}
                                disabled={status === 'thinking' || status === 'speaking'}
                                className={`relative group flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300
                                    ${isListening
                                        ? 'bg-red-500/20 text-red-400 shadow-[0_0_32px_rgba(239,68,68,0.35)]'
                                        : status === 'idle'
                                            ? highContrast ? 'bg-white text-black' : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:scale-110 shadow-[0_0_20px_rgba(8,145,178,0.2)]'
                                            : 'bg-white/5 text-white/30 cursor-not-allowed'}
                                `}
                                aria-label={isListening ? 'Ouvindo...' : 'Falar'}
                            >
                                <div className={`absolute inset-0 rounded-full border border-current opacity-30 scale-110 ${isListening ? 'animate-ping' : 'group-hover:scale-125 transition-transform duration-500'}`} />
                                {status === 'thinking' || status === 'speaking'
                                    ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    : <Mic className={`w-6 h-6 ${isListening ? 'animate-pulse' : ''}`} />
                                }
                            </button>
                            <p className="text-[10px] text-slate-500 tracking-widest uppercase">
                                {isListening ? 'Ouvindo...' : status === 'thinking' ? 'Processando...' : status === 'speaking' ? 'Respondendo...' : 'Toque para Falar'}
                            </p>
                        </div>
                    )}
                </motion.div>

                {/* Mic ripple */}
                {isListening && (
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 -z-10 pointer-events-none">
                        <div className="w-24 h-24 rounded-full bg-red-500/10 animate-ping" />
                    </div>
                )}
            </div>
        </>
    );
};
