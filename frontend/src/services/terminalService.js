/**
 * Terminal Service
 * Handles communication with the backend terminal API
 */

import axios from 'axios';

const terminalApi = axios.create({
    baseURL: '/api/terminal',
    timeout: 120000, // 2 minutes for long commands like pip install
    headers: {
        'Content-Type': 'application/json'
    }
});

export const terminalService = {
    /**
     * Execute a command in the terminal
     * Automatically uses virtual environment if available, otherwise uses local terminal
     */
    execute: async (command, sessionId = 'default') => {
        try {
            // Try virtual environment execution first
            const { default: backgroundEnvManager } = await import('./backgroundEnvManager.js');

            if (backgroundEnvManager.isVirtualEnvAvailable()) {
                console.log('[Terminal] Executing in virtual environment:', command);
                const result = await backgroundEnvManager.executeCommand(command, 30);

                return {
                    success: result.exit_code === 0,
                    output: result.stdout || result.stderr || '',
                    error: result.exit_code !== 0 ? (result.stderr || 'Command failed') : '',
                    cwd: '/workspace',
                    exit_code: result.exit_code
                };
            }
        } catch (error) {
            console.log('[Terminal] Virtual environment not available, using local terminal:', error.message);
        }

        // Fallback to local terminal API
        try {
            const response = await terminalApi.post('/execute', {
                command,
                sessionId
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                output: '',
                cwd: ''
            };
        }
    },

    /**
     * Get current working directory
     */
    getCwd: async (sessionId = 'default') => {
        try {
            const response = await terminalApi.get('/cwd', {
                params: { sessionId }
            });
            return response.data.cwd;
        } catch (error) {
            return '';
        }
    },

    /**
     * Set current working directory
     */
    setCwd: async (cwd, sessionId = 'default') => {
        try {
            const response = await terminalApi.post('/cwd', {
                cwd,
                sessionId
            });
            return response.data.cwd;
        } catch (error) {
            return null;
        }
    },

    /**
     * Get command history
     */
    getHistory: async (sessionId = 'default') => {
        try {
            const response = await terminalApi.get('/history', {
                params: { sessionId }
            });
            return response.data.history;
        } catch (error) {
            return [];
        }
    },

    /**
     * Clear terminal history
     */
    clearHistory: async (sessionId = 'default') => {
        try {
            await terminalApi.post('/clear', { sessionId });
            return true;
        } catch (error) {
            return false;
        }
    }
};

export default terminalService;
