import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// File Store - manages files and editor state (persisted)
export const useFileStore = create(
    persist(
        (set, get) => ({
            files: [],
            activeFileId: null,
            openFiles: [],

            // Actions
            setActiveFile: (fileId) => set({ activeFileId: fileId }),

            openFile: (fileId) => set((state) => ({
                openFiles: state.openFiles.includes(fileId)
                    ? state.openFiles
                    : [...state.openFiles, fileId],
                activeFileId: fileId
            })),

            closeFile: (fileId) => set((state) => {
                const newOpenFiles = state.openFiles.filter((id) => id !== fileId);
                return {
                    openFiles: newOpenFiles,
                    activeFileId: state.activeFileId === fileId
                        ? newOpenFiles[newOpenFiles.length - 1] || null
                        : state.activeFileId
                };
            }),

            updateFileContent: (fileId, content) => set((state) => ({
                files: state.files.map((file) =>
                    file.id === fileId ? { ...file, content, modified: true } : file
                )
            })),

            addFile: (name, content = '', language = 'plaintext') => {
                const id = Date.now().toString();
                set((state) => ({
                    files: [
                        ...state.files,
                        {
                            id,
                            name,
                            path: `/${name}`,
                            content,
                            language,
                            modified: false
                        }
                    ],
                    openFiles: [...state.openFiles, id],
                    activeFileId: id
                }));
                return id;
            },

            deleteFile: (fileId) => set((state) => ({
                files: state.files.filter((file) => file.id !== fileId),
                openFiles: state.openFiles.filter((id) => id !== fileId),
                activeFileId: state.activeFileId === fileId ? state.openFiles[0] || null : state.activeFileId
            })),

            markFileSaved: (fileId) => set((state) => ({
                files: state.files.map((file) =>
                    file.id === fileId ? { ...file, modified: false } : file
                )
            })),

            renameFile: (fileId, newName) => set((state) => ({
                files: state.files.map((file) =>
                    file.id === fileId
                        ? { ...file, name: newName, path: file.path.substring(0, file.path.lastIndexOf('/') + 1) + newName }
                        : file
                )
            })),

            syncFromContainer: (containerFiles) => set((state) => {
                if (!containerFiles || containerFiles.length === 0) return state;

                const containerMap = new Map(containerFiles.map(f => [f.path, f]));
                const newFiles = [];
                let hasChanges = false;

                // Process all existing files
                state.files.forEach(existingFile => {
                    if (containerMap.has(existingFile.path)) {
                        const containerFile = containerMap.get(existingFile.path);

                        // Check if file changed in container (different size or newer/different modified time)
                        // Note: String comparison of ISO dates works for equality
                        const isModified = containerFile.modified !== existingFile.lastSyncedDate;

                        // If file is outdated, mark it so we can refresh content
                        // Only mark outdated if we don't have local unsaved changes
                        const outdated = isModified && !existingFile.modified;

                        if (outdated || existingFile.outdated !== outdated || String(existingFile.size) !== String(containerFile.size)) {
                            hasChanges = true;
                        }

                        newFiles.push({
                            ...existingFile,
                            // Update metadata if changed
                            size: containerFile.size,
                            lastSyncedDate: containerFile.modified, // Track version
                            outdated: outdated,
                            synced: true
                        });

                        // Remove from map so we know what's left (new files)
                        containerMap.delete(existingFile.path);
                    } else {
                        // CRITICAL FIX: Keep file even if not in sync response
                        // Only explicit delete operations should remove files
                        // This prevents accidental deletion during:
                        // - Partial sync responses
                        // - Race conditions during file/directory creation
                        // - Network issues or incomplete responses
                        newFiles.push(existingFile);
                    }
                });

                // Add remaining new files from container
                containerMap.forEach(containerFile => {
                    newFiles.push({
                        ...containerFile,
                        lastSyncedDate: containerFile.modified
                    });
                    hasChanges = true;
                });

                if (!hasChanges) {
                    return state;
                }

                console.log('[FileStore] Synced files. Container:', containerFiles.length, 'Existing:', state.files.length, 'Result:', newFiles.length);
                return { files: newFiles };
            }),

            fetchFileContent: async (fileId, force = false) => {
                const state = get();
                const file = state.files.find(f => f.id === fileId);

                if (file && file.synced && (force || !file.content || file.content === '')) {
                    try {
                        const { default: fileSyncService } = await import('../services/fileSyncService');
                        const content = await fileSyncService.pullFile(file.path);

                        if (content !== null) {
                            set((state) => ({
                                files: state.files.map(f =>
                                    f.id === fileId
                                        ? { ...f, content: content || '', loaded: true, outdated: false, lastSyncedDate: f.modified }
                                        : f
                                )
                            }));
                            console.log('[FileStore] Loaded content for:', file.name);
                        }
                    } catch (error) {
                        console.error('[FileStore] Failed to load content:', error);
                    }
                }
            },

            getActiveFile: () => {
                const state = get();
                return state.files.find((file) => file.id === state.activeFileId);
            }
        }),
        {
            name: 'roolts-files-storage',
            partialize: (state) => ({
                files: state.files,
                activeFileId: state.activeFileId,
                openFiles: state.openFiles
            })
        }
    )
);

// GitHub Store - manages GitHub integration state (persisted)
export const useGitHubStore = create(
    persist(
        (set) => ({
            isConnected: false,
            user: null,
            repositories: [],
            selectedRepo: null,
            isLoading: false,
            error: null,

            setConnected: (isConnected, user = null) => set({ isConnected, user }),
            setRepositories: (repositories) => set({ repositories }),
            selectRepo: (repo) => set({ selectedRepo: repo }),
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),

            reset: () => set({
                isConnected: false,
                user: null,
                repositories: [],
                selectedRepo: null,
                isLoading: false,
                error: null
            })
        }),
        {
            name: 'roolts-github-storage',
            partialize: (state) => ({
                isConnected: state.isConnected,
                user: state.user,
                repositories: state.repositories
            })
        }
    )
);

// Social Store - manages social media integration
export const useSocialStore = create((set) => ({
    linkedin: {
        isConnected: false,
        user: null
    },
    twitter: {
        isConnected: false,
        user: null
    },
    isPosting: false,
    lastPost: null,

    connectLinkedIn: (user) => set((state) => ({
        linkedin: { isConnected: true, user }
    })),

    connectTwitter: (user) => set((state) => ({
        twitter: { isConnected: true, user }
    })),

    disconnectLinkedIn: () => set((state) => ({
        linkedin: { isConnected: false, user: null }
    })),

    disconnectTwitter: () => set((state) => ({
        twitter: { isConnected: false, user: null }
    })),

    setPosting: (isPosting) => set({ isPosting }),
    setLastPost: (lastPost) => set({ lastPost })
}));

// Learning Store - manages AI learning features
export const useLearningStore = create((set) => ({
    explanation: null,
    diagram: null,
    resources: [],
    reviewResults: null,
    isGenerating: false,
    isReviewing: false,
    activeTab: 'explain',
    chatMessages: [],

    setExplanation: (explanation) => set({ explanation }),
    setDiagram: (diagram) => set({ diagram }),
    setResources: (resources) => set({ resources }),
    setReviewResults: (reviewResults) => set({ reviewResults }),
    setGenerating: (isGenerating) => set({ isGenerating }),
    setReviewing: (isReviewing) => set({ isReviewing }),
    setActiveTab: (activeTab) => set({ activeTab }),
    addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, { ...message, id: Date.now() }]
    })),
    clearChat: () => set({ chatMessages: [] }),

    reset: () => set({
        explanation: null,
        diagram: null,
        resources: [],
        reviewResults: null,
        isGenerating: false,
        isReviewing: false
    })
}));

// UI Store - manages UI state
export const useUIStore = create((set) => ({
    sidebarOpen: true,
    rightPanelOpen: true,
    rightPanelTab: 'github',
    editorMinimized: false,
    rightPanelExpanded: false,
    modals: {
        newFile: false,
        commitPush: false,
        share: false,
        settings: false,
        portfolioGenerator: false,
        deployment: false
    },
    notifications: [],

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
    setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
    toggleEditorMinimized: () => set((state) => ({ editorMinimized: !state.editorMinimized })),
    toggleRightPanelExpanded: () => set((state) => ({
        rightPanelExpanded: !state.rightPanelExpanded,
        editorMinimized: !state.rightPanelExpanded
    })),

    openModal: (modalName) => set((state) => ({
        modals: { ...state.modals, [modalName]: true }
    })),

    closeModal: (modalName) => set((state) => ({
        modals: { ...state.modals, [modalName]: false }
    })),

    addNotification: (notification) => {
        const id = Date.now();
        set((state) => ({
            notifications: [...state.notifications, { ...notification, id }]
        }));
        // Auto-remove after 5 seconds
        setTimeout(() => {
            set((state) => ({
                notifications: state.notifications.filter((n) => n.id !== id)
            }));
        }, 5000);
    },

    removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
    }))
}));

// Settings Store - manages user preferences (persisted)
export const useSettingsStore = create(
    persist(
        (set) => ({
            theme: 'vs-dark', // vs-dark, light, high-contrast-black
            backgroundImage: null, // Base64 or URL
            backgroundOpacity: 0.1, // 0 to 1
            uiFontSize: 14,
            uiFontFamily: 'Inter',
            format: {
                fontSize: 14,
                tabSize: 4,
                wordWrap: 'on', // on, off, wordWrapColumn, bounded
                fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
                lineHeight: 1.5
            },
            features: {
                minimap: true,
                lineNumbers: 'on', // on, off, relative, interval
                autoSave: false,
                livePreview: true,
                vimMode: false
            },

            setTheme: (theme) => set({ theme }),
            setBackgroundImage: (image) => set({ backgroundImage: image }),
            setBackgroundOpacity: (opacity) => set({ backgroundOpacity: opacity }),
            setUiFontSize: (size) => set({ uiFontSize: size }),
            setUiFontFamily: (family) => set({ uiFontFamily: family }),
            updateFormat: (key, value) => set((state) => ({
                format: { ...state.format, [key]: value }
            })),
            toggleFeature: (key) => set((state) => ({
                features: { ...state.features, [key]: !state.features[key] }
            })),
            setFeature: (key, value) => set((state) => ({
                features: { ...state.features, [key]: value }
            })),
            resetSettings: () => set({
                theme: 'vs-dark',
                uiFontSize: 14,
                uiFontFamily: 'Inter',
                format: {
                    fontSize: 14,
                    tabSize: 4,
                    wordWrap: 'on',
                    fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
                    lineHeight: 1.5
                },
                features: {
                    minimap: true,
                    lineNumbers: 'on',
                    autoSave: false,
                    livePreview: true,
                    vimMode: false
                }
            })
        }),
        {
            name: 'roolts-settings-storage'
        }
    )
);

// Notes Store - manages notes for the note editor
export const useNotesStore = create((set, get) => ({
    notes: [],
    activeNoteId: null,
    isLoading: false,
    searchQuery: '',

    setNotes: (notes) => set({ notes }),
    setActiveNote: (noteId) => set({ activeNoteId: noteId }),
    setLoading: (isLoading) => set({ isLoading }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),

    addNote: (note) => set((state) => ({
        notes: [note, ...state.notes],
        activeNoteId: note.id
    })),

    updateNote: (noteId, updates) => set((state) => ({
        notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note
        )
    })),

    deleteNote: (noteId) => set((state) => {
        const newNotes = state.notes.filter((note) => note.id !== noteId);
        return {
            notes: newNotes,
            activeNoteId: state.activeNoteId === noteId
                ? (newNotes[0]?.id || null)
                : state.activeNoteId
        };
    }),

    getActiveNote: () => {
        const state = get();
        return state.notes.find((note) => note.id === state.activeNoteId);
    },

    getFilteredNotes: () => {
        const state = get();
        if (!state.searchQuery) return state.notes;
        const query = state.searchQuery.toLowerCase();
        return state.notes.filter(
            note => note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query)
        );
    }
}));

// Execution Store - manages code execution state
export const useExecutionStore = create((set) => ({
    isExecuting: false,
    output: '',
    error: null,
    executionTime: null,
    history: [],
    compilers: {
        python: { available: null, version: null },
        java: { available: null, version: null },
        javascript: { available: null, version: null }
    },
    showOutput: false,
    input: '',

    setExecuting: (isExecuting) => set({ isExecuting }),
    setOutput: (output) => set({ output, showOutput: true }),
    setError: (error) => set({ error }),
    setExecutionTime: (executionTime) => set({ executionTime }),
    setShowOutput: (showOutput) => set({ showOutput }),
    setInput: (input) => set({ input }),

    setCompilerStatus: (language, status) => set((state) => ({
        compilers: {
            ...state.compilers,
            [language]: status
        }
    })),

    addToHistory: (entry) => set((state) => ({
        history: [
            {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                ...entry
            },
            ...state.history
        ].slice(0, 20) // Keep last 20 entries
    })),

    clearOutput: () => set({ output: '', error: null, executionTime: null }),

    clearHistory: () => set({ history: [] }),

    reset: () => set({
        isExecuting: false,
        output: '',
        error: null,
        executionTime: null,
        showOutput: false
    })
}));

// Terminal Store - manages integrated terminal state (persisted history)
export const useTerminalStore = create(
    persist(
        (set, get) => ({
            lines: [{ type: 'system', content: 'PowerShell Terminal - Type commands below' }],
            commandHistory: [],
            historyIndex: -1,
            currentInput: '',
            cwd: '',
            isRunning: false,

            addLine: (line) => set((state) => ({
                lines: [...state.lines, line].slice(-500) // Keep last 500 lines
            })),

            addCommand: (command) => set((state) => ({
                commandHistory: [command, ...state.commandHistory].slice(0, 100)
            })),

            setHistoryIndex: (index) => set({ historyIndex: index }),
            setCurrentInput: (input) => set({ currentInput: input }),
            setCwd: (cwd) => set({ cwd }),
            setRunning: (isRunning) => set({ isRunning }),

            clearTerminal: () => set({
                lines: [{ type: 'system', content: 'Terminal cleared' }],
                historyIndex: -1
            }),

            getFromHistory: (direction) => {
                const state = get();
                const { commandHistory, historyIndex } = state;

                if (commandHistory.length === 0) return state.currentInput;

                let newIndex = historyIndex;
                if (direction === 'up') {
                    newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
                } else {
                    newIndex = Math.max(historyIndex - 1, -1);
                }

                set({ historyIndex: newIndex });
                return newIndex >= 0 ? commandHistory[newIndex] : '';
            }
        }),
        {
            name: 'roolts-terminal-storage',
            partialize: (state) => ({
                commandHistory: state.commandHistory.slice(0, 50),
                cwd: state.cwd
            })
        }
    )
);

// Snippet Store - manages user snippets
export const useSnippetStore = create((set) => ({
    snippets: [],
    isLoading: false,

    setSnippets: (snippets) => set({ snippets }),
    setLoading: (isLoading) => set({ isLoading }),

    addSnippet: (snippet) => set((state) => ({
        snippets: [snippet, ...state.snippets]
    })),

    removeSnippet: (id) => set((state) => ({
        snippets: state.snippets.filter(s => s.id !== id)
    }))
}));

// Virtual Environment Store - manages containerized development environments
export const useVirtualEnvStore = create(
    persist(
        (set, get) => ({
            environments: [],
            activeEnvId: null,
            isLoading: false,
            error: null,
            useVirtualEnv: false, // Toggle for using virtual env vs local execution

            // Environment management
            setEnvironments: (environments) => set({ environments }),
            setActiveEnv: (envId) => set({ activeEnvId: envId }),
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            setUseVirtualEnv: (use) => set({ useVirtualEnv: use }),

            addEnvironment: (environment) => set((state) => ({
                environments: [environment, ...state.environments],
                activeEnvId: environment.id
            })),

            updateEnvironment: (envId, updates) => set((state) => ({
                environments: state.environments.map((env) =>
                    env.id === envId ? { ...env, ...updates } : env
                )
            })),

            removeEnvironment: (envId) => set((state) => {
                const newEnvs = state.environments.filter((env) => env.id !== envId);
                return {
                    environments: newEnvs,
                    activeEnvId: state.activeEnvId === envId
                        ? (newEnvs[0]?.id || null)
                        : state.activeEnvId
                };
            }),

            getActiveEnvironment: () => {
                const state = get();
                return state.environments.find((env) => env.id === state.activeEnvId);
            },

            // Quick actions
            toggleEnvironmentStatus: async (envId, currentStatus) => {
                // This will be called from UI components
                set({ isLoading: true });
                try {
                    // Status will be updated by the component calling the API
                    return true;
                } catch (error) {
                    set({ error: error.message });
                    return false;
                } finally {
                    set({ isLoading: false });
                }
            },

            reset: () => set({
                environments: [],
                activeEnvId: null,
                isLoading: false,
                error: null,
                useVirtualEnv: false
            })
        }),
        {
            name: 'roolts-virtualenv-storage',
            partialize: (state) => ({
                environments: state.environments,
                activeEnvId: state.activeEnvId,
                useVirtualEnv: state.useVirtualEnv
            })
        }
    )
);
