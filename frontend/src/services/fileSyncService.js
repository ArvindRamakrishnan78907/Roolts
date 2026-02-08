import api from './api.js';

/**
 * File Sync Service
 * Handles synchronization of files with Docker containers
 */
class FileSyncService {
    constructor() {
        this.api = api;
    }

    /**
     * Push file content to Docker container
     * @param {string} filePath - Path of the file in the container
     * @param {string} content - File content to write
     * @returns {Promise<boolean>} - Success status
     */
    async pushFile(filePath, content) {
        try {
            // Get current environment ID (this might need to be implemented)
            const envId = this.getCurrentEnvironmentId();
            if (!envId) {
                console.warn('[FileSync] No environment ID available');
                return false;
            }

            // Ensure path starts with /workspace if not already
            const containerPath = filePath.startsWith('/workspace') ? filePath : `/workspace${filePath}`;

            const response = await this.api.put(`/virtual_env/environments/${envId}/files/${containerPath}`, {
                content: content
            });

            return response.data.success === true;
        } catch (error) {
            console.error('[FileSync] Error pushing file:', error);
            return false;
        }
    }

    /**
     * Get current environment ID
     * This is a placeholder - should be implemented based on your environment management
     */
    getCurrentEnvironmentId() {
        // Try to get from localStorage or store
        return localStorage.getItem('current_env_id') || '1'; // Default to 1 for now
    }
}

const fileSyncService = new FileSyncService();
export default fileSyncService;