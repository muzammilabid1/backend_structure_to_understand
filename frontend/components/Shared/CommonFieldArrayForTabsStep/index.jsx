import { useQuery } from '@apollo/client';
import { FieldArray } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import { getModalsForActivitySteps } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import CommonDragIndicator from '../CommonDragIndicator';
import CommonMultiSelect from '../CommonMultiSelect';
import InputField from '../InputField/InputField';

// getModalsForActivitySteps

const CommonFieldArrayForTabsStep = ({ step, handleChange, handleBlur, name }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const { error: error, data: allModals } = useQuery(getModalsForActivitySteps);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    return (
        <FieldArray name={name}>
            {({ remove, insert }) => (
                <Droppable droppableId={`tabs-step-${step?.id ?? step?.tempId}`} type={`tabs-step-${step?.id ?? step?.tempId}`}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="tabs-step-field-array">
                            {step?.tabsData?.length > 0 &&
                                step?.tabsData?.map((tab, index) => {
                                    return (
                                        <Draggable draggableId={`tab-${tab?.header}-${index}`} index={index} key={`tab-${index}`}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    key={index}
                                                    className="tabs-step-field">
                                                    <CommonDragIndicator />
                                                    <InputField
                                                        name={`${name}.${index}.header`}
                                                        value={tab?.['header']}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        error={!tab?.['header'] && 'This field is required.'}
                                                        touched={true}
                                                        label="Header"
                                                        md={10}
                                                        lg={10}
                                                    />

                                                    <CommonMultiSelect
                                                        md={10}
                                                        lg={10}
                                                        customClass="step-dropdown"
                                                        name={`${name}.${index}.modalId`}
                                                        filterSelectedOptions={false}
                                                        multiple={false}
                                                        value={
                                                            allModals?.['getModals']
                                                                ?.map((modal) => ({
                                                                    key: modal?.id,
                                                                    value: modal?.nameForContentDev ?? modal?.name
                                                                }))
                                                                ?.find((x) => x.key === tab?.['modalId']) ?? {
                                                                key: 0,
                                                                value: ''
                                                            }
                                                        }
                                                        error={!tab?.['modalId'] && 'This field is required. Please select a modal.'}
                                                        touched={true}
                                                        label="Select Modal"
                                                        options={(allModals?.['getModals'] || []).map((modal) => {
                                                            return {
                                                                key: modal?.id,
                                                                value: modal?.nameForContentDev ?? modal?.name
                                                            };
                                                        })}
                                                        onChange={(e) => {
                                                            handleChange({
                                                                target: {
                                                                    name: `${name}.${index}.modalId`,
                                                                    value: e?.key
                                                                }
                                                            });
                                                        }}
                                                        onBlur={(e) =>
                                                            handleBlur({
                                                                target: {
                                                                    name: `${name}.${index}.modalId`,
                                                                    value: e.key
                                                                }
                                                            })
                                                        }
                                                    />
                                                    <div className="tabs-step-field-buttons">
                                                        <LWPButton
                                                            btnText="+"
                                                            disabled={step?.tabsData.length >= 3}
                                                            onClick={() =>
                                                                insert(index + 1, {
                                                                    modalId: 0
                                                                })
                                                            }
                                                        />
                                                        <LWPButton
                                                            className="tabs-step-field-remove-button"
                                                            btnText="-"
                                                            onClick={() => (step?.tabsData?.length > 1 ? remove(index) : {})}
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

CommonFieldArrayForTabsStep.propTypes = {
    step: PropTypes.object.isRequired,
    handleChange: PropTypes.func.isRequired,
    handleBlur: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired
};

export default CommonFieldArrayForTabsStep;
