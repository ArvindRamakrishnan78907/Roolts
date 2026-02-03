import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
    FiFile,
    FiFolder,
    FiGithub,
    FiLinkedin,
    FiTwitter,
    FiBookOpen,
    FiPlus,
    FiSave,
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiSettings,
    FiUploadCloud,
    FiShare2,
    FiCpu,
    FiCode,
    FiGitBranch,
    FiCircle,
    FiCheckCircle,
    FiAlertCircle,
    FiImage,
    FiSend,
    FiTrash2,
    FiEdit3
} from 'react-icons/fi';
import {
    useFileStore,
    useGitHubStore,
    useSocialStore,
    useLearningStore,
    useUIStore
} from './store';

// File Explorer Component
function FileExplorer() {
    const { files, activeFileId, openFile } = useFileStore();
    const { openModal } = useUIStore();

    const getFileIcon = (language) => {
        const icons = {
            python: '🐍',
            javascript: '📜',
            java: '☕',
            html: '🌐',
            css: '🎨',
            json: '📋',
            default: '📄'
        };
        return icons[language] || icons.default;
    };

    return (
        <div className="file-explorer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Files
                </span>
                <button
                    className="btn btn--ghost btn--icon"
                    onClick={() => openModal('newFile')}
                    title="New File"
                >
                    <FiPlus />
                </button>
            </div>
            {files.map((file) => (
                <div
                    key={file.id}
                    className={`file-item ${activeFileId === file.id ? 'file-item--active' : ''}`}
                    onClick={() => openFile(file.id)}
                >
                    <span className="file-item__icon">{getFileIcon(file.language)}</span>
                    <span className="file-item__name">{file.name}</span>
                    {file.modified && (
                        <FiCircle size={8} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    )}
                </div>
            ))}
        </div>
    );
}

// Editor Tabs Component
function EditorTabs() {
    const { files, openFiles, activeFileId, setActiveFile, closeFile } = useFileStore();

    const openFilesData = openFiles.map((id) => files.find((f) => f.id === id)).filter(Boolean);

    return (
        <div className="editor-tabs">
            {openFilesData.map((file) => (
                <button
                    key={file.id}
                    className={`editor-tab ${activeFileId === file.id ? 'editor-tab--active' : ''}`}
                    onClick={() => setActiveFile(file.id)}
                >
                    <span>{file.name}</span>
                    {file.modified && <FiCircle size={8} style={{ color: 'var(--warning)' }} />}
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
            ))}
        </div>
    );
}

// Monaco Editor Component
function CodeEditor() {
    const { files, activeFileId, updateFileContent } = useFileStore();
    const activeFile = files.find((f) => f.id === activeFileId);

    if (!activeFile) {
        return (
            <div className="welcome">
                <div className="welcome__icon">
                    <FiCode />
                </div>
                <h2 className="welcome__title">Welcome to Roolts</h2>
                <p className="welcome__subtitle">
                    Open a file from the sidebar or create a new one to start coding.
                    Push to GitHub, share on social media, and learn with AI-powered insights.
                </p>
                <div className="welcome__actions">
                    <button className="btn btn--primary">
                        <FiPlus /> New File
                    </button>
                    <button className="btn btn--secondary">
                        <FiFolder /> Open Project
                    </button>
                </div>
            </div>
        );
    }

    const languageMap = {
        python: 'python',
        javascript: 'javascript',
        java: 'java',
        html: 'html',
        css: 'css',
        json: 'json',
        plaintext: 'plaintext'
    };

    return (
        <div className="monaco-wrapper">
            <Editor
                height="100%"
                language={languageMap[activeFile.language] || 'plaintext'}
                value={activeFile.content}
                onChange={(value) => updateFileContent(activeFile.id, value || '')}
                theme="vs-dark"
                options={{
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: 14,
                    lineHeight: 1.6,
                    padding: { top: 16, bottom: 16 },
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    renderWhitespace: 'selection',
                    wordWrap: 'on',
                    bracketPairColorization: { enabled: true }
                }}
            />
        </div>
    );
}

// GitHub Panel Component
function GitHubPanel() {
    const { isConnected, user, repositories, selectedRepo, isLoading } = useGitHubStore();
    const { files } = useFileStore();
    const [commitMessage, setCommitMessage] = useState('');

    if (!isConnected) {
        return (
            <div className="panel-content">
                <div className="card">
                    <div className="card__body" style={{ textAlign: 'center', padding: '32px 16px' }}>
                        <FiGithub size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3 style={{ marginBottom: '8px' }}>Connect to GitHub</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Push your code to existing or new repositories
                        </p>
                        <button className="social-btn social-btn--github">
                            <FiGithub size={20} />
                            <span>Connect GitHub Account</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="panel-content">
            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card__header">
                    <span className="card__title">
                        <FiCheckCircle style={{ color: 'var(--success)', marginRight: '8px' }} />
                        Connected
                    </span>
                </div>
                <div className="card__body">
                    <p style={{ fontSize: '13px' }}>Signed in as <strong>{user?.login || 'user'}</strong></p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card__header">
                    <span className="card__title">Repository</span>
                </div>
                <div className="card__body">
                    <select className="input" style={{ marginBottom: '12px' }}>
                        <option value="">Select repository...</option>
                        <option value="new">+ Create New Repository</option>
                        {repositories.map((repo) => (
                            <option key={repo.id} value={repo.id}>{repo.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="card">
                <div className="card__header">
                    <span className="card__title">
                        <FiGitBranch style={{ marginRight: '8px' }} />
                        Commit & Push
                    </span>
                </div>
                <div className="card__body">
                    <label className="label">Commit Message</label>
                    <textarea
                        className="input input--textarea"
                        placeholder="Describe your changes..."
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        style={{ marginBottom: '12px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn--primary" style={{ flex: 1 }}>
                            <FiUploadCloud /> Push to GitHub
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Social Panel Component
function SocialPanel() {
    const { linkedin, twitter, isPosting } = useSocialStore();
    const [postContent, setPostContent] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState({ linkedin: false, twitter: false });

    return (
        <div className="panel-content">
            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card__header">
                    <span className="card__title">Connected Accounts</span>
                </div>
                <div className="card__body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button className={`social-btn ${linkedin.isConnected ? 'social-btn--linkedin' : ''}`}>
                            <FiLinkedin size={20} />
                            <span>{linkedin.isConnected ? 'LinkedIn Connected' : 'Connect LinkedIn'}</span>
                            {linkedin.isConnected && <FiCheckCircle style={{ marginLeft: 'auto' }} />}
                        </button>
                        <button className={`social-btn ${twitter.isConnected ? 'social-btn--twitter' : ''}`}>
                            <FiTwitter size={20} />
                            <span>{twitter.isConnected ? 'Twitter Connected' : 'Connect Twitter / X'}</span>
                            {twitter.isConnected && <FiCheckCircle style={{ marginLeft: 'auto' }} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card__header">
                    <span className="card__title">
                        <FiShare2 style={{ marginRight: '8px' }} />
                        Share Your Project
                    </span>
                </div>
                <div className="card__body">
                    <label className="label">Post Content</label>
                    <textarea
                        className="input input--textarea"
                        placeholder="Share something about your project..."
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        style={{ marginBottom: '12px' }}
                    />

                    <div style={{ marginBottom: '12px' }}>
                        <label className="label">Post to:</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedPlatforms.linkedin}
                                    onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, linkedin: e.target.checked })}
                                />
                                <FiLinkedin /> LinkedIn
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedPlatforms.twitter}
                                    onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, twitter: e.target.checked })}
                                />
                                <FiTwitter /> Twitter
                            </label>
                        </div>
                    </div>

                    <button className="btn btn--primary" style={{ width: '100%' }} disabled={isPosting}>
                        {isPosting ? (
                            <><span className="spinner" /> Posting...</>
                        ) : (
                            <><FiSend /> Post Now</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Learning Panel Component
function LearningPanel() {
    const { explanation, diagram, resources, isGenerating, activeTab, setActiveTab } = useLearningStore();
    const { files, activeFileId } = useFileStore();
    const activeFile = files.find((f) => f.id === activeFileId);

    const tabs = [
        { id: 'explain', label: 'Explain', icon: <FiBookOpen /> },
        { id: 'diagram', label: 'Diagram', icon: <FiImage /> },
        { id: 'resources', label: 'Resources', icon: <FiCode /> }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`panel-tab ${activeTab === tab.id ? 'panel-tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{ flex: 1, padding: '8px' }}
                    >
                        {tab.icon}
                        <span style={{ marginLeft: '4px', fontSize: '12px' }}>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="panel-content">
                {!activeFile ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                        <FiCpu size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p>Select a file to learn from the code</p>
                    </div>
                ) : (
                    <>
                        <button
                            className="btn btn--primary"
                            style={{ width: '100%', marginBottom: '16px' }}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <><span className="spinner" /> Analyzing...</>
                            ) : (
                                <><FiCpu /> Analyze Code with AI</>
                            )}
                        </button>

                        {activeTab === 'explain' && (
                            <div className="learning-card">
                                <div className="learning-card__header">
                                    <FiBookOpen /> Code Explanation
                                </div>
                                <div className="learning-card__content">
                                    {explanation || (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            Click "Analyze Code with AI" to get an explanation of your code.
                                            The AI will break down the logic, explain functions, and highlight key concepts.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'diagram' && (
                            <div className="learning-card">
                                <div className="learning-card__header">
                                    <FiImage /> Visual Diagram
                                </div>
                                <div className="learning-card__content">
                                    {diagram ? (
                                        <div className="diagram-container" dangerouslySetInnerHTML={{ __html: diagram }} />
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            AI will generate flow diagrams, class diagrams, or sequence diagrams
                                            based on your code structure.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'resources' && (
                            <div className="learning-card">
                                <div className="learning-card__header">
                                    <FiCode /> Learning Resources
                                </div>
                                <div className="learning-card__content">
                                    {resources.length > 0 ? (
                                        <ul style={{ listStyle: 'none', padding: 0 }}>
                                            {resources.map((resource, index) => (
                                                <li key={index} style={{ marginBottom: '12px' }}>
                                                    <a href={resource.url} target="_blank" rel="noopener noreferrer"
                                                        style={{ color: 'var(--info)', textDecoration: 'none' }}>
                                                        {resource.title}
                                                    </a>
                                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                        {resource.description}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            AI will suggest relevant documentation, tutorials, and articles
                                            based on the technologies used in your code.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Right Panel Component
function RightPanel() {
    const { rightPanelOpen, rightPanelTab, setRightPanelTab, toggleRightPanel } = useUIStore();

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
        { id: 'github', label: 'GitHub', icon: <FiGithub /> },
        { id: 'social', label: 'Social', icon: <FiShare2 /> },
        { id: 'learn', label: 'Learn', icon: <FiBookOpen /> }
    ];

    return (
        <div className="right-panel">
            <div className="panel-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`panel-tab ${rightPanelTab === tab.id ? 'panel-tab--active' : ''}`}
                        onClick={() => setRightPanelTab(tab.id)}
                    >
                        {tab.icon}
                    </button>
                ))}
                <button className="btn btn--ghost btn--icon" onClick={toggleRightPanel}>
                    <FiChevronRight />
                </button>
            </div>

            {rightPanelTab === 'github' && <GitHubPanel />}
            {rightPanelTab === 'social' && <SocialPanel />}
            {rightPanelTab === 'learn' && <LearningPanel />}
        </div>
    );
}

// New File Modal
function NewFileModal() {
    const { modals, closeModal } = useUIStore();
    const { addFile } = useFileStore();
    const [fileName, setFileName] = useState('');
    const [language, setLanguage] = useState('javascript');

    if (!modals.newFile) return null;

    const handleCreate = () => {
        if (fileName.trim()) {
            addFile(fileName, '', language);
            setFileName('');
            closeModal('newFile');
        }
    };

    return (
        <div className="modal-overlay" onClick={() => closeModal('newFile')}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h3 className="modal__title">Create New File</h3>
                    <button className="btn btn--ghost btn--icon" onClick={() => closeModal('newFile')}>
                        <FiX />
                    </button>
                </div>
                <div className="modal__body">
                    <label className="label">File Name</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="e.g., app.js, main.py"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        style={{ marginBottom: '16px' }}
                        autoFocus
                    />

                    <label className="label">Language</label>
                    <select
                        className="input"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="json">JSON</option>
                        <option value="plaintext">Plain Text</option>
                    </select>
                </div>
                <div className="modal__footer">
                    <button className="btn btn--secondary" onClick={() => closeModal('newFile')}>
                        Cancel
                    </button>
                    <button className="btn btn--primary" onClick={handleCreate}>
                        <FiPlus /> Create File
                    </button>
                </div>
            </div>
        </div>
    );
}

// Status Bar Component
function StatusBar() {
    const { files, activeFileId } = useFileStore();
    const { isConnected } = useGitHubStore();
    const activeFile = files.find((f) => f.id === activeFileId);

    return (
        <div className="status-bar">
            <div className="status-bar__left">
                <span className="status-bar__item">
                    {isConnected ? (
                        <><FiCheckCircle style={{ color: 'var(--success)' }} /> GitHub Connected</>
                    ) : (
                        <><FiAlertCircle style={{ color: 'var(--text-muted)' }} /> GitHub Disconnected</>
                    )}
                </span>
            </div>
            <div className="status-bar__right">
                {activeFile && (
                    <>
                        <span className="status-bar__item">{activeFile.language}</span>
                        <span className="status-bar__item">UTF-8</span>
                        <span className="status-bar__item">
                            {activeFile.content.split('\n').length} lines
                        </span>
                    </>
                )}
                <span className="status-bar__item">
                    <FiCpu size={12} /> Kiro AI Ready
                </span>
            </div>
        </div>
    );
}

// Notifications Component
function Notifications() {
    const { notifications, removeNotification } = useUIStore();

    return (
        <>
            {notifications.map((notification, index) => (
                <div
                    key={notification.id}
                    className={`notification notification--${notification.type}`}
                    style={{ bottom: `${24 + index * 60}px` }}
                >
                    {notification.type === 'success' && <FiCheckCircle style={{ color: 'var(--success)' }} />}
                    {notification.type === 'error' && <FiAlertCircle style={{ color: 'var(--error)' }} />}
                    <span>{notification.message}</span>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => removeNotification(notification.id)}
                        style={{ marginLeft: 'auto' }}
                    >
                        <FiX size={14} />
                    </button>
                </div>
            ))}
        </>
    );
}

// Main App Component
function App() {
    const { sidebarOpen, toggleSidebar, openModal } = useUIStore();
    const { markFileSaved } = useFileStore();
    const { addNotification } = useUIStore();

    const handleSave = () => {
        // Simulate save
        addNotification({ type: 'success', message: 'File saved successfully!' });
    };

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header__brand">
                    <div className="header__logo">R</div>
                    <h1 className="header__title">Roolts</h1>
                </div>
                <div className="header__actions">
                    <button className="btn btn--ghost btn--icon" onClick={handleSave} title="Save">
                        <FiSave />
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={() => openModal('newFile')} title="New File">
                        <FiPlus />
                    </button>
                    <button className="btn btn--ghost btn--icon" title="Settings">
                        <FiSettings />
                    </button>
                    <button className="btn btn--primary">
                        <FiUploadCloud /> Push
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="main">
                {/* Sidebar */}
                <aside className={`sidebar ${!sidebarOpen ? 'sidebar--collapsed' : ''}`}>
                    {sidebarOpen ? (
                        <>
                            <div className="sidebar__header">
                                <span className="sidebar__title">Explorer</span>
                                <button className="btn btn--ghost btn--icon" onClick={toggleSidebar}>
                                    <FiChevronLeft />
                                </button>
                            </div>
                            <FileExplorer />
                        </>
                    ) : (
                        <button
                            className="btn btn--ghost btn--icon"
                            onClick={toggleSidebar}
                            style={{ margin: '8px' }}
                        >
                            <FiChevronRight />
                        </button>
                    )}
                </aside>

                {/* Editor */}
                <div className="editor-container">
                    <EditorTabs />
                    <CodeEditor />
                </div>

                {/* Right Panel */}
                <RightPanel />
            </main>

            {/* Status Bar */}
            <StatusBar />

            {/* Modals */}
            <NewFileModal />

            {/* Notifications */}
            <Notifications />
        </div>
    );
}

export default App;
