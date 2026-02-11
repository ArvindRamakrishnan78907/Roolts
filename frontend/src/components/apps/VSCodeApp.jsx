import React, { useState, useEffect, useCallback } from 'react';
import {
    FiChevronLeft, FiSearch, FiPackage, FiDownload,
    FiExternalLink, FiCheckCircle, FiInfo, FiActivity,
    FiStar, FiLayers, FiCheck, FiPlay, FiSettings
} from 'react-icons/fi';
import { VscExtensions } from 'react-icons/vsc';
import { useUIStore, useExtensionStore, useExecutionStore } from '../../store';
import api from '../../services/api';
import { executorService } from '../../services/executorService';
import { FiX } from 'react-icons/fi';


/**
 * Extension Marketplace Component
 * A robust interface to browse, install, and integrate VS Code extensions.
 */
const VSCodeApp = ({ onBack }) => {
    const { addNotification } = useUIStore();
    const { installedExtensions, installExtension, uninstallExtension, isInstalled } = useExtensionStore();
    const { setCompilerStatus, setExecuting, setOutput, setError, setExecutionTime, setShowOutput, addToHistory } = useExecutionStore();
    const isExecuting = useExecutionStore(state => state.isExecuting);


    const [activeTab, setActiveTab] = useState('explore'); // explore, recommended, installed
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

    const RECOMMENDED_IDS = [
        { id: 'ms-python.python', name: 'python', namespace: 'ms-python', displayName: 'Python', description: 'Rich support for the Python language with extension access points for IntelliSense, debugging, and more.', iconUrl: 'https://open-vsx.org/api/ms-python/python/2026.0.0/file/icon.png' },
        { id: 'ms-vscode.cpptools', name: 'cpptools', namespace: 'ms-vscode', displayName: 'C/C++', description: 'C/C++ IntelliSense, debugging, and browsing support for Roolts.', iconUrl: 'https://open-vsx.org/api/ms-vscode/cpptools/1.18.3/file/icon.png' },
        { id: 'dbaeumer.vscode-eslint', name: 'vscode-eslint', namespace: 'dbaeumer', displayName: 'ESLint', description: 'Integrates ESLint JavaScript into your development flow.', iconUrl: 'https://open-vsx.org/api/dbaeumer/vscode-eslint/2.4.2/file/icon.png' },
        { id: 'esbenp.prettier-vscode', name: 'prettier-vscode', namespace: 'esbenp', displayName: 'Prettier', description: 'Code formatter using Prettier for consistent code style.', iconUrl: 'https://open-vsx.org/api/esbenp/prettier-vscode/10.1.0/file/icon.png' }
    ];

    // Debounced search logic for 'explore' tab
    useEffect(() => {
        if (activeTab !== 'explore') return;
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.trim()) {
                fetchExtensions(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, activeTab]);

    const fetchExtensions = async (query) => {
        setIsLoading(true);
        console.log(`Searching marketplace for: ${query}`);
        try {
            const response = await fetch(`/api/extensions/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Marketplace connection failed');
            const data = await response.json();
            if (data.extensions) {
                setSearchResults(data.extensions);
            }
        } catch (error) {
            console.error('Error:', error);
            addNotification('Marketplace search failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInstall = async (ext) => {
        const id = `${ext.namespace}.${ext.name}`;
        setIsLoading(true);

        try {
            // 1. Call backend to download and extract VSIX
            const response = await api.post('/extensions/install', {
                downloadUrl: ext.files?.download || ext.downloadUrl,
                namespace: ext.namespace,
                name: ext.name
            });

            if (response.data.success) {
                const extData = response.data.data;
                const extensionData = {
                    id,
                    name: ext.name,
                    namespace: ext.namespace,
                    displayName: extData.displayName || ext.displayName || ext.name,
                    description: ext.description,
                    iconUrl: ext.files?.icon || ext.iconUrl,
                    version: extData.version || ext.version,
                    snippets: extData.snippets || [],
                    languages: extData.languages || []
                };

                installExtension(extensionData);

                // Compiler Integration Logic (Existing)
                if (id.includes('python')) {
                    setCompilerStatus('python', { available: true, version: extensionData.version, source: 'extension' });
                } else if (id.includes('cpp') || id.includes('c++')) {
                    setCompilerStatus('cpp', { available: true, version: extensionData.version, source: 'extension' });
                }

                addNotification(`Successfully installed ${extensionData.displayName}`, 'success');

                // Trigger global refresh for editor
                window.dispatchEvent(new CustomEvent('extension-installed', { detail: { id } }));
            } else {
                addNotification(`Failed to install extension: ${response.data.error}`, 'error');
            }
        } catch (error) {
            console.error('Installation failed:', error);
            addNotification(`Installation failed: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUninstall = (id) => {
        const ext = installedExtensions.find(e => e.id === id);
        uninstallExtension(id);

        // Cleanup Compiler Integration
        if (id.includes('python')) {
            setCompilerStatus('python', { available: null, version: null });
        }

        addNotification(`Removed ${ext?.displayName || id}`, 'info');
    };

    const testCompiler = async (lang) => {
        addNotification({ type: 'info', message: `Testing compiler integration for ${lang}...` });
        const testCode = lang === 'python' ? 'print("Compiler test: OK")' : 'console.log("Compiler test: OK")';

        setExecuting(true);
        setOutput('');
        setError(null);
        const startTime = Date.now();

        try {
            const result = await executorService.execute(testCode, lang, `test.${lang === 'python' ? 'py' : 'js'}`);
            setExecutionTime(Date.now() - startTime);
            setShowOutput(true);

            if (result.success) {
                setOutput(result.output || 'Compiler test: OK');
                addNotification({ type: 'success', message: `${lang} compiler is working!` });
            } else {
                setError(result.error);
                addNotification({ type: 'error', message: `${lang} compiler test failed` });
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setExecuting(false);
        }
    };


    // Custom Context Menu logic
    const handleContextMenu = useCallback((e) => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            e.preventDefault();
            setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
        } else {
            setContextMenu({ visible: false, x: 0, y: 0 });
        }
    }, []);

    const removeHighlight = () => {
        window.getSelection().removeAllRanges();
        setContextMenu({ visible: false, x: 0, y: 0 });
        addNotification('Highlight removed', 'info');
    };

    useEffect(() => {
        const hideMenu = () => setContextMenu({ visible: false, x: 0, y: 0 });
        window.addEventListener('click', hideMenu);
        return () => window.removeEventListener('click', hideMenu);
    }, []);

    // Sync compilers on mount based on installed extensions
    useEffect(() => {
        installedExtensions.forEach(ext => {
            const id = ext.id;
            if (id.includes('python')) {
                setCompilerStatus('python', { available: true, version: ext.version || 'VSCode-Integrated', source: 'extension' });
            } else if (id.includes('cpp') || id.includes('c++')) {
                setCompilerStatus('cpp', { available: true, version: ext.version || 'VSCode-Integrated', source: 'extension' });
            }
        });
    }, []);



    const renderExtensionCard = (ext, isExplore = false) => {
        const id = isExplore ? `${ext.namespace}.${ext.name}` : ext.id;
        const installed = isInstalled(id);

        return (
            <div key={id} className={`marketplace-card ${installed ? 'marketplace-card--installed' : ''} marketplace-card-glass animate-fade-in-up`}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
                    <div className="marketplace-icon-box">
                        {(ext.files?.icon || ext.iconUrl) ? (
                            <img
                                src={ext.files?.icon || ext.iconUrl}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = '<div style="color: #64748b"><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>';
                                }}
                            />
                        ) : (
                            <FiPackage size={24} color="#64748b" />
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div className="marketplace-card__title" style={{ fontSize: '16px', color: '#f1f5f9', fontWeight: '700', fontFamily: 'var(--font-heading)' }}>{ext.displayName || ext.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: '500' }}>{ext.namespace}</div>
                    </div>
                    {installed && <div className="marketplace-badge marketplace-badge--verified pulse-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiCheck size={10} /> Installed</div>}
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '14px 0', height: '60px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {ext.description || "No description provided."}
                </p>

                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                    {installed ? (
                        <>
                            <button className="btn btn--secondary" style={{ flex: 1, borderRadius: '8px' }} onClick={() => handleUninstall(id)}>
                                Uninstall
                            </button>
                            {(id.includes('python') || id.includes('javascript')) && (
                                <button className="btn btn--primary glow-primary" style={{ flex: 1, borderRadius: '8px' }} onClick={() => testCompiler(id.includes('python') ? 'python' : 'javascript')}>
                                    <FiPlay size={14} /> Test
                                </button>
                            )}
                        </>
                    ) : (
                        <button className="btn btn--primary glow-primary" style={{ width: '101%', borderRadius: '8px' }} onClick={() => handleInstall(ext)}>
                            <FiDownload size={14} /> Put in program
                        </button>
                    )}
                </div>
            </div>

        );
    };

    return (
        <div className="marketplace-container" onContextMenu={handleContextMenu}>
            {/* Sidebar Navigation */}
            <div className="sidebar" style={{ width: '260px' }}>
                <div style={{ padding: '0 24px 32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--accent-gradient)', padding: '8px', borderRadius: '10px' }}>
                        <VscExtensions size={24} color="white" />
                    </div>
                    <span style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.025em', fontFamily: 'var(--font-heading)' }}>Marketplace</span>
                </div>

                <div className={`panel-tab ${activeTab === 'explore' ? 'panel-tab--active' : ''}`} style={{ justifyContent: 'flex-start', paddingLeft: '24px' }} onClick={() => setActiveTab('explore')}>
                    <FiSearch size={18} /> Explore
                </div>
                <div className={`panel-tab ${activeTab === 'recommended' ? 'panel-tab--active' : ''}`} style={{ justifyContent: 'flex-start', paddingLeft: '24px' }} onClick={() => setActiveTab('recommended')}>
                    <FiStar size={18} /> Recommended
                </div>
                <div className={`panel-tab ${activeTab === 'installed' ? 'panel-tab--active' : ''}`} style={{ justifyContent: 'flex-start', paddingLeft: '24px' }} onClick={() => setActiveTab('installed')}>
                    <FiLayers size={18} /> Installed ({installedExtensions.length})
                </div>

                <div style={{ marginTop: 'auto', padding: '24px' }}>
                    <button className="btn btn--secondary" style={{ width: '100%' }} onClick={onBack}>
                        <FiChevronLeft /> Exit
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                    <div>
                        <h2 style={{ fontSize: '28px', fontWeight: '800', margin: 0, fontFamily: 'var(--font-heading)' }}>
                            {activeTab === 'explore' && 'Discover Extensions'}
                            {activeTab === 'recommended' && 'Expert Picks'}
                            {activeTab === 'installed' && 'My Extensions'}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                            {activeTab === 'explore' && 'Power up your development with premium extensions.'}
                            {activeTab === 'recommended' && 'Essential tools vetted for peak productivity.'}
                            {activeTab === 'installed' && 'Manage your IDE customizations.'}
                        </p>
                    </div>

                    {activeTab === 'explore' && (
                        <div style={{ position: 'relative', width: '320px' }}>
                            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="input"
                                style={{ paddingLeft: '40px', paddingRight: searchQuery ? '40px' : '12px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}
                                placeholder="Search extensions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                    <FiX size={16} />
                                </button>
                            )}
                        </div>
                    )}

                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }} className="scrollbar-hide">
                    {activeTab === 'explore' && !searchQuery && (
                        <div className="marketplace-hero animate-fade-in-up">
                            <div className="marketplace-hero__content">
                                <span className="marketplace-hero__badge">Featured Extension</span>
                                <h1 className="marketplace-hero__title">Python for Roolts</h1>
                                <p className="marketplace-hero__subtitle">
                                    Full intelligence, linting, and debugging for Python.
                                    Integrated directly with the portable Roolts compiler for zero-setup development.
                                </p>
                                <button className="btn btn--primary" style={{ marginTop: '24px', padding: '12px 24px' }} onClick={() => handleInstall(RECOMMENDED_IDS[0])}>
                                    <FiDownload /> Install Now
                                </button>
                            </div>
                            <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%) rotate(5deg)', opacity: 0.2 }}>
                                <img src={RECOMMENDED_IDS[0].iconUrl} alt="" style={{ width: '280px', height: '280px' }} />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }} className="staggered-list">
                        {activeTab === 'explore' ? (
                            isLoading ? (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px' }}>
                                    <div className="loader"></div>
                                    <p style={{ color: 'var(--text-secondary)', marginTop: '20px' }}>Querying Open VSX Registry...</p>
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(ext => renderExtensionCard(ext, true))
                            ) : (
                                !searchQuery ? (
                                    RECOMMENDED_IDS.map(ext => renderExtensionCard(ext))
                                ) : (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px', opacity: 0.5 }}>
                                        <FiSearch size={48} style={{ marginBottom: '16px' }} />
                                        <p>No extensions found for "{searchQuery}"</p>
                                    </div>
                                )
                            )
                        ) : activeTab === 'recommended' ? (
                            RECOMMENDED_IDS.map(ext => renderExtensionCard(ext))
                        ) : (
                            installedExtensions.length > 0 ? (
                                installedExtensions.map(ext => renderExtensionCard(ext))
                            ) : (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px', opacity: 0.5 }}>
                                    <FiLayers size={48} style={{ marginBottom: '16px' }} />
                                    <p>No extensions installed yet.</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '6px', zIndex: 1000, boxShadow: 'var(--shadow-lg)', minWidth: '180px' }}>
                    <div className="btn btn--ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={removeHighlight}>
                        <FiActivity size={14} /> Remove Highlight
                    </div>
                </div>
            )}

            <style>{`
                .marketplace-icon-box {
                    width: 52px; height: 52px; border-radius: 12px;
                    background: rgba(255,255,255,0.03); display: flex;
                    align-items: center; justify-content: center; overflow: hidden;
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .loader { border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid var(--accent-primary); border-radius: 50%; width: 32px; height: 32px; animation: spin 1s linear infinite; margin: 0 auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default VSCodeApp;

