import { FieldArray } from 'formik';
import { nanoid } from 'nanoid';
import PropTypes from 'prop-types';
import React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import LWPButton from '../Button/LWPButton';
import CommonDragIndicator from '../CommonDragIndicator';
import InputField from '../InputField/InputField';
import Heading3 from '../Typography/Heading3';

const CommonFieldArrayForCheckListText = ({ step, handleChange, handleBlur, name }) => {
    return (
        <div style={{ width: '100%', padding: 20 }}>
            {step?.checkListTextData?.['heading'] ? (
                <InputField
                    name={`${name}.heading`}
                    value={step?.checkListTextData?.['heading']}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={!step?.checkListTextData?.['heading'] && 'This field is required.'}
                    touched={true}
                    label="Heading"
                    md={10}
                    lg={10}
                />
            ) : null}
            {step?.checkListTextData?.['description'] ? (
                <InputField
                    name={`${name}.description`}
                    value={step?.checkListTextData?.['description']}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={!step?.checkListTextData?.['description'] && 'This field is required.'}
                    touched={true}
                    label="Description"
                    md={10}
                    lg={10}
                />
            ) : null}

            <Heading3 text="List items" />

            <FieldArray name={`${name}.checkList`}>
                {({ remove, insert }) => (
                    <Droppable
                        droppableId={`checkListText-step-${step?.id ?? step?.tempId}`}
                        type={`checkListText-step-${step?.id ?? step?.tempId}`}>
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="accordion-step-field-array">
                                {step?.checkListTextData?.checkList?.length > 0 &&
                                    step?.checkListTextData?.checkList?.map((checkList, index) => {
                                        return (
                                            <Draggable
                                                draggableId={`checkListText-${checkList?.listItem}-${index}`}
                                                index={index}
                                                key={`checkListText-${index}`}>
                                                {(provided) => {
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
                                                                            name={`${name}.checkList.${index}.listItem`}
                                                                            value={checkList?.['listItem']}
                                                                            onChange={handleChange}
                                                                            onBlur={handleBlur}
                                                                            error={!checkList?.['listItem'] && 'This field is required.'}
                                                                            touched={true}
                                                                            label="List item"
                                                                            md={10}
                                                                            lg={10}
                                                                        />

                                                                        <div className="accordion-step-field-buttons">
                                                                            <LWPButton
                                                                                customClass="accordion-step-add-btn"
                                                                                btnText="+"
                                                                                onClick={() =>
                                                                                    insert(index + 1, {
                                                                                        key: nanoid(),
                                                                                        listItem: '',
                                                                                        checked: false
                                                                                    })
                                                                                }
                                                                            />
                                                                            <LWPButton
                                                                                customClass="accordion-step-remove-btn"
                                                                                btnText="-"
                                                                                onClick={() =>
                                                                                    !!step?.checkListTextData?.checkList?.length &&
                                                                                    remove(index)
                                                                                }
                                                                            />
                                                                        </div>
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
        </div>
    );
};

CommonFieldArrayForCheckListText.propTypes = {
    step: PropTypes.object.isRequired,
    handleChange: PropTypes.func.isRequired,
    handleBlur: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired
};

export default CommonFieldArrayForCheckListText;
