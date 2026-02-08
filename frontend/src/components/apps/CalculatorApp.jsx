import React, { useState } from 'react';
import { FiChevronLeft, FiDelete, FiExternalLink } from 'react-icons/fi';

const CalculatorApp = ({ onBack, isWindowed, onPopOut }) => {
    const [display, setDisplay] = useState('0');
    const [previousValue, setPreviousValue] = useState(null);
    const [operation, setOperation] = useState(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);
    const [history, setHistory] = useState('');

    const inputNumber = (num) => {
        if (waitingForOperand) {
            setDisplay(num);
            setWaitingForOperand(false);
        } else {
            setDisplay(display === '0' ? num : display + num);
        }
    };

    const inputDecimal = () => {
        if (waitingForOperand) {
            setDisplay('0.');
            setWaitingForOperand(false);
            return;
        }
        if (!display.includes('.')) {
            setDisplay(display + '.');
        }
    };

    const clear = () => {
        setDisplay('0');
        setPreviousValue(null);
        setOperation(null);
        setHistory('');
    };

    const clearEntry = () => {
        setDisplay('0');
    };

    const backspace = () => {
        if (display.length === 1 || (display.length === 2 && display[0] === '-')) {
            setDisplay('0');
        } else {
            setDisplay(display.slice(0, -1));
        }
    };

    const toggleSign = () => {
        setDisplay(display.charAt(0) === '-' ? display.slice(1) : '-' + display);
    };

    const percent = () => {
        const value = parseFloat(display) / 100;
        setDisplay(String(value));
    };

    const performOperation = (nextOperation) => {
        const inputValue = parseFloat(display);

        if (previousValue === null) {
            setPreviousValue(inputValue);
            setHistory(`${inputValue} ${nextOperation}`);
        } else if (operation) {
            const currentValue = previousValue;
            let newValue;

            switch (operation) {
                case '+': newValue = currentValue + inputValue; break;
                case '-': newValue = currentValue - inputValue; break;
                case '×': newValue = currentValue * inputValue; break;
                case '÷': newValue = inputValue !== 0 ? currentValue / inputValue : 'Error'; break;
                default: newValue = inputValue;
            }

            setDisplay(String(newValue));
            setPreviousValue(newValue);
            setHistory(`${newValue} ${nextOperation}`);
        }

        setWaitingForOperand(true);
        setOperation(nextOperation);
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            const { key } = event;

            if (/\d/.test(key)) {
                event.preventDefault();
                inputNumber(key);
            } else if (key === '.') {
                event.preventDefault();
                inputDecimal();
            } else if (key === 'Enter' || key === '=') {
                event.preventDefault();
                calculate();
            } else if (key === 'Backspace') {
                event.preventDefault();
                backspace();
            } else if (key === 'Escape') {
                event.preventDefault();
                clear();
            } else if (key === '+' || key === '-' || key === '*' || key === '/') {
                event.preventDefault();
                const opMap = { '*': '×', '/': '÷' };
                performOperation(opMap[key] || key);
            } else if (key === '%') {
                event.preventDefault();
                percent();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [display, waitingForOperand, previousValue, operation, history]); // Dependencies for closure stability

    const calculate = () => {
        if (operation === null || previousValue === null) return;

        const inputValue = parseFloat(display);
        let newValue;

        switch (operation) {
            case '+': newValue = previousValue + inputValue; break;
            case '-': newValue = previousValue - inputValue; break;
            case '×': newValue = previousValue * inputValue; break;
            case '÷': newValue = inputValue !== 0 ? previousValue / inputValue : 'Error'; break;
            default: newValue = inputValue;
        }

        setHistory(`${previousValue} ${operation} ${inputValue} =`);
        setDisplay(String(newValue));
        setPreviousValue(null);
        setOperation(null);
        setWaitingForOperand(true);
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            const { key } = event;

            if (/\d/.test(key)) {
                event.preventDefault();
                inputNumber(key);
            } else if (key === '.') {
                event.preventDefault();
                inputDecimal();
            } else if (key === 'Enter' || key === '=') {
                event.preventDefault();
                calculate();
            } else if (key === 'Backspace') {
                event.preventDefault();
                backspace();
            } else if (key === 'Escape') {
                event.preventDefault();
                clear();
            } else if (key === '+' || key === '-' || key === '*' || key === '/') {
                event.preventDefault();
                const opMap = { '*': '×', '/': '÷' };
                performOperation(opMap[key] || key);
            } else if (key === '%') {
                event.preventDefault();
                percent();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [display, waitingForOperand, previousValue, operation, history]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!isWindowed && onBack && (
                        <button onClick={onBack} className="btn btn--ghost btn--icon" title="Back">
                            <FiChevronLeft />
                        </button>
                    )}
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>Calculator</span>
                </div>
                {!isWindowed && onPopOut && (
                    <button onClick={onPopOut} className="btn btn--ghost btn--icon" title="Open in New Window">
                        <FiExternalLink />
                    </button>
                )}
            </div>
            <div style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)'
            }}>
                {/* History */}
                <div style={{
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                    height: '20px',
                    marginBottom: '8px'
                }}>
                    {history}
                </div>
                {/* Main display */}
                <div style={{
                    fontSize: display.length > 12 ? '28px' : display.length > 8 ? '36px' : '48px',
                    fontWeight: 300,
                    letterSpacing: '-1px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    wordBreak: 'break-all',
                    textAlign: 'right',
                    transition: 'font-size 0.1s'
                }}>
                    {display}
                </div>
            </div>

            {/* Buttons */}
            <div style={{
                flex: 1,
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px'
            }}>
                <Button value="C" onClick={clear} variant="function" />
                <Button value="CE" onClick={clearEntry} variant="function" />
                <Button value="%" onClick={percent} variant="function" />
                <Button value="÷" onClick={() => performOperation('÷')} variant="operator" />

                <Button value="7" onClick={() => inputNumber('7')} />
                <Button value="8" onClick={() => inputNumber('8')} />
                <Button value="9" onClick={() => inputNumber('9')} />
                <Button value="×" onClick={() => performOperation('×')} variant="operator" />

                <Button value="4" onClick={() => inputNumber('4')} />
                <Button value="5" onClick={() => inputNumber('5')} />
                <Button value="6" onClick={() => inputNumber('6')} />
                <Button value="-" onClick={() => performOperation('-')} variant="operator" />

                <Button value="1" onClick={() => inputNumber('1')} />
                <Button value="2" onClick={() => inputNumber('2')} />
                <Button value="3" onClick={() => inputNumber('3')} />
                <Button value="+" onClick={() => performOperation('+')} variant="operator" />

                <Button value="±" onClick={toggleSign} variant="function" />
                <Button value="0" onClick={() => inputNumber('0')} />
                <Button value="." onClick={inputDecimal} />
                <Button value="=" onClick={calculate} variant="equals" />
            </div>
        </div >
    );
};

const Button = ({ value, onClick, span = 1, variant = 'number' }) => {
    const colors = {
        number: { bg: 'var(--bg-tertiary)', hover: 'var(--bg-secondary)', color: 'var(--text-primary)' },
        operator: { bg: '#FF9500', hover: '#FFB143', color: 'white' },
        function: { bg: 'var(--bg-secondary)', hover: 'var(--bg-tertiary)', color: 'var(--text-primary)' },
        equals: { bg: '#34C759', hover: 'var(--text-primary)', color: 'white' } /* Fixed hover color for equals */
    };
    const style = colors[variant];

    return (
        <button
            onClick={onClick}
            style={{
                gridColumn: span > 1 ? `span ${span}` : undefined,
                padding: '20px',
                fontSize: '22px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                backgroundColor: style.bg,
                color: style.color,
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = style.hover}
            onMouseLeave={(e) => e.target.style.backgroundColor = style.bg}
        >
            {value}
        </button>
    );
};

export default CalculatorApp;
