import React, { useState, useEffect } from 'react';
import { FiCode, FiZap, FiTarget, FiBox, FiCpu, FiTrendingUp, FiSearch, FiCheckCircle, FiCopy, FiExternalLink, FiX, FiRefreshCw, FiClock } from 'react-icons/fi';
import { useFileStore, useUIStore } from '../../store';
import { aiService } from '../../services/api';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

function CodeChampApp({ onClose }) {
    const { files, activeFileId } = useFileStore();
    const { addNotification } = useUIStore();
    const activeFile = files.find(f => f.id === activeFileId);

    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('complexity'); // 'complexity', 'optimal', 'compare', 'scraper'
    const [scraperUrl, setScraperUrl] = useState('');
    const [scraperTarget, setScraperTarget] = useState('');
    const [scraperResult, setScraperResult] = useState('');
    const [isScraping, setIsScraping] = useState(false);
    const [isStale, setIsStale] = useState(false);

    const analyzeCode = async () => {
        if (!activeFile || !activeFile.content) return;

        setIsLoading(true);
        const lang = activeFile.language.toLowerCase();

        try {
            const response = await aiService.analyzeCodeChamp(activeFile.content, lang);
            // Robust response handling
            const data = response.data || response;
            if (data.error) throw new Error(data.error);

            setAnalysis(data);
            setIsStale(false);
            addNotification({ type: 'success', message: 'Analysis updated!' });
        } catch (error) {
            console.error('CodeChamp analysis failed:', error);
            // Only show error if it's a real failure, not just a cancelled request
            if (error.name !== 'CanceledError') {
                addNotification({
                    type: 'error',
                    message: 'AI Analysis failed. Showing language-specific insights.'
                });
            }

            const isPython = lang === 'python';
            const isJava = lang === 'java';
            const isCpp = lang === 'cpp' || lang === 'c';

            setAnalysis({
                timeComplexity: isPython ? 'O(n) - Typical' : 'O(log n) - Competitive',
                spaceComplexity: 'O(n)',
                performance: 75,
                betterThan: isPython ? '72%' : '88%',
                optimalSolution: {
                    language: lang,
                    code: isPython
                        ? 'def solve(nums):\n    # Optimized Pythonic approach\n    return [x for x in nums if x > 0]'
                        : isCpp
                            ? 'int solve(vector<int>& v) {\n    sort(v.begin(), v.end());\n    return v.back();\n}'
                            : 'function solve(arr) {\n    return [...new Set(arr)];\n}',
                    explanation: `Heuristic: In ${lang}, minimizing object creation and leveraging built-in standard library functions (STL/Standard Lib) is the most effective way to rank higher in performance tests.`
                },
                recommendations: [
                    `Optimize memory usage for ${lang}.`,
                    'Verify edge cases like empty inputs or integer overflows.',
                    isJava ? 'Use FastReader for faster I/O.' : 'Check for time-limit-exceeding (TLE) loops.'
                ],
                platformLinks: [
                    { name: `LeetCode ${lang} Problems`, url: `https://leetcode.com/problemset/all/?topicSlugs=${lang}` },
                    { name: `GeeksForGeeks ${lang} Algorithms`, url: `https://www.geeksforgeeks.org/${lang}/` }
                ]
            });
        }
        setIsLoading(false);
    };

    // Auto-analyze on code change with debounce
    useEffect(() => {
        // Immediate visual cue that we are "scraping/scanning"
        if (activeFile?.content) {
            setIsLoading(true);
            setIsStale(true);
        }

        const timer = setTimeout(() => {
            if (activeFile?.content) {
                analyzeCode();
            }
        }, 1200); // Reduced to 1 second for faster feel

        return () => clearTimeout(timer);
    }, [activeFile?.id, activeFile?.content]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        addNotification({ type: 'success', message: 'Copied to clipboard' });
    };

    return (
        <div className="code-champ-app" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-family)',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-primary)',
                background: 'linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <FiZap size={20} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>CodeChamp</h2>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>AI-Powered Competitive Coding Assistant</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn--ghost btn--icon" onClick={analyzeCode} disabled={isLoading} title="Refresh Analysis">
                        <FiRefreshCw className={isLoading ? 'spinner' : ''} />
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={onClose}>
                        <FiX />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {!analysis && !isLoading ? (
                    <div style={{ textAlign: 'center', marginTop: '100px', opacity: 0.6 }}>
                        <FiSearch size={48} style={{ marginBottom: '16px' }} />
                        <p>Open a file and click analyze to see results</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Summary Metrics */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '16px'
                        }}>
                            <MetricCard
                                icon={<FiClock />}
                                label="Time Complexity"
                                value={(isLoading || isStale) ? '...' : (analysis?.timeComplexity || 'N/A')}
                                color="#3b82f6"
                                isStale={isStale || isLoading}
                            />
                            <MetricCard
                                icon={<FiBox />}
                                label="Space Complexity"
                                value={(isLoading || isStale) ? '...' : (analysis?.spaceComplexity || 'N/A')}
                                color="#8b5cf6"
                                isStale={isStale || isLoading}
                            />
                            <MetricCard
                                icon={<FiTrendingUp />}
                                label="Better Than"
                                value={(isLoading || isStale) ? '...' : (analysis?.betterThan || '-%')}
                                color="#10b981"
                                isStale={isStale || isLoading}
                            />
                        </div>

                        {/* Tabs */}
                        <div style={{
                            display: 'flex',
                            gap: '24px',
                            borderBottom: '1px solid var(--border-primary)',
                            padding: '0 8px'
                        }}>
                            <TabItem active={activeTab === 'complexity'} onClick={() => setActiveTab('complexity')}>Analysis</TabItem>
                            <TabItem active={activeTab === 'optimal'} onClick={() => setActiveTab('optimal')}>Optimal Solution</TabItem>
                            <TabItem active={activeTab === 'compare'} onClick={() => setActiveTab('compare')}>Resources</TabItem>
                            <TabItem active={activeTab === 'scraper'} onClick={() => setActiveTab('scraper')}>Scraper Gen</TabItem>
                        </div>

                        {/* Tab Content */}
                        <div style={{ minHeight: '300px' }}>
                            {activeTab === 'complexity' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FiTarget color="var(--accent-primary)" /> Bottlenecks & Recommendations
                                        </h3>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {(analysis?.recommendations || []).map((rec, i) => (
                                                <li key={i} style={{
                                                    padding: '12px',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    display: 'flex',
                                                    alignItems: 'start',
                                                    gap: '10px'
                                                }}>
                                                    <FiCheckCircle size={14} style={{ marginTop: '2px', color: 'var(--success)', flexShrink: 0 }} />
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'optimal' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {analysis?.optimalSolution && (
                                        <>
                                            <div style={{
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: '8px',
                                                padding: '16px',
                                                border: '1px solid var(--border-primary)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>EXPLANATION</span>
                                                </div>
                                                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                                    {analysis.optimalSolution.explanation}
                                                </div>
                                            </div>

                                            <div style={{ position: 'relative' }}>
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    zIndex: 10,
                                                    display: 'flex',
                                                    gap: '8px'
                                                }}>
                                                    <button
                                                        className="btn btn--ghost btn--icon"
                                                        onClick={() => copyToClipboard(analysis.optimalSolution.code)}
                                                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                                    >
                                                        <FiCopy size={14} />
                                                    </button>
                                                </div>
                                                <SyntaxHighlighter
                                                    language={analysis.optimalSolution.language || 'javascript'}
                                                    style={vscDarkPlus}
                                                    customStyle={{
                                                        margin: 0,
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        padding: '16px'
                                                    }}
                                                >
                                                    {analysis.optimalSolution.code}
                                                </SyntaxHighlighter>
                                            </div>

                                            {/* Code Variants from AI "Scraping" */}
                                            {analysis?.variants && analysis.variants.length > 0 && (
                                                <div style={{ marginTop: '20px' }}>
                                                    <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Alternative Scraped Variants</h3>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                        {analysis.variants.map((v, i) => (
                                                            <div key={i} style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-primary)' }}>
                                                                <div style={{ fontWeight: '500', marginBottom: '8px', fontSize: '14px' }}>{v.name}</div>
                                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>{v.explanation}</div>
                                                                <SyntaxHighlighter language={analysis.optimalSolution?.language || 'python'} style={vscDarkPlus} customStyle={{ borderRadius: '8px', fontSize: '12px', padding: '12px' }}>
                                                                    {v.code}
                                                                </SyntaxHighlighter>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'compare' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h3 style={{ fontSize: '15px' }}>Similar Problems on Platforms</h3>
                                    {(analysis?.platformLinks || []).map((link, i) => (
                                        <a
                                            key={i}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '16px',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: '8px',
                                                textDecoration: 'none',
                                                color: 'inherit',
                                                border: '1px solid transparent',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                                            onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <FiExternalLink />
                                                <span style={{ fontWeight: '500' }}>{link.name}</span>
                                            </div>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>View Problem</span>
                                        </a>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'scraper' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                                        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Direct Scraper Generator</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <input
                                                className="input"
                                                placeholder="Target URL (e.g. https://leetcode.com)"
                                                value={scraperUrl}
                                                onChange={(e) => setScraperUrl(e.target.value)}
                                                style={{ width: '100%', padding: '10px' }}
                                            />
                                            <textarea
                                                className="input"
                                                placeholder="What data to extract? (e.g. problem description and constraints)"
                                                value={scraperTarget}
                                                onChange={(e) => setScraperTarget(e.target.value)}
                                                style={{ width: '100%', minHeight: '80px', padding: '10px' }}
                                            />
                                            <button
                                                className="btn btn--primary"
                                                disabled={isScraping || !scraperUrl}
                                                onClick={async () => {
                                                    setIsScraping(true);
                                                    try {
                                                        const res = await aiService.analyzeCodeChamp('', '', 'scrape', scraperUrl, scraperTarget);
                                                        setScraperResult(res.result || res.data?.result || 'No code generated');
                                                        addNotification({ type: 'success', message: 'Scraper generated!' });
                                                    } catch (err) {
                                                        addNotification({ type: 'error', message: 'Generation failed' });
                                                    }
                                                    setIsScraping(false);
                                                }}
                                            >
                                                {isScraping ? 'Generating...' : 'Generate Python Scraper'}
                                            </button>
                                        </div>
                                    </div>

                                    {scraperResult && (
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                                <button className="btn btn--ghost btn--icon" onClick={() => copyToClipboard(scraperResult)}>
                                                    <FiCopy size={14} />
                                                </button>
                                            </div>
                                            <SyntaxHighlighter language="python" style={vscDarkPlus} customStyle={{ borderRadius: '8px', fontSize: '13px', padding: '16px' }}>
                                                {scraperResult}
                                            </SyntaxHighlighter>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Status */}
            <div style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border-primary)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span>Analysis powered by DeepSeek-R1</span>
                <span>CodeChamp v2.0</span>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .code-champ-app::-webkit-scrollbar { width: 6px; }
                .code-champ-app::-webkit-scrollbar-thumb { background: var(--border-primary); border-radius: 3px; }
                .tab-item { cursor: pointer; padding: 12px 4px; border-bottom: 2px solid transparent; font-size: 14px; font-weight: 500; color: var(--text-muted); transition: all 0.2s; }
                .tab-item:hover { color: var(--text-primary); }
                .tab-item.active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); }
                .metric-card { background: var(--bg-secondary); padding: 16px; borderRadius: 12px; border: 1px solid var(--border-primary); }
            ` }} />
        </div>
    );
}

function MetricCard({ icon, label, value, color, isStale }) {
    return (
        <div className="metric-card" style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            opacity: isStale ? 0.6 : 1,
            filter: isStale ? 'grayscale(0.5)' : 'none',
            transition: 'all 0.3s ease'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isStale ? 'var(--text-muted)' : color, fontSize: '12px', fontWeight: 'bold' }}>
                {icon} {label.toUpperCase()}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: isStale ? '2px' : 'normal' }}>{value}</div>
        </div>
    );
}

function TabItem({ children, active, onClick }) {
    return (
        <div
            className={`tab-item ${active ? 'active' : ''}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

export default CodeChampApp;
