import { gql } from '@apollo/client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, TextField } from '@mui/material';
import { useFormikContext } from 'formik';
import { nanoid } from 'nanoid';
import React, { useEffect, useRef, useState } from 'react';

import UploadFile from '../../Parent/UploadFile';
import CommonLoading from '../../Shared/CommonLoading';
import Paragraph from '../../Shared/Typography/Paragraph';

export const getSetByTeacherStepsForTopicQuery = gql`
    query getSetByTeacherStepsForTopic($topicId: String!, $classTopicId: String, $isReleased: Boolean!) {
        getSetByTeacherStepsForTopic(topicId: $topicId, classTopicId: $classTopicId, isReleased: $isReleased) {
            stepId
            heading
            subHeading
            filename
            parentMessage
        }
    }
`;

interface SetByTeacherStep {
    stepId: string;
    heading: string;
    subHeading: string;
    filename: string | null;
    parentMessage: string | null;
}

interface SetByTeacherAccordionProps {
    steps: SetByTeacherStep[];
    loading: boolean;
    isReleased?: boolean;
}

const SetByTeacherAccordion = ({ steps, loading, isReleased = false }: SetByTeacherAccordionProps) => {
    const [expanded, setExpanded] = useState(false);
    const fileNamesRef = useRef<Record<string, string>>({});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { setFieldValue, values, errors, submitCount } = useFormikContext<any>();

    useEffect(() => {
        if (!steps.length) return;
        setFieldValue('setByTeacherSteps', steps);
        steps.forEach((step) => {
            if (step.parentMessage) {
                setFieldValue(`setByTeacherStepMessages.${step.stepId}`, step.parentMessage);
            }
        });
    }, [steps, setFieldValue]);

    useEffect(() => {
        if (submitCount > 0 && !!errors.setByTeacherStepIds) {
            setExpanded(true);
        }
    }, [submitCount, errors.setByTeacherStepIds]);

    return (
        <Accordion
            className="set-by-teacher-accordion"
            data-test="set-by-teacher-accordion"
            expanded={expanded}
            onChange={(_: React.SyntheticEvent, isExpanded: boolean) => setExpanded(isExpanded)}
            disableGutters
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} data-test="set-by-teacher-accordion-summary">
                <div>
                    <Paragraph text="Add more details" style={{ fontWeight: 'bold' }} />
                    {submitCount > 0 && errors.setByTeacherStepIds && (
                        <span className="set-by-teacher-upload-card__required-error">{errors.setByTeacherStepIds as string}</span>
                    )}
                </div>
            </AccordionSummary>

            <AccordionDetails>
                <Paragraph text="These extra details will be shown to the students and family, to help them familiarise themselves with you and your classroom." />

                {loading ? (
                    <CommonLoading />
                ) : (
                    steps.map((step) => {
                        const photo = values.setByTeacherStepIds?.[step.stepId];
                        const parentMessage = values.setByTeacherStepMessages?.[step.stepId] ?? '';

                        return (
                            <div key={step.stepId} className="set-by-teacher-upload-card" data-test="set-by-teacher-upload-card">
                                <Paragraph text={step.heading} style={{ fontWeight: 'bold' }} />
                                <Paragraph text={step.subHeading} />

                                <UploadFile
                                    icon="photo_camera"
                                    heading=""
                                    customClass="set-by-teacher-image-upload-card"
                                    previewImage={photo === undefined ? (step.filename ?? '') : (photo?.preview ?? '')}
                                    setFileName={(name: string) => {
                                        fileNamesRef.current[step.stepId] = name;
                                    }}
                                    onClose={() => setFieldValue(`setByTeacherStepIds.${step.stepId}`, null)}
                                    onSave={(photoData: { token: string | null; preview: string }) =>
                                        setFieldValue(`setByTeacherStepIds.${step.stepId}`, {
                                            ...photoData,
                                            fileName: fileNamesRef.current[step.stepId],
                                            fileIdentifier: nanoid()
                                        })
                                    }
                                    isShowCancelIcon={true}
                                    canRemove={!isReleased}
                                    skipPresignedUrl
                                />

                                <TextField
                                    data-test="set-by-teacher-parent-message-input"
                                    label="Message for parents (optional)"
                                    value={parentMessage}
                                    onChange={(e) => setFieldValue(`setByTeacherStepMessages.${step.stepId}`, e.target.value)}
                                    multiline
                                    rows={3}
                                    fullWidth
                                    sx={{ mt: 2 }}
                                    inputProps={{ maxLength: 500 }}
                                />
                            </div>
                        );
                    })
                )}
            </AccordionDetails>
        </Accordion>
    );
};

export default SetByTeacherAccordion;
