import React from 'react';

export const getFileIcon = (language) => {
    const iconStyle = { width: '16px', height: '16px', objectFit: 'contain', display: 'block' };
    const largerStyle = { width: '20px', height: '20px', objectFit: 'contain', display: 'block' };

    const icons = {
        python: <img src="/icons/python.png" alt="python" style={iconStyle} />,
        javascript: <img src="/icons/javascript.png" alt="javascript" style={iconStyle} />,
        java: <img src="/icons/java.png" alt="java" style={iconStyle} />,
        html: <img src="/icons/html.png" alt="html" style={iconStyle} />,
        css: <img src="/icons/css.png" alt="css" style={iconStyle} />,
        json: '📋',
        c: <img src="/icons/cpp.png" alt="c" style={iconStyle} />,
        cpp: <img src="/icons/cpp.png" alt="cpp" style={iconStyle} />,
        go: <img src="/icons/go.png" alt="go" style={largerStyle} />,
        default: '📄'
    };
    return icons[language] || icons.default;
};
