import React, { useState } from 'react';
import { FiDownload, FiEye, FiLayout, FiCheck, FiX } from 'react-icons/fi';
import { useUIStore, useFileStore } from '../store';
import api from '../services/api';

const PortfolioGenerator = () => {
    const { closeModal } = useUIStore();
    const { files } = useFileStore();

    // Default data
    const [formData, setFormData] = useState({
        name: 'User Name',
        tagline: 'Full Stack Developer | AI Enthusiast',
        bio: 'I build scalable web applications and explore the frontiers of AI.',
        skills: 'React, Node.js, Python, TypeScript, AI/ML',
        projects: [
            { name: 'Roolts', description: 'AI-Powered Code Editor', link: '#' }
        ],
        primaryColor: '#3b82f6',
        isDark: false
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleProjectChange = (index, field, value) => {
        const newProjects = [...formData.projects];
        newProjects[index][field] = value;
        setFormData(prev => ({ ...prev, projects: newProjects }));
    };

    const addProject = () => {
        setFormData(prev => ({
            ...prev,
            projects: [...prev.projects, { name: '', description: '', link: '' }]
        }));
    };

    const removeProject = (index) => {
        setFormData(prev => ({
            ...prev,
            projects: prev.projects.filter((_, i) => i !== index)
        }));
    };

    const getPayload = () => ({
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean)
    });

    const handlePreview = async () => {
        setIsGenerating(true);
        try {
            const response = await api.post('/portfolio/preview', getPayload());
            const blob = new Blob([response.data.html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
        } catch (error) {
            console.error('Preview failed:', error);
            alert('Failed to generate preview');
        }
        setIsGenerating(false);
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            const response = await api.post('/portfolio/download', getPayload(), { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'portfolio.zip');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download portfolio');
        }
        setIsGenerating(false);
    };

    return (
        <div className="portfolio-generator" style={{ display: 'flex', height: '80vh', gap: '2rem' }}>
            {/* Configuration Form */}
            <div className="config-panel" style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiLayout /> Portfolio Details
                </h3>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="label">Full Name</label>
                    <input
                        className="input"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="label">Tagline</label>
                    <input
                        className="input"
                        value={formData.tagline}
                        onChange={(e) => handleChange('tagline', e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="label">Bio</label>
                    <textarea
                        className="input"
                        rows={4}
                        value={formData.bio}
                        onChange={(e) => handleChange('bio', e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="label">Skills (comma separated)</label>
                    <input
                        className="input"
                        value={formData.skills}
                        onChange={(e) => handleChange('skills', e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        Projects
                        <button className="btn btn--sm btn--ghost" onClick={addProject}>+ Add</button>
                    </label>
                    {formData.projects.map((proj, i) => (
                        <div key={i} style={{
                            background: 'var(--bg-tertiary)',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            position: 'relative'
                        }}>
                            <button
                                onClick={() => removeProject(i)}
                                style={{
                                    position: 'absolute', right: '5px', top: '5px',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                                }}
                            >
                                <FiX />
                            </button>
                            <input
                                className="input"
                                placeholder="Project Name"
                                style={{ marginBottom: '0.5rem' }}
                                value={proj.name}
                                onChange={(e) => handleProjectChange(i, 'name', e.target.value)}
                            />
                            <input
                                className="input"
                                placeholder="Description"
                                style={{ marginBottom: '0.5rem' }}
                                value={proj.description}
                                onChange={(e) => handleProjectChange(i, 'description', e.target.value)}
                            />
                        </div>
                    ))}
                </div>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label className="label">Theme</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={formData.primaryColor}
                            onChange={(e) => handleChange('primaryColor', e.target.value)}
                            style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px' }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.isDark}
                                onChange={(e) => handleChange('isDark', e.target.checked)}
                            />
                            Dark Mode
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn btn--secondary"
                        onClick={handlePreview}
                        disabled={isGenerating}
                        style={{ flex: 1 }}
                    >
                        <FiEye /> Preview
                    </button>
                    <button
                        className="btn btn--primary"
                        onClick={handleDownload}
                        disabled={isGenerating}
                        style={{ flex: 1 }}
                    >
                        <FiDownload /> Download ZIP
                    </button>
                </div>
            </div>

            {/* Preview Panel */}
            <div className="preview-panel" style={{ flex: 1, background: '#f0f0f0', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                {previewUrl ? (
                    <iframe
                        src={previewUrl}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="Portfolio Preview"
                    />
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                        <p>Click "Preview" to generate your site</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortfolioGenerator;
