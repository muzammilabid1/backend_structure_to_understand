import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Collapse, Grid } from '@mui/material';
import React, { useState } from 'react';

import { ILwpSticker } from '../../../types/entities/ILwpSticker';
import Heading1 from '../Typography/Heading1';
import ActiveInActiveStickers from './ActiveInActiveStickers';

interface SectionTypes {
    name: string;
    label: string;
    isOpen: boolean;
    data: ILwpSticker[];
}

interface StickerListProps {
    activeStickers: ILwpSticker[];
    inActiveSticker: ILwpSticker[];
}

const StickerList = ({ activeStickers, inActiveSticker }: StickerListProps) => {
    const [open, setOpen] = useState<{ active: boolean; inactive: boolean }>({ active: true, inactive: true });

    const toggleSection = (section: string): void => {
        setOpen((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const sections: SectionTypes[] = [
        {
            name: 'active',
            label: 'Active',
            data: activeStickers,
            isOpen: open.active
        },
        {
            name: 'inactive',
            label: 'Deactivated',
            data: inActiveSticker,
            isOpen: open.inactive
        }
    ];

    return (
        <div>
            {sections.map((section: SectionTypes, ind: number) => (
                <div key={ind}>
                    <Grid container alignItems={'center'} gap={1} onClick={() => toggleSection(section.name)} className="cp">
                        <ExpandMoreIcon sx={{ rotate: section.isOpen ? '' : '180deg', fontSize: 30 }} />
                        <Heading1 text={section.label} customClass="fs20" />
                    </Grid>
                    <Collapse in={section.isOpen}>
                        <br />
                        <ActiveInActiveStickers data={section.data} type={section.label.toLowerCase()} />
                    </Collapse>
                    <br />
                </div>
            ))}
        </div>
    );
};

export default StickerList;
