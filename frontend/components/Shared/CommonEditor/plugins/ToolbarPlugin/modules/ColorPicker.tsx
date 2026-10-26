import { Box, ClickAwayListener, Popper } from '@mui/material';
import { PopperOwnProps } from '@mui/material/Popper/BasePopper.types';
import { makeStyles } from '@mui/styles';

const COLORS = [
    '#15CD6A',
    '#00C79D',
    '#3DA8D5',
    '#2771CD',
    '#A13DBB',

    '#494D79',
    '#CCCCCC',
    '#00B75C',
    '#00B386',
    '#2987BC',

    '#2D55B4',
    '#610084',
    '#2A2A4F',
    '#000000',
    '#F6E753',

    '#FFA400',
    '#FB5C4B',
    '#F33531',
    '#A68F83',
    '#EFEFEF',

    '#FFFFFF',
    '#FDD100',
    '#FF730E',
    '#E12C35',
    '#C70021',

    '#7E706A',
    '#D0D5D8'
];

const useStyle = makeStyles({
    colorButtonsWrapper: {
        display: 'grid',
        gridTemplateColumns: 'auto auto auto auto auto',
        gap: '4px'
    },
    colorButton: {
        width: '25px',
        height: '25px',
        border: '1px solid',
        borderColor: '#e8e8e8'
    }
});

export default function ColorPicker({ id, anchorEl, toggle, onSelect, closeOnSelect }: Props) {
    const classes = useStyle();

    return (
        <ClickAwayListener onClickAway={() => toggle()}>
            <Popper id={id} open={true} anchorEl={anchorEl} sx={{ zIndex: 2000 }}>
                <Box sx={{ border: 1, p: 1, bgcolor: 'background.paper' }}>
                    <div className={classes.colorButtonsWrapper}>
                        {COLORS.map((color) => (
                            <button
                                key={color}
                                className={classes.colorButton}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                    onSelect(color);

                                    if (closeOnSelect) {
                                        toggle();
                                    }
                                }}
                            />
                        ))}
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
