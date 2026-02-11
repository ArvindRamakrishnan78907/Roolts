/**
 * File Explorer Component
 * VS Code-like file tree with real-time sync and terminal integration
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FiFile,
    FiFolder,
    FiFolderMinus,
    FiPlus,
    FiRefreshCw,
    FiSearch,
    FiMoreVertical,
    FiEdit3,
    FiTrash2,
    FiCopy,
    FiDownload,
    FiUpload,
    FiTerminal,
    FiChevronRight,
    FiChevronDown
} from 'react-icons/fi';
import { fileSyncService } from '../services/fileSyncService';
import { terminalService } from '../services/terminalService';

const FileExplorer = ({ onFileSelect, onFileOpen, selectedFile, className = '' }) => {
    const [fileTree, setFileTree] = useState(null);
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [newItemModal, setNewItemModal] = useState(null);
    const [renameItem, setRenameItem] = useState(null);

    const contextMenuRef = useRef(null);
    const searchInputRef = useRef(null);
    const refreshTimeoutRef = useRef(null);

    // Clean up fileTree duplicates when it changes
    useEffect(() => {
        if (fileTree && Array.isArray(fileTree)) {
            const seenPaths = new Set();
            const uniqueTree = [];
            for (const item of fileTree) {
                if (!seenPaths.has(item.path)) {
                    seenPaths.add(item.path);
                    uniqueTree.push(item);
                }
            }
            if (uniqueTree.length !== fileTree.length) {
                setFileTree(uniqueTree);
            }
        }
    }, [fileTree]);

    // Initialize file sync service and load initial data
    useEffect(() => {
        const initializeFileSync = async () => {
            try {
                // Initialize real-time connection
                await fileSyncService.initializeRealTime();

                // Set up event listeners
                fileSyncService.on('fileUpdated', handleFileUpdated);
                fileSyncService.on('fileCreated', handleFileCreated);
                fileSyncService.on('fileDeleted', handleFileDeleted);
                fileSyncService.on('directoryCreated', handleDirectoryCreated);
                fileSyncService.on('directoryDeleted', handleDirectoryDeleted);
                fileSyncService.on('fileRenamed', handleFileRenamed);
                fileSyncService.on('directoryRenamed', handleDirectoryRenamed);

                // Load initial file tree
                await refreshFileTree();
            } catch (error) {
                console.error('Failed to initialize file sync:', error);
                setError('Failed to connect to file sync service');
            }
        };

        initializeFileSync();

        return () => {
            // Cleanup event listeners
            fileSyncService.off('fileUpdated', handleFileUpdated);
            fileSyncService.off('fileCreated', handleFileCreated);
            fileSyncService.off('fileDeleted', handleFileDeleted);
            fileSyncService.off('directoryCreated', handleDirectoryCreated);
            fileSyncService.off('directoryDeleted', handleDirectoryDeleted);
            fileSyncService.off('fileRenamed', handleFileRenamed);
            fileSyncService.off('directoryRenamed', handleDirectoryRenamed);

            // Clear any pending refresh timeout
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, []);

    // Handle real-time file updates
    const handleFileUpdated = useCallback((data) => {
        console.log('📝 File updated:', data.path);
        refreshFileTree();
    }, []);

    const handleFileCreated = useCallback((data) => {
        console.log('📄 File created:', data.path);
        refreshFileTree();
    }, []);

    const handleFileDeleted = useCallback((data) => {
        console.log('🗑️ File deleted:', data.path);
        refreshFileTree();
    }, []);

    const handleDirectoryCreated = useCallback((data) => {
        console.log('📁 Directory created:', data.path);
        refreshFileTree();
    }, []);

    const handleDirectoryDeleted = useCallback((data) => {
        console.log('🗑️ Directory deleted:', data.path);
        refreshFileTree();
    }, []);

    const handleFileRenamed = useCallback((data) => {
        console.log('✏️ File renamed:', data.oldPath, '->', data.newPath);
        refreshFileTree();
    }, []);

    const handleDirectoryRenamed = useCallback((data) => {
        console.log('✏️ Directory renamed:', data.oldPath, '->', data.newPath);
        refreshFileTree();
    }, []);

    // Load file tree from backend
    const refreshFileTree = async () => {
        if (loading) return; // Prevent concurrent refreshes

        // Clear any pending refresh
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }

        // Debounce the refresh to avoid multiple rapid calls
        refreshTimeoutRef.current = setTimeout(async () => {
            try {
                setLoading(true);
                const result = await fileSyncService.getFileTree();

                if (result.success) {
                    setFileTree(result.data.tree);
                    setError(null);
                } else {
                    setError(result.error);
                }
            } catch (error) {
                setError('Failed to load file tree');
                console.error('Error loading file tree:', error);
            } finally {
                setLoading(false);
            }
        }, 100); // 100ms debounce
    };

    // Search files
    const handleSearch = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        try {
            setIsSearching(true);
            const result = await fileSyncService.searchFiles(query, {
                searchContent: true,
                limit: 50
            });

            if (result.success) {
                setSearchResults(result.data.results);
            } else {
                setError(result.error);
            }
        } catch (error) {
            setError('Search failed');
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Toggle folder expansion
    const toggleFolder = (path) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedFolders(newExpanded);
    };

    // Handle file/folder selection
    const handleItemClick = async (item, event) => {
        event.stopPropagation();

        if (item.isDirectory) {
            toggleFolder(item.path);
        } else {
            // Load file content and pass to parent
            try {
                const result = await fileSyncService.readFile(item.path);
                if (result.success) {
                    const fileData = {
                        id: item.path,
                        name: item.name,
                        path: item.path,
                        content: result.data.content,
                        language: getLanguageFromExtension(item.extension),
                        modified: false,
                        encoding: result.data.encoding,
                        size: result.data.size,
                        lastModified: result.data.modified
                    };

                    if (onFileSelect) onFileSelect(fileData);
                    if (onFileOpen) onFileOpen(fileData);
                } else {
                    setError(`Failed to load file: ${result.error}`);
                }
            } catch (error) {
                setError(`Failed to load file: ${error.message}`);
            }
        }
    };

    // Handle context menu
    const handleContextMenu = (event, item) => {
        event.preventDefault();
        event.stopPropagation();

        setContextMenu({
            x: event.clientX,
            y: event.clientY,
            item
        });
    };

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
                setContextMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Create new file or folder
    const handleCreateItem = async (type, name, parent = '') => {
        try {
            const path = parent ? `${parent}/${name}` : name;
            const result = await fileSyncService.createItem(path, type);

            if (result.success) {
                // Expand parent folder if creating within a folder
                if (parent) {
                    setExpandedFolders(prev => new Set([...prev, parent]));
                }
                refreshFileTree();
                setNewItemModal(null);
            } else {
                setError(result.error);
            }
        } catch (error) {
            setError(`Failed to create ${type}: ${error.message}`);
        }
    };

    // Delete item
    const handleDeleteItem = async (path) => {
        if (window.confirm(`Are you sure you want to delete "${path}"?`)) {
            try {
                const result = await fileSyncService.deleteItem(path);
                if (result.success) {
                    refreshFileTree();
                } else {
                    setError(result.error);
                }
            } catch (error) {
                setError(`Failed to delete: ${error.message}`);
            }
        }
        setContextMenu(null);
    };

    // Rename item
    const handleRenameItem = async (oldPath, newName) => {
        try {
            const pathParts = oldPath.split('/');
            pathParts[pathParts.length - 1] = newName;
            const newPath = pathParts.join('/');

            const result = await fileSyncService.renameItem(oldPath, newPath);
            if (result.success) {
                refreshFileTree();
                setRenameItem(null);
            } else {
                setError(result.error);
            }
        } catch (error) {
            setError(`Failed to rename: ${error.message}`);
        }
    };

    // Open in terminal
    const handleOpenInTerminal = async (path) => {
        try {
            const isDirectory = contextMenu.item.isDirectory;
            const terminalPath = isDirectory ? path : path.substring(0, path.lastIndexOf('/'));

            await terminalService.setCwd(terminalPath);
            setContextMenu(null);

            // You can emit an event or call a callback to focus terminal
            if (window.focusTerminal) {
                window.focusTerminal();
            }
        } catch (error) {
            setError(`Failed to open in terminal: ${error.message}`);
        }
    };

    // Get language from file extension
    const getLanguageFromExtension = (extension) => {
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
    };

    // Get file icon based on extension
    const getFileIcon = (item) => {
        if (item.isDirectory) {
            return expandedFolders.has(item.path) ? <FiFolderMinus /> : <FiFolder />;
        }
        return <FiFile />;
    };

    // Render file tree recursively
    const renderFileTree = (items, level = 0) => {
        if (!items || !Array.isArray(items)) return null;

        // Remove duplicate paths to prevent repeated files
        const uniqueItems = items.filter((item, index, arr) =>
            arr.findIndex(i => i.path === item.path) === index
        );

        return uniqueItems.map((item) => {
            const isExpanded = expandedFolders.has(item.path);
            const isSelected = selectedFile?.path === item.path;

            return (
                <div key={item.path} className="file-item-container">
                    <div
                        className={`file-item ${isSelected ? 'selected' : ''}`}
                        style={{ paddingLeft: `${level * 16 + 8}px` }}
                        onClick={(e) => handleItemClick(item, e)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                    >
                        <div className="file-item-content">
                            {item.isDirectory && (
                                <span className="folder-chevron">
                                    {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                                </span>
                            )}
                            <span className="file-icon">
                                {getFileIcon(item)}
                            </span>
                            <span className="file-name">{item.name}</span>
                        </div>
                    </div>

                    {item.isDirectory && isExpanded && item.children && (
                        <div className="folder-children">
                            {renderFileTree(item.children, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    // Render search results
    const renderSearchResults = () => {
        if (!searchResults.length) {
            return <div className="search-no-results">No results found</div>;
        }

        // Remove duplicate paths to prevent repeated files
        const uniqueResults = searchResults.filter((item, index, arr) =>
            arr.findIndex(i => i.path === item.path) === index
        );

        return uniqueResults.map((item, index) => (
            <div
                key={`${item.path}-${index}`}
                className="search-result-item"
                onClick={() => handleItemClick(item)}
            >
                <span className="file-icon">{getFileIcon(item)}</span>
                <div className="search-result-info">
                    <div className="file-name">{item.name}</div>
                    <div className="file-path">{item.path}</div>
                    {item.matchType && (
                        <div className="match-type">{item.matchType} match</div>
                    )}
                </div>
            </div>
        ));
    };

    return (
        <div className={`file-explorer ${className}`}>
            {/* Header */}
            <div className="file-explorer-header">
                <div className="header-title">
                    <FiFolder />
                    <span>Explorer</span>
                </div>
                <div className="header-actions">
                    <button
                        className="header-btn"
                        onClick={() => setNewItemModal({ type: 'file', parent: '' })}
                        title="New File"
                    >
                        <FiPlus />
                    </button>
                    <button
                        className="header-btn"
                        onClick={refreshFileTree}
                        title="Refresh"
                        disabled={loading}
                    >
                        <FiRefreshCw className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="file-search">
                <div className="search-input-container">
                    <FiSearch className="search-icon" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleSearch(e.target.value);
                        }}
                        className="search-input"
                    />
                </div>

                {isSearching && <div className="search-loading">Searching...</div>}

                {searchQuery && (
                    <div className="search-results">
                        {renderSearchResults()}
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* File Tree */}
            <div className="file-tree">
                {loading ? (
                    <div className="loading">Loading files...</div>
                ) : searchQuery ? null : (
                    <div className="tree-content">
                        {renderFileTree(fileTree)}
                    </div>
                )}
            </div>

            {/* Connection Status */}
            <div className="connection-status">
                <span className={`status-indicator ${fileSyncService.isConnected() ? 'connected' : 'disconnected'}`}>
                    ●
                </span>
                <span className="status-text">
                    {fileSyncService.isConnected() ? 'Synced' : 'Disconnected'}
                </span>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.item.isDirectory ? (
                        <>
                            <button onClick={() => setNewItemModal({ type: 'file', parent: contextMenu.item.path })}>
                                <FiFile /> New File
                            </button>
                            <button onClick={() => setNewItemModal({ type: 'directory', parent: contextMenu.item.path })}>
                                <FiFolder /> New Folder
                            </button>
                            <div className="menu-separator" />
                        </>
                    ) : null}

                    <button onClick={() => setRenameItem(contextMenu.item)}>
                        <FiEdit3 /> Rename
                    </button>
                    <button onClick={() => handleDeleteItem(contextMenu.item.path)}>
                        <FiTrash2 /> Delete
                    </button>
                    <div className="menu-separator" />
                    <button onClick={() => handleOpenInTerminal(contextMenu.item.path)}>
                        <FiTerminal /> Open in Terminal
                    </button>
                </div>
            )}

            {/* New Item Modal */}
            {newItemModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Create New {newItemModal.type}</h3>
                        <input
                            type="text"
                            placeholder={`${newItemModal.type} name`}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const name = e.target.value.trim();
                                    if (name) {
                                        handleCreateItem(newItemModal.type, name, newItemModal.parent);
                                    }
                                } else if (e.key === 'Escape') {
                                    setNewItemModal(null);
                                }
                            }}
                        />
                        <div className="modal-actions">
                            <button onClick={() => setNewItemModal(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {renameItem && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Rename {renameItem.isDirectory ? 'Folder' : 'File'}</h3>
                        <input
                            type="text"
                            defaultValue={renameItem.name}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const newName = e.target.value.trim();
                                    if (newName && newName !== renameItem.name) {
                                        handleRenameItem(renameItem.path, newName);
                                    } else {
                                        setRenameItem(null);
                                    }
                                } else if (e.key === 'Escape') {
                                    setRenameItem(null);
                                }
                            }}
                        />
                        <div className="modal-actions">
                            <button onClick={() => setRenameItem(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileExplorer;