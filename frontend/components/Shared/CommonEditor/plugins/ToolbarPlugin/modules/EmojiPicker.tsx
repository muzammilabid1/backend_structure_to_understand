import { Box, ClickAwayListener, Popper } from '@mui/material';
import { PopperOwnProps } from '@mui/material/Popper/BasePopper.types';
import { makeStyles } from '@mui/styles';

const EMOJIS = [
    '😀',
    '😁',
    '😂',
    '😃',
    '😉',
    '😋',
    '😎',
    '😍',
    '😗',
    '🤗',
    '🤔',
    '😣',
    '😫',
    '😴',
    '😌',
    '🤓',
    '😛',
    '😜',
    '😠',
    '😇',
    '😷',
    '😈',
    '👻',
    '😺',
    '😸',
    '😹',
    '😻',
    '😼',
    '😽',
    '🙀',
    '🙈',
    '🙉',
    '🙊',
    '👼',
    '👮',
    '🕵',
    '💂',
    '👳',
    '🎅',
    '👸',
    '👰',
    '👲',
    '🙍',
    '🙇',
    '🚶',
    '🏃',
    '💃',
    '⛷',
    '🏂',
    '🏌',
    '🏄',
    '🚣',
    '🏊',
    '⛹',
    '🏋',
    '🚴',
    '👫',
    '💪',
    '👈',
    '👉',
    '👆',
    '🖕',
    '👇',
    '🖖',
    '🤘',
    '🖐',
    '👌',
    '👍',
    '👎',
    '✊',
    '👊',
    '👏',
    '🙌',
    '🙏',
    '🐵',
    '🐶',
    '🐇',
    '🐥',
    '🐸',
    '🐌',
    '🐛',
    '🐜',
    '🐝',
    '🍉',
    '🍄',
    '🍔',
    '🍤',
    '🍨',
    '🍪',
    '🎂',
    '🍰',
    '🍾',
    '🍷',
    '🍸',
    '🍺',
    '🌍',
    '🚑',
    '⏰',
    '🌙',
    '🌝',
    '🌞',
    '⭐',
    '🌟',
    '🌠',
    '🌨',
    '🌩',
    '⛄',
    '🔥',
    '🎄',
    '🎈',
    '🎉',
    '🎊',
    '🎁',
    '🎗',
    '🏀',
    '🏈',
    '🎲',
    '🔇',
    '🔈',
    '📣',
    '🔔',
    '🎵',
    '🎷',
    '💰',
    '🖊',
    '📅',
    '✅',
    '❎',
    '💯'
];

const useStyle = makeStyles({
    emojiButtonsWrapper: {
        overflowY: 'scroll',
        maxHeight: '150px'
    },
    emojiButtons: {
        display: 'grid',
        gridTemplateColumns: 'auto auto auto auto auto auto auto',
        gap: '4px',
        marginRight: '5px'
    },
    emojiButton: {
        border: 0,
        backgroundColor: 'transparent',
        fontSize: '1.2rem',
        padding: 0
    }
});

export default function EmojiPicker({ id, anchorEl, toggle, onSelect, closeOnSelect = false }: Props) {
    const classes = useStyle();

    return (
        <ClickAwayListener onClickAway={() => toggle()}>
            <Popper id={id} open={true} anchorEl={anchorEl} sx={{ zIndex: 2000 }}>
                <Box sx={{ border: 1, p: 1, bgcolor: 'background.paper' }}>
                    <div className={classes.emojiButtonsWrapper}>
                        <div className={classes.emojiButtons}>
                            {EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    className={classes.emojiButton}
                                    onClick={() => {
                                        onSelect(emoji);

                                        if (closeOnSelect) {
                                            toggle();
                                        }
                                    }}>
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </Box>
            </Popper>
        </ClickAwayListener>
    );
}

interface Props {
    id: string;
    anchorEl: PopperOwnProps['anchorEl'];
    toggle: () => void;
    onSelect: (color: string | null) => void;
    closeOnSelect?: boolean;
}
