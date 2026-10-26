import { FieldArray } from 'formik';
import PropTypes from 'prop-types';
import React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import LWPButton from '../Button/LWPButton';
import CommonDragIndicator from '../CommonDragIndicator';
import InputField from '../InputField/InputField';

const CommonFieldArrayForCarouselStep = ({ step, handleChange, handleBlur, name }) => {
    return (
        <FieldArray name={name}>
            {({ remove, insert }) => (
                <Droppable droppableId={`carousel-step-${step?.id ?? step?.tempId}`} type={`carousel-step-${step?.id ?? step?.tempId}`}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="carousel-step-field-array">
                            {step?.textCarouselData?.length > 0 &&
                                step?.textCarouselData?.map((carousel, index) => {
                                    return (
                                        <Draggable
                                            draggableId={`carousel-${carousel?.text}-${index}`}
                                            index={index}
                                            key={`carousel-${index}`}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    key={index}
                                                    className="carousel-step-field">
                                                    <CommonDragIndicator />
                                                    <div style={{ width: '100%' }}>
                                                        <InputField
                                                            name={`${name}.${index}.fontSize`}
                                                            value={carousel?.['fontSize']}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            error={!carousel?.['fontSize'] && 'This field is required.'}
                                                            touched={true}
                                                            label="Carousel fontsize"
                                                            md={10}
                                                            lg={10}
                                                        />
                                                        <InputField
                                                            name={`${name}.${index}.text`}
                                                            value={carousel?.['text']}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            error={!carousel?.['text'] && 'This field is required.'}
                                                            touched={true}
                                                            label="Carousel Text"
                                                            inputComponent={'textarea'}
                                                            md={10}
                                                            lg={10}
                                                        />
                                                    </div>

                                                    <div className="carousel-step-field-buttons">
                                                        <LWPButton
                                                            customClass="carousel-step-add-btn"
                                                            btnText="+"
                                                            onClick={() => insert(index + 1, { text: '', fontSize: '32' })}
                                                        />
                                                        <LWPButton
                                                            customClass="carousel-step-remove-btn"
                                                            btnText="-"
                                                            onClick={() => (step?.textCarouselData?.length > 1 ? remove(index) : {})}
                                                        />
                                                    </div>
                                                </div>
                                            )}
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

CommonFieldArrayForCarouselStep.propTypes = {
    step: PropTypes.object.isRequired,
    handleChange: PropTypes.func.isRequired,
    handleBlur: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired
};

export default CommonFieldArrayForCarouselStep;
