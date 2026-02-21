import React, { useState } from 'react';
import { useAccessibilityStore } from '../store/useAccessibilityStore';

export const AccessibilityMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const {
        fontSizeMult,
        increaseFontSize,
        decreaseFontSize,
        highContrast,
        toggleHighContrast,
        reducedMotion,
        toggleReducedMotion,
        textMode,
        toggleTextMode,
        showSubtitles,
        toggleSubtitles
    } = useAccessibilityStore();

    const menuBg = highContrast ? 'bg-black border-2 border-white' : 'bg-black/40 backdrop-blur-md border border-white/10';
    const textCol = highContrast ? 'text-white' : 'text-white';
    const btnClass = `p-2 rounded-full transition-all ${highContrast ? 'hover:bg-white hover:text-black border border-white' : 'hover:bg-white/10'}`;

    return (
        <div className="absolute top-4 right-4 z-[60] flex flex-col items-end gap-2">

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${menuBg} ${textCol}`}
                title="Acessibilidade"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m4.93 4.93 14.14 14.14" />
                    <path d="M12 2v20" />
                </svg>
            </button>

            {/* Menu Items */}
            {isOpen && (
                <div className={`flex flex-col gap-2 p-3 rounded-2xl shadow-xl animate-fade-in-up origin-top-right ${menuBg} ${textCol}`}>

                    {/* Font Size */}
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase opacity-80">Tamanho</span>
                        <div className="flex gap-1">
                            <button onClick={decreaseFontSize} className={btnClass} disabled={fontSizeMult <= 1}>
                                <small>A-</small>
                            </button>
                            <span className="w-8 text-center tabular-nums">{Math.round(fontSizeMult * 100)}%</span>
                            <button onClick={increaseFontSize} className={btnClass} disabled={fontSizeMult >= 1.5}>
                                <small>A+</small>
                            </button>
                        </div>
                    </div>

                    {/* High Contrast */}
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase opacity-80">Contraste</span>
                        <button onClick={toggleHighContrast} className={`${btnClass} ${highContrast ? 'bg-white text-black' : ''}`}>
                            {highContrast ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {/* Reduced Motion */}
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase opacity-80">Movimento</span>
                        <button onClick={toggleReducedMotion} className={`${btnClass} ${reducedMotion ? 'bg-white text-black' : ''}`}>
                            {reducedMotion ? 'Reduzido' : 'Normal'}
                        </button>
                    </div>

                    {/* Text Mode */}
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase opacity-80">Teclado</span>
                        <button onClick={toggleTextMode} className={`${btnClass} ${textMode ? 'bg-white text-black' : ''}`}>
                            {textMode ? 'Ativado' : 'Voz'}
                        </button>
                    </div>

                    {/* Subtitles */}
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase opacity-80">Legendas</span>
                        <button onClick={toggleSubtitles} className={`${btnClass} ${showSubtitles ? 'bg-white text-black' : ''}`}>
                            {showSubtitles ? 'ON' : 'OFF'}
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};
