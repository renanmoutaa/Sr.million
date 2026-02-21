import { create } from 'zustand';

interface AccessibilityState {
    fontSizeMult: number; // 1 to 1.5
    highContrast: boolean;
    reducedMotion: boolean;
    textMode: boolean; // Toggle for text input
    showSubtitles: boolean; // Show text subtitles (accessibility)

    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    toggleHighContrast: () => void;
    toggleReducedMotion: () => void;
    toggleTextMode: () => void;
    toggleSubtitles: () => void;
    reset: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>((set) => ({
    fontSizeMult: 1,
    highContrast: false,
    reducedMotion: false,
    textMode: false,
    showSubtitles: false,

    increaseFontSize: () => set((state) => ({
        fontSizeMult: Math.min(state.fontSizeMult + 0.25, 1.5)
    })),
    decreaseFontSize: () => set((state) => ({
        fontSizeMult: Math.max(state.fontSizeMult - 0.25, 1.0)
    })),
    toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
    toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
    toggleTextMode: () => set((state) => ({ textMode: !state.textMode })),
    toggleSubtitles: () => set((state) => ({ showSubtitles: !state.showSubtitles })),
    reset: () => set({ fontSizeMult: 1, highContrast: false, reducedMotion: false, textMode: false, showSubtitles: false }),
}));
