import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000', // Adjust for production
    timeout: 60000, // 60 seconds timeout (increased for RAG/TTS)
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
