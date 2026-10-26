import { FieldArray } from 'formik';
import { nanoid } from 'nanoid';
import PropTypes from 'prop-types';
import React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import LWPButton from '../Button/LWPButton';
import CommonDragIndicator from '../CommonDragIndicator';
import CommonFileUpload from '../CommonFileUpload';
import InputField from '../InputField/InputField';

const CommonFieldArrayForDigitalChecklistStep = ({ step, handleChange, handleBlur, name }) => {
    return (
        <FieldArray name={name}>
            {({ remove, insert }) => (
                <Droppable
                    droppableId={`digital-checklist-step-${step?.id ?? step?.tempId}`}
                    type={`digital-checklist-step-${step?.id ?? step?.tempId}`}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="image-carousel-step-field-array">
                            {step?.checklistImageData?.length > 0 &&
                                step?.checklistImageData?.map((checklistImage, index) => (
                                    <Draggable
                                        draggableId={`imageCarousel-${checklistImage?.caption}-${index}`}
                                        index={index}
                                        key={`imageCarousel-${index}`}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                key={index}
                                                className="image-carousel-step-field">
                                                <CommonDragIndicator />
                                                <CommonFileUpload
                                                    name={`${name}.${index}.imageUrl`}
                                                    customClass="file-uploader"
                                                    icon="folder"
                                                    heading="Image"
                                                    touched={true}
                                                    error={!checklistImage?.['imageUrl'] && 'Image is required.'}
                                                    previewImage={checklistImage?.['imageUrl']}
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
                                                            target: { name: `${name}.${index}.imageUrl`, value: '' }
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
                                                <InputField
                                                    customClass="image-carousel-order"
                                                    name={`${name}.${index}.caption`}
                                                    value={checklistImage?.['caption']}
                                                    error={!checklistImage?.['caption']?.trim() && 'Caption is required.'}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    touched={true}
                                                    label="Caption"
                                                    md={4}
                                                    lg={4}
                                                />
                                                <div className="image-carousel-btn-group">
                                                    <LWPButton
                                                        customClass="image-carousel-step-add-btn"
                                                        btnText="+"
                                                        onClick={() =>
                                                            insert(index + 1, {
                                                                imageUrl: null,
                                                                caption: '',
                                                                fileIdentifier: nanoid(),
                                                                fileName: null
                                                            })
                                                        }
                                                    />
                                                    <LWPButton
                                                        customClass="image-carousel-step-remove-btn"
                                                        btnText="-"
                                                        onClick={() => (step?.checklistImageData?.length > 1 ? remove(index) : {})}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            )}
        </FieldArray>
    );
};

CommonFieldArrayForDigitalChecklistStep.propTypes = {
    step: PropTypes.object.isRequired,
    handleChange: PropTypes.func.isRequired,
    handleBlur: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired
};

export default CommonFieldArrayForDigitalChecklistStep;
