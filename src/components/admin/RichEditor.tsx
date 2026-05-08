import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import {
  Bold, Italic, Heading2, Heading3,
  List, ListOrdered, Quote, Undo, Redo, Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-sm transition',
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function RichEditor({ value, onChange, placeholder, className, minHeight = '200px' }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Escreva aqui...',
      }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
  })

  // Sync external value changes (e.g. when post loads)
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() === value) return
    editor.commands.setContent(value || '', false)
  }, [value])

  if (!editor) return null

  const tools = [
    {
      icon: <Bold className="h-3.5 w-3.5" />,
      title: 'Negrito (Ctrl+B)',
      active: editor.isActive('bold'),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      icon: <Italic className="h-3.5 w-3.5" />,
      title: 'Itálico (Ctrl+I)',
      active: editor.isActive('italic'),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    { separator: true },
    {
      icon: <Heading2 className="h-3.5 w-3.5" />,
      title: 'Título H2',
      active: editor.isActive('heading', { level: 2 }),
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: <Heading3 className="h-3.5 w-3.5" />,
      title: 'Título H3',
      active: editor.isActive('heading', { level: 3 }),
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    { separator: true },
    {
      icon: <List className="h-3.5 w-3.5" />,
      title: 'Lista com marcadores',
      active: editor.isActive('bulletList'),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: <ListOrdered className="h-3.5 w-3.5" />,
      title: 'Lista numerada',
      active: editor.isActive('orderedList'),
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: <Quote className="h-3.5 w-3.5" />,
      title: 'Citação',
      active: editor.isActive('blockquote'),
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: <Minus className="h-3.5 w-3.5" />,
      title: 'Separador',
      active: false,
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    { separator: true },
    {
      icon: <Undo className="h-3.5 w-3.5" />,
      title: 'Desfazer (Ctrl+Z)',
      active: false,
      action: () => editor.chain().focus().undo().run(),
    },
    {
      icon: <Redo className="h-3.5 w-3.5" />,
      title: 'Refazer (Ctrl+Y)',
      active: false,
      action: () => editor.chain().focus().redo().run(),
    },
  ]

  return (
    <div className={cn('rounded-md border border-input bg-background', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        {tools.map((tool, i) =>
          'separator' in tool ? (
            <div key={i} className="mx-1 h-4 w-px bg-border" />
          ) : (
            <ToolbarButton
              key={i}
              onClick={tool.action}
              active={tool.active}
              title={tool.title}
            >
              {tool.icon}
            </ToolbarButton>
          ),
        )}
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="px-3 py-3 text-sm leading-relaxed [&_.ProseMirror]:min-h-[var(--min-h)] [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:mb-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:mb-3 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-primary [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_hr]:my-4 [&_.ProseMirror_hr]:border-border [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/50 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0'
        style={{ '--min-h': minHeight } as React.CSSProperties}
      />
    </div>
  )
}
