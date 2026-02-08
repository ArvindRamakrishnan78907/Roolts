import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import { FiPlus, FiTrash2, FiImage, FiCamera, FiVideo, FiChevronLeft, FiList, FiX, FiDownload, FiUpload, FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';
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

const NotesApp = ({ onBack, isWindowed }) => {
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
            parchment: Quill.import('parchment'),
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

    useEffect(() => {
        const loaded = loadNotesFromStorage();
        setNotes(loaded.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
        if (loaded.length > 0) {
            setActiveNote(loaded[0]);
        }
    }, []);

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
                        setSelectedImage(range);
                        return;
                    }
                }
            } catch (e) {
                // Ignore
            }
            setSelectedImage(null);
        };

        quill.on('selection-change', handler);
        return () => quill.off('selection-change', handler);
    }, [quillRef.current]);

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
        });

        document.body.appendChild(element);

        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`${editorTitle || 'note'}.pdf`);
        } catch (err) {
            console.error(err);
            alert('Export failed');
        } finally {
            document.body.removeChild(element);
            setShowExportMenu(false);
        }
    };

    const exportAsWord = () => {
        if (!activeNote) return;

        const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${editorTitle}</title>
<style>
body { font-family: Arial, sans-serif; padding: 20px; }
img { max-width: 100%; height: auto; display: block; margin: 10px 0; }
video { max-width: 100%; }
</style>
</head>
<body>
<h1>${editorTitle}</h1>
${editorContent}
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
                    <button onClick={onBack} className="btn btn--ghost btn--icon" title="Back"><FiChevronLeft /></button>
                )}
                <button onClick={() => setShowList(!showList)} className="btn btn--ghost btn--icon" title="Notes List"><FiList /></button>
                <input
                    type="text"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                    onBlur={saveNote}
                    placeholder="Note title..."
                    style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '15px', fontWeight: 600, outline: 'none', color: 'inherit' }}
                />
                <button onClick={() => quillRef.current?.getEditor()?.history?.undo()} className="btn btn--ghost btn--icon" title="Undo (Ctrl+Z)">↶</button>
                <button onClick={() => quillRef.current?.getEditor()?.history?.redo()} className="btn btn--ghost btn--icon" title="Redo (Ctrl+Y)">↷</button>
                <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                <button onClick={handleImage} className="btn btn--ghost btn--icon" title="Add Image"><FiImage /></button>
                <button onClick={() => setShowCamera(true)} className="btn btn--ghost btn--icon" title="Camera"><FiCamera /></button>
                <button onClick={handleVideo} className="btn btn--ghost btn--icon" title="Add Video"><FiVideo /></button>
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
                    <button onClick={() => setShowExportMenu(!showExportMenu)} className="btn btn--ghost btn--icon" title="Export/Import"><FiDownload /></button>
                    {showExportMenu && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 100, minWidth: '140px' }}>
                            <button onClick={exportAsPDF} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                                📄 Export as PDF
                            </button>
                            <button onClick={exportAsWord} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                                📝 Export as Word
                            </button>
                            <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>
                            <button onClick={importFile} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                                📂 Import File
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={createNote} className="btn btn--ghost btn--icon" title="New Note"><FiPlus /></button>
                <button onClick={deleteNote} className="btn btn--ghost btn--icon" title="Delete" style={{ color: 'var(--warning)' }}><FiTrash2 /></button>
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
                        <button onClick={createNote} className="btn btn--primary"><FiPlus /> Create Note</button>
                    </div>
                )}
            </div>

            {/* Camera Modal */}
            {showCamera && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <span style={{ fontWeight: 600, fontSize: '16px' }}>Take Photo</span>
                            <button onClick={() => setShowCamera(false)} className="btn btn--ghost btn--icon"><FiX /></button>
                        </div>
                        <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" style={{ width: '100%', borderRadius: '8px' }} />
                        <button onClick={captureSnapshot} className="btn btn--primary" style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
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
