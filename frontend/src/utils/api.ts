import axios from 'axios';

// In Vercel (same domain): VITE_API_URL is empty → requests go to /api/*
// In local dev: falls back to localhost:8000
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '/api');

const api = axios.create({
    baseURL,
    timeout: 60000,
});

export const chatWithAgent = async (message: string) => {
    try {
        const response = await api.post('/chat', { message });
        return response.data;
    } catch (error) {
        console.error('Error conducting chat:', error);
        throw error;
    }
};

