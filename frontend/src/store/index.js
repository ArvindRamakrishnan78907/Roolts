import { create } from 'zustand';

// File Store - manages files and editor state
export const useFileStore = create((set, get) => ({
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

    getActiveFile: () => {
        const state = get();
        return state.files.find((file) => file.id === state.activeFileId);
    }
}));

// GitHub Store - manages GitHub integration state
export const useGitHubStore = create((set) => ({
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
}));

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
    isGenerating: false,
    activeTab: 'explain',

    setExplanation: (explanation) => set({ explanation }),
    setDiagram: (diagram) => set({ diagram }),
    setResources: (resources) => set({ resources }),
    setGenerating: (isGenerating) => set({ isGenerating }),
    setActiveTab: (activeTab) => set({ activeTab }),

    reset: () => set({
        explanation: null,
        diagram: null,
        resources: [],
        isGenerating: false
    })
}));

// UI Store - manages UI state
export const useUIStore = create((set) => ({
    sidebarOpen: true,
    rightPanelOpen: true,
    rightPanelTab: 'github',
    modals: {
        newFile: false,
        commitPush: false,
        share: false,
        settings: false
    },
    notifications: [],

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
    setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

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
