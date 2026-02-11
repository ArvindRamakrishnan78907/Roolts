import React, { Suspense, lazy } from 'react';
import {
    FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp,
    FiEye, FiGithub, FiShare2, FiBookOpen, FiGrid, FiPackage, FiZap
} from 'react-icons/fi';
import { useUIStore, useFileStore, useSettingsStore } from '../store';
import WebPreview from './WebPreview';
import LearningPanel from './LearningPanel';
import AppsPanel from './AppsPanel';

// Lazy load apps
const NotesApp = lazy(() => import('./apps/NotesApp.jsx'));
const VSCodeApp = lazy(() => import('./apps/VSCodeApp.jsx'));
const QuickPythonApp = lazy(() => import('./apps/QuickPythonApp.jsx'));
const CodeChampApp = lazy(() => import('./apps/CodeChampApp.jsx'));

function RightPanel({ style, editorMinimized }) {
    const {
        rightPanelOpen, rightPanelTab, setRightPanelTab, toggleRightPanel,
        rightPanelExpanded, toggleRightPanelExpanded
    } = useUIStore();
    const { files, activeFileId } = useFileStore();
    const { experimental } = useSettingsStore();

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
        { id: 'learn', label: 'Learn', icon: <FiBookOpen /> },
        { id: 'apps', label: 'Apps', icon: <FiGrid /> },
        ...(experimental?.vscodeApp ? [{ id: 'vscode', label: 'VS Code', icon: <FiPackage /> }] : []),
        { id: 'codechamp', label: 'CodeChamp', icon: <FiZap /> }
    ];

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

            <Suspense fallback={<div className="panel-loading"><div className="spinner"></div> Loading...</div>}>
                {rightPanelTab === 'preview' && <WebPreview files={files} activeFileId={activeFileId} />}
                {rightPanelTab === 'learn' && <LearningPanel />}
                {rightPanelTab === 'apps' && <AppsPanel onOpenApp={setRightPanelTab} />}

                {rightPanelTab === 'notes' && (
                    <NotesApp onBack={() => setRightPanelTab('apps')} isWindowed={false} />
                )}
                {rightPanelTab === 'vscode' && experimental?.vscodeApp && (
                    <VSCodeApp onBack={() => setRightPanelTab('apps')} isWindowed={false} />
                )}
                {rightPanelTab === 'quickpython' && (
                    <QuickPythonApp onBack={() => setRightPanelTab('apps')} isWindowed={false} />
                )}
                {rightPanelTab === 'codechamp' && (
                    <CodeChampApp onClose={() => setRightPanelTab('apps')} />
                )}
            </Suspense>
        </div>
    );
}

export default RightPanel;
