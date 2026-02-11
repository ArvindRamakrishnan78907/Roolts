import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import Editor from '@monaco-editor/react';
import {
    FiFile,
    FiFolder,
    FiGithub,
    FiLinkedin,
    FiTwitter,
    FiBookOpen,
    FiPlus,
    FiSave,
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiSettings,
    FiUploadCloud,
    FiShare2,
    FiCpu,
    FiCode,
    FiGitBranch,
    FiCircle,
    FiCheckCircle,
    FiAlertCircle,
    FiImage,
    FiSend,
    FiTrash2,
    FiEdit3,
    FiPlay,
    FiTerminal,
    FiStar,
    FiCopy,
    FiExternalLink,
    FiSearch,
    FiFileText,
    FiDownload,
    FiTrendingUp,
    FiGitMerge,
    FiUsers,
    FiEye,
    FiClock,
    FiHash,
    FiRefreshCw,
    FiChevronDown,
    FiChevronUp,
    FiBookmark,
    FiMapPin,
    FiLayout,
    FiGrid,
    FiFilePlus,
    FiDelete,
    FiRotateCcw,
    FiEdit2,
    FiFolderPlus
} from 'react-icons/fi';
import { collaborationService } from './services/collaborationService';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { SiC, SiCplusplus } from 'react-icons/si';
import {
    useUIStore,
    useFileStore,
    useGitHubStore,
    useExecutionStore,
    useSocialStore,
    useLearningStore,
    useNotesStore,
    useTerminalStore,
    useSettingsStore,
    useSnippetStore
} from './store';
import { authService } from './services/authService';
import { socialService, githubService, aiService } from './services/api';
import { notesService } from './services/notesService';
import { executorService } from './services/executorService';
import { terminalService } from './services/terminalService';

// Lazy load heavy components
const WebPreview = lazy(() => import('./components/WebPreview'));
const SnippetPanel = lazy(() => import('./components/SnippetPanel'));
const AppsPanel = lazy(() => import('./components/AppsPanel'));
const NotesApp = lazy(() => import('./components/apps/NotesApp'));
const CalculatorApp = lazy(() => import('./components/apps/CalculatorApp'));
const QuickPythonApp = lazy(() => import('./components/apps/QuickPythonApp'));
const SyncManager = lazy(() => import('./components/SyncManager'));
const RemoteControlOverlay = lazy(() => import('./components/RemoteControlOverlay'));
const ScribbleOverlay = lazy(() => import('./components/ScribbleOverlay'));
const FileSyncEnvironment = lazy(() => import('./components/FileSyncEnvironment'));

// Memoized File Item Component
const FileItem = React.memo(({ file, activeFileId, renamingId, openFile, handleContextMenu, handleRename, deleteFile, setRenamingId }) => {
    // Memoize the icon to prevent recreation on every render
    const fileIcon = useMemo(() => getFileIcon(file.language), [file.language]);

    return (
        <div
            className={`file-item ${activeFileId === file.id ? 'file-item--active' : ''}`}
            onClick={() => openFile(file.id)}
            onContextMenu={(e) => handleContextMenu(e, file.id)}
        >
            <span className="file-item__icon">{fileIcon}</span>

            {renamingId === file.id ? (
                <input
                    type="text"
                    defaultValue={file.name}
                    className="input"
                    style={{
                        padding: '2px 4px',
                        height: '20px',
                        fontSize: '13px',
                        minWidth: 0,
                        flex: 1
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => handleRename(file.id, e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(file.id, e.target.currentTarget.value);
                        if (e.key === 'Escape') setRenamingId(null);
                    }}
                />
            ) : (
                <span className="file-item__name" style={{ flex: 1 }}>{file.name}</span>
            )}



            <button
                className="btn btn--ghost btn--icon"
                style={{ padding: '4px', opacity: 0.6, width: '24px', height: '24px' }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete file "${file.name}"?`)) {
                        deleteFileFromBackend(file.path);
                        deleteFile(file.id);
                    }
                }}
                title="Delete File"
            >
                <FiX size={12} />
            </button>
        </div>
    );
});

// Memoized Editor Tab Component
const EditorTab = React.memo(({ file, activeFileId, showOutput, setActiveFile, setShowOutput, closeFile, handleContextMenu }) => {
    return (
        <button
            className={`editor-tab ${activeFileId === file.id && !showOutput ? 'editor-tab--active' : ''}`}
            onClick={() => { setActiveFile(file.id); setShowOutput(false); }}
            onContextMenu={(e) => handleContextMenu(e, file.id)}
        >
            <span>{file.name}</span>
            <span
                className="editor-tab__close"
                onClick={(e) => {
                    e.stopPropagation();
                    closeFile(file.id);
                }}
            >
                <FiX size={12} />
            </span>
        </button>
    );
});

// Memoized helper function to get file icon
const getFileIcon = (language) => {
    const iconStyle = { width: '16px', height: '16px', objectFit: 'contain', display: 'block' };
    const largerStyle = { width: '20px', height: '20px', objectFit: 'contain', display: 'block' };

    const icons = {
        python: <img src="/icons/python.png" alt="python" style={iconStyle} />,
        javascript: <img src="/icons/javascript.png" alt="javascript" style={iconStyle} />,
        java: <img src="/icons/java.png" alt="java" style={iconStyle} />,
        html: <img src="/icons/html.png" alt="html" style={iconStyle} />,
        css: <img src="/icons/css.png" alt="css" style={iconStyle} />,
        json: '📋',
        c: <img src="/icons/cpp.png" alt="c" style={iconStyle} />,
        cpp: <img src="/icons/cpp.png" alt="cpp" style={iconStyle} />,
        go: <img src="/icons/go.png" alt="go" style={largerStyle} />,
        default: '📄'
    };
    return icons[language] || icons.default;
};

// Helper function to map app theme to Monaco editor theme
const getMonacoTheme = (theme) => {
    switch (theme) {
        case 'dark':
            return 'vs-dark';
        case 'light':
            return 'light';
        default:
            return 'vs-dark'; // Default to dark theme
    }
};

// File Explorer Component
function FileExplorer() {
    const { files, activeFileId, openFile, deleteFile, renameFile, addFile, openFiles, closeFile, closeFiles, deleteFiles } = useFileStore();
    // ... lines 177-304 ...
    const { openModal, addNotification } = useUIStore();
    const [renamingId, setRenamingId] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [isFileSyncEnabled, setIsFileSyncEnabled] = useState(false);
    const fileInputRef = React.useRef(null);
    const folderInputRef = React.useRef(null);
    const syncInitializedRef = React.useRef(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemType, setNewItemType] = useState('file'); // 'file' or 'folder'
    const [showNewItemInput, setShowNewItemInput] = useState(false);

    // Memoize filtered and deduplicated files to prevent expensive filtering on every render
    const uniqueFiles = useMemo(() => {
        const seenNames = new Set();
        return files.filter((file) => {
            if (!seenNames.has(file.name)) {
                seenNames.add(file.name);
                return true;
            }
            return false;
        });
    }, [files]);

    // File Sync Integration - seamlessly sync with backend
    useEffect(() => {
        // Clean up any duplicate files in the store
        const currentFiles = files;
        const seenNames = new Set();
        const uniqueFiles = [];
        for (const file of currentFiles) {
            if (!seenNames.has(file.name)) {
                seenNames.add(file.name);
                uniqueFiles.push(file);
            }
        }
        if (uniqueFiles.length !== currentFiles.length) {
            // Remove duplicates by updating the store
            setFiles(uniqueFiles);
        }

        if (syncInitializedRef.current) return; // Prevent multiple initializations
        syncInitializedRef.current = true;

        const initFileSync = async () => {
            try {
                // Clean up any duplicate files in the store before syncing
                const currentFiles = files;
                const seenNames = new Set();
                const uniqueFiles = [];
                for (const file of currentFiles) {
                    if (!seenNames.has(file.name)) {
                        seenNames.add(file.name);
                        uniqueFiles.push(file);
                    }
                }
                if (uniqueFiles.length !== currentFiles.length) {
                    // Remove duplicates by updating the store
                    setFiles(uniqueFiles);
                }

                // Import file sync service dynamically
                const { fileSyncService } = await import('./services/fileSyncService');
                const { fileSyncApi } = await import('./services/api');

                // Initialize connection
                await fileSyncService.initializeRealTime();

                // Check if backend has files and sync them
                const result = await fileSyncApi.getTree();
                if (result.data?.success && result.data?.tree?.length > 0) {
                    for (const backendFile of result.data.tree) {
                        if (!backendFile.isDirectory) {
                            // Check if file already exists in store
                            const existingFile = files.find(f => f.name === backendFile.name);
                            if (!existingFile) {
                                // Read content and add to store
                                try {
                                    const contentResult = await fileSyncApi.readFile(backendFile.path);
                                    if (contentResult.data?.success) {
                                        const language = getLanguageFromExtension(backendFile.name);
                                        addFile(backendFile.name, contentResult.data.content || '', language);
                                    }
                                } catch (error) {
                                    console.log('Could not sync file:', backendFile.name);
                                }
                            }
                        }
                    }
                }

                setIsFileSyncEnabled(true);
                addNotification({ type: 'success', message: '🔄 File sync enabled' });
            } catch (error) {
                console.log('File sync not available:', error.message);
                // Fail silently - file sync is optional
            }
        };

        initFileSync();
    }, []);

    // Close context menu on global click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Get language from file extension
    const getLanguageFromExtension = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        const langMap = {
            'py': 'python',
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'h': 'c',
            'hpp': 'cpp',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'xml': 'xml',
            'md': 'markdown',
            'txt': 'plaintext',
            'sql': 'sql',
            'sh': 'shell',
            'go': 'go',
            'rs': 'rust',
            'rb': 'ruby',
            'php': 'php'
        };
        return langMap[ext] || 'plaintext';
    };

    // Handle file upload
    const handleFileUpload = async (event) => {
        const uploadedFiles = event.target.files;
        if (!uploadedFiles || uploadedFiles.length === 0) return;

        let uploadedCount = 0;
        for (const file of uploadedFiles) {
            try {
                const content = await readFileContent(file);
                const language = getLanguageFromExtension(file.name);
                addFile(file.name, content, language);
                uploadedCount++;
            } catch (error) {
                console.error(`Failed to read file ${file.name}:`, error);
                addNotification({ type: 'error', message: `Failed to upload ${file.name}` });
            }
        }

        if (uploadedCount > 0) {
            addNotification({ type: 'success', message: `Uploaded ${uploadedCount} file(s)` });
        }
        // Reset input
        event.target.value = '';
    };

    // Handle folder upload
    const handleFolderUpload = async (event) => {
        const uploadedFiles = event.target.files;
        if (!uploadedFiles || uploadedFiles.length === 0) return;

        let uploadedCount = 0;
        for (const file of uploadedFiles) {
            try {
                const content = await readFileContent(file);
                const language = getLanguageFromExtension(file.name);
                // Use webkitRelativePath to preserve folder structure
                const name = file.webkitRelativePath || file.name;
                addFile(name, content, language);
                uploadedCount++;
            } catch (error) {
                console.error(`Failed to read file ${file.name}:`, error);
            }
        }

        if (uploadedCount > 0) {
            addNotification({ type: 'success', message: `Uploaded ${uploadedCount} file(s) from folder` });
        }
        // Reset input
        event.target.value = '';
    };

    // Read file content as text
    const readFileContent = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    };

    const handleRename = useCallback((fileId, newName) => {
        if (newName && newName.trim() !== '') {
            renameFile(fileId, newName);
        }
        setRenamingId(null);
    }, [renameFile]);

    const handleContextMenu = useCallback((e, fileId) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            fileId
        });
    }, []);

    const handleCloseOthers = useCallback((fileId) => {
        const filesToClose = openFiles.filter(id => id !== fileId);
        if (filesToClose.length > 0) {
            closeFiles(filesToClose);
        }
        setContextMenu(null);
    }, [openFiles, closeFiles]);

    const handleCloseBelow = useCallback((fileId) => {
        const index = files.findIndex(f => f.id === fileId);
        if (index !== -1 && index < files.length - 1) {
            const filesBelow = files.slice(index + 1);
            const idsToClose = filesBelow
                .map(f => f.id)
                .filter(id => openFiles.includes(id));

            if (idsToClose.length > 0) {
                closeFiles(idsToClose);
            }
        }
        setContextMenu(null);
    }, [files, openFiles, closeFiles]);

    const handleDeleteBelow = useCallback((fileId) => {
        const index = files.findIndex(f => f.id === fileId);
        if (index !== -1 && index < files.length - 1) {
            const filesBelow = files.slice(index + 1);
            const idsToDelete = filesBelow.map(f => f.id);

            if (idsToDelete.length > 0) {
                if (window.confirm(`Are you sure you want to delete ${idsToDelete.length} files below?`)) {
                    deleteFiles(idsToDelete);
                }
            }
        }
        setContextMenu(null);
    }, [files, deleteFiles]);

    // Backend file operations
    const createFileInBackend = useCallback(async (fileName) => {
        try {
            const { fileSyncService } = await import('./services/fileSyncService');
            const result = await fileSyncService.createItem(fileName, 'file', '');
            if (result.success) {
                // Add to frontend store
                const language = getLanguageFromExtension(fileName);
                addFile(fileName, '', language);
                addNotification({ type: 'success', message: `File created: ${fileName}` });
                return true;
            } else {
                addNotification({ type: 'error', message: `Failed to create file ${fileName}: ${result.error}` });
                return false;
            }
        } catch (error) {
            addNotification({ type: 'error', message: `Failed to create file ${fileName}: ${error.message}` });
            return false;
        }
    }, [addFile, addNotification]);

    const createFolderInBackend = useCallback(async (folderName) => {
        try {
            const { fileSyncService } = await import('./services/fileSyncService');
            const result = await fileSyncService.createItem(folderName, 'directory');
            if (result.success) {
                addNotification({ type: 'success', message: `Folder created: ${folderName}` });
                // Refresh the file tree to show the new folder
                await refreshFileTree();
                return true;
            } else {
                addNotification({ type: 'error', message: `Failed to create folder ${folderName}: ${result.error}` });
                return false;
            }
        } catch (error) {
            addNotification({ type: 'error', message: `Failed to create folder ${folderName}: ${error.message}` });
            return false;
        }
    }, [addNotification]);

    const deleteFileFromBackend = useCallback(async (fileName) => {
        try {
            const { fileSyncService } = await import('./services/fileSyncService');
            const result = await fileSyncService.deleteItem(fileName);
            if (result.success) {
                // Remove from frontend store
                const fileToDelete = files.find(f => f.name === fileName);
                if (fileToDelete) {
                    deleteFile(fileToDelete.id);
                }
                addNotification({ type: 'success', message: `File deleted: ${fileName}` });
                return true;
            } else {
                addNotification({ type: 'error', message: `Failed to delete file ${fileName}: ${result.error}` });
                return false;
            }
        } catch (error) {
            addNotification({ type: 'error', message: `Failed to delete file ${fileName}: ${error.message}` });
            return false;
        }
    }, [files, deleteFile, addNotification]);

    const refreshFileTree = useCallback(async () => {
        try {
            const { fileSyncService } = await import('./services/fileSyncService');
            const result = await fileSyncService.getFileTree();
            if (result.success && result.data?.tree) {
                // Update frontend store with backend files
                const backendFiles = result.data.tree.filter(item => !item.isDirectory);
                const currentFileNames = new Set(files.map(f => f.name));

                // Add new files from backend
                for (const backendFile of backendFiles) {
                    if (!currentFileNames.has(backendFile.name)) {
                        try {
                            const contentResult = await fileSyncService.readFile(backendFile.path);
                            if (contentResult.success) {
                                const language = getLanguageFromExtension(backendFile.name);
                                addFile(backendFile.name, contentResult.data.content || '', language);
                            }
                        } catch (error) {
                            console.log('Could not read file:', backendFile.name);
                        }
                    }
                }

                addNotification({ type: 'success', message: 'File tree refreshed' });
            } else {
                addNotification({ type: 'error', message: 'Failed to refresh file tree' });
            }
        } catch (error) {
            addNotification({ type: 'error', message: `Failed to refresh file tree: ${error.message}` });
        }
    }, [files, addFile, addNotification]);

    return (
        <div className="file-explorer" style={{ position: 'relative' }}>
            {/* Hidden file inputs */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                multiple
                onChange={handleFileUpload}
                accept="*/*"
            />
            <input
                type="file"
                ref={folderInputRef}
                style={{ display: 'none' }}
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderUpload}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Files
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => fileInputRef.current?.click()}
                        title="Open File"
                        style={{ padding: '4px' }}
                    >
                        <FiFilePlus size={14} />
                    </button>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => folderInputRef.current?.click()}
                        title="Open Folder"
                        style={{ padding: '4px' }}
                    >
                        <FiFolder size={14} />
                    </button>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => {
                            setNewItemType('file');
                            setShowNewItemInput(true);
                        }}
                        title="New File"
                        style={{ padding: '4px' }}
                    >
                        <FiFile size={14} />
                    </button>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => {
                            setNewItemType('folder');
                            setShowNewItemInput(true);
                        }}
                        title="New Folder"
                        style={{ padding: '4px' }}
                    >
                        <FiFolderPlus size={14} />
                    </button>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={refreshFileTree}
                        title="Refresh"
                        style={{ padding: '4px' }}
                    >
                        <FiRefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* New Item Input */}
            {showNewItemInput && (
                <div style={{ marginBottom: '8px', display: 'flex', gap: '4px' }}>
                    <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && newItemName.trim()) {
                                if (newItemType === 'file') {
                                    createFileInBackend(newItemName.trim());
                                } else {
                                    createFolderInBackend(newItemName.trim());
                                }
                                setNewItemName('');
                                setShowNewItemInput(false);
                            } else if (e.key === 'Escape') {
                                setNewItemName('');
                                setShowNewItemInput(false);
                            }
                        }}
                        placeholder={`New ${newItemType} name...`}
                        style={{
                            flex: 1,
                            padding: '4px 8px',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '3px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '12px'
                        }}
                        autoFocus
                    />
                    <button
                        className="btn btn--primary btn--sm"
                        onClick={() => {
                            if (newItemName.trim()) {
                                if (newItemType === 'file') {
                                    createFileInBackend(newItemName.trim());
                                } else {
                                    createFolderInBackend(newItemName.trim());
                                }
                                setNewItemName('');
                                setShowNewItemInput(false);
                            }
                        }}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                        Create
                    </button>
                    <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                            setNewItemName('');
                            setShowNewItemInput(false);
                        }}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {uniqueFiles.map((file) => (
                <FileItem
                    key={file.id}
                    file={file}
                    activeFileId={activeFileId}
                    renamingId={renamingId}
                    openFile={openFile}
                    handleContextMenu={handleContextMenu}
                    handleRename={handleRename}
                    deleteFile={deleteFile}
                    setRenamingId={setRenamingId}
                />
            ))}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        zIndex: 1000,
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '4px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                        padding: '4px 0',
                        minWidth: '150px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {openFiles.includes(contextMenu.fileId) && (
                        <>
                            <button
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '100%',
                                    padding: '6px 12px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    textAlign: 'left'
                                }}
                                className="context-menu-item"
                                onClick={() => {
                                    closeFile(contextMenu.fileId);
                                    setContextMenu(null);
                                }}
                            >
                                <FiX size={14} style={{ marginRight: '8px' }} />
                                Close
                            </button>
                        </>
                    )}
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            padding: '6px 12px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            textAlign: 'left'
                        }}
                        className="context-menu-item"
                        onClick={() => handleCloseOthers(contextMenu.fileId)}
                    >
                        <span style={{ marginRight: '8px' }}>🔄</span>
                        Close Others
                    </button>
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            padding: '6px 12px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            textAlign: 'left'
                        }}
                        className="context-menu-item"
                        onClick={() => handleDeleteBelow(contextMenu.fileId)}
                    >
                        <FiTrash2 size={14} style={{ marginRight: '8px' }} />
                        Delete Below
                    </button>
                    <div style={{ height: '1px', background: 'var(--border-primary)', margin: '4px 0' }}></div>

                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            padding: '6px 12px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            textAlign: 'left'
                        }}
                        className="context-menu-item"
                        onClick={() => {
                            setRenamingId(contextMenu.fileId);
                            setContextMenu(null);
                        }}
                    >
                        <FiEdit3 size={14} style={{ marginRight: '8px' }} />
                        Rename
                    </button>

                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            padding: '6px 12px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            textAlign: 'left'
                        }}
                        className="context-menu-item"
                        onClick={() => {
                            const file = files.find(f => f.id === contextMenu.fileId);
                            if (file && window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
                                deleteFileFromBackend(file.name);
                            }
                            setContextMenu(null);
                        }}
                    >
                        <FiTrash2 size={14} style={{ marginRight: '8px' }} />
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

// Terminal Panel Component - Integrated PowerShell
function TerminalPanel() {
    const { lines, commandHistory, cwd, isRunning, addLine, addCommand, setCwd, setRunning, clearTerminal, getFromHistory } = useTerminalStore();
    const { addNotification } = useUIStore();
    const { addFile, files } = useFileStore(); // Add file store for sync
    const [input, setInput] = useState('');
    const terminalRef = React.useRef(null);
    const inputRef = React.useRef(null);

    // Initialize cwd on mount
    useEffect(() => {
        const initCwd = async () => {
            const currentCwd = await terminalService.getCwd();
            if (currentCwd) setCwd(currentCwd);
        };
        initCwd();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);

    // Check if command might affect files
    const mightAffectFiles = (command) => {
        const fileCommands = ['echo', 'copy', 'xcopy', 'move', 'del', 'mkdir', 'rmdir', 'type', 'fc', 'find', 'dir', 'ls', 'touch', 'rm', 'cp', 'mv'];
        const cmdLower = command.toLowerCase().trim();
        return fileCommands.some(cmd => cmdLower.startsWith(cmd)) || cmdLower.includes('>') || cmdLower.includes('>>');
    };

    // Sync files after terminal operations
    const syncFilesAfterCommand = async (command) => {
        if (!mightAffectFiles(command)) return;

        try {
            // Import file sync service dynamically  
            const { fileSyncApi } = await import('./services/api');
            const result = await fileSyncApi.getTree();

            if (result.data?.success && result.data?.tree) {
                // Check for new files and sync them
                for (const backendFile of result.data.tree) {
                    if (!backendFile.isDirectory) {
                        const existingFile = files.find(f => f.name === backendFile.name);
                        if (!existingFile) {
                            try {
                                const contentResult = await fileSyncApi.readFile(backendFile.path);
                                if (contentResult.data?.success) {
                                    const getLanguageFromExtension = (filename) => {
                                        const ext = filename.split('.').pop().toLowerCase();
                                        const langMap = {
                                            'py': 'python', 'js': 'javascript', 'jsx': 'javascript',
                                            'ts': 'typescript', 'tsx': 'typescript', 'java': 'java',
                                            'cpp': 'cpp', 'c': 'c', 'html': 'html', 'css': 'css',
                                            'json': 'json', 'md': 'markdown', 'txt': 'plaintext'
                                        };
                                        return langMap[ext] || 'plaintext';
                                    };
                                    const language = getLanguageFromExtension(backendFile.name);
                                    addFile(backendFile.name, contentResult.data.content || '', language);
                                }
                            } catch (error) {
                                console.log('Sync error for:', backendFile.name);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            // Fail silently - sync is optional
            console.log('File sync not available');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const command = input.trim();
        if (!command) return;

        // Add command to history and display
        addCommand(command);
        addLine({ type: 'command', content: command, cwd });
        setInput('');
        setRunning(true);

        // Clear terminal if requested
        if (command.toLowerCase() === 'clear' || command.toLowerCase() === 'cls') {
            clearTerminal();
            setRunning(false);
            return;
        }

        // Handle copy command locally
        if (command.toLowerCase() === 'copy') {
            copyTerminal();
            setRunning(false);
            return;
        }



        try {
            const result = await terminalService.execute(command);

            if (result.output) {
                addLine({ type: 'output', content: result.output });
            }
            if (result.error) {
                addLine({ type: 'error', content: result.error });
            }
            if (result.cwd) {
                setCwd(result.cwd);
            }

            // Sync files after command execution
            await syncFilesAfterCommand(command);

        } catch (error) {
            addLine({ type: 'error', content: `Error: ${error.message}` });
        }

        setRunning(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const cmd = getFromHistory('up');
            setInput(cmd);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const cmd = getFromHistory('down');
            setInput(cmd);
        }
    };

    const getShortCwd = (fullCwd) => {
        if (!fullCwd) return 'PS>';
        const parts = fullCwd.split('\\');
        return parts.length > 2 ? `...\\${parts.slice(-2).join('\\')}` : fullCwd;
    };

    const copyTerminal = () => {
        const text = lines.map(line => {
            if (line.type === 'command') return `PS ${line.cwd}> ${line.content}`;
            return line.content;
        }).join('\n');
        navigator.clipboard.writeText(text);
        addNotification('Terminal output copied to clipboard', 'success');
    };

    const handleTerminalClick = () => {
        // Only focus if no text is selected
        if (!window.getSelection().toString()) {
            inputRef.current?.focus();
        }
    };

    return (
        <div className="terminal-panel">
            <div className="terminal-header">
                <FiTerminal size={14} />
                <span>PowerShell</span>
                <button
                    className="btn btn--ghost btn--icon"
                    onClick={copyTerminal}
                    title="Copy All Output"
                >
                    <FiCopy size={14} />
                </button>
                <button
                    className="btn btn--ghost btn--icon"
                    onClick={clearTerminal}
                    title="Clear Terminal"
                    style={{ marginLeft: 'auto' }}
                >
                    <FiTrash2 size={14} />
                </button>
            </div>
            <div className="terminal-output" ref={terminalRef} onClick={handleTerminalClick}>
                {lines.map((line, index) => (
                    <div key={index} className={`terminal-line terminal-line--${line.type}`}>
                        {line.type === 'command' && (
                            <span className="terminal-prompt">PS {getShortCwd(line.cwd)}{'>'} </span>
                        )}
                        <span className="terminal-content">{line.content}</span>
                    </div>
                ))}
                {isRunning && (
                    <div className="terminal-line terminal-line--system">
                        <span className="spinner" style={{ width: '12px', height: '12px' }} /> Running...
                    </div>
                )}
            </div>
            <form className="terminal-input-form" onSubmit={handleSubmit}>
                <span className="terminal-prompt">PS {getShortCwd(cwd)}{'>'}</span>
                <input
                    ref={inputRef}
                    type="text"
                    className="terminal-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type command..."
                    disabled={isRunning}
                    autoFocus
                />
            </form>
        </div>
    );
}



// Editor Tabs Component
function EditorTabs({ isScribbleMode, toggleScribbleMode, scribbleTool, setScribbleTool, scribbleColor, setScribbleColor, onUndo, onClear }) {
    const { files, openFiles, activeFileId, setActiveFile, closeFile, closeFiles } = useFileStore();
    const { showOutput, setShowOutput } = useExecutionStore();
    const { experimental } = useSettingsStore();
    const [contextMenu, setContextMenu] = useState(null);

    const openFilesData = (Array.isArray(files) && Array.isArray(openFiles))
        ? openFiles.map((id) => files.find((f) => f.id === id)).filter(Boolean)
        : [];

    // Close context menu on global click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleContextMenu = useCallback((e, fileId) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            fileId
        });
    }, []);

    const handleCloseRight = (fileId) => {
        const index = openFiles.indexOf(fileId);
        if (index !== -1 && index < openFiles.length - 1) {
            const filesToClose = openFiles.slice(index + 1);
            if (filesToClose.length > 0) {
                closeFiles(filesToClose);
            }
        }
        setContextMenu(null);
    };

    const handleCloseOthers = (fileId) => {
        const filesToClose = openFiles.filter(id => id !== fileId);
        if (filesToClose.length > 0) {
            closeFiles(filesToClose);
        }
        setContextMenu(null);
    };

    return (
        <div className="editor-tabs">
            {openFilesData.map((file) => (
                <EditorTab
                    key={file.id}
                    file={file}
                    activeFileId={activeFileId}
                    showOutput={showOutput}
                    setActiveFile={setActiveFile}
                    setShowOutput={setShowOutput}
                    closeFile={closeFile}
                    handleContextMenu={handleContextMenu}
                />
            ))}
            <button
                className={`editor-tab ${showOutput ? 'editor-tab--active' : ''}`}
                onClick={() => setShowOutput(true)}
                style={{ borderLeft: '1px solid var(--border-primary)' }}
            >
                <FiTerminal size={14} />
                <span>Output</span>
            </button>

            {/* Scribble Toggle in Tabs - Circular Icon Only - EXPERIMENTAL GATED */}
            {experimental?.scribble && (
                <button
                    className={`btn btn--icon ${isScribbleMode ? 'btn--active' : ''}`}
                    onClick={toggleScribbleMode}
                    style={{
                        border: '1px solid var(--border-primary)',
                        borderRadius: '50%',
                        marginLeft: 'auto',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                    }}
                    title="Toggle Scribble Mode"
                >
                    <FiEdit3 size={14} />
                </button>
            )}

            {/* Scribble Tools - Visible when Scribble Mode is Active - EXPERIMENTAL GATED */}
            {experimental?.scribble && isScribbleMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--border-secondary)' }}>
                    <button
                        className={`btn btn--icon`}
                        onClick={onUndo}
                        title="Undo"
                        style={{ width: '24px', height: '24px', padding: 0 }}
                    >
                        <FiRotateCcw size={12} />
                    </button>

                    <button
                        className={`btn btn--icon ${scribbleTool === 'pen' ? 'btn--active' : ''}`}
                        onClick={() => setScribbleTool('pen')}
                        title="Pen"
                        style={{ width: '24px', height: '24px', padding: 0, color: scribbleTool === 'pen' ? (scribbleColor || 'var(--accent-primary)') : 'inherit' }}
                    >
                        <FiEdit2 size={12} />
                    </button>

                    <input
                        type="color"
                        value={scribbleColor}
                        onChange={(e) => { setScribbleColor(e.target.value); setScribbleTool('pen'); }}
                        style={{ width: '20px', height: '20px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                        title="Color Picker"
                    />

                    <button
                        className={`btn btn--icon ${scribbleTool === 'eraser' ? 'btn--active' : ''}`}
                        onClick={() => setScribbleTool('eraser')}
                        title="Eraser"
                        style={{ width: '24px', height: '24px', padding: 0 }}
                    >
                        <FiDelete size={12} />
                    </button>

                    <button
                        className={`btn btn--icon`}
                        onClick={onClear}
                        title="Clear All"
                        style={{ width: '24px', height: '24px', padding: 0, color: 'var(--warning)' }}
                    >
                        <FiTrash2 size={12} />
                    </button>
                </div>
            )}

            {/* Context Menu */}
            {
                contextMenu && (
                    <div
                        style={{
                            position: 'fixed',
                            top: contextMenu.y,
                            left: contextMenu.x,
                            zIndex: 1000,
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '4px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                            padding: '4px 0',
                            minWidth: '150px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="context-menu-item"
                            onClick={() => handleCloseRight(contextMenu.fileId)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                padding: '6px 12px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                textAlign: 'left'
                            }}
                        >
                            <span style={{ marginRight: '8px' }}>➡️</span>
                            Close to the Right
                        </button>
                        <button
                            className="context-menu-item"
                            onClick={() => handleCloseOthers(contextMenu.fileId)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                padding: '6px 12px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                textAlign: 'left'
                            }}
                        >
                            <span style={{ marginRight: '8px' }}>🔄</span>
                            Close Others
                        </button>
                        <div style={{ height: '1px', background: 'var(--border-primary)', margin: '4px 0' }}></div>
                        <button
                            className="context-menu-item"
                            onClick={() => {
                                closeFile(contextMenu.fileId);
                                setContextMenu(null);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                padding: '6px 12px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                textAlign: 'left'
                            }}
                        >
                            <FiX size={14} style={{ marginRight: '8px' }} />
                            Close Tab
                        </button>
                    </div>
                )
            }
        </div >
    );
}

// Code Execution Output Panel
function OutputPanel() {
    const { output, error, executionTime, isExecuting, clearOutput, history, setShowOutput, input, setInput } = useExecutionStore();
    const [showHistory, setShowHistory] = useState(false);

    return (
        <div className="output-panel">
            <div className="output-panel__header">
                <span className="output-panel__title">
                    <FiTerminal /> Output
                    {executionTime && (
                        <span className="output-panel__time">
                            <FiClock size={12} /> {executionTime}ms
                        </span>
                    )}
                </span>
                <div className="output-panel__actions">
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => setShowHistory(!showHistory)}
                        title="History"
                    >
                        <FiClock />
                    </button>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={clearOutput}
                        title="Clear"
                    >
                        <FiTrash2 />
                    </button>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => setShowOutput(false)}
                        title="Close Output"
                    >
                        <FiX />
                    </button>
                </div>
            </div>

            {showHistory ? (
                <div className="output-panel__history">
                    <h4 style={{ marginBottom: '12px', fontSize: '13px' }}>Execution History</h4>
                    {history.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No execution history yet</p>
                    ) : (
                        history.map((entry) => (
                            <div key={entry.id} className="history-item">
                                <div className="history-item__header">
                                    <span className={`history-item__status ${entry.success ? 'success' : 'error'}`}>
                                        {entry.success ? <FiCheckCircle /> : <FiAlertCircle />}
                                    </span>
                                    <span className="history-item__lang">{entry.language}</span>
                                    <span className="history-item__time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="output-panel__content">
                    {isExecuting ? (
                        <div className="output-panel__loading">
                            <span className="spinner" /> Running code...
                        </div>
                    ) : error ? (
                        <pre className="output-panel__error">{error}</pre>
                    ) : output ? (
                        <pre className="output-panel__result">{output}</pre>
                    ) : (
                        <div className="output-panel__empty">
                            <FiTerminal size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                            <p>Click "Run" to execute your code</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


// Monaco Editor Component
function CodeEditor({ isScribbleMode, scribbleTool = 'pen', scribbleColor = '#ff0000' }) {
    const { files, activeFileId, updateFileContent, addHighlight, removeHighlight, updateHighlight, addDrawing, removeLastDrawing, clearDrawings, markFileSaved } = useFileStore();
    const { showOutput } = useExecutionStore();
    const activeFile = files.find((f) => f.id === activeFileId);
    const { theme, format, features, experimental, backgroundImage, backgroundOpacity } = useSettingsStore();
    const { addNotification } = useUIStore();

    // Backend save function
    // Backend delete function
    // Backend directory operations
    const createDirectoryInBackend = React.useCallback(async (dirPath) => {
        try {
            const { fileSyncService } = await import('./services/fileSyncService');
            const result = await fileSyncService.createItem(dirPath, 'directory');
            if (result.success) {
                addNotification({ type: 'success', message: `Directory created: ${dirPath}` });
                return true;
            } else {
                addNotification({ type: 'error', message: `Failed to create directory ${dirPath}: ${result.error}` });
                return false;
            }
        } catch (error) {
            addNotification({ type: 'error', message: `Failed to create directory ${dirPath}: ${error.message}` });
            return false;
        }
    }, [addNotification]);

    const deleteDirectoryFromBackend = React.useCallback(async (dirPath) => {
        try {
            const { fileSyncService } = await import('./services/fileSyncService');
            const result = await fileSyncService.deleteItem(dirPath);
            if (result.success) {
                addNotification({ type: 'success', message: `Directory deleted: ${dirPath}` });
                return true;
            } else {
                addNotification({ type: 'error', message: `Failed to delete directory ${dirPath}: ${result.error}` });
                return false;
            }
        } catch (error) {
            addNotification({ type: 'error', message: `Failed to delete directory ${dirPath}: ${error.message}` });
            return false;
        }
    }, [addNotification]);

    const deleteFileFromBackend = React.useCallback(async (filePath) => {
        try {
            const { fileSyncService } = await import('./services/fileSyncService');
            const result = await fileSyncService.deleteItem(filePath);
            if (result.success) {
                addNotification({ type: 'success', message: `File deleted from workspace: ${filePath}` });
                return true;
            } else {
                addNotification({ type: 'error', message: `Failed to delete ${filePath}: ${result.error}` });
                return false;
            }
        } catch (error) {
            addNotification({ type: 'error', message: `Failed to delete ${filePath}: ${error.message}` });
            return false;
        }
    }, [addNotification]);

    const saveFileToBackend = React.useCallback(async (file) => {
        try {
            const { fileSyncService } = await import('./services/fileSyncService');
            const result = await fileSyncService.writeFile(
                file.path.startsWith('/') ? file.path : `/${file.path}`,
                file.content,
                { encoding: 'utf-8' }
            );
            if (result.success) {
                markFileSaved(file.id);
                addNotification({ type: 'success', message: `File saved to workspace: ${file.name}` });
                return true;
            } else {
                addNotification({ type: 'error', message: `Failed to save ${file.name}: ${result.error}` });
                return false;
            }
        } catch (error) {
            addNotification({ type: 'error', message: `Failed to save ${file.name}: ${error.message}` });
            return false;
        }
    }, [addNotification, markFileSaved]);

    // Auto-save function without notifications for seamless saving
    const autoSaveFileToBackend = React.useCallback(async (file) => {
        try {
            const { fileSyncService } = await import('./services/fileSyncService');
            const result = await fileSyncService.writeFile(
                file.path.startsWith('/') ? file.path : `/${file.path}`,
                file.content,
                { encoding: 'utf-8' }
            );
            if (result.success) {
                markFileSaved(file.id);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }, [markFileSaved]);

    // Global keyboard shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+S or Cmd+S - Save current file
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (activeFile) {
                    saveFileToBackend(activeFile);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeFile, saveFileToBackend]);

    // Cleanup auto-save timeout on unmount or file change
    React.useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [activeFileId]);

    const editorRef = React.useRef(null);
    const autoSaveTimeoutRef = React.useRef(null);
    const decorationsRef = React.useRef([]);
    const decorationIdToHighlightId = React.useRef({});

    // Use Refs for values needed in stable Monaco callbacks
    const activeFileIdRef = React.useRef(activeFileId);
    const removeHighlightRef = React.useRef(removeHighlight);
    const scribblePenSizeRef = React.useRef(3);
    const scribbleEraserSizeRef = React.useRef(15);

    const { scribblePenSize, scribbleEraserSize } = useSettingsStore();

    useEffect(() => { activeFileIdRef.current = activeFileId; }, [activeFileId]);
    useEffect(() => { removeHighlightRef.current = removeHighlight; }, [removeHighlight]);
    useEffect(() => { scribblePenSizeRef.current = scribblePenSize; }, [scribblePenSize]);
    useEffect(() => { scribbleEraserSizeRef.current = scribbleEraserSize; }, [scribbleEraserSize]);
    useEffect(() => {
        if (editorRef.current && activeFile) {
            const highlights = activeFile.highlights || [];
            const newDecorations = highlights.map(h => ({
                range: h.range,
                options: {
                    isWholeLine: false,
                    className: `highlight-${h.color}`,
                    hoverMessage: { value: 'Right Click to Remove Highlight' },
                    stickiness: 1, // TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges (1)
                    zIndex: 10
                }
            }));

            // Apply decorations
            const oldDecorations = decorationsRef.current;
            const newIds = editorRef.current.deltaDecorations(oldDecorations, newDecorations);
            decorationsRef.current = newIds;

            // Map new decoration IDs to highlight IDs
            const newMap = {};
            newIds.forEach((decId, index) => {
                if (highlights[index]) {
                    newMap[decId] = highlights[index].id;
                }
            });
            decorationIdToHighlightId.current = newMap;
        }
    }, [activeFile, activeFile?.highlights]);

    // Sync Store with Editor Ranges (Stickiness)
    useEffect(() => {
        if (!editorRef.current || !activeFile) return;

        const sync = () => {
            const model = editorRef.current.getModel();
            const map = decorationIdToHighlightId.current;
            const ids = decorationsRef.current;

            ids.forEach(decId => {
                const range = model.getDecorationRange(decId);
                const highlightId = map[decId];
                if (range && highlightId) {
                    const original = activeFile.highlights.find(h => h.id === highlightId);
                    if (original && (original.range.startLineNumber !== range.startLineNumber ||
                        original.range.startColumn !== range.startColumn ||
                        original.range.endLineNumber !== range.endLineNumber ||
                        original.range.endColumn !== range.endColumn)) {
                        updateHighlight(activeFileId, { ...original, range });
                    }
                }
            });
        };

        const disposable = editorRef.current.onDidChangeModelContent(() => {
            // Deboune sync
            setTimeout(sync, 500);
        });

        return () => disposable.dispose();
    }, [activeFile, activeFileId, updateHighlight]);

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;

        // "Highlight..." Context Menu
        editor.addAction({
            id: 'open-highlight-modal',
            label: 'Highlight...',
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.5,
            run: (ed) => {
                const selection = ed.getSelection();
                if (selection && !selection.isEmpty()) {
                    window.dispatchEvent(new CustomEvent('open-highlight-modal', {
                        detail: { selection, fileId: activeFileIdRef.current }
                    }));
                }
            }
        });

        // "Remove Highlight" Context Menu
        editor.addAction({
            id: 'remove-highlight',
            label: 'Remove Highlight',
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.6,
            run: (ed) => {
                const position = ed.getPosition();
                const model = ed.getModel();
                // Get all decorations on the current line
                const decorations = model.getLineDecorations(position.lineNumber);

                // Find a highlight decoration that contains the current cursor column
                const highlightDec = decorations.find(d => {
                    const isHighlight = d.options.className && d.options.className.includes('highlight-');
                    if (!isHighlight) return false;

                    // Column intersection check
                    return position.column >= d.range.startColumn && position.column <= d.range.endColumn;
                });

                if (highlightDec) {
                    const highlightId = decorationIdToHighlightId.current[highlightDec.id];
                    if (highlightId) {
                        removeHighlightRef.current(activeFileIdRef.current, highlightId);
                        // Also proactively remove overlapping ones visually just in case
                        decorations.forEach(d => {
                            if (d.options.className && d.options.className.includes('highlight-') && d.id !== highlightDec.id) {
                                const hId = decorationIdToHighlightId.current[d.id];
                                if (hId) removeHighlightRef.current(activeFileIdRef.current, hId);
                            }
                        });
                    }
                }
            }
        });
    };





    // Add Collaboration Listeners
    useEffect(() => {
        collaborationService.onCodeChange = (data) => {
            // Only update if it matches the current file
            // In a real app, we'd check fileId, but for now we update active file
            if (activeFileId) {
                updateFileContent(activeFileId, data.content);
            }
        };
        return () => {
            collaborationService.onCodeChange = null;
        };
    }, [activeFileId, updateFileContent]);

    if (!activeFile) {
        // ... (existing welcome screen)
        return (
            <div className="welcome">
                <div className="welcome__icon">
                    <FiCode />
                </div>
                <h2 className="welcome__title">Welcome to Roolts</h2>
                <p className="welcome__subtitle">
                    Open a file from the sidebar or create a new one to start coding.
                    Push to GitHub, share on social media, and learn with AI-powered insights.
                </p>
                <div className="welcome__actions">
                    <button className="btn btn--primary">
                        <FiPlus /> New File
                    </button>
                    <button className="btn btn--secondary">
                        <FiFolder /> Open Project
                    </button>
                </div>
            </div>
        );
    }

    const languageMap = useMemo(() => ({
        python: 'python',
        javascript: 'javascript',
        java: 'java',
        html: 'html',
        css: 'css',
        json: 'json',
        plaintext: 'plaintext',
        c: 'c',
        cpp: 'cpp'
    }), []);



    // Memoize editor options for better performance
    const editorOptions = useMemo(() => ({
        fontFamily: format.fontFamily,
        fontSize: format.fontSize,
        lineHeight: format.lineHeight,
        padding: { top: 16, bottom: 16 },
        minimap: { enabled: features.minimap },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        renderWhitespace: 'selection',
        wordWrap: format.wordWrap,
        lineNumbers: features.lineNumbers,
        bracketPairColorization: { enabled: true }
    }), [format, features]);

    return (
        <div className="monaco-wrapper" style={{ position: 'relative' }}>
            <Editor
                height="100%"
                language={languageMap[activeFile.language] || 'plaintext'}
                value={activeFile.content}
                onChange={(value) => {
                    const newContent = value || '';
                    updateFileContent(activeFile.id, newContent);
                    collaborationService.sendCodeChange(newContent, activeFile.id);

                    // Auto-save to backend with debouncing (2 seconds)
                    if (autoSaveTimeoutRef.current) {
                        clearTimeout(autoSaveTimeoutRef.current);
                    }
                    autoSaveTimeoutRef.current = setTimeout(() => {
                        autoSaveFileToBackend({ ...activeFile, content: newContent });
                    }, 2000); // Auto-save after 2 seconds of inactivity
                }}
                theme={getMonacoTheme(theme)}
                options={editorOptions}
                onMount={handleEditorDidMount}
            />

            {experimental?.scribble && activeFile && (
                <ScribbleOverlay
                    key={activeFile.id}
                    fileId={activeFile.id}
                    drawings={activeFile.drawings || []}
                    onAddDrawing={addDrawing}
                    onUndo={() => removeLastDrawing(activeFile.id)}
                    onClear={() => clearDrawings(activeFile.id)}
                    isActive={isScribbleMode}
                    tool={scribbleTool}
                    color={scribbleColor}
                    penSize={scribblePenSize}
                    eraserSize={scribbleEraserSize}
                />
            )}

            {showOutput && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 200, // Higher than ScribbleOverlay (100)
                    backgroundColor: 'var(--bg-primary)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <OutputPanel />
                </div>
            )}
        </div>
    );
}

// Enhanced GitHub Panel Component
function GitHubPanel() {
    const { isConnected, user, repositories, selectedRepo, isLoading, setConnected, setRepositories, selectRepo, setLoading } = useGitHubStore();
    const { files } = useFileStore();
    const { addNotification, openModal } = useUIStore();
    const [commitMessage, setCommitMessage] = useState('');
    const [activeGitHubTab, setActiveGitHubTab] = useState('repos');
    const [newRepoName, setNewRepoName] = useState('');
    const [newRepoDesc, setNewRepoDesc] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [trendingRepos, setTrendingRepos] = useState([]);
    const [repoInsights, setRepoInsights] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [forkUrl, setForkUrl] = useState('');

    const handleConnect = async () => {
        try {
            const { auth_url } = await githubService.initiateAuth();
            const popup = window.open(auth_url, '_blank', 'width=600,height=700');

            // Listen for message from popup
            const handleMessage = async (event) => {
                if (event.data.type === 'github-auth-success') {
                    window.removeEventListener('message', handleMessage);

                    if (event.data.code) {
                        try {
                            const response = await githubService.completeAuth(event.data.code);
                            if (response.access_token) {
                                githubService.setToken(response.access_token);
                                setConnected(true, response.user);
                                const repos = await githubService.listRepositories();
                                setRepositories(repos);
                                addNotification({ type: 'success', message: `Connected to GitHub as ${response.user?.login}!` });
                            }
                        } catch (error) {
                            addNotification({ type: 'error', message: 'GitHub authentication failed' });
                        }
                    }
                }
            };

            window.addEventListener('message', handleMessage);

            // Fallback: poll for popup closure
            const checkPopup = setInterval(() => {
                if (popup && popup.closed) {
                    clearInterval(checkPopup);
                    window.removeEventListener('message', handleMessage);
                }
            }, 500);
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to initiate GitHub auth' });
        }
    };

    // Check for existing token on mount
    useEffect(() => {
        const loadExistingAuth = async () => {
            if (githubService.isAuthenticated() && !isConnected) {
                try {
                    const user = await githubService.getCurrentUser();
                    setConnected(true, user);
                    const repos = await githubService.listRepositories();
                    setRepositories(repos);
                } catch (error) {
                    githubService.clearToken();
                }
            }
        };
        loadExistingAuth();
    }, [isConnected]);


    const handleCreateRepo = async () => {
        if (!newRepoName.trim()) return;

        setLoading(true);
        try {
            const repo = await githubService.createRepository(newRepoName, {
                description: newRepoDesc,
                private: isPrivate
            });
            setRepositories([repo, ...repositories]);
            addNotification({ type: 'success', message: `Repository "${repo.name}" created!` });
            setNewRepoName('');
            setNewRepoDesc('');
            setShowCreateModal(false);
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to create repository' });
        }
        setLoading(false);
    };

    const handleFork = async () => {
        if (!forkUrl.trim()) return;

        const match = forkUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) {
            addNotification({ type: 'error', message: 'Invalid GitHub URL' });
            return;
        }

        setLoading(true);
        try {
            const [, owner, repo] = match;
            const forked = await githubService.forkRepository(owner, repo.replace('.git', ''));
            setRepositories([forked, ...repositories]);
            addNotification({ type: 'success', message: `Forked "${forked.full_name}"!` });
            setForkUrl('');
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to fork repository' });
        }
        setLoading(false);
    };

    const loadTrending = async () => {
        try {
            const repos = await githubService.getTrending('', 'daily');
            setTrendingRepos(repos || []);
        } catch (error) {
            console.error('Failed to load trending:', error);
        }
    };

    const loadRepoInsights = async (owner, repo) => {
        try {
            const insights = await githubService.getRepoSummary(owner, repo);
            setRepoInsights(insights);
        } catch (error) {
            console.error('Failed to load insights:', error);
        }
    };

    const handlePush = async () => {
        if (!selectedRepo || !commitMessage.trim()) {
            addNotification({ type: 'error', message: 'Select a repo and enter commit message' });
            return;
        }

        setLoading(true);
        try {
            const filesToPush = files.map(f => ({ path: f.name, content: f.content }));
            const [owner, repo] = selectedRepo.full_name.split('/');
            await githubService.pushFiles(owner, repo, filesToPush, commitMessage);
            addNotification({ type: 'success', message: 'Code pushed to GitHub!' });
            setCommitMessage('');
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to push to GitHub' });
        }
        setLoading(false);
    };

    const handleStarRepo = async (owner, repo) => {
        try {
            await githubService.starRepo(owner, repo);
            addNotification({ type: 'success', message: 'Repository starred!' });
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to star repository' });
        }
    };

    const copyCloneUrl = (url) => {
        navigator.clipboard.writeText(url);
        addNotification({ type: 'success', message: 'Clone URL copied!' });
    };

    useEffect(() => {
        if (activeGitHubTab === 'trending') {
            loadTrending();
        }
    }, [activeGitHubTab]);

    if (!isConnected) {
        return (
            <div className="panel-content">
                <div className="card">
                    <div className="card__body" style={{ textAlign: 'center', padding: '32px 16px' }}>
                        <FiGithub size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3 style={{ marginBottom: '8px' }}>Connect to GitHub</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Push your code, fork repos, and discover trending projects
                        </p>
                        <button className="social-btn social-btn--github" onClick={handleConnect}>
                            <FiGithub size={20} />
                            <span>Connect GitHub Account</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const gitHubTabs = [
        { id: 'repos', label: 'Repos', icon: <FiFolder /> },
        { id: 'create', label: 'Create', icon: <FiPlus /> },
        { id: 'trending', label: 'Trending', icon: <FiTrendingUp /> }
    ];

    return (
        <div className="panel-content">
            {/* User Info */}
            <div className="card" style={{ marginBottom: '12px' }}>
                <div className="card__body" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FiCheckCircle style={{ color: 'var(--success)' }} />
                    <span style={{ fontSize: '13px' }}>Signed in as <strong>{user?.login || 'user'}</strong></span>
                </div>
            </div>

            {/* GitHub Sub-tabs */}
            <div className="github-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', marginBottom: '12px' }}>
                {gitHubTabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`github-tab ${activeGitHubTab === tab.id ? 'github-tab--active' : ''}`}
                        onClick={() => setActiveGitHubTab(tab.id)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            background: activeGitHubTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                            border: 'none',
                            color: activeGitHubTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontSize: '12px'
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Repos Tab */}
            {activeGitHubTab === 'repos' && (
                <>
                    <div className="card" style={{ marginBottom: '12px' }}>
                        <div className="card__header">
                            <span className="card__title">Select Repository</span>
                        </div>
                        <div className="card__body">
                            <select
                                className="input"
                                value={selectedRepo?.id || ''}
                                onChange={(e) => {
                                    const repo = repositories.find(r => r.id === parseInt(e.target.value));
                                    selectRepo(repo);
                                    if (repo) {
                                        const [owner, repoName] = repo.full_name.split('/');
                                        loadRepoInsights(owner, repoName);
                                    }
                                }}
                            >
                                <option value="">Select repository...</option>
                                {repositories.map((repo) => (
                                    <option key={repo.id} value={repo.id}>{repo.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    {selectedRepo && (
                        <div className="card" style={{ marginBottom: '12px' }}>
                            <div className="card__header">
                                <span className="card__title">Quick Actions</span>
                            </div>
                            <div className="card__body">
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => handleStarRepo(...selectedRepo.full_name.split('/'))}
                                    >
                                        <FiStar /> Star
                                    </button>
                                    <button
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => copyCloneUrl(selectedRepo.clone_url)}
                                    >
                                        <FiCopy /> Copy URL
                                    </button>
                                    <button
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => window.open(selectedRepo.html_url, '_blank')}
                                    >
                                        <FiExternalLink /> Open
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Repo Insights */}
                    {repoInsights && selectedRepo && (
                        <div className="card" style={{ marginBottom: '12px' }}>
                            <div className="card__header">
                                <span className="card__title"><FiTrendingUp style={{ marginRight: '8px' }} />Insights</span>
                            </div>
                            <div className="card__body">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
                                    <div><FiStar /> {repoInsights.stats.stars} stars</div>
                                    <div><FiGitMerge /> {repoInsights.stats.forks} forks</div>
                                    <div><FiEye /> {repoInsights.stats.watchers} watchers</div>
                                    <div><FiAlertCircle /> {repoInsights.stats.issues} issues</div>
                                </div>
                                {repoInsights.languages && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Languages</div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {Object.keys(repoInsights.languages).slice(0, 4).map(lang => (
                                                <span key={lang} className="badge">{lang}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Commit & Push */}
                    <div className="card">
                        <div className="card__header">
                            <span className="card__title">
                                <FiGitBranch style={{ marginRight: '8px' }} />
                                Commit & Push
                            </span>
                        </div>
                        <div className="card__body">
                            <label className="label">Commit Message</label>
                            <textarea
                                className="input input--textarea"
                                placeholder="Describe your changes..."
                                value={commitMessage}
                                onChange={(e) => setCommitMessage(e.target.value)}
                                style={{ marginBottom: '12px' }}
                            />
                            <button
                                className="btn btn--primary"
                                style={{ width: '100%' }}
                                onClick={handlePush}
                                disabled={isLoading || !selectedRepo}
                            >
                                {isLoading ? <><span className="spinner" /> Pushing...</> : <><FiUploadCloud /> Push to GitHub</>}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Create Tab */}
            {activeGitHubTab === 'create' && (
                <>
                    <div className="card" style={{ marginBottom: '12px' }}>
                        <div className="card__header">
                            <span className="card__title"><FiPlus style={{ marginRight: '8px' }} />New Repository</span>
                        </div>
                        <div className="card__body">
                            <label className="label">Repository Name</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="my-awesome-project"
                                value={newRepoName}
                                onChange={(e) => setNewRepoName(e.target.value)}
                                style={{ marginBottom: '12px' }}
                            />
                            <label className="label">Description (optional)</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="A short description..."
                                value={newRepoDesc}
                                onChange={(e) => setNewRepoDesc(e.target.value)}
                                style={{ marginBottom: '12px' }}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                />
                                <span style={{ fontSize: '13px' }}>Private repository</span>
                            </label>
                            <button
                                className="btn btn--primary"
                                style={{ width: '100%' }}
                                onClick={handleCreateRepo}
                                disabled={isLoading || !newRepoName.trim()}
                            >
                                {isLoading ? <><span className="spinner" /> Creating...</> : <><FiPlus /> Create Repository</>}
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card__header">
                            <span className="card__title"><FiGitMerge style={{ marginRight: '8px' }} />Fork Repository</span>
                        </div>
                        <div className="card__body">
                            <label className="label">GitHub Repository URL</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="https://github.com/owner/repo"
                                value={forkUrl}
                                onChange={(e) => setForkUrl(e.target.value)}
                                style={{ marginBottom: '12px' }}
                            />
                            <button
                                className="btn btn--secondary"
                                style={{ width: '100%' }}
                                onClick={handleFork}
                                disabled={isLoading || !forkUrl.trim()}
                            >
                                {isLoading ? <><span className="spinner" /> Forking...</> : <><FiGitMerge /> Fork Repository</>}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Trending Tab */}
            {activeGitHubTab === 'trending' && (
                <div className="card">
                    <div className="card__header">
                        <span className="card__title"><FiTrendingUp style={{ marginRight: '8px' }} />Trending Today</span>
                        <button className="btn btn--ghost btn--icon" onClick={loadTrending}>
                            <FiRefreshCw size={14} />
                        </button>
                    </div>
                    <div className="card__body" style={{ maxHeight: '400px', overflow: 'auto' }}>
                        {trendingRepos.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                                Loading trending repos...
                            </p>
                        ) : (
                            trendingRepos.map((repo) => (
                                <div key={repo.id} className="trending-item" style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--border-primary)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div>
                                            <a
                                                href={repo.html_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'var(--info)', fontSize: '13px', fontWeight: '500' }}
                                            >
                                                {repo.full_name}
                                            </a>
                                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                {repo.description?.slice(0, 80) || 'No description'}...
                                            </p>
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                <span><FiStar size={10} /> {repo.stargazers_count}</span>
                                                <span><FiGitMerge size={10} /> {repo.forks_count}</span>
                                                {repo.language && <span>{repo.language}</span>}
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn--ghost btn--icon"
                                            onClick={() => handleStarRepo(repo.owner.login, repo.name)}
                                            title="Star"
                                        >
                                            <FiStar />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Social Panel Component
// Social Panel Component
function SocialPanel() {
    const { linkedin, twitter, isPosting, setPosting, connectLinkedIn, connectTwitter } = useSocialStore();
    const { addNotification } = useUIStore();
    const [postContent, setPostContent] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState({ linkedin: false, twitter: false });
    const [isAuthenticated] = useState(authService.isAuthenticated());

    // Load initial status
    useEffect(() => {
        const checkConnections = async () => {
            if (!isAuthenticated) return;

            try {
                const connections = await authService.getConnections();
                if (Array.isArray(connections)) {
                    const linkedInConn = connections.find(c => c.platform === 'linkedin');
                    const twitterConn = connections.find(c => c.platform === 'twitter');

                    if (linkedInConn) connectLinkedIn(linkedInConn);
                    if (twitterConn) connectTwitter(twitterConn);
                }
            } catch (error) {
                console.error('Failed to load social connections', error);
            }
        };
        checkConnections();
    }, [isAuthenticated]);

    const handleConnectLinkedIn = async () => {
        try {
            const url = await authService.connectLinkedIn();
            window.location.href = url;
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to initiate LinkedIn connection' });
        }
    };

    const handleConnectTwitter = async () => {
        try {
            const url = await authService.connectTwitter();
            window.location.href = url;
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to initiate Twitter connection' });
        }
    };

    const handlePost = async () => {
        if (!postContent.trim()) {
            addNotification({ type: 'warning', message: 'Please enter some content to post' });
            return;
        }
        if (!selectedPlatforms.linkedin && !selectedPlatforms.twitter) {
            addNotification({ type: 'warning', message: 'Select at least one platform' });
            return;
        }

        setPosting(true);
        let successCount = 0;

        try {
            if (selectedPlatforms.linkedin) {
                if (!linkedin.isConnected) {
                    addNotification({ type: 'error', message: 'LinkedIn not connected' });
                } else {
                    await socialService.postToLinkedIn(postContent);
                    successCount++;
                }
            }

            if (selectedPlatforms.twitter) {
                if (!twitter.isConnected) {
                    addNotification({ type: 'error', message: 'Twitter not connected' });
                } else {
                    await socialService.postToTwitter(postContent);
                    successCount++;
                }
            }

            if (successCount > 0) {
                addNotification({ type: 'success', message: `Posted successfully to ${successCount} platform(s)!` });
                setPostContent('');
            }
        } catch (error) {
            console.error('Posting failed:', error);
            addNotification({ type: 'error', message: 'Failed to post check console for details' });
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="panel-content">
            {!isAuthenticated && (
                <div style={{
                    padding: '12px',
                    background: 'rgba(255, 171, 0, 0.1)',
                    border: '1px solid var(--warning)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--warning)',
                    marginBottom: '16px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <FiAlertCircle style={{ marginRight: '8px', fontSize: '16px' }} />
                    <span>Please log in to use social features.</span>
                </div>
            )}

            <div className="card" style={{ marginBottom: '16px', opacity: isAuthenticated ? 1 : 0.6, pointerEvents: isAuthenticated ? 'auto' : 'none' }}>
                <div className="card__header">
                    <span className="card__title">Connected Accounts</span>
                </div>
                <div className="card__body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                            className={`social-btn ${linkedin?.isConnected ? 'social-btn--linkedin' : ''}`}
                            onClick={!linkedin?.isConnected ? handleConnectLinkedIn : undefined}
                            disabled={linkedin?.isConnected}
                        >
                            <FiLinkedin size={20} />
                            <span>{linkedin?.isConnected ? 'LinkedIn Connected' : 'Connect LinkedIn'}</span>
                            {linkedin?.isConnected && <FiCheckCircle style={{ marginLeft: 'auto' }} />}
                        </button>
                        <button
                            className={`social-btn ${twitter?.isConnected ? 'social-btn--twitter' : ''}`}
                            onClick={!twitter?.isConnected ? handleConnectTwitter : undefined}
                            disabled={twitter?.isConnected}
                        >
                            <FiTwitter size={20} />
                            <span>{twitter?.isConnected ? 'Twitter Connected' : 'Connect Twitter / X'}</span>
                            {twitter?.isConnected && <FiCheckCircle style={{ marginLeft: 'auto' }} />}
                        </button>
                    </div>
                </div >
            </div >

            <div className="card">
                <div className="card__header">
                    <span className="card__title">
                        <FiShare2 style={{ marginRight: '8px' }} />
                        Share Your Project
                    </span>
                </div>
                <div className="card__body">
                    <label className="label">Post Content</label>
                    <textarea
                        className="input input--textarea"
                        placeholder="Share something about your project..."
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        style={{ marginBottom: '12px' }}
                    />

                    <div style={{ marginBottom: '12px' }}>
                        <label className="label">Post to:</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedPlatforms.linkedin}
                                    onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, linkedin: e.target.checked })}
                                    disabled={!linkedin?.isConnected}
                                />
                                <FiLinkedin /> LinkedIn
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedPlatforms.twitter}
                                    onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, twitter: e.target.checked })}
                                    disabled={!twitter?.isConnected}
                                />
                                <FiTwitter /> Twitter
                            </label>
                        </div>
                    </div>

                    <button
                        className="btn btn--primary"
                        style={{ width: '100%' }}
                        disabled={isPosting}
                        onClick={handlePost}
                    >
                        {isPosting ? (
                            <><span className="spinner" /> Posting...</>
                        ) : (
                            <><FiSend /> Post Now</>
                        )}
                    </button>
                </div>
            </div >
        </div >
    );
}


// Note Editor Panel Component
function NoteEditorPanel() {
    const { notes, activeNoteId, setNotes, setActiveNote, addNote, updateNote, deleteNote } = useNotesStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Load notes on mount
    useEffect(() => {
        const loadedNotes = notesService.getAllNotes();
        setNotes(loadedNotes);
        if (loadedNotes.length > 0 && !activeNoteId) {
            setActiveNote(loadedNotes[0].id);
        }
    }, []);

    const handleCreateNote = () => {
        const newNote = notesService.createNote('New Note', '');
        addNote(newNote);
    };

    const handleUpdateNote = (field, value) => {
        if (!activeNoteId) return;
        notesService.updateNote(activeNoteId, { [field]: value });
        updateNote(activeNoteId, { [field]: value });
    };

    const handleDeleteNote = (noteId) => {
        notesService.deleteNote(noteId);
        deleteNote(noteId);
    };

    const handleExport = (noteId) => {
        notesService.exportNote(noteId);
    };

    const handleTogglePin = (noteId) => {
        const updatedNote = notesService.togglePin(noteId);
        if (updatedNote) {
            setNotes(notesService.getAllNotes());
        }
    };

    const activeNote = notes.find(n => n.id === activeNoteId);

    const filteredNotes = searchQuery
        ? notes.filter(n =>
            n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.content?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : notes;

    return (
        <div className="notes-panel">
            {/* Notes Header */}
            <div className="notes-panel__header">
                <div className="notes-panel__search">
                    <FiSearch size={14} />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="btn btn--primary btn--sm" onClick={handleCreateNote}>
                    <FiPlus /> New
                </button>
            </div>

            <div className="notes-panel__content">
                {/* Notes List */}
                <div className="notes-list">
                    {filteredNotes.length === 0 ? (
                        <div className="notes-list__empty">
                            <FiFileText size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                            <p>No notes yet</p>
                            <button className="btn btn--ghost btn--sm" onClick={handleCreateNote}>
                                Create your first note
                            </button>
                        </div>
                    ) : (
                        filteredNotes.map((note) => (
                            <div
                                key={note.id}
                                className={`note-item ${activeNoteId === note.id ? 'note-item--active' : ''}`}
                                onClick={() => setActiveNote(note.id)}
                            >
                                <div className="note-item__header">
                                    <span className="note-item__title">
                                        {note.pinned && <FiMapPin size={10} style={{ marginRight: '4px' }} />}
                                        {note.title || 'Untitled'}
                                    </span>
                                    <span className="note-item__date">
                                        {new Date(note.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="note-item__preview">
                                    {note.content?.slice(0, 60) || 'Empty note...'}
                                </p>
                            </div>
                        ))
                    )}
                </div>

                {/* Note Editor */}
                {activeNote && (
                    <div className="note-editor">
                        <div className="note-editor__header">
                            <input
                                type="text"
                                className="note-editor__title"
                                value={activeNote.title}
                                onChange={(e) => handleUpdateNote('title', e.target.value)}
                                placeholder="Note title..."
                            />
                            <div className="note-editor__actions">
                                <button
                                    className="btn btn--ghost btn--icon"
                                    onClick={() => handleTogglePin(activeNote.id)}
                                    title={activeNote.pinned ? 'Unpin' : 'Pin'}
                                >
                                    <FiMapPin style={{ color: activeNote.pinned ? 'var(--warning)' : undefined }} />
                                </button>
                                <button
                                    className="btn btn--ghost btn--icon"
                                    onClick={() => handleExport(activeNote.id)}
                                    title="Export"
                                >
                                    <FiDownload />
                                </button>
                                <button
                                    className="btn btn--ghost btn--icon"
                                    onClick={() => handleDeleteNote(activeNote.id)}
                                    title="Delete"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>
                        <textarea
                            className="note-editor__content"
                            value={activeNote.content}
                            onChange={(e) => handleUpdateNote('content', e.target.value)}
                            placeholder="Start typing your note..."
                        />
                        <div className="note-editor__footer">
                            <span className="note-editor__info">
                                Last updated: {new Date(activeNote.updatedAt).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Learning Panel Component
function LearningPanel() {
    const {
        explanation, diagram, resources, isGenerating, activeTab,
        chatMessages, addChatMessage, clearChat,
        setActiveTab, setExplanation, setDiagram, setResources, setGenerating
    } = useLearningStore();
    const [chatQuery, setChatQuery] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const { addNotification } = useUIStore();
    const { files, activeFileId } = useFileStore();
    const activeFile = files.find((f) => f.id === activeFileId);

    const handleChat = async (e) => {
        if (e) e.preventDefault();
        if (!chatQuery.trim() || !activeFile || isChatting) return;

        const query = chatQuery;
        setChatQuery('');
        setIsChatting(true);

        // Add user message to history
        addChatMessage({ role: 'user', content: query });

        try {
            const response = await aiService.chat(
                activeFile.content,
                activeFile.language,
                query,
                chatMessages
            );

            // Add AI response to history
            addChatMessage({
                role: 'assistant',
                content: response.data.response,
                model: response.data.model,
                provider: response.data.provider
            });
        } catch (error) {
            console.error('AI Chat failed:', error);
            addNotification({
                type: 'error',
                message: 'AI Chat failed. Please try again.'
            });
        } finally {
            setIsChatting(false);
        }
    };

    const handleAnalyze = async () => {
        if (!activeFile) return;

        setGenerating(true);
        clearChat();
        try {
            const response = await aiService.analyzeCode(activeFile.content, activeFile.language);
            setExplanation(response.data.explanation);
            setDiagram(response.data.diagram);
            setResources(response.data.resources);

            addNotification({
                type: 'success',
                message: 'Analysis complete!'
            });
        } catch (error) {
            console.error('AI Analysis failed:', error);
            addNotification({
                type: 'error',
                message: 'AI Analysis failed. Please check your API keys.'
            });
        } finally {
            setGenerating(false);
        }
    };

    const tabs = [
        { id: 'explain', label: 'Explain', icon: <FiBookOpen /> },
        { id: 'diagram', label: 'Diagram', icon: <FiImage /> },
        { id: 'resources', label: 'Resources', icon: <FiCode /> }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`panel-tab ${activeTab === tab.id ? 'panel-tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{ flex: 1, padding: '8px' }}
                    >
                        {tab.icon}
                        <span style={{ marginLeft: '4px', fontSize: '12px' }}>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="panel-content">
                {!activeFile ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                        <FiCpu size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p>Select a file to learn from the code</p>
                    </div>
                ) : (
                    <>
                        <button
                            className="btn btn--primary"
                            style={{ width: '100%', marginBottom: '16px' }}
                            disabled={isGenerating}
                            onClick={handleAnalyze}
                        >
                            {isGenerating ? (
                                <><span className="spinner" /> Analyzing...</>
                            ) : (
                                <><FiCpu /> Analyze Code with AI</>
                            )}
                        </button>

                        {activeTab === 'explain' && (
                            <div className="learning-card">
                                <div className="learning-card__header">
                                    <FiBookOpen /> Code Explanation
                                </div>
                                <div className="learning-card__content">
                                    {explanation ? (
                                        <div className="explanation-markdown">
                                            <ReactMarkdown
                                                components={{
                                                    code({ node, inline, className, children, ...props }) {
                                                        const match = /language-(\w+)/.exec(className || '')
                                                        return !inline && match ? (
                                                            <SyntaxHighlighter
                                                                {...props}
                                                                children={String(children).replace(/\n$/, '')}
                                                                style={vscDarkPlus}
                                                                language={match[1]}
                                                                PreTag="div"
                                                            />
                                                        ) : (
                                                            <code {...props} className={className}>
                                                                {children}
                                                            </code>
                                                        )
                                                    }
                                                }}
                                            >
                                                {explanation}
                                            </ReactMarkdown>

                                            {/* Chat History */}
                                            {chatMessages.length > 0 && (
                                                <div className="learning-chat">
                                                    {chatMessages.map((msg, idx) => (
                                                        <div key={idx} className={`chat-message chat-message--${msg.role}`}>
                                                            <ReactMarkdown
                                                                components={{
                                                                    code({ node, inline, className, children, ...props }) {
                                                                        const match = /language-(\w+)/.exec(className || '')
                                                                        return !inline && match ? (
                                                                            <SyntaxHighlighter
                                                                                {...props}
                                                                                children={String(children).replace(/\n$/, '')}
                                                                                style={vscDarkPlus}
                                                                                language={match[1]}
                                                                                PreTag="div"
                                                                            />
                                                                        ) : (
                                                                            <code {...props} className={className}>
                                                                                {children}
                                                                            </code>
                                                                        )
                                                                    }
                                                                }}
                                                            >
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    ))}
                                                    {isChatting && (
                                                        <div className="chat-message chat-message--ai">
                                                            <span className="spinner spinner--small" /> AI is thinking...
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Chat Input Bar */}
                                            <form className="chat-input-wrapper" onSubmit={handleChat}>
                                                <input
                                                    type="text"
                                                    className="chat-input"
                                                    placeholder="Ask a follow-up question..."
                                                    value={chatQuery}
                                                    onChange={(e) => setChatQuery(e.target.value)}
                                                    disabled={isChatting}
                                                />
                                                <button
                                                    type="submit"
                                                    className="btn btn--ghost btn--icon"
                                                    disabled={!chatQuery.trim() || isChatting}
                                                >
                                                    <FiSend />
                                                </button>
                                            </form>
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            Click "Analyze Code with AI" to get an explanation of your code.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'diagram' && (
                            <div className="learning-card">
                                <div className="learning-card__header">
                                    <FiImage /> Visual Diagram
                                </div>
                                <div className="learning-card__content">
                                    {diagram ? (
                                        <div className="diagram-container" dangerouslySetInnerHTML={{ __html: diagram }} />
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            AI will generate flow diagrams, class diagrams, or sequence diagrams.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'resources' && (
                            <div className="learning-card">
                                <div className="learning-card__header">
                                    <FiCode /> Learning Resources
                                </div>
                                <div className="learning-card__content">
                                    {resources.length > 0 ? (
                                        <ul style={{ listStyle: 'none', padding: 0 }}>
                                            {resources.map((resource, index) => (
                                                <li key={index} style={{ marginBottom: '12px' }}>
                                                    <a href={resource.url} target="_blank" rel="noopener noreferrer"
                                                        style={{ color: 'var(--info)', textDecoration: 'none' }}>
                                                        {resource.title}
                                                    </a>
                                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                        {resource.description}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            AI will suggest relevant documentation and tutorials.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Right Panel Component
// Right Panel Component
function RightPanel({ style, editorMinimized }) {
    const { rightPanelOpen, rightPanelTab, setRightPanelTab, toggleRightPanel, rightPanelExpanded, toggleRightPanelExpanded } = useUIStore();
    const { files, activeFileId } = useFileStore();

    if (!rightPanelOpen) {
        return (
            <div className="right-panel right-panel--collapsed">
                <button
                    className="btn btn--ghost btn--icon"
                    onClick={toggleRightPanel}
                    style={{ margin: '8px' }}
                >
                    <FiChevronLeft />
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'preview', label: 'Preview', icon: <FiEye /> },
        { id: 'github', label: 'GitHub', icon: <FiGithub /> },
        { id: 'social', label: 'Social', icon: <FiShare2 /> },
        { id: 'learn', label: 'Learn', icon: <FiBookOpen /> },
        { id: 'apps', label: 'Apps', icon: <FiGrid /> }
    ];

    // Calculate style - when editor is minimized and panel is expanded, limit max width
    const panelStyle = rightPanelExpanded
        ? (editorMinimized ? { maxWidth: 'calc(100% - 60px)' } : {})
        : style;

    return (
        <div
            className={`right-panel ${rightPanelExpanded ? 'right-panel--expanded' : ''}`}
            style={panelStyle}
        >
            <div className="panel-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`panel-tab ${rightPanelTab === tab.id ? 'panel-tab--active' : ''}`}
                        onClick={() => setRightPanelTab(tab.id)}
                        title={tab.label}
                    >
                        {tab.icon}
                    </button>
                ))}
                <button
                    className="btn btn--ghost btn--icon"
                    onClick={toggleRightPanelExpanded}
                    title={rightPanelExpanded ? "Collapse Panel" : "Expand Panel (minimize editor)"}
                >
                    {rightPanelExpanded ? <FiChevronDown /> : <FiChevronUp />}
                </button>
                <button className="btn btn--ghost btn--icon" onClick={toggleRightPanel}>
                    <FiChevronRight />
                </button>
            </div>

            {rightPanelTab === 'preview' && <WebPreview files={files} activeFileId={activeFileId} />}
            {rightPanelTab === 'github' && <GitHubPanel />}
            {rightPanelTab === 'social' && <SocialPanel />}
            {rightPanelTab === 'learn' && <LearningPanel />}
            {rightPanelTab === 'apps' && <AppsPanel onOpenApp={setRightPanelTab} />}
            {rightPanelTab === 'notes' && (
                <NotesApp
                    onBack={() => setRightPanelTab('apps')}
                    isWindowed={false}
                    onPopOut={() => {
                        // Open a new window with the Notes app
                        const notesWindow = window.open('', 'Roolts Notes', 'width=900,height=700');
                        if (notesWindow) {
                            notesWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <title>Roolts Notes</title>
                                    <style>
                                        * { margin: 0; padding: 0; box-sizing: border-box; }
                                        body { 
                                            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                                            height: 100vh;
                                            overflow: hidden;
                                        }
                                        #notes-root { height: 100%; }
                                    </style>
                                    ${document.querySelector('style') ? document.querySelector('style').outerHTML : ''}
                                    <link rel="preconnect" href="https://fonts.googleapis.com">
                                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
                                </head>
                                <body>
                                    <div id="notes-root"></div>
                                    <script>
                                        // Notify parent that window is closing
                                        window.addEventListener('beforeunload', () => {
                                            if (window.opener && !window.opener.closed) {
                                                window.opener.postMessage({ type: 'notes-window-closed' }, '*');
                                            }
                                        });
                                    </script>
                                </body>
                                </html>
                            `);
                            notesWindow.document.close();

                            // Import React and ReactDOM dynamically in the new window
                            import('react').then((React) => {
                                import('react-dom/client').then((ReactDOM) => {
                                    import('./components/apps/NotesApp').then((module) => {
                                        const NotesApp = module.default;
                                        const root = ReactDOM.createRoot(notesWindow.document.getElementById('notes-root'));
                                        root.render(React.createElement(NotesApp, { isWindowed: true }));
                                    });
                                });
                            });
                        }
                    }}
                    onOpenNewWindow={() => {
                        // Same as onPopOut for now
                        const notesWindow = window.open('', 'Roolts Notes ' + Date.now(), 'width=900,height=700');
                        if (notesWindow) {
                            notesWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <title>Roolts Notes</title>
                                    <style>
                                        * { margin: 0; padding: 0; box-sizing: border-box; }
                                        body { 
                                            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                                            height: 100vh;
                                            overflow: hidden;
                                        }
                                        #notes-root { height: 100%; }
                                    </style>
                                    ${document.querySelector('style') ? document.querySelector('style').outerHTML : ''}
                                    <link rel="preconnect" href="https://fonts.googleapis.com">
                                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
                                </head>
                                <body>
                                    <div id="notes-root"></div>
                                </body>
                                </html>
                            `);
                            notesWindow.document.close();

                            // Import React and ReactDOM dynamically in the new window
                            import('react').then((React) => {
                                import('react-dom/client').then((ReactDOM) => {
                                    import('./components/apps/NotesApp').then((module) => {
                                        const NotesApp = module.default;
                                        const root = ReactDOM.createRoot(notesWindow.document.getElementById('notes-root'));
                                        root.render(React.createElement(NotesApp, { isWindowed: true }));
                                    });
                                });
                            });
                        }
                    }}
                />
            )}
            {rightPanelTab === 'calc' && (
                <CalculatorApp
                    onBack={() => setRightPanelTab('apps')}
                    isWindowed={false}
                    onPopOut={() => {
                        const calcWindow = window.open('', 'Roolts Calculator', 'width=400,height=600');
                        if (calcWindow) {
                            calcWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <title>Roolts Calculator</title>
                                    <style>
                                        * { margin: 0; padding: 0; box-sizing: border-box; }
                                        body { 
                                            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                                            height: 100vh;
                                            overflow: hidden;
                                            background-color: #f5f5f5;
                                        }
                                        #calc-root { height: 100%; }
                                    </style>
                                    ${document.querySelector('style') ? document.querySelector('style').outerHTML : ''}
                                </head>
                                <body>
                                    <div id="calc-root"></div>
                                    <script>
                                        window.addEventListener('beforeunload', () => {
                                            if (window.opener && !window.opener.closed) {
                                                window.opener.postMessage({ type: 'calc-window-closed' }, '*');
                                            }
                                        });
                                    </script>
                                </body>
                                </html>
                            `);
                            calcWindow.document.close();

                            import('react').then((React) => {
                                import('react-dom/client').then((ReactDOM) => {
                                    import('./components/apps/CalculatorApp').then((module) => {
                                        const CalculatorApp = module.default;
                                        const root = ReactDOM.createRoot(calcWindow.document.getElementById('calc-root'));
                                        root.render(React.createElement(CalculatorApp, { isWindowed: true }));
                                    });
                                });
                            });
                        }
                    }}
                />
            )}
            {rightPanelTab === 'quickpython' && (
                <QuickPythonApp
                    onBack={() => setRightPanelTab('apps')}
                    isWindowed={false}
                    onPopOut={() => {
                        const pyWindow = window.open('', 'Roolts Quick Python', 'width=800,height=600');
                        if (pyWindow) {
                            pyWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <title>Roolts Quick Python</title>
                                    <style>
                                        * { margin: 0; padding: 0; box-sizing: border-box; }
                                        body { 
                                            font-family: 'Consolas', 'Courier New', monospace;
                                            height: 100vh;
                                            overflow: hidden;
                                            background-color: #1e1e1e;
                                        }
                                        #py-root { height: 100%; }
                                    </style>
                                    ${document.querySelector('style') ? document.querySelector('style').outerHTML : ''}
                                </head>
                                <body>
                                    <div id="py-root"></div>
                                    <script>
                                        window.addEventListener('beforeunload', () => {
                                            if (window.opener && !window.opener.closed) {
                                                window.opener.postMessage({ type: 'py-window-closed' }, '*');
                                            }
                                        });
                                    </script>
                                </body>
                                </html>
                            `);
                            pyWindow.document.close();

                            import('react').then((React) => {
                                import('react-dom/client').then((ReactDOM) => {
                                    import('./components/apps/QuickPythonApp').then((module) => {
                                        const QuickPythonApp = module.default;
                                        const root = ReactDOM.createRoot(pyWindow.document.getElementById('py-root'));
                                        root.render(React.createElement(QuickPythonApp, { isWindowed: true }));
                                    });
                                });
                            });
                        }
                    }}
                />
            )}
        </div>
    );
}

// New File Modal
function NewFileModal() {
    const { modals, closeModal } = useUIStore();
    const { addFile } = useFileStore();
    const [fileName, setFileName] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [isManualSelection, setIsManualSelection] = useState(false);
    const [itemType, setItemType] = useState('file');

    if (!modals.newFile) return null;

    // Extension to language mapping
    const extensionMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'javascript',
        'tsx': 'javascript',
        'py': 'python',
        'java': 'java',
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'json': 'json',
        'txt': 'plaintext',
        'md': 'plaintext',
        'c': 'c',
        'cpp': 'cpp',
        'cc': 'cpp',
        'cxx': 'cpp',
        'go': 'go'
    };

    const handleFileNameChange = (e) => {
        const value = e.target.value;
        setFileName(value);

        if (!isManualSelection) {
            const ext = value.split('.').pop().toLowerCase();
            if (extensionMap[ext]) {
                setLanguage(extensionMap[ext]);
            }
        }
    };

    const handleLanguageChange = (e) => {
        setLanguage(e.target.value);
        setIsManualSelection(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCreate();
        }
    };

    const handleCreate = () => {
        if (fileName.trim()) {
            if (itemType === 'file') {
                addFile(fileName, '', language);
            } else {
                // Create directory
                createDirectoryInBackend(fileName.startsWith('/') ? fileName : `/${fileName}`);
            }
            setFileName('');
            setLanguage('javascript');
            setIsManualSelection(false);
            setItemType('file');
            closeModal('newFile');
        }
    };

    return (
        <div className="modal-overlay" onClick={() => closeModal('newFile')}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h3 className="modal__title">Create New {itemType === 'file' ? 'File' : 'Directory'}</h3>
                    <button className="btn btn--ghost btn--icon" onClick={() => closeModal('newFile')}>
                        <FiX />
                    </button>
                </div>
                <div className="modal__body">
                    <label className="label">Type</label>
                    <select
                        className="input"
                        value={itemType}
                        onChange={(e) => setItemType(e.target.value)}
                        style={{ marginBottom: '16px' }}
                    >
                        <option value="file">File</option>
                        <option value="directory">Directory</option>
                    </select>

                    <label className="label">Name</label>
                    <input
                        type="text"
                        className="input"
                        placeholder={itemType === 'file' ? "e.g., app.js, main.py" : "e.g., my-folder, src"}
                        value={fileName}
                        onChange={handleFileNameChange}
                        onKeyDown={handleKeyDown}
                        style={{ marginBottom: '16px' }}
                        autoFocus
                    />

                    {itemType === 'file' && (
                        <>
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Language
                                <span style={{ marginLeft: 'auto' }}>{getFileIcon(language)}</span>
                            </label>
                            <select
                                className="input"
                                value={language}
                                onChange={handleLanguageChange}
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                                <option value="html">HTML</option>
                                <option value="css">CSS</option>
                                <option value="json">JSON</option>
                                <option value="plaintext">Plain Text</option>
                                <option value="c">C</option>
                                <option value="cpp">C++</option>
                                <option value="go">Go</option>
                            </select>
                        </>
                    )}
                </div>
                <div className="modal__footer">
                    <button className="btn btn--secondary" onClick={() => {
                        setFileName('');
                        setLanguage('javascript');
                        setIsManualSelection(false);
                        setItemType('file');
                        closeModal('newFile');
                    }}>
                        Cancel
                    </button>
                    <button className="btn btn--primary" onClick={handleCreate}>
                        <FiPlus /> Create {itemType === 'file' ? 'File' : 'Directory'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Portfolio Generator Modal
function PortfolioGeneratorModal() {
    const { modals, closeModal } = useUIStore();

    if (!modals.portfolioGenerator) return null;

    return (
        <div className="modal-overlay" onClick={() => closeModal('portfolioGenerator')}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '900px', maxWidth: '95vw', height: '90vh' }}>
                <div className="modal__header">
                    <h3 className="modal__title">Portfolio Generator</h3>
                    <button className="btn btn--ghost btn--icon" onClick={() => closeModal('portfolioGenerator')}>
                        <FiX />
                    </button>
                </div>
                <div className="modal__body" style={{ padding: '0', overflow: 'hidden' }}>
                    <PortfolioGenerator />
                </div>
            </div>
        </div>
    );
}

// Deployment Modal Component
function DeploymentModalComponent() {
    const { modals, closeModal } = useUIStore();

    if (!modals.deployment) return null;

    return (
        <div className="modal-overlay" onClick={() => closeModal('deployment')}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '500px', maxWidth: '95vw' }}>
                <div className="modal__header">
                    <h3 className="modal__title">Deploy to Cloud</h3>
                    <button className="btn btn--ghost btn--icon" onClick={() => closeModal('deployment')}>
                        <FiX />
                    </button>
                </div>
                <div className="modal__body">
                    <DeploymentModal />
                </div>
            </div>
        </div>
    );
}


// Status Bar Component
function StatusBar() {
    const { files, activeFileId } = useFileStore();
    const { isConnected } = useGitHubStore();
    const { compilers } = useExecutionStore();
    const activeFile = files.find((f) => f.id === activeFileId);

    return (
        <div className="status-bar">
            <div className="status-bar__left">
                <span className="status-bar__item">
                    {isConnected ? (
                        <><FiCheckCircle style={{ color: 'var(--success)' }} /> GitHub Connected</>
                    ) : (
                        <><FiAlertCircle style={{ color: 'var(--text-muted)' }} /> GitHub Disconnected</>
                    )}
                </span>
            </div>
            <div className="status-bar__right">
                {activeFile && (
                    <>
                        <span className="status-bar__item" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {getFileIcon(activeFile.language)}
                            {activeFile.language}
                        </span>
                        <span className="status-bar__item">UTF-8</span>
                        <span className="status-bar__item">
                            {activeFile.content.split('\n').length} lines
                        </span>
                    </>
                )}
                <span className="status-bar__item">
                    <FiCpu size={12} /> Roolts Ready
                </span>
            </div>
        </div>
    );
}

// Notifications Component
function Notifications() {
    const { notifications, removeNotification } = useUIStore();

    return (
        <>
            {notifications.map((notification, index) => (
                <div
                    key={notification.id}
                    className={`notification notification--${notification.type}`}
                    style={{ bottom: `${24 + index * 60}px` }}
                >
                    {notification.type === 'success' && <FiCheckCircle style={{ color: 'var(--success)' }} />}
                    {notification.type === 'error' && <FiAlertCircle style={{ color: 'var(--error)' }} />}
                    <span>{notification.message}</span>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => removeNotification(notification.id)}
                        style={{ marginLeft: 'auto' }}
                    >
                        <FiX size={14} />
                    </button>
                </div>
            ))}
        </>
    );
}

// Settings Modal
// Settings Modal
function SettingsModal() {
    const { modals, closeModal, addNotification } = useUIStore();
    const {
        theme, backgroundImage, backgroundOpacity, format, features, experimental,
        uiFontSize, uiFontFamily, scribblePenSize, scribbleEraserSize,
        setTheme, setBackgroundImage, setBackgroundOpacity,
        setUiFontSize, setUiFontFamily,
        updateFormat, toggleFeature, setFeature, toggleExperimental, setScribbleSize
    } = useSettingsStore();
    const [activeTab, setActiveTab] = useState('theme');

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBackgroundImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    if (!modals.settings) return null;

    return (
        <div className="modal-overlay">
            <div className="modal modal--large" style={{ maxWidth: '600px', height: 'auto' }}>
                <div className="modal__header">
                    <h2 className="modal__title">Settings</h2>
                    <button className="btn btn--ghost btn--icon" onClick={() => closeModal('settings')}>
                        <FiX />
                    </button>
                </div>
                <div className="modal__body" style={{ padding: 0 }}>
                    <div className="settings-container" style={{ display: 'flex', minHeight: '400px' }}>
                        {/* Settings Sidebar */}
                        <div className="settings-sidebar" style={{ width: '150px', borderRight: '1px solid var(--border-primary)', padding: '1rem 0' }}>
                            <button
                                className={`settings-tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
                                onClick={() => setActiveTab('theme')}
                                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', color: activeTab === 'theme' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <FiImage style={{ marginRight: '8px' }} /> Appearance
                            </button>
                            <button
                                className={`settings-tab-btn ${activeTab === 'format' ? 'active' : ''}`}
                                onClick={() => setActiveTab('format')}
                                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', color: activeTab === 'format' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <FiEdit3 style={{ marginRight: '8px' }} /> Editor
                            </button>
                            <button
                                className={`settings-tab-btn ${activeTab === 'features' ? 'active' : ''}`}
                                onClick={() => setActiveTab('features')}
                                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', color: activeTab === 'features' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <FiCpu style={{ marginRight: '8px' }} /> Features
                            </button>
                            <button
                                className={`settings-tab-btn ${activeTab === 'experimental' ? 'active' : ''}`}
                                onClick={() => setActiveTab('experimental')}
                                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', color: activeTab === 'experimental' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <FiStar style={{ marginRight: '8px' }} /> Experimental
                            </button>
                        </div>

                        {/* Settings Content */}
                        <div className="settings-content" style={{ flex: 1, padding: '1.5rem' }}>
                            {activeTab === 'theme' && (
                                <div className="settings-section">
                                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>Appearance</h3>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>Editor Theme</label>
                                        <select
                                            className="input-select"
                                            value={theme}
                                            onChange={(e) => setTheme(e.target.value)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="vs-dark">Dark (Default)</option>
                                            <option value="light">Light</option>
                                            <option value="hc-black">High Contrast</option>
                                            <option value="nord">Nord</option>
                                            <option value="dracula">Dracula</option>
                                            <option value="solarized-light">Solarized Light</option>
                                        </select >
                                    </div >

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>Background Image</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {backgroundImage ? (
                                                <div style={{ position: 'relative', width: '100%', height: '150px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                                                    <img src={backgroundImage} alt="Background" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button
                                                        className="btn btn--ghost btn--icon"
                                                        onClick={() => setBackgroundImage(null)}
                                                        style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: 'white' }}
                                                        title="Remove Image"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    border: '2px dashed var(--border-primary)',
                                                    borderRadius: '8px',
                                                    padding: '2rem',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    position: 'relative'
                                                }}>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                                    />
                                                    <FiImage size={24} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }} />
                                                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Click to upload image</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>Background Opacity ({Math.round(backgroundOpacity * 100)}%)</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={backgroundOpacity}
                                            onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>UI Font Size ({uiFontSize}px)</label>
                                        <input
                                            type="range"
                                            min="12"
                                            max="20"
                                            value={uiFontSize}
                                            onChange={(e) => setUiFontSize(parseInt(e.target.value))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>UI Font Family</label>
                                        <select
                                            className="input-select"
                                            value={uiFontFamily}
                                            onChange={(e) => setUiFontFamily(e.target.value)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="Inter">Inter (Default)</option>
                                            <option value="Roboto">Roboto</option>
                                            <option value="Segoe UI">Segoe UI</option>
                                            <option value="Arial">Arial</option>
                                            <option value="Helvetica">Helvetica</option>
                                            <option value="'Courier New'">Courier New (Monospace)</option>
                                        </select>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Scribble Tool Sizes</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '11px' }}>Pen Size ({scribblePenSize}px)</label>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    value={scribblePenSize}
                                                    onChange={(e) => setScribbleSize('pen', parseInt(e.target.value))}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px' }}>Eraser Size ({scribbleEraserSize}px)</label>
                                                <input
                                                    type="range"
                                                    min="5"
                                                    max="50"
                                                    value={scribbleEraserSize}
                                                    onChange={(e) => setScribbleSize('eraser', parseInt(e.target.value))}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div >
                            )
                            }

                            {
                                activeTab === 'format' && (
                                    <div className="settings-section">
                                        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>Editor Format</h3>

                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label>Font Size ({format.fontSize}px)</label>
                                            <input
                                                type="range"
                                                min="10"
                                                max="32"
                                                value={format.fontSize}
                                                onChange={(e) => updateFormat('fontSize', parseInt(e.target.value))}
                                                style={{ width: '100%' }}
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label>Tab Size</label>
                                            <select
                                                className="input-select"
                                                value={format.tabSize}
                                                onChange={(e) => updateFormat('tabSize', parseInt(e.target.value))}
                                                style={{ width: '100%' }}
                                            >
                                                <option value="2">2 Spaces</option>
                                                <option value="4">4 Spaces</option>
                                                <option value="8">8 Spaces</option>
                                            </select>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label>Word Wrap</label>
                                            <select
                                                className="input-select"
                                                value={format.wordWrap}
                                                onChange={(e) => updateFormat('wordWrap', e.target.value)}
                                                style={{ width: '100%' }}
                                            >
                                                <option value="on">On</option>
                                                <option value="off">Off</option>
                                                <option value="wordWrapColumn">Wrap at Column</option>
                                            </select>
                                        </div>
                                    </div>
                                )
                            }

                            {
                                activeTab === 'features' && (
                                    <div className="settings-section">
                                        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>Features</h3>

                                        <div className="form-check" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={features.minimap}
                                                onChange={() => toggleFeature('minimap')}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <label>Show Minimap</label>
                                        </div>

                                        <div className="form-check" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={features.lineNumbers === 'on'}
                                                onChange={(e) => setFeature('lineNumbers', e.target.checked ? 'on' : 'off')}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <label>Show Line Numbers</label>
                                        </div>

                                        <div className="form-check" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={features.livePreview}
                                                onChange={() => toggleFeature('livePreview')}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <label>Live Web Preview (Auto-open)</label>
                                        </div>
                                    </div>
                                )
                            }
                            {
                                activeTab === 'experimental' && (
                                    <div className="settings-section">
                                        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>Experimental Features</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                            These features are in development and may be unstable.
                                        </p>

                                        <div className="form-check" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={experimental?.scribble}
                                                onChange={() => toggleExperimental('scribble')}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <label>Scribble Feature (Canvas Overlay)</label>
                                        </div>

                                        <div className="form-check" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={experimental?.fileSyncEnvironment}
                                                onChange={() => toggleExperimental('fileSyncEnvironment')}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <label>File Sync Environment (VS Code-like Interface)</label>
                                        </div>
                                    </div>
                                )
                            }
                        </div >
                    </div >
                </div >
            </div >
        </div >
    );
}

// Highlight Selection Modal
function HighlightModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState(null);
    const { addHighlight, removeHighlight, files } = useFileStore();

    useEffect(() => {
        const handleOpen = (e) => {
            setIsOpen(true);
            setData(e.detail);
        };
        window.addEventListener('open-highlight-modal', handleOpen);
        return () => window.removeEventListener('open-highlight-modal', handleOpen);
    }, []);

    if (!isOpen || !data) return null;

    const handleSelectColor = (color) => {
        if (data && data.selection) {
            const activeFile = files.find(f => f.id === data.fileId);
            const selection = data.selection;

            // Remove Overlapping Highlights (Accurate Detection)
            if (activeFile && activeFile.highlights) {
                const s = selection;
                const overlaps = activeFile.highlights.filter(h => {
                    const r = h.range;

                    // Ranges overlap if: range1.start < range2.end && range1.end > range2.start
                    // More precisely, check if they intersect at all.
                    // Two ranges [A, B] and [C, D] intersect if (A <= D and C <= B)
                    // For Monaco ranges, this means:
                    // (s.startLineNumber < r.endLineNumber || (s.startLineNumber === r.endLineNumber && s.startColumn <= r.endColumn)) &&
                    // (r.startLineNumber < s.endLineNumber || (r.startLineNumber === s.endLineNumber && r.startColumn <= s.endColumn))

                    // Simplified check for overlap:
                    // If one range starts after the other ends, they don't overlap.
                    // Otherwise, they do.
                    const sStart = { lineNumber: s.startLineNumber, column: s.startColumn };
                    const sEnd = { lineNumber: s.endLineNumber, column: s.endColumn };
                    const rStart = { lineNumber: r.startLineNumber, column: r.startColumn };
                    const rEnd = { lineNumber: r.endLineNumber, column: r.endColumn };

                    // Check if s is completely after r
                    if (sStart.lineNumber > rEnd.lineNumber || (sStart.lineNumber === rEnd.lineNumber && sStart.column >= rEnd.column)) {
                        return false;
                    }
                    // Check if r is completely after s
                    if (rStart.lineNumber > sEnd.lineNumber || (rStart.lineNumber === sEnd.lineNumber && rStart.column >= sEnd.column)) {
                        return false;
                    }
                    // If neither is completely after the other, they must overlap
                    return true;
                });

                overlaps.forEach(h => removeHighlight(data.fileId, h.id));
            }

            const highlight = {
                id: Date.now().toString(),
                color: color,
                range: data.selection
            };
            addHighlight(data.fileId, highlight);
        }
        setIsOpen(false);
        setData(null);
    };

    return (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '300px' }}>
                <div className="modal__header">
                    <h3 className="modal__title">Choose Highlight Color</h3>
                    <button className="btn btn--ghost btn--icon" onClick={() => setIsOpen(false)}>
                        <FiX />
                    </button>
                </div>
                <div className="modal__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button className="btn" style={{ background: '#fef08a', color: '#854d0e', border: '1px solid #fde047' }} onClick={() => handleSelectColor('yellow')}>Yellow</button>
                    <button className="btn" style={{ background: '#bbf7d0', color: '#166534', border: '1px solid #86efac' }} onClick={() => handleSelectColor('green')}>Green</button>
                    <button className="btn" style={{ background: '#bfdbfe', color: '#1e40af', border: '1px solid #93c5fd' }} onClick={() => handleSelectColor('blue')}>Blue</button>
                    <button className="btn" style={{ background: '#fbcfe8', color: '#9d174d', border: '1px solid #f9a8d4' }} onClick={() => handleSelectColor('pink')}>Pink</button>
                </div>
            </div>
        </div>
    );
}

// Input Request Modal
function InputRequestModal({ isOpen, onSubmit, onCancel }) {
    const [inputVal, setInputVal] = useState('');

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '400px' }}>
                <div className="modal__header">
                    <h3 className="modal__title">Program Input Required</h3>
                    <button className="btn btn--ghost btn--icon" onClick={onCancel}>
                        <FiX />
                    </button>
                </div>
                <div className="modal__body">
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        This program appears to require input. Please enter the input values below (one per line/prompt).
                    </p>
                    <textarea
                        className="input input--textarea"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Enter input..."
                        style={{ minHeight: '100px', fontSize: '14px', fontFamily: 'var(--font-mono)' }}
                        autoFocus
                    />
                </div>
                <div className="modal__footer">
                    <button className="btn btn--secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn--primary" onClick={() => onSubmit(inputVal)}>Run Program</button>
                </div>
            </div>
        </div>
    );
}

// Helper to detect if code needs input
const detectInputRequirement = (code, language) => {
    if (!code) return false;
    const c = code; // no specific normalization needed usually

    switch (language) {
        case 'python':
            return /\binput\s*\(/.test(c);
        case 'java':
            return /Scanner\s*\(System\.in\)/.test(c) || /Console\.readLine/.test(c) || /BufferedReader.*InputStreamReader/.test(c);
        case 'javascript':
            return /readline/.test(c) || /process\.stdin/.test(c) || /prompt\s*\(/.test(c);
        case 'c':
        case 'cpp':
            return /scanf/.test(c) || /cin\s*>>/.test(c) || /getline/.test(c) || /gets/.test(c);
        case 'go':
            return /fmt\.Scan/.test(c) || /fmt\.Fscan/.test(c) || /reader\.ReadString/.test(c);
        default:
            return false;
    }
};

// Main App Component
function App() {

    const {
        sidebarOpen, toggleSidebar, openModal, addNotification, editorMinimized, toggleEditorMinimized,
        rightPanelOpen, toggleRightPanel, setRightPanelTab
    } = useUIStore();
    const { files, activeFileId, removeLastDrawing, clearDrawings, markFileSaved } = useFileStore();
    const { isExecuting, setExecuting, setOutput, setError, setExecutionTime, addToHistory, setShowOutput } = useExecutionStore();
    const { setConnected, setRepositories, isConnected } = useGitHubStore();
    const { experimental } = useSettingsStore();
    const [terminalOpen, setTerminalOpen] = useState(false);

    const [isController, setIsController] = useState(false);
    const [isBeingControlled, setIsBeingControlled] = useState(false);
    const [isScribbleMode, setIsScribbleMode] = useState(false);
    const [scribbleTool, setScribbleTool] = useState('pen');
    const [scribbleColor, setScribbleColor] = useState('#ff0000');

    // Memoize active file to prevent unnecessary re-computations
    const activeFile = useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);

    // Memoize open files for performance
    const openFiles = useMemo(() => files.filter(f => f.open), [files]);

    // Setup remote control listeners
    useEffect(() => {
        collaborationService.onGrantControl = () => {
            setIsController(true);
        };
        collaborationService.onRevokeControl = () => {
            setIsController(false);
            setIsBeingControlled(false);
        };

        // ESC key to stop controlling
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isController) {
                collaborationService.revokeControl();
                setIsController(false);
            }
        };
        document.addEventListener('keydown', handleEsc);

        return () => {
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isController]);

    // Resizable panel state
    const [rightPanelWidth, setRightPanelWidth] = useState(360);
    const [terminalHeight, setTerminalHeight] = useState(250);
    const [isResizing, setIsResizing] = useState(null); // 'right' or 'terminal'
    const mainRef = React.useRef(null);

    // Settings
    const { theme, backgroundImage, backgroundOpacity, uiFontSize, uiFontFamily } = useSettingsStore();

    // Apply Theme and UI Settings - Optimized with useCallback
    const applyThemeAndSettings = useCallback(() => {
        // Remove all theme classes first
        document.body.classList.remove('theme-light', 'theme-nord', 'theme-dracula', 'theme-solarized-light');

        // Apply theme class
        if (theme === 'light') document.body.classList.add('theme-light');
        else if (theme === 'nord') document.body.classList.add('theme-nord');
        else if (theme === 'dracula') document.body.classList.add('theme-dracula');
        else if (theme === 'solarized-light') document.body.classList.add('theme-solarized-light');

        // Apply UI Settings
        document.documentElement.style.fontSize = `${uiFontSize}px`;
        if (uiFontFamily) {
            document.documentElement.style.setProperty('--font-sans', uiFontFamily);
        }
    }, [theme, uiFontSize, uiFontFamily]);

    useEffect(() => {
        applyThemeAndSettings();
    }, [applyThemeAndSettings]);

    // Handle resize mouse events
    const handleMouseMove = useCallback((e) => {
        if (!isResizing || !mainRef.current) return;

        // Debounce resize operations for better performance
        const mainRect = mainRef.current.getBoundingClientRect();

        if (isResizing === 'right') {
            const newWidth = mainRect.right - e.clientX;
            setRightPanelWidth(Math.max(200, Math.min(800, newWidth)));
        } else if (isResizing === 'terminal') {
            const wrapperRect = mainRef.current.querySelector('.editor-terminal-wrapper')?.getBoundingClientRect();
            if (wrapperRect) {
                const newHeight = wrapperRect.bottom - e.clientY;
                setTerminalHeight(Math.max(100, Math.min(500, newHeight)));
            }
        }
    }, [isResizing]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    // Handle resize mouse events
    useEffect(() => {
        if (isResizing) {
            document.body.style.cursor = isResizing === 'right' ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    // Sync Scribble Mode with Experimental Settings
    useEffect(() => {
        const { experimental } = useSettingsStore.getState();
        if (!experimental?.scribble && isScribbleMode) {
            setIsScribbleMode(false);
        }
    }, [useSettingsStore.getState().experimental?.scribble, isScribbleMode]);

    // Handle GitHub OAuth callback
    useEffect(() => {
        const handleGitHubCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code && window.location.pathname.includes('callback/github')) {
                try {
                    // Exchange code for token
                    const response = await githubService.completeAuth(code);

                    if (response.access_token) {
                        githubService.setToken(response.access_token);
                        setConnected(true, response.user);

                        // Load repositories
                        const repos = await githubService.listRepositories();
                        setRepositories(repos);

                        addNotification({ type: 'success', message: `Connected to GitHub as ${response.user?.login}!` });
                    }

                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname.replace('/callback/github', '/'));
                } catch (error) {
                    console.error('GitHub auth failed:', error);
                    addNotification({ type: 'error', message: 'GitHub authentication failed' });
                }
            }

            // Check if already authenticated (token in localStorage)
            if (!isConnected && githubService.isAuthenticated()) {
                try {
                    const user = await githubService.getCurrentUser();
                    setConnected(true, user);
                    const repos = await githubService.listRepositories();
                    setRepositories(repos);
                } catch (error) {
                    // Token might be invalid, clear it
                    githubService.clearToken();
                }
            }
        };

        handleGitHubCallback();
    }, []);

    // Handle Social Media OAuth callbacks
    useEffect(() => {
        const handleSocialCallbacks = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            if (code && state) {
                const { connectLinkedIn, connectTwitter } = useSocialStore.getState();

                if (window.location.pathname.includes('callback/linkedin')) {
                    try {
                        const response = await authService.linkedinCallback(code, state);
                        if (response.user_id) {
                            connectLinkedIn({ id: response.user_id });
                            addNotification({ type: 'success', message: 'Connected to LinkedIn successfully!' });
                            setRightPanelTab('social');
                            if (!rightPanelOpen) toggleRightPanel();
                        }
                    } catch (error) {
                        console.error('LinkedIn auth failed:', error);
                        addNotification({ type: 'error', message: 'LinkedIn authentication failed' });
                    }
                    window.history.replaceState({}, document.title, '/');
                } else if (window.location.pathname.includes('callback/twitter')) {
                    try {
                        const response = await authService.twitterCallback(code, state);
                        if (response.username) {
                            connectTwitter({ username: response.username });
                            addNotification({ type: 'success', message: `Connected to Twitter as @${response.username}!` });
                            setRightPanelTab('social');
                            if (!rightPanelOpen) toggleRightPanel();
                        }
                    } catch (error) {
                        console.error('Twitter auth failed:', error);
                        addNotification({ type: 'error', message: 'Twitter authentication failed' });
                    }
                    window.history.replaceState({}, document.title, '/');
                }
            }
        };
        handleSocialCallbacks();
    }, []);

    const handleSaveAs = React.useCallback(() => {
        if (!activeFile) {
            addNotification({ type: 'error', message: 'No file selected to save' });
            return;
        }

        try {
            // Create a blob from the file content
            const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });

            // Create a download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = activeFile.name;

            // Trigger download
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            addNotification({ type: 'success', message: `File saved as ${activeFile.name}` });
            markFileSaved(activeFileId);
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to save file' });
            console.error('Save error:', error);
        }
    }, [activeFile, activeFileId, addNotification, markFileSaved]);

    const handleRunCode = React.useCallback(async () => {
        // activeFile is a derived value, so we should get it from state or depend on it
        // However, activeFile changes often (content), so depends on activeFile might cause re-renders
        // But for handleRunCode to be stable, we need to be careful.
        // Actually, if activeFile content changes, we WANT voiceCommands to update if it depends on handleRunCode?
        // Wait, if handleRunCode changes, voiceCommands changes (due to dependency).
        // If voiceCommands changes, useVoiceCommands updates ref (safe now).
        // So we mainly want to avoid handleRunCode changing on *every* render if nothing changed.

        // Retriving fresh state ref inside might be better to avoid dependencies, but activeFile is passed as prop/hook
        // Let's just wrap it for now.

        if (!activeFile) {
            addNotification({ type: 'error', message: 'No file selected to run' });
            return;
        }

        // Check for Web/React content to open Preview
        const isWeb = activeFile.language === 'html' ||
            (activeFile.language === 'javascript' && (
                activeFile.content.includes('import React') ||
                activeFile.content.includes('export default') ||
                activeFile.content.includes('document.') ||
                activeFile.content.includes('window.') ||
                activeFile.name.endsWith('.jsx')
            ));

        if (isWeb) {
            if (!rightPanelOpen) toggleRightPanel();
            setRightPanelTab('preview');
            // Store the "run" action in history or notification
            return;
        }

        setExecuting(true);
        setOutput('');
        setError(null);
        addNotification({ type: 'info', message: 'Starting execution...' });

        const startTime = Date.now();

        try {
            const { input } = useExecutionStore.getState();
            // Use activeFile directly
            const result = await executorService.execute(activeFile.content, activeFile.language, activeFile.name, input);
            const executionTime = Date.now() - startTime;
            setExecutionTime(executionTime);
            setShowOutput(true);

            if (result.success) {
                const outputStr = (typeof result.output === 'string' && result.output.length > 0)
                    ? result.output
                    : (result.output || 'Code executed successfully (no output)');
                setOutput(outputStr);
                addToHistory({
                    success: true,
                    language: activeFile.language,
                    output: outputStr
                });
            } else {
                const errorStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error || 'Execution failed', null, 2);
                setError(errorStr);
                addToHistory({
                    success: false,
                    language: activeFile.language,
                    error: errorStr
                });
            }
        } catch (error) {
            const executionTime = Date.now() - startTime;
            setExecutionTime(executionTime);
            setError(`Failed to execute: ${error.message}`);
            addToHistory({
                success: false,
                language: activeFile.language,
                error: error.message
            });
        }

        setExecuting(false);
    }, [activeFile, activeFileId, addNotification, rightPanelOpen, toggleRightPanel, setRightPanelTab, setExecuting, setOutput, setError, setExecutionTime, setShowOutput, addToHistory]);


    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header__brand">
                    <div className="header__logo">R</div>
                    <h1 className="header__title">Roolts</h1>
                </div>
                <div className="header__actions">
                    <button
                        className="btn btn--success"
                        onClick={handleRunCode}
                        disabled={isExecuting || !activeFile}
                        title="Run Code"
                    >
                        {isExecuting ? (
                            <><span className="spinner" /> Running...</>
                        ) : (
                            <><FiPlay /> Run</>
                        )}
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={handleSaveAs} title="Save As">
                        <FiSave />
                    </button>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => activeFile && saveFileToBackend(activeFile)}
                        title="Save to Workspace"
                        disabled={!activeFile || !activeFile.content}
                    >
                        <FiUploadCloud />
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={() => openModal('newFile')} title="New File">
                        <FiPlus />
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={() => openModal('settings')} title="Settings">
                        <FiSettings />
                    </button>



                </div>
            </header>

            {/* Main Content */}
            <main className={`main ${editorMinimized ? 'main--editor-minimized' : ''}`} ref={mainRef}>
                {/* Sidebar */}
                <aside className={`sidebar ${!sidebarOpen ? 'sidebar--collapsed' : ''}`}>
                    {sidebarOpen ? (
                        <>
                            <div className="sidebar__header">
                                <span className="sidebar__title">
                                    Explorer
                                    <span
                                        className="sync-indicator"
                                        style={{
                                            marginLeft: '8px',
                                            fontSize: '10px',
                                            opacity: 0.7,
                                            color: '#4caf50'
                                        }}
                                        title="File sync enabled"
                                    >
                                        🔄
                                    </span>
                                </span>
                                <button className="btn btn--ghost btn--icon" onClick={toggleSidebar}>
                                    <FiChevronLeft />
                                </button>
                            </div>
                            <div className="sidebar-content">
                                <FileExplorer />
                            </div>
                            <div className="sidebar-footer">
                                <button
                                    className={`sidebar-terminal-btn ${terminalOpen ? 'sidebar-terminal-btn--active' : ''}`}
                                    onClick={() => setTerminalOpen(!terminalOpen)}
                                    title="Toggle Terminal"
                                >
                                    <FiTerminal size={16} />
                                    <span>Terminal</span>
                                    {terminalOpen && <FiChevronRight size={14} style={{ marginLeft: 'auto', transform: 'rotate(90deg)' }} />}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="sidebar-collapsed-buttons">
                            <button
                                className="btn btn--ghost btn--icon"
                                onClick={toggleSidebar}
                                title="Expand Explorer"
                            >
                                <FiChevronRight />
                            </button>
                            <button
                                className={`btn btn--ghost btn--icon ${terminalOpen ? 'btn--active' : ''}`}
                                onClick={() => setTerminalOpen(!terminalOpen)}
                                title="Toggle Terminal"
                            >
                                <FiTerminal />
                            </button>
                        </div>
                    )}
                </aside>

                {/* Editor and Terminal Area */}
                <div className={`editor-terminal-wrapper ${editorMinimized ? 'editor-terminal-wrapper--minimized' : ''}`}>
                    {/* Editor */}
                    <div className={`editor-container ${editorMinimized ? 'editor-container--minimized' : ''} ${terminalOpen ? 'editor-container--with-terminal' : ''}`}>
                        {editorMinimized ? (
                            <div className="editor-minimized-bar">
                                <button
                                    className="editor-minimized-bar__btn"
                                    onClick={toggleEditorMinimized}
                                    title="Expand Editor"
                                >
                                    <FiCode /> Editor
                                </button>
                            </div>
                        ) : (
                            <>
                                <EditorTabs
                                    isScribbleMode={isScribbleMode}
                                    toggleScribbleMode={() => setIsScribbleMode(!isScribbleMode)}
                                    scribbleTool={scribbleTool}
                                    setScribbleTool={setScribbleTool}
                                    scribbleColor={scribbleColor}
                                    setScribbleColor={setScribbleColor}
                                    onUndo={() => activeFileId && removeLastDrawing(activeFileId)}
                                    onClear={() => activeFileId && clearDrawings(activeFileId)}
                                />
                                <CodeEditor
                                    isScribbleMode={isScribbleMode}
                                    scribbleTool={scribbleTool}
                                    scribbleColor={scribbleColor}
                                />
                            </>
                        )}
                    </div>

                    {/* Terminal Bottom Panel */}
                    {terminalOpen && (
                        <>
                            <div
                                className={`resize-handle resize-handle--vertical ${isResizing === 'terminal' ? 'resize-handle--active' : ''}`}
                                onMouseDown={() => setIsResizing('terminal')}
                            />
                            <div className="terminal-bottom-panel" style={{ height: terminalHeight }}>
                                <div className="terminal-panel-header">
                                    <div className="terminal-panel-tabs">
                                        <button className="terminal-panel-tab terminal-panel-tab--active">
                                            <FiTerminal size={14} /> Terminal
                                        </button>
                                    </div>
                                    <button
                                        className="btn btn--ghost btn--icon"
                                        onClick={() => setTerminalOpen(false)}
                                        title="Close Terminal"
                                    >
                                        <FiX size={14} />
                                    </button>
                                </div>
                                <TerminalPanel />
                            </div>
                        </>
                    )}
                </div>

                {/* Resize Handle for Right Panel */}
                <div
                    className={`resize-handle resize-handle--horizontal ${isResizing === 'right' ? 'resize-handle--active' : ''}`}
                    onMouseDown={() => setIsResizing('right')}
                />

                {/* Right Panel */}
                <RightPanel style={{ width: rightPanelWidth }} editorMinimized={editorMinimized} />
            </main>

            {/* Status Bar */}
            <StatusBar />

            {/* Modals */}
            <HighlightModal />
            <NewFileModal />
            <SettingsModal />
            <PortfolioGeneratorModal />
            <DeploymentModalComponent />

            {/* Data Sychronization */}
            <Suspense fallback={<div>Loading sync...</div>}>
                <SyncManager />
            </Suspense>

            {/* Notifications */}
            <Notifications />

            {/* Remote Control Overlay */}
            <Suspense fallback={<div>Loading remote control...</div>}>
                <RemoteControlOverlay
                    isController={isController}
                    isBeingControlled={isBeingControlled}
                    onControlEnd={() => {
                        setIsController(false);
                        setIsBeingControlled(false);
                    }}
                />
            </Suspense>

            {/* Scribble Overlay */}
            {isScribbleMode && (
                <Suspense fallback={<div>Loading scribble...</div>}>
                    <ScribbleOverlay />
                </Suspense>
            )}
        </div>
    );
}

export default App;
