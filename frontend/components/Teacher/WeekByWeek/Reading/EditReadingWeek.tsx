/* eslint-disable @typescript-eslint/no-explicit-any */
import { FetchResult } from '@apollo/client';
import React, { useContext, useState } from 'react';

import sharedJson from '../../../../shared/json/index.json';
import { isDateInOrAfterCurrentWeek, ThemeContext } from '../../../../shared/Services/handler';
import CommonSelectField from '../../../Shared/CommonSelectField';
import DialogWrapper from '../../../Shared/DialogWrapper';
import InputField from '../../../Shared/InputField/InputField';
import Paragraph from '../../../Shared/Typography/Paragraph';

interface EditReadingWeekProps {
    saveReadingNoteLoading: boolean;
    addReadingNotesModal: {
        open: boolean;
        type: 'MESSAGE' | 'TARGET' | null;
    };
    setAddReadingNotesModal: (modalState: { open: boolean; type: 'MESSAGE' | 'TARGET' | null }) => void;
    classReadingTopic: {
        readingTarget: string | number;
        readingNote?: string;
        activeDateString: string;
        topicId: string;
        releaseDate: string;
    };
    saveReadingNoteMutation: (args: {
        variables: { input: { classTopicId: string; readingNote?: string; readingTarget?: number } };
    }) => Promise<FetchResult<any>>;
}

const EditReadingWeek = ({
    saveReadingNoteLoading,
    addReadingNotesModal,
    setAddReadingNotesModal,
    classReadingTopic,
    saveReadingNoteMutation
}: EditReadingWeekProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [readingTarget, setReadingTarget] = useState(classReadingTopic?.readingTarget);
    const [readingNote, setReadingNote] = useState(classReadingTopic?.readingNote);

    const handleSubmit = () => {
        saveReadingNoteMutation({
            variables: { input: { classTopicId: classReadingTopic?.topicId, readingNote, readingTarget: +readingTarget } }
        })
            .then(() => {
                callSnackbar('Changes saved', 'success');
            })
            .catch(({ ...err }) => {
                callSnackbar(err, 'error');
            })
            .finally(() => {
                setAddReadingNotesModal({ open: false, type: null });
            });
    };

    return (
        <DialogWrapper
            open={addReadingNotesModal?.open}
            setOpen={() => setAddReadingNotesModal({ open: false, type: null })}
            heading={'Edit reading week'}
            subHeading={<Paragraph text={`${classReadingTopic?.activeDateString} · Reading`} />}
            contentWidth="750px"
            dialogFooter
            cancelBtn
            primaryBtnHandler={handleSubmit}
            primaryBtnloading={saveReadingNoteLoading}
            primaryBtnText={'Update'}>
            {addReadingNotesModal?.type === 'MESSAGE' ? (
                <>
                    <InputField
                        name="description"
                        value={readingNote}
                        multiline
                        minRows={2}
                        wordCount={readingNote?.length ?? 0}
                        inputProps={{
                            maxlength: 250
                        }}
                        onChange={(e) => setReadingNote(e.target.value)}
                        label="Message (optional)"
                        type="text"
                        disabled={!isDateInOrAfterCurrentWeek(classReadingTopic?.releaseDate)}
                        md={12}
                        lg={12}
                    />
                    <div className="mb10">
                        <Paragraph>This note will appear at the top of the student’s reading log during this week.</Paragraph>
                    </div>
                </>
            ) : (
                <CommonSelectField
                    value={readingTarget}
                    onChange={(e) => setReadingTarget(e.target.value)}
                    options={sharedJson?.weeklyReadingTarget}
                    label="Weekly reading target"
                    md={12}
                    lg={12}
                />
            )}
        </DialogWrapper>
    );
};

export default EditReadingWeek;
