"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { useState, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Type,
} from "lucide-react";

interface RichTextEditorProps {
  value?: string;
  onChange: (html: string) => void;
  maxCharacters?: number;
  disabled?: boolean;
  placeholder?: string;
}

export default function RichTextEditor({
  value = "",
  onChange,
  maxCharacters = 1000,
  disabled = false,
  placeholder = "Start typing...",
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800",
        },
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[150px] p-4 border border-gray-300 rounded-lg",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const getCharacterCount = () => {
    if (!editor) return 0;
    // Count plain text characters (excluding HTML tags)
    const text = editor.getText();
    return text.length;
  };

  const getCharacterCountStatus = () => {
    const count = getCharacterCount();
    const percentage = (count / maxCharacters) * 100;
    
    if (percentage >= 100) return "text-red-600 font-bold";
    if (percentage >= 80) return "text-yellow-600 font-semibold";
    return "text-gray-500";
  };

  const setLink = () => {
    if (linkUrl) {
      editor?.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkDialog(false);
    }
  };

  const unsetLink = () => {
    editor?.chain().focus().unsetLink().run();
  };

  const isActive = (name: string) => {
    if (!editor) return false;
    return editor.isActive(name);
  };

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-lg p-4 min-h-[150px] bg-gray-50 animate-pulse" />
    );
  }

  return (
    <div className={`w-full ${disabled ? "opacity-60" : ""}`}>
      {/* Toolbar */}
      {!disabled && (
        <div className="border border-gray-300 border-b-0 rounded-t-lg bg-gray-50 p-2 flex flex-wrap gap-1">
          {/* Text Formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              isActive("bold") ? "bg-gray-200 text-gray-900" : "text-gray-700"
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              isActive("italic") ? "bg-gray-200 text-gray-900" : "text-gray-700"
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              isActive("underline") ? "bg-gray-200 text-gray-900" : "text-gray-700"
            }`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Headings */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              isActive("heading", { level: 2 }) ? "bg-gray-200 text-gray-900" : "text-gray-700"
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              isActive("heading", { level: 3 }) ? "bg-gray-200 text-gray-900" : "text-gray-700"
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              isActive("paragraph") ? "bg-gray-200 text-gray-900" : "text-gray-700"
            }`}
            title="Paragraph"
          >
            <Type className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              isActive("bulletList") ? "bg-gray-200 text-gray-900" : "text-gray-700"
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              isActive("orderedList") ? "bg-gray-200 text-gray-900" : "text-gray-700"
            }`}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Link */}
          {isActive("link") ? (
            <button
              onClick={unsetLink}
              className="p-2 rounded hover:bg-gray-200 transition-colors bg-blue-100 text-blue-700"
              title="Remove Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowLinkDialog(true)}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-700"
              title="Add Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="border border-gray-300 rounded-b-lg">
        <EditorContent 
          editor={editor} 
          placeholder={placeholder}
        />
      </div>

      {/* Character Count */}
      <div className="mt-2 text-sm flex justify-between items-center">
        <span className={getCharacterCountStatus()}>
          {getCharacterCount()} / {maxCharacters} characters
        </span>
        {getCharacterCount() >= maxCharacters && (
          <span className="text-red-600 text-xs">
            Character limit reached
          </span>
        )}
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add Link</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full p-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setLink();
                } else if (e.key === "Escape") {
                  setShowLinkDialog(false);
                  setLinkUrl("");
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={setLink}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
