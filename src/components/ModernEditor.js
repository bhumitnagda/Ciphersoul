import React, { useRef, useEffect, useState } from "react";
import {
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaHeading,
  FaListUl,
  FaListOl,
  FaQuoteRight,
  FaCode,
  FaLink,
  FaImage,
  FaTable,
  FaTasks,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaMinus,
  FaHighlighter,
  FaQuestion,
} from "react-icons/fa";

const ModernEditor = ({ content, setContent, isSplit }) => {
  const editorRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);

  const getSelectedText = () => {
    const textarea = editorRef.current;
    return content.substring(textarea.selectionStart, textarea.selectionEnd);
  };

  const insertText = (before, after = "", defaultText = "") => {
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = getSelectedText() || defaultText;

    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setContent(newContent);

    // Restore selection and focus
    setTimeout(() => {
      textarea.focus();
      const newCursorPos =
        start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(
        selectedText ? start + before.length : newCursorPos,
        selectedText ? end + before.length : newCursorPos
      );
    }, 0);
  };

  const insertHeading = (level) => {
    const prefix = "#".repeat(level) + " ";
    const selectedText = getSelectedText();
    if (selectedText) {
      // If text is selected, add heading at the start of the line
      const lines = selectedText.split("\n");
      const newText = lines.map((line) => prefix + line).join("\n");
      insertText("", "", newText);
    } else {
      insertText(prefix, "", "Heading");
    }
  };

  const insertList = (ordered) => {
    const selectedText = getSelectedText();
    if (selectedText) {
      const lines = selectedText.split("\n");
      const newText = lines
        .map((line, i) => (ordered ? `${i + 1}. ${line}` : `- ${line}`))
        .join("\n");
      insertText("\n", "\n", newText);
    } else {
      insertText(ordered ? "1. " : "- ", "", "List item");
    }
  };

  const insertTable = () => {
    const table = `
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`;
    insertText("\n", "\n", table.trim());
  };

  const formatCommands = {
    bold: () => insertText("**", "**", "bold text"),
    italic: () => insertText("_", "_", "italic text"),
    strike: () => insertText("~~", "~~", "strikethrough text"),
    code: () => {
      const selectedText = getSelectedText();
      if (selectedText?.includes("\n")) {
        insertText("\n```\n", "\n```\n", "code block");
      } else {
        insertText("`", "`", "inline code");
      }
    },
    link: () => {
      const selectedText = getSelectedText();
      insertText("[", "](url)", selectedText || "link text");
    },
    image: () => insertText("![", "](image-url)", "alt text"),
    quote: () => {
      const selectedText = getSelectedText();
      const lines = selectedText ? selectedText.split("\n") : ["quote text"];
      const newText = lines.map((line) => `> ${line}`).join("\n");
      insertText("\n", "\n", newText);
    },
    checklist: () => insertText("- [ ] ", "", "task item"),
    hr: () => insertText("\n---\n", "", ""),
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            formatCommands.bold();
            break;
          case "i":
            e.preventDefault();
            formatCommands.italic();
            break;
          case "k":
            e.preventDefault();
            formatCommands.link();
            break;
          // Add more shortcuts as needed
          default:
            break;
        }
      }
    };

    const editor = editorRef.current;
    editor?.addEventListener("keydown", handleKeyDown);
    return () => editor?.removeEventListener("keydown", handleKeyDown);
  }, [content]);

  // Handle file paste
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        try {
          const file = item.getAsFile();
          console.log("Image paste detected:", file.name);
          // Future implementation for image handling
        } catch (err) {
          console.error("Failed to handle pasted image:", err);
        }
      }
    }
  };

  return (
    <div className="modern-editor">
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button onClick={() => insertHeading(1)} title="Heading 1 (H1)">
            <FaHeading />
            <span className="toolbar-label">1</span>
          </button>
          <button onClick={() => insertHeading(2)} title="Heading 2 (H2)">
            <FaHeading />
            <span className="toolbar-label">2</span>
          </button>
          <button onClick={() => insertHeading(3)} title="Heading 3 (H3)">
            <FaHeading />
            <span className="toolbar-label">3</span>
          </button>
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <button onClick={formatCommands.bold} title="Bold (Ctrl+B)">
            <FaBold />
          </button>
          <button onClick={formatCommands.italic} title="Italic (Ctrl+I)">
            <FaItalic />
          </button>
          <button onClick={formatCommands.strike} title="Strikethrough">
            <FaStrikethrough />
          </button>
          <button onClick={formatCommands.code} title="Code">
            <FaCode />
          </button>
          <button onClick={formatCommands.quote} title="Quote">
            <FaQuoteRight />
          </button>
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <button onClick={() => insertList(false)} title="Bullet List">
            <FaListUl />
          </button>
          <button onClick={() => insertList(true)} title="Numbered List">
            <FaListOl />
          </button>
          <button onClick={formatCommands.checklist} title="Task List">
            <FaTasks />
          </button>
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <button onClick={formatCommands.link} title="Link (Ctrl+K)">
            <FaLink />
          </button>
          <button onClick={formatCommands.image} title="Image">
            <FaImage />
          </button>
          <button onClick={insertTable} title="Table">
            <FaTable />
          </button>
          <button onClick={formatCommands.hr} title="Horizontal Rule">
            <FaMinus />
          </button>
        </div>
      </div>

      {/* Help Button & Tooltip */}
      <button
        className="help-button"
        onClick={() => setShowHelp(!showHelp)}
        title="Show Editor Help"
      >
        <FaQuestion />
      </button>

      <div className={`editor-help-tooltip ${showHelp ? "visible" : ""}`}>
        <h4>Editor Shortcuts & Tips</h4>
        <ul>
          <li>
            <strong>Ctrl+B</strong> - Bold text
          </li>
          <li>
            <strong>Ctrl+I</strong> - Italic text
          </li>
          <li>
            <strong>Ctrl+K</strong> - Insert link
          </li>
          <li>Select text before formatting for quick styling</li>
          <li>Drag files into editor to upload</li>
          <li>Use toolbar for quick formatting</li>
          <li>Split view shows live preview</li>
        </ul>
      </div>

      <textarea
        ref={editorRef}
        className="editor-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handlePaste}
        placeholder="Start writing... Use Markdown for formatting"
        spellCheck="true"
      />
    </div>
  );
};

export default ModernEditor;
