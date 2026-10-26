import { FieldArray } from 'formik';
import PropTypes from 'prop-types';
import React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import { _error, itemsNotEqualError } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import CommonDragIndicator from '../CommonDragIndicator';
import InputField from '../InputField/InputField';

const CommonFieldArrayForTableStep = ({ step, handleChange, handleBlur, name, headers }) => {
    return (
        <FieldArray name={name}>
            {({ remove, insert }) => (
                <Droppable droppableId={`table-step-${step?.id ?? step?.tempId}`} type={`table-step-${step?.id ?? step?.tempId}`}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="table-step-field-array">
                            {step?.tableRows?.length > 0 &&
                                step?.tableRows?.map((row, index) => (
                                    <Draggable draggableId={`table-${row?.row}-${index}`} index={index} key={`table-${index}`}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                key={index}
                                                className="table-step-field">
                                                <CommonDragIndicator />
                                                <InputField
                                                    name={`${name}.${index}.row`}
                                                    value={row?.['row']}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={
                                                        headers?.trim()?.length > 0 &&
                                                        ((!row?.['row'] && 'This field is required.') ||
                                                            (!_error(row?.['row'], '|') && 'Please enter pipe (|) seperated values.') ||
                                                            (row?.['row'] &&
                                                                itemsNotEqualError(headers, row?.['row']) &&
                                                                "Number of data in this row doesn't match with number of headers"))
                                                    }
                                                    touched={true}
                                                    label={`Row ${index + 1}`}
                                                    md={10}
                                                    lg={10}
                                                />
                                                <div className="table-step-field-buttons">
                                                    <LWPButton
                                                        customClass="table-step-add-btn"
                                                        btnText="+"
                                                        onClick={() => insert(index + 1, { row: '' })}
                                                    />
                                                    <LWPButton
                                                        customClass="table-step-remove-btn"
                                                        btnText="-"
                                                        onClick={() => (step?.tableRows?.length > 1 ? remove(index) : {})}
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
                // <div className="table-step-field-array">
                //     {step?.tableRows?.length > 0 &&
                //         step?.tableRows?.map((row, index) => (
                //             <div key={index} className="table-step-field">
                //                 <InputField
                //                     name={`${name}.${index}.row`}
                //                     value={row?.['row']}
                //                     onChange={handleChange}
                //                     onBlur={handleBlur}
                //                     error={
                //                         headers?.trim()?.length > 0 &&
                //                         ((!row?.['row'] && 'This field is required.') ||
                //                             (!_error(row?.['row'], '|') && 'Please enter pipe (|) seperated values.') ||
                //                             (row?.['row'] &&
                //                                 itemsNotEqualError(headers, row?.['row']) &&
                //                                 "Number of data in this row doesn't match with number of headers"))
                //                     }
                //                     touched={true}
                //                     label={`Row ${index + 1}`}
                //                     md={10}
                //                     lg={10}
                //                 />
                //                 <div className="table-step-field-buttons">
                //                     <LWPButton
                //                         customClass="table-step-add-btn"
                //                         btnText="+"
                //                         onClick={() => insert(index + 1, { row: '' })}
                //                     />
                //                     <LWPButton
                //                         customClass="table-step-remove-btn"
                //                         btnText="-"
                //                         onClick={() => (step?.tableRows?.length > 1 ? remove(index) : {})}
                //                     />
                //                 </div>
                //             </div>
                //         ))}
                // </div>
            )}
        </FieldArray>
    );
};

CommonFieldArrayForTableStep.propTypes = {
    step: PropTypes.object.isRequired,
    headers: PropTypes.array,
    handleChange: PropTypes.func.isRequired,
    handleBlur: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired
};

export default CommonFieldArrayForTableStep;
