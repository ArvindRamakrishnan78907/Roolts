/**
 * Simplified File Sync Integration
 * Lightweight wrapper for existing UI components
 */

import { fileSyncService } from './fileSyncService';
import { fileSyncApi } from './api';

export class SimplifiedFileSync {
    constructor() {
        this.isConnected = false;
        this.callbacks = [];
    }

    async initialize() {
        try {
            await fileSyncService.initializeRealTime();
            this.isConnected = true;
            return true;
        } catch (error) {
            console.log('File sync not available:', error.message);
            return false;
        }
    }

    async syncBackendFiles() {
        if (!this.isConnected) return [];

        try {
            const result = await fileSyncApi.getTree();
            if (result.data?.success && result.data?.tree) {
                return result.data.tree.filter(item => !item.isDirectory);
            }
        } catch (error) {
            console.log('Sync error:', error.message);
        }
        return [];
    }

    async readFile(path) {
        if (!this.isConnected) return null;

        try {
            const result = await fileSyncApi.readFile(path);
            if (result.data?.success) {
                return result.data.content || '';
            }
        } catch (error) {
            console.log('Read file error:', error.message);
        }
        return null;
    }

    getLanguageFromExtension(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const langMap = {
            'py': 'python', 'js': 'javascript', 'jsx': 'javascript',
            'ts': 'typescript', 'tsx': 'typescript', 'java': 'java',
            'cpp': 'cpp', 'c': 'c', 'h': 'c', 'hpp': 'cpp',
            'html': 'html', 'css': 'css', 'json': 'json',
            'xml': 'xml', 'md': 'markdown', 'txt': 'plaintext',
            'sql': 'sql', 'sh': 'shell', 'go': 'go', 'rs': 'rust',
            'rb': 'ruby', 'php': 'php'
        };
        return langMap[ext] || 'plaintext';
    }

    isMightAffectFiles(command) {
        const fileCommands = ['echo', 'copy', 'xcopy', 'move', 'del', 'mkdir', 'rmdir', 'type', 'fc', 'find', 'dir', 'ls', 'touch', 'rm', 'cp', 'mv'];
        const cmdLower = command.toLowerCase().trim();
        return fileCommands.some(cmd => cmdLower.startsWith(cmd)) || cmdLower.includes('>') || cmdLower.includes('>>');
    }

    onFileChange(callback) {
        this.callbacks.push(callback);
    }

    offFileChange(callback) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }
}

export const simplifiedFileSync = new SimplifiedFileSync();