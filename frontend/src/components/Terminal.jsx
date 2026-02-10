/**
 * Enhanced Terminal Component
 * Integrated terminal with file sync capabilities
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    FiTerminal,
    FiX,
    FiMaximize2,
    FiMinimize2,
    FiRefreshCw,
    FiSettings,
    FiCopy,
    FiTrash2
} from 'react-icons/fi';
import { terminalService } from '../services/terminalService';
import { fileSyncService } from '../services/fileSyncService';

const Terminal = ({ isVisible, onToggle, onFileChange, className = '' }) => {
    const [history, setHistory] = useState([]);
    const [currentInput, setCurrentInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentDirectory, setCurrentDirectory] = useState('');
    const [sessionId] = useState('main-terminal');
    const [isMaximized, setIsMaximized] = useState(false);
    const [terminalSettings, setTerminalSettings] = useState({
        fontSize: 14,
        theme: 'dark',
        cursorBlink: true
    });

    const inputRef = useRef(null);
    const outputRef = useRef(null);
    const historyIndexRef = useRef(-1);
    const commandHistoryRef = useRef([]);

    // Initialize terminal
    useEffect(() => {
        if (isVisible) {
            initializeTerminal();
        }
    }, [isVisible]);

    // Focus input when terminal becomes visible
    useEffect(() => {
        if (isVisible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isVisible]);

    // Auto-scroll to bottom when new output is added
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [history]);

    // Make terminal focusable globally
    useEffect(() => {
        window.focusTerminal = () => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
            if (!isVisible && onToggle) {
                onToggle(true);
            }
        };

        return () => {
            delete window.focusTerminal;
        };
    }, [isVisible, onToggle]);

    // Initialize terminal state
    const initializeTerminal = async () => {
        try {
            // Get current working directory
            const cwd = await terminalService.getCwd(sessionId);
            if (cwd) {
                setCurrentDirectory(cwd);
            }

            // Load command history
            const cmdHistory = await terminalService.getHistory(sessionId);
            if (cmdHistory && cmdHistory.length > 0) {
                commandHistoryRef.current = cmdHistory;

                // Show last few commands in terminal
                const recentCommands = cmdHistory.slice(-5).map(cmd => ({
                    type: 'info',
                    content: `Previous: ${cmd}`,
                    timestamp: new Date().toLocaleTimeString()
                }));
                setHistory(recentCommands);
            }

            // Welcome message
            addToHistory('info', '🚀 Roolts Terminal Ready - File Sync Enabled');
            addToHistory('info', `📁 Working Directory: ${cwd || 'Unknown'}`);

        } catch (error) {
            addToHistory('error', `Failed to initialize terminal: ${error.message}`);
        }
    };

    // Add entry to terminal history
    const addToHistory = (type, content, command = null) => {
        const entry = {
            type, // 'command', 'output', 'error', 'info'
            content,
            command,
            timestamp: new Date().toLocaleTimeString(),
            id: Date.now() + Math.random()
        };

        setHistory(prev => [...prev, entry]);
    };

    // Execute terminal command
    const executeCommand = async (command) => {
        if (!command.trim()) return;

        setIsLoading(true);
        addToHistory('command', command, command);

        try {
            // Handle built-in commands
            if (await handleBuiltInCommand(command)) {
                return;
            }

            // Execute command via backend
            const result = await terminalService.execute(command, sessionId);

            if (result.success) {
                if (result.output) {
                    // Split multiline output
                    const lines = result.output.split('\n');
                    lines.forEach(line => {
                        if (line.trim()) {
                            addToHistory('output', line);
                        }
                    });
                }

                // Update current directory if it changed
                if (result.cwd && result.cwd !== currentDirectory) {
                    setCurrentDirectory(result.cwd);
                    addToHistory('info', `📁 ${result.cwd}`);
                }

                // Add to command history
                commandHistoryRef.current.push(command);

                // Check if command might affect files and refresh if needed
                if (isFileCommand(command)) {
                    setTimeout(() => {
                        if (onFileChange) onFileChange();
                    }, 500);
                }

            } else {
                addToHistory('error', result.error || 'Command failed');

                if (result.output) {
                    const lines = result.output.split('\n');
                    lines.forEach(line => {
                        if (line.trim()) {
                            addToHistory('error', line);
                        }
                    });
                }
            }

        } catch (error) {
            addToHistory('error', `Command execution failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle built-in terminal commands
    const handleBuiltInCommand = async (command) => {
        const cmd = command.trim().toLowerCase();

        if (cmd === 'clear' || cmd === 'cls') {
            setHistory([]);
            addToHistory('info', '🚀 Terminal Cleared');
            return true;
        }

        if (cmd === 'pwd') {
            addToHistory('output', currentDirectory || 'Unknown directory');
            return true;
        }

        if (cmd.startsWith('cd ')) {
            const path = command.substring(3).trim();
            try {
                const newCwd = await terminalService.setCwd(path, sessionId);
                if (newCwd) {
                    setCurrentDirectory(newCwd);
                    addToHistory('info', `📁 Changed to: ${newCwd}`);
                } else {
                    addToHistory('error', `Failed to change directory to: ${path}`);
                }
            } catch (error) {
                addToHistory('error', `Directory change failed: ${error.message}`);
            }
            return true;
        }

        if (cmd === 'help' || cmd === '?') {
            const helpText = [
                '🔧 Roolts Terminal Commands:',
                '  clear/cls     - Clear terminal',
                '  pwd           - Show current directory',
                '  cd <path>     - Change directory',
                '  help/?        - Show this help',
                '  refresh       - Refresh file explorer',
                '  settings      - Show terminal settings',
                '',
                '💡 Plus all standard system commands!'
            ];
            helpText.forEach(line => addToHistory('info', line));
            return true;
        }

        if (cmd === 'refresh') {
            if (onFileChange) {
                onFileChange();
                addToHistory('info', '🔄 File explorer refreshed');
            }
            return true;
        }

        if (cmd === 'settings') {
            addToHistory('info', '⚙️ Terminal Settings:');
            addToHistory('info', `  Font Size: ${terminalSettings.fontSize}px`);
            addToHistory('info', `  Theme: ${terminalSettings.theme}`);
            addToHistory('info', `  Cursor Blink: ${terminalSettings.cursorBlink}`);
            return true;
        }

        return false;
    };

    // Check if command might affect files
    const isFileCommand = (command) => {
        const fileCommands = [
            'touch', 'mkdir', 'rm', 'rmdir', 'mv', 'cp', 'git',
            'npm', 'yarn', 'pip', 'create', 'del', 'move', 'copy'
        ];

        const cmdWord = command.trim().split(' ')[0].toLowerCase();
        return fileCommands.some(cmd => cmdWord.includes(cmd));
    };

    // Handle keyboard input
    const handleKeyDown = (event) => {
        if (isLoading) return;

        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                if (currentInput.trim()) {
                    executeCommand(currentInput);
                    setCurrentInput('');
                    historyIndexRef.current = -1;
                }
                break;

            case 'ArrowUp':
                event.preventDefault();
                if (commandHistoryRef.current.length > 0) {
                    const newIndex = historyIndexRef.current + 1;
                    if (newIndex < commandHistoryRef.current.length) {
                        historyIndexRef.current = newIndex;
                        const cmd = commandHistoryRef.current[commandHistoryRef.current.length - 1 - newIndex];
                        setCurrentInput(cmd);
                    }
                }
                break;

            case 'ArrowDown':
                event.preventDefault();
                if (historyIndexRef.current > 0) {
                    historyIndexRef.current--;
                    const cmd = commandHistoryRef.current[commandHistoryRef.current.length - 1 - historyIndexRef.current];
                    setCurrentInput(cmd);
                } else if (historyIndexRef.current === 0) {
                    historyIndexRef.current = -1;
                    setCurrentInput('');
                }
                break;

            case 'Tab':
                event.preventDefault();
                // Could implement command completion here
                break;

            case 'c':
                if (event.ctrlKey) {
                    event.preventDefault();
                    addToHistory('info', '^C');
                    setCurrentInput('');
                    setIsLoading(false);
                }
                break;
        }
    };

    // Clear terminal
    const clearTerminal = () => {
        setHistory([]);
        addToHistory('info', '🚀 Terminal Cleared');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Copy terminal content
    const copyTerminalContent = () => {
        const content = history.map(entry => {
            if (entry.type === 'command') {
                return `$ ${entry.content}`;
            }
            return entry.content;
        }).join('\n');

        navigator.clipboard.writeText(content).then(() => {
            addToHistory('info', '📋 Terminal content copied to clipboard');
        }).catch(() => {
            addToHistory('error', 'Failed to copy to clipboard');
        });
    };

    // Render terminal entry
    const renderEntry = (entry) => {
        const getEntryClass = (type) => {
            switch (type) {
                case 'command': return 'terminal-command';
                case 'output': return 'terminal-output';
                case 'error': return 'terminal-error';
                case 'info': return 'terminal-info';
                default: return 'terminal-output';
            }
        };

        return (
            <div key={entry.id} className={`terminal-entry ${getEntryClass(entry.type)}`}>
                {entry.type === 'command' && (
                    <span className="terminal-prompt">
                        <span className="prompt-path">{currentDirectory || '~'}</span>
                        <span className="prompt-symbol">$</span>
                    </span>
                )}
                <span className="terminal-content">{entry.content}</span>
                <span className="terminal-timestamp">{entry.timestamp}</span>
            </div>
        );
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className={`terminal-container ${isMaximized ? 'maximized' : ''} ${className}`}>
            {/* Terminal Header */}
            <div className="terminal-header">
                <div className="terminal-title">
                    <FiTerminal />
                    <span>Terminal</span>
                    <span className="terminal-session">({sessionId})</span>
                </div>

                <div className="terminal-controls">
                    <button
                        className="terminal-control-btn"
                        onClick={clearTerminal}
                        title="Clear Terminal"
                    >
                        <FiTrash2 />
                    </button>
                    <button
                        className="terminal-control-btn"
                        onClick={copyTerminalContent}
                        title="Copy Content"
                    >
                        <FiCopy />
                    </button>
                    <button
                        className="terminal-control-btn"
                        onClick={() => setIsMaximized(!isMaximized)}
                        title={isMaximized ? 'Restore' : 'Maximize'}
                    >
                        {isMaximized ? <FiMinimize2 /> : <FiMaximize2 />}
                    </button>
                    <button
                        className="terminal-control-btn terminal-close"
                        onClick={() => onToggle(false)}
                        title="Close Terminal"
                    >
                        <FiX />
                    </button>
                </div>
            </div>

            {/* Terminal Output */}
            <div
                ref={outputRef}
                className="terminal-output-container"
                style={{ fontSize: `${terminalSettings.fontSize}px` }}
            >
                {history.map(renderEntry)}

                {/* Current Input Line */}
                <div className="terminal-entry terminal-input-line">
                    <span className="terminal-prompt">
                        <span className="prompt-path">{currentDirectory || '~'}</span>
                        <span className="prompt-symbol">$</span>
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="terminal-input"
                        disabled={isLoading}
                        placeholder={isLoading ? 'Executing...' : 'Type command...'}
                        autoComplete="off"
                        spellCheck="false"
                    />
                    {isLoading && (
                        <div className="terminal-loading">
                            <FiRefreshCw className="spinning" />
                        </div>
                    )}
                </div>
            </div>

            {/* Terminal Status */}
            <div className="terminal-status">
                <span className="status-cwd">📁 {currentDirectory || 'Unknown'}</span>
                <span className="status-connection">
                    {fileSyncService.isConnected() ? '🟢 Synced' : '🔴 Offline'}
                </span>
            </div>
        </div>
    );
};

export default Terminal;