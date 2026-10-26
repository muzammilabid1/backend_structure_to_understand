import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useScrollTrigger } from '@mui/material';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Fade from '@mui/material/Fade';
import { useEffect, useState } from 'react';

interface Props {
    querySelector?: string;
}

export default function BackToTop({ querySelector }: Props) {
    const [targetedElement, setTargetedElement] = useState(null);

    useEffect(() => {
        if (querySelector) {
            setTargetedElement(document.querySelector(querySelector));
        }
    }, [querySelector]);

    const trigger = useScrollTrigger({
        target: targetedElement ?? undefined,
        disableHysteresis: true,
        threshold: 100
    });

    const handleClick = () => {
        if (targetedElement) {
            targetedElement.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

            return;
        }

        window?.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <Fade in={trigger}>
            <Box
                onClick={handleClick}
                role="presentation"
                sx={{
                    position: 'fixed',
                    bottom: 32,
                    right: 32
                }}>
                <Fab size="small" aria-label="scroll back to top">
                    <KeyboardArrowUpIcon />
                </Fab>
            </Box>
        </Fade>
    );
}
