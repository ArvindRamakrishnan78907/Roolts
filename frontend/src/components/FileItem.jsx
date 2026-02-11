import React from 'react';
import { FiX } from 'react-icons/fi';
import { getFileIcon } from '../services/iconHelper';

const FileItem = React.memo(({ file, activeFileId, renamingId, openFile, handleContextMenu, handleRename, deleteFile, setRenamingId }) => {
    return (
        <div
            className={`file-item ${activeFileId === file.id ? 'file-item--active' : ''}`}
            onClick={() => openFile(file.id)}
            onContextMenu={(e) => handleContextMenu(e, file.id)}
        >
            <span className="file-item__icon">{getFileIcon(file.language)}</span>

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
                    deleteFile(file.id);
                }}
                title="Delete File"
            >
                <FiX size={12} />
            </button>
        </div>
    );
});

export default FileItem;
