import React, { useState } from 'react';
import { FiGrid, FiActivity, FiCpu, FiMessageSquare, FiMusic, FiPackage, FiSettings, FiCamera, FiChrome, FiMap, FiPhone, FiMail } from 'react-icons/fi';
import CallingPanel from './CallingPanel';

const AppsPanel = () => {
    const [activeAppId, setActiveAppId] = useState(null);

    // Android-style app configuration
    const apps = [
        { id: 'notes', name: 'Notes', icon: <FiMessageSquare />, color: '#f1c40f' },
        { id: 'calc', name: 'Calc', icon: <FiActivity />, color: '#e74c3c' },
        { id: 'calls', name: 'Calls', icon: <FiPhone />, color: '#2ecc71' },
    ];

    if (activeAppId === 'calls') {
        return <CallingPanel onBack={() => setActiveAppId(null)} />;
    }

    return (
        <div className="panel-content" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', fontSize: '18px' }}>
                    Apps
                </h3>
                <span style={{ fontSize: '12px', opacity: 0.6 }}>12:45 PM</span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px',
                justifyContent: 'center'
            }}>
                {apps.map(app => (
                    <div key={app.id}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.1s'
                        }}
                        onClick={() => setActiveAppId(app.id)}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: app.color,
                            borderRadius: '12px', // Squircle shape
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

            {/* Android-style navigation dots */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', opacity: 0.8 }}></div>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', opacity: 0.3 }}></div>
            </div>
        </div>
    );
};

export default AppsPanel;
