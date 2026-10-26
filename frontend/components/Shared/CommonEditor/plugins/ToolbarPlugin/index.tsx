import { $createCodeNode } from '@lexical/code';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListNode } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createHeadingNode, $createQuoteNode, $isHeadingNode } from '@lexical/rich-text';
import { $getSelectionStyleValueForProperty, $patchStyleText, $setBlocksType } from '@lexical/selection';
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import {
    DataObject,
    FormatAlignCenter,
    FormatAlignJustify,
    FormatAlignLeft,
    FormatAlignRight,
    FormatBold,
    FormatColorFillTwoTone,
    FormatColorTextTwoTone,
    FormatIndentDecrease,
    FormatIndentIncrease,
    FormatItalic,
    FormatListBulleted,
    FormatListNumbered,
    FormatStrikethrough,
    FormatUnderlined,
    Link,
    Redo,
    SentimentSatisfiedAlt,
    Subscript,
    Superscript,
    Undo
} from '@mui/icons-material';
import { PopperOwnProps } from '@mui/material/Popper/BasePopper.types';
import { makeStyles } from '@mui/styles';
import {
    $createParagraphNode,
    $createTextNode,
    $getSelection,
    $isElementNode,
    $isRangeSelection,
    $isRootOrShadowRoot,
    CAN_REDO_COMMAND,
    CAN_UNDO_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    ElementFormatType,
    FORMAT_ELEMENT_COMMAND,
    FORMAT_TEXT_COMMAND,
    INDENT_CONTENT_COMMAND,
    LexicalNode,
    OUTDENT_CONTENT_COMMAND,
    REDO_COMMAND,
    SELECTION_CHANGE_COMMAND,
    UNDO_COMMAND
} from 'lexical';
import React, { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';

import { getSelectedNode, sanitizeUrl } from '../../utils';
import ColorPicker from './modules/ColorPicker';
import EmojiPicker from './modules/EmojiPicker';
import ToolbarButton from './modules/ToolbarButton';
import ToolbarSelect from './modules/ToolbarSelect';

const BLOCK_TYPE_OPTIONS = [
    { label: 'Normal', value: 'paragraph' },
    { label: 'H1', value: 'h1' },
    { label: 'H2', value: 'h2' },
    { label: 'H3', value: 'h3' },
    { label: 'H4', value: 'h4' },
    { label: 'H5', value: 'h5' },
    { label: 'H6', value: 'h6' },
    { label: 'Blockquote', value: 'quote' },
    { label: 'Code', value: 'code' }
];

const FONT_SIZE_OPTIONS = [
    { label: '8', value: '8px' },
    { label: '9', value: '9px' },
    { label: '10', value: '10px' },
    { label: '11', value: '11px' },
    { label: '12', value: '12px' },
    { label: '14', value: '14px' },
    { label: '16', value: '16px' },
    { label: '18', value: '18px' },
    { label: '24', value: '24px' },
    { label: '30', value: '30px' },
    { label: '36', value: '36px' },
    { label: '48', value: '48px' },
    { label: '60', value: '60px' },
    { label: '72', value: '72px' },
    { label: '96', value: '96px' }
];

const FONT_FAMILY_OPTIONS = [
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Chaloops-Medium', value: 'Chaloops-Medium' },
    { label: 'Chaloops-Light', value: 'Chaloops-Light' },
    { label: 'SassoonInfantTkB-Regular', value: 'SassoonInfantTkB-Regular' },
    { label: 'SassoonInfantRg-Regular', value: 'SassoonInfantRg-Regular' },
    { label: 'SassoonInfantTk-Regular2', value: 'SassoonInfantTk-Regular2' }
];

const COLOR_TEXT_PICKER_ID = 'color_text_picker';
const COLOR_FILL_PICKER_ID = 'color_fill_picker';
const EMOJI_PICKER_ID = 'emoji_picker';

const DEFAULT_COLOR = '#000000';
const DEFAULT_BACKGROUND_COLOR = '#FFFFFF';

const useStyles = makeStyles(() => ({
    buttonsWrapper: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px'
    }
}));

export default function ToolbarPlugin({ setIsLinkEditMode }: Props) {
    const [editor] = useLexicalComposerContext();
    const [activeEditor, setActiveEditor] = useState(editor);
    const [colorPickerData, setColorPickerData] = useState<{
        id: string;
        anchorEl: PopperOwnProps['anchorEl'];
    } | null>(null);
    const [emojiPickerData, setEmojiPickerData] = useState<{
        id: string;
        anchorEl: PopperOwnProps['anchorEl'];
    } | null>(null);

    const [enabledFormats, setEnabledFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        code: false,
        superscript: false,
        subscript: false
    });
    const [fontProperties, setFontProperties] = useState({
        family: 'Verdana',
        size: '16px',
        color: DEFAULT_COLOR,
        backgroundColor: DEFAULT_BACKGROUND_COLOR
    });
    const [elementFormat, setElementFormat] = useState<ElementFormatType>('left');
    const [isLink, setIsLink] = useState(false);
    const [blockType, setBlockType] = useState('paragraph');
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const classes = useStyles();

    function formatParagraph() {
        activeEditor.update(() => {
            const selection = $getSelection();

            if (!$isRangeSelection(selection)) {
                return;
            }

            $setBlocksType(selection, () => $createParagraphNode());
        });
    }

    const $updateToolbar = useCallback(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
            // Update text format
            setEnabledFormats({
                bold: selection.hasFormat('bold'),
                italic: selection.hasFormat('italic'),
                underline: selection.hasFormat('underline'),
                strikethrough: selection.hasFormat('strikethrough'),
                code: selection.hasFormat('code'),
                superscript: selection.hasFormat('superscript'),
                subscript: selection.hasFormat('subscript')
            });

            // Update links
            const node = getSelectedNode(selection);
            const parent = node.getParent();

            setIsLink($isLinkNode(parent) || $isLinkNode(node));

            // Update font properties
            setFontProperties({
                family: $getSelectionStyleValueForProperty(selection, 'font-family', 'Verdana'),
                size: $getSelectionStyleValueForProperty(selection, 'font-size', '16px'),
                color: $getSelectionStyleValueForProperty(selection, 'color', DEFAULT_COLOR),
                backgroundColor: $getSelectionStyleValueForProperty(selection, 'background-color', DEFAULT_BACKGROUND_COLOR)
            });

            // Update block type
            const anchorNode = selection.anchor.getNode();
            let element =
                anchorNode.getKey() === 'root'
                    ? anchorNode
                    : $findMatchingParent(anchorNode, (e) => {
                          const parent = e.getParent();

                          return parent !== null && $isRootOrShadowRoot(parent);
                      });

            if (element === null) {
                element = anchorNode.getTopLevelElementOrThrow();
            }

            const elementKey = element.getKey();
            const elementDOM = activeEditor.getElementByKey(elementKey);

            if (null !== elementDOM) {
                if ($isListNode(element)) {
                    const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
                    const type = parentList ? parentList.getListType() : element.getListType();

                    setBlockType(type);
                } else {
                    const type = $isHeadingNode(element) ? element.getTag() : element.getType();

                    setBlockType(type);
                }
            }

            // Element format (left, center, right, justify)
            let matchingParent: LexicalNode;

            if ($isLinkNode(parent)) {
                matchingParent = $findMatchingParent(node, (parentNode) => $isElementNode(parentNode) && !parentNode.isInline());
            }

            setElementFormat(
                $isElementNode(matchingParent)
                    ? matchingParent.getFormatType()
                    : $isElementNode(node)
                      ? node.getFormatType()
                      : parent?.getFormatType() || 'left'
            );
        }
    }, []);

    const applyStyleText = useCallback(
        (styles: Record<string, string>, skipHistoryStack?: boolean) => {
            activeEditor.update(
                () => {
                    const selection = $getSelection();

                    if (selection !== null) {
                        $patchStyleText(selection, styles);
                    }
                },
                skipHistoryStack ? { tag: 'historic' } : {}
            );
        },
        [activeEditor]
    );

    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            (_payload, newEditor) => {
                setActiveEditor(newEditor);
                $updateToolbar();

                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
    }, [editor, $updateToolbar]);

    useEffect(() => {
        activeEditor.getEditorState().read(() => $updateToolbar());
    }, [activeEditor, $updateToolbar]);

    useEffect(() => {
        return mergeRegister(
            activeEditor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => $updateToolbar());
            }),
            activeEditor.registerCommand(
                CAN_UNDO_COMMAND,
                (payload) => {
                    setCanUndo(payload);

                    return false;
                },
                COMMAND_PRIORITY_CRITICAL
            ),
            activeEditor.registerCommand(
                CAN_REDO_COMMAND,
                (payload) => {
                    setCanRedo(payload);

                    return false;
                },
                COMMAND_PRIORITY_CRITICAL
            )
        );
    }, [$updateToolbar, activeEditor, editor]);

    return (
        <>
            {null != colorPickerData && (
                <ColorPicker
                    id={colorPickerData.id}
                    anchorEl={colorPickerData.anchorEl}
                    toggle={() => setColorPickerData(null)}
                    onSelect={(color) => {
                        switch (colorPickerData.id) {
                            case COLOR_TEXT_PICKER_ID:
                                applyStyleText({ color: color });
                                break;

                            case COLOR_FILL_PICKER_ID:
                                applyStyleText({ 'background-color': color });
                                break;
                        }
                    }}
                    closeOnSelect
                />
            )}
            {null != emojiPickerData && (
                <EmojiPicker
                    id={emojiPickerData.id}
                    anchorEl={emojiPickerData.anchorEl}
                    toggle={() => setEmojiPickerData(null)}
                    onSelect={(emoji) => {
                        editor.update(() => {
                            const selection = $getSelection();

                            selection.insertNodes([$createTextNode(emoji)]);
                        });
                    }}
                    closeOnSelect
                />
            )}

            <div className={'toolbar'}>
                <div className={classes.buttonsWrapper}>
                    <ToolbarButton active={enabledFormats.bold} onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}>
                        <FormatBold />
                    </ToolbarButton>
                    <ToolbarButton
                        active={enabledFormats.italic}
                        onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}>
                        <FormatItalic />
                    </ToolbarButton>
                    <ToolbarButton
                        active={enabledFormats.underline}
                        onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}>
                        <FormatUnderlined />
                    </ToolbarButton>
                    <ToolbarButton
                        active={enabledFormats.strikethrough}
                        onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}>
                        <FormatStrikethrough />
                    </ToolbarButton>
                    <ToolbarButton active={enabledFormats.code} onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}>
                        <DataObject />
                    </ToolbarButton>
                    <ToolbarButton
                        active={enabledFormats.superscript}
                        onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')}>
                        <Superscript />
                    </ToolbarButton>
                    <ToolbarButton
                        active={enabledFormats.subscript}
                        onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')}>
                        <Subscript />
                    </ToolbarButton>
                    <ToolbarSelect
                        options={BLOCK_TYPE_OPTIONS}
                        value={BLOCK_TYPE_OPTIONS.find((option) => blockType === option.value) ?? null}
                        onChange={({ value }) => {
                            switch (value) {
                                case 'paragraph':
                                    formatParagraph();
                                    break;

                                case 'h1':

                                case 'h2':

                                case 'h3':

                                case 'h4':

                                case 'h5':

                                case 'h6':
                                    if (value !== blockType) {
                                        activeEditor.update(() => {
                                            const selection = $getSelection();

                                            $setBlocksType(selection, () => $createHeadingNode(value));
                                        });
                                    }

                                    break;

                                case 'quote':
                                    if ('quote' !== blockType) {
                                        activeEditor.update(() => {
                                            const selection = $getSelection();

                                            $setBlocksType(selection, () => $createQuoteNode());
                                        });
                                    }

                                    break;

                                case 'code':
                                    activeEditor.update(() => {
                                        const selection = $getSelection();

                                        if (selection.isCollapsed()) {
                                            $setBlocksType(selection, () => $createCodeNode());
                                        } else {
                                            const textContent = selection.getTextContent();
                                            const codeNode = $createCodeNode();

                                            selection.insertNodes([codeNode]);

                                            const updatedSelection = $getSelection();

                                            if (!$isRangeSelection(updatedSelection)) {
                                                return;
                                            }

                                            updatedSelection.insertRawText(textContent);
                                        }
                                    });
                                    break;
                            }

                            activeEditor.update(() => {
                                const selection = $getSelection();

                                if (null === selection) {
                                    return;
                                }
                            });
                        }}
                    />
                    <ToolbarSelect
                        options={FONT_SIZE_OPTIONS}
                        value={FONT_SIZE_OPTIONS.find((option) => fontProperties.size === option.value) ?? null}
                        onChange={(option) => {
                            activeEditor.update(() => {
                                const selection = $getSelection();

                                if (null !== selection) {
                                    $patchStyleText(selection, {
                                        'font-size': option.value
                                    });
                                }
                            });
                        }}
                    />
                    <ToolbarSelect
                        options={FONT_FAMILY_OPTIONS}
                        value={FONT_FAMILY_OPTIONS.find((option) => fontProperties.size === option.value) ?? null}
                        onChange={(option) => {
                            activeEditor.update(() => {
                                const selection = $getSelection();

                                if (null !== selection) {
                                    $patchStyleText(selection, {
                                        'font-family': option.value
                                    });
                                }
                            });
                        }}
                    />
                    <ToolbarButton
                        active={'bullet' === blockType}
                        onClick={() => {
                            if ('bullet' !== blockType) {
                                editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
                            } else {
                                formatParagraph();
                            }
                        }}>
                        <FormatListBulleted />
                    </ToolbarButton>
                    <ToolbarButton
                        active={'number' === blockType}
                        onClick={() => {
                            if ('number' !== blockType) {
                                activeEditor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
                            } else {
                                formatParagraph();
                            }
                        }}>
                        <FormatListNumbered />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}>
                        <FormatIndentIncrease />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}>
                        <FormatIndentDecrease />
                    </ToolbarButton>
                    <ToolbarButton active={'left' === elementFormat} onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}>
                        <FormatAlignLeft />
                    </ToolbarButton>
                    <ToolbarButton
                        active={'center' === elementFormat}
                        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}>
                        <FormatAlignCenter />
                    </ToolbarButton>
                    <ToolbarButton
                        active={'right' === elementFormat}
                        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}>
                        <FormatAlignRight />
                    </ToolbarButton>
                    <ToolbarButton
                        active={'justify' === elementFormat}
                        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')}>
                        <FormatAlignJustify />
                    </ToolbarButton>
                    <ToolbarButton
                        active={DEFAULT_COLOR !== fontProperties.color}
                        aria-describedby={COLOR_TEXT_PICKER_ID}
                        onClick={(event) =>
                            setColorPickerData({
                                id: COLOR_TEXT_PICKER_ID,
                                anchorEl: event.currentTarget
                            })
                        }>
                        <FormatColorTextTwoTone style={{ color: fontProperties.color }} />
                    </ToolbarButton>
                    <ToolbarButton
                        active={DEFAULT_BACKGROUND_COLOR !== fontProperties.backgroundColor}
                        aria-describedby={COLOR_FILL_PICKER_ID}
                        onClick={(event) =>
                            setColorPickerData({
                                id: COLOR_FILL_PICKER_ID,
                                anchorEl: event.currentTarget
                            })
                        }>
                        <FormatColorFillTwoTone
                            style={{
                                color:
                                    DEFAULT_BACKGROUND_COLOR !== fontProperties.backgroundColor ? fontProperties.backgroundColor : '#000000'
                            }}
                        />
                    </ToolbarButton>
                    <ToolbarButton
                        active={isLink}
                        onClick={() => {
                            if (!isLink) {
                                setIsLinkEditMode(true);
                                activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl('https://'));
                            } else {
                                setIsLinkEditMode(false);
                                activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
                            }
                        }}>
                        <Link />
                    </ToolbarButton>
                    <ToolbarButton
                        aria-describedby={EMOJI_PICKER_ID}
                        onClick={(event) =>
                            setEmojiPickerData({
                                id: EMOJI_PICKER_ID,
                                anchorEl: event.currentTarget
                            })
                        }>
                        <SentimentSatisfiedAlt />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => activeEditor.dispatchCommand(UNDO_COMMAND, undefined)} disabled={!canUndo}>
                        <Undo />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => activeEditor.dispatchCommand(REDO_COMMAND, undefined)} disabled={!canRedo}>
                        <Redo />
                    </ToolbarButton>
                </div>
            </div>
        </>
    );
}

interface Props {
    setIsLinkEditMode: Dispatch<SetStateAction<boolean>>;
}
