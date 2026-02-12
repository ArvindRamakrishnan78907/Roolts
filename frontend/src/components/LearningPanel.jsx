import React, { useState, useRef, useEffect } from 'react';
import { FiBookOpen, FiZap, FiMessageSquare, FiSend, FiCode, FiActivity, FiTrash2, FiChevronLeft } from 'react-icons/fi';
import { useFileStore, useUIStore } from '../store';
import { aiService } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

function LearningPanel({ onBack }) {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {onBack && (
                        <button
                            className="btn btn--ghost btn--icon"
                            onClick={onBack}
                            style={{ padding: 0, width: '24px', height: '24px', color: '#8b949e' }}
                        >
                            <FiChevronLeft size={20} />
                        </button>
                    )}
                    <h3><FiBookOpen /> Learning Assistant</h3>
                </div>
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
                    background: #0d1117;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                }
                .learning-panel__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    background: rgba(13, 17, 23, 0.8);
                    backdrop-filter: blur(12px);
                    z-index: 10;
                }
                .learning-panel__header h3 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #fff;
                    letter-spacing: -0.02em;
                }
                .learning-panel__header h3 svg {
                    color: var(--accent-color);
                    filter: drop-shadow(0 0 5px rgba(var(--accent-rgb), 0.3));
                }
                .chat-window {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    scroll-behavior: smooth;
                }
                .chat-window::-webkit-scrollbar {
                    width: 5px;
                }
                .chat-window::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .chat-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    text-align: center;
                    animation: fadeIn 0.5s ease-out;
                    padding-bottom: 2rem;
                }
                .chat-empty__icon {
                    margin-bottom: 1.5rem;
                    color: var(--accent-color);
                    filter: opacity(0.8) drop-shadow(0 0 15px rgba(var(--accent-rgb), 0.2));
                }
                .chat-empty h4 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: #fff;
                }
                .chat-empty p {
                    color: #8b949e;
                    max-width: 250px;
                    line-height: 1.5;
                }
                .chat-suggestions {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-top: 2rem;
                    width: 100%;
                    max-width: 280px;
                }
                .chat-suggestions .btn {
                    justify-content: flex-start;
                    padding: 0.75rem 1rem;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: #c9d1d9;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    text-transform: none;
                    font-weight: 500;
                }
                .chat-suggestions .btn:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: var(--accent-color);
                    transform: translateX(4px);
                    color: #fff;
                }
                .chat-bubble {
                    display: flex;
                    gap: 1rem;
                    max-width: 95%;
                    animation: bubbleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
                @keyframes bubbleIn {
                    from { opacity: 0; transform: translateY(10px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .chat-bubble--user {
                    align-self: flex-end;
                    flex-direction: row-reverse;
                }
                .chat-bubble--assistant, .chat-bubble--system {
                    align-self: flex-start;
                }
                .chat-bubble__avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    margin-top: 4px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }
                .chat-bubble--user .chat-bubble__avatar {
                     background: linear-gradient(135deg, var(--accent-color), #7f5af0);
                     color: white;
                }
                .chat-bubble--assistant .chat-bubble__avatar {
                     background: #161b22;
                     border: 1px solid rgba(255, 255, 255, 0.05);
                     color: var(--accent-color);
                }
                .chat-bubble--system .chat-bubble__avatar {
                     background: rgba(248, 51, 79, 0.1);
                     color: #f85149;
                     border: 1px solid rgba(248, 81, 73, 0.2);
                }
                .chat-bubble__content {
                    padding: 1rem 1.25rem;
                    border-radius: 16px;
                    min-width: 0;
                    line-height: 1.6;
                    font-size: 0.95rem;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }
                .chat-bubble--user .chat-bubble__content {
                    background: linear-gradient(135deg, var(--accent-color), #6e55ff);
                    color: white;
                    border-top-right-radius: 4px;
                }
                .chat-bubble--assistant .chat-bubble__content {
                    background: #161b22;
                    color: #d1d5da;
                    border-top-left-radius: 4px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .chat-bubble--system .chat-bubble__content {
                    background: rgba(248, 81, 73, 0.05);
                    border: 1px solid rgba(248, 81, 73, 0.1);
                    border-top-left-radius: 4px;
                }
                .chat-bubble__content p:first-child { margin-top: 0; }
                .chat-bubble__content p:last-child { margin-bottom: 0; }
                
                .chat-input-form {
                    padding: 1.25rem 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    background: rgba(13, 17, 23, 0.9);
                    backdrop-filter: blur(10px);
                }
                .chat-input-wrapper {
                    display: flex;
                    gap: 0.75rem;
                    background: #0d1117;
                    padding: 0.4rem;
                    padding-left: 1rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .chat-input-wrapper:focus-within {
                    border-color: var(--accent-color);
                    box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.1);
                }
                .chat-input-field {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: #fff;
                    padding: 0.5rem 0;
                    outline: none;
                    font-size: 0.95rem;
                }
                .chat-send-btn {
                    background: var(--accent-color);
                    color: white;
                    border: none;
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.2s, background 0.2s;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                }
                .chat-send-btn:hover:not(:disabled) {
                    background: #7f5af0;
                    transform: scale(1.05);
                }
                .chat-send-btn:active:not(:disabled) {
                    transform: scale(0.95);
                }
                .chat-send-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    background: #333;
                }
                .loading .chat-bubble__content {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 0.75rem 1.25rem;
                }
                .typing-dot {
                    width: 6px;
                    height: 6px;
                    background: var(--accent-color);
                    border-radius: 50%;
                    animation: typingPulse 1.4s infinite ease-in-out both;
                }
                .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .typing-dot:nth-child(3) { animation-delay: 0.4s; }
                
                @keyframes typingPulse {
                    0%, 100% { transform: scale(0.7); opacity: 0.4; }
                    50% { transform: scale(1.2); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}

export default LearningPanel;
