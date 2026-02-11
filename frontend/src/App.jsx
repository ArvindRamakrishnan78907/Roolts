import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import {
    FiPlus, FiSave, FiSettings, FiChevronLeft, FiChevronRight,
    FiPlay, FiTerminal, FiCode, FiX, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import {
    useUIStore, useFileStore, useExecutionStore,
    useNotesStore, useSettingsStore
} from './store';
import { collaborationService } from './services/collaborationService';

import { executorService } from './services/executorService';

// Refactored Components
import FileExplorer from './components/FileExplorer';
import EditorTabs from './components/EditorTabs';
import CodeEditor from './components/CodeEditor';
import TerminalPanel from './components/TerminalPanel';
import RightPanel from './components/RightPanel';
import StatusBar from './components/StatusBar';
import Notifications from './components/Notifications';
import SyncManager from './components/SyncManager';

// Lazy loaded modals
const SettingsModal = lazy(() => import('./components/SettingsModal.jsx'));
const NewFileModal = lazy(() => import('./components/NewFileModal.jsx'));

// Utility Components
import RemoteControlOverlay from './components/RemoteControlOverlay';

// Logic helpers
const detectInputRequirement = (code, language) => {
    if (!code) return false;
    const c = code;
    switch (language) {
        case 'python': return /\binput\s*\(/.test(c);
        case 'java': return /Scanner\s*\(System\.in\)/.test(c) || /Console\.readLine/.test(c) || /BufferedReader.*InputStreamReader/.test(c);
        case 'javascript': return /readline/.test(c) || /process\.stdin/.test(c) || /prompt\s*\(/.test(c);
        case 'c':
        case 'cpp': return /scanf/.test(c) || /cin\s*>>/.test(c) || /getline/.test(c) || /gets/.test(c);
        case 'go': return /fmt\.Scan/.test(c) || /fmt\.Fscan/.test(c) || /reader\.ReadString/.test(c);
        default: return false;
    }
};

function InputRequestModal({ isOpen, onSubmit, onCancel }) {
    const [inputVal, setInputVal] = useState('');
    if (!isOpen) return null;
    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '400px' }}>
                <div className="modal__header">
                    <h3 className="modal__title">Program Input Required</h3>
                    <button className="btn btn--ghost btn--icon" onClick={onCancel}><FiX /></button>
                </div>
                <div className="modal__body">
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        This program requires input. Enter values below (one per line).
                    </p>
                    <textarea
                        className="input"
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

function HighlightModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState(null);
    const { addHighlight, removeHighlight, files } = useFileStore();

    useEffect(() => {
        const handleOpen = (e) => { setIsOpen(true); setData(e.detail); };
        window.addEventListener('open-highlight-modal', handleOpen);
        return () => window.removeEventListener('open-highlight-modal', handleOpen);
    }, []);

    if (!isOpen || !data) return null;

    const handleSelectColor = (color) => {
        if (data && data.selection) {
            const highlight = { id: Date.now().toString(), color: color, range: data.selection };
            addHighlight(data.fileId, highlight);
        }
        setIsOpen(false);
        setData(null);
    };

    return (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '300px' }}>
                <div className="modal__header">
                    <h3 className="modal__title">Highlight Color</h3>
                    <button className="btn btn--ghost btn--icon" onClick={() => setIsOpen(false)}><FiX /></button>
                </div>
                <div className="modal__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {['red', 'yellow', 'green', 'blue', 'pink', 'purple'].map(c => (
                        <button key={c} className="btn" style={{ background: `var(--highlight-${c}-bg)`, color: `var(--highlight-${c}-text)` }} onClick={() => handleSelectColor(c)}>{c}</button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function App() {
    const {
        sidebarOpen, toggleSidebar, openModal, addNotification, editorMinimized, toggleEditorMinimized,
        rightPanelOpen, toggleRightPanel, setRightPanelTab
    } = useUIStore();
    const { files, activeFileId, removeLastDrawing, clearDrawings, markFileSaved } = useFileStore();
    const {
        isExecuting, setExecuting, setOutput, setError, setExecutionTime,
        addToHistory, setShowOutput, inputRequestOpen, setInputRequestOpen, setInput
    } = useExecutionStore();

    const { theme, backgroundImage, backgroundOpacity, uiFontSize, uiFontFamily, experimental } = useSettingsStore();

    const [terminalOpen, setTerminalOpen] = useState(false);
    const [isController, setIsController] = useState(false);
    const [isBeingControlled, setIsBeingControlled] = useState(false);
    const [isScribbleMode, setIsScribbleMode] = useState(false);
    const [scribbleTool, setScribbleTool] = useState('pen');
    const [scribbleColor, setScribbleColor] = useState('#ff0000');

    // Panel resizing
    const [rightPanelWidth, setRightPanelWidth] = useState(360);
    const [terminalHeight, setTerminalHeight] = useState(250);
    const [isResizing, setIsResizing] = useState(null);
    const mainRef = useRef(null);

    const activeFile = files.find(f => f.id === activeFileId);

    // Initial setup and OAuth callbacks
    useEffect(() => {
        // Theme application
        document.body.classList.remove('theme-light', 'theme-nord', 'theme-dracula', 'theme-solarized-light');
        if (theme !== 'vs-dark') document.body.classList.add(`theme-${theme}`);

        document.documentElement.style.fontSize = `${uiFontSize}px`;
        if (uiFontFamily) document.documentElement.style.setProperty('--font-sans', uiFontFamily);

        if (backgroundImage && experimental?.customBackground) {
            document.body.style.backgroundImage = `url(${backgroundImage})`;
            document.body.classList.add('has-bg-image');
        } else {
            document.body.style.backgroundImage = '';
            document.body.classList.remove('has-bg-image');
        }
        document.documentElement.style.setProperty('--bg-opacity', (backgroundOpacity && experimental?.customBackground) ? backgroundOpacity : 0.85);
    }, [theme, uiFontSize, uiFontFamily, backgroundImage, backgroundOpacity, experimental]);

    // Resizing logic
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing || !mainRef.current) return;
            const mainRect = mainRef.current.getBoundingClientRect();
            if (isResizing === 'right') {
                setRightPanelWidth(Math.max(200, Math.min(800, mainRect.right - e.clientX)));
            } else if (isResizing === 'terminal') {
                const wrapper = mainRef.current.querySelector('.editor-terminal-wrapper');
                if (wrapper) setTerminalHeight(Math.max(100, Math.min(500, wrapper.getBoundingClientRect().bottom - e.clientY)));
            }
        };
        const handleMouseUp = () => setIsResizing(null);
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleRunCode = useCallback(async () => {
        if (!activeFile) return addNotification({ type: 'error', message: 'No file selected' });

        const isWeb = activeFile.language === 'html' ||
            (activeFile.language === 'javascript' && (activeFile.content.includes('import React') || activeFile.name.endsWith('.jsx')));

        if (isWeb) {
            if (!rightPanelOpen) toggleRightPanel();
            setRightPanelTab('preview');
            return;
        }

        // Input detection disabled per user request
        /*
        const needsInput = detectInputRequirement(activeFile.content, activeFile.language);
        if (needsInput && !useExecutionStore.getState().input) {
            setInputRequestOpen(true);
            return;
        }
        */

        setExecuting(true);
        setOutput('');
        setError(null);
        const startTime = Date.now();

        try {
            const { input } = useExecutionStore.getState();
            const result = await executorService.execute(activeFile.content, activeFile.language, activeFile.name, input);
            setExecutionTime(Date.now() - startTime);
            setShowOutput(true);

            if (result.success) {
                setOutput(result.output || 'Done (no output)');
                addToHistory({ success: true, language: activeFile.language, output: result.output });
            } else {
                setError(result.error);
                addToHistory({ success: false, language: activeFile.language, error: result.error });
            }
        } catch (e) {
            setError(e.message);
        }
        setExecuting(false);
    }, [activeFile, rightPanelOpen, toggleRightPanel, setRightPanelTab, setExecuting, setOutput, setError, setExecutionTime, setShowOutput, addToHistory, addNotification]);

    const handleSaveAs = useCallback(() => {
        if (!activeFile) return;
        const blob = new Blob([activeFile.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = activeFile.name; a.click();
        URL.revokeObjectURL(url);
        markFileSaved(activeFileId);
        addNotification({ type: 'success', message: `Saved ${activeFile.name}` });
    }, [activeFile, activeFileId, markFileSaved, addNotification]);

    return (
        <div className="app">
            <header className="header">
                <div className="header__brand"><div className="header__logo">R</div><h1 className="header__title">Roolts</h1></div>
                <div className="header__actions">
                    <button className="btn btn--success" onClick={handleRunCode} disabled={isExecuting}>
                        {isExecuting ? <span className="spinner" /> : <FiPlay />} Run
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={handleSaveAs}><FiSave /></button>
                    <button className="btn btn--ghost btn--icon" onClick={() => openModal('newFile')}><FiPlus /></button>
                    <button className="btn btn--ghost btn--icon" onClick={() => openModal('settings')}><FiSettings /></button>
                </div>
            </header>

            <main className={`main ${editorMinimized ? 'main--editor-minimized' : ''}`} ref={mainRef}>
                <aside className={`sidebar ${!sidebarOpen ? 'sidebar--collapsed' : ''}`}>
                    {sidebarOpen ? (
                        <>
                            <div className="sidebar__header"><span className="sidebar__title">Explorer</span><button className="btn btn--ghost btn--icon" onClick={toggleSidebar}><FiChevronLeft /></button></div>
                            <div className="sidebar-content"><FileExplorer /></div>
                            <div className="sidebar-footer">
                                <button className={`sidebar-terminal-btn ${terminalOpen ? 'sidebar-terminal-btn--active' : ''}`} onClick={() => setTerminalOpen(!terminalOpen)}>
                                    <FiTerminal size={16} /><span>Terminal</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="sidebar-collapsed-buttons">
                            <button className="btn btn--ghost btn--icon" onClick={toggleSidebar}><FiChevronRight /></button>
                            <button className={`btn btn--ghost btn--icon ${terminalOpen ? 'btn--active' : ''}`} onClick={() => setTerminalOpen(!terminalOpen)}><FiTerminal /></button>
                        </div>
                    )}
                </aside>

                <div className="editor-terminal-wrapper">
                    <div className={`editor-container ${terminalOpen ? 'editor-container--with-terminal' : ''}`}>
                        <EditorTabs
                            isScribbleMode={isScribbleMode}
                            toggleScribbleMode={() => setIsScribbleMode(!isScribbleMode)}
                            scribbleTool={scribbleTool} setScribbleTool={setScribbleTool}
                            scribbleColor={scribbleColor} setScribbleColor={setScribbleColor}
                            onUndo={() => removeLastDrawing(activeFileId)} onClear={() => clearDrawings(activeFileId)}
                        />
                        <CodeEditor isScribbleMode={isScribbleMode} scribbleTool={scribbleTool} scribbleColor={scribbleColor} />
                    </div>
                    {terminalOpen && (
                        <>
                            <div className="resize-handle resize-handle--vertical" onMouseDown={() => setIsResizing('terminal')} />
                            <div className="terminal-bottom-panel" style={{ height: terminalHeight }}>
                                <div className="terminal-panel-header">
                                    <div className="terminal-panel-tabs"><button className="terminal-panel-tab terminal-panel-tab--active"><FiTerminal size={14} /> Terminal</button></div>
                                    <button className="btn btn--ghost btn--icon" onClick={() => setTerminalOpen(false)}><FiX size={14} /></button>
                                </div>
                                <TerminalPanel />
                            </div>
                        </>
                    )}
                </div>

                <div className="resize-handle resize-handle--horizontal" onMouseDown={() => setIsResizing('right')} />
                <RightPanel style={{ width: rightPanelWidth }} editorMinimized={editorMinimized} />
            </main>

            <StatusBar />
            <Suspense fallback={null}>
                <SettingsModal />
                <NewFileModal />
            </Suspense>
            <HighlightModal />

            <SyncManager />
            <Notifications />
            <RemoteControlOverlay isController={isController} isBeingControlled={isBeingControlled} />
        </div>
    );
}

export default App;
