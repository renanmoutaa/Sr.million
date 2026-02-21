import { create } from 'zustand';
import axios from 'axios';

interface Settings {
  openai_api_key: string;
  elevenlabs_api_key: string;
  elevenlabs_voice_id: string;
  avatar_url: string;
  system_prompt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface DisplayCard {
  type: 'highlight' | 'step' | 'info' | 'warning';
  content: string;
}

interface ChatState {
  messages: Message[];
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  currentViseme: string | null;
  settings: Settings | null;
  morphTargets: { [key: string]: number };
  displayCards: DisplayCard[];
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setStatus: (status: 'idle' | 'listening' | 'thinking' | 'speaking') => void;
  setViseme: (viseme: string | null) => void;
  setMorphTarget: (key: string, value: number) => void;
  setDisplayCards: (cards: DisplayCard[]) => void;
  fetchSettings: () => Promise<void>;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  status: 'idle',
  currentViseme: null,
  settings: null,
  morphTargets: {},
  displayCards: [],
  addMessage: (role, content) =>
    set((state) => ({ messages: [...state.messages, { role, content }] })),
  setStatus: (status) => set({ status }),
  setViseme: (viseme) => set({ currentViseme: viseme }),
  setMorphTarget: (key, value) =>
    set((state) => ({ morphTargets: { ...state.morphTargets, [key]: value } })),
  setDisplayCards: (cards) => set({ displayCards: cards }),
  fetchSettings: async () => {
    try {
      const res = await axios.get('http://localhost:8000/settings_public');
      set({ settings: res.data });
    } catch (err) {
      console.warn("Could not fetch public settings, using defaults");
    }
  },
  reset: () => set({ messages: [], status: 'idle', currentViseme: null, displayCards: [] }),
}));
