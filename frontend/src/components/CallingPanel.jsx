import React, { useState, useEffect } from 'react';
import { FiPhone, FiPhoneOff, FiUser, FiClock, FiVideo, FiMic, FiMicOff, FiMoreVertical, FiGrid, FiArrowLeft, FiSettings, FiCheck, FiX, FiShield } from 'react-icons/fi';

const CallingPanel = ({ onBack }) => {
    const [view, setView] = useState('dialer'); // dialer, calling, contacts, settings
    const [phoneNumber, setPhoneNumber] = useState('');
    const [callStatus, setCallStatus] = useState('Calling...');
    const [callTime, setCallTime] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideo, setIsVideo] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    // Call Forwarding States
    const [isForwardingEnabled, setIsForwardingEnabled] = useState(false);
    const [forwardingNumber, setForwardingNumber] = useState('');
    const [tempForwardingNumber, setTempForwardingNumber] = useState('');

    const recentCalls = [
        { id: 1, name: 'Arvind Ramakrishnan', number: '+91 98765 43210', time: '2 mins ago', type: 'incoming' },
        { id: 2, name: 'Google Workspace', number: '+1 650-253-0000', time: '1 hour ago', type: 'outgoing' },
        { id: 3, name: 'AI Assistant', number: 'Bot', time: 'Yesterday', type: 'missed' },
    ];

    const dialPad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

    useEffect(() => {
        let interval;
        if (view === 'calling' && callStatus === 'Connected') {
            interval = setInterval(() => {
                setCallTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [view, callStatus]);

    const handleDial = (num) => {
        if (phoneNumber.length < 15) {
            setPhoneNumber(prev => prev + num);
        }
    };

    const startCall = (withVideo = false) => {
        if (phoneNumber || view === 'dialer') {
            setView('calling');
            setIsVideo(withVideo);
            setCallStatus(isForwardingEnabled ? `Forwarding to ${forwardingNumber}...` : 'Calling...');
            setCallTime(0);

            setTimeout(() => {
                setCallStatus('Connected');
            }, 2500);
        }
    };

    const endCall = () => {
        setView('dialer');
        setPhoneNumber('');
        setIsVideo(false);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleForwarding = () => {
        if (isForwardingEnabled) {
            setIsForwardingEnabled(false);
        } else if (tempForwardingNumber) {
            setForwardingNumber(tempForwardingNumber);
            setIsForwardingEnabled(true);
            setView('dialer');
        }
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1a1a1a',
            color: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid #333',
                backgroundColor: '#222'
            }}>
                <button
                    onClick={view === 'settings' ? () => setView('dialer') : onBack}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    <FiArrowLeft size={20} />
                </button>
                <h3 style={{ margin: '0 16px', fontSize: '16px', flex: 1 }}>{view === 'settings' ? 'Call Settings' : 'Phone'}</h3>
                {view === 'dialer' && (
                    <button
                        onClick={() => {
                            setTempForwardingNumber(forwardingNumber);
                            setView('settings');
                        }}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.6 }}
                    >
                        <FiSettings />
                    </button>
                )}
            </div>

            {view === 'dialer' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
                    {/* Forwarding Status Indicator */}
                    {isForwardingEnabled && (
                        <div style={{
                            backgroundColor: 'rgba(46, 204, 113, 0.1)',
                            border: '1px solid #2ecc71',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '12px',
                            color: '#2ecc71'
                        }}>
                            <FiShield style={{ marginRight: '8px' }} />
                            Forwarding active to {forwardingNumber}
                        </div>
                    )}

                    {/* Recent Calls Mini List */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>Recent</div>
                        {recentCalls.slice(0, 2).map(call => (
                            <div key={call.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #222' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
                                    <FiUser size={16} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{call.name}</div>
                                    <div style={{ fontSize: '11px', color: '#666' }}>{call.time}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <FiVideo size={14} style={{ opacity: 0.5, cursor: 'pointer' }} onClick={() => startCall(true)} />
                                    <FiPhone size={14} style={{ color: '#2ecc71', opacity: 0.8, cursor: 'pointer' }} onClick={() => startCall(false)} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Number Display */}
                    <div style={{
                        height: '70px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            fontSize: phoneNumber ? '32px' : '24px',
                            fontWeight: '300',
                            color: phoneNumber ? 'white' : 'rgba(255,255,255,0.4)',
                            transition: 'all 0.2s'
                        }}>
                            {phoneNumber || 'Dial Number'}
                        </div>
                    </div>

                    {/* Dial Pad */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '20px',
                        justifyItems: 'center',
                        alignContent: 'center',
                        flex: 1
                    }}>
                        {dialPad.map(num => (
                            <button
                                key={num}
                                onClick={() => handleDial(num)}
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    backgroundColor: '#2a2a2a',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '22px',
                                    fontWeight: '400',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#3a3a3a';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                {num}
                            </button>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: '30px',
                        gap: '25px',
                        paddingBottom: '10px'
                    }}>
                        <button
                            onClick={() => startCall(true)}
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                backgroundColor: '#2980b9',
                                border: 'none',
                                color: 'white',
                                fontSize: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(41, 128, 185, 0.3)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            title="Video Call"
                        >
                            <FiVideo />
                        </button>
                        <button
                            onClick={() => startCall(false)}
                            style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '50%',
                                backgroundColor: '#27ae60',
                                border: 'none',
                                color: 'white',
                                fontSize: '28px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 6px 15px rgba(39, 174, 96, 0.4)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            title="Voice Call"
                        >
                            <FiPhone />
                        </button>
                        <div style={{ width: '56px', display: 'flex', justifyContent: 'center' }}>
                            {phoneNumber && (
                                <button
                                    onClick={() => setPhoneNumber(prev => prev.slice(0, -1))}
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        backgroundColor: 'transparent',
                                        border: '1px solid #444',
                                        color: '#888',
                                        fontSize: '18px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                        e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = '#888';
                                    }}
                                >
                                    <FiArrowLeft />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {view === 'calling' && (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: isVideo ? '20px' : '60px 20px',
                    background: isVideo ? '#000' : 'linear-gradient(to bottom, #1a1a1a, #2c3e50)',
                    position: 'relative'
                }}>
                    {isVideo && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isVideoEnabled ? 1 : 0.2
                        }}>
                            {/* Mock Video Stream Template */}
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(45deg, #2c3e50, #000)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: '150%',
                                    height: '150%',
                                    opacity: 0.1,
                                    background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, #fff 1px, #fff 2px)'
                                }}></div>
                                <FiUser size={120} style={{ opacity: 0.1, position: 'absolute' }} />
                                <div style={{ fontSize: '10px', color: '#3498db', opacity: 0.5, position: 'absolute', bottom: '100px' }}>
                                    ENCRYPTED VIDEO STREAM ACTIVE
                                </div>
                            </div>

                            {/* Self View Overlay */}
                            <div style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                width: '80px',
                                height: '120px',
                                backgroundColor: '#1a1a1a',
                                borderRadius: '8px',
                                border: '2px solid rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FiUser size={24} style={{ opacity: 0.5 }} />
                            </div>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', zIndex: 1, textShadow: isVideo ? '0 2px 4px rgba(0,0,0,0.8)' : 'none' }}>
                        {!isVideo && (
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                backgroundColor: '#444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px',
                                border: '2px solid rgba(255,255,255,0.1)'
                            }}>
                                <FiUser size={48} />
                            </div>
                        )}
                        <h2 style={{ fontSize: isVideo ? '20px' : '24px', fontWeight: '400', marginBottom: '8px' }}>{phoneNumber || 'Unknown'}</h2>
                        <div style={{ fontSize: '14px', color: isVideo ? '#fff' : '#bdc3c7' }}>
                            {callStatus === 'Connected' ? formatTime(callTime) : callStatus}
                        </div>
                    </div>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '30px' }}>
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    backgroundColor: isMuted ? 'white' : 'rgba(255,255,255,0.2)',
                                    color: isMuted ? '#1a1a1a' : 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                {isMuted ? <FiMicOff /> : <FiMic />}
                            </button>
                            <button
                                onClick={() => {
                                    if (!isVideo) {
                                        setIsVideo(true);
                                    } else {
                                        setIsVideoEnabled(!isVideoEnabled);
                                    }
                                }}
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    backgroundColor: (isVideo && isVideoEnabled) ? '#3498db' : 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                <FiVideo style={{ opacity: (isVideo && !isVideoEnabled) ? 0.5 : 1 }} />
                            </button>
                            <button
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                <FiGrid />
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                onClick={endCall}
                                style={{
                                    width: '65px',
                                    height: '65px',
                                    borderRadius: '50%',
                                    backgroundColor: '#e74c3c',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '28px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)'
                                }}
                            >
                                <FiPhoneOff />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {view === 'settings' && (
                <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ backgroundColor: '#222', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FiShield size={20} style={{ color: isForwardingEnabled ? '#2ecc71' : '#666' }} />
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: '500' }}>Call Forwarding</div>
                                    <div style={{ fontSize: '11px', color: '#888' }}>Forward incoming calls to another number</div>
                                </div>
                            </div>
                            <button
                                onClick={toggleForwarding}
                                style={{
                                    width: '40px',
                                    height: '24px',
                                    borderRadius: '12px',
                                    backgroundColor: isForwardingEnabled ? '#2ecc71' : '#444',
                                    border: 'none',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'background 0.3s'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '2px',
                                    left: isForwardingEnabled ? '18px' : '2px',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: 'white',
                                    transition: 'left 0.3s'
                                }}></div>
                            </button>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <label style={{ fontSize: '12px', color: '#888', marginBottom: '6px', display: 'block' }}>Forwarding Number</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    value={tempForwardingNumber}
                                    onChange={(e) => setTempForwardingNumber(e.target.value)}
                                    placeholder="+1 234 567 890"
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#333',
                                        border: '1px solid #444',
                                        borderRadius: '6px',
                                        padding: '8px 12px',
                                        color: 'white',
                                        fontSize: '14px'
                                    }}
                                />
                                {!isForwardingEnabled && tempForwardingNumber !== forwardingNumber && (
                                    <button
                                        onClick={() => {
                                            setForwardingNumber(tempForwardingNumber);
                                            setIsForwardingEnabled(true);
                                        }}
                                        style={{
                                            backgroundColor: '#2ecc71',
                                            border: 'none',
                                            borderRadius: '6px',
                                            width: '36px',
                                            color: 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <FiCheck />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#222', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FiVideo size={20} style={{ color: '#3498db' }} />
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>Video Settings</div>
                                <div style={{ fontSize: '11px', color: '#888' }}>HD Video is enabled by default</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            {(view === 'dialer' || view === 'settings') && (
                <div style={{
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-around',
                    borderTop: '1px solid #333',
                    backgroundColor: '#222'
                }}>
                    <div
                        onClick={() => setView('dialer')}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: view === 'dialer' ? 1 : 0.5, color: view === 'dialer' ? '#2ecc71' : 'white', cursor: 'pointer' }}
                    >
                        <FiGrid size={18} />
                        <span style={{ fontSize: '10px', marginTop: '4px' }}>Keypad</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                        <FiClock size={18} />
                        <span style={{ fontSize: '10px', marginTop: '4px' }}>Recents</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                        <FiUser size={18} />
                        <span style={{ fontSize: '10px', marginTop: '4px' }}>Contacts</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallingPanel;
