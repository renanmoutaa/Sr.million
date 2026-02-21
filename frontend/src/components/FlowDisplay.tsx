import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle } from 'lucide-react';
import { type DisplayCard } from '../store/useChatStore';

export type WorkflowStep = {
    id: string;
    label: string;
    description?: string;
    status: 'pending' | 'current' | 'completed';
};

// Convert DisplayCards → WorkflowSteps
function cardsToSteps(cards: DisplayCard[], visibleCount: number): WorkflowStep[] {
    return cards.map((card, i) => ({
        id: String(i),
        label: card.content,
        description: card.type === 'highlight' ? 'Ponto principal' : card.type === 'warning' ? 'Atenção!' : undefined,
        status: i >= visibleCount ? 'pending' : i === visibleCount - 1 ? 'current' : 'completed',
    }));
}

interface FlowDisplayProps {
    cards: DisplayCard[];
    visibleCount: number;
    fontSizeMult: number;
    highContrast: boolean;
}

export const FlowDisplay = ({ cards, visibleCount, fontSizeMult, highContrast }: FlowDisplayProps) => {
    if (!cards.length) return null;

    const steps = cardsToSteps(cards, visibleCount);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 60 }}
            className={`w-full max-w-lg mx-auto rounded-2xl backdrop-blur-md border shadow-2xl shadow-cyan-900/20 overflow-hidden
                ${highContrast ? 'bg-black border-white' : 'bg-black/50 border-white/10'}
            `}
        >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-semibold">
                    Protocolo de Execução
                </h3>
            </div>

            {/* Steps */}
            <div className="px-3 py-2 space-y-1 relative">
                {/* Connecting line */}
                <div className="absolute left-6 top-3 bottom-3 w-px bg-white/10 -z-10" />

                <AnimatePresence>
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.07, type: 'spring', stiffness: 70 }}
                            className={`flex items-start gap-3 px-2 py-2 rounded-xl transition-colors duration-500
                                ${step.status === 'current'
                                    ? highContrast ? 'bg-white/20 border border-white' : 'bg-green-500/10 border border-green-500/30'
                                    : step.status === 'completed' ? 'opacity-50' : 'opacity-30'}  
                            `}
                        >
                            {/* Icon */}
                            <div className="relative z-10 bg-black rounded-full shrink-0 mt-0.5">
                                {step.status === 'completed' ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                ) : step.status === 'current' ? (
                                    <motion.div
                                        animate={{ scale: [1, 1.15, 1] }}
                                        transition={{ duration: 1.2, repeat: Infinity }}
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    </motion.div>
                                ) : (
                                    <Circle className="w-5 h-5 text-gray-600" />
                                )}
                            </div>

                            {/* Label */}
                            <div className="flex-1 min-w-0">
                                <p
                                    className={`font-medium leading-snug transition-colors
                                        ${step.status === 'current' ? 'text-green-300 font-semibold' : step.status === 'completed' ? 'text-gray-400' : 'text-gray-600'}
                                    `}
                                    style={{ fontSize: `${0.85 * fontSizeMult}rem` }}
                                >
                                    {step.label}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
