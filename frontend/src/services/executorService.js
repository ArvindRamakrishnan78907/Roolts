/**
 * Code Executor Service
 * Executes code via the Node.js executor service
 * All requests go through the Vite proxy at /api/executor
 */

import axios from 'axios';

// Use environment variable if available, otherwise relative (proxy)
const executorApi = axios.create({
    // DIRECT CONNECTION (Bypassing Proxy for Debugging)
    baseURL: 'http://127.0.0.1:5000/api/executor',
    timeout: 60000, // 60 seconds for code execution
    headers: {
        'Content-Type': 'application/json'
    }
});

export const executorService = {
    // ============ Health & Info ============

    /**
     * Check if executor service is available
     */
    health: async () => {
        try {
            const response = await executorApi.get('/health');
            return { available: true, ...response.data };
        } catch (error) {
            return { available: false, error: error.message };
        }
    },

    /**
     * Get list of supported languages
     */
    getLanguages: async () => {
        try {
            const response = await executorApi.get('/languages');
            return response.data;
        } catch (error) {
            console.error('Failed to get languages:', error);
            return [];
        }
    },

    // ============ Code Execution ============

    /**
     * Execute Python code
     */
    executePython: async (code) => {
        const response = await executorApi.post('/execute', { code, language: 'python' });
        return response.data;
    },

    /**
     * Execute Java code
     */
    executeJava: async (code, className = 'Main') => {
        // If className ends with .java, use it as filename, else assume it's class name
        const filename = className.endsWith('.java') ? className : `${className}.java`;
        const response = await executorApi.post('/execute', { code, language: 'java', filename });
        return response.data;
    },

    /**
     * Execute JavaScript code (Node.js)
     */
    executeJavaScript: async (code) => {
        const response = await executorApi.post('/execute', { code, language: 'javascript' });
        return response.data;
    },

    /**
     * Execute code with specified language
     */
    execute: async (code, language, filename) => {
        try {
            const response = await executorApi.post('/execute', { code, language, filename });
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                output: ''
            };
        }
    },

    // ============ Helpers ============

    /**
     * Detect language from code content
     */
    detectLanguage: (code) => {
        const patterns = {
            python: [/\bdef\s+\w+\s*\(/, /\bimport\s+\w+/, /print\s*\(/],
            java: [/\bpublic\s+class\s+/, /\bpublic\s+static\s+void\s+main/],
            javascript: [/\bfunction\s+\w+\s*\(/, /\bconst\s+\w+\s*=/, /=>/]
        };

        for (const [lang, langPatterns] of Object.entries(patterns)) {
            for (const pattern of langPatterns) {
                if (pattern.test(code)) {
                    return lang;
                }
            }
        }

        return 'python'; // Default to Python
    },

    /**
     * Get language icon
     */
    getLanguageIcon: (language) => {
        const icons = {
            python: '🐍',
            java: '☕',
            javascript: '📜',
            js: '📜'
        };
        return icons[language.toLowerCase()] || '📄';
    }
};

export default executorService;
