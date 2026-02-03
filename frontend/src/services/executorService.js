/**
 * Code Executor Service
 * Executes code via the Java executor service
 */

import axios from 'axios';

const EXECUTOR_URL = 'http://localhost:8080/api/execute';

const executorApi = axios.create({
    baseURL: EXECUTOR_URL,
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
            return response.data.languages;
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
        const response = await executorApi.post('/python', { code });
        return response.data;
    },

    /**
     * Execute Java code
     */
    executeJava: async (code, className = 'Main') => {
        const response = await executorApi.post('/java', { code, className });
        return response.data;
    },

    /**
     * Execute JavaScript code (Node.js)
     */
    executeJavaScript: async (code) => {
        const response = await executorApi.post('/javascript', { code });
        return response.data;
    },

    /**
     * Execute code with auto-detected language
     */
    execute: async (code, language) => {
        const response = await executorApi.post('/run', { code, language });
        return response.data;
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
