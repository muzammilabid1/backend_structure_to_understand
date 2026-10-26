import { $generateNodesFromDOM } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $insertNodes, LexicalEditor } from 'lexical';
import { useEffect, useState } from 'react';

export default function InitialValuePlugin({ value }: Props) {
    const [initialValue, setInitialValue] = useState(null);
    const [editor] = useLexicalComposerContext();

    const updateHTML = (editor: LexicalEditor, value: string) => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(value, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);

        $getRoot().clear();

        $insertNodes(nodes);
    };

    useEffect(() => {
        if (null == value) {
            return;
        }

        if (null != initialValue) {
            return;
        }

        setInitialValue(value);
    }, [value]);

    useEffect(() => {
        if (editor && initialValue) {
            editor.update(() => {
                updateHTML(editor, initialValue);
            });
        }
    }, [initialValue]);

    return null;
}

interface Props {
    value?: string | null;
}
