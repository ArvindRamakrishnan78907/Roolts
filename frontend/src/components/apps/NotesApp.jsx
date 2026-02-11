import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import {
    FiPlus, FiTrash2, FiImage, FiCamera, FiVideo, FiChevronLeft, FiList, FiX,
    FiDownload, FiUpload, FiAlignLeft, FiAlignCenter, FiAlignRight,
    FiRefreshCw, FiCheckCircle, FiCloud, FiLock
} from 'react-icons/fi';
import { SiMicrosoftonedrive, SiEvernote } from 'react-icons/si';
import { useNotesStore, useUIStore } from '../../store';

import Webcam from 'react-webcam';
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Register Quill modules
Quill.register('modules/imageResize', ImageResize);

// Simple localStorage-based notes storage
const NOTES_KEY = 'roolts_notes_v2';

const saveNotesToStorage = (notes) => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
};

const loadNotesFromStorage = () => {
    try {
        const data = localStorage.getItem(NOTES_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

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
            isConnected: onedrive.isConnected
        },
        {
            id: 'evernote',
            name: 'Evernote',
            description: 'The best way to organize your life.',
            icon: <SiEvernote size={32} />,
            color: '#00a82d',
            isConnected: evernote.isConnected
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

    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState(null);
    const [showList, setShowList] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [editorContent, setEditorContent] = useState('');
    const [editorTitle, setEditorTitle] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const quillRef = useRef(null);
    const webcamRef = useRef(null);

    // Quill modules with image resize and history
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'font': ['arial', 'comic-sans', 'courier-new', 'georgia', 'helvetica', 'lucida', 'times-new-roman', 'verdana'] }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'header': [1, 2, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link'],
                ['clean']
            ]
        },
        imageResize: {
            parchment: (() => {
                try {
                    return Quill.import('parchment');
                } catch (e) {
                    console.error('Failed to import parchment for Quill:', e);
                    return null;
                }
            })(),
            modules: ['Resize', 'DisplaySize']
        },
        keyboard: {
            bindings: {
                // Ensure delete/backspace works for selected content (including images)
                deleteSelected: {
                    key: ['Backspace', 'Delete'],
                    handler: function (range, context) {
                        if (range.length > 0) {
                            this.quill.deleteText(range.index, range.length);
                            return false;
                        }
                        return true;
                    }
                }
            }
        },
        history: {
            delay: 1000,
            maxStack: 100,
            userOnly: true
        }
    }), []);

    const formats = ['font', 'size', 'header', 'bold', 'italic', 'underline', 'color', 'background', 'list', 'bullet', 'link', 'image', 'video', 'align', 'width', 'height', 'style'];

    // Helper function for keyboard accessibility on buttons
    const handleButtonKeyDown = (e, callback) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            callback();
        }
    };

    useEffect(() => {
        if (selectedProvider === 'roolts') {
            const loaded = loadNotesFromStorage();
            setNotes(loaded.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
            if (loaded.length > 0) {
                setActiveNote(loaded[0]);
            }
        }
    }, [selectedProvider]);

    const handleConnectOneDrive = async () => {
        try {
            // Social service removed
            if (response.data.auth_url) {
                window.location.href = response.data.auth_url;
            }
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to connect to OneDrive' });
        }
    };

    const handleConnectEvernote = async () => {
        try {
            // Social service removed
            if (response.data.auth_url) {
                window.location.href = response.data.auth_url;
            }
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to connect to Evernote' });
        }
    };

    const handleProviderSelect = (providerId) => {
        if (providerId === 'onedrive' && !onedrive.isConnected) {
            handleConnectOneDrive();
            return;
        }
        if (providerId === 'evernote' && !evernote.isConnected) {
            handleConnectEvernote();
            return;
        }
        setProvider(providerId);
    };

    const handleDisconnect = () => {
        if (selectedProvider === 'roolts') {
            setProvider(null);
            return;
        }
        // Other providers removed
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

    // Track selection changes to enable/disable delete button for media
    useEffect(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        const handler = (range, oldRange, source) => {
            if (!range) {
                setSelectedImage(null);
                return;
            }

            // Check if selection is an image or video
            try {
                const formats = quill.getFormat(range);
                if (formats.image || formats.video) {
                    setSelectedImage(range);
                    return;
                }

                // Fallback: check if the node at selection is media
                if (range.length === 0) {
                    const [leaf, offset] = quill.getLeaf(range.index);
                    if (leaf && leaf.domNode && (leaf.domNode.tagName === 'IMG' || leaf.domNode.tagName === 'VIDEO')) {
                        setSelectedImage({ index: range.index, length: 1 });
                        return;
                    }
                }
            } catch (e) {
                // Ignore
            }
            setSelectedImage(null);
        };

        // Also listen for clicks directly on images/videos
        const handleClick = (e) => {
            const target = e.target;
            if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
                try {
                    const blot = Quill.find(target);
                    if (blot) {
                        const index = quill.getIndex(blot);
                        const range = { index, length: 1 };
                        setSelectedImage(range);
                        // Set selection to highlight the image
                        setTimeout(() => quill.setSelection(index, 1), 0);
                    }
                } catch (e) {
                    console.error('Error selecting image:', e);
                }
            }
        };

        const editorElement = quill.root;
        editorElement.addEventListener('click', handleClick);
        quill.on('selection-change', handler);

        return () => {
            editorElement.removeEventListener('click', handleClick);
            quill.off('selection-change', handler);
        };
    }, [quillRef.current]);

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

    if (selectedProvider !== 'roolts') {
        const currentUser = selectedProvider === 'onedrive' ? onedrive.user : evernote.user;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                    {!isWindowed && onBack && (
                        <button onClick={onBack} className="btn btn--ghost btn--icon"><FiChevronLeft /></button>
                    )}
                    <span style={{ fontWeight: 600, marginLeft: '8px' }}>{selectedProvider === 'onedrive' ? 'OneDrive' : 'Evernote'} Notes</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <RemoteNotesView
                        provider={selectedProvider}
                        user={currentUser}
                        onDisconnect={handleDisconnect}
                    />
                </div>
            </div>
        );
    }

    const saveNote = () => {
        if (!activeNote) return;
        const updated = { ...activeNote, title: editorTitle, content: editorContent, updatedAt: new Date().toISOString() };
        const newNotes = notes.map(n => n.id === updated.id ? updated : n);
        setNotes(newNotes);
        setActiveNote(updated);
        saveNotesToStorage(newNotes);
    };

    const createNote = () => {
        const newNote = {
            id: uuidv4(),
            title: 'New Note',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const newNotes = [newNote, ...notes];
        setNotes(newNotes);
        setActiveNote(newNote);
        setShowList(false);
        saveNotesToStorage(newNotes);
    };

    const deleteNote = () => {
        if (!activeNote || !window.confirm('Delete this note?')) return;
        const remaining = notes.filter(n => n.id !== activeNote.id);
        setNotes(remaining);
        setActiveNote(remaining[0] || null);
        saveNotesToStorage(remaining);
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

    // Convert file to base64 data URL
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const insertImage = async (file) => {
        try {
            const base64 = await fileToBase64(file);
            const quill = quillRef.current?.getEditor();
            if (quill) {
                const range = quill.getSelection(true) || { index: quill.getLength() };
                quill.insertEmbed(range.index, 'image', base64);
                quill.setSelection(range.index + 1);
                setTimeout(() => {
                    const content = quill.root.innerHTML;
                    setEditorContent(content);
                    if (activeNote) {
                        const updated = { ...activeNote, title: editorTitle, content, updatedAt: new Date().toISOString() };
                        const newNotes = notes.map(n => n.id === updated.id ? updated : n);
                        setNotes(newNotes);
                        setActiveNote(updated);
                        saveNotesToStorage(newNotes);
                    }
                }, 100);
            }
        } catch (err) {
            console.error('Failed to insert image:', err);
            alert('Failed to insert image');
        }
    };

    const insertVideo = async (file) => {
        try {
            const base64 = await fileToBase64(file);
            const quill = quillRef.current?.getEditor();
            if (quill) {
                const range = quill.getSelection(true) || { index: quill.getLength() };
                const videoHtml = `<video controls style="max-width: 100%; height: auto; border-radius: 4px;"><source src="${base64}" type="${file.type}"></video>`;
                quill.clipboard.dangerouslyPasteHTML(range.index, videoHtml);
                setTimeout(() => {
                    const content = quill.root.innerHTML;
                    setEditorContent(content);
                    if (activeNote) {
                        const updated = { ...activeNote, title: editorTitle, content, updatedAt: new Date().toISOString() };
                        const newNotes = notes.map(n => n.id === updated.id ? updated : n);
                        setNotes(newNotes);
                        setActiveNote(updated);
                        saveNotesToStorage(newNotes);
                    }
                }, 100);
            }
        } catch (err) {
            console.error('Failed to insert video:', err);
            alert('Failed to insert video. Video may be too large.');
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
        input.onchange = (e) => e.target.files[0] && insertVideo(e.target.files[0]);
        input.click();
    };

    const captureSnapshot = async () => {
        const src = webcamRef.current?.getScreenshot();
        if (src) {
            const quill = quillRef.current?.getEditor();
            if (quill) {
                const range = quill.getSelection(true) || { index: quill.getLength() };
                quill.insertEmbed(range.index, 'image', src);
                quill.setSelection(range.index + 1);
                setTimeout(() => {
                    const content = quill.root.innerHTML;
                    setEditorContent(content);
                    if (activeNote) {
                        const updated = { ...activeNote, title: editorTitle, content, updatedAt: new Date().toISOString() };
                        const newNotes = notes.map(n => n.id === updated.id ? updated : n);
                        setNotes(newNotes);
                        setActiveNote(updated);
                        saveNotesToStorage(newNotes);
                    }
                }, 100);
            }
            setShowCamera(false);
        }
    };

    const exportAsPDF = async () => {
        if (!activeNote) return;

        const element = document.createElement('div');
        element.innerHTML = `<h1 style="margin-bottom: 20px;">${editorTitle}</h1>${editorContent}`;
        element.style.cssText = 'padding: 30px; font-family: Arial, sans-serif; max-width: 800px; background: white; color: black;';

        element.querySelectorAll('img').forEach(img => {
            img.style.cssText = 'max-width: 100%; height: auto; display: block; margin: 10px 0;';
            img.crossOrigin = 'anonymous';
        });

        // Remove video elements (can't appear in PDF)
        element.querySelectorAll('video').forEach(video => {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'padding: 20px; background: #f0f0f0; border: 1px solid #ccc; text-align: center; margin: 10px 0; border-radius: 4px;';
            placeholder.textContent = '[Video content - not available in PDF]';
            video.replaceWith(placeholder);
        });

        document.body.appendChild(element);

        try {
            // Wait for all images to load
            const images = element.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add extra pages if needed
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`${editorTitle || 'note'}.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
            alert('Export failed. Please try again.');
        } finally {
            document.body.removeChild(element);
            setShowExportMenu(false);
        }
    };

    const exportAsWord = () => {
        if (!activeNote) return;

        // Process content to handle videos (can't be embedded in Word)
        let processedContent = editorContent;

        // Replace video elements with placeholder text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedContent;
        tempDiv.querySelectorAll('video').forEach(video => {
            const placeholder = document.createElement('p');
            placeholder.style.cssText = 'padding: 15px; background: #f5f5f5; border: 1px dashed #999; text-align: center; color: #666; font-style: italic;';
            placeholder.textContent = '[Video content - view in Notes app]';
            video.replaceWith(placeholder);
        });
        processedContent = tempDiv.innerHTML;

        const htmlContent = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Roolts Notes">
<title>${editorTitle}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page { size: A4; margin: 2cm; }
body { font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
h1 { font-size: 18pt; margin-bottom: 12pt; color: #333; }
img { max-width: 100%; height: auto; display: block; margin: 12pt 0; }
p { margin: 0 0 6pt 0; }
</style>
</head>
<body>
<h1>${editorTitle}</h1>
${processedContent}
</body>
</html>`;

        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        saveAs(blob, `${editorTitle || 'note'}.doc`);
        setShowExportMenu(false);
    };

    const importFile = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html,.htm,.doc,.txt';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');

                const titleEl = doc.querySelector('h1') || doc.querySelector('title');
                const title = titleEl ? titleEl.textContent : file.name.replace(/\.[^/.]+$/, '');

                if (titleEl && titleEl.tagName === 'H1') titleEl.remove();

                const newNote = {
                    id: uuidv4(),
                    title: title,
                    content: doc.body.innerHTML,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                const newNotes = [newNote, ...notes];
                setNotes(newNotes);
                setActiveNote(newNote);
                saveNotesToStorage(newNotes);
                setShowExportMenu(false);
                alert('File imported successfully!');
            } catch (err) {
                console.error(err);
                alert('Failed to import file');
            }
        };
        input.click();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border-color)', gap: '8px' }}>
                {!isWindowed && onBack && (
                    <button onClick={onBack} onKeyDown={(e) => handleButtonKeyDown(e, onBack)} className="btn btn--ghost btn--icon" title="Back"><FiChevronLeft /></button>
                )}
                <button onClick={() => setShowList(!showList)} onKeyDown={(e) => handleButtonKeyDown(e, () => setShowList(!showList))} className="btn btn--ghost btn--icon" title="Notes List"><FiList /></button>
                <input
                    type="text"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                    onBlur={saveNote}
                    placeholder="Note title..."
                    style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '15px', fontWeight: 600, outline: 'none', color: 'inherit' }}
                />
                <button onClick={() => quillRef.current?.getEditor()?.history?.undo()} onKeyDown={(e) => handleButtonKeyDown(e, () => quillRef.current?.getEditor()?.history?.undo())} className="btn btn--ghost btn--icon" title="Undo (Ctrl+Z)">↶</button>
                <button onClick={() => quillRef.current?.getEditor()?.history?.redo()} onKeyDown={(e) => handleButtonKeyDown(e, () => quillRef.current?.getEditor()?.history?.redo())} className="btn btn--ghost btn--icon" title="Redo (Ctrl+Y)">↷</button>
                <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                <button onClick={handleImage} onKeyDown={(e) => handleButtonKeyDown(e, handleImage)} className="btn btn--ghost btn--icon" title="Add Image"><FiImage /></button>
                <button onClick={() => setShowCamera(true)} onKeyDown={(e) => handleButtonKeyDown(e, () => setShowCamera(true))} className="btn btn--ghost btn--icon" title="Camera"><FiCamera /></button>
                <button onClick={handleVideo} onKeyDown={(e) => handleButtonKeyDown(e, handleVideo)} className="btn btn--ghost btn--icon" title="Add Video"><FiVideo /></button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={deleteSelectedMedia}
                    className="btn btn--ghost btn--icon"
                    title="Delete Selected Image/Video (or press Backspace)"
                    disabled={!selectedImage}
                    style={{
                        color: selectedImage ? 'var(--error)' : 'var(--text-muted)',
                        cursor: selectedImage ? 'pointer' : 'not-allowed',
                        opacity: selectedImage ? 1 : 0.5,
                        marginLeft: '4px'
                    }}
                >
                    <FiTrash2 />
                </button>
                <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowExportMenu(!showExportMenu)} onKeyDown={(e) => handleButtonKeyDown(e, () => setShowExportMenu(!showExportMenu))} className="btn btn--ghost btn--icon" title="Export/Import"><FiDownload /></button>
                    {showExportMenu && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 100, minWidth: '140px' }}>
                            <button onClick={exportAsPDF} onKeyDown={(e) => handleButtonKeyDown(e, exportAsPDF)} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                                📄 Export as PDF
                            </button>
                            <button onClick={exportAsWord} onKeyDown={(e) => handleButtonKeyDown(e, exportAsWord)} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                                📝 Export as Word
                            </button>
                            <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>
                            <button onClick={importFile} onKeyDown={(e) => handleButtonKeyDown(e, importFile)} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                                📂 Import File
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={createNote} onKeyDown={(e) => handleButtonKeyDown(e, createNote)} className="btn btn--ghost btn--icon" title="New Note"><FiPlus /></button>
                <button onClick={deleteNote} onKeyDown={(e) => handleButtonKeyDown(e, deleteNote)} className="btn btn--ghost btn--icon" title="Delete" style={{ color: 'var(--warning)' }}><FiTrash2 /></button>
                <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }}></div>
            </div>

            {/* Notes List */}
            {showList && (
                <div style={{ position: 'absolute', top: '48px', left: 0, bottom: 0, width: '220px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', zIndex: 100, overflowY: 'auto' }}>
                    {notes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => { setActiveNote(note); setShowList(false); }}
                            style={{ padding: '12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--border-color)', background: activeNote?.id === note.id ? 'var(--bg-tertiary)' : 'transparent' }}
                        >
                            <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {note.title || 'Untitled'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {new Date(note.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                    {notes.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No notes yet</div>}
                </div>
            )}

            {/* Editor */}
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
                        className="simple-notes-editor"
                    />
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📝</div>
                        <p style={{ marginBottom: '16px' }}>No notes yet</p>
                        <button onClick={createNote} onKeyDown={(e) => handleButtonKeyDown(e, createNote)} className="btn btn--primary"><FiPlus /> Create Note</button>
                    </div>
                )}
            </div>

            {/* Camera Modal */}
            {showCamera && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <span style={{ fontWeight: 600, fontSize: '16px' }}>Take Photo</span>
                            <button onClick={() => setShowCamera(false)} onKeyDown={(e) => handleButtonKeyDown(e, () => setShowCamera(false))} className="btn btn--ghost btn--icon"><FiX /></button>
                        </div>
                        <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" style={{ width: '100%', borderRadius: '8px' }} />
                        <button onClick={captureSnapshot} onKeyDown={(e) => handleButtonKeyDown(e, captureSnapshot)} className="btn btn--primary" style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
                            <FiCamera style={{ marginRight: '8px' }} /> Capture
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .simple-notes-editor .ql-container { flex: 1; border: none !important; font-size: 15px; }
                .simple-notes-editor .ql-toolbar { border: none !important; border-bottom: 1px solid var(--border-color) !important; padding: 8px !important; }
                .simple-notes-editor .ql-editor { padding: 20px; min-height: 100%; line-height: 1.6; }
                .simple-notes-editor .ql-toolbar button { color: var(--text-secondary) !important; }
                .simple-notes-editor .ql-toolbar .ql-stroke { stroke: var(--text-secondary) !important; }
                .simple-notes-editor .ql-toolbar .ql-fill { fill: var(--text-secondary) !important; }
                .simple-notes-editor .ql-toolbar .ql-picker { color: var(--text-secondary) !important; }
                
                /* Font families */
                .ql-font-arial { font-family: Arial, sans-serif; }
                .ql-font-comic-sans { font-family: 'Comic Sans MS', cursive; }
                .ql-font-courier-new { font-family: 'Courier New', monospace; }
                .ql-font-georgia { font-family: Georgia, serif; }
                .ql-font-helvetica { font-family: Helvetica, sans-serif; }
                .ql-font-lucida { font-family: 'Lucida Sans Unicode', sans-serif; }
                .ql-font-times-new-roman { font-family: 'Times New Roman', serif; }
                .ql-font-verdana { font-family: Verdana, sans-serif; }
                
                /* Font sizes */
                .ql-size-small { font-size: 0.75em; }
                .ql-size-large { font-size: 1.5em; }
                .ql-size-huge { font-size: 2em; }
                
                .simple-notes-editor .ql-editor img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 12px 0;
                    border-radius: 6px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    cursor: default;
                }
                
                .simple-notes-editor .ql-editor img.ql-align-center {
                    margin-left: auto;
                    margin-right: auto;
                }
                
                .simple-notes-editor .ql-editor img.ql-align-right {
                    margin-left: auto;
                    margin-right: 0;
                }
                
                .simple-notes-editor .ql-editor img:hover {
                    outline: 2px solid var(--accent-primary);
                }
                
                .simple-notes-editor .ql-editor video {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 12px 0;
                    border-radius: 6px;
                }

                /* Image resize handles */
                .ql-editor img.resizing {
                    outline: 2px dashed var(--accent-primary);
                }
                
                /* Alignment classes */
                .simple-notes-editor .ql-editor .ql-align-center {
                    text-align: center;
                }
                .simple-notes-editor .ql-editor .ql-align-right {
                    text-align: right;
                }
                .simple-notes-editor .ql-editor .ql-align-left {
                    text-align: left;
                }
                .simple-notes-editor .ql-editor .ql-align-justify {
                    text-align: justify;
                }
                
                /* Improve click targets */
                .simple-notes-editor .ql-editor p {
                    min-height: 1.5em;
                    cursor: text;
                }
            `}</style>
        </div>
    );
};

export default NotesApp;
