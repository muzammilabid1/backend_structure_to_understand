/* eslint-disable @next/next/no-img-element */
import { useQuery } from '@apollo/client';
import { FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import gql from 'graphql-tag';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { readingModes } from '../../../shared/Constant';
import { ThemeContext, matchBooks } from '../../../shared/Services/handler';
import CommonTooltipIcon from '../../Shared/CommonTooltipIcon';
import FieldCardOptions from '../../Shared/FieldCardOptions';
import InputField from '../../Shared/InputField/InputField';
import SelectLoggedBookName from '../../Shared/SelectLoggedBookName';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';
import { ReadingBookOptions, ReadingMode } from 'lwp-shared';

const readingModeDefinitions = (
    <div className="reading-mode-definitions">
        {readingModes.map((mode) => (
            <p key={mode.value}>
                <b>{mode.definitionTitle}</b>
                <br />
                {mode.definitionBody}
            </p>
        ))}
    </div>
);

// CommonTooltipIcon otherwise falls back to a bare span, which no keyboard can reach. Choosing a way
// of reading is required, so the text that tells them apart has to be reachable without a mouse.
// A button gets that for free: MUI's tooltip opens on focus as well as hover.
const readingModeInfoTrigger = (
    <button type="button" className="material-icons common-tool-tip-icon" aria-label="What each way of reading means">
        info_outlined
    </button>
);

export const GET_PUPIL_BOOKS = gql`
    query getPupilBooks($pupilId: String!, $readingMode: ReadingMode) {
        getPupilBooks(pupilId: $pupilId, readingMode: $readingMode) {
            bookName
            isBookFinished
            pageNumber
        }
    }
`;

const ReadingLogForParent = ({
    values,
    handleChange,
    setFieldValue,
    handleBlur,
    errors,
    touched,
    setFileName,
    // setIsShowParentCheckbox,
    selectedFeedback,
    disableViewAsParent,
    enableBookNameOnlyReadingLog,
    requireReadingMode = true,
    setSavingLock
}) => {
    const [isFieldShow, setIsFieldShow] = useState([]);
    const { callSnackbar } = useContext(ThemeContext);
    const [suggestedBookNames, setSuggestedBookNames] = useState([]);
    const modeCardRefs = useRef([]);

    const queryParams = useParams();

    const pupilId = queryParams?.child_id || queryParams?.pupil_id;
    const {
        data,
        loading: pupilBooksLoading,
        error: pupilBooksError
    } = useQuery(GET_PUPIL_BOOKS, {
        variables: { pupilId, readingMode: values?.readingMode || null },
        // getPupilBooks has no limit, so running this on mount fetched the pupil's entire book
        // history to throw away. The cached list is keyed by mode, so a save cannot invalidate it
        // without knowing which mode it belonged to; cache-and-network is what refreshes it.
        skip: !pupilId || !(selectedFeedback || values?.readingMode),
        fetchPolicy: 'cache-and-network'
    });
    const pupilBooks = data?.getPupilBooks;

    useEffect(() => {
        pupilBooksError?.message && callSnackbar(pupilBooksError, 'error');
    }, [pupilBooksError]);

    useEffect(() => {
        // Cleared while a new mode's books are in flight: holding the last list would leave the
        // previous mode's books on screen and clickable.
        setSuggestedBookNames(pupilBooks ? matchBooks(pupilBooks, values?.bookName ?? '') : []);
    }, [pupilBooks, values?.bookName]);

    const readingTypeCard = [
        {
            text: 'School book',
            value: ReadingBookOptions.SCHOOL_BOOK,
            dataTest: 'school-book-card'
        },
        {
            text: 'Own book',
            value: ReadingBookOptions.OWN_BOOK,
            dataTest: 'own-book-card'
        },
        {
            text: 'Something else',
            value: ReadingBookOptions.SOMETHING_ELSE,
            dataTest: 'something-else-card'
        }
    ];

    useEffect(() => {
        if (selectedFeedback) {
            if (selectedFeedback?.comment) {
                setIsFieldShow((prevState) => [...prevState, 'comment']);
            }

            if (selectedFeedback?.audios?.length) {
                setIsFieldShow((prevState) => [...prevState, 'audio']);
            }

            if (selectedFeedback?.photos?.length) {
                setIsFieldShow((prevState) => [...prevState, 'photo']);
            }

            return () => {
                setIsFieldShow([]);
            };
        } else {
            setIsFieldShow([]);
        }
    }, [selectedFeedback, values?.readDate]);

    // useEffect(() => {
    //     setIsShowParentCheckbox(false);
    // }, [values?.readDate]);

    const isRealWorldReading = values?.readingMode === ReadingMode.READ_IN_REAL_WORLD;

    // "Something else" covers magazines and comics, which have no ending to reach, and real-world
    // reading has no book at all. Asking either would put a meaningless answer on record.
    const hasABookToFinish = !isRealWorldReading && values?.readingType !== ReadingBookOptions.SOMETHING_ELSE;

    // A chip picked before switching to real-world is left alone, so switching back restores it.
    const selectReadingMode = (value) => {
        if (disableViewAsParent) return;
        handleChange({ target: { name: 'readingMode', value } });
    };

    const selectedModeIndex = readingModes.findIndex((mode) => mode.value === values?.readingMode);
    // A radiogroup is one stop in the tab order, not four, and after an answer that stop is the
    // chosen card, so tabbing back returns to the answer.
    const focusableModeIndex = selectedModeIndex === -1 ? 0 : selectedModeIndex;

    const handleReadingModeKeyDown = (event, index) => {
        if (disableViewAsParent) return;

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectReadingMode(readingModes[index].value);

            return;
        }

        const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;

        if (!step) return;

        event.preventDefault();
        const nextIndex = (index + step + readingModes.length) % readingModes.length;

        selectReadingMode(readingModes[nextIndex].value);
        modeCardRefs.current[nextIndex]?.focus();
    };

    return (
        <div className="readinglog-for-parent-page">
            <div className="error-message">
                <Heading3 text="How did you read? " customClass={requireReadingMode ? 'mandatory-field' : ''} />
                <CommonTooltipIcon text={readingModeDefinitions} dataTest="reading-mode-info" img={readingModeInfoTrigger} />
            </div>
            <div className="reading-mode-card-container" role="radiogroup" aria-label="How did you read?">
                {readingModes.map((item, index) => {
                    const isActive = values?.readingMode === item.value;

                    return (
                        <div
                            key={item.value}
                            ref={(element) => (modeCardRefs.current[index] = element)}
                            data-test={item.dataTest}
                            role="radio"
                            aria-checked={isActive}
                            aria-disabled={disableViewAsParent || undefined}
                            tabIndex={index === focusableModeIndex ? 0 : -1}
                            className={`reading-mode-card-background ${isActive ? 'active' : ''}`}
                            onClick={() => selectReadingMode(item.value)}
                            onKeyDown={(event) => handleReadingModeKeyDown(event, index)}>
                            <span className="reading-mode-card-disc" />
                            <img
                                src={`/assets/images/${item.image}.png`}
                                alt=""
                                width={item.img.width}
                                height={item.img.height}
                                style={{ top: `${item.img.top}px` }}
                            />
                            <Paragraph text={item.cardLabel} />
                            {isActive && (
                                <div className="reading-mode-radio-button">
                                    {/* Decorative: the card carries role and aria-checked, and a radio is a
                                        leaf role so this input is not announced separately. Left in the tab
                                        order it would make the group two stops rather than one. */}
                                    <Radio checked inputProps={{ tabIndex: -1 }} style={{ width: '8px', height: '8px' }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {(selectedFeedback || values?.readingMode) && (
                <div>
                    {!isRealWorldReading && (
                        <>
                            <div className="error-message reading-type-heading">
                                <Heading3 text="What are you reading? " customClass="mandatory-field" />
                                {errors?.readingType && touched?.readingType ? <Paragraph>{errors?.readingType}</Paragraph> : null}
                            </div>
                            <div className="reading-type-chip-container">
                                {readingTypeCard.map((item) => {
                                    const isActive = values?.readingType === item.value;

                                    return (
                                        <div
                                            key={item.value}
                                            data-test={item.dataTest}
                                            className={`reading-type-chip ${isActive ? 'active' : ''}`}
                                            onClick={() => {
                                                if (disableViewAsParent) return;
                                                handleChange({ target: { name: 'readingType', value: item?.value } });
                                            }}>
                                            <Paragraph text={item.text} />
                                            <span className="reading-type-chip-radio">
                                                <Radio checked={isActive} style={{ width: '8px', height: '8px' }} />
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    <InputField
                        type="text"
                        label="What did you read?"
                        md={12}
                        lg={12}
                        disabled={disableViewAsParent}
                        name="bookName"
                        value={values.bookName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.bookName}
                        touched={touched.bookName}
                        customClass={'readinglog-input'}
                        dataTest={'book-name-input'}
                    />
                    {pupilBooksLoading || suggestedBookNames.length ? (
                        <SelectLoggedBookName
                            suggestedBookNames={suggestedBookNames}
                            disableViewAsParent={disableViewAsParent}
                            bookName={values?.bookName}
                            loading={pupilBooksLoading}
                            handleOnSelect={(bookName) => {
                                if (disableViewAsParent) return;
                                handleChange({
                                    target: {
                                        name: 'bookName',
                                        value: bookName
                                    }
                                });
                            }}
                        />
                    ) : null}

                    {hasABookToFinish && (
                        <>
                            <FormControl component="fieldset" classes={{ root: 'root' }} disabled={disableViewAsParent}>
                                <div className="reading-optional-heading">
                                    <Heading3 text="Did you finish this book?" />
                                    <Paragraph text="(optional)" dontCapitilizeFirstLetter />
                                </div>
                                <br />
                                <RadioGroup
                                    name="finishedBook"
                                    value={values.finishedBook}
                                    className="finish-book-radio-btn"
                                    onChange={(event) => setFieldValue('finishedBook', 'true' === event.target.value)}>
                                    <FormControlLabel
                                        value={true}
                                        control={<Radio color="secondary" className="Radio_btn_3" />}
                                        label="Yes"
                                    />
                                    <FormControlLabel
                                        value={false}
                                        control={<Radio color="secondary" className="Radio_btn_3" />}
                                        label="No"
                                    />
                                </RadioGroup>
                            </FormControl>
                            {false === values.finishedBook && (
                                <>
                                    <InputField
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                        label="Which page did you get to?"
                                        md={12}
                                        lg={12}
                                        disabled={disableViewAsParent}
                                        name="pageNumber"
                                        value={values.pageNumber}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={errors.pageNumber}
                                        touched={touched.pageNumber}
                                        customClass={'readinglog-input'}
                                    />
                                    <br />
                                </>
                            )}
                        </>
                    )}

                    <div className="error-message">
                        <Heading3
                            text="Add your thoughts "
                            customClass={`mb-20 ${enableBookNameOnlyReadingLog ? '' : 'mandatory-field'}`}
                        />
                        {errors?.thoughts && touched?.thoughts ? <Paragraph>{errors?.thoughts}</Paragraph> : null}
                    </div>
                    <FieldCardOptions
                        variant="reading-log-parent"
                        isFieldShow={isFieldShow}
                        setIsFieldShow={setIsFieldShow}
                        values={values}
                        handleChange={handleChange}
                        handleBlur={handleBlur}
                        setFileName={setFileName}
                        disabled={disableViewAsParent}
                        setSavingLock={setSavingLock}
                    />
                </div>
            )}
        </div>
    );
};

ReadingLogForParent.propTypes = {
    values: PropTypes.string,
    handleChange: PropTypes.func,
    setFieldValue: PropTypes.func,
    handleBlur: PropTypes.func,
    errors: PropTypes.string,
    touched: PropTypes.bool,
    disableViewAsParent: PropTypes.bool,
    requireReadingMode: PropTypes.bool,
    setFileName: PropTypes.func,
    // setIsShowParentCheckbox: PropTypes.func,
    selectedFeedback: PropTypes.object,
    enableBookNameOnlyReadingLog: PropTypes.bool,
    setSavingLock: PropTypes.func
};

export default ReadingLogForParent;
