import backgroundEnvManager from './backgroundEnvManager';
import virtualEnvService from './virtualEnvService';

/**
 * File Sync Service
 * Synchronizes files between virtual environment and frontend file store
 */

class FileSyncService {
    constructor() {
        this.syncInterval = null;
        this.isSyncing = false;
    }

    /**
     * Start automatic file synchronization
     * @param {Function} onFilesUpdate - Callback when files are updated
     * @param {number} intervalMs - Sync interval in milliseconds (default: 5000)
     */
    startAutoSync(onFilesUpdate, intervalMs = 5000) {
        if (this.syncInterval) {
            this.stopAutoSync();
        }

        // Initial sync
        this.syncFiles(onFilesUpdate);

        // Set up periodic sync
        this.syncInterval = setInterval(() => {
            this.syncFiles(onFilesUpdate);
        }, intervalMs);

        console.log('[FileSync] Auto-sync started');
    }

    /**
     * Stop automatic file synchronization
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('[FileSync] Auto-sync stopped');
        }
    }

    /**
     * Manually sync files from virtual environment
     * @param {Function} onFilesUpdate - Callback when files are updated
     */
    async syncFiles(onFilesUpdate) {
        if (this.isSyncing) return;
        if (!backgroundEnvManager.isVirtualEnvAvailable()) return;

        this.isSyncing = true;

        try {
            const envId = backgroundEnvManager.getDefaultEnvId();
            if (!envId) return;

            // Get file list from container
            const result = await virtualEnvService.listFiles(envId, '/workspace');

            if (result.success && result.files) {
                // Convert container files to frontend file format
                const files = this.convertContainerFilesToFrontendFormat(result.files);

                // Call update callback
                if (onFilesUpdate && typeof onFilesUpdate === 'function') {
                    onFilesUpdate(files);
                }
            }
        } catch (error) {
            console.error('[FileSync] Sync failed:', error);
            if (error.code === 'ECONNREFUSED' || error.response?.status === 404) {
                console.warn('[FileSync] Backend likely unavailable or route missing.');
            }
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Convert container file list to frontend file format
     * @param {Array} containerFiles - Files from container
     * @returns {Array} Files in frontend format
     */
    convertContainerFilesToFrontendFormat(containerFiles) {
        const files = [];

        const processFile = (file, parentPath = '') => {
            // Ensure path always starts with /
            let fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;
            if (!fullPath.startsWith('/')) {
                fullPath = `/${fullPath}`;
            }
            // Use timestamp + random number for truly unique IDs
            const uniqueId = `container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            if (file.type === 'directory') {
                // Add directory
                files.push({
                    id: uniqueId,
                    name: file.name,
                    type: 'folder',
                    path: fullPath,
                    children: []
                });

                // Process children if they exist
                if (file.children && Array.isArray(file.children)) {
                    file.children.forEach(child => {
                        processFile(child, fullPath);
                    });
                }
            } else {
                // Add file
                const language = this.detectLanguageFromExtension(file.name);
                files.push({
                    id: uniqueId,
                    name: file.name,
                    type: 'file',
                    language: language,
                    path: fullPath,
                    size: file.size || 0,
                    modified: file.modified || new Date().toISOString(),
                    content: '', // Content loaded on demand
                    saved: true,
                    synced: true // Mark as synced from container
                });
            }
        };

        // Process each file/directory
        containerFiles.forEach(file => processFile(file));

        return files;
    }

    /**
     * Detect programming language from file extension
     * @param {string} filename - File name
     * @returns {string} Language identifier
     */
    detectLanguageFromExtension(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();

        const languageMap = {
            'py': 'python',
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'h': 'c',
            'hpp': 'cpp',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'txt': 'plaintext',
            'sh': 'shell',
            'bash': 'shell',
            'yml': 'yaml',
            'yaml': 'yaml'
        };

        return languageMap[ext] || 'plaintext';
    }

    /**
     * Rename a file or directory in the container
     * @param {string} oldPath - Old file path
     * @param {string} newPath - New file path
     * @returns {Promise<boolean>} Success status
     */
    async renameFile(oldPath, newPath) {
        try {
            if (!backgroundEnvManager.isVirtualEnvAvailable()) {
                return false;
            }

            const envId = backgroundEnvManager.getDefaultEnvId();
            if (!envId) return false;

            const containerOldPath = oldPath.startsWith('/workspace')
                ? oldPath
                : `/workspace/${oldPath}`;

            const containerNewPath = newPath.startsWith('/workspace')
                ? newPath
                : `/workspace/${newPath}`;

            await virtualEnvService.renameFile(envId, containerOldPath, containerNewPath);
            console.log('[FileSync] Renamed file in container:', containerOldPath, '->', containerNewPath);
            return true;
        } catch (error) {
            console.error('[FileSync] Failed to rename file:', error);
            return false;
        }
    }

    /**
     * Create a file or directory in the container
     * @param {string} path - File/Directory path
     * @param {string} type - 'file' or 'directory'
     * @returns {Promise<boolean>} Success status
     */
    async createFile(path, type = 'file') {
        try {
            if (!backgroundEnvManager.isVirtualEnvAvailable()) {
                return false;
            }

            const envId = backgroundEnvManager.getDefaultEnvId();
            if (!envId) return false;

            const containerPath = path.startsWith('/workspace')
                ? path
                : `/workspace/${path}`;

            await virtualEnvService.createFile(envId, containerPath, type);
            console.log('[FileSync] Created item in container:', containerPath);
            return true;
        } catch (error) {
            console.error('[FileSync] Failed to create item:', error);
            return false;
        }
    }

    /**
     * Push a file from frontend to container
     * @param {string} filePath - File path in container
     * @param {string} content - File content
     * @returns {Promise<boolean>} Success status
     */
    async pushFile(filePath, content) {
        try {
            if (!backgroundEnvManager.isVirtualEnvAvailable()) {
                return false;
            }

            const envId = backgroundEnvManager.getDefaultEnvId();
            if (!envId) return false;

            const containerPath = filePath.startsWith('/workspace')
                ? filePath
                : `/workspace/${filePath}`;

            await virtualEnvService.writeFile(envId, containerPath, content);
            console.log('[FileSync] Pushed file to container:', containerPath);
            return true;
        } catch (error) {
            console.error('[FileSync] Failed to push file:', error);
            return false;
        }
    }

    /**
     * Pull a file from container to frontend
     * @param {string} filePath - File path in container
     * @returns {Promise<string|null>} File content or null if failed
     */
    async pullFile(filePath) {
        try {
            if (!backgroundEnvManager.isVirtualEnvAvailable()) {
                return null;
            }

            const envId = backgroundEnvManager.getDefaultEnvId();
            if (!envId) return null;

            const containerPath = filePath.startsWith('/workspace')
                ? filePath
                : `/workspace/${filePath}`;

            const result = await virtualEnvService.readFile(envId, containerPath);

            if (result.success && result.content !== undefined) {
                console.log('[FileSync] Pulled file from container:', containerPath);
                return result.content;
            }

            return null;
        } catch (error) {
            console.error('[FileSync] Failed to pull file:', error);
            return null;
        }
    }

    /**
     * Delete a file from container
     * @param {string} filePath - File path in container
     * @returns {Promise<boolean>} Success status
     */
    async deleteFile(filePath) {
        try {
            if (!backgroundEnvManager.isVirtualEnvAvailable()) {
                return false;
            }

            const envId = backgroundEnvManager.getDefaultEnvId();
            if (!envId) return false;

            const containerPath = filePath.startsWith('/workspace')
                ? filePath
                : `/workspace/${filePath}`;

            await virtualEnvService.deleteFile(envId, containerPath, true);
            console.log('[FileSync] Deleted file from container:', containerPath);
            return true;
        } catch (error) {
            console.error('[FileSync] Failed to delete file:', error);
            return false;
        }
    }
}

// Create singleton instance
const fileSyncService = new FileSyncService();

export default fileSyncService;
