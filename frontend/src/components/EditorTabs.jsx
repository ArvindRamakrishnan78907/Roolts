import React from 'react';
import { FiTerminal, FiX, FiTrash2, FiEdit3, FiRotateCcw, FiEdit2, FiCheckCircle } from 'react-icons/fi';
import { LuEraser } from 'react-icons/lu';
import { useFileStore, useExecutionStore, useSettingsStore, useUIStore } from '../store';
import EditorTab from './EditorTab';

function EditorTabs({ isScribbleMode, toggleScribbleMode, scribbleTool, setScribbleTool, scribbleColor, setScribbleColor, onUndo, onClear }) {
    const { files, openFiles, activeFileId, setActiveFile, closeFile, closeFiles } = useFileStore();
    const { showOutput, setShowOutput } = useExecutionStore();
    const { experimental } = useSettingsStore();
    const { addNotification } = useUIStore();

    const openFilesData = (Array.isArray(files) && Array.isArray(openFiles))
        ? openFiles.map((id) => files.find((f) => f.id === id)).filter(Boolean)
        : [];

    const handleCloseRight = (fileId) => {
        const index = openFiles.indexOf(fileId);
        if (index !== -1 && index < openFiles.length - 1) {
            const filesToClose = openFiles.slice(index + 1);
            if (filesToClose.length > 0) {
                closeFiles(filesToClose);
            }
        }
    };

    const handleCloseOthers = (fileId) => {
        const filesToClose = openFiles.filter(id => id !== fileId);
        if (filesToClose.length > 0) {
            closeFiles(filesToClose);
        }
    };

    const handleUndo = () => {
        onUndo();
        addNotification({ type: 'info', message: 'Last scribble undone' });
    };

    const handleClear = () => {
        onClear();
        addNotification({ type: 'success', message: 'All scribbles cleared' });
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
                    handleContextMenu={() => { }} // Placeholder for now or add if needed
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

            {experimental?.scribble && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', paddingRight: '8px' }}>
                    {isScribbleMode && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--bg-tertiary)',
                            padding: '2px 10px',
                            borderRadius: '20px',
                            border: '1px solid var(--border-primary)',
                            boxShadow: 'var(--shadow-lg)',
                            animation: 'slideInRight 0.3s ease'
                        }}>
                            <button
                                className={`btn btn--icon ${scribbleTool === 'pen' ? 'btn--active' : ''}`}
                                onClick={() => setScribbleTool('pen')}
                                style={{ width: '28px', height: '28px', background: scribbleTool === 'pen' ? 'var(--accent-primary)' : 'transparent' }}
                                title="Pen Tool (P)"
                            >
                                <FiEdit2 size={15} color={scribbleTool === 'pen' ? 'white' : 'inherit'} />
                            </button>
                            <button
                                className={`btn btn--icon ${scribbleTool === 'eraser' ? 'btn--active' : ''}`}
                                onClick={() => setScribbleTool('eraser')}
                                style={{ width: '28px', height: '28px', background: scribbleTool === 'eraser' ? 'var(--accent-primary)' : 'transparent' }}
                                title="Eraser Tool (E)"
                            >
                                <LuEraser size={18} color={scribbleTool === 'eraser' ? 'white' : 'inherit'} />
                            </button>

                            <div style={{ width: '1px', height: '20px', background: 'var(--border-primary)', margin: '0 6px' }} />

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['#ff4b2b', '#ffb347', '#00f2fe', '#4facfe', '#a8e063', '#ffffff'].map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setScribbleColor(color)}
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: color,
                                            border: scribbleColor === color ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                                            boxShadow: scribbleColor === color ? `0 0 10px ${color}` : 'none',
                                            cursor: 'pointer',
                                            padding: 0,
                                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                        }}
                                        className="color-btn"
                                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                    />
                                ))}
                            </div>

                            <div style={{ width: '1px', height: '20px', background: 'var(--border-primary)', margin: '0 6px' }} />

                            <button className="btn btn--icon" onClick={handleUndo} style={{ width: '28px', height: '28px' }} title="Undo (Ctrl+Z)">
                                <FiRotateCcw size={15} />
                            </button>
                            <button className="btn btn--icon" onClick={handleClear} style={{ width: '28px', height: '28px', color: 'var(--error)' }} title="Clear All Drawings">
                                <FiTrash2 size={16} />
                            </button>
                        </div>
                    )}
                    <button
                        className={`btn btn--icon ${isScribbleMode ? 'btn--active' : ''}`}
                        onClick={toggleScribbleMode}
                        style={{
                            border: '1px solid var(--border-primary)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            background: isScribbleMode ? 'var(--accent-primary)' : 'transparent',
                            color: isScribbleMode ? 'white' : 'var(--text-primary)',
                            boxShadow: isScribbleMode ? 'var(--shadow-glow)' : 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        title={isScribbleMode ? "Exit Scribble Mode" : "Scribble on Code"}
                    >
                        <FiEdit3 size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default EditorTabs;
