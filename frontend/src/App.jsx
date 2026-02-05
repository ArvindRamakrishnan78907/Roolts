import React, { useState, useEffect } from 'react';
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
    FiEdit3,
    FiPlay,
    FiTerminal,
    FiStar,
    FiCopy,
    FiExternalLink,
    FiSearch,
    FiFileText,
    FiDownload,
    FiTrendingUp,
    FiGitMerge,
    FiUsers,
    FiEye,
    FiClock,
    FiHash,
    FiRefreshCw,
    FiChevronDown,
    FiChevronUp,
    FiBookmark,
    FiMapPin
} from 'react-icons/fi';
import {
    useUIStore,
    useFileStore,
    useGitHubStore,
    useExecutionStore,
    useSocialStore,
    useLearningStore,
    useNotesStore,
    useTerminalStore,
    useSettingsStore,
    useSnippetStore
} from './store';
import { authService } from './services/authService';
import { socialService, githubService } from './services/api';
import { notesService } from './services/notesService';
import { executorService } from './services/executorService';
import { terminalService } from './services/terminalService';
import WebPreview from './components/WebPreview';
import ReviewPanel from './components/ReviewPanel';
import SnippetPanel from './components/SnippetPanel';
import PortfolioGenerator from './components/PortfolioGenerator';
import DeploymentModal from './components/DeploymentModal';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import { FiMic, FiMicOff, FiLayout } from 'react-icons/fi';

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

// Terminal Panel Component - Integrated PowerShell
function TerminalPanel() {
    const { lines, commandHistory, cwd, isRunning, addLine, addCommand, setCwd, setRunning, clearTerminal, getFromHistory } = useTerminalStore();
    const { addNotification } = useUIStore();
    const [input, setInput] = useState('');
    const terminalRef = React.useRef(null);
    const inputRef = React.useRef(null);

    // Initialize cwd on mount
    useEffect(() => {
        const initCwd = async () => {
            const currentCwd = await terminalService.getCwd();
            if (currentCwd) setCwd(currentCwd);
        };
        initCwd();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const command = input.trim();
        if (!command) return;

        // Add command to history and display
        addCommand(command);
        addLine({ type: 'command', content: command, cwd });
        setInput('');
        setRunning(true);

        // Clear terminal if requested
        if (command.toLowerCase() === 'clear' || command.toLowerCase() === 'cls') {
            clearTerminal();
            setRunning(false);
            return;
        }

        // Handle copy command locally
        if (command.toLowerCase() === 'copy') {
            copyTerminal();
            setRunning(false);
            return;
        }



        try {
            const result = await terminalService.execute(command);

            if (result.output) {
                addLine({ type: 'output', content: result.output });
            }
            if (result.error) {
                addLine({ type: 'error', content: result.error });
            }
            if (result.cwd) {
                setCwd(result.cwd);
            }
        } catch (error) {
            addLine({ type: 'error', content: `Error: ${error.message}` });
        }

        setRunning(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const cmd = getFromHistory('up');
            setInput(cmd);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const cmd = getFromHistory('down');
            setInput(cmd);
        }
    };

    const getShortCwd = (fullCwd) => {
        if (!fullCwd) return 'PS>';
        const parts = fullCwd.split('\\');
        return parts.length > 2 ? `...\\${parts.slice(-2).join('\\')}` : fullCwd;
    };

    const copyTerminal = () => {
        const text = lines.map(line => {
            if (line.type === 'command') return `PS ${line.cwd}> ${line.content}`;
            return line.content;
        }).join('\n');
        navigator.clipboard.writeText(text);
        addNotification('Terminal output copied to clipboard', 'success');
    };

    const handleTerminalClick = () => {
        // Only focus if no text is selected
        if (!window.getSelection().toString()) {
            inputRef.current?.focus();
        }
    };

    return (
        <div className="terminal-panel">
            <div className="terminal-header">
                <FiTerminal size={14} />
                <span>PowerShell</span>
                <button
                    className="btn btn--ghost btn--icon"
                    onClick={copyTerminal}
                    title="Copy All Output"
                >
                    <FiCopy size={14} />
                </button>
                <button
                    className="btn btn--ghost btn--icon"
                    onClick={clearTerminal}
                    title="Clear Terminal"
                    style={{ marginLeft: 'auto' }}
                >
                    <FiTrash2 size={14} />
                </button>
            </div>
            <div className="terminal-output" ref={terminalRef} onClick={handleTerminalClick}>
                {lines.map((line, index) => (
                    <div key={index} className={`terminal-line terminal-line--${line.type}`}>
                        {line.type === 'command' && (
                            <span className="terminal-prompt">PS {getShortCwd(line.cwd)}{'>'} </span>
                        )}
                        <span className="terminal-content">{line.content}</span>
                    </div>
                ))}
                {isRunning && (
                    <div className="terminal-line terminal-line--system">
                        <span className="spinner" style={{ width: '12px', height: '12px' }} /> Running...
                    </div>
                )}
            </div>
            <form className="terminal-input-form" onSubmit={handleSubmit}>
                <span className="terminal-prompt">PS {getShortCwd(cwd)}{'>'}</span>
                <input
                    ref={inputRef}
                    type="text"
                    className="terminal-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type command..."
                    disabled={isRunning}
                    autoFocus
                />
            </form>
        </div>
    );
}

// Editor Tabs Component
function EditorTabs() {
    const { files, openFiles, activeFileId, setActiveFile, closeFile } = useFileStore();
    const { showOutput, setShowOutput } = useExecutionStore();

    const openFilesData = openFiles.map((id) => files.find((f) => f.id === id)).filter(Boolean);

    return (
        <div className="editor-tabs">
            {openFilesData.map((file) => (
                <button
                    key={file.id}
                    className={`editor-tab ${activeFileId === file.id && !showOutput ? 'editor-tab--active' : ''}`}
                    onClick={() => { setActiveFile(file.id); setShowOutput(false); }}
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
            <button
                className={`editor-tab ${showOutput ? 'editor-tab--active' : ''}`}
                onClick={() => setShowOutput(true)}
                style={{ borderLeft: '1px solid var(--border-primary)' }}
            >
                <FiTerminal size={14} />
                <span>Output</span>
            </button>
        </div>
    );
}

// Code Execution Output Panel
function OutputPanel() {
    const { output, error, executionTime, isExecuting, clearOutput, history, setShowOutput } = useExecutionStore();
    const [showHistory, setShowHistory] = useState(false);

    return (
        <div className="output-panel">
            <div className="output-panel__header">
                <span className="output-panel__title">
                    <FiTerminal /> Output
                    {executionTime && (
                        <span className="output-panel__time">
                            <FiClock size={12} /> {executionTime}ms
                        </span>
                    )}
                </span>
                <div className="output-panel__actions">
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => setShowHistory(!showHistory)}
                        title="History"
                    >
                        <FiClock />
                    </button>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={clearOutput}
                        title="Clear"
                    >
                        <FiTrash2 />
                    </button>
                    <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => setShowOutput(false)}
                        title="Close Output"
                    >
                        <FiX />
                    </button>
                </div>
            </div>

            {showHistory ? (
                <div className="output-panel__history">
                    <h4 style={{ marginBottom: '12px', fontSize: '13px' }}>Execution History</h4>
                    {history.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No execution history yet</p>
                    ) : (
                        history.map((entry) => (
                            <div key={entry.id} className="history-item">
                                <div className="history-item__header">
                                    <span className={`history-item__status ${entry.success ? 'success' : 'error'}`}>
                                        {entry.success ? <FiCheckCircle /> : <FiAlertCircle />}
                                    </span>
                                    <span className="history-item__lang">{entry.language}</span>
                                    <span className="history-item__time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="output-panel__content">
                    {isExecuting ? (
                        <div className="output-panel__loading">
                            <span className="spinner" /> Running code...
                        </div>
                    ) : error ? (
                        <pre className="output-panel__error">{error}</pre>
                    ) : output ? (
                        <pre className="output-panel__result">{output}</pre>
                    ) : (
                        <div className="output-panel__empty">
                            <FiTerminal size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                            <p>Click "Run" to execute your code</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Monaco Editor Component
function CodeEditor() {
    const { files, activeFileId, updateFileContent } = useFileStore();
    const { showOutput } = useExecutionStore();
    const activeFile = files.find((f) => f.id === activeFileId);
    // Editor options derived from settings... (implied context, but I will just return the overlay structure)

    // Editor options derived from settings... (implied context, but I will just return the overlay structure)

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

    const { theme, format, features, backgroundImage, backgroundOpacity } = useSettingsStore();

    // Map UI theme to Monaco theme defaults to prevent crashes with custom themes
    const getMonacoTheme = (uiTheme) => {
        if (uiTheme === 'light' || uiTheme === 'solarized-light') return 'light';
        if (uiTheme === 'hc-black') return 'hc-black';
        return 'vs-dark'; // Default for dark, nord, dracula
    };

    return (
        <div className="monaco-wrapper" style={{ position: 'relative' }}>
            {backgroundImage && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: backgroundOpacity,
                        pointerEvents: 'none',
                        zIndex: 10
                    }}
                />
            )}
            <Editor
                height="100%"
                language={languageMap[activeFile.language] || 'plaintext'}
                value={activeFile.content}
                onChange={(value) => updateFileContent(activeFile.id, value || '')}
                theme={getMonacoTheme(theme)}
                options={{
                    fontFamily: format.fontFamily,
                    fontSize: format.fontSize,
                    lineHeight: format.lineHeight,
                    padding: { top: 16, bottom: 16 },
                    minimap: { enabled: features.minimap },
                    // Check if transparent background is needed:
                    // We are putting overlay ON TOP (zIndex 10), so editor background doesn't matter much
                    // except it sits behind the overlay.
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    renderWhitespace: 'selection',
                    wordWrap: format.wordWrap,
                    lineNumbers: features.lineNumbers,
                    bracketPairColorization: { enabled: true }
                }}
            />
            {showOutput && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 20,
                    backgroundColor: 'var(--bg-primary)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <OutputPanel />
                </div>
            )}
        </div>
    );
}

// Enhanced GitHub Panel Component
function GitHubPanel() {
    const { isConnected, user, repositories, selectedRepo, isLoading, setConnected, setRepositories, selectRepo, setLoading } = useGitHubStore();
    const { files } = useFileStore();
    const { addNotification, openModal } = useUIStore();
    const [commitMessage, setCommitMessage] = useState('');
    const [activeGitHubTab, setActiveGitHubTab] = useState('repos');
    const [newRepoName, setNewRepoName] = useState('');
    const [newRepoDesc, setNewRepoDesc] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [trendingRepos, setTrendingRepos] = useState([]);
    const [repoInsights, setRepoInsights] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [forkUrl, setForkUrl] = useState('');

    const handleConnect = async () => {
        try {
            const { auth_url } = await githubService.initiateAuth();
            const popup = window.open(auth_url, '_blank', 'width=600,height=700');

            // Listen for message from popup
            const handleMessage = async (event) => {
                if (event.data.type === 'github-auth-success') {
                    window.removeEventListener('message', handleMessage);

                    if (event.data.code) {
                        try {
                            const response = await githubService.completeAuth(event.data.code);
                            if (response.access_token) {
                                githubService.setToken(response.access_token);
                                setConnected(true, response.user);
                                const repos = await githubService.listRepositories();
                                setRepositories(repos);
                                addNotification({ type: 'success', message: `Connected to GitHub as ${response.user?.login}!` });
                            }
                        } catch (error) {
                            addNotification({ type: 'error', message: 'GitHub authentication failed' });
                        }
                    }
                }
            };

            window.addEventListener('message', handleMessage);

            // Fallback: poll for popup closure
            const checkPopup = setInterval(() => {
                if (popup && popup.closed) {
                    clearInterval(checkPopup);
                    window.removeEventListener('message', handleMessage);
                }
            }, 500);
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to initiate GitHub auth' });
        }
    };

    // Check for existing token on mount
    useEffect(() => {
        const loadExistingAuth = async () => {
            if (githubService.isAuthenticated() && !isConnected) {
                try {
                    const user = await githubService.getCurrentUser();
                    setConnected(true, user);
                    const repos = await githubService.listRepositories();
                    setRepositories(repos);
                } catch (error) {
                    githubService.clearToken();
                }
            }
        };
        loadExistingAuth();
    }, [isConnected]);


    const handleCreateRepo = async () => {
        if (!newRepoName.trim()) return;

        setLoading(true);
        try {
            const repo = await githubService.createRepository(newRepoName, {
                description: newRepoDesc,
                private: isPrivate
            });
            setRepositories([repo, ...repositories]);
            addNotification({ type: 'success', message: `Repository "${repo.name}" created!` });
            setNewRepoName('');
            setNewRepoDesc('');
            setShowCreateModal(false);
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to create repository' });
        }
        setLoading(false);
    };

    const handleFork = async () => {
        if (!forkUrl.trim()) return;

        const match = forkUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) {
            addNotification({ type: 'error', message: 'Invalid GitHub URL' });
            return;
        }

        setLoading(true);
        try {
            const [, owner, repo] = match;
            const forked = await githubService.forkRepository(owner, repo.replace('.git', ''));
            setRepositories([forked, ...repositories]);
            addNotification({ type: 'success', message: `Forked "${forked.full_name}"!` });
            setForkUrl('');
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to fork repository' });
        }
        setLoading(false);
    };

    const loadTrending = async () => {
        try {
            const repos = await githubService.getTrending('', 'daily');
            setTrendingRepos(repos || []);
        } catch (error) {
            console.error('Failed to load trending:', error);
        }
    };

    const loadRepoInsights = async (owner, repo) => {
        try {
            const insights = await githubService.getRepoSummary(owner, repo);
            setRepoInsights(insights);
        } catch (error) {
            console.error('Failed to load insights:', error);
        }
    };

    const handlePush = async () => {
        if (!selectedRepo || !commitMessage.trim()) {
            addNotification({ type: 'error', message: 'Select a repo and enter commit message' });
            return;
        }

        setLoading(true);
        try {
            const filesToPush = files.map(f => ({ path: f.name, content: f.content }));
            const [owner, repo] = selectedRepo.full_name.split('/');
            await githubService.pushFiles(owner, repo, filesToPush, commitMessage);
            addNotification({ type: 'success', message: 'Code pushed to GitHub!' });
            setCommitMessage('');
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to push to GitHub' });
        }
        setLoading(false);
    };

    const handleStarRepo = async (owner, repo) => {
        try {
            await githubService.starRepo(owner, repo);
            addNotification({ type: 'success', message: 'Repository starred!' });
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to star repository' });
        }
    };

    const copyCloneUrl = (url) => {
        navigator.clipboard.writeText(url);
        addNotification({ type: 'success', message: 'Clone URL copied!' });
    };

    useEffect(() => {
        if (activeGitHubTab === 'trending') {
            loadTrending();
        }
    }, [activeGitHubTab]);

    if (!isConnected) {
        return (
            <div className="panel-content">
                <div className="card">
                    <div className="card__body" style={{ textAlign: 'center', padding: '32px 16px' }}>
                        <FiGithub size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3 style={{ marginBottom: '8px' }}>Connect to GitHub</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Push your code, fork repos, and discover trending projects
                        </p>
                        <button className="social-btn social-btn--github" onClick={handleConnect}>
                            <FiGithub size={20} />
                            <span>Connect GitHub Account</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const gitHubTabs = [
        { id: 'repos', label: 'Repos', icon: <FiFolder /> },
        { id: 'create', label: 'Create', icon: <FiPlus /> },
        { id: 'trending', label: 'Trending', icon: <FiTrendingUp /> }
    ];

    return (
        <div className="panel-content">
            {/* User Info */}
            <div className="card" style={{ marginBottom: '12px' }}>
                <div className="card__body" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FiCheckCircle style={{ color: 'var(--success)' }} />
                    <span style={{ fontSize: '13px' }}>Signed in as <strong>{user?.login || 'user'}</strong></span>
                </div>
            </div>

            {/* GitHub Sub-tabs */}
            <div className="github-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', marginBottom: '12px' }}>
                {gitHubTabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`github-tab ${activeGitHubTab === tab.id ? 'github-tab--active' : ''}`}
                        onClick={() => setActiveGitHubTab(tab.id)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            background: activeGitHubTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                            border: 'none',
                            color: activeGitHubTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontSize: '12px'
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Repos Tab */}
            {activeGitHubTab === 'repos' && (
                <>
                    <div className="card" style={{ marginBottom: '12px' }}>
                        <div className="card__header">
                            <span className="card__title">Select Repository</span>
                        </div>
                        <div className="card__body">
                            <select
                                className="input"
                                value={selectedRepo?.id || ''}
                                onChange={(e) => {
                                    const repo = repositories.find(r => r.id === parseInt(e.target.value));
                                    selectRepo(repo);
                                    if (repo) {
                                        const [owner, repoName] = repo.full_name.split('/');
                                        loadRepoInsights(owner, repoName);
                                    }
                                }}
                            >
                                <option value="">Select repository...</option>
                                {repositories.map((repo) => (
                                    <option key={repo.id} value={repo.id}>{repo.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    {selectedRepo && (
                        <div className="card" style={{ marginBottom: '12px' }}>
                            <div className="card__header">
                                <span className="card__title">Quick Actions</span>
                            </div>
                            <div className="card__body">
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => handleStarRepo(...selectedRepo.full_name.split('/'))}
                                    >
                                        <FiStar /> Star
                                    </button>
                                    <button
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => copyCloneUrl(selectedRepo.clone_url)}
                                    >
                                        <FiCopy /> Copy URL
                                    </button>
                                    <button
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => window.open(selectedRepo.html_url, '_blank')}
                                    >
                                        <FiExternalLink /> Open
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Repo Insights */}
                    {repoInsights && selectedRepo && (
                        <div className="card" style={{ marginBottom: '12px' }}>
                            <div className="card__header">
                                <span className="card__title"><FiTrendingUp style={{ marginRight: '8px' }} />Insights</span>
                            </div>
                            <div className="card__body">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
                                    <div><FiStar /> {repoInsights.stats.stars} stars</div>
                                    <div><FiGitMerge /> {repoInsights.stats.forks} forks</div>
                                    <div><FiEye /> {repoInsights.stats.watchers} watchers</div>
                                    <div><FiAlertCircle /> {repoInsights.stats.issues} issues</div>
                                </div>
                                {repoInsights.languages && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Languages</div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {Object.keys(repoInsights.languages).slice(0, 4).map(lang => (
                                                <span key={lang} className="badge">{lang}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Commit & Push */}
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
                            <button
                                className="btn btn--primary"
                                style={{ width: '100%' }}
                                onClick={handlePush}
                                disabled={isLoading || !selectedRepo}
                            >
                                {isLoading ? <><span className="spinner" /> Pushing...</> : <><FiUploadCloud /> Push to GitHub</>}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Create Tab */}
            {activeGitHubTab === 'create' && (
                <>
                    <div className="card" style={{ marginBottom: '12px' }}>
                        <div className="card__header">
                            <span className="card__title"><FiPlus style={{ marginRight: '8px' }} />New Repository</span>
                        </div>
                        <div className="card__body">
                            <label className="label">Repository Name</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="my-awesome-project"
                                value={newRepoName}
                                onChange={(e) => setNewRepoName(e.target.value)}
                                style={{ marginBottom: '12px' }}
                            />
                            <label className="label">Description (optional)</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="A short description..."
                                value={newRepoDesc}
                                onChange={(e) => setNewRepoDesc(e.target.value)}
                                style={{ marginBottom: '12px' }}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                />
                                <span style={{ fontSize: '13px' }}>Private repository</span>
                            </label>
                            <button
                                className="btn btn--primary"
                                style={{ width: '100%' }}
                                onClick={handleCreateRepo}
                                disabled={isLoading || !newRepoName.trim()}
                            >
                                {isLoading ? <><span className="spinner" /> Creating...</> : <><FiPlus /> Create Repository</>}
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card__header">
                            <span className="card__title"><FiGitMerge style={{ marginRight: '8px' }} />Fork Repository</span>
                        </div>
                        <div className="card__body">
                            <label className="label">GitHub Repository URL</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="https://github.com/owner/repo"
                                value={forkUrl}
                                onChange={(e) => setForkUrl(e.target.value)}
                                style={{ marginBottom: '12px' }}
                            />
                            <button
                                className="btn btn--secondary"
                                style={{ width: '100%' }}
                                onClick={handleFork}
                                disabled={isLoading || !forkUrl.trim()}
                            >
                                {isLoading ? <><span className="spinner" /> Forking...</> : <><FiGitMerge /> Fork Repository</>}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Trending Tab */}
            {activeGitHubTab === 'trending' && (
                <div className="card">
                    <div className="card__header">
                        <span className="card__title"><FiTrendingUp style={{ marginRight: '8px' }} />Trending Today</span>
                        <button className="btn btn--ghost btn--icon" onClick={loadTrending}>
                            <FiRefreshCw size={14} />
                        </button>
                    </div>
                    <div className="card__body" style={{ maxHeight: '400px', overflow: 'auto' }}>
                        {trendingRepos.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                                Loading trending repos...
                            </p>
                        ) : (
                            trendingRepos.map((repo) => (
                                <div key={repo.id} className="trending-item" style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--border-primary)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div>
                                            <a
                                                href={repo.html_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'var(--info)', fontSize: '13px', fontWeight: '500' }}
                                            >
                                                {repo.full_name}
                                            </a>
                                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                {repo.description?.slice(0, 80) || 'No description'}...
                                            </p>
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                <span><FiStar size={10} /> {repo.stargazers_count}</span>
                                                <span><FiGitMerge size={10} /> {repo.forks_count}</span>
                                                {repo.language && <span>{repo.language}</span>}
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn--ghost btn--icon"
                                            onClick={() => handleStarRepo(repo.owner.login, repo.name)}
                                            title="Star"
                                        >
                                            <FiStar />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Social Panel Component
// Social Panel Component
function SocialPanel() {
    const { linkedin, twitter, isPosting, setPosting, connectLinkedIn, connectTwitter } = useSocialStore();
    const { addNotification } = useUIStore();
    const [postContent, setPostContent] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState({ linkedin: false, twitter: false });
    const [isAuthenticated] = useState(authService.isAuthenticated());

    // Load initial status
    useEffect(() => {
        const checkConnections = async () => {
            if (!isAuthenticated) return;

            try {
                const connections = await authService.getConnections();
                if (Array.isArray(connections)) {
                    const linkedInConn = connections.find(c => c.platform === 'linkedin');
                    const twitterConn = connections.find(c => c.platform === 'twitter');

                    if (linkedInConn) connectLinkedIn(linkedInConn);
                    if (twitterConn) connectTwitter(twitterConn);
                }
            } catch (error) {
                console.error('Failed to load social connections', error);
            }
        };
        checkConnections();
    }, [isAuthenticated]);

    const handleConnectLinkedIn = async () => {
        try {
            const url = await authService.connectLinkedIn();
            window.location.href = url;
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to initiate LinkedIn connection' });
        }
    };

    const handleConnectTwitter = async () => {
        try {
            const url = await authService.connectTwitter();
            window.location.href = url;
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to initiate Twitter connection' });
        }
    };

    const handlePost = async () => {
        if (!postContent.trim()) {
            addNotification({ type: 'warning', message: 'Please enter some content to post' });
            return;
        }
        if (!selectedPlatforms.linkedin && !selectedPlatforms.twitter) {
            addNotification({ type: 'warning', message: 'Select at least one platform' });
            return;
        }

        setPosting(true);
        let successCount = 0;

        try {
            if (selectedPlatforms.linkedin) {
                if (!linkedin.isConnected) {
                    addNotification({ type: 'error', message: 'LinkedIn not connected' });
                } else {
                    await socialService.postToLinkedIn(postContent);
                    successCount++;
                }
            }

            if (selectedPlatforms.twitter) {
                if (!twitter.isConnected) {
                    addNotification({ type: 'error', message: 'Twitter not connected' });
                } else {
                    await socialService.postToTwitter(postContent);
                    successCount++;
                }
            }

            if (successCount > 0) {
                addNotification({ type: 'success', message: `Posted successfully to ${successCount} platform(s)!` });
                setPostContent('');
            }
        } catch (error) {
            console.error('Posting failed:', error);
            addNotification({ type: 'error', message: 'Failed to post check console for details' });
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="panel-content">
            {!isAuthenticated && (
                <div style={{
                    padding: '12px',
                    background: 'rgba(255, 171, 0, 0.1)',
                    border: '1px solid var(--warning)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--warning)',
                    marginBottom: '16px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <FiAlertCircle style={{ marginRight: '8px', fontSize: '16px' }} />
                    <span>Please log in to use social features.</span>
                </div>
            )}

            <div className="card" style={{ marginBottom: '16px', opacity: isAuthenticated ? 1 : 0.6, pointerEvents: isAuthenticated ? 'auto' : 'none' }}>
                <div className="card__header">
                    <span className="card__title">Connected Accounts</span>
                </div>
                <div className="card__body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                            className={`social-btn ${linkedin?.isConnected ? 'social-btn--linkedin' : ''}`}
                            onClick={!linkedin?.isConnected ? handleConnectLinkedIn : undefined}
                            disabled={linkedin?.isConnected}
                        >
                            <FiLinkedin size={20} />
                            <span>{linkedin?.isConnected ? 'LinkedIn Connected' : 'Connect LinkedIn'}</span>
                            {linkedin?.isConnected && <FiCheckCircle style={{ marginLeft: 'auto' }} />}
                        </button>
                        <button
                            className={`social-btn ${twitter?.isConnected ? 'social-btn--twitter' : ''}`}
                            onClick={!twitter?.isConnected ? handleConnectTwitter : undefined}
                            disabled={twitter?.isConnected}
                        >
                            <FiTwitter size={20} />
                            <span>{twitter?.isConnected ? 'Twitter Connected' : 'Connect Twitter / X'}</span>
                            {twitter?.isConnected && <FiCheckCircle style={{ marginLeft: 'auto' }} />}
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
                                    disabled={!linkedin?.isConnected}
                                />
                                <FiLinkedin /> LinkedIn
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedPlatforms.twitter}
                                    onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, twitter: e.target.checked })}
                                    disabled={!twitter?.isConnected}
                                />
                                <FiTwitter /> Twitter
                            </label>
                        </div>
                    </div>

                    <button
                        className="btn btn--primary"
                        style={{ width: '100%' }}
                        disabled={isPosting}
                        onClick={handlePost}
                    >
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


// Note Editor Panel Component
function NoteEditorPanel() {
    const { notes, activeNoteId, setNotes, setActiveNote, addNote, updateNote, deleteNote } = useNotesStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Load notes on mount
    useEffect(() => {
        const loadedNotes = notesService.getAllNotes();
        setNotes(loadedNotes);
        if (loadedNotes.length > 0 && !activeNoteId) {
            setActiveNote(loadedNotes[0].id);
        }
    }, []);

    const handleCreateNote = () => {
        const newNote = notesService.createNote('New Note', '');
        addNote(newNote);
    };

    const handleUpdateNote = (field, value) => {
        if (!activeNoteId) return;
        notesService.updateNote(activeNoteId, { [field]: value });
        updateNote(activeNoteId, { [field]: value });
    };

    const handleDeleteNote = (noteId) => {
        notesService.deleteNote(noteId);
        deleteNote(noteId);
    };

    const handleExport = (noteId) => {
        notesService.exportNote(noteId);
    };

    const handleTogglePin = (noteId) => {
        const updatedNote = notesService.togglePin(noteId);
        if (updatedNote) {
            setNotes(notesService.getAllNotes());
        }
    };

    const activeNote = notes.find(n => n.id === activeNoteId);

    const filteredNotes = searchQuery
        ? notes.filter(n =>
            n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.content?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : notes;

    return (
        <div className="notes-panel">
            {/* Notes Header */}
            <div className="notes-panel__header">
                <div className="notes-panel__search">
                    <FiSearch size={14} />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="btn btn--primary btn--sm" onClick={handleCreateNote}>
                    <FiPlus /> New
                </button>
            </div>

            <div className="notes-panel__content">
                {/* Notes List */}
                <div className="notes-list">
                    {filteredNotes.length === 0 ? (
                        <div className="notes-list__empty">
                            <FiFileText size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                            <p>No notes yet</p>
                            <button className="btn btn--ghost btn--sm" onClick={handleCreateNote}>
                                Create your first note
                            </button>
                        </div>
                    ) : (
                        filteredNotes.map((note) => (
                            <div
                                key={note.id}
                                className={`note-item ${activeNoteId === note.id ? 'note-item--active' : ''}`}
                                onClick={() => setActiveNote(note.id)}
                            >
                                <div className="note-item__header">
                                    <span className="note-item__title">
                                        {note.pinned && <FiMapPin size={10} style={{ marginRight: '4px' }} />}
                                        {note.title || 'Untitled'}
                                    </span>
                                    <span className="note-item__date">
                                        {new Date(note.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="note-item__preview">
                                    {note.content?.slice(0, 60) || 'Empty note...'}
                                </p>
                            </div>
                        ))
                    )}
                </div>

                {/* Note Editor */}
                {activeNote && (
                    <div className="note-editor">
                        <div className="note-editor__header">
                            <input
                                type="text"
                                className="note-editor__title"
                                value={activeNote.title}
                                onChange={(e) => handleUpdateNote('title', e.target.value)}
                                placeholder="Note title..."
                            />
                            <div className="note-editor__actions">
                                <button
                                    className="btn btn--ghost btn--icon"
                                    onClick={() => handleTogglePin(activeNote.id)}
                                    title={activeNote.pinned ? 'Unpin' : 'Pin'}
                                >
                                    <FiMapPin style={{ color: activeNote.pinned ? 'var(--warning)' : undefined }} />
                                </button>
                                <button
                                    className="btn btn--ghost btn--icon"
                                    onClick={() => handleExport(activeNote.id)}
                                    title="Export"
                                >
                                    <FiDownload />
                                </button>
                                <button
                                    className="btn btn--ghost btn--icon"
                                    onClick={() => handleDeleteNote(activeNote.id)}
                                    title="Delete"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>
                        <textarea
                            className="note-editor__content"
                            value={activeNote.content}
                            onChange={(e) => handleUpdateNote('content', e.target.value)}
                            placeholder="Start typing your note..."
                        />
                        <div className="note-editor__footer">
                            <span className="note-editor__info">
                                Last updated: {new Date(activeNote.updatedAt).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}
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
                                            AI will generate flow diagrams, class diagrams, or sequence diagrams.
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
                                            AI will suggest relevant documentation and tutorials.
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
// Right Panel Component
function RightPanel({ style, editorMinimized }) {
    const { rightPanelOpen, rightPanelTab, setRightPanelTab, toggleRightPanel, rightPanelExpanded, toggleRightPanelExpanded } = useUIStore();
    const { files, activeFileId } = useFileStore();

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
        { id: 'github', label: 'GitHub', icon: <FiGithub /> },
        { id: 'social', label: 'Social', icon: <FiShare2 /> },
        { id: 'notes', label: 'Notes', icon: <FiFileText /> },
        { id: 'learn', label: 'Learn', icon: <FiBookOpen /> },
        { id: 'review', label: 'Review', icon: <FiCheckCircle /> },
        { id: 'snippets', label: 'Snippets', icon: <FiCode /> }
    ];

    // Calculate style - when editor is minimized and panel is expanded, limit max width
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

            {rightPanelTab === 'preview' && <WebPreview files={files} activeFileId={activeFileId} />}
            {rightPanelTab === 'github' && <GitHubPanel />}
            {rightPanelTab === 'social' && <SocialPanel />}
            {rightPanelTab === 'notes' && <NoteEditorPanel />}
            {rightPanelTab === 'learn' && <LearningPanel />}
            {rightPanelTab === 'review' && <ReviewPanel />}
            {rightPanelTab === 'snippets' && <SnippetPanel />}
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

// Portfolio Generator Modal
function PortfolioGeneratorModal() {
    const { modals, closeModal } = useUIStore();

    if (!modals.portfolioGenerator) return null;

    return (
        <div className="modal-overlay" onClick={() => closeModal('portfolioGenerator')}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '900px', maxWidth: '95vw', height: '90vh' }}>
                <div className="modal__header">
                    <h3 className="modal__title">Portfolio Generator</h3>
                    <button className="btn btn--ghost btn--icon" onClick={() => closeModal('portfolioGenerator')}>
                        <FiX />
                    </button>
                </div>
                <div className="modal__body" style={{ padding: '0', overflow: 'hidden' }}>
                    <PortfolioGenerator />
                </div>
            </div>
        </div>
    );
}

// Deployment Modal Component
function DeploymentModalComponent() {
    const { modals, closeModal } = useUIStore();

    if (!modals.deployment) return null;

    return (
        <div className="modal-overlay" onClick={() => closeModal('deployment')}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '500px', maxWidth: '95vw' }}>
                <div className="modal__header">
                    <h3 className="modal__title">Deploy to Cloud</h3>
                    <button className="btn btn--ghost btn--icon" onClick={() => closeModal('deployment')}>
                        <FiX />
                    </button>
                </div>
                <div className="modal__body">
                    <DeploymentModal />
                </div>
            </div>
        </div>
    );
}

// Compiler Manager Modal
function CompilerManagerModal() {
    const { modals, closeModal, addNotification } = useUIStore();
    const { compilers, setCompilerStatus } = useExecutionStore();
    const [checking, setChecking] = useState(false);

    if (!modals.compilerManager) return null;

    const checkCompilers = async () => {
        setChecking(true);
        try {
            const health = await executorService.health();
            if (health.available) {
                const languages = await executorService.getLanguages();
                languages.forEach(lang => {
                    setCompilerStatus(lang.id, {
                        available: lang.available,
                        version: lang.version
                    });
                });
            }
        } catch (error) {
            console.error('Failed to check compilers:', error);
        }
        setChecking(false);
    };

    useEffect(() => {
        if (modals.compilerManager) {
            checkCompilers();
        }
    }, [modals.compilerManager]);

    const compilerList = [
        {
            id: 'python',
            name: 'Python',
            icon: '🐍',
            installCmd: 'winget install Python.Python.3',
            downloadUrl: 'https://www.python.org/downloads/'
        },
        {
            id: 'java',
            name: 'Java (JDK)',
            icon: '☕',
            installCmd: 'winget install Microsoft.OpenJDK.17',
            downloadUrl: 'https://adoptium.net/'
        },
        {
            id: 'javascript',
            name: 'Node.js',
            icon: '📜',
            installCmd: 'winget install OpenJS.NodeJS.LTS',
            downloadUrl: 'https://nodejs.org/'
        }
    ];

    return (
        <div className="modal-overlay" onClick={() => closeModal('compilerManager')}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h3 className="modal__title"><FiTerminal style={{ marginRight: '8px' }} />Compiler Manager</h3>
                    <button className="btn btn--ghost btn--icon" onClick={() => closeModal('compilerManager')}>
                        <FiX />
                    </button>
                </div>
                <div className="modal__body">
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Check and install compilers/interpreters for code execution.
                    </p>

                    {compilerList.map((compiler) => {
                        const status = compilers[compiler.id];
                        return (
                            <div key={compiler.id} className="compiler-item" style={{
                                padding: '12px',
                                border: '1px solid var(--border-primary)',
                                borderRadius: '8px',
                                marginBottom: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '24px' }}>{compiler.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: '500' }}>{compiler.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {status?.version || 'Not detected'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {status?.available === true && (
                                            <FiCheckCircle style={{ color: 'var(--success)' }} />
                                        )}
                                        {status?.available === false && (
                                            <FiAlertCircle style={{ color: 'var(--error)' }} />
                                        )}
                                        {status?.available === null && (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unknown</span>
                                        )}
                                    </div>
                                </div>

                                {status?.available === false && (
                                    <div style={{ marginTop: '12px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                                        <p style={{ fontSize: '12px', marginBottom: '8px' }}>Install using:</p>
                                        <code style={{ fontSize: '11px', background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '4px' }}>
                                            {compiler.installCmd}
                                        </code>
                                        <div style={{ marginTop: '8px' }}>
                                            <a
                                                href={compiler.downloadUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '12px', color: 'var(--info)' }}
                                            >
                                                <FiExternalLink size={12} /> Download manually
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <button
                        className="btn btn--secondary"
                        style={{ width: '100%' }}
                        onClick={checkCompilers}
                        disabled={checking}
                    >
                        {checking ? <><span className="spinner" /> Checking...</> : <><FiRefreshCw /> Refresh Status</>}
                    </button>
                </div>
                <div className="modal__footer">
                    <button className="btn btn--primary" onClick={() => closeModal('compilerManager')}>
                        Done
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
    const { compilers } = useExecutionStore();
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
                    <FiCpu size={12} /> Roolts Ready
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

// Settings Modal
// Settings Modal
function SettingsModal() {
    const { modals, closeModal } = useUIStore();
    const {
        theme, backgroundImage, backgroundOpacity, format, features,
        uiFontSize, uiFontFamily,
        setTheme, setBackgroundImage, setBackgroundOpacity,
        setUiFontSize, setUiFontFamily,
        updateFormat, toggleFeature, setFeature
    } = useSettingsStore();
    const [activeTab, setActiveTab] = useState('theme');

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBackgroundImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    if (!modals.settings) return null;

    return (
        <div className="modal-overlay">
            <div className="modal modal--large" style={{ maxWidth: '600px', height: 'auto' }}>
                <div className="modal__header">
                    <h2 className="modal__title">Settings</h2>
                    <button className="btn btn--ghost btn--icon" onClick={() => closeModal('settings')}>
                        <FiX />
                    </button>
                </div>
                <div className="modal__body" style={{ padding: 0 }}>
                    <div className="settings-container" style={{ display: 'flex', minHeight: '400px' }}>
                        {/* Settings Sidebar */}
                        <div className="settings-sidebar" style={{ width: '150px', borderRight: '1px solid var(--border-primary)', padding: '1rem 0' }}>
                            <button
                                className={`settings-tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
                                onClick={() => setActiveTab('theme')}
                                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', color: activeTab === 'theme' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <FiImage style={{ marginRight: '8px' }} /> Appearance
                            </button>
                            <button
                                className={`settings-tab-btn ${activeTab === 'format' ? 'active' : ''}`}
                                onClick={() => setActiveTab('format')}
                                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', color: activeTab === 'format' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <FiEdit3 style={{ marginRight: '8px' }} /> Editor
                            </button>
                            <button
                                className={`settings-tab-btn ${activeTab === 'features' ? 'active' : ''}`}
                                onClick={() => setActiveTab('features')}
                                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', color: activeTab === 'features' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <FiCpu style={{ marginRight: '8px' }} /> Features
                            </button>
                        </div>

                        {/* Settings Content */}
                        <div className="settings-content" style={{ flex: 1, padding: '1.5rem' }}>
                            {activeTab === 'theme' && (
                                <div className="settings-section">
                                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>Appearance</h3>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>Editor Theme</label>
                                        <select
                                            className="input-select"
                                            value={theme}
                                            onChange={(e) => setTheme(e.target.value)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="vs-dark">Dark (Default)</option>
                                            <option value="light">Light</option>
                                            <option value="hc-black">High Contrast</option>
                                            <option value="nord">Nord</option>
                                            <option value="dracula">Dracula</option>
                                            <option value="solarized-light">Solarized Light</option>
                                        </select>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>Background Image</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {backgroundImage ? (
                                                <div style={{ position: 'relative', width: '100%', height: '150px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                                                    <img src={backgroundImage} alt="Background" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button
                                                        className="btn btn--ghost btn--icon"
                                                        onClick={() => setBackgroundImage(null)}
                                                        style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: 'white' }}
                                                        title="Remove Image"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    border: '2px dashed var(--border-primary)',
                                                    borderRadius: '8px',
                                                    padding: '2rem',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    position: 'relative'
                                                }}>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                                    />
                                                    <FiImage size={24} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }} />
                                                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Click to upload image</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>Background Opacity ({Math.round(backgroundOpacity * 100)}%)</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={backgroundOpacity}
                                            onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>UI Font Size ({uiFontSize}px)</label>
                                        <input
                                            type="range"
                                            min="12"
                                            max="20"
                                            value={uiFontSize}
                                            onChange={(e) => setUiFontSize(parseInt(e.target.value))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>UI Font Family</label>
                                        <select
                                            className="input-select"
                                            value={uiFontFamily}
                                            onChange={(e) => setUiFontFamily(e.target.value)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="Inter">Inter (Default)</option>
                                            <option value="Roboto">Roboto</option>
                                            <option value="Segoe UI">Segoe UI</option>
                                            <option value="Arial">Arial</option>
                                            <option value="Helvetica">Helvetica</option>
                                            <option value="'Courier New'">Courier New (Monospace)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'format' && (
                                <div className="settings-section">
                                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>Editor Format</h3>

                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>Font Size ({format.fontSize}px)</label>
                                        <input
                                            type="range"
                                            min="10"
                                            max="32"
                                            value={format.fontSize}
                                            onChange={(e) => updateFormat('fontSize', parseInt(e.target.value))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>Tab Size</label>
                                        <select
                                            className="input-select"
                                            value={format.tabSize}
                                            onChange={(e) => updateFormat('tabSize', parseInt(e.target.value))}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="2">2 Spaces</option>
                                            <option value="4">4 Spaces</option>
                                            <option value="8">8 Spaces</option>
                                        </select>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>Word Wrap</label>
                                        <select
                                            className="input-select"
                                            value={format.wordWrap}
                                            onChange={(e) => updateFormat('wordWrap', e.target.value)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="on">On</option>
                                            <option value="off">Off</option>
                                            <option value="wordWrapColumn">Wrap at Column</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'features' && (
                                <div className="settings-section">
                                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>Features</h3>

                                    <div className="form-check" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={features.minimap}
                                            onChange={() => toggleFeature('minimap')}
                                            style={{ marginRight: '8px' }}
                                        />
                                        <label>Show Minimap</label>
                                    </div>

                                    <div className="form-check" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={features.lineNumbers === 'on'}
                                            onChange={(e) => setFeature('lineNumbers', e.target.checked ? 'on' : 'off')}
                                            style={{ marginRight: '8px' }}
                                        />
                                        <label>Show Line Numbers</label>
                                    </div>

                                    <div className="form-check" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={features.livePreview}
                                            onChange={() => toggleFeature('livePreview')}
                                            style={{ marginRight: '8px' }}
                                        />
                                        <label>Live Web Preview (Auto-open)</label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Main App Component
function App() {
    const {
        sidebarOpen, toggleSidebar, openModal, addNotification, editorMinimized, toggleEditorMinimized,
        rightPanelOpen, toggleRightPanel, setRightPanelTab
    } = useUIStore();
    const { files, activeFileId, markFileSaved } = useFileStore();
    const { isExecuting, setExecuting, setOutput, setError, setExecutionTime, addToHistory, setShowOutput } = useExecutionStore();
    const { setConnected, setRepositories, isConnected } = useGitHubStore();
    const [terminalOpen, setTerminalOpen] = useState(false);

    // Resizable panel state
    const [rightPanelWidth, setRightPanelWidth] = useState(360);
    const [terminalHeight, setTerminalHeight] = useState(250);
    const [isResizing, setIsResizing] = useState(null); // 'right' or 'terminal'
    const mainRef = React.useRef(null);

    const activeFile = files.find(f => f.id === activeFileId);

    // Settings
    const { theme, backgroundImage, backgroundOpacity, uiFontSize, uiFontFamily } = useSettingsStore();

    // Apply Theme and UI Settings
    // Apply Theme and UI Settings
    useEffect(() => {
        // Remove all theme classes first
        document.body.classList.remove('theme-light', 'theme-nord', 'theme-dracula', 'theme-solarized-light');

        // Apply theme class
        if (theme === 'light') document.body.classList.add('theme-light');
        else if (theme === 'nord') document.body.classList.add('theme-nord');
        else if (theme === 'dracula') document.body.classList.add('theme-dracula');
        else if (theme === 'solarized-light') document.body.classList.add('theme-solarized-light');

        // Handle Monaco Theme Mapping (fallback to standard themes for now if custom not registered)
        // ideally we would monaco.editor.defineTheme here, but for now let's leave it.
        // The Editor component likely consumes 'theme' directly.

        // Apply UI Settings
        document.documentElement.style.fontSize = `${uiFontSize}px`;
        if (uiFontFamily) {
            document.documentElement.style.setProperty('--font-sans', uiFontFamily);
        }
    }, [theme, uiFontSize, uiFontFamily]);

    // Handle resize mouse events
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing || !mainRef.current) return;

            const mainRect = mainRef.current.getBoundingClientRect();

            if (isResizing === 'right') {
                const newWidth = mainRect.right - e.clientX;
                setRightPanelWidth(Math.max(200, Math.min(800, newWidth)));
            } else if (isResizing === 'terminal') {
                const wrapperRect = mainRef.current.querySelector('.editor-terminal-wrapper')?.getBoundingClientRect();
                if (wrapperRect) {
                    const newHeight = wrapperRect.bottom - e.clientY;
                    setTerminalHeight(Math.max(100, Math.min(500, newHeight)));
                }
            }
        };

        const handleMouseUp = () => {
            setIsResizing(null);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (isResizing) {
            document.body.style.cursor = isResizing === 'right' ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Handle GitHub OAuth callback
    useEffect(() => {
        const handleGitHubCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code && window.location.pathname.includes('callback/github')) {
                try {
                    // Exchange code for token
                    const response = await githubService.completeAuth(code);

                    if (response.access_token) {
                        githubService.setToken(response.access_token);
                        setConnected(true, response.user);

                        // Load repositories
                        const repos = await githubService.listRepositories();
                        setRepositories(repos);

                        addNotification({ type: 'success', message: `Connected to GitHub as ${response.user?.login}!` });
                    }

                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname.replace('/callback/github', '/'));
                } catch (error) {
                    console.error('GitHub auth failed:', error);
                    addNotification({ type: 'error', message: 'GitHub authentication failed' });
                }
            }

            // Check if already authenticated (token in localStorage)
            if (!isConnected && githubService.isAuthenticated()) {
                try {
                    const user = await githubService.getCurrentUser();
                    setConnected(true, user);
                    const repos = await githubService.listRepositories();
                    setRepositories(repos);
                } catch (error) {
                    // Token might be invalid, clear it
                    githubService.clearToken();
                }
            }
        };

        handleGitHubCallback();
    }, []);

    // Handle Social Media OAuth callbacks
    useEffect(() => {
        const handleSocialCallbacks = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            if (code && state) {
                const { connectLinkedIn, connectTwitter } = useSocialStore.getState();

                if (window.location.pathname.includes('callback/linkedin')) {
                    try {
                        const response = await authService.linkedinCallback(code, state);
                        if (response.user_id) {
                            connectLinkedIn({ id: response.user_id });
                            addNotification({ type: 'success', message: 'Connected to LinkedIn successfully!' });
                            setRightPanelTab('social');
                            if (!rightPanelOpen) toggleRightPanel();
                        }
                    } catch (error) {
                        console.error('LinkedIn auth failed:', error);
                        addNotification({ type: 'error', message: 'LinkedIn authentication failed' });
                    }
                    window.history.replaceState({}, document.title, '/');
                } else if (window.location.pathname.includes('callback/twitter')) {
                    try {
                        const response = await authService.twitterCallback(code, state);
                        if (response.username) {
                            connectTwitter({ username: response.username });
                            addNotification({ type: 'success', message: `Connected to Twitter as @${response.username}!` });
                            setRightPanelTab('social');
                            if (!rightPanelOpen) toggleRightPanel();
                        }
                    } catch (error) {
                        console.error('Twitter auth failed:', error);
                        addNotification({ type: 'error', message: 'Twitter authentication failed' });
                    }
                    window.history.replaceState({}, document.title, '/');
                }
            }
        };
        handleSocialCallbacks();
    }, []);


    const handleSave = () => {
        addNotification({ type: 'success', message: 'File saved successfully!' });
        if (activeFileId) {
            markFileSaved(activeFileId);
        }
    };

    const handleRunCode = async () => {
        if (!activeFile) {
            addNotification({ type: 'error', message: 'No file selected to run' });
            return;
        }

        // Check for Web/React content to open Preview
        const isWeb = activeFile.language === 'html' ||
            (activeFile.language === 'javascript' && (
                activeFile.content.includes('import React') ||
                activeFile.content.includes('export default') ||
                activeFile.content.includes('document.') ||
                activeFile.content.includes('window.') ||
                activeFile.name.endsWith('.jsx')
            ));

        if (isWeb) {
            if (!rightPanelOpen) toggleRightPanel();
            setRightPanelTab('preview');
            // Store the "run" action in history or notification
            return;
        }

        setExecuting(true);
        setOutput('');
        setError(null);

        const startTime = Date.now();

        try {
            const result = await executorService.execute(activeFile.content, activeFile.language);
            const executionTime = Date.now() - startTime;
            setExecutionTime(executionTime);
            setShowOutput(true);

            if (result.success) {
                const outputStr = typeof result.output === 'string' ? result.output : JSON.stringify(result.output || 'Code executed successfully (no output)', null, 2);
                setOutput(outputStr);
                addToHistory({
                    success: true,
                    language: activeFile.language,
                    output: outputStr
                });
            } else {
                const errorStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error || 'Execution failed', null, 2);
                setError(errorStr);
                addToHistory({
                    success: false,
                    language: activeFile.language,
                    error: errorStr
                });
            }
        } catch (error) {
            const executionTime = Date.now() - startTime;
            setExecutionTime(executionTime);
            setError(`Failed to execute: ${error.message}`);
            addToHistory({
                success: false,
                language: activeFile.language,
                error: error.message
            });
        }

        setExecuting(false);
    };

    // Voice Commands Integration
    const voiceCommands = {
        'run code': () => handleRunCode(),
        'save file': () => handleSave(),
        'new file': () => openModal('newFile'),
        'open settings': () => openModal('settings'),
        'open portfolio': () => openModal('portfolioGenerator'),
        'review code': () => {
            if (!rightPanelOpen) toggleRightPanel();
            setRightPanelTab('review');
        },
        'open terminal': () => {
            if (!terminalOpen) setTerminalOpen(true);
        },
        'close terminal': () => {
            if (terminalOpen) setTerminalOpen(false);
        }
    };

    const { isListening, toggleListening, feedback, isSupported } = useVoiceCommands(voiceCommands);

    // Show voice feedback
    useEffect(() => {
        if (feedback) {
            addNotification({ type: feedback.type, message: feedback.message });
        }
    }, [feedback]);


    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header__brand">
                    <div className="header__logo">R</div>
                    <h1 className="header__title">Roolts</h1>
                </div>
                <div className="header__actions">
                    {/* Voice Control Button */}
                    {isSupported && (
                        <button
                            className={`btn btn--icon ${isListening ? 'btn--danger pulsing' : 'btn--ghost'}`}
                            onClick={toggleListening}
                            title={isListening ? "Stop Listening" : "Start Voice Control"}
                            style={{ marginRight: '8px' }}
                        >
                            {isListening ? <FiMicOff /> : <FiMic />}
                        </button>
                    )}

                    <button
                        className="btn btn--success"
                        onClick={handleRunCode}
                        disabled={isExecuting || !activeFile}
                        title="Run Code"
                    >
                        {isExecuting ? (
                            <><span className="spinner" /> Running...</>
                        ) : (
                            <><FiPlay /> Run</>
                        )}
                    </button>
                    <button
                        className="btn btn--secondary"
                        onClick={() => {
                            if (!rightPanelOpen) toggleRightPanel();
                            setRightPanelTab('review');
                        }}
                        title="AI Code Review"
                    >
                        <FiCheckCircle /> Review
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={handleSave} title="Save">
                        <FiSave />
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={() => openModal('newFile')} title="New File">
                        <FiPlus />
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={() => openModal('compilerManager')} title="Compiler Manager">
                        <FiTerminal />
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={() => openModal('settings')} title="Settings">
                        <FiSettings />
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={() => openModal('portfolioGenerator')} title="Generate Portfolio">
                        <FiLayout />
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={() => openModal('deployment')} title="Deploy to Cloud">
                        <FiUploadCloud />
                    </button>

                </div>
            </header>

            {/* Main Content */}
            <main className={`main ${editorMinimized ? 'main--editor-minimized' : ''}`} ref={mainRef}>
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
                            <div className="sidebar-content">
                                <FileExplorer />
                            </div>
                            <div className="sidebar-footer">
                                <button
                                    className={`sidebar-terminal-btn ${terminalOpen ? 'sidebar-terminal-btn--active' : ''}`}
                                    onClick={() => setTerminalOpen(!terminalOpen)}
                                    title="Toggle Terminal"
                                >
                                    <FiTerminal size={16} />
                                    <span>Terminal</span>
                                    {terminalOpen && <FiChevronRight size={14} style={{ marginLeft: 'auto', transform: 'rotate(90deg)' }} />}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="sidebar-collapsed-buttons">
                            <button
                                className="btn btn--ghost btn--icon"
                                onClick={toggleSidebar}
                                title="Expand Explorer"
                            >
                                <FiChevronRight />
                            </button>
                            <button
                                className={`btn btn--ghost btn--icon ${terminalOpen ? 'btn--active' : ''}`}
                                onClick={() => setTerminalOpen(!terminalOpen)}
                                title="Toggle Terminal"
                            >
                                <FiTerminal />
                            </button>
                        </div>
                    )}
                </aside>

                {/* Editor and Terminal Area */}
                <div className={`editor-terminal-wrapper ${editorMinimized ? 'editor-terminal-wrapper--minimized' : ''}`}>
                    {/* Editor */}
                    <div className={`editor-container ${editorMinimized ? 'editor-container--minimized' : ''} ${terminalOpen ? 'editor-container--with-terminal' : ''}`}>
                        {editorMinimized ? (
                            <div className="editor-minimized-bar">
                                <button
                                    className="editor-minimized-bar__btn"
                                    onClick={toggleEditorMinimized}
                                    title="Expand Editor"
                                >
                                    <FiCode /> Editor
                                </button>
                            </div>
                        ) : (
                            <>
                                <EditorTabs />
                                <CodeEditor />
                            </>
                        )}
                    </div>

                    {/* Terminal Bottom Panel */}
                    {terminalOpen && (
                        <>
                            <div
                                className={`resize-handle resize-handle--vertical ${isResizing === 'terminal' ? 'resize-handle--active' : ''}`}
                                onMouseDown={() => setIsResizing('terminal')}
                            />
                            <div className="terminal-bottom-panel" style={{ height: terminalHeight }}>
                                <div className="terminal-panel-header">
                                    <div className="terminal-panel-tabs">
                                        <button className="terminal-panel-tab terminal-panel-tab--active">
                                            <FiTerminal size={14} /> Terminal
                                        </button>
                                    </div>
                                    <button
                                        className="btn btn--ghost btn--icon"
                                        onClick={() => setTerminalOpen(false)}
                                        title="Close Terminal"
                                    >
                                        <FiX size={14} />
                                    </button>
                                </div>
                                <TerminalPanel />
                            </div>
                        </>
                    )}
                </div>

                {/* Resize Handle for Right Panel */}
                <div
                    className={`resize-handle resize-handle--horizontal ${isResizing === 'right' ? 'resize-handle--active' : ''}`}
                    onMouseDown={() => setIsResizing('right')}
                />

                {/* Right Panel */}
                <RightPanel style={{ width: rightPanelWidth }} editorMinimized={editorMinimized} />
            </main>

            {/* Status Bar */}
            <StatusBar />

            {/* Modals */}
            <NewFileModal />
            <CompilerManagerModal />
            <SettingsModal />
            <PortfolioGeneratorModal />
            <DeploymentModalComponent />

            {/* Notifications */}
            <Notifications />
        </div>
    );
}

export default App;
