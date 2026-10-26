import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { BLUR_COMMAND, COMMAND_PRIORITY_EDITOR } from 'lexical';
import { FocusEvent, useEffect } from 'react';

export default function OnBlurPlugin({ onBlur }: Props) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (null == onBlur) {
            return;
        }

        editor.registerCommand(
            BLUR_COMMAND,
            () => {
                onBlur();

                return true;
            },
            COMMAND_PRIORITY_EDITOR
        );
    }, []);

    return null;
}

interface Props {
    onBlur?: (e?: FocusEvent) => void;
}
