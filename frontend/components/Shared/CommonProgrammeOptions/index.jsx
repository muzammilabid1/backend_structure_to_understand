/* eslint-disable @next/next/no-img-element */
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { ADMIN, MINIO_PUBLIC_PATHS, SchoolClassStatus, TEACHER } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { getFutureDate, ThemeContext } from '../../../shared/Services/handler';
import CommonCheckBox from '../CommonCheckBox';
import CommonSelectField from '../CommonSelectField';
import CommonTooltipIcon from '../CommonTooltipIcon';
import DateField from '../InputField/DateField';
import PurchaseClassModal from '../Modals/PurchaseClassModal';
import { ReadingWeekStartDayForm } from '../ReadingWeekStartDayForm';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import ActivateMoneySkillsLicenceModal from './ActivateMoneySkillsLicenceModal';

/**
 * Exclude the '0' key from the weekly reading target options for the class.
 * This is because if reading logs are enabled, the class cannot set '0' as the weekly reading target.
 */

const WEEKLY_READING_TARGET = sharedJson?.weeklyReadingTarget?.filter((item) => item?.key !== '0');

const CommonProgrammeOptions = ({
    values,
    handleChange,
    handleBlur,
    errors,
    touched,
    classes,
    remainingFullProgrammedClassInfo,
    schoolId,
    classId,
    remainingTotalClassInfo,
    isActivatePage = false,
    isClassDetailPage = false,
    isFullProgramme,
    haveReadingTopics = { readingTopicExist: false, readingTopicReleased: false },
    setValues,
    classDetail,
    schoolDetails,
    isVisibleReadyTeddyCheckBox,
    isAdminSide
}) => {
    const { token } = useContext(ThemeContext);
    const [purchaseClassModal, setPurchaseClassModal] = useState(false);
    const [isActivateMoneySkillsLicenceModalOpen, setIsActivateMoneySkillsLicenceModalOpen] = useState(false);

    const isFullProgrammeDisabled = useMemo(() => {
        if (isActivatePage) {
            return (token?.userType === TEACHER && token?.isSchoolLeader && isFullProgramme) ||
                (token?.userType === TEACHER && !token?.isSchoolLeader)
                ? true
                : remainingTotalClassInfo === 0
                  ? true
                  : remainingTotalClassInfo > 0 && remainingFullProgrammedClassInfo === 0
                    ? true
                    : false;
        } else if (isClassDetailPage) {
            if (token?.userType === ADMIN) return false;

            if ((token?.isSchoolLeader && isFullProgramme) || !token?.isSchoolLeader) return true;

            if (remainingTotalClassInfo > 0 && remainingFullProgrammedClassInfo === 0) return true;

            return false;
        } else if (remainingTotalClassInfo === 0) {
            return true;
        } else if (remainingTotalClassInfo > 0 && remainingFullProgrammedClassInfo === 0) {
            return true;
        } else {
            return false;
        }
    }, [isActivatePage, isClassDetailPage, token, isFullProgramme, remainingFullProgrammedClassInfo, remainingTotalClassInfo]);

    const showPurchaseLicenseOptionOnClassDetailsPage = token?.userType === TEACHER && !token?.isSchoolLeader ? false : true;

    const isFutureReadyTeddyClass = (values?.periodId || classDetail?.period?.index) > schoolDetails?.curentPeriod?.index;

    const remainingAllowedClassesInfo = schoolDetails?.remainingAllowedClassesInfo;
    const canPurchaseReadyTeddyLicence = schoolDetails?.isReadyTeddyEnabled && !schoolDetails?.isReadyTeddyAvailable;

    const remainingFullProgramClasses = remainingAllowedClassesInfo?.fullProgramme;
    const remainingTotalClasses = remainingAllowedClassesInfo?.total;
    const remainingReadingClasses = Math.max(0, remainingTotalClasses);

    const renderClassInfoBoxMessage = () => {
        if (!showPurchaseLicenseOptionOnClassDetailsPage) return null;

        const getClassLabel = (count) => (count === 1 ? 'class' : 'classes');
        const sumOfAllRemainingClasses = remainingTotalClasses;

        let message = null;
        let isVisiblePurchasingLicense = false;

        // If not a class detail page and there are no remaining classes, return 'You cannot add any more classes' on (class activation or create class page)
        if (!isClassDetailPage && remainingTotalClasses === 0) {
            message = 'You cannot add any more classes.';
            isVisiblePurchasingLicense = true;
            // If a class is future ready teddy class and user is on class activation or create class page
        } else if (isFutureReadyTeddyClass) {
            // Did'nt need to show message for active ready teddy class on class detail page
            if (isClassDetailPage) return null;

            isVisiblePurchasingLicense = canPurchaseReadyTeddyLicence;
            message = schoolDetails?.isReadyTeddyAvailable
                ? 'You can use the Ready Teddy programme in this class for the next academic year.'
                : 'You cannot use the Ready Teddy programme in any more classes for the next academic year.';

            // if there are remaining classes
        } else if (sumOfAllRemainingClasses > 0) {
            // If full programme is not enabled then message will display according to this
            const fullProgrammeText = !classDetail?.isFullProgramme ? (
                <>
                    {remainingFullProgramClasses > 0 ? (
                        <>
                            You can enable the topics and activities in{' '}
                            <b>
                                {remainingFullProgramClasses} more {getClassLabel(remainingFullProgramClasses)}
                            </b>
                            .
                        </>
                    ) : (
                        'You cannot enable the full programme in any more classes.'
                    )}
                </>
            ) : null;

            if (!fullProgrammeText) return null;

            isVisiblePurchasingLicense = !classDetail?.isFullProgramme || canPurchaseReadyTeddyLicence || isClassDetailPage;
            message = <>{fullProgrammeText}</>;
        } else {
            return null;
        }

        return { message, isVisiblePurchasingLicense };
    };

    const isVisibleReadingLogCheckBox = () => {
        // If the class is not registration or future ready teddy class then reading logged will not enable
        if (!values?.isRegistrationClass || isFutureReadyTeddyClass) return false;

        // if the reading logged enabled then return true
        if (values.isReadingLogsEnabled) return true;

        const hasRemainingReadingClasses = remainingReadingClasses > 0;
        const isFullProgrammeOnly = isClassDetailPage && classDetail?.isFullProgramme;

        // If there are remaining reading classes or the class is full programme only then return true
        return hasRemainingReadingClasses || isFullProgrammeOnly;
    };
    const readingWeekChangeBox = useMemo(() => {
        return haveReadingTopics?.readingTopicReleased ? (
            <details className="change-reading-week-start">
                <summary>Want to change the days your reading weeks run?</summary>
                <p>
                    <strong>Please read this carefully first: it&apos;s important!</strong>
                </p>
                <p>
                    Changing your reading week start day will involve resetting your pupils&apos; reading log progress. All
                    previously-recorded logs will be kept, and the feedbacks will still be shown, but{' '}
                    <strong>all past reading weeks will have their reading targets set to zero</strong>. This is because they&apos;ll now be
                    on a different set of days.
                </p>
                <p>
                    This will mean that <strong>pupils who have previously earned gold stars for their reading may lose those stars</strong>
                    .
                </p>
                <ReadingWeekStartDayForm
                    classId={classId}
                    currentReadingLaunchDate={values.readingLaunchDate}
                    schoolClassName={values.name}
                    extraWarnings
                />
            </details>
        ) : (
            <></>
        );
    }, [classId, values.readingLaunchDate, values.name]);

    useEffect(() => {
        if (schoolDetails?.isMoneySkillsAvailable && !values?.isMoneySkillsAvailable) {
            setValues({
                ...values,
                isMoneySkillsAvailable: schoolDetails?.isMoneySkillsAvailable
            });
        }
    }, [schoolDetails?.isMoneySkillsAvailable, values]);

    useEffect(() => {
        if (
            values?.isReadyTeddy &&
            !(classDetail?.isReadyTeddyEnabled && classDetail?.status === SchoolClassStatus.ACTIVE) &&
            !isFutureReadyTeddyClass &&
            !(values?.isFullProgramme || values?.isReadingLogsEnabled)
        ) {
            setValues({ ...values, isReadyTeddy: false });
        }
    }, [isFutureReadyTeddyClass, values, classDetail]);

    const isAdminOrSchoolLeader = token?.userType === ADMIN || token?.isSchoolLeader;

    const isVisibleReadyTeddyProgrammeCheckBox = () => {
        // Show Ready Teddy programm checkbox only when reception year group is selected
        if (!isVisibleReadyTeddyCheckBox) return false;

        /**
         * Step 1: Determine if the checkbox should be displayed.
         * It should be shown if:
         * - the class is a pre-admission (future) class, OR
         * - the class has Full Programme enabled, OR
         * - the class has Reading Logs enabled, OR
         * - the class is active and Ready Teddy is enabled
         *   (this covers the case where a pre-admission class becomes a registered class
         *   in the current academic year).
         */

        const isActiveReadyTeddy = classDetail?.isReadyTeddyEnabled && classDetail?.status === SchoolClassStatus.ACTIVE;

        const shouldShowProgramme =
            isFutureReadyTeddyClass || values?.isFullProgramme || values?.isReadingLogsEnabled || isActiveReadyTeddy;

        if (!shouldShowProgramme) return false;

        /**
         * Step 2: Validate licence usage.
         * - If Ready Teddy is not yet enabled for the class → school must have ready teddy programme available.
         * - If Ready Teddy is already enabled → must be on Class Settings page OR the school must still have ready teddy programme available.
         */

        const hasRemaindingSlots =
            (!classDetail?.isReadyTeddyEnabled && schoolDetails?.isReadyTeddyAvailable) ||
            (classDetail?.isReadyTeddyEnabled && (isClassDetailPage || schoolDetails?.isReadyTeddyAvailable));

        if (!hasRemaindingSlots) return false;

        return true;
    };

    return (
        <div className="programme-options-container">
            <Heading3 text="Programme options" customClass={classes.heading} />

            {renderClassInfoBoxMessage() && (
                <div className="programme-info-alert-container">
                    <div className="programme-info-alert-mathscot-container">
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/programme-mathscot-alert-image.png`}
                        />
                    </div>
                    <div className="programme-info-alert-text" data-test="programme-info-alert-text">
                        <Paragraph>
                            {renderClassInfoBoxMessage().message}{' '}
                            {(renderClassInfoBoxMessage().isVisiblePurchasingLicense || isAdminSide) && (
                                <u
                                    className="cp"
                                    data-test="common-programme-options-purchase-class-licence-link"
                                    onClick={() => setPurchaseClassModal(!purchaseClassModal)}>
                                    Purchase additional class licences
                                </u>
                            )}
                        </Paragraph>
                    </div>
                </div>
            )}

            {isVisibleReadingLogCheckBox() ? (
                <>
                    <CommonCheckBox
                        name="isReadingLogsEnabled"
                        checked={values.isReadingLogsEnabled}
                        onBlur={handleBlur}
                        onChange={handleChange}
                        label="Digital reading log"
                        error={errors.isReadingLogsEnabled}
                        touched={touched.isReadingLogsEnabled}
                        customClass={classes.readingLogCheck}
                        disabled={haveReadingTopics?.readingTopicReleased}
                        className="programme-options-checkbox"
                    />
                    {values.isReadingLogsEnabled && (
                        <>
                            <CommonSelectField
                                label={'Weekly reading target'}
                                options={WEEKLY_READING_TARGET}
                                value={values.readingTarget}
                                error={errors.readingTarget}
                                touched={touched.readingTarget}
                                customClass={classes.readingLogSelect}
                                onChange={(e) =>
                                    handleChange({
                                        target: { name: 'readingTarget', value: +e.target.value }
                                    })
                                }
                                onBlur={(e) =>
                                    handleBlur({
                                        target: { name: 'readingTarget', value: +e.target.value }
                                    })
                                }
                                dataTest="weekly-reading-target-select"
                            />
                            <CommonSelectField
                                label={'Reading weeks run'}
                                options={sharedJson?.readingDays}
                                value={values.readingStartDay}
                                error={errors.readingStartDay}
                                touched={touched.readingStartDay}
                                customClass={classes.readingLogSelect}
                                onChange={(e) => {
                                    setValues({
                                        ...values,
                                        readingStartDay: +e.target.value,
                                        readingLaunchDate: getFutureDate(+e.target.value)
                                    });
                                }}
                                disabled={haveReadingTopics?.readingTopicReleased ? true : false}
                                dataTest="reading-start-day-select"
                            />
                            <div className={errors.readingLaunchDate && 'date-picker-error'}>
                                <DateField
                                    name="readingLaunchDate"
                                    label="Reading log launch date"
                                    md={'6'}
                                    lg={'6'}
                                    value={values.readingLaunchDate}
                                    onChange={handleChange}
                                    shouldDisableDate={(e) => {
                                        const currentDate = moment().day();
                                        const readingStartDay = values?.readingStartDay;

                                        if (currentDate === readingStartDay) {
                                            return moment(e).day() !== readingStartDay;
                                        } else {
                                            return moment(e).day() !== readingStartDay;
                                        }
                                    }}
                                    disabled={haveReadingTopics?.readingTopicReleased ? true : false}
                                    minDate={moment().toDate()}
                                    touched={touched.readingLaunchDate}
                                />
                                {!errors.readingLaunchDate && <br />}
                            </div>
                            {readingWeekChangeBox}
                            {errors.readingLaunchDate && (
                                <div className="date-error-message">
                                    <ErrorOutlineIcon />
                                    <Paragraph customClass="date-error-message">
                                        Please ensure that the reading log launch date is the same day of the week as the chosen “start of
                                        the reading week”.
                                    </Paragraph>
                                </div>
                            )}
                        </>
                    )}
                </>
            ) : !isClassDetailPage && !values?.isRegistrationClass ? (
                <div className={classes.readingLogNotAvailable}>
                    <Paragraph>Not available</Paragraph>

                    <CommonTooltipIcon
                        customIconClass={classes.readingLogClassIcon}
                        text="The reading log can only be enabled on registration classes."
                    />
                </div>
            ) : null}

            <div className="programme-options-checkbox-container">
                {((!classDetail?.isFullProgramme && remainingFullProgrammedClassInfo > 0) || classDetail?.isFullProgramme) &&
                    !isFutureReadyTeddyClass && (
                        <div className="programme-options-licence-checkbox">
                            <CommonCheckBox
                                name="isFullProgramme"
                                checked={values.isFullProgramme}
                                onBlur={handleBlur}
                                onChange={handleChange}
                                label="Topics and activities"
                                error={errors.isFullProgramme}
                                touched={touched.isFullProgramme}
                                customClass={classes.readingLogCheck}
                                disabled={isFullProgrammeDisabled}
                                dataTest={'programme-options-full-programme-checkbox'}
                                className="programme-options-checkbox"
                            />
                            <CommonTooltipIcon
                                text="Checking this box will enable parental engagement activities to be set for this class, and will use one of your full programme class licences."
                                customIconClass={classes.customIconClass}
                            />
                        </div>
                    )}
                {isVisibleReadyTeddyProgrammeCheckBox() ? (
                    <CommonCheckBox
                        name="isReadyTeddy"
                        checked={values.isReadyTeddy}
                        onBlur={handleBlur}
                        onChange={handleChange}
                        label="Ready teddy"
                        error={errors.isReadyTeddy}
                        touched={touched.isReadyTeddy}
                        customClass={classes.readingLogCheck}
                        disabled={isFutureReadyTeddyClass}
                        className="programme-options-checkbox"
                    />
                ) : null}

                {!isFutureReadyTeddyClass && (values?.isFullProgramme || values?.isReadingLogsEnabled) && (
                    <div className="money-skills-checkbox">
                        <div className="programme-options-licence-checkbox">
                            <CommonCheckBox
                                name="isMoneySkillsAvailable"
                                checked={values?.isMoneySkillsAvailable}
                                onBlur={handleBlur}
                                onChange={handleChange}
                                label="Money Skills"
                                error={errors.isMoneySkillsAvailable}
                                touched={touched.isMoneySkillsAvailable}
                                customClass={classes.readingLogCheck}
                                disabled
                                className="programme-options-checkbox"
                            />

                            {!values?.isMoneySkillsAvailable && !isAdminOrSchoolLeader ? (
                                <CommonTooltipIcon
                                    text={
                                        'The Money Skills programme can be activated for the whole school by a school leader at no additional cost.'
                                    }
                                    customIconClass={classes.customIconClass}
                                    dataTest="money-skills-tooltip-icon"
                                />
                            ) : null}
                        </div>

                        {!values?.isMoneySkillsAvailable && isAdminOrSchoolLeader ? (
                            <Paragraph customClass="activate-money-skills-text">
                                Not activated?{' '}
                                <a
                                    role="button"
                                    data-test="activate-money-skills-link"
                                    onClick={() => setIsActivateMoneySkillsLicenceModalOpen(true)}>
                                    Activate now
                                </a>
                            </Paragraph>
                        ) : null}
                    </div>
                )}
            </div>
            {purchaseClassModal && (
                <PurchaseClassModal
                    schoolId={schoolId}
                    classId={classId}
                    open={purchaseClassModal}
                    setOpen={() => setPurchaseClassModal(false)}
                    isAdminSide={isAdminSide}
                    onMoneySkillsActivated={() => setValues({ ...values, isMoneySkillsAvailable: true })}
                />
            )}
            {isActivateMoneySkillsLicenceModalOpen && (
                <ActivateMoneySkillsLicenceModal
                    isOpen={isActivateMoneySkillsLicenceModalOpen}
                    setIsOpen={setIsActivateMoneySkillsLicenceModalOpen}
                    schoolId={schoolId}
                    onMoneySkillsActivated={() => {
                        setValues({
                            ...values,
                            isMoneySkillsAvailable: true
                        });
                        setIsActivateMoneySkillsLicenceModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

CommonProgrammeOptions.propTypes = {
    values: PropTypes.object,
    handleChange: PropTypes.func,
    handleBlur: PropTypes.func,
    errors: PropTypes.object,
    touched: PropTypes.object,
    classes: PropTypes.object,
    remainingFullProgrammedClassInfo: PropTypes.number,
    remainingTotalClassInfo: PropTypes.number,
    schoolId: PropTypes.string.isRequired,
    classId: PropTypes.number,
    isActivatePage: PropTypes.bool,
    isClassDetailPage: PropTypes.bool,
    isFullProgramme: PropTypes.bool,
    haveReadingTopics: PropTypes.object,
    setValues: PropTypes.func,
    classDetail: PropTypes.object,
    schoolDetails: PropTypes.object,
    isVisibleReadyTeddyCheckBox: PropTypes.bool,
    isAdminSide: PropTypes.bool
};

export default CommonProgrammeOptions;
