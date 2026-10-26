import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { GridExpandMoreIcon } from '@mui/x-data-grid';

import { IStaticLwpFAQ } from '../../../../types/entities/IStaticLwpFAQ';
import RenderHtml from '../../../Shared/CommonRenderHtml';
import Heading2 from '../../../Shared/Typography/Heading2';

interface FaqCardProps {
    faq: IStaticLwpFAQ;
    isExpaned?: boolean;
    onExpandChange: () => void;
}

const FaqCard = ({ faq, isExpaned, onExpandChange }: FaqCardProps) => {
    return (
        <div className={`faq-card ${isExpaned ? 'expanded-faq' : ''}`}>
            <Accordion expanded={isExpaned} onChange={onExpandChange} disableGutters>
                <AccordionSummary expandIcon={<GridExpandMoreIcon />}>
                    <Heading2 text={faq?.question} />
                </AccordionSummary>
                {isExpaned ? (
                    <AccordionDetails>
                        <RenderHtml text={faq?.answer} />
                    </AccordionDetails>
                ) : null}
            </Accordion>
        </div>
    );
};

export default FaqCard;
