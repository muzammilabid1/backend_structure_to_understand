import { FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import { FieldArray } from 'formik';
import { cloneDeep } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import { _error } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import CommonCheckBox from '../CommonCheckBox';
import CommonDragIndicator from '../CommonDragIndicator';
import CommonFileUpload from '../CommonFileUpload';
import InputField from '../InputField/InputField';
import Paragraph from '../Typography/Paragraph';

const CommonFieldArrayForTextDiceStep = ({ step, handleChange, handleBlur, name }) => {
    const duplicateDiceProperty = (property) => {
        return cloneDeep(property);
    };

    return (
        <FieldArray name={name}>
            {({ remove, insert }) => (
                <Droppable droppableId={`dice-step-${step?.id ?? step?.tempId}`} type={`dice-step-${step?.id ?? step?.tempId}`}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="dice-step-field-array">
                            {step?.diceProperties?.length > 0 &&
                                step?.diceProperties?.map((property, index) => (
                                    <Draggable
                                        draggableId={`dice-${property?.inputArray}-${index}`}
                                        index={index}
                                        key={`property-${index}`}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                key={index}
                                                className="dice-step-field">
                                                <CommonDragIndicator />
                                                <div className="dice-step-field-elements-container">
                                                    <FormControl
                                                        className="dice-type-options"
                                                        component="fieldset"
                                                        classes={{ root: 'root' }}>
                                                        <Paragraph text="Select dice type: " />
                                                        <RadioGroup
                                                            name={`${name}.${index}.diceType`}
                                                            value={property?.['diceType'] ? property?.['diceType'] : 'TEXT'}
                                                            onChange={(e) => {
                                                                handleChange({
                                                                    target: {
                                                                        name: `${name}.${index}.diceType`,
                                                                        value: e.target.value
                                                                    }
                                                                });
                                                                if (e.target.value !== 'IMAGE') {
                                                                    handleChange({
                                                                        target: {
                                                                            name: `${name}.${index}.images`,
                                                                            value: []
                                                                        }
                                                                    });
                                                                    handleChange({
                                                                        target: {
                                                                            name: `${name}.${index}.fileIds`,
                                                                            value: []
                                                                        }
                                                                    });
                                                                    handleChange({
                                                                        target: {
                                                                            name: `${name}.${index}.fileNames`,
                                                                            value: []
                                                                        }
                                                                    });
                                                                }
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
                                                    {property?.['diceType'] === 'IMAGE' ? (
                                                        <CommonFileUpload
                                                            name={`steps.${index}.images`}
                                                            customClass="file-uploader"
                                                            icon="folder"
                                                            multiple={true}
                                                            heading="Image"
                                                            touched={true}
                                                            fileNames={property?.['fileNames']}
                                                            fileIds={property?.['fileIds']}
                                                            error={property?.['images'].length === 0 && 'Image is required.'}
                                                            previewImage={property?.['images']}
                                                            setFileName={() => {}}
                                                            onSetFileID={(fileIds) => {
                                                                handleChange({
                                                                    target: {
                                                                        name: `${name}.${index}.fileIds`,
                                                                        value: fileIds
                                                                    }
                                                                });
                                                            }}
                                                            onSetFileName={(fileNames) => {
                                                                handleChange({
                                                                    target: {
                                                                        name: `${name}.${index}.fileNames`,
                                                                        value: fileNames
                                                                    }
                                                                });
                                                            }}
                                                            onClose={(images, fileNames, fileIds) => {
                                                                handleChange({
                                                                    target: {
                                                                        name: `${name}.${index}.images`,
                                                                        value: images
                                                                    }
                                                                });
                                                                handleChange({
                                                                    target: {
                                                                        name: `${name}.${index}.fileIds`,
                                                                        value: fileIds
                                                                    }
                                                                });
                                                                handleChange({
                                                                    target: {
                                                                        name: `${name}.${index}.fileNames`,
                                                                        value: fileNames
                                                                    }
                                                                });
                                                            }}
                                                            onSave={(images) => {
                                                                handleChange({
                                                                    target: {
                                                                        name: `${name}.${index}.images`,
                                                                        value: images
                                                                    }
                                                                });
                                                            }}
                                                        />
                                                    ) : (
                                                        <InputField
                                                            name={`${name}.${index}.inputArray`}
                                                            value={property?.['inputArray']}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            inputComponent={'textarea'}
                                                            error={
                                                                (!property?.['inputArray'] && 'This field is required.') ||
                                                                (!_error(property?.['inputArray'], ',') &&
                                                                    'Please enter coma (,) seperated values.') ||
                                                                (property?.['inputArray']?.length > 1000 &&
                                                                    'Input should be shorter than 1000 characters.')
                                                            }
                                                            touched={true}
                                                            label={`Input Array ${index + 1}`}
                                                            type={'text'}
                                                            md={12}
                                                            lg={12}
                                                        />
                                                    )}

                                                    <InputField
                                                        name={`${name}.${index}.width`}
                                                        value={property?.['width']}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        error={false}
                                                        touched={true}
                                                        label={`Width ${index + 1} (px)`}
                                                        type={'text'}
                                                        md={12}
                                                        lg={12}
                                                    />

                                                    <CommonCheckBox
                                                        name={`${name}.${index}.isInfant`}
                                                        checked={property?.['isInfant']}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        label={`Use Infant Font`}
                                                        touched={true}
                                                    />
                                                </div>
                                                <div className="dice-step-field-buttons">
                                                    <LWPButton
                                                        customClass="dice-step-add-btn"
                                                        btnText="+"
                                                        onClick={() =>
                                                            insert(index + 1, {
                                                                inputArray: null,
                                                                width: null,
                                                                isInfant: false,
                                                                diceType: 'TEXT',
                                                                images: [],
                                                                fileNames: [],
                                                                fileIds: []
                                                            })
                                                        }
                                                    />
                                                    <LWPButton
                                                        customClass="dice-step-remove-btn"
                                                        btnText="-"
                                                        onClick={() => (step?.diceProperties?.length > 1 ? remove(index) : {})}
                                                    />
                                                    <LWPButton
                                                        customClass="dice-step-duplicate-btn"
                                                        endIcon="content_copy"
                                                        btnText=""
                                                        onClick={() => insert(index + 1, duplicateDiceProperty(property))}
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

CommonFieldArrayForTextDiceStep.propTypes = {
    step: PropTypes.object.isRequired,
    headers: PropTypes.array.isRequired,
    handleChange: PropTypes.func.isRequired,
    handleBlur: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired
};

export default CommonFieldArrayForTextDiceStep;
