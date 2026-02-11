import React, { useState, useRef, useEffect } from 'react';
import { FiBookOpen, FiZap, FiMessageSquare, FiSend, FiCode, FiActivity, FiTrash2 } from 'react-icons/fi';
import { useFileStore, useUIStore } from '../store';
import { aiService } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

function LearningPanel() {
    const [query, setQuery] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { files, activeFileId } = useFileStore();
    const { addNotification } = useUIStore();
    const activeFile = files.find(f => f.id === activeFileId);

    // Auto-scroll to bottom of chat
    const chatEndRef = useRef(null);
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);

    const handleChat = async (e) => {
        e.preventDefault();
        if (!query.trim() || !activeFile) return;

        const userMsg = { role: 'user', content: query };
        setChatHistory(prev => [...prev, userMsg]);
        setQuery('');
        setIsLoading(true);

        try {
            // Use language or default to plaintext
            const lang = activeFile.language || 'plaintext';
            const response = await aiService.chat(activeFile.content, lang, query, chatHistory);

            if (response.data.error) {
                throw new Error(response.data.error);
            }

            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: response.data.response || "No response generated."
            }]);

        } catch (error) {
            console.error("AI Chat Error:", error);
            const errorMsg = error.message || 'The AI service could not respond.';

            setChatHistory(prev => [...prev, {
                role: 'system',
                content: `> [!CAUTION]\n> **AI Error**: ${errorMsg}`
            }]);

            addNotification({ type: 'error', message: 'AI chat failed' });
        }
        setIsLoading(false);
    };

    const clearChat = () => {
        setChatHistory([]);
    };

    return (
        <div className="learning-panel">
            <div className="learning-panel__header">
                <h3><FiBookOpen /> Learning Assistant</h3>
                {chatHistory.length > 0 && (
                    <button
                        className="btn btn--xs btn--ghost"
                        onClick={clearChat}
                        title="Clear Chat History"
                    >
                        <FiTrash2 />
                    </button>
                )}
            </div>

            <div className="chat-window">
                {chatHistory.length === 0 ? (
                    <div className="chat-empty">
                        <FiZap size={48} className="chat-empty__icon" />
                        <h4>AI Assistant Ready</h4>
                        <p>Ask questions about your code, request explanations, or get debugging help.</p>
                        {activeFile ? (
                            <div className="chat-suggestions">
                                <button className="btn btn--secondary btn--sm" onClick={() => setQuery("Explain this code")}>Explain code</button>
                                <button className="btn btn--secondary btn--sm" onClick={() => setQuery("Find bugs in this file")}>Find bugs</button>
                                <button className="btn btn--secondary btn--sm" onClick={() => setQuery("How can I improve this?")}>Improve code</button>
                            </div>
                        ) : (
                            <p className="chat-warning">Open a file to start chatting.</p>
                        )}
                    </div>
                ) : (
                    chatHistory.map((msg, i) => (
                        <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
                            <div className="chat-bubble__avatar">
                                {msg.role === 'user' ? <FiMessageSquare /> : msg.role === 'system' ? <FiActivity /> : <FiZap />}
                            </div>
                            <div className="chat-bubble__content">
                                <ReactMarkdown
                                    components={{
                                        code({ node, inline, className, children, ...props }) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            return !inline && match ? (
                                                <SyntaxHighlighter
                                                    style={vscDarkPlus}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    {...props}
                                                >
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                            ) : (
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        }
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="chat-bubble chat-bubble--assistant loading">
                        <div className="chat-bubble__avatar"><FiZap /></div>
                        <div className="chat-bubble__content">
                            <span className="typing-dot">.</span><span className="typing-dot">.</span><span className="typing-dot">.</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleChat}>
                <div className="chat-input-wrapper">
                    <input
                        type="text"
                        className="chat-input-field"
                        placeholder={activeFile ? "Ask a question..." : "Open a file to chat"}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={isLoading || !activeFile}
                    />
                    <button
                        type="submit"
                        className="chat-send-btn"
                        disabled={isLoading || !query.trim() || !activeFile}
                    >
                        <FiSend />
                    </button>
                </div>
            </form>

            <style>{`
                .learning-panel {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: var(--bg-secondary);
                }
                .learning-panel__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    border-bottom: 1px solid var(--border-color);
                    background: var(--bg-primary);
                }
                .learning-panel__header h3 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1rem;
                }
                .chat-window {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .chat-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    opacity: 0.6;
                    text-align: center;
                }
                .chat-empty__icon {
                    margin-bottom: 1rem;
                    color: var(--accent-color);
                }
                .chat-suggestions {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-top: 1.5rem;
                    width: 100%;
                    max-width: 250px;
                }
                .chat-bubble {
                    display: flex;
                    gap: 0.75rem;
                    max-width: 90%;
                }
                .chat-bubble--user {
                    align-self: flex-end;
                    flex-direction: row-reverse;
                }
                .chat-bubble--assistant, .chat-bubble--system {
                    align-self: flex-start;
                }
                .chat-bubble__avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-tertiary);
                    flex-shrink: 0;
                }
                .chat-bubble--user .chat-bubble__avatar {
                     background: var(--accent-color);
                     color: white;
                }
                .chat-bubble--assistant .chat-bubble__avatar {
                     background: var(--bg-tertiary);
                     color: var(--accent-color);
                }
                .chat-bubble__content {
                    background: var(--bg-tertiary);
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    min-width: 0;
                }
                .chat-bubble--user .chat-bubble__content {
                    background: var(--accent-color);
                    color: white;
                    border-top-right-radius: 2px;
                }
                .chat-bubble--assistant .chat-bubble__content {
                    border-top-left-radius: 2px;
                }
                .chat-input-form {
                    padding: 1rem;
                    border-top: 1px solid var(--border-color);
                    background: var(--bg-primary);
                }
                .chat-input-wrapper {
                    display: flex;
                    gap: 0.5rem;
                    background: var(--bg-secondary);
                    padding: 0.5rem;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                .chat-input-field {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    padding: 0.5rem;
                    outline: none;
                }
                .chat-send-btn {
                    background: var(--accent-color);
                    color: white;
                    border: none;
                    width: 36px;
                    height: 36px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }
                .chat-send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .typing-dot {
                    animation: typing 1.4s infinite ease-in-out both;
                    margin: 0 1px;
                    font-size: 1.5rem;
                    line-height: 1rem;
                }
                .typing-dot:nth-child(1) { animation-delay: -0.32s; }
                .typing-dot:nth-child(2) { animation-delay: -0.16s; }
                
                @keyframes typing {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
}

export default LearningPanel;
