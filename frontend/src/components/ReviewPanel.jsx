import React, { useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiPlay, FiCpu } from 'react-icons/fi';
import { useLearningStore, useFileStore, useUIStore } from '../store';
import aiHubService from '../services/aiHubService';

const ReviewPanel = () => {
    const {
        reviewResults,
        isReviewing,
        setReviewResults,
        setReviewing
    } = useLearningStore();

    const { activeFileId, files } = useFileStore();
    const { addNotification } = useUIStore();

    const activeFile = files.find(f => f.id === activeFileId);

    const handleReview = async () => {
        if (!activeFile) return;

        setReviewing(true);
        try {
            const data = await aiHubService.reviewCode(activeFile.content, activeFile.language);

            if (data.review) {
                setReviewResults(data.review);
                if (data.review.issues.length === 0) {
                    addNotification({ type: 'success', message: 'No issues found! Great job!' });
                } else {
                    addNotification({ type: 'success', message: `Found ${data.review.issues.length} issues.` });
                }
            }
        } catch (error) {
            console.error('Review failed:', error);
            addNotification({ type: 'error', message: 'Code review failed. Try again.' });
        } finally {
            setReviewing(false);
        }
    };

    if (!activeFile) {
        return (
            <div className="panel-empty-state">
                <FiAlertCircle size={48} />
                <p>No file selected</p>
            </div>
        );
    }

    return (
        <div className="review-panel" style={{ padding: '1rem', height: '100%', overflowY: 'auto' }}>
            <div className="review-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>AI Code Review</h3>
                <button
                    className="btn btn--primary"
                    onClick={handleReview}
                    disabled={isReviewing}
                >
                    {isReviewing ? (
                        <><span className="spinner" /> Analyzing...</>
                    ) : (
                        <><FiCpu /> Review Code</>
                    )}
                </button>
            </div>

            {reviewResults && (
                <div className="review-results">
                    {reviewResults.issues.length === 0 ? (
                        <div className="review-success" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            color: 'var(--success)'
                        }}>
                            <FiCheckCircle size={32} style={{ marginBottom: '0.5rem' }} />
                            <h4>No Issues Found!</h4>
                            <p style={{ color: 'var(--text-secondary)' }}>Your code looks clean and secure.</p>
                        </div>
                    ) : (
                        <div className="issues-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {reviewResults.issues.map((issue, index) => (
                                <div key={index} className={`issue-card issue-card--${issue.type}`} style={{
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-primary)',
                                    background: 'var(--bg-secondary)',
                                    borderLeft: `4px solid ${issue.type === 'error' ? 'var(--error)' :
                                            issue.type === 'warning' ? 'var(--warning)' : 'var(--info)'
                                        }`
                                }}>
                                    <div className="issue-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                                        {issue.type === 'error' && <FiAlertCircle style={{ color: 'var(--error)' }} />}
                                        {issue.type === 'warning' && <FiAlertCircle style={{ color: 'var(--warning)' }} />}
                                        {issue.type === 'info' && <FiInfo style={{ color: 'var(--info)' }} />}

                                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{issue.type}</span>
                                        {issue.line && (
                                            <span style={{
                                                fontSize: '0.8rem',
                                                padding: '2px 6px',
                                                background: 'var(--bg-tertiary)',
                                                borderRadius: '4px'
                                            }}>Line {issue.line}</span>
                                        )}
                                    </div>
                                    <p style={{ margin: '0 0 0.5rem 0' }}>{issue.message}</p>
                                    {issue.fix && (
                                        <div className="issue-fix" style={{
                                            background: 'var(--bg-primary)',
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.9rem',
                                            fontFamily: 'monospace',
                                            borderLeft: '2px solid var(--success)'
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Suggestion:</div>
                                            {issue.fix}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!reviewResults && !isReviewing && (
                <div className="review-placeholder" style={{
                    textAlign: 'center',
                    padding: '3rem 1rem',
                    color: 'var(--text-secondary)'
                }}>
                    <FiCpu size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Click "Review Code" to let AI analyze your code for bugs and improvements.</p>
                </div>
            )}
        </div>
    );
};

export default ReviewPanel;
