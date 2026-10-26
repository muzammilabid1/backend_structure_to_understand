import { $getListDepth, $isListItemNode, $isListNode } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { ElementNode, RangeSelection } from 'lexical';
import { $getSelection, $isElementNode, $isRangeSelection, COMMAND_PRIORITY_CRITICAL, INDENT_CONTENT_COMMAND } from 'lexical';
import { useEffect } from 'react';

function getElementNodesInSelection(selection: RangeSelection): Set<ElementNode> {
    const nodesInSelection = selection.getNodes();

    if (0 === nodesInSelection.length) {
        return new Set([selection.anchor.getNode().getParentOrThrow(), selection.focus.getNode().getParentOrThrow()]);
    }

    return new Set(nodesInSelection.map((n) => ($isElementNode(n) ? n : n.getParentOrThrow())));
}

function $shouldPreventIndent(maxDepth: number): boolean {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
        return false;
    }

    const elementNodesInSelection = Array.from(getElementNodesInSelection(selection));

    let totalDepth = 0;

    for (const elementNode of elementNodesInSelection) {
        if ($isListNode(elementNode)) {
            totalDepth = Math.max($getListDepth(elementNode) + 1, totalDepth);
        } else if ($isListItemNode(elementNode)) {
            const parent = elementNode.getParent();

            if (!$isListNode(parent)) {
                throw new Error('ListMaxIndentLevelPlugin: A ListItemNode must have a ListNode for a parent.');
            }

            totalDepth = Math.max($getListDepth(parent) + 1, totalDepth);
        }
    }

    return totalDepth > maxDepth;
}

export default function ListMaxIndentLevelPlugin({ maxDepth = 7 }: Props): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand(INDENT_CONTENT_COMMAND, () => $shouldPreventIndent(maxDepth), COMMAND_PRIORITY_CRITICAL);
    }, [editor, maxDepth]);

    return null;
}

interface Props {
    maxDepth?: number;
}
