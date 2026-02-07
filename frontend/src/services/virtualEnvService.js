import axios from 'axios';

const VIRTUAL_ENV_API_URL = import.meta.env.VITE_VIRTUAL_ENV_API_URL
    ? `${import.meta.env.VITE_VIRTUAL_ENV_API_URL}/api/virtual-env`
    : '/api/virtual-env';

// Create axios instance for virtual environment API
const virtualEnvApi = axios.create({
    baseURL: VIRTUAL_ENV_API_URL,
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor for adding user ID
virtualEnvApi.interceptors.request.use((config) => {
    // Get user ID from localStorage or use default for testing
    const userId = localStorage.getItem('user_id') || '1';
    config.headers['X-User-ID'] = userId;
    return config;
});

// Response interceptor for error handling
virtualEnvApi.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const errorMessage = error.response?.data?.error || error.message;
        console.error('Virtual Env API Error:', errorMessage);
        return Promise.reject(new Error(errorMessage));
    }
);

// ============ Virtual Environment Service ============

export const virtualEnvService = {
    // ========== Environment Management ==========

    /**
     * Create a new virtual environment
     * @param {string} name - Environment name
     * @param {string} type - Environment type (nodejs, python, fullstack, cpp)
     * @returns {Promise<Object>} Created environment details
     */
    async createEnvironment(name, type) {
        return virtualEnvApi.post('/environments', { name, type });
    },

    /**
     * List all environments for the current user
     * @returns {Promise<Array>} List of environments
     */
    async listEnvironments() {
        return virtualEnvApi.get('/environments');
    },

    /**
     * Get details of a specific environment
     * @param {number} envId - Environment ID
     * @returns {Promise<Object>} Environment details with container status
     */
    async getEnvironment(envId) {
        return virtualEnvApi.get(`/environments/${envId}`);
    },

    /**
     * Start a stopped environment
     * @param {number} envId - Environment ID
     * @returns {Promise<Object>} Success message
     */
    async startEnvironment(envId) {
        return virtualEnvApi.post(`/environments/${envId}/start`);
    },

    /**
     * Stop a running environment
     * @param {number} envId - Environment ID
     * @returns {Promise<Object>} Success message
     */
    async stopEnvironment(envId) {
        return virtualEnvApi.post(`/environments/${envId}/stop`);
    },

    /**
     * Destroy an environment and its container
     * @param {number} envId - Environment ID
     * @returns {Promise<Object>} Success message
     */
    async destroyEnvironment(envId) {
        return virtualEnvApi.delete(`/environments/${envId}`);
    },

    // ========== Command Execution ==========

    /**
     * Execute a command in the environment
     * @param {number} envId - Environment ID
     * @param {string} command - Command to execute
     * @param {number} timeout - Execution timeout in seconds (default: 30)
     * @returns {Promise<Object>} Execution result with stdout, stderr, exit_code
     */
    async executeCommand(envId, command, timeout = 30) {
        return virtualEnvApi.post(`/environments/${envId}/execute`, {
            command,
            timeout
        });
    },

    /**
     * Get execution logs for an environment
     * @param {number} envId - Environment ID
     * @param {number} limit - Number of logs to retrieve (default: 50)
     * @param {number} offset - Offset for pagination (default: 0)
     * @returns {Promise<Object>} Logs array
     */
    async getLogs(envId, limit = 50, offset = 0) {
        return virtualEnvApi.get(`/environments/${envId}/logs`, {
            params: { limit, offset }
        });
    },

    // ========== Package Management ==========

    /**
     * Install packages in the environment
     * @param {number} envId - Environment ID
     * @param {string} manager - Package manager (npm, pip, yarn, apt)
     * @param {Array<string>} packages - List of package names
     * @returns {Promise<Object>} Installation result
     */
    async installPackages(envId, manager, packages) {
        return virtualEnvApi.post(`/environments/${envId}/install`, {
            manager,
            packages
        });
    },

    /**
     * List installed packages
     * @param {number} envId - Environment ID
     * @param {string} manager - Package manager (npm, pip, yarn)
     * @returns {Promise<Object>} List of installed packages
     */
    async listPackages(envId, manager = 'npm') {
        return virtualEnvApi.get(`/environments/${envId}/packages`, {
            params: { manager }
        });
    },

    // ========== File Operations ==========

    /**
     * List files in a directory
     * @param {number} envId - Environment ID
     * @param {string} path - Directory path (default: /workspace)
     * @returns {Promise<Object>} List of files
     */
    async listFiles(envId, path = '/workspace') {
        return virtualEnvApi.get(`/environments/${envId}/files`, {
            params: { path }
        });
    },

    /**
     * Read a file's contents
     * @param {number} envId - Environment ID
     * @param {string} filePath - File path
     * @returns {Promise<Object>} File content
     */
    async readFile(envId, filePath) {
        return virtualEnvApi.get(`/environments/${envId}/files/${filePath}`);
    },

    /**
     * Write or update a file
     * @param {number} envId - Environment ID
     * @param {string} filePath - File path
     * @param {string} content - File content
     * @param {boolean} append - Whether to append (default: false)
     * @returns {Promise<Object>} Success message
     */
    async writeFile(envId, filePath, content, append = false) {
        return virtualEnvApi.put(`/environments/${envId}/files/${filePath}`, {
            content,
            append
        });
    },

    /**
     * Delete a file or directory
     * @param {number} envId - Environment ID
     * @param {string} filePath - File path
     * @param {boolean} recursive - Whether to delete recursively (default: false)
     * @returns {Promise<Object>} Success message
     */
    async deleteFile(envId, filePath, recursive = false) {
        return virtualEnvApi.delete(`/environments/${envId}/files/${filePath}`, {
            params: { recursive }
        });
    },

    /**
     * Create a directory
     * @param {number} envId - Environment ID
     * @param {string} path - Directory path
     * @returns {Promise<Object>} Success message
     */
    async createDirectory(envId, path) {
        return virtualEnvApi.post(`/environments/${envId}/mkdir`, { path });
    },

    // ========== Helper Methods ==========

    /**
     * Check if virtual environment API is available
     * @returns {Promise<boolean>} True if API is available
     */
    async isAvailable() {
        try {
            const response = await axios.get('/api/health');
            return response.data?.features?.virtual_environments === true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get environment type icon
     * @param {string} type - Environment type
     * @returns {string} Icon/emoji for the type
     */
    getTypeIcon(type) {
        const icons = {
            nodejs: '🟢',
            python: '🐍',
            cpp: '⚙️',
            fullstack: '🌐'
        };
        return icons[type] || '📦';
    },

    /**
     * Get status color
     * @param {string} status - Environment status
     * @returns {string} Color for the status
     */
    getStatusColor(status) {
        const colors = {
            running: '#10b981',
            stopped: '#6b7280',
            creating: '#3b82f6',
            error: '#ef4444',
            destroyed: '#9ca3af'
        };
        return colors[status] || '#6b7280';
    },

    /**
     * Format bytes to human-readable size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }
};

export default virtualEnvService;
