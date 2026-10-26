import { useMutation } from '@apollo/client';
import { SourceTypeForOpenCounter } from 'lwp-shared';
import Link from 'next/link';
import React from 'react';

import { updateOpenCount } from '../../../graphQl/mutations';
import { getHtml } from '../../../shared/Services/handler';
import VideoCard from '../Cards/VideoCard';
import ClickableAlphabetStep from '../ClickableAlphabetStep';
import CommonAccordionForActivity from '../CommonAccordionForActivity';
import CommonAudioStep from '../CommonAudioStep';
import CommonScrollingImage from '../CommonScrollingImage';
import CommonSetByTeacherStepPreview from '../CommonSetByTeacherStepPreview';
import DiceComponent from '../Dice';
import InfantFontActivity from '../InfantFontActivity';
import StaticLwpModalPreview from '../StaticLwpModalPreview';
import Stopwatch from '../Stopwatch';
import TableActivity from '../TableActivity';
import TimerActivity from '../TimerActivity';
import LWPButton from './../Button/LWPButton';
import CommonActivityCarousel from './../CommonActivityCarousel';
import CommonDigitalChecklist from './../CommonDigitalChecklist';
import CommonImageCarousel from './../CommonImageCarousel';
import RenderHtml from './../CommonRenderHtml';
import CommonTabsStep from './../CommonTabsStep';
import TextAndImageActivity from './../TextAndImageActivity';

/** The step fields this preview reads. Each step type uses its own few; JSON blobs arrive as strings. */
interface ActivityStep {
    id?: string;
    stepType?: string;
    text?: string;
    imageUrl?: string;
    linkUrl?: string;
    linkName?: string;
    downloadUrl?: string;
    downloadName?: string;
    btnType?: string;
    properties?: string;
    fontType?: string;
    fontSize?: number;
    tableData?: string;
    tabsData?: string;
    timerData?: string;
    includeSeconds?: boolean;
    selectedModalId?: string;
    carouselData?: unknown[];
    dimensions?: string;
    accordionData?: string;
    checkListTextData?: string;
    imageCarouselData?: string;
    checklistImageData?: string;
    audioUrl?: string;
    clickableAlphabetData?: string;
    editorState?: string;
}

interface CommonActivityStepPreviewProps {
    steps?: ActivityStep[];
    /** The topic's isReading flag. */
    subject?: boolean;
    pupilData?: Parameters<typeof getHtml>[1];
    pupilActivityContext?: string;
    readOnly?: boolean;
    increaseModalOpenCount?: boolean;
    increaseLinkOpenCount?: boolean;
    sbtMediaByStepId?: Record<string, { filename?: string; parentMessage?: string }>;
}

const CommonActivityStepPreview = ({
    steps,
    subject,
    pupilData,
    pupilActivityContext,
    readOnly,
    increaseModalOpenCount = false,
    increaseLinkOpenCount = false,
    sbtMediaByStepId = {}
}: CommonActivityStepPreviewProps) => {
    const [updateOpenCountMutation] = useMutation(updateOpenCount);

    const getInputArray = (diceProperties) => {
        const inputArray = [];
        const widthArray = [];
        const fontArray = [];
        const diceTypeArray = [];

        diceProperties.forEach((prop) => {
            let input = [];

            if (prop?.diceType === 'IMAGE') {
                input = prop?.images;
            } else {
                input = prop?.inputArray?.split(',')?.map((item) => item?.trim());
            }

            inputArray.push(input);
            widthArray.push(prop?.width?.trim() ?? null);
            fontArray.push(prop?.isInfant);
            diceTypeArray.push(prop?.diceType);
        });

        return [inputArray, widthArray, fontArray, diceTypeArray];
    };

    const handleLinkClick = async (stepId, linkUrl) => {
        try {
            if (increaseLinkOpenCount) {
                updateOpenCountMutation({
                    variables: {
                        input: {
                            id: stepId,
                            type: SourceTypeForOpenCounter.LINK
                        }
                    }
                });
            }

            window.open(linkUrl, '_blank', 'noopener,noreferrer');
        } catch {
            window.open(linkUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div>
            {(steps || []).map((step, idx) => {
                if (step.stepType === 'TEXT_AND_IMAGE') {
                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            {step?.imageUrl && step?.text ? (
                                <TextAndImageActivity key={step?.stepType} type={step?.stepType} image={step?.imageUrl}>
                                    <RenderHtml text={step?.text} />
                                </TextAndImageActivity>
                            ) : step?.text ? (
                                <RenderHtml text={step?.text} />
                            ) : (
                                <TextAndImageActivity key={step?.stepType} type={step?.stepType} image={step?.imageUrl} />
                            )}
                        </div>
                    );
                }

                if (step.stepType === 'IMAGE') {
                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <TextAndImageActivity key={step?.stepType} alt={step?.text} image={step?.imageUrl} />
                        </div>
                    );
                }

                if (step.stepType === 'LINK') {
                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <div className={subject ? 'activity-btn' : 'modal-btn'}>
                                <LWPButton
                                    color={step?.btnType === 'SECONDARY' ? 'inherit' : 'primary'}
                                    btnText={step?.linkName}
                                    customClass="secondary_btn_color"
                                    onClick={() => handleLinkClick(step?.id, step?.linkUrl)}
                                />
                            </div>
                        </div>
                    );
                }

                if (step.stepType === 'DOWNLOAD') {
                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <div className={subject ? 'activity-btn' : 'modal-btn'}>
                                <Link passHref href={step?.downloadUrl} target="_blank">
                                    <LWPButton
                                        color={step?.btnType === 'SECONDARY' ? 'inherit' : 'primary'}
                                        btnText={step?.downloadName}
                                        customClass="secondary_btn_color"
                                    />
                                </Link>
                            </div>
                        </div>
                    );
                }

                if (step.stepType === 'TEXTDICE') {
                    const dice = JSON.parse(step.properties);

                    const [inputArray, widthArray, fontArray, diceTypeArray] = getInputArray(dice?.diceProperties);

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <DiceComponent
                                key={idx}
                                inputArray={inputArray}
                                // favorItems={dice?.favorItems}
                                expression={dice?.expression}
                                inputType={'TEXT'}
                                widthArray={widthArray}
                                diceTypeArray={diceTypeArray}
                                isTextDice
                                fontArray={fontArray}
                                btnText={dice?.btnText ?? null}
                                height={dice?.height}
                                longTextFontSize={dice?.longTextFontSize}
                            />
                        </div>
                    );
                }

                if (step.stepType === 'DICE') {
                    const dice = JSON.parse(step.properties);

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <DiceComponent
                                key={idx}
                                inputArray={dice?.inputArray}
                                favorItems={dice?.favorItems}
                                inputType={dice?.inputType}
                                widthArray={dice?.widthArray}
                                fontArray={dice?.fontArray}
                                expression={dice?.expression}
                                height={dice?.height}
                                longTextFontSize={dice?.longTextFontSize}
                            />
                        </div>
                    );
                }

                if (step.stepType === 'INFANT_FONT') {
                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <InfantFontActivity key={step?.stepType} fontType={step?.fontType} fontSize={step?.fontSize}>
                                <RenderHtml text={step?.text} />
                            </InfantFontActivity>
                        </div>
                    );
                }

                if (step.stepType === 'TABLE') {
                    const tableData = JSON.parse(step?.tableData);

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <TableActivity headers={tableData?.headers} rows={tableData?.rows} />
                        </div>
                    );
                }

                if (step.stepType === 'TABS') {
                    const tabsData = JSON.parse(step?.tabsData);

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <CommonTabsStep tabsData={tabsData} />
                        </div>
                    );
                }

                if (step.stepType === 'VIDEO' && step?.text) {
                    return (
                        <div
                            key={idx}
                            className="activity_contain"
                            data-test={`activity-step-${step?.stepType}`}
                            style={{ pointerEvents: 'all' }}>
                            <VideoCard videoId={step?.text} playing={false} controls isShowVideoTroubleshooting={true} />
                        </div>
                    );
                }

                if (step.stepType === 'TIMER') {
                    const timerData = JSON.parse(step?.timerData);

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <TimerActivity
                                timerDuration={+timerData?.timerDuration}
                                timerEndString={timerData?.timerEndString}
                                showTimerInSeconds={timerData?.showTimerInSeconds}
                            />
                        </div>
                    );
                }

                if (step.stepType === 'STOPWATCH') {
                    const includeSeconds = step?.includeSeconds;

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <Stopwatch includeSeconds={includeSeconds} />
                        </div>
                    );
                }

                if (step.stepType === 'MODAL') {
                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <StaticLwpModalPreview
                                btnText={step?.text}
                                btnType={step?.btnType}
                                selectedModalId={step.selectedModalId}
                                increaseModalOpenCount={increaseModalOpenCount}
                                pupilActivityContext={pupilActivityContext}
                                readOnly={readOnly}
                            />
                        </div>
                    );
                }

                if (step.stepType === 'CAROUSEL') {
                    const textCarouselData = step?.carouselData;
                    const dimensions = JSON.parse(step?.dimensions);
                    const properties = JSON.parse(step?.properties);

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <CommonActivityCarousel
                                array={textCarouselData}
                                height={dimensions?.height}
                                width={dimensions?.width}
                                properties={properties}
                            />
                        </div>
                    );
                }

                if (step.stepType === 'ACCORDION') {
                    const accordionData = JSON.parse(step?.accordionData);

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <CommonAccordionForActivity accordionData={accordionData} pupilData={pupilData} />
                        </div>
                    );
                }

                if (step.stepType === 'TEXT_ONLY_DIGITAL_CHECKLIST') {
                    const checkListTextData = JSON.parse(step?.checkListTextData);

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <CommonDigitalChecklist
                                contentType="text"
                                digitalChecklistId={step?.id}
                                checkListTextData={checkListTextData}
                                pupilActivityContext={pupilActivityContext}
                                readOnly={readOnly}
                            />
                        </div>
                    );
                }

                if (step.stepType === 'IMAGE_CAROUSEL') {
                    const imageCarouselData = JSON.parse(step?.imageCarouselData);
                    const dimensions = JSON.parse(step?.dimensions);
                    const properties = JSON.parse(step?.properties);

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            {properties?.scrollingImage ? (
                                <CommonScrollingImage array={imageCarouselData} />
                            ) : (
                                <CommonImageCarousel array={imageCarouselData} height={dimensions?.height} width={dimensions?.width} />
                            )}
                        </div>
                    );
                }

                if (step.stepType === 'DIGITAL_CHECKLIST') {
                    const checklistImageData = JSON.parse(step?.checklistImageData);

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <CommonDigitalChecklist
                                contentType="image"
                                digitalChecklistId={step?.id}
                                checklistImageData={checklistImageData}
                                pupilActivityContext={pupilActivityContext}
                                subject={subject}
                                readOnly={readOnly}
                            />
                        </div>
                    );
                }

                if (step.stepType === 'AUDIO') {
                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <CommonAudioStep audioUrl={step?.audioUrl} />
                        </div>
                    );
                }

                if (step.stepType === 'MODAL_WITH_CLICKABLE_ALPHABET') {
                    const clickableAlphabetData = JSON.parse(step?.clickableAlphabetData);

                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <ClickableAlphabetStep
                                btnText={clickableAlphabetData?.btnText ? clickableAlphabetData?.btnText : 'Click Me!'}
                                heading={clickableAlphabetData?.modalHeading}
                                btnType={clickableAlphabetData?.btnType}
                                text={clickableAlphabetData?.modalText}
                                alphabetJson={clickableAlphabetData?.alphabetJSON}
                            />
                        </div>
                    );
                }

                if (step.stepType === 'SET_BY_TEACHER') {
                    return (
                        <div key={idx} className="activity_contain" data-test={`activity-step-${step?.stepType}`}>
                            <CommonSetByTeacherStepPreview
                                step={step}
                                mediaUrl={sbtMediaByStepId?.[step.id]?.filename}
                                parentMessage={sbtMediaByStepId?.[step.id]?.parentMessage}
                                readOnly={readOnly}
                            />
                        </div>
                    );
                }

                if (step.stepType === 'EDITOR') {
                    const renderEditor = pupilData ? getHtml(step?.editorState, pupilData) : getHtml(step?.editorState);

                    return (
                        <div
                            key={idx}
                            className="activity_contain editor-step"
                            data-test={`activity-step-${step?.stepType}`}
                            style={{ pointerEvents: 'auto' }}>
                            <RenderHtml text={renderEditor} />
                        </div>
                    );
                }
            })}
        </div>
        // </div>
    );
};

export default CommonActivityStepPreview;
