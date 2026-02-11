import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiX, FiTrash2, FiEdit3, FiFilePlus, FiFolder } from 'react-icons/fi';
import { useFileStore, useUIStore } from '../store';
import FileItem from './FileItem';

function FileExplorer() {
    const { files, activeFileId, openFile, deleteFile, renameFile, addFile, openFiles, closeFile, closeFiles, deleteFiles } = useFileStore();
    const { openModal, addNotification } = useUIStore();
    const [renamingId, setRenamingId] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

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
                const result = addFile(file.name, content, language);
                if (result) {
                    uploadedCount++;
                } else {
                    addNotification({ type: 'warning', message: `Skipped duplicate file: ${file.name}` });
                }
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
                const result = addFile(name, content, language);
                if (result) {
                    uploadedCount++;
                } else {
                    console.warn(`Skipped duplicate file: ${name}`);
                }
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
            const success = renameFile(fileId, newName);
            if (!success) {
                addNotification({ type: 'error', message: `File "${newName}" already exists.` });
            }
        }
        setRenamingId(null);
    }, [renameFile, addNotification]);

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

    const handleDeleteBelow = useCallback((fileId) => {
        const fileList = Array.isArray(files) ? files : [];
        const index = fileList.findIndex(f => f.id === fileId);
        if (index !== -1 && index < fileList.length - 1) {
            const filesBelow = fileList.slice(index + 1);
            const idsToDelete = filesBelow.map(f => f.id);

            if (idsToDelete.length > 0) {
                if (window.confirm(`Are you sure you want to delete ${idsToDelete.length} files below?`)) {
                    deleteFiles(idsToDelete);
                }
            }
        }
        setContextMenu(null);
    }, [files, deleteFiles]);

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
                        onClick={() => openModal('newFile')}
                        title="New File"
                        style={{ padding: '4px' }}
                    >
                        <FiPlus size={14} />
                    </button>
                </div>
            </div>
            {(files || []).map((file) => (
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
                            deleteFile(contextMenu.fileId);
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

export default FileExplorer;
