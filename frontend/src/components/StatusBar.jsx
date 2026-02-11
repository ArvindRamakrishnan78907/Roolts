import React from 'react';
import { FiCheckCircle, FiAlertCircle, FiCpu } from 'react-icons/fi';
import { useFileStore, useExecutionStore } from '../store';
import { getFileIcon } from '../services/iconHelper';

function StatusBar() {
    const { files, activeFileId } = useFileStore();

    // const { compilers } = useExecutionStore();
    const activeFile = files.find((f) => f.id === activeFileId);

    return (
        <div className="status-bar">
            <div className="status-bar__left">
                <span className="status-bar__item">

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

export default StatusBar;
