/**
 * Integrated File Sync Environment
 * VS Code-like interface with real-time file synchronization
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
    FiFile,
    FiFolder,
    FiSave,
    FiX,
    FiTerminal,
    FiRefreshCw,
    FiMaximize2,
    FiMinimize2,
    FiSidebar
} from 'react-icons/fi';

import FileExplorer from './FileExplorer';
import Terminal from './Terminal';
import { useFileSyncStore } from '../store/fileSyncStore';
import { fileSyncService } from '../services/fileSyncService';

// Import CSS
import './FileExplorer.css';
import './Terminal.css';

const FileSyncEnvironment = () => {
    // File sync store
    const {
        files,
        openFiles,
        activeFileId,
        fileTree,
        isLoading,
        isSyncing,
        syncErrors,
        hasUnsavedChanges,
        getActiveFile,
        loadFileTree,
        loadFile,
        saveFile,
        updateFileContent,
        closeFile,
        setActiveFile,
        clearSyncErrors
    } = useFileSyncStore();

    // Component state
    const [showFileExplorer, setShowFileExplorer] = useState(true);
    const [showTerminal, setShowTerminal] = useState(false);
    const [terminalHeight, setTerminalHeight] = useState(300);
    const [layout, setLayout] = useState('horizontal'); // 'horizontal' or 'vertical'
    const [editorOptions, setEditorOptions] = useState({
        theme: 'vs-dark',
        fontSize: 14,
        minimap: { enabled: true },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        lineNumbers: 'on',
        formatOnSave: true,
        autoSave: 'afterDelay',
        autoSaveDelay: 1000
    });

    // Refs
    const editorRef = useRef(null);
    const resizeRef = useRef(null);

    // Initialize file sync service
    useEffect(() => {
        const initializeFileSync = async () => {
            try {
                await fileSyncService.initializeRealTime();
                await loadFileTree();

                // Set up real-time event handlers
                fileSyncService.on('fileUpdated', handleFileUpdated);
                fileSyncService.on('fileCreated', handleFileCreated);
                fileSyncService.on('fileDeleted', handleFileDeleted);
                fileSyncService.on('fileRenamed', handleFileRenamed);

            } catch (error) {
                console.error('Failed to initialize file sync:', error);
            }
        };

        initializeFileSync();

        // Cleanup
        return () => {
            fileSyncService.off('fileUpdated', handleFileUpdated);
            fileSyncService.off('fileCreated', handleFileCreated);
            fileSyncService.off('fileDeleted', handleFileDeleted);
            fileSyncService.off('fileRenamed', handleFileRenamed);
        };
    }, []);

    // Handle real-time file updates
    const handleFileUpdated = useCallback((data) => {
        console.log('Real-time file update:', data.path);
        // Reload the file if it's currently open
        const openFile = files.find(f => f.path === data.path);
        if (openFile && !openFile.modified) {
            loadFile(data.path);
        }
    }, [files]);

    const handleFileCreated = useCallback((data) => {
        console.log('Real-time file created:', data.path);
        loadFileTree();
    }, []);

    const handleFileDeleted = useCallback((data) => {
        console.log('Real-time file deleted:', data.path);
        closeFile(data.path);
        loadFileTree();
    }, []);

    const handleFileRenamed = useCallback((data) => {
        console.log('Real-time file renamed:', data.oldPath, '->', data.newPath);
        // Handle file rename in open files
        const openFile = files.find(f => f.path === data.oldPath);
        if (openFile) {
            closeFile(data.oldPath);
        }
        loadFileTree();
    }, [files]);

    // Handle file selection from explorer
    const handleFileSelect = async (fileData) => {
        if (fileData && !fileData.isDirectory) {
            await loadFile(fileData.path);
        }
    };

    // Handle file opening from explorer
    const handleFileOpen = (fileData) => {
        setActiveFile(fileData.id);
    };

    // Handle editor content change
    const handleEditorChange = (value) => {
        if (activeFileId && value !== undefined) {
            updateFileContent(activeFileId, value, true);
        }
    };

    // Save current file
    const handleSaveFile = async () => {
        if (activeFileId) {
            const success = await saveFile(activeFileId);
            if (success) {
                console.log('File saved successfully');
            }
        }
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Ctrl+S or Cmd+S - Save file
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                handleSaveFile();
            }

            // Ctrl+` - Toggle terminal
            if ((event.ctrlKey || event.metaKey) && event.key === '`') {
                event.preventDefault();
                setShowTerminal(prev => !prev);
            }

            // Ctrl+B - Toggle sidebar
            if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                event.preventDefault();
                setShowFileExplorer(prev => !prev);
            }

            // Ctrl+W - Close tab
            if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
                if (activeFileId) {
                    event.preventDefault();
                    closeFile(activeFileId);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeFileId]);

    // Handle terminal resize
    const handleTerminalResize = useCallback((e) => {
        if (!resizeRef.current) return;

        const startY = e.clientY;
        const startHeight = terminalHeight;

        const handleMouseMove = (e) => {
            const newHeight = startHeight - (e.clientY - startY);
            const minHeight = 150;
            const maxHeight = window.innerHeight * 0.7;

            setTerminalHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [terminalHeight]);

    // Get current file
    const currentFile = getActiveFile();

    // Configure Monaco Editor
    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;

        // Configure editor options
        editor.updateOptions(editorOptions);

        // Set up custom key bindings
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            handleSaveFile();
        });

        // Set up auto-save
        let autoSaveTimeout;
        editor.onDidChangeModelContent(() => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                if (editorOptions.autoSave === 'afterDelay') {
                    handleSaveFile();
                }
            }, editorOptions.autoSaveDelay);
        });
    };

    return (
        <div className="file-sync-environment">
            {/* Header Bar */}
            <div className="environment-header">
                <div className="header-left">
                    <button
                        className="header-btn"
                        onClick={() => setShowFileExplorer(!showFileExplorer)}
                        title="Toggle Sidebar"
                    >
                        <FiSidebar />
                    </button>
                    <span className="environment-title">Roolts IDE</span>
                </div>

                <div className="header-center">
                    {/* File Tabs */}
                    <div className="file-tabs">
                        {openFiles.map(fileId => {
                            const file = files.find(f => f.id === fileId);
                            if (!file) return null;

                            return (
                                <div
                                    key={fileId}
                                    className={`file-tab ${fileId === activeFileId ? 'active' : ''} ${file.modified ? 'modified' : ''}`}
                                    onClick={() => setActiveFile(fileId)}
                                >
                                    <FiFile className="tab-icon" />
                                    <span className="tab-name">{file.name}</span>
                                    {file.modified && <span className="modified-indicator">●</span>}
                                    <button
                                        className="tab-close"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            closeFile(fileId);
                                        }}
                                    >
                                        <FiX />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="header-right">
                    <button
                        className="header-btn"
                        onClick={handleSaveFile}
                        disabled={!currentFile?.modified || isSyncing}
                        title="Save File (Ctrl+S)"
                    >
                        <FiSave />
                    </button>
                    <button
                        className="header-btn"
                        onClick={() => setShowTerminal(!showTerminal)}
                        title="Toggle Terminal (Ctrl+`)"
                    >
                        <FiTerminal />
                    </button>
                    <button
                        className="header-btn"
                        onClick={loadFileTree}
                        disabled={isLoading}
                        title="Refresh"
                    >
                        <FiRefreshCw className={isLoading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* Status Bar */}
            <div className="status-bar">
                <div className="status-left">
                    <span className={`sync-status ${fileSyncService.isConnected() ? 'connected' : 'disconnected'}`}>
                        {fileSyncService.isConnected() ? '🟢 Synced' : '🔴 Offline'}
                    </span>
                    {isSyncing && (
                        <span className="syncing">
                            <FiRefreshCw className="spinning" /> Syncing...
                        </span>
                    )}
                    {hasUnsavedChanges() && (
                        <span className="unsaved-changes">● Unsaved changes</span>
                    )}
                </div>

                <div className="status-center">
                    {currentFile && (
                        <>
                            <span>📁 {currentFile.path}</span>
                            <span>│</span>
                            <span>💾 {currentFile.size} bytes</span>
                            <span>│</span>
                            <span>🔤 {currentFile.language}</span>
                        </>
                    )}
                </div>

                <div className="status-right">
                    <span>{new Date().toLocaleTimeString()}</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="main-content">
                {/* Sidebar */}
                {showFileExplorer && (
                    <div className="sidebar">
                        <FileExplorer
                            onFileSelect={handleFileSelect}
                            onFileOpen={handleFileOpen}
                            selectedFile={currentFile}
                            className="file-explorer-panel"
                        />
                    </div>
                )}

                {/* Editor Area */}
                <div className="editor-area">
                    {currentFile ? (
                        <div className="editor-container">
                            <Editor
                                height={showTerminal ? `calc(100% - ${terminalHeight}px)` : '100%'}
                                language={currentFile.language}
                                value={currentFile.content}
                                onChange={handleEditorChange}
                                onMount={handleEditorDidMount}
                                theme={editorOptions.theme}
                                options={editorOptions}
                            />

                            {/* Terminal Resize Handle */}
                            {showTerminal && (
                                <div
                                    ref={resizeRef}
                                    className="terminal-resize-handle"
                                    onMouseDown={handleTerminalResize}
                                />
                            )}

                            {/* Terminal */}
                            {showTerminal && (
                                <div
                                    className="terminal-container"
                                    style={{ height: terminalHeight }}
                                >
                                    <Terminal
                                        isVisible={showTerminal}
                                        onToggle={setShowTerminal}
                                        onFileChange={loadFileTree}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="editor-placeholder">
                            <div className="placeholder-content">
                                <FiFile size={48} />
                                <h3>No File Open</h3>
                                <p>Select a file from the explorer to start editing</p>
                                <button onClick={loadFileTree} className="refresh-btn">
                                    <FiRefreshCw /> Refresh File Explorer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Notifications */}
            {syncErrors.length > 0 && (
                <div className="error-notifications">
                    {syncErrors.map(error => (
                        <div key={error.id} className="error-notification">
                            <span>⚠️ {error.message}</span>
                            <button onClick={clearSyncErrors}>×</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileSyncEnvironment;