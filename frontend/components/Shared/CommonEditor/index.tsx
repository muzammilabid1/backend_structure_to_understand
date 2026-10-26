import { $generateHtmlFromNodes } from '@lexical/html';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import CodeMirror from '@uiw/react-codemirror';
import React, { FocusEvent, useEffect, useId, useState } from 'react';

import config from './config';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import InitialValuePlugin from './plugins/InitialValuePlugin';
import ListMaxIndentLevelPlugin from './plugins/ListMaxIndentLevelPlugin';
import OnBlurPlugin from './plugins/OnBlurPlugin';
import ToolbarPlugin from './plugins/ToolbarPlugin';

export default function CommonEditor({ id, value, onChange, onBlur, editAsHtml = false }: Props) {
    const randomId = useId();
    const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
    const [isLinkEditMode, setIsLinkEditMode] = useState(false);
    // State for CodeMirror so it doesn't re-render on each change. Doesn't work well with props changes
    const [codeMirrorInitialValue, setCodeMirrorInitialValue] = useState<string>('');

    useEffect(() => {
        setCodeMirrorInitialValue(value ?? '');
    }, [editAsHtml]);

    const onRef = (_floatingAnchorElem: HTMLDivElement) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem);
        }
    };

    if (editAsHtml) {
        return (
            <CodeMirror
                placeholder="Layout code in HTML"
                onChange={(value) => onChange(value)}
                value={codeMirrorInitialValue}
                width="100%"
                className="resizable-editor"
                onBlur={onBlur}
            />
        );
    }

    return (
        <LexicalComposer key={id ?? randomId} initialConfig={config}>
            <div className="editor-container">
                <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
                <InitialValuePlugin value={value} />
                <div className="editor-inner">
                    <RichTextPlugin
                        contentEditable={
                            <div ref={onRef}>
                                <ContentEditable className="editor-input" />
                            </div>
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                    <OnChangePlugin
                        ignoreSelectionChange
                        onChange={(editorState, editor) => editorState.read(() => onChange($generateHtmlFromNodes(editor)))}
                    />
                    <OnBlurPlugin onBlur={onBlur} />
                    <HistoryPlugin />
                    <AutoFocusPlugin />
                    <ListPlugin />
                    <ListMaxIndentLevelPlugin maxDepth={7} />
                    <TabIndentationPlugin />
                    <LinkPlugin />
                    {floatingAnchorElem && (
                        <FloatingLinkEditorPlugin
                            anchorElem={floatingAnchorElem}
                            isLinkEditMode={isLinkEditMode}
                            setIsLinkEditMode={setIsLinkEditMode}
                        />
                    )}
                </div>
            </div>
        </LexicalComposer>
    );
}

interface Props {
    id?: string;
    value?: string;
    onChange?: (newValue: string) => void;
    onBlur?: (e?: FocusEvent) => void;
    editAsHtml?: boolean;
}
