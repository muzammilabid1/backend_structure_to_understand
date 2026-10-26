import { FieldArray } from 'formik';
import PropTypes from 'prop-types';
import React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import LWPButton from '../Button/LWPButton';
import CommonCheckBox from '../CommonCheckBox';
import CommonDragIndicator from '../CommonDragIndicator';
import CommonEditor from '../CommonEditor';
import InputField from '../InputField/InputField';

const CommonFieldArrayForAccordionStep = ({ step, handleChange, handleBlur, name, setFieldValue, setFieldTouched }) => {
    return (
        <FieldArray name={name}>
            {({ remove, insert }) => (
                <Droppable droppableId={`accordion-step-${step?.id ?? step?.tempId}`} type={`accordion-step-${step?.id ?? step?.tempId}`}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="accordion-step-field-array">
                            {step?.accordionData?.length > 0 &&
                                step?.accordionData?.map((accordion, index) => {
                                    return (
                                        <Draggable
                                            draggableId={`accordion-${accordion?.heading}-${index}`}
                                            index={index}
                                            key={`accordion-${index}`}>
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
                                                                    <CommonDragIndicator />
                                                                    <InputField
                                                                        name={`${name}.${index}.heading`}
                                                                        value={accordion?.['heading']}
                                                                        onChange={handleChange}
                                                                        onBlur={handleBlur}
                                                                        error={!accordion?.['heading'] && 'This field is required.'}
                                                                        touched={true}
                                                                        label="Accordion heading"
                                                                        md={10}
                                                                        lg={10}
                                                                    />

                                                                    <div className="accordion-step-field-buttons">
                                                                        <LWPButton
                                                                            customClass="accordion-step-add-btn"
                                                                            btnText="+"
                                                                            onClick={() =>
                                                                                insert(index + 1, {
                                                                                    heading: '',
                                                                                    description: {
                                                                                        editorState: '',
                                                                                        editAsHtml: false
                                                                                    }
                                                                                })
                                                                            }
                                                                        />
                                                                        <LWPButton
                                                                            customClass="accordion-step-remove-btn"
                                                                            btnText="-"
                                                                            onClick={() =>
                                                                                step?.accordionData?.length > 1 ? remove(index) : {}
                                                                            }
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div
                                                                    style={{
                                                                        display: snapshot.isDragging ? 'none' : 'block',
                                                                        padding: '0 0 0 40px'
                                                                    }}>
                                                                    <CommonCheckBox
                                                                        checked={accordion?.description?.editAsHtml}
                                                                        onChange={() =>
                                                                            setFieldValue(
                                                                                `${name}.${index}.description.editAsHtml`,
                                                                                !accordion?.description?.editAsHtml
                                                                            )
                                                                        }
                                                                        label="Edit As Html"
                                                                    />
                                                                    <CommonEditor
                                                                        value={accordion?.description?.editorState}
                                                                        editAsHtml={accordion?.description?.editAsHtml}
                                                                        onChange={(newValue) =>
                                                                            setFieldValue(
                                                                                `${name}.${index}.description.editorState`,
                                                                                newValue
                                                                            )
                                                                        }
                                                                        onBlur={() =>
                                                                            setFieldTouched?.(
                                                                                `${name}.${index}.description.editorState`,
                                                                                true
                                                                            )
                                                                        }
                                                                    />
                                                                </div>
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

CommonFieldArrayForAccordionStep.propTypes = {
    step: PropTypes.object.isRequired,
    handleChange: PropTypes.func.isRequired,
    handleBlur: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired,
    setFieldValue: PropTypes.func,
    setFieldTouched: PropTypes.func
};

export default CommonFieldArrayForAccordionStep;
