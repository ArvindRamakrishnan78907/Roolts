import React from 'react';
import { SiKotlin, SiCsharp, SiRuby, SiC } from 'react-icons/si';

export const getFileIcon = (language) => {
    const iconStyle = { width: '16px', height: '16px', objectFit: 'contain', display: 'block' };
    const largerStyle = { width: '20px', height: '20px', objectFit: 'contain', display: 'block' };
    const reactIconStyle = { fontSize: '16px', color: 'var(--text-primary)', display: 'block' };
    // Custom colors for react icons
    const kotlinStyle = { ...reactIconStyle, color: '#7F52FF' };
    const csharpStyle = { ...reactIconStyle, color: '#239120' };
    const rubyStyle = { ...reactIconStyle, color: '#CC342D' };
    const cStyle = { ...reactIconStyle, color: '#A8B9CC' };


    const icons = {
        python: <img src="/icons/python.png" alt="python" style={iconStyle} />,
        javascript: <img src="/icons/javascript.png" alt="javascript" style={iconStyle} />,
        java: <img src="/icons/java.png" alt="java" style={largerStyle} />,
        html: <img src="/icons/html.png" alt="html" style={iconStyle} />,
        css: <img src="/icons/css.png" alt="css" style={iconStyle} />,
        json: '📋',
        c: <SiC style={cStyle} />,
        cpp: <img src="/icons/cpp.png" alt="cpp" style={iconStyle} />,
        go: <img src="/icons/go.png" alt="go" style={largerStyle} />,
        kotlin: <SiKotlin style={kotlinStyle} />,
        csharp: <SiCsharp style={csharpStyle} />,
        ruby: <SiRuby style={rubyStyle} />,
        default: '📄'
    };
    return icons[language] || icons.default;
};

