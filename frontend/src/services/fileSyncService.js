/**
 * File Sync Service
 * Provides VS Code-like file synchronization with real-time updates
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/file-sync`
    : '/api/file-sync';

// Create axios instance for file sync operations
const fileSyncApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Socket.IO instance for real-time updates
let socket = null;

export class FileSyncService {
    constructor() {
        this.callbacks = {
            fileChange: [],
            directoryChange: [],
            fileMoved: [],
            directoryMoved: [],
            fileUpdated: [],
            fileCreated: [],
            fileDeleted: [],
            directoryCreated: [],
            directoryDeleted: [],
            fileRenamed: [],
            directoryRenamed: []
        };
        this.connected = false;
        this.userId = 'dev_user_123'; // For dev mode
    }

    /**
     * Initialize real-time connection
     */
    async initializeRealTime() {
        try {
            if (!socket) {
                const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
                socket = io(socketUrl, {
                    transports: ['websocket', 'polling'],
                    timeout: 20000,
                    autoConnect: true
                });

                socket.on('connect', () => {
                    console.log('🔗 File sync connected');
                    this.connected = true;
                    // Join user's file sync room
                    socket.emit('join_file_sync', { user_id: this.userId });
                });

                socket.on('disconnect', () => {
                    console.log('🔌 File sync disconnected');
                    this.connected = false;
                });

                // Real-time file events
                socket.on('file_change', (data) => {
                    this._triggerCallbacks('fileChange', data);
                });

                socket.on('directory_change', (data) => {
                    this._triggerCallbacks('directoryChange', data);
                });

                socket.on('file_moved', (data) => {
                    this._triggerCallbacks('fileMoved', data);
                });

                socket.on('directory_moved', (data) => {
                    this._triggerCallbacks('directoryMoved', data);
                });

                socket.on('file_updated', (data) => {
                    this._triggerCallbacks('fileUpdated', data);
                });

                socket.on('file_created', (data) => {
                    this._triggerCallbacks('fileCreated', data);
                });

                socket.on('file_deleted', (data) => {
                    this._triggerCallbacks('fileDeleted', data);
                });

                socket.on('directory_created', (data) => {
                    this._triggerCallbacks('directoryCreated', data);
                });

                socket.on('directory_deleted', (data) => {
                    this._triggerCallbacks('directoryDeleted', data);
                });

                socket.on('file_renamed', (data) => {
                    this._triggerCallbacks('fileRenamed', data);
                });

                socket.on('directory_renamed', (data) => {
                    this._triggerCallbacks('directoryRenamed', data);
                });
            }
            return true;
        } catch (error) {
            console.warn('⚠️ Real-time sync not available:', error.message);
            return false;
        }
    }

    /**
     * Subscribe to real-time events
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    /**
     * Unsubscribe from real-time events
     */
    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Trigger callbacks for events
     */
    _triggerCallbacks(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} callback:`, error);
                }
            });
        }
    }

    /**
     * Get complete file tree
     */
    async getFileTree() {
        try {
            const response = await fileSyncApi.get('/tree');
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Read file content
     */
    async readFile(path) {
        try {
            const response = await fileSyncApi.get('/read', {
                params: { path }
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Write file content
     */
    async writeFile(path, content, options = {}) {
        try {
            const response = await fileSyncApi.post('/write', {
                path,
                content,
                encoding: options.encoding || 'utf-8',
                createDirectories: options.createDirectories !== false
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Create file or directory
     */
    async createItem(path, type = 'file', content = '') {
        try {
            const response = await fileSyncApi.post('/create', {
                path,
                type,
                content
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Delete file or directory
     */
    async deleteItem(path) {
        try {
            const response = await fileSyncApi.delete('/delete', {
                params: { path }
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Rename file or directory
     */
    async renameItem(oldPath, newPath) {
        try {
            const response = await fileSyncApi.put('/rename', {
                oldPath,
                newPath
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Search files by name or content
     */
    async searchFiles(query, options = {}) {
        try {
            const response = await fileSyncApi.get('/search', {
                params: {
                    query,
                    content: options.searchContent || false,
                    limit: options.limit || 50
                }
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Disconnect from real-time updates
     */
    disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
            this.connected = false;
        }
    }

    /**
     * Check if real-time sync is connected
     */
    isConnected() {
        return this.connected;
    }
}

// Export singleton instance
export const fileSyncService = new FileSyncService();
export default fileSyncService;