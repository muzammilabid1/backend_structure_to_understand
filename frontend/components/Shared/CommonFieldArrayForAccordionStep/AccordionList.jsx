import { FieldArray } from 'formik';
import PropTypes from 'prop-types';
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';

import LWPButton from '../Button/LWPButton';
import CommonDragIndicator from '../CommonDragIndicator';
import InputField from '../InputField/InputField';

const AccordionList = ({ handleChange, handleBlur, name, list }) => {
    return (
        <FieldArray name={name}>
            {({ remove, insert }) =>
                list?.length > 0 &&
                list?.map((item, index) => {
                    return (
                        <Draggable draggableId={`list-${item?.text}-${index}`} index={index} key={`list-${index}`}>
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
                                            name={`${name}.${index}.text`}
                                            value={item?.['text']}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={!item?.['text'] && 'This field is required.'}
                                            touched={true}
                                            label="list item"
                                            md={10}
                                            lg={10}
                                        />
                                    </div>

                                    <div className="carousel-step-field-buttons">
                                        <LWPButton
                                            customClass="carousel-step-add-btn"
                                            btnText="+"
                                            onClick={() => insert(index + 1, { text: '' })}
                                        />
                                        <LWPButton
                                            customClass="carousel-step-remove-btn"
                                            btnText="-"
                                            onClick={() => (list?.length > 1 ? remove(index) : {})}
                                        />
                                    </div>
                                </div>
                            )}
                        </Draggable>
                    );
                })
            }
        </FieldArray>
    );
};

AccordionList.propTypes = {
    step: PropTypes.object.isRequired,
    list: PropTypes.array,
    handleChange: PropTypes.func.isRequired,
    handleBlur: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired
};

export default AccordionList;
