import { FieldArray } from 'formik';
import { nanoid } from 'nanoid';
import PropTypes from 'prop-types';
import React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import LWPButton from '../Button/LWPButton';
import CommonDragIndicator from '../CommonDragIndicator';
import CommonFileUpload from '../CommonFileUpload';
import InputField from '../InputField/InputField';

const CommonFieldArrayForImageCarouselStep = ({ step, handleChange, handleBlur, name }) => {
    return (
        <FieldArray name={name}>
            {({ remove, insert }) => (
                <Droppable
                    droppableId={`image-carousel-step-${step?.id ?? step?.tempId}`}
                    type={`image-carousel-step-${step?.id ?? step?.tempId}`}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="image-carousel-step-field-array">
                            {step?.imageCarouselData?.length > 0 &&
                                step?.imageCarouselData?.map((imageCarousel, index) => (
                                    <Draggable
                                        draggableId={`imageCarousel-${imageCarousel?.alt}-${index}`}
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
                                                <div className="image-carousel-step-field-container">
                                                    <CommonFileUpload
                                                        name={`${name}.${index}.imageUrl`}
                                                        customClass="file-uploader"
                                                        icon="folder"
                                                        heading="Image"
                                                        touched={true}
                                                        error={!imageCarousel?.['imageUrl'] && 'Image is required.'}
                                                        previewImage={imageCarousel?.['imageUrl']}
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
                                                    <div className="image-carousel-step-text-container">
                                                        <InputField
                                                            customClass="image-carousel-order"
                                                            name={`${name}.${index}.alt`}
                                                            value={imageCarousel?.['alt']}
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
                                                        <div className="image-carousel-btn-group">
                                                            <LWPButton
                                                                customClass="image-carousel-step-add-btn"
                                                                btnText="+"
                                                                onClick={() =>
                                                                    insert(index + 1, {
                                                                        imageUrl: null,
                                                                        alt: '',
                                                                        fileIdentifier: nanoid(),
                                                                        fileName: null
                                                                    })
                                                                }
                                                            />
                                                            <LWPButton
                                                                customClass="image-carousel-step-remove-btn"
                                                                btnText="-"
                                                                onClick={() => (step?.imageCarouselData?.length > 1 ? remove(index) : {})}
                                                            />
                                                        </div>
                                                    </div>
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

CommonFieldArrayForImageCarouselStep.propTypes = {
    step: PropTypes.object.isRequired,
    handleChange: PropTypes.func.isRequired,
    handleBlur: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired
};

export default CommonFieldArrayForImageCarouselStep;
