import React from 'react';
import { FiX } from 'react-icons/fi';

const EditorTab = React.memo(({ file, activeFileId, showOutput, setActiveFile, setShowOutput, closeFile, handleContextMenu, draggable, onDragStart, onDragOver, onDrop }) => {
    return (
        <div
            className={`editor-tab ${activeFileId === file.id && !showOutput ? 'editor-tab--active' : ''}`}
            onClick={() => { setActiveFile(file.id); setShowOutput(false); }}
            onContextMenu={(e) => handleContextMenu(e, file.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    setActiveFile(file.id);
                    setShowOutput(false);
                }
            }}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none'
            }}
        >
            <span>{file.name}</span>
            <span
                className="editor-tab__close"
                onClick={(e) => {
                    e.stopPropagation();
                    closeFile(file.id);
                }}
                style={{ display: 'flex', alignItems: 'center' }}
            >
                <FiX size={12} />
            </span>
        </div>
    );
});

export default EditorTab;
