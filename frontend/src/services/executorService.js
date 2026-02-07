/**
 * Code Executor Service
 * Executes code via the Node.js executor service
 * All requests go through the Vite proxy at /api/executor
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/executor`
    : '/api/executor';
const executorApi = axios.create({
    baseURL: API_URL,
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
    executePython: async (code, input = '') => {
        const response = await executorApi.post('/execute', { code, language: 'python', input });
        return response.data;
    },

    /**
     * Execute Java code
     */
    executeJava: async (code, className = 'Main') => {
        // If className ends with .java, use it as filename, else assume it's class name
        const filename = className.endsWith('.java') ? className : `${className}.java`;
        const response = await executorApi.post('/execute', { code, language: 'java', filename, input });
        return response.data;
    },

    /**
     * Execute JavaScript code (Node.js)
     */
    executeJavaScript: async (code, input = '') => {
        const response = await executorApi.post('/execute', { code, language: 'javascript', input });
        return response.data;
    },

    /**
     * Execute code with specified language
     * Automatically uses virtual environment if available, otherwise falls back to local execution
     * @param {string} code - Code to execute
     * @param {string} language - Programming language
     * @param {string} filename - Optional filename
     * @param {string} input - Optional stdin input
     * @returns {Promise<Object>} Execution result
     */
    execute: async (code, language, filename, input = '') => {
        try {
            // Try virtual environment execution first
            const { default: backgroundEnvManager } = await import('./backgroundEnvManager.js');

            if (backgroundEnvManager.isVirtualEnvAvailable()) {
                console.log('[Executor] Using virtual environment');
                return await executorService.executeInVirtualEnv(code, language, filename, input);
            } else {
                return {
                    success: false,
                    error: 'Virtual environment not available. Execution is strictly limited to Docker environment.',
                    output: ''
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Execution failed: ${error.message}`,
                output: ''
            };
        }
    },

    /**
     * Execute code in the background virtual environment
     * @param {string} code - Code to execute
     * @param {string} language - Programming language
     * @param {string} filename - Optional filename
     * @param {string} input - Optional stdin input
     * @returns {Promise<Object>} Execution result
     */
    executeInVirtualEnv: async (code, language, filename = null, input = '') => {
        try {
            const { default: backgroundEnvManager } = await import('./backgroundEnvManager.js');

            // Create a temporary file with the code
            const tempFilename = filename || `main.${executorService.getFileExtension(language)}`;
            const filePath = `/workspace/${tempFilename}`;

            // Write code to file in the environment
            await backgroundEnvManager.writeFile(filePath, code);

            // Build execution command based on language
            const command = executorService.buildExecutionCommand(language, tempFilename, input);

            // Execute the command
            const result = await backgroundEnvManager.executeCommand(command, 30);

            // Clean up the temporary file
            try {
                await backgroundEnvManager.deleteFile(filePath);
            } catch (cleanupError) {
                console.warn('Failed to cleanup temp file:', cleanupError);
            }

            // Format result to match local execution format
            return {
                success: result.exit_code === 0,
                output: result.stdout || '',
                error: result.stderr || '',
                execution_time: result.execution_time
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                output: ''
            };
        }
    },

    /**
     * Build execution command for a given language
     * @param {string} language - Programming language
     * @param {string} filename - Filename
     * @param {string} input - Optional stdin input
     * @returns {string} Execution command
     */
    buildExecutionCommand: (language, filename, input = '') => {
        const commands = {
            python: `python3 ${filename}`,
            javascript: `node ${filename}`,
            java: `javac ${filename} && java ${filename.replace('.java', '')}`,
            c: `gcc ${filename} -o program && ./program`,
            cpp: `g++ ${filename} -o program && ./program`
        };

        let command = commands[language.toLowerCase()] || `cat ${filename}`;

        // Add input if provided
        if (input) {
            command = `echo "${input.replace(/"/g, '\\"')}" | ${command}`;
        }

        return command;
    },

    /**
     * Get file extension for a language
     * @param {string} language - Programming language
     * @returns {string} File extension
     */
    getFileExtension: (language) => {
        const extensions = {
            python: 'py',
            javascript: 'js',
            java: 'java',
            c: 'c',
            cpp: 'cpp',
            html: 'html',
            css: 'css',
            json: 'json'
        };
        return extensions[language.toLowerCase()] || 'txt';
    },

    // ============ Helpers ============

    /**
     * Detect language from code content
     */
    detectLanguage: (code) => {
        const patterns = {
            python: [/\bdef\s+\w+\s*\(/, /\bimport\s+\w+/, /print\s*\(/],
            java: [/\bpublic\s+class\s+/, /\bpublic\s+static\s+void\s+main/],
            javascript: [/\bfunction\s+\w+\s*\(/, /\bconst\s+\w+\s*=/, /=>/],
            c: [/#include\s+<stdio\.h>/, /\bint\s+main\s*\(/],
            cpp: [/#include\s+<iostream>/, /\busing\s+namespace\s+std;/, /\bstd::cout/]
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
            js: '📜',
            c: 'C',
            cpp: 'C++'
        };
        return icons[language.toLowerCase()] || '📄';
    }
};

export default executorService;
