import React from 'react';
import { FiX } from 'react-icons/fi';

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

export default EditorTab;
