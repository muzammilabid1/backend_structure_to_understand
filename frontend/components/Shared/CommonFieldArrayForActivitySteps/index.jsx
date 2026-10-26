/* eslint-disable react/no-unescaped-entities */
import { useQuery } from '@apollo/client';
import { Clear } from '@mui/icons-material';
import { Autocomplete, Divider, Grid, IconButton, Paper, TextField } from '@mui/material';
import { FieldArray } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

import { getModalsForActivitySteps, getSchoolTagsForAdmin } from '../../../graphQl/queries';
import { onlyNumberRegex } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { _error, ThemeContext } from '../../../shared/Services/handler';
import CommonAddStepButton from '../CommonAddStepButton';
import CommonMultiSelect from '../CommonMultiSelect';
import CommonTag from '../CommonTag';
import HtmlTooltip from '../HtmlTooltip';
import CommonCheckBox from '../CommonCheckBox';
import CommonDragIndicator from '../CommonDragIndicator';
import CommonEditor from '../CommonEditor';
import CommonFieldArrayForAccordionStep from '../CommonFieldArrayForAccordionStep';
import CommonFieldArrayForCarousel from '../CommonFieldArrayForCarousel';
import CommonFieldArrayForCarouselStep from '../CommonFieldArrayForCarouselStep';
import CommonFieldArrayForCheckListText from '../CommonFieldArrayForCheckListText';
import CommonFieldArrayForDigitalChecklistStep from '../CommonFieldArrayForDigitalChecklistStep';
import CommonFieldArrayForImageCarouselStep from '../CommonFieldArrayForImageCarouselStep';
import CommonFieldArrayForTableStep from '../CommonFieldArrayForTableStep';
import CommonSetByTeacherStep from '../CommonSetByTeacherStep';
import CommonFieldArrayForTabsStep from '../CommonFieldArrayForTabsStep';
import CommonFieldArrayForTextDiceStep from '../CommonFieldArrayForTextDiceStep';
import CommonFileUpload from '../CommonFileUpload';
import CommonSelectField from '../CommonSelectField';
import InputField from '../InputField/InputField';
import Heading2 from '../Typography/Heading2';

const LOCKED_TOOLTIP = 'Cannot add or remove steps because this activity has been released';

const schoolCountLabel = (count) => `${count ?? 0} ${count === 1 ? 'school' : 'schools'}`;

const CommonFieldArrayForActivitySteps = ({
    values,
    handleChange,
    handleBlur,
    setFieldValue,
    errors,
    setFieldTouched,
    isStepEditingLocked = false,
    showVisibilityRules = false
}) => {
    const { callSnackbar } = useContext(ThemeContext);

    const { error: error, data: allModals } = useQuery(getModalsForActivitySteps);

    // Skipped unless the control is actually rendered. This component is shared with the
    // modal editors, which do not offer it, and there is no reason to make them pay for a
    // query whose only consumer is hidden.
    const { error: schoolTagsError, data: schoolTagsData } = useQuery(getSchoolTagsForAdmin, {
        skip: !showVisibilityRules
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
        schoolTagsError?.message && callSnackbar(schoolTagsError, 'error');
    }, [error, schoolTagsError]);

    // The school count is shown against each option so an admin can tell similarly named
    // tags apart, and can immediately see a tag with no schools in it. Without it they are
    // picking blind: choosing the wrong tag hides the step from the wrong schools, and
    // choosing an empty tag hides it from nobody, with nothing on screen to say so either way.
    const schoolTagOptions = (schoolTagsData?.getSchoolTagsForAdmin ?? []).map((tag) => ({
        key: tag?.id,
        value: tag?.name,
        color: tag?.color,
        schoolCounts: tag?.schoolCounts
    }));

    // Stored ids are matched back against the tags that currently exist, so a tag deleted
    // after it was chosen simply drops out of the selection instead of rendering as a blank
    // chip. Saving after that writes the cleaned list back.
    const selectedHideForSchoolTags = (step) =>
        (step?.visibilityRules?.hideForSchoolTagIds ?? [])
            .map((tagId) => schoolTagOptions.find((option) => String(option?.key) === String(tagId)))
            .filter(Boolean);

    const handleStepsReOrder = (steps) => {
        const newSteps = steps.map((step, index) => ({
            ...step,
            order: index + 1
        }));

        setFieldValue('steps', newSteps);
    };

    const findStep = (result) => {
        const stepId = result.type.split('-')[result.type.split('-').length - 1];

        let activityStep = values?.steps?.find((step) => {
            return step?.id === stepId;
        });

        if (!activityStep) {
            activityStep = values?.steps?.find((step) => {
                return step?.tempId === stepId;
            });
        }

        return activityStep;
    };

    const handleReOrder = (arrayToBeReOrdered, result) => {
        const newArrayToBeReOrdered = arrayToBeReOrdered;

        const [removed] = newArrayToBeReOrdered.splice(result.source.index, 1);

        newArrayToBeReOrdered.splice(result.destination.index, 0, removed);
    };

    const handleReOrderOnArrow = (arrayToBeReOrdered, result, type) => {
        const newArrayToBeReOrdered = arrayToBeReOrdered;

        const [removed] = newArrayToBeReOrdered.splice(result, 1);

        type === 'up' ? newArrayToBeReOrdered.splice(result - 1, 0, removed) : newArrayToBeReOrdered.splice(result + 1, 0, removed);
    };

    const handleOnDragEnd = (result, type) => {
        if (type) {
            handleReOrderOnArrow(values?.steps, result, type);
            handleStepsReOrder(values?.steps);
        }

        if (!result.destination) {
            return;
        }

        if (result.destination.index === result.source.index) {
            return;
        }

        if (result.destination.droppableId !== result.source.droppableId) {
            return;
        }

        if (result.type === 'lwp-steps') {
            handleReOrder(values?.steps, result);

            handleStepsReOrder(values?.steps);

            return;
        }

        let step = findStep(result);

        if (result.type.startsWith('tabs-step-') && step) {
            handleReOrder(step?.tabsData, result);
        }

        if (result.type.startsWith('carousel-step-') && step) {
            handleReOrder(step?.textCarouselData, result);
        }

        if (result.type.startsWith('carouselData-step-') && step) {
            handleReOrder(step?.carouselData, result);
        }

        if (result.type.startsWith('table-step-') && step) {
            handleReOrder(step?.tableRows, result);
        }

        if (result.type.startsWith('image-carousel-step-') && step) {
            handleReOrder(step?.imageCarouselData, result);
        }

        if (result.type.startsWith('digital-checklist-step-') && step) {
            handleReOrder(step?.checklistImageData, result);
        }

        if (result.type.startsWith('dice-step-') && step) {
            handleReOrder(step?.diceProperties, result);
        }

        if (result.type.startsWith('accordion-step-') && step) {
            handleReOrder(step?.accordionData, result);
        }

        if (result.type.startsWith('checkListText-step-') && step) {
            handleReOrder(step?.checkListTextData?.checkList, result);
        }
    };

    return (
        <FieldArray name="steps">
            {({ remove, insert }) => (
                <DragDropContext onDragEnd={(result) => handleOnDragEnd(result)}>
                    <div className="activity-step-field-array">
                        <Divider customClass="activity-step-divider" />
                        <HtmlTooltip title={isStepEditingLocked ? LOCKED_TOOLTIP : ''}>
                            <span>
                                <CommonAddStepButton
                                    insert={insert}
                                    index={0}
                                    order={values?.steps?.length + 1}
                                    disabled={isStepEditingLocked}
                                />
                            </span>
                        </HtmlTooltip>
                        <Droppable droppableId={'lwp-steps'} type="lwp-steps">
                            {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps}>
                                    {values?.steps?.length > 0 &&
                                        values?.steps?.map((step, index) => {
                                            return (
                                                <>
                                                    <Draggable
                                                        draggableId={`step-${step?.stepType}-${step?.id ?? step?.tempId}`}
                                                        index={index}
                                                        key={`step-${step?.stepType}-${step?.id ?? step?.tempId}`}>
                                                        {(provided, snapshot) => (
                                                            <Paper
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                key={index}
                                                                className={`activity-step-card ${
                                                                    snapshot.isDragging ? 'activity-step-card-isDragging' : ''
                                                                }`}>
                                                                <div className="icon">
                                                                    <span
                                                                        className={`material-icons ${index > 0 ? '' : 'disabel'}`}
                                                                        style={{ marginBottom: '10px' }}
                                                                        onClick={() => index > 0 && handleOnDragEnd(index, 'up')}>
                                                                        arrow_upward
                                                                    </span>
                                                                </div>
                                                                <div className="activity-step-card-header">
                                                                    <div className="activity-step-card-title">
                                                                        <CommonDragIndicator />
                                                                        <Heading2
                                                                            customClass="step-card-heading"
                                                                            text={`${
                                                                                step?.stepType === 'DICE'
                                                                                    ? 'LEGACY DICE'
                                                                                    : step?.stepType === 'TEXTDICE'
                                                                                      ? 'DICE'
                                                                                      : step?.stepType?.split('_').join(' ')
                                                                            }`}
                                                                        />
                                                                    </div>

                                                                    <HtmlTooltip title={isStepEditingLocked ? LOCKED_TOOLTIP : ''}>
                                                                        <span>
                                                                            <IconButton
                                                                                onClick={() => !isStepEditingLocked && remove(index)}
                                                                                disabled={isStepEditingLocked}
                                                                                className="activity-step-remove-btn"
                                                                                data-test="activity-step-remove-btn"
                                                                                aria-label="Clear"
                                                                                color="inherit">
                                                                                <Clear />
                                                                            </IconButton>
                                                                        </span>
                                                                    </HtmlTooltip>
                                                                </div>

                                                                <>
                                                                    {step.stepType === 'TEXT_AND_IMAGE' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.text`}
                                                                                    value={step?.['text']}
                                                                                    onChange={handleChange}
                                                                                    inputComponent={'textarea'}
                                                                                    onBlur={handleBlur}
                                                                                    error={
                                                                                        !step?.['text'] &&
                                                                                        !step?.['imageUrl'] &&
                                                                                        'This field is required.'
                                                                                    }
                                                                                    touched={true}
                                                                                    label="Text"
                                                                                    md={12}
                                                                                    lg={12}
                                                                                />

                                                                                <Grid item xs={12} md={12} lg={12}>
                                                                                    <CommonFileUpload
                                                                                        name={`steps.${index}.imageUrl`}
                                                                                        customClass="file-uploader"
                                                                                        icon="folder"
                                                                                        heading="Image"
                                                                                        touched={true}
                                                                                        error={
                                                                                            !step?.['text'] &&
                                                                                            !step?.['imageUrl'] &&
                                                                                            'Image is required.'
                                                                                        }
                                                                                        previewImage={step?.['imageUrl']}
                                                                                        setFileName={() => {}}
                                                                                        onSetFileName={(fileName) => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.fileName`,
                                                                                                    value: fileName
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        onClose={() => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.imageUrl`,
                                                                                                    value: ''
                                                                                                }
                                                                                            });
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.fileName`,
                                                                                                    value: ''
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        onSave={(croppedImage) => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.imageUrl`,
                                                                                                    value: croppedImage
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                    />
                                                                                </Grid>
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'IMAGE' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.text`}
                                                                                    value={step?.['text']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    touched={true}
                                                                                    label="Image Alt"
                                                                                    md={12}
                                                                                    lg={12}
                                                                                />

                                                                                <Grid item xs={12} md={12} lg={12}>
                                                                                    <CommonFileUpload
                                                                                        name={`steps.${index}.imageUrl`}
                                                                                        customClass="file-uploader"
                                                                                        icon="folder"
                                                                                        heading="Image"
                                                                                        touched={true}
                                                                                        error={!step?.['imageUrl'] && 'Image is required.'}
                                                                                        previewImage={step?.['imageUrl']}
                                                                                        setFileName={() => {}}
                                                                                        onSetFileName={(fileName) => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.fileName`,
                                                                                                    value: fileName
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        onClose={() => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.imageUrl`,
                                                                                                    value: ''
                                                                                                }
                                                                                            });
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.fileName`,
                                                                                                    value: ''
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        onSave={(croppedImage) => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.imageUrl`,
                                                                                                    value: croppedImage
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                    />
                                                                                </Grid>
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'AUDIO' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <Grid item xs={12} md={12} lg={12}>
                                                                                    <CommonFileUpload
                                                                                        name={`steps.${index}.audioUrl`}
                                                                                        customClass="file-uploader"
                                                                                        icon="folder"
                                                                                        heading="Audio"
                                                                                        touched={true}
                                                                                        error={
                                                                                            !step?.['audioUrl'] && 'Audio file is required.'
                                                                                        }
                                                                                        previewImage={step?.['audioUrl']}
                                                                                        setFileName={() => {}}
                                                                                        onSetFileName={(fileName) => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.fileName`,
                                                                                                    value: fileName
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        onClose={() => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.audioUrl`,
                                                                                                    value: ''
                                                                                                }
                                                                                            });
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.fileName`,
                                                                                                    value: ''
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        onSave={(croppedImage) => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.audioUrl`,
                                                                                                    value: croppedImage
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                    />
                                                                                </Grid>
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'TABLE' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.tableHeaders`}
                                                                                    value={step?.['tableHeaders']}
                                                                                    onChange={handleChange}
                                                                                    inputComponent={'textarea'}
                                                                                    onBlur={handleBlur}
                                                                                    error={
                                                                                        step?.['tableHeaders']?.trim() &&
                                                                                        !_error(step?.['tableHeaders'], '|') &&
                                                                                        'Please enter pipe (|) seperated values.'
                                                                                    }
                                                                                    touched={true}
                                                                                    label="Table Headers"
                                                                                    md={12}
                                                                                    lg={12}
                                                                                />
                                                                                <CommonFieldArrayForTableStep
                                                                                    handleBlur={handleBlur}
                                                                                    handleChange={handleChange}
                                                                                    step={step}
                                                                                    headers={step?.['tableHeaders']}
                                                                                    name={`steps.${index}.tableRows`}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'MODAL' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                {allModals?.['getModals']?.length > 0 && (
                                                                                    <Autocomplete
                                                                                        id="modal-option"
                                                                                        options={(allModals?.['getModals'] || [])
                                                                                            .map((modal) => ({
                                                                                                key: modal?.id,
                                                                                                name:
                                                                                                    modal?.nameForContentDev ?? modal?.name,
                                                                                                state:
                                                                                                    modal?.nameForContentDev ?? modal?.name
                                                                                            }))
                                                                                            .concat([
                                                                                                { value: 'No Modal Selected', key: 0 }
                                                                                            ])}
                                                                                        onChange={(_, value) =>
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.selectedModalId`,
                                                                                                    value: value?.key
                                                                                                }
                                                                                            })
                                                                                        }
                                                                                        value={allModals?.['getModals'].find(
                                                                                            (selectedOption) =>
                                                                                                selectedOption.id ===
                                                                                                step?.['selectedModalId']
                                                                                        )}
                                                                                        getOptionLabel={(option) =>
                                                                                            option?.nameForContentDev ?? option.name
                                                                                        }
                                                                                        style={{ paddingLeft: '16px', width: '100%' }}
                                                                                        renderInput={(params) => (
                                                                                            <TextField
                                                                                                {...params}
                                                                                                label="Modal Name"
                                                                                                variant="outlined"
                                                                                            />
                                                                                        )}
                                                                                    />
                                                                                )}
                                                                                <CommonSelectField
                                                                                    md={6}
                                                                                    lg={6}
                                                                                    xs={12}
                                                                                    sm={12}
                                                                                    name={`steps.${index}.btnType`}
                                                                                    displayEmpty
                                                                                    shrink
                                                                                    error={!step?.['btnType'] && 'This field is required'}
                                                                                    touched={true}
                                                                                    value={step?.['btnType']}
                                                                                    label="Modal Button Type"
                                                                                    options={sharedJson?.lwp_button_type}
                                                                                    onChange={(e) => {
                                                                                        handleChange({
                                                                                            target: {
                                                                                                name: `steps.${index}.btnType`,
                                                                                                value: e.target.value
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    onBlur={(e) =>
                                                                                        handleBlur({
                                                                                            target: {
                                                                                                name: `steps.${index}.btnType`,
                                                                                                value: e.target.value
                                                                                            }
                                                                                        })
                                                                                    }
                                                                                />
                                                                                <InputField
                                                                                    name={`steps.${index}.text`}
                                                                                    value={step?.['text']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={!step?.['text'] && 'This field is required.'}
                                                                                    touched={true}
                                                                                    label="Modal Button Text"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'EDITOR' && (
                                                                        <div className="editor-step">
                                                                            <Grid spacing={2} container>
                                                                                <Grid item md={12} lg={12}>
                                                                                    <CommonCheckBox
                                                                                        checked={step.editAsHtml}
                                                                                        onChange={() =>
                                                                                            setFieldValue(
                                                                                                `steps.${index}.editAsHtml`,
                                                                                                !step.editAsHtml
                                                                                            )
                                                                                        }
                                                                                        label="Edit As Html"
                                                                                    />
                                                                                    <CommonEditor
                                                                                        value={step?.editorState}
                                                                                        editAsHtml={step.editAsHtml}
                                                                                        onChange={(newValue) =>
                                                                                            setFieldValue(
                                                                                                `steps.${index}.editorState`,
                                                                                                newValue
                                                                                            )
                                                                                        }
                                                                                        onBlur={() =>
                                                                                            setFieldTouched?.(
                                                                                                `steps.${index}.editorState`,
                                                                                                true
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </Grid>
                                                                            </Grid>
                                                                        </div>
                                                                    )}
                                                                    {step.stepType === 'INFANT_FONT' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.text`}
                                                                                    value={step?.['text']}
                                                                                    onChange={handleChange}
                                                                                    inputComponent={'textarea'}
                                                                                    onBlur={handleBlur}
                                                                                    error={!step?.['text'] && 'This field is required.'}
                                                                                    touched={true}
                                                                                    label="Text"
                                                                                    md={12}
                                                                                    lg={12}
                                                                                />

                                                                                <CommonSelectField
                                                                                    md={6}
                                                                                    lg={6}
                                                                                    xs={12}
                                                                                    sm={12}
                                                                                    name={`steps.${index}.fontType`}
                                                                                    displayEmpty
                                                                                    shrink
                                                                                    error={!step?.['fontType'] && 'This field is required.'}
                                                                                    touched={true}
                                                                                    value={step?.['fontType']}
                                                                                    label="Font type"
                                                                                    options={sharedJson?.sassoon_infant_font_types}
                                                                                    onChange={(e) => {
                                                                                        handleChange({
                                                                                            target: {
                                                                                                name: `steps.${index}.fontType`,
                                                                                                value: e.target.value
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    onBlur={(e) =>
                                                                                        handleBlur({
                                                                                            target: {
                                                                                                name: `steps.${index}.fontType`,
                                                                                                value: e.target.value
                                                                                            }
                                                                                        })
                                                                                    }
                                                                                />

                                                                                <InputField
                                                                                    name={`steps.${index}.fontSize`}
                                                                                    value={step?.['fontSize']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={errors?.steps?.[index]?.fontSize}
                                                                                    touched={true}
                                                                                    label="Font Size"
                                                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'TABS' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <CommonFieldArrayForTabsStep
                                                                                    handleBlur={handleBlur}
                                                                                    handleChange={handleChange}
                                                                                    step={step}
                                                                                    name={`steps.${index}.tabsData`}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'TEXT_CAROUSEL' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <CommonFieldArrayForCarouselStep
                                                                                    handleBlur={handleBlur}
                                                                                    handleChange={handleChange}
                                                                                    step={step}
                                                                                    name={`steps.${index}.textCarouselData`}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'ACCORDION' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <CommonFieldArrayForAccordionStep
                                                                                    handleBlur={handleBlur}
                                                                                    setFieldTouched={setFieldTouched}
                                                                                    handleChange={handleChange}
                                                                                    setFieldValue={setFieldValue}
                                                                                    step={step}
                                                                                    name={`steps.${index}.accordionData`}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'TEXT_ONLY_DIGITAL_CHECKLIST' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <CommonFieldArrayForCheckListText
                                                                                    handleBlur={handleBlur}
                                                                                    handleChange={handleChange}
                                                                                    setFieldValue={setFieldValue}
                                                                                    step={step}
                                                                                    name={`steps.${index}.checkListTextData`}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'IMAGE_CAROUSEL' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.width`}
                                                                                    value={step?.['width']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    touched={true}
                                                                                    label="Width"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />
                                                                                <InputField
                                                                                    name={`steps.${index}.height`}
                                                                                    value={step?.['height']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    touched={true}
                                                                                    label="Height"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />
                                                                                <CommonCheckBox
                                                                                    label="Show scrolling image"
                                                                                    name={`steps.${index}.scrollingImage`}
                                                                                    checked={step?.['scrollingImage']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    style={{ paddingLeft: 15 }}
                                                                                />
                                                                                <CommonFieldArrayForImageCarouselStep
                                                                                    handleBlur={handleBlur}
                                                                                    handleChange={handleChange}
                                                                                    step={step}
                                                                                    name={`steps.${index}.imageCarouselData`}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}

                                                                    {step.stepType === 'CAROUSEL' && (
                                                                        <Grid spacing={2} container>
                                                                            <InputField
                                                                                name={`steps.${index}.width`}
                                                                                value={step?.['width']}
                                                                                onChange={handleChange}
                                                                                onBlur={handleBlur}
                                                                                touched={true}
                                                                                label="Width"
                                                                                md={6}
                                                                                lg={6}
                                                                            />
                                                                            <InputField
                                                                                name={`steps.${index}.height`}
                                                                                value={step?.['height']}
                                                                                onChange={handleChange}
                                                                                onBlur={handleBlur}
                                                                                touched={true}
                                                                                label="Height"
                                                                                md={6}
                                                                                lg={6}
                                                                            />
                                                                            <CommonCheckBox
                                                                                label="Show scrolling image"
                                                                                name={`steps.${index}.scrollingImage`}
                                                                                checked={step?.['scrollingImage']}
                                                                                onChange={handleChange}
                                                                                onBlur={handleBlur}
                                                                                sx={{ pl: '15px' }}
                                                                            />
                                                                            <CommonFieldArrayForCarousel
                                                                                handleBlur={handleBlur}
                                                                                setFieldTouched={setFieldTouched}
                                                                                handleChange={handleChange}
                                                                                step={step}
                                                                                setFieldValue={setFieldValue}
                                                                                name={`steps.${index}.carouselData`}
                                                                            />
                                                                        </Grid>
                                                                    )}
                                                                    {step.stepType === 'DIGITAL_CHECKLIST' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <CommonFieldArrayForDigitalChecklistStep
                                                                                    handleBlur={handleBlur}
                                                                                    handleChange={handleChange}
                                                                                    step={step}
                                                                                    name={`steps.${index}.checklistImageData`}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'MODAL_WITH_CLICKABLE_ALPHABET' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.btnText`}
                                                                                    value={step?.['btnText']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    touched={true}
                                                                                    label="Button Text"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />

                                                                                <CommonSelectField
                                                                                    md={6}
                                                                                    lg={6}
                                                                                    xs={12}
                                                                                    sm={12}
                                                                                    name={`steps.${index}.btnType`}
                                                                                    displayEmpty
                                                                                    shrink
                                                                                    error={!step?.['btnType'] && 'This field is required'}
                                                                                    touched={true}
                                                                                    value={step?.['btnType']}
                                                                                    label="Modal Button Type"
                                                                                    options={sharedJson?.lwp_button_type}
                                                                                    onChange={(e) => {
                                                                                        handleChange({
                                                                                            target: {
                                                                                                name: `steps.${index}.btnType`,
                                                                                                value: e.target.value
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    onBlur={(e) =>
                                                                                        handleBlur({
                                                                                            target: {
                                                                                                name: `steps.${index}.btnType`,
                                                                                                value: e.target.value
                                                                                            }
                                                                                        })
                                                                                    }
                                                                                />

                                                                                <InputField
                                                                                    name={`steps.${index}.modalHeading`}
                                                                                    value={step?.['modalHeading']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    touched={true}
                                                                                    label="Modal Heading"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />

                                                                                <InputField
                                                                                    name={`steps.${index}.modalText`}
                                                                                    value={step?.['modalText']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    touched={true}
                                                                                    label="Modal Paragraph"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />

                                                                                <InputField
                                                                                    name={`steps.${index}.text`}
                                                                                    value={step?.['text']}
                                                                                    onChange={handleChange}
                                                                                    inputComponent={'textarea'}
                                                                                    onBlur={handleBlur}
                                                                                    error={!step?.['text'] && 'This field is required.'}
                                                                                    touched={true}
                                                                                    label="Text"
                                                                                    md={12}
                                                                                    lg={12}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'DOWNLOAD' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.downloadName`}
                                                                                    value={step?.['downloadName']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={
                                                                                        !step?.['downloadName'] && 'This field is required.'
                                                                                    }
                                                                                    touched={true}
                                                                                    label="Download Name"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />
                                                                                <CommonSelectField
                                                                                    md={6}
                                                                                    lg={6}
                                                                                    sm={12}
                                                                                    xs={12}
                                                                                    name={`steps.${index}.btnType`}
                                                                                    displayEmpty
                                                                                    shrink
                                                                                    error={!step?.['btnType'] && 'This field is required'}
                                                                                    touched={true}
                                                                                    value={step?.['btnType']}
                                                                                    label="Modal Button Type"
                                                                                    options={sharedJson?.lwp_button_type}
                                                                                    onChange={(e) => {
                                                                                        handleChange({
                                                                                            target: {
                                                                                                name: `steps.${index}.btnType`,
                                                                                                value: e.target.value
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    onBlur={(e) =>
                                                                                        handleBlur({
                                                                                            target: {
                                                                                                name: `steps.${index}.btnType`,
                                                                                                value: e.target.value
                                                                                            }
                                                                                        })
                                                                                    }
                                                                                />

                                                                                <Grid item xs={12} md={12} lg={12}>
                                                                                    <CommonFileUpload
                                                                                        name={`steps.${index}.downloadUrl`}
                                                                                        customClass="file-uploader"
                                                                                        icon="folder"
                                                                                        previewImage={step?.['downloadUrl']}
                                                                                        error={
                                                                                            !step?.['downloadUrl'] && 'File is required.'
                                                                                        }
                                                                                        touched={true}
                                                                                        heading="PDF"
                                                                                        setFileName={() => {}}
                                                                                        onSetFileName={(fileName) => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.fileName`,
                                                                                                    value: fileName
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        onClose={() => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.downloadUrl`,
                                                                                                    value: ''
                                                                                                }
                                                                                            });
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.fileName`,
                                                                                                    value: ''
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        onSave={(croppedImage) => {
                                                                                            handleChange({
                                                                                                target: {
                                                                                                    name: `steps.${index}.downloadUrl`,
                                                                                                    value: croppedImage
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                    />
                                                                                </Grid>
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'VIDEO' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.text`}
                                                                                    value={step?.['text']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={
                                                                                        !step?.['text']?.trim()
                                                                                            ? 'This field is required.'
                                                                                            : step?.['text']?.trim() &&
                                                                                                !onlyNumberRegex.test(step?.['text'])
                                                                                              ? 'Please enter numeric values.'
                                                                                              : null
                                                                                    }
                                                                                    touched={true}
                                                                                    label="Video ID"
                                                                                    md={12}
                                                                                    lg={12}
                                                                                    dataTest={`video-step-id-${index}`}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'LINK' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.linkName`}
                                                                                    value={step?.['linkName']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={!step?.['linkName'] && 'This field is required.'}
                                                                                    touched={true}
                                                                                    label="Link Name"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />
                                                                                <CommonSelectField
                                                                                    md={6}
                                                                                    lg={6}
                                                                                    xs={12}
                                                                                    sm={12}
                                                                                    name={`steps.${index}.btnType`}
                                                                                    displayEmpty
                                                                                    shrink
                                                                                    error={!step?.['btnType'] && 'This field is required'}
                                                                                    touched={true}
                                                                                    value={step?.['btnType']}
                                                                                    label="Modal Button Type"
                                                                                    options={sharedJson?.lwp_button_type}
                                                                                    onChange={(e) => {
                                                                                        handleChange({
                                                                                            target: {
                                                                                                name: `steps.${index}.btnType`,
                                                                                                value: e.target.value
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    onBlur={(e) =>
                                                                                        handleBlur({
                                                                                            target: {
                                                                                                name: `steps.${index}.btnType`,
                                                                                                value: e.target.value
                                                                                            }
                                                                                        })
                                                                                    }
                                                                                />
                                                                                <InputField
                                                                                    name={`steps.${index}.linkUrl`}
                                                                                    value={step?.['linkUrl']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={!step?.['linkUrl'] && 'This field is required.'}
                                                                                    touched={true}
                                                                                    label="Link Url"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'TIMER' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <CommonCheckBox
                                                                                    label="only show timer in seconds"
                                                                                    name={`steps.${index}.showTimerInSeconds`}
                                                                                    checked={step?.['showTimerInSeconds']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    style={{ paddingLeft: 15 }}
                                                                                />
                                                                            </Grid>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.timerEndString`}
                                                                                    value={step?.['timerEndString']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={
                                                                                        !step?.['timerEndString'] &&
                                                                                        'This field is required.'
                                                                                    }
                                                                                    touched={true}
                                                                                    label="Time Out Message"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />

                                                                                <InputField
                                                                                    name={`steps.${index}.timerDuration`}
                                                                                    value={step?.['timerDuration']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={errors?.steps?.[index]?.timerDuration}
                                                                                    touched={true}
                                                                                    label="Duration (Seconds)"
                                                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'STOPWATCH' && (
                                                                        <>
                                                                            <Grid
                                                                                spacing={2}
                                                                                container
                                                                                className="stopwatch-grid-container">
                                                                                <Grid item lg={6} md={6}>
                                                                                    <CommonCheckBox
                                                                                        name={`steps.${index}.includeSeconds`}
                                                                                        checked={step?.['includeSeconds']}
                                                                                        onChange={handleChange}
                                                                                        label="Include .00 in stopwatch?"
                                                                                    />
                                                                                </Grid>
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'DICE' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.properties`}
                                                                                    value={step?.['properties']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    inputComponent={'textarea'}
                                                                                    error={
                                                                                        !step?.['properties'] && 'This field is required.'
                                                                                    }
                                                                                    touched={true}
                                                                                    label="Properties"
                                                                                    type={'text'}
                                                                                    md={12}
                                                                                    lg={12}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'TEXTDICE' && (
                                                                        <>
                                                                            <Grid spacing={2} container>
                                                                                <InputField
                                                                                    name={`steps.${index}.height`}
                                                                                    value={step?.['height']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={false}
                                                                                    touched={true}
                                                                                    label="Height (px)"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />
                                                                                <InputField
                                                                                    name={`steps.${index}.longTextFontSize`}
                                                                                    value={step?.['longTextFontSize']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={false}
                                                                                    touched={true}
                                                                                    label="Long Text Font Size (px)"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />
                                                                                <InputField
                                                                                    name={`steps.${index}.btnText`}
                                                                                    value={step?.['btnText']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={false}
                                                                                    touched={true}
                                                                                    label="Button Text"
                                                                                    md={6}
                                                                                    lg={6}
                                                                                />
                                                                                <InputField
                                                                                    name={`steps.${index}.expression`}
                                                                                    value={step?.['expression']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    error={errors?.steps?.[index]?.expression}
                                                                                    touched={true}
                                                                                    label="Expression"
                                                                                    md={12}
                                                                                    lg={12}
                                                                                    helperText={
                                                                                        <>
                                                                                            <p>Examples:</p>
                                                                                            <p>
                                                                                                &#123;&#123;dice1&#125;&#125;
                                                                                                &#123;&#123;break&#125;&#125;
                                                                                                &#123;&#123;dice2&#125;&#125;
                                                                                            </p>
                                                                                            <p>
                                                                                                &#123;&#123;dice1&#125;&#125; +
                                                                                                &#123;&#123;dice2&#125;&#125;
                                                                                            </p>
                                                                                            <p>
                                                                                                &#123;&#123;fraction
                                                                                                "&#123;&#123;dice1&#125;&#125;"
                                                                                                "&#123;&#123;dice2&#125;&#125;" &#125;&#125;
                                                                                            </p>
                                                                                            <p>
                                                                                                &#123;&#123;fraction
                                                                                                "&#123;&#123;dice1&#125;&#125; +
                                                                                                &#123;&#123;dice2&#125;&#125;"
                                                                                                "&#123;&#123;dice3&#125;&#125;"&#125;&#125;
                                                                                                + &#123;&#123;dice4&#125;&#125;
                                                                                            </p>
                                                                                        </>
                                                                                    }
                                                                                />
                                                                                <CommonFieldArrayForTextDiceStep
                                                                                    handleBlur={handleBlur}
                                                                                    handleChange={handleChange}
                                                                                    step={step}
                                                                                    name={`steps.${index}.diceProperties`}
                                                                                />
                                                                            </Grid>
                                                                        </>
                                                                    )}
                                                                    {step.stepType === 'SET_BY_TEACHER' && (
                                                                        <CommonSetByTeacherStep
                                                                            handleChange={handleChange}
                                                                            handleBlur={handleBlur}
                                                                            step={step}
                                                                            name={`steps.${index}.setByTeacherData`}
                                                                        />
                                                                    )}
                                                                    {/*
                                                                        Hides this step from schools carrying any of the chosen tags.
                                                                        Stored on the step as visibilityRules, matched in the browser by
                                                                        filterStepsForViewer.

                                                                        Rendered once here rather than inside each of the step type blocks
                                                                        above, because the rule is step type agnostic: it applies to all of
                                                                        them identically, and a new step type gets it for free. It sits last
                                                                        in the card because it is a setting about the step rather than part
                                                                        of the step's content.

                                                                        Only shown where the filter actually runs. See the
                                                                        showVisibilityRules prop below.
                                                                    */}
                                                                    {showVisibilityRules && (
                                                                        <Grid spacing={2} container>
                                                                            <CommonMultiSelect
                                                                                md={12}
                                                                                lg={12}
                                                                                label="Hide this step from schools tagged with"
                                                                                name={`steps.${index}.visibilityRules`}
                                                                                dataTest={`step-hide-for-school-tags-${index}`}
                                                                                placeholder={
                                                                                    selectedHideForSchoolTags(step)?.length
                                                                                        ? ''
                                                                                        : 'Leave empty to show this step to every school'
                                                                                }
                                                                                value={selectedHideForSchoolTags(step)}
                                                                                options={schoolTagOptions}
                                                                                onChange={(value) =>
                                                                                    setFieldValue(`steps.${index}.visibilityRules`, {
                                                                                        hideForSchoolTagIds: (value ?? []).map(
                                                                                            (tag) => tag?.key
                                                                                        )
                                                                                    })
                                                                                }
                                                                                renderOption={(props, option) => (
                                                                                    <li
                                                                                        {...props}
                                                                                        key={option?.key}
                                                                                        style={{ display: 'flex' }}>
                                                                                        {option?.value}
                                                                                        <span
                                                                                            style={{
                                                                                                marginLeft: 'auto',
                                                                                                paddingLeft: '12px',
                                                                                                opacity: 0.6
                                                                                            }}>
                                                                                            {schoolCountLabel(option?.schoolCounts)}
                                                                                        </span>
                                                                                    </li>
                                                                                )}
                                                                                renderTags={(value, getTagProps) =>
                                                                                    value.map((option, tagIndex) => (
                                                                                        <CommonTag
                                                                                            name={option?.value}
                                                                                            bgColor={option?.color}
                                                                                            {...getTagProps({ index: tagIndex })}
                                                                                        />
                                                                                    ))
                                                                                }
                                                                            />
                                                                        </Grid>
                                                                    )}
                                                                    <div className="icon">
                                                                        <span
                                                                            className={`material-icons ${
                                                                                values.steps.length - 1 !== index ? '' : 'disabel'
                                                                            }`}
                                                                            style={{ marginTop: '10px' }}
                                                                            onClick={() =>
                                                                                values.steps.length - 1 !== index &&
                                                                                handleOnDragEnd(index, 'down')
                                                                            }>
                                                                            arrow_downward
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            </Paper>
                                                        )}
                                                    </Draggable>
                                                    <HtmlTooltip title={isStepEditingLocked ? LOCKED_TOOLTIP : ''}>
                                                        <span>
                                                            <CommonAddStepButton
                                                                insert={insert}
                                                                index={index + 1}
                                                                order={values.steps.length + 1}
                                                                disabled={isStepEditingLocked}
                                                            />
                                                        </span>
                                                    </HtmlTooltip>
                                                </>
                                            );
                                        })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                        <Divider customClass="activity-step-divider" />
                    </div>
                </DragDropContext>
            )}
        </FieldArray>
    );
};

CommonFieldArrayForActivitySteps.propTypes = {
    values: PropTypes.array.isRequired,
    handleChange: PropTypes.func.isRequired,
    handleBlur: PropTypes.func.isRequired,
    setFieldTouched: PropTypes.func.isRequired,
    setFieldValue: PropTypes.func,
    errors: PropTypes.object,
    isStepEditingLocked: PropTypes.bool,
    /**
     * Whether to offer the "hide from schools tagged with" control on each step.
     *
     * Only true for the activity editors. Activity steps are filtered by filterStepsForViewer
     * on the parent activity page and on the teacher's activity preview, so a rule set there
     * has an effect on both.
     * Modal steps are fetched separately and rendered by StaticLwpModalPreview, which does
     * not run that filter, so offering the control in the modal editors would let an admin
     * save a rule that silently does nothing.
     */
    showVisibilityRules: PropTypes.bool
};

export default CommonFieldArrayForActivitySteps;
