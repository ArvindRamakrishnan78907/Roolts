/**
 * Enhanced File Store with Real-time Sync Capabilities
 * Integrates with backend file sync service
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fileSyncService } from '../services/fileSyncService';

// Enhanced file store with sync capabilities
export const useFileSyncStore = create(
    persist(
        (set, get) => ({
            // State
            files: [],
            openFiles: [],
            activeFileId: null,
            fileTree: null,
            isLoading: false,
            isSyncing: false,
            lastSyncTime: null,
            syncErrors: [],
            unsavedChanges: {},

            // File management actions
            setFiles: (files) => set({ files }),

            setFileTree: (tree) => set({ fileTree: tree }),

            setActiveFile: (fileId) => set({ activeFileId: fileId }),

            addFile: (file) => set((state) => ({
                files: [...state.files.filter(f => f.id !== file.id), file]
            })),

            removeFile: (fileId) => set((state) => ({
                files: state.files.filter(f => f.id !== fileId),
                openFiles: state.openFiles.filter(id => id !== fileId),
                activeFileId: state.activeFileId === fileId
                    ? state.openFiles.find(id => id !== fileId) || null
                    : state.activeFileId
            })),

            updateFileContent: (fileId, content, modified = true) => set((state) => {
                const updatedFiles = state.files.map(file =>
                    file.id === fileId
                        ? { ...file, content, modified }
                        : file
                );

                // Track unsaved changes
                const unsavedChanges = { ...state.unsavedChanges };
                if (modified) {
                    unsavedChanges[fileId] = content;
                } else {
                    delete unsavedChanges[fileId];
                }

                return {
                    files: updatedFiles,
                    unsavedChanges
                };
            }),

            openFile: (fileId) => set((state) => ({
                openFiles: state.openFiles.includes(fileId)
                    ? state.openFiles
                    : [...state.openFiles, fileId],
                activeFileId: fileId
            })),

            closeFile: (fileId) => set((state) => {
                const newOpenFiles = state.openFiles.filter(id => id !== fileId);
                return {
                    openFiles: newOpenFiles,
                    activeFileId: state.activeFileId === fileId
                        ? newOpenFiles[newOpenFiles.length - 1] || null
                        : state.activeFileId
                };
            }),

            // Sync status management
            setSyncStatus: (isSyncing, lastSyncTime = null) => set({
                isSyncing,
                lastSyncTime: lastSyncTime || new Date().toISOString()
            }),

            addSyncError: (error) => set((state) => ({
                syncErrors: [...state.syncErrors, {
                    id: Date.now(),
                    message: error,
                    timestamp: new Date().toISOString()
                }]
            })),

            clearSyncErrors: () => set({ syncErrors: [] }),

            setLoading: (isLoading) => set({ isLoading }),

            // File sync operations
            loadFileTree: async () => {
                set({ isLoading: true });
                try {
                    const result = await fileSyncService.getFileTree();
                    if (result.success) {
                        set({
                            fileTree: result.data.tree,
                            lastSyncTime: new Date().toISOString()
                        });
                        return result.data.tree;
                    } else {
                        get().addSyncError(`Failed to load file tree: ${result.error}`);
                        return null;
                    }
                } catch (error) {
                    get().addSyncError(`File tree load error: ${error.message}`);
                    return null;
                } finally {
                    set({ isLoading: false });
                }
            },

            loadFile: async (path) => {
                try {
                    set({ isSyncing: true });
                    const result = await fileSyncService.readFile(path);

                    if (result.success) {
                        const fileData = {
                            id: path,
                            name: path.split('/').pop(),
                            path,
                            content: result.data.content,
                            language: getLanguageFromPath(path),
                            encoding: result.data.encoding,
                            size: result.data.size,
                            lastModified: result.data.modified,
                            modified: false
                        };

                        get().addFile(fileData);
                        get().openFile(path);

                        return fileData;
                    } else {
                        get().addSyncError(`Failed to load file: ${result.error}`);
                        return null;
                    }
                } catch (error) {
                    get().addSyncError(`File load error: ${error.message}`);
                    return null;
                } finally {
                    set({ isSyncing: false });
                }
            },

            saveFile: async (fileId) => {
                const state = get();
                const file = state.files.find(f => f.id === fileId);
                if (!file) return false;

                try {
                    set({ isSyncing: true });
                    const result = await fileSyncService.writeFile(
                        file.path,
                        file.content,
                        { encoding: file.encoding }
                    );

                    if (result.success) {
                        get().updateFileContent(fileId, file.content, false);

                        // Clear unsaved changes
                        const unsavedChanges = { ...state.unsavedChanges };
                        delete unsavedChanges[fileId];
                        set({ unsavedChanges });

                        set({ lastSyncTime: new Date().toISOString() });
                        return true;
                    } else {
                        get().addSyncError(`Failed to save file: ${result.error}`);
                        return false;
                    }
                } catch (error) {
                    get().addSyncError(`File save error: ${error.message}`);
                    return false;
                } finally {
                    set({ isSyncing: false });
                }
            },

            createFile: async (path, content = '', type = 'file') => {
                try {
                    set({ isSyncing: true });
                    const result = await fileSyncService.createItem(path, type, content);

                    if (result.success) {
                        // Refresh file tree
                        await get().loadFileTree();

                        // If it's a file, load it
                        if (type === 'file') {
                            await get().loadFile(path);
                        }

                        return true;
                    } else {
                        get().addSyncError(`Failed to create ${type}: ${result.error}`);
                        return false;
                    }
                } catch (error) {
                    get().addSyncError(`Create ${type} error: ${error.message}`);
                    return false;
                } finally {
                    set({ isSyncing: false });
                }
            },

            deleteFile: async (path) => {
                try {
                    set({ isSyncing: true });
                    const result = await fileSyncService.deleteItem(path);

                    if (result.success) {
                        // Remove from store
                        get().removeFile(path);

                        // Refresh file tree
                        await get().loadFileTree();
                        return true;
                    } else {
                        get().addSyncError(`Failed to delete: ${result.error}`);
                        return false;
                    }
                } catch (error) {
                    get().addSyncError(`Delete error: ${error.message}`);
                    return false;
                } finally {
                    set({ isSyncing: false });
                }
            },

            renameFile: async (oldPath, newPath) => {
                try {
                    set({ isSyncing: true });
                    const result = await fileSyncService.renameItem(oldPath, newPath);

                    if (result.success) {
                        // Update file in store if it's open
                        const file = get().files.find(f => f.path === oldPath);
                        if (file) {
                            const updatedFile = {
                                ...file,
                                id: newPath,
                                path: newPath,
                                name: newPath.split('/').pop()
                            };

                            get().removeFile(oldPath);
                            get().addFile(updatedFile);
                            get().openFile(newPath);
                        }

                        // Refresh file tree
                        await get().loadFileTree();
                        return true;
                    } else {
                        get().addSyncError(`Failed to rename: ${result.error}`);
                        return false;
                    }
                } catch (error) {
                    get().addSyncError(`Rename error: ${error.message}`);
                    return false;
                } finally {
                    set({ isSyncing: false });
                }
            },

            searchFiles: async (query, options = {}) => {
                try {
                    const result = await fileSyncService.searchFiles(query, options);
                    if (result.success) {
                        return result.data.results;
                    } else {
                        get().addSyncError(`Search failed: ${result.error}`);
                        return [];
                    }
                } catch (error) {
                    get().addSyncError(`Search error: ${error.message}`);
                    return [];
                }
            },

            // Auto-save functionality
            enableAutoSave: (interval = 30000) => {
                const autoSave = setInterval(() => {
                    const state = get();
                    const modifiedFiles = state.files.filter(f => f.modified);

                    modifiedFiles.forEach(async (file) => {
                        await get().saveFile(file.id);
                    });
                }, interval);

                set({ autoSaveInterval: autoSave });
            },

            disableAutoSave: () => {
                const state = get();
                if (state.autoSaveInterval) {
                    clearInterval(state.autoSaveInterval);
                    set({ autoSaveInterval: null });
                }
            },

            // Utility functions
            getFile: (fileId) => {
                const state = get();
                return state.files.find(f => f.id === fileId);
            },

            getActiveFile: () => {
                const state = get();
                return state.files.find(f => f.id === state.activeFileId);
            },

            hasUnsavedChanges: () => {
                const state = get();
                return Object.keys(state.unsavedChanges).length > 0;
            },

            getModifiedFiles: () => {
                const state = get();
                return state.files.filter(f => f.modified);
            }
        }),
        {
            name: 'roolts-file-sync-storage',
            partialize: (state) => ({
                files: state.files,
                openFiles: state.openFiles,
                activeFileId: state.activeFileId,
                lastSyncTime: state.lastSyncTime
            })
        }
    )
);

// Helper function to determine language from file path
function getLanguageFromPath(path) {
    const extension = path.substring(path.lastIndexOf('.'));

    const languageMap = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.c': 'c',
        '.cpp': 'cpp',
        '.cs': 'csharp',
        '.php': 'php',
        '.rb': 'ruby',
        '.go': 'go',
        '.rs': 'rust',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.json': 'json',
        '.xml': 'xml',
        '.md': 'markdown',
        '.yml': 'yaml',
        '.yaml': 'yaml',
        '.sql': 'sql',
        '.sh': 'shell',
        '.bat': 'batch'
    };

    return languageMap[extension?.toLowerCase()] || 'plaintext';
}

export default useFileSyncStore;