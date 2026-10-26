import { Divider, FormControl, FormControlLabel, Grid, Radio, RadioGroup } from '@mui/material';
import { FieldArray } from 'formik';
import { cloneDeep } from 'lodash';
import { nanoid } from 'nanoid';
import PropTypes from 'prop-types';
import React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import LWPButton from '../Button/LWPButton';
import CommonCard from '../Cards/CommonCard';
import CommonCheckBox from '../CommonCheckBox';
import CommonDragIndicator from '../CommonDragIndicator';
import CommonEditor from '../CommonEditor';
import CommonFileUpload from '../CommonFileUpload';
import RenderHtml from '../CommonRenderHtml';
import InputField from '../InputField/InputField';
import Heading2 from '../Typography/Heading2';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

const CommonFieldArrayForCarousel = ({ name, handleChange, step, setFieldValue, handleBlur, setFieldTouched }) => {
    return (
        <FieldArray name={name}>
            {({ remove, insert }) => (
                <Droppable
                    droppableId={`carouselData-step-${step?.id ?? step?.tempId}`}
                    type={`carouselData-step-${step?.id ?? step?.tempId}`}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="accordion-step-field-array">
                            {step?.carouselData?.length > 0 &&
                                step?.carouselData?.map((data, index) => {
                                    return (
                                        <Draggable
                                            draggableId={`carouselData-${index + 1}-${index}`}
                                            index={index}
                                            key={`carouselData-${index}`}>
                                            {(provided, snapshot) => {
                                                return (
                                                    <div>
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            key={index}>
                                                            <div>
                                                                <div className="accordion-step-field">
                                                                    <Grid display={'flex'} alignItems={'center'}>
                                                                        <CommonDragIndicator />
                                                                        <FormControl className="select-type-options" component="fieldset">
                                                                            <Paragraph text="Select carousel type:" />
                                                                            <RadioGroup
                                                                                name={`${name}.${index}.type`}
                                                                                value={data?.type}
                                                                                onChange={(e) => {
                                                                                    handleChange({
                                                                                        target: {
                                                                                            name: `${name}.${index}.type`,
                                                                                            value: e.target.value
                                                                                        }
                                                                                    });
                                                                                }}>
                                                                                <FormControlLabel
                                                                                    value={'TEXT'}
                                                                                    control={<Radio className="Radio_btn_3" />}
                                                                                    label="Text"
                                                                                />
                                                                                <FormControlLabel
                                                                                    value={'IMAGE'}
                                                                                    control={<Radio className="Radio_btn_3" />}
                                                                                    label="Image"
                                                                                />
                                                                            </RadioGroup>
                                                                        </FormControl>
                                                                    </Grid>
                                                                    <div className="accordion-step-field-buttons">
                                                                        <LWPButton
                                                                            customClass="accordion-step-add-btn"
                                                                            btnText="+"
                                                                            onClick={() =>
                                                                                insert(index + 1, {
                                                                                    type: 'TEXT',
                                                                                    textEditAsHtml: false,
                                                                                    textEditorState: '',
                                                                                    labelEditAsHtml: false,
                                                                                    labelEditorState: '',
                                                                                    imageUrl: null,
                                                                                    alt: null,
                                                                                    fileIdentifier: nanoid(),
                                                                                    fileName: null,
                                                                                    isLabelEdited: true,
                                                                                    isTextEdited: true
                                                                                })
                                                                            }
                                                                        />
                                                                        <LWPButton
                                                                            customClass="accordion-step-remove-btn"
                                                                            btnText="-"
                                                                            onClick={() =>
                                                                                step?.carouselData?.length > 1 ? remove(index) : {}
                                                                            }
                                                                        />
                                                                        <LWPButton
                                                                            customClass="accordion-step-remove-btn"
                                                                            endIcon="content_copy"
                                                                            btnText=""
                                                                            onClick={() =>
                                                                                insert(
                                                                                    index + 1,
                                                                                    cloneDeep({ ...data, fileIdentifier: nanoid() })
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <Grid
                                                                    sx={{
                                                                        display: snapshot.isDragging ? 'none' : 'block',
                                                                        padding: '0 0 0 40px'
                                                                    }}>
                                                                    {data?.type === 'TEXT' ? (
                                                                        <Grid sx={{ pr: 1 }}>
                                                                            {data?.isTextEdited ? (
                                                                                <>
                                                                                    <CommonCheckBox
                                                                                        checked={data?.textEditAsHtml}
                                                                                        onChange={() =>
                                                                                            setFieldValue(
                                                                                                `${name}.${index}.textEditAsHtml`,
                                                                                                !data?.textEditAsHtml
                                                                                            )
                                                                                        }
                                                                                        label="Edit As Html"
                                                                                    />
                                                                                    <CommonEditor
                                                                                        value={data?.textEditorState}
                                                                                        editAsHtml={data?.textEditAsHtml}
                                                                                        onChange={(newValue) =>
                                                                                            setFieldValue(
                                                                                                `${name}.${index}.textEditorState`,
                                                                                                newValue
                                                                                            )
                                                                                        }
                                                                                        onBlur={() =>
                                                                                            setFieldTouched?.(
                                                                                                `${name}.${index}.textEditorState`,
                                                                                                true
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </>
                                                                            ) : (
                                                                                <CommonCard>
                                                                                    <Grid
                                                                                        container
                                                                                        justifyContent={'space-between'}
                                                                                        alignItems={'center'}>
                                                                                        <Heading2 text="Text" />
                                                                                        <LWPButton
                                                                                            startIcon={'edit'}
                                                                                            btnText="Edit text"
                                                                                            color="inherit"
                                                                                            variant="text"
                                                                                            onClick={() =>
                                                                                                handleChange({
                                                                                                    target: {
                                                                                                        name: `${name}.${index}.isTextEdited`,
                                                                                                        value: !data?.['isTextEdited']
                                                                                                    }
                                                                                                })
                                                                                            }
                                                                                        />
                                                                                    </Grid>

                                                                                    <Divider />
                                                                                    <RenderHtml text={data?.['textEditorState']} />
                                                                                </CommonCard>
                                                                            )}
                                                                        </Grid>
                                                                    ) : (
                                                                        <div>
                                                                            <CommonFileUpload
                                                                                name={`${name}.${index}.imageUrl`}
                                                                                customClass="file-uploader"
                                                                                icon="folder"
                                                                                heading="Image"
                                                                                touched={true}
                                                                                error={!data?.['imageUrl'] && 'Image is required.'}
                                                                                previewImage={data?.['imageUrl']}
                                                                                setFileName={() => {}}
                                                                                onSetFileName={(fileName) => {
                                                                                    handleChange({
                                                                                        target: {
                                                                                            name: `${name}.${index}.fileName`,
                                                                                            value: fileName
                                                                                        }
                                                                                    });
                                                                                }}
                                                                                onClose={() => {
                                                                                    handleChange({
                                                                                        target: {
                                                                                            name: `${name}.${index}.imageUrl`,
                                                                                            value: ''
                                                                                        }
                                                                                    });
                                                                                    handleChange({
                                                                                        target: {
                                                                                            name: `${name}.${index}.fileName`,
                                                                                            value: ''
                                                                                        }
                                                                                    });
                                                                                }}
                                                                                onSave={(croppedImage) => {
                                                                                    handleChange({
                                                                                        target: {
                                                                                            name: `${name}.${index}.imageUrl`,
                                                                                            value: croppedImage
                                                                                        }
                                                                                    });
                                                                                }}
                                                                            />
                                                                            <Grid sx={{ pr: 1 }}>
                                                                                <InputField
                                                                                    customClass="image-carousel-order"
                                                                                    name={`${name}.${index}.alt`}
                                                                                    value={data?.['alt']}
                                                                                    onChange={handleChange}
                                                                                    onBlur={handleBlur}
                                                                                    touched={true}
                                                                                    label="Alt"
                                                                                    md={12}
                                                                                    lg={12}
                                                                                    inputComponent={'textarea'}
                                                                                    inputProps={{
                                                                                        style: { resize: 'vertical' }
                                                                                    }}
                                                                                />

                                                                                <Heading3 text="Optional label" />
                                                                                {data?.isLabelEdited ? (
                                                                                    <>
                                                                                        <CommonCheckBox
                                                                                            checked={data?.labelEditAsHtml}
                                                                                            onChange={() =>
                                                                                                setFieldValue(
                                                                                                    `${name}.${index}.labelEditAsHtml`,
                                                                                                    !data?.labelEditAsHtml
                                                                                                )
                                                                                            }
                                                                                            label="Edit As Html"
                                                                                        />
                                                                                        <CommonEditor
                                                                                            value={data?.labelEditorState}
                                                                                            editAsHtml={data?.labelEditAsHtml}
                                                                                            onChange={(newValue) =>
                                                                                                setFieldValue(
                                                                                                    `${name}.${index}.labelEditorState`,
                                                                                                    newValue
                                                                                                )
                                                                                            }
                                                                                            onBlur={() =>
                                                                                                setFieldTouched?.(
                                                                                                    `${name}.${index}.labelEditorState`,
                                                                                                    true
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </>
                                                                                ) : (
                                                                                    <CommonCard>
                                                                                        <Grid
                                                                                            container
                                                                                            justifyContent={'space-between'}
                                                                                            alignItems={'center'}>
                                                                                            <Heading2 text="Label" />
                                                                                            <LWPButton
                                                                                                startIcon={'edit'}
                                                                                                btnText="Edit label"
                                                                                                color="inherit"
                                                                                                variant="text"
                                                                                                onClick={() =>
                                                                                                    handleChange({
                                                                                                        target: {
                                                                                                            name: `${name}.${index}.isLabelEdited`,
                                                                                                            value: !data?.['isLabelEdited']
                                                                                                        }
                                                                                                    })
                                                                                                }
                                                                                            />
                                                                                        </Grid>
                                                                                        <Divider />
                                                                                        <RenderHtml text={data?.['labelEditorState']} />
                                                                                    </CommonCard>
                                                                                )}
                                                                            </Grid>
                                                                        </div>
                                                                    )}
                                                                </Grid>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        </Draggable>
                                    );
                                })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            )}
        </FieldArray>
    );
};

CommonFieldArrayForCarousel.propTypes = {
    name: PropTypes.string,
    handleChange: PropTypes.func,
    step: PropTypes.shape({
        id: PropTypes.string,
        tempId: PropTypes.string,
        carouselData: PropTypes.arrayOf(
            PropTypes.shape({
                type: PropTypes.string,
                textEditAsHtml: PropTypes.bool,
                textEditorState: PropTypes.string,
                labelEditAsHtml: PropTypes.bool,
                labelEditorState: PropTypes.string,
                imageUrl: PropTypes.string,
                alt: PropTypes.string,
                fileIdentifier: PropTypes.string,
                fileName: PropTypes.string,
                isLabelEdited: PropTypes.bool,
                isTextEdited: PropTypes.bool
            })
        )
    }),
    setFieldValue: PropTypes.func,
    handleBlur: PropTypes.func,
    setFieldTouched: PropTypes.func
};

export default CommonFieldArrayForCarousel;
