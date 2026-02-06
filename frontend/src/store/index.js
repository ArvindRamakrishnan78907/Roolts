import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// File Store - manages files and editor state (persisted)
export const useFileStore = create(
    persist(
        (set, get) => ({
            files: [
                {
                    id: '1',
                    name: 'main.py',
                    path: '/main.py',
                    content: `# Welcome to Roolts!
# Start coding here...

def hello_world():
    """A simple hello world function"""
    print("Hello from Roolts!")
    return True

if __name__ == "__main__":
    hello_world()
`,
                    language: 'python',
                    modified: false
                },
                {
                    id: '2',
                    name: 'App.js',
                    path: '/src/App.js',
                    content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Hello, Roolts!</h1>
    </div>
  );
}

export default App;
`,
                    language: 'javascript',
                    modified: false
                }
            ],
            activeFileId: '1',
            openFiles: ['1'],

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

    setExecuting: (isExecuting) => set({ isExecuting }),
    setOutput: (output) => set({ output, showOutput: true }),
    setError: (error) => set({ error }),
    setExecutionTime: (executionTime) => set({ executionTime }),
    setShowOutput: (showOutput) => set({ showOutput }),

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
