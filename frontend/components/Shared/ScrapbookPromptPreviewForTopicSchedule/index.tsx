import MenuBookSharpIcon from '@mui/icons-material/MenuBookSharp';

import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

interface ScrapbookPromptPreviewForTopicScheduleProps {
    scrapbookPrompt: string;
}

const ScrapbookPromptPreviewForTopicSchedule = ({ scrapbookPrompt }: ScrapbookPromptPreviewForTopicScheduleProps) => {
    return (
        <div className="scrapbook-prompt-card">
            <div className="scrapbook-prompt-header">
                <MenuBookSharpIcon className="scrapbook-prompt-icon" />
                <Heading3 text="SCRAPBOOK PROMPT" />
            </div>
            <Paragraph dataTest="scrapbook-prompt" customClass="scrapbook-prompt">
                “{scrapbookPrompt}”
            </Paragraph>
            <div className="scrapbook-prompt-description">
                <Paragraph text="This prompt will be shown to families in their scrapbook. They can use it as inspiration for a scrapbook entry, or share anything else they’d like you to know about." />
            </div>
        </div>
    );
};

export default ScrapbookPromptPreviewForTopicSchedule;
