import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import React from 'react';

import { getHtml } from '../../../shared/Services/handler';
import RenderHtml from '../CommonRenderHtml';
import Paragraph from '../Typography/Paragraph';

const CommonAccordionForActivity = ({ accordionData, pupilData }) => {
    return accordionData?.map((item, i) => {
        const renderEditor = pupilData ? getHtml(item?.description?.editorState, pupilData) : getHtml(item?.description?.editorState);

        return (
            <Accordion defaultExpanded={i === 0} className={'bg_trnsparent'}>
                <AccordionSummary expandIcon={<ExpandMore className="expand-icon" />}>
                    <Paragraph>{item?.heading}</Paragraph>
                </AccordionSummary>

                <AccordionDetails className="secondary-accordion-details">
                    <div key={i} className="editor-step" style={{ pointerEvents: 'auto' }}>
                        <RenderHtml text={renderEditor} />
                    </div>
                </AccordionDetails>
            </Accordion>
        );
    });
};

export default CommonAccordionForActivity;
