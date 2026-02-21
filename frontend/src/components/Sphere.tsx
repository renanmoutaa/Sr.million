import { motion } from 'motion/react';
import { useChatStore } from '../store/useChatStore';

type SphereState = 'idle' | 'listening' | 'processing' | 'speaking';

const stateMap: Record<string, SphereState> = {
    idle: 'idle',
    listening: 'listening',
    thinking: 'processing',
    speaking: 'speaking',
};

export function Sphere() {
    const { status } = useChatStore();
    const state: SphereState = stateMap[status] ?? 'idle';

    const glowColor = {
        idle: 'rgba(8,145,178,0.18)',
        listening: 'rgba(239,68,68,0.28)',
        processing: 'rgba(139,92,246,0.28)',
        speaking: 'rgba(16,185,129,0.22)',
    }[state];

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
            <div className="relative flex items-center justify-center w-72 h-72 md:w-[26rem] md:h-[26rem]">

                {/* Outer glow bloom */}
                <motion.div
                    className="absolute inset-0 rounded-full blur-3xl"
                    style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />

                {/* Core sphere */}
                <motion.div
                    className="absolute inset-0 rounded-full border border-cyan-500/25 bg-cyan-900/8 backdrop-blur-sm"
                    animate={
                        state === 'listening' ? { scale: [1, 1.18, 1], opacity: 1 }
                            : state === 'processing' ? { scale: [0.9, 1.08, 0.9], rotate: [0, -360] }
                                : state === 'speaking' ? { scale: [1, 1.09, 1] }
                                    : { scale: [1, 1.04, 1], rotate: [0, 360], opacity: 0.8 }
                    }
                    transition={
                        state === 'listening' ? { scale: { duration: 1.2, repeat: Infinity } }
                            : state === 'processing' ? { scale: { duration: 0.55, repeat: Infinity }, rotate: { duration: 1.8, repeat: Infinity } }
                                : state === 'speaking' ? { duration: 1.6, repeat: Infinity }
                                    : { scale: { duration: 4, repeat: Infinity }, rotate: { duration: 22, repeat: Infinity } }
                    }
                    style={{ boxShadow: `0 0 50px ${glowColor}` }}
                />

                {/* Ring 1 */}
                <motion.div
                    className="absolute w-[78%] h-[78%] rounded-full border border-cyan-400/18"
                    animate={{ rotate: [0, 360], scale: [0.92, 1, 0.92] }}
                    transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                />

                {/* Ring 2 */}
                <motion.div
                    className="absolute w-[58%] h-[58%] rounded-full border-t-2 border-r-2 border-cyan-300/35"
                    animate={{ rotate: [360, 0], scale: [1, 0.9, 1] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                />

                {/* Ring 3 (inner) */}
                <motion.div
                    className="absolute w-[38%] h-[38%] rounded-full border-b-[3px] border-l-2 border-white/10 bg-cyan-500/4"
                    animate={{ rotate: [0, 180, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Mist / particle glow */}
                <motion.div
                    className="absolute w-full h-full rounded-full blur-2xl"
                    style={{ background: 'radial-gradient(circle at center, rgba(8,145,178,0.18) 0%, transparent 65%)' }}
                    animate={{ opacity: [0.3, 0.65, 0.3] }}
                    transition={{ duration: 3.2, repeat: Infinity }}
                />

                {/* Listening indicator */}
                {state === 'listening' && (
                    <motion.div
                        className="absolute inset-0 rounded-full border border-red-400/50"
                        animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                    />
                )}
            </div>
        </div>
    );
}
