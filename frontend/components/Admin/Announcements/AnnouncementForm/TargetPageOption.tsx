import { Box, Tooltip } from '@mui/material';
import { HTMLAttributes } from 'react';

interface TargetPageOptionProps {
    optionProps: HTMLAttributes<HTMLLIElement>;
    label: string;
    route: string;
}

/**
 * A page in the Pages picker: its name, and its route on the right for admins who know pages by URL.
 * A long route is cut short with an ellipsis, and hovering it shows the whole route.
 */
const TargetPageOption = ({ optionProps, label, route }: TargetPageOptionProps) => (
    <Box
        component="li"
        {...optionProps}
        data-test="add-page-announcement-target-page-option"
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
        <Box component="span" sx={{ flexShrink: 0 }}>
            {label}
        </Box>
        <Tooltip title={route} placement="top-end">
            <Box
                component="code"
                data-test="add-page-announcement-target-page-route"
                sx={{
                    minWidth: 0,
                    ml: 'auto',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#6F6B67',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                }}>
                {route}
            </Box>
        </Tooltip>
    </Box>
);

export default TargetPageOption;
