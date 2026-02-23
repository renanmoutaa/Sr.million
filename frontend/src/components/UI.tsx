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

    // Keep track of the status ref for the auto-listen logic
    useEffect(() => {
        lastStatus.current = status;
    }, [status]);

    // When agent finishes speaking, show all cards, then auto-close after 2s
    useEffect(() => {
        if (status === 'idle' && displayCards.length > 0) {
            setVisibleCount(displayCards.length);
            const t = setTimeout(() => {
                setDisplayCards([]);
                setVisibleCount(0);
            }, 3000); // 3s for users to see final state
            return () => clearTimeout(t);
        }
    }, [status, displayCards.length, setDisplayCards]);

    // --- AUTO-LISTEN HOOK ---
    useEffect(() => {
        // When status becomes idle after speaking, auto-trigger mic
        if (status === 'idle' && lastStatus.current === 'speaking' && hasInteracted && !textMode) {
            const t = setTimeout(() => {
                if (useChatStore.getState().status === 'idle') {
                    handleTalk();
                }
            }, 1000);
            return () => clearTimeout(t);
        }
    }, [status, hasInteracted, textMode]);

    // Mic start/stop side effect
    useEffect(() => {
        const prevStatus = lastStatus.current as string;
        if (status === 'listening') {
            import('../utils/AudioManager').then(({ audioManager }) => audioManager.startMic());
        } else if (prevStatus === 'listening') {
            import('../utils/AudioManager').then(({ audioManager }) => audioManager.stopMic());
        }
        lastStatus.current = status;
    }, [status]);

    const processText = async (text: string) => {
        if (!text.trim()) return;
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

                const totalChars = cards.reduce((acc: number, card: any) => acc + (card.content?.length || 0), 0) || 1;
                const introDelay = Math.min(totalMs * 0.15, 1500);
                const timeForCards = Math.max(0, totalMs - introDelay - 800);

                let accumulatedTime = introDelay;

                cards.forEach((card: any, i: number) => {
                    const t = setTimeout(() => setVisibleCount(i + 1), accumulatedTime);
                    timerRef.current.push(t);

                    const charWeight = (card.content?.length || 1) / totalChars;
                    const cardDurationMs = timeForCards * charWeight;
                    accumulatedTime += cardDurationMs;
                });

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

        recognition.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            processText(transcript);
        };

        recognition.onerror = () => setStatus('idle');
        recognition.onend = () => {
            if (useChatStore.getState().status === 'listening') {
                setStatus('idle');
            }
        };
        recognition.start();
    };

    const lastMessage = messages[messages.length - 1];
    const isListening = status === 'listening';
    const isAnswering = status === 'speaking' || status === 'thinking';

    return (
        <>
            <AccessibilityMenu />

            {/* Layout container */}
            <div className="absolute inset-0 flex flex-col p-6 z-50 pointer-events-none">

                {/* ── HEADER ── */}
                <header className="flex justify-between items-start pointer-events-auto">
                    <div>
                        <p className="text-xs font-light tracking-[0.3em] text-cyan-400/80 uppercase">Sistema Online</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Sr. Million • Conectado</p>
                    </div>
                </header>

                {/* ── CENTRAL CONTENT: Cards or Suggestions ── */}
                <div className="flex-1 flex flex-col items-center justify-end pb-12 pointer-events-auto min-h-0">
                    <AnimatePresence mode="wait">
                        {displayCards.length > 0 ? (
                            <motion.div
                                key="flow"
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
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
                                className="flex gap-2 flex-wrap justify-center max-w-2xl"
                            >
                                {SUGGESTED.map((q, i) => (
                                    <motion.button
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        onClick={() => processText(q)}
                                        className={`px-4 py-2 rounded-full text-sm border transition-all hover:scale-105 active:scale-95
                                            ${highContrast
                                                ? 'bg-black border-white text-white'
                                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-cyan-500/40 backdrop-blur-md'}
                                        `}
                                        style={{ fontSize: `${0.8 * fontSizeMult}rem` }}
                                    >
                                        {q}
                                    </motion.button>
                                ))}
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>

                {/* ── FOOTER: Mic/Text Input ── */}
                <div className="shrink-0 flex flex-col items-center gap-4 pb-4 pointer-events-auto">
                    {textMode ? (
                        <div className="flex gap-2 w-full max-w-md">
                            <input
                                type="text"
                                placeholder="Pergunte ao Sr. Million..."
                                className={`flex-1 px-5 py-3 rounded-2xl text-base outline-none border transition-all
                                    ${highContrast ? 'bg-black text-white border-white' : 'bg-white/5 text-white border-white/10 backdrop-blur-xl focus:border-cyan-500'}`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        processText((e.target as HTMLInputElement).value);
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }}
                            />
                            <button
                                onClick={(e) => {
                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                    processText(input.value);
                                    input.value = '';
                                }}
                                className="p-3 bg-cyan-600 text-white rounded-2xl hover:bg-cyan-500 transition-colors"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <button
                                onClick={handleTalk}
                                disabled={isAnswering}
                                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500
                                    ${isListening
                                        ? 'bg-red-500/20 text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)]'
                                        : isAnswering
                                            ? 'bg-white/5 text-slate-600 scale-90'
                                            : 'bg-cyan-500/10 text-cyan-400 hover:scale-110 shadow-[0_0_30px_rgba(6,182,212,0.2)]'
                                    }
                                `}
                            >
                                {isListening && <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-40" />}
                                {status === 'thinking'
                                    ? <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                    : <Mic size={28} className={isListening ? 'animate-pulse' : ''} />
                                }
                            </button>
                            <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                                {isListening ? 'Ouvindo...' : status === 'thinking' ? 'Processando...' : 'Toque para falar'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── FLOATING SUBTITLES ── */}
            <AnimatePresence>
                {showSubtitles && lastMessage && status === 'speaking' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-40 left-0 w-full flex justify-center px-10 pointer-events-none z-[60]"
                    >
                        <div className={`max-w-2xl px-8 py-4 rounded-3xl border shadow-2xl text-center backdrop-blur-2xl
                            ${highContrast ? 'bg-black border-white text-white' : 'bg-black/40 border-white/5 text-white'}
                        `}>
                            <p className="text-lg md:text-xl font-medium leading-relaxed">
                                {lastMessage.content}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mic Pulse Background */}
            {isListening && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/5 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse" />
            )}
        </>
    );
};
