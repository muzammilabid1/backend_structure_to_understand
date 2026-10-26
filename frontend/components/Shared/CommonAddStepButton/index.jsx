import { Add } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { nanoid } from 'nanoid';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { SetByTeacherDataType } from 'lwp-shared';

import sharedJson from '../../../shared/json/index.json';
import LWPButton from './../Button/LWPButton';
import CommonSelectField from './../CommonSelectField';
import DialogWrapper from './../DialogWrapper';

const CommonAddStepButton = ({ insert, index, order, disabled }) => {
    const [open, setOpen] = useState(false);
    const [addStepType, setAddStepType] = useState(sharedJson?.activity_step_types?.[0]?.key);

    return (
        <div className="add-step-btn">
            <LWPButton onClick={() => !disabled && setOpen(!open)} disabled={disabled} dataTest="add-step-btn">
                <IconButton aria-label="Add" color="inherit">
                    <Add />
                </IconButton>
            </LWPButton>
            {open && (
                <DialogWrapper className="add_parent_modal" open={open} setOpen={setOpen} heading="Add Step Type">
                    <div className="add-activity-step-dropdown" data-test="add-activity-step-dropdown">
                        <CommonSelectField
                            md={12}
                            lg={12}
                            displayEmpty
                            shrink
                            value={addStepType}
                            label="Add Step"
                            options={sharedJson?.activity_step_types}
                            onChange={(e) => {
                                setAddStepType(e.target.value);
                            }}
                        />
                        <div className="add-step-type-btn">
                            <LWPButton
                                dataTest="add-step-type-btn"
                                btnText="Add Step"
                                onClick={() => {
                                    insert(index, {
                                        linkName: null,
                                        linkUrl: null,
                                        downloadName: null,
                                        downloadUrl: null,
                                        imageUrl: null,
                                        audioUrl: null,
                                        order: order,
                                        properties: { inputArray: [[]], widthArray: [['']], fontArray: [[]], height: '' },
                                        diceProperties: [
                                            {
                                                inputArray: null,
                                                width: null,
                                                isInfant: false,
                                                diceType: 'TEXT',
                                                images: [],
                                                fileNames: [],
                                                fileIds: []
                                            }
                                        ],
                                        longTextFontSize: null,
                                        scrollingImage: false,
                                        expression: null,
                                        btnText: null,
                                        textCarouselData: [{ text: null, fontSize: '32' }],
                                        accordionData: [{ heading: '', description: { editorState: '', editAsHtml: false } }],
                                        carouselData: [
                                            {
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
                                            }
                                        ],

                                        checkListTextData: {
                                            heading: '',
                                            description: '',
                                            checkList: [
                                                {
                                                    key: nanoid(),
                                                    listItem: '',
                                                    checked: false
                                                }
                                            ]
                                        },
                                        tabsData: [{ modalId: 0, header: '' }],
                                        imageCarouselData: [{ imageUrl: null, alt: null, fileIdentifier: nanoid(), fileName: null }],
                                        checklistImageData: [{ imageUrl: null, caption: null, fileIdentifier: nanoid(), fileName: null }],
                                        tableData: [],
                                        tableHeaders: null,
                                        editAsHtml: false,
                                        modalHeading: null,
                                        height: null,
                                        dimensions: null,
                                        width: null,
                                        modalText: null,
                                        timerDuration: 0,
                                        timerEndString: null,
                                        showTimerInSeconds: false,
                                        timerData: '{ "timerDuration": "", "timerEndString": "" }',
                                        tableRows: [{ row: null }],
                                        stepType: addStepType,
                                        selectedModalId: null,
                                        btnType: sharedJson?.lwp_button_type?.[0]?.key,
                                        editorState: '',
                                        fontSize: null,
                                        fontType: sharedJson?.sassoon_infant_font_types?.[0]?.key,
                                        text: null,
                                        isNew: true,
                                        includeSeconds: false,
                                        fileName: null,
                                        fileIdentifier: nanoid(),
                                        tempId: nanoid()?.split('-')?.join('')?.split('_')?.join(''),
                                        setByTeacherData: {
                                            heading: '',
                                            subHeading: '',
                                            type: SetByTeacherDataType.IMAGE
                                        },
                                        visibilityRules: null
                                    });
                                    setOpen(!open);
                                }}
                            />
                        </div>
                    </div>
                </DialogWrapper>
            )}
        </div>
    );
};

CommonAddStepButton.propTypes = {
    insert: PropTypes.func.isRequired,
    index: PropTypes.number.isRequired,
    order: PropTypes.number.isRequired,
    disabled: PropTypes.bool
};

export default CommonAddStepButton;
