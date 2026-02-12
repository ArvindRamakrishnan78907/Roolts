
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    FiBookOpen, FiZap, FiMessageSquare, FiSend, FiCode, FiActivity,
    FiTrash2, FiCopy, FiCheck, FiLayers, FiList, FiShield,
    FiChevronLeft, FiCpu, FiCompass, FiAward, FiInfo
} from 'react-icons/fi';
import { useFileStore, useUIStore } from '../store';
import { aiService } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const LearningCard = ({ title, icon, children, type = 'info' }) => {
    const colors = {
        info: 'var(--accent-primary)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)'
    };

    return (
        <div className="premium-card">
            <div className="premium-card__header" style={{ color: colors[type] }}>
                {icon || <FiInfo />}
                <span>{title}</span>
            </div>
            <div className="premium-card__body">
                {children}
            </div>
        </div>
    );
};

function LearningPanel({ onBack }) {
    const [query, setQuery] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const { files, activeFileId } = useFileStore();
    const { addNotification } = useUIStore();
    const activeFile = files.find(f => f.id === activeFileId);

    const chatEndRef = useRef(null);
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);

    const handleCopy = (content, id) => {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        addNotification({ type: 'success', message: 'Code copied to clipboard' });
    };

    const handleChat = async (e, forcedQuery = null) => {
        if (e) e.preventDefault();
        const finalQuery = forcedQuery || query;
        if (!finalQuery.trim() || !activeFile) return;

        const userMsg = { role: 'user', content: finalQuery, timestamp: new Date().toLocaleTimeString() };
        setChatHistory(prev => [...prev, userMsg]);
        if (!forcedQuery) setQuery('');
        setIsLoading(true);

        try {
            const lang = activeFile.language || 'plaintext';
            const response = await aiService.chat(activeFile.content, lang, finalQuery, chatHistory);

            if (response.data.error) throw new Error(response.data.error);

            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: response.data.response || "No response generated.",
                timestamp: new Date().toLocaleTimeString()
            }]);

        } catch (error) {
            console.error("AI Chat Error:", error);
            setChatHistory(prev => [...prev, {
                role: 'system',
                content: `> [!CAUTION]\n> **AI Error**: ${error.message || 'The AI service could not respond.'}`,
                timestamp: new Date().toLocaleTimeString()
            }]);
            addNotification({ type: 'error', message: 'AI chat failed' });
        }
        setIsLoading(false);
    };

    const quickActions = [
        { label: 'Step-by-Step Explanation', icon: <FiCompass />, query: 'Explain this code step-by-step for a beginner. Use simple terms and break down the logic.' },
        { label: 'Performance Analysis', icon: <FiCpu />, query: 'Analyze the time and space complexity of this code. Suggest potential optimizations if any.' },
        { label: 'Security & Best Practices', icon: <FiShield />, query: 'Perform a security audit of this code. Check for common vulnerabilities and suggest best practices.' }
    ];

    return (
        <div className="learning-panel premium-glass">
            {/* Header */}
            <div className="premium-header">
                <div className="premium-header__left">
                    {onBack && (
                        <button className="icon-btn" onClick={onBack}>
                            <FiChevronLeft />
                        </button>
                    )}
                    <div className="brand-badge">
                        <FiZap className="brand-badge__icon" />
                        <span>AI EXPLAINER</span>
                    </div>
                </div>
                <div className="premium-header__right">
                    {chatHistory.length > 0 && (
                        <button className="icon-btn icon-btn--danger" onClick={() => setChatHistory([])} title="Clear Chat">
                            <FiTrash2 />
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="premium-chat-area">
                {chatHistory.length === 0 ? (
                    <div className="welcome-hero">
                        <div className="welcome-hero__visual">
                            <div className="glow-orb"></div>
                            <FiZap size={40} className="floating-icon" />
                        </div>
                        <h2>Master Your Code</h2>
                        <p>I analysis your code in real-time to provide high-level insights, step-by-step guides, and performance optimizations.</p>

                        <div className="hero-actions">
                            <h4 style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Starts</h4>
                            {quickActions.map((action, idx) => (
                                <button key={idx} className="glass-action-btn" onClick={(e) => handleChat(e, action.query)}>
                                    <div className="glass-action-btn__icon">{action.icon}</div>
                                    <div className="glass-action-btn__text">{action.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="chat-log">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`chat-row chat-row--${msg.role}`}>
                                <div className="chat-avatar">
                                    {msg.role === 'user' ? <FiMessageSquare /> : msg.role === 'system' ? <FiActivity /> : <FiZap />}
                                </div>
                                <div className="chat-bubble-container">
                                    <div className={`chat-bubble chat-bubble--${msg.role}`}>
                                        <ReactMarkdown
                                            components={{
                                                p({ children }) {
                                                    const text = React.Children.toArray(children).join('');
                                                    if (text.startsWith('Key Concept:') || text.startsWith('Concept:')) {
                                                        return (
                                                            <LearningCard title="Concept" icon={<FiAward />}>
                                                                {children}
                                                            </LearningCard>
                                                        );
                                                    }
                                                    if (text.startsWith('Optimization:')) {
                                                        return (
                                                            <LearningCard title="Optimization" icon={<FiZap />} type="success">
                                                                {children}
                                                            </LearningCard>
                                                        );
                                                    }
                                                    return <p>{children}</p>;
                                                },
                                                code({ node, inline, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    const codeId = `code-${i}-${node?.position?.start?.offset}`;
                                                    return !inline && match ? (
                                                        <div className="premium-code-block">
                                                            <div className="premium-code-header">
                                                                <span className="lang-tag">{match[1]}</span>
                                                                <button className="copy-btn" onClick={() => handleCopy(String(children), codeId)}>
                                                                    {copiedId === codeId ? <FiCheck /> : <FiCopy />}
                                                                </button>
                                                            </div>
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                className="custom-highlighter"
                                                                {...props}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        </div>
                                                    ) : (
                                                        <code className="inline-code" {...props}>{children}</code>
                                                    );
                                                }
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                    <span className="chat-time">{msg.timestamp}</span>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="chat-row chat-row--assistant">
                                <div className="chat-avatar typing"><FiZap /></div>
                                <div className="chat-bubble-container">
                                    <div className="chat-bubble chat-bubble--assistant typing-bubble">
                                        <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                )}
            </div>

            {/* Input Bar */}
            <div className="premium-input-area">
                <form className="premium-input-container" onSubmit={handleChat}>
                    <input
                        type="text"
                        className="premium-input"
                        placeholder={activeFile ? "How can I help you today?" : "Active file required..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={isLoading || !activeFile}
                    />
                    <button type="submit" className="premium-send-btn" disabled={isLoading || !query.trim() || !activeFile}>
                        <FiSend />
                    </button>
                </form>
                <div className="input-metadata">
                    <FiActivity size={10} /> <span>AI Explainer is processing {activeFile?.name || 'no file'}</span>
                </div>
            </div>

            <style>{`
                .learning-panel.premium-glass {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    position: relative;
                    overflow: hidden;
                }

                /* Header */
                .premium-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.25rem;
                    background: rgba(255, 255, 255, 0.02);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    z-index: 10;
                }

                .premium-header__left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .brand-badge {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 4px 10px;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    color: var(--accent-primary);
                }

                .brand-badge__icon {
                    animation: pulse-glow 2s infinite;
                }

                @keyframes pulse-glow {
                    0% { filter: drop-shadow(0 0 2px var(--accent-primary)); }
                    50% { filter: drop-shadow(0 0 8px var(--accent-primary)); }
                    100% { filter: drop-shadow(0 0 2px var(--accent-primary)); }
                }

                .icon-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--text-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .icon-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: scale(1.05);
                }

                .icon-btn--danger:hover {
                    color: var(--error);
                    border-color: var(--error);
                    background: rgba(239, 68, 68, 0.1);
                }

                /* Chat Area */
                .premium-chat-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem 1rem;
                    display: flex;
                    flex-direction: column;
                }

                /* Welcome Hero */
                .welcome-hero {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 2rem 1rem;
                    animation: fade-in-up 0.6s ease-out;
                }

                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .welcome-hero__visual {
                    position: relative;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .glow-orb {
                    width: 80px;
                    height: 80px;
                    background: radial-gradient(circle, var(--accent-primary) 0%, transparent 70%);
                    opacity: 0.3;
                    position: absolute;
                    filter: blur(20px);
                    animation: orb-pulse 4s infinite alternate;
                }

                @keyframes orb-pulse {
                    from { transform: scale(1); opacity: 0.2; }
                    to { transform: scale(1.5); opacity: 0.4; }
                }

                .floating-icon {
                    color: var(--accent-primary);
                    z-index: 1;
                    animation: float 3s ease-in-out infinite;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                .welcome-hero h2 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-bottom: 0.75rem;
                    background: linear-gradient(to right, #fff, #94a3b8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .welcome-hero p {
                    font-size: 0.9rem;
                    line-height: 1.6;
                    color: var(--text-muted);
                    max-width: 300px;
                    margin-bottom: 2rem;
                }

                .hero-actions {
                    width: 100%;
                    max-width: 320px;
                }

                .glass-action-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    padding: 12px 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 12px;
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: all 0.3s;
                    margin-bottom: 10px;
                    text-align: left;
                }

                .glass-action-btn:hover {
                    background: rgba(99, 102, 241, 0.1);
                    border-color: rgba(99, 102, 241, 0.3);
                    transform: translateX(8px);
                }

                .glass-action-btn__icon {
                    width: 36px;
                    height: 36px;
                    background: rgba(99, 102, 241, 0.1);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--accent-primary);
                }

                .glass-action-btn__text {
                    font-size: 0.85rem;
                    font-weight: 600;
                }

                /* Chat Log */
                .chat-log {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .chat-row {
                    display: flex;
                    gap: 12px;
                    max-width: 92%;
                    animation: slide-in 0.3s ease-out;
                }

                @keyframes slide-in {
                    from { transform: translateX(-10px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                .chat-row--user {
                    align-self: flex-end;
                    flex-direction: row-reverse;
                }

                .chat-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    color: var(--text-muted);
                }

                .chat-row--assistant .chat-avatar {
                    background: linear-gradient(135deg, var(--accent-primary), #a855f7);
                    color: white;
                    border: none;
                }

                .chat-bubble-container {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .chat-row--user .chat-bubble-container {
                    align-items: flex-end;
                }

                .chat-bubble {
                    padding: 0.9rem 1.1rem;
                    border-radius: 18px;
                    font-size: 0.9rem;
                    line-height: 1.6;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                }

                .chat-row--user .chat-bubble {
                    background: var(--accent-primary);
                    color: white;
                    border-bottom-right-radius: 4px;
                }

                .chat-row--assistant .chat-bubble {
                    background: rgba(255, 255, 255, 0.03);
                    border-bottom-left-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }

                .chat-time {
                    font-size: 0.65rem;
                    opacity: 0.4;
                    padding: 0 4px;
                }

                /* Premium Elements */
                .premium-card {
                    margin: 12px 0;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    overflow: hidden;
                }

                .premium-card__header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    background: rgba(255, 255, 255, 0.03);
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .premium-card__body {
                    padding: 10px 12px;
                    font-size: 0.85rem;
                }

                .premium-code-block {
                    margin: 1rem 0;
                    border-radius: 12px;
                    background: #1e1e1e;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    overflow: hidden;
                }

                .premium-code-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 14px;
                    background: rgba(255, 255, 255, 0.05);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .lang-tag {
                    font-size: 0.7rem;
                    color: #94a3b8;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .copy-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    transition: color 0.2s;
                }

                .copy-btn:hover { color: var(--accent-primary); }

                .custom-highlighter {
                    padding: 1rem !important;
                    margin: 0 !important;
                    background: transparent !important;
                    font-size: 0.8rem !important;
                }

                .inline-code {
                    padding: 2px 6px;
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 4px;
                    font-size: 0.85rem;
                    color: var(--accent-primary);
                }

                /* Typing Indicator */
                .typing-bubble {
                    display: flex;
                    gap: 4px;
                    align-items: center;
                    padding: 12px 18px !important;
                }

                .dot {
                    width: 6px;
                    height: 6px;
                    background: var(--accent-primary);
                    border-radius: 50%;
                    animation: dot-jump 1.4s infinite ease-in-out;
                    opacity: 0.6;
                }

                .dot:nth-child(2) { animation-delay: 0.2s; }
                .dot:nth-child(3) { animation-delay: 0.4s; }

                @keyframes dot-jump {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
                    40% { transform: scale(1); opacity: 1; }
                }

                /* Input Area */
                .premium-input-area {
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.02);
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }

                .premium-input-container {
                    display: flex;
                    gap: 8px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    padding: 6px 6px 6px 14px;
                    transition: all 0.3s;
                }

                .premium-input-container:focus-within {
                    border-color: var(--accent-primary);
                    background: rgba(99, 102, 241, 0.05);
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                }

                .premium-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: white;
                    outline: none;
                    font-size: 0.9rem;
                }

                .premium-send-btn {
                    width: 36px;
                    height: 36px;
                    background: var(--accent-primary);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .premium-send-btn:hover { transform: scale(1.05); }
                .premium-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .input-metadata {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 10px;
                    font-size: 0.65rem;
                    color: var(--text-muted);
                    padding-left: 4px;
                }
            `}</style>
        </div>
    );
}

export default LearningPanel;
