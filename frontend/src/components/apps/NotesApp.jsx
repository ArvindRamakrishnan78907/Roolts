
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import {
    FiPlus, FiTrash2, FiImage, FiCamera, FiVideo, FiChevronLeft, FiList, FiX,
    FiDownload, FiUpload, FiAlignLeft, FiAlignCenter, FiAlignRight,
    FiRefreshCw, FiCheckCircle, FiCloud, FiLock
} from 'react-icons/fi';
import { SiMicrosoftonedrive, SiEvernote } from 'react-icons/si';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNotesStore, useUIStore } from '../../store';

import Webcam from 'react-webcam';
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Register Quill modules
Quill.register('modules/imageResize', ImageResize);

// Migrated to usage of useNotesStore
// Storage functions removed
const MIGRATION_KEY = 'roolts_notes_v2';

const ProviderSelection = ({ onSelect }) => {


    const providers = [
        {
            id: 'roolts',
            name: 'Roolts Notes',
            description: 'Local storage, fast and private.',
            icon: <FiList size={32} />,
            color: 'var(--accent-primary)',
            isConnected: true
        },
        {
            id: 'onedrive',
            name: 'OneDrive',
            description: 'Sync with your Microsoft account.',
            icon: <SiMicrosoftonedrive size={32} />,
            color: '#0078d4',
            isConnected: false
        },
        {
            id: 'evernote',
            name: 'Evernote',
            description: 'The best way to organize your life.',
            icon: <SiEvernote size={32} />,
            color: '#00a82d',
            isConnected: false
        }
    ];

    return (
        <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Open Notes With...</h2>
                <p style={{ color: 'var(--text-muted)' }}>Select your preferred storage provider</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', width: '100%', maxWidth: '800px' }}>
                {providers.map(p => (
                    <div
                        key={p.id}
                        onClick={() => onSelect(p.id)}
                        className="provider-card"
                        style={{
                            padding: '24px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '16px',
                            position: 'relative'
                        }}
                    >
                        <div style={{ color: p.color }}>{p.icon}</div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{p.name}</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.description}</p>
                        </div>
                        {!p.isConnected && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                color: 'var(--warning)',
                                marginTop: '8px'
                            }}>
                                <FiLock size={12} /> Needs Connection
                            </div>
                        )}
                        {p.isConnected && p.id !== 'roolts' && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                color: 'var(--success)',
                                marginTop: '8px'
                            }}>
                                <FiCheckCircle size={12} /> Connected
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style>{`
                .provider-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--accent-primary);
                    background: var(--bg-tertiary);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    );
};

const RemoteNotesView = ({ provider, user, onDisconnect }) => {
    const isOneDrive = provider === 'onedrive';
    const icon = isOneDrive ? <SiMicrosoftonedrive size={48} /> : <SiEvernote size={48} />;
    const color = isOneDrive ? '#0078d4' : '#00a82d';
    const userName = user?.username || user?.name || 'Connected User';

    return (
        <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center' }}>
            <div style={{ color }}>{icon}</div>
            <div>
                <h2 style={{ fontSize: '22px', fontWeight: 600 }}>{isOneDrive ? 'OneDrive' : 'Evernote'} Connected</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Logged in as <strong>{userName}</strong></p>
            </div>

            <div style={{
                width: '100%',
                maxWidth: '500px',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                    <FiCloud size={20} style={{ color: 'var(--accent-primary)' }} />
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>Cloud Sync Active</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Your notes are being synced directly with {isOneDrive ? 'Microsoft' : 'Evernote'}.</div>
                    </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border-color)' }}></div>

                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Integration Note: You are now using the official {isOneDrive ? 'OneDrive' : 'Evernote'} storage. Changes made here will reflect in your cloud account.
                </div>

                <button
                    onClick={onDisconnect}
                    className="btn btn--danger"
                    style={{ marginTop: '12px' }}
                >
                    Disconnect {isOneDrive ? 'OneDrive' : 'Evernote'}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Remote Notes (Cached/Synced)</p>
                <div style={{
                    padding: '16px',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                    fontSize: '13px'
                }}>
                    No remote notes found yet. Start creating to sync!
                </div>
            </div>
        </div>
    );
};

const NotesApp = ({ onBack, isWindowed }) => {
    const { selectedProvider, setProvider } = useNotesStore();
    const { onedrive, evernote } = { onedrive: { isConnected: false }, evernote: { isConnected: false } }; // Mock for now
    const { addNotification } = useUIStore();

    const {
        notes, activeNoteId,
        setNotes, setActiveNote,
        addNote, updateNote, deleteNote: deleteNoteAction
    } = useNotesStore();

    const [showList, setShowList] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [editorContent, setEditorContent] = useState('');
    const [editorTitle, setEditorTitle] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const quillRef = useRef(null);
    const webcamRef = useRef(null);

    // Derive active note
    const activeNote = notes.find(n => n.id === activeNoteId) || null;

    // Auto-save Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeNote && (editorContent !== activeNote.content || editorTitle !== activeNote.title)) {
                updateNote(activeNote.id, {
                    title: editorTitle,
                    content: editorContent
                });
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [editorContent, editorTitle, activeNote, updateNote]);

    // Quill modules
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'font': [] }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                ['bold', 'italic', 'underline'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link'],
                ['clean']
            ]
        },
        imageResize: {
            modules: ['Resize', 'DisplaySize']
        },
        history: {
            delay: 1000,
            maxStack: 100,
            userOnly: true
        }
    }), []);

    const formats = ['font', 'size', 'header', 'bold', 'italic', 'underline', 'color', 'background', 'list', 'bullet', 'link', 'image', 'video', 'align'];

    const handleButtonKeyDown = (e, callback) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            callback();
        }
    };

    const handleProviderSelect = (providerId) => {
        setProvider(providerId);
    };

    const handleDisconnect = () => {
        setProvider(null);
    };

    useEffect(() => {
        if (activeNote) {
            setEditorTitle(activeNote.title);
            setEditorContent(activeNote.content);
        } else {
            setEditorTitle('');
            setEditorContent('');
        }
    }, [activeNote]);

    const saveNote = () => {
        if (!activeNote) return;
        updateNote(activeNote.id, {
            title: editorTitle,
            content: editorContent
        });
    };

    const createNote = () => {
        const newNote = {
            id: uuidv4(),
            title: 'New Note',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        addNote(newNote);
        setShowList(false);
    };

    const deleteNote = () => {
        if (!activeNote || !window.confirm('Delete this note?')) return;
        deleteNoteAction(activeNote.id);
    };

    const deleteSelectedMedia = () => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;
        const range = selectedImage || quill.getSelection();
        if (range) {
            quill.deleteText(range.index, Math.max(1, range.length));
            setSelectedImage(null);
            quill.focus();
        }
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    };

    const insertImage = async (file) => {
        const base64 = await fileToBase64(file);
        const quill = quillRef.current?.getEditor();
        if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', base64);
        }
    };

    const handleImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => e.target.files[0] && insertImage(e.target.files[0]);
        input.click();
    };

    const handleVideo = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (e) => {
            if (e.target.files[0]) {
                alert('Video support simplified in this version.');
            }
        };
        input.click();
    };

    if (!selectedProvider) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                    {!isWindowed && onBack && (
                        <button onClick={onBack} className="btn btn--ghost btn--icon"><FiChevronLeft /></button>
                    )}
                    <span style={{ fontWeight: 600, marginLeft: '8px' }}>Notes Provider</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <ProviderSelection onSelect={handleProviderSelect} />
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border-color)', gap: '8px' }}>
                {!isWindowed && onBack && (
                    <button onClick={onBack} className="btn btn--ghost btn--icon"><FiChevronLeft /></button>
                )}
                <button onClick={() => setShowList(!showList)} className="btn btn--ghost btn--icon"><FiList /></button>
                <input
                    type="text"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                    onBlur={saveNote}
                    placeholder="Note title..."
                    style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '15px', fontWeight: 600, outline: 'none', color: 'inherit' }}
                />
                <button onClick={handleImage} className="btn btn--ghost btn--icon"><FiImage /></button>
                <button onClick={createNote} className="btn btn--ghost btn--icon"><FiPlus /></button>
                <button onClick={deleteNote} className="btn btn--ghost btn--icon" style={{ color: 'var(--warning)' }}><FiTrash2 /></button>
            </div>

            {showList && (
                <div style={{ position: 'absolute', top: '48px', left: 0, bottom: 0, width: '220px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', zIndex: 100, overflowY: 'auto' }}>
                    {notes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => { setActiveNote(note); setShowList(false); }}
                            style={{ padding: '12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--border-color)', background: activeNote?.id === note.id ? 'var(--bg-tertiary)' : 'transparent' }}
                        >
                            <div style={{ fontWeight: 500 }}>{note.title || 'Untitled'}</div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {activeNote ? (
                    <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={editorContent}
                        onChange={setEditorContent}
                        onBlur={saveNote}
                        modules={modules}
                        formats={formats}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                    />
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Select or create a note
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesApp;
