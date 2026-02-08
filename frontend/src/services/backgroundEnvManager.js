import virtualEnvService from './virtualEnvService';

/**
 * Background Virtual Environment Manager
 * Automatically manages a default virtual environment for the user
 * Completely transparent - no UI needed
 */

class BackgroundEnvManager {
    constructor() {
        this.defaultEnvName = 'default-workspace';
        this.defaultEnvId = null;
        this.isInitialized = false;
        this.isAvailable = false;
    }

    /**
     * Initialize the background environment
     * Creates or retrieves the default environment
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Check if virtual env API is available
            this.isAvailable = await virtualEnvService.isAvailable();

            if (!this.isAvailable) {
                console.log('[BackgroundEnv] Virtual environment API not available, using local execution');
                this.isInitialized = true;
                return;
            }

            // Get or create default environment
            const environments = await virtualEnvService.listEnvironments();
            let defaultEnv = environments.environments?.find(env => env.name === this.defaultEnvName);

            if (!defaultEnv) {
                // Create default environment
                console.log('[BackgroundEnv] Creating default environment...');
                const result = await virtualEnvService.createEnvironment(this.defaultEnvName, 'fullstack');
                defaultEnv = result.environment;
                console.log('[BackgroundEnv] Default environment created:', defaultEnv.id);
            }

            this.defaultEnvId = defaultEnv.id;

            // Ensure environment is running
            if (defaultEnv.status !== 'running') {
                console.log('[BackgroundEnv] Starting default environment...');
                await virtualEnvService.startEnvironment(this.defaultEnvId);
            }

            this.isInitialized = true;
            console.log('[BackgroundEnv] Initialized successfully');
        } catch (error) {
            console.error('[BackgroundEnv] Initialization failed:', error);
            this.isAvailable = false;
            this.isInitialized = true;
        }
    }

    /**
     * Re-check environment availability
     * Useful if backend was offline during startup
     */
    async recheckAvailability() {
        this.isInitialized = false;
        this.isAvailable = false;
        await this.initialize();
        return this.isVirtualEnvAvailable();
    }

    /**
     * Get the default environment ID
     * @returns {number|null} Environment ID or null if not available
     */
    getDefaultEnvId() {
        return this.isAvailable ? this.defaultEnvId : null;
    }

    /**
     * Check if virtual environment is available
     * @returns {boolean}
     */
    isVirtualEnvAvailable() {
        return this.isAvailable && this.defaultEnvId !== null;
    }

    /**
     * Execute a command in the default environment
     * @param {string} command - Command to execute
     * @param {number} timeout - Timeout in seconds
     * @returns {Promise<Object>} Execution result
     */
    async executeCommand(command, timeout = 30) {
        if (!this.isVirtualEnvAvailable()) {
            throw new Error('Virtual environment not available');
        }

        return await virtualEnvService.executeCommand(this.defaultEnvId, command, timeout);
    }

    /**
     * Write a file to the default environment
     * @param {string} filePath - File path
     * @param {string} content - File content
     * @returns {Promise<Object>} Result
     */
    async writeFile(filePath, content) {
        if (!this.isVirtualEnvAvailable()) {
            throw new Error('Virtual environment not available');
        }

        return await virtualEnvService.writeFile(this.defaultEnvId, filePath, content, false);
    }

    /**
     * Read a file from the default environment
     * @param {string} filePath - File path
     * @returns {Promise<Object>} File content
     */
    async readFile(filePath) {
        if (!this.isVirtualEnvAvailable()) {
            throw new Error('Virtual environment not available');
        }

        return await virtualEnvService.readFile(this.defaultEnvId, filePath);
    }

    /**
     * Delete a file from the default environment
     * @param {string} filePath - File path
     * @returns {Promise<Object>} Result
     */
    async deleteFile(filePath) {
        if (!this.isVirtualEnvAvailable()) {
            throw new Error('Virtual environment not available');
        }

        return await virtualEnvService.deleteFile(this.defaultEnvId, filePath, false);
    }

    /**
     * Install packages in the default environment
     * @param {string} manager - Package manager (npm, pip, yarn)
     * @param {Array<string>} packages - Package names
     * @returns {Promise<Object>} Installation result
     */
    async installPackages(manager, packages) {
        if (!this.isVirtualEnvAvailable()) {
            throw new Error('Virtual environment not available');
        }

        return await virtualEnvService.installPackages(this.defaultEnvId, manager, packages);
    }
}

// Create singleton instance
const backgroundEnvManager = new BackgroundEnvManager();

export default backgroundEnvManager;
