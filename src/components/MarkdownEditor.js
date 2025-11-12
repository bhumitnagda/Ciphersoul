// frontend/src/components/MarkdownEditor.js (FINAL CODE)
import React from 'react';

// This component is now a clean wrapper for the textarea
const MarkdownEditor = ({ content, setContent, isSplit, isSingle }) => {

    const inputStyles = {
        flex: 1, 
        backgroundColor: 'var(--color-background)', 
        color: 'var(--color-text)',
        resize: 'none',
        fontFamily: 'Inter, monospace',
        fontSize: '15px',
        borderRadius: '0', 
        border: 'none',
        height: '100% !important',
        minHeight: '100% !important',
        padding: isSplit ? '0 20px' : '0 40px', // Adjust padding based on mode
        boxSizing: 'border-box',
    };
    
    // The wrapper controls whether it acts as a single pane or a split pane
    const wrapperClassName = isSplit ? "markdown-split-view" : "markdown-single-view";

    return (
        <div className={wrapperClassName} style={{ display: 'flex', flexGrow: 1 }}>
            {/* Input Pane */}
            <textarea
                style={inputStyles}
                placeholder="Start writing your secure note here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
            />
            {/* The live preview panel is now rendered directly in Dashboard.js */}
        </div>
    );
};

export default MarkdownEditor;