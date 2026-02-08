import React from 'react';
import { FiGrid, FiActivity, FiMessageSquare, FiCode } from 'react-icons/fi';

const AppsPanel = ({ onOpenApp }) => {
    // Built-in apps
    const apps = [
        { id: 'notes', name: 'Notes', icon: <FiMessageSquare />, color: '#f1c40f', type: 'builtin' },
        { id: 'calc', name: 'Calculator', icon: <FiActivity />, color: '#e74c3c', type: 'builtin' },
        { id: 'quickpython', name: 'Quick Python', icon: <FiCode />, color: '#3498db', type: 'builtin' },
    ];

    // Get current time
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return (
        <div className="panel-content" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', fontSize: '18px' }}>
                    Apps
                </h3>
                <span style={{ fontSize: '12px', opacity: 0.6 }}>{timeString}</span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px',
                justifyContent: 'center'
            }}>
                {apps.map(app => (
                    <div key={app.id} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.1s'
                    }}
                        onClick={() => onOpenApp && onOpenApp(app.id)}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: app.color,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '24px',
                            marginBottom: '6px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}>
                            {app.icon}
                        </div>
                        <div style={{
                            fontSize: '11px',
                            textAlign: 'center',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                        }}>
                            {app.name}
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation dots */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', opacity: 0.8 }}></div>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', opacity: 0.3 }}></div>
            </div>
        </div>
    );
};

export default AppsPanel;
