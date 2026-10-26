/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { diceInputType } from '../index';

const getWidth = (i, imgWidth, isText, widthArray, isWidthFixed, staticWidth, isTextDice, inputArray, diceValues, imageDice) => {
    let width = isText ? '64px' : '116px';

    if (imageDice) {
        width = '150px';
    }

    if (isWidthFixed) {
        return '100%';
    }

    if (imgWidth) {
        return imgWidth;
    }

    if (staticWidth) {
        return staticWidth;
    }

    if (widthArray) {
        if (isTextDice) {
            return widthArray?.[i] ? widthArray[i] : width;
        }

        const index = inputArray?.[i].findIndex((el) => el === diceValues[i]);

        if (index !== -1) {
            return widthArray?.[i]?.[index] ? widthArray[i][index] : width;
        }
    }

    return width;
};

const getHeight = (imgHeight, isText, isHeightFixed, height, imageDice) => {
    let defaultHeight = isText ? '64px' : '116px';

    if (imageDice) {
        defaultHeight = '150px';
    }

    if (isHeightFixed) {
        return '100%';
    }

    if (imgHeight) {
        return imgHeight;
    }

    if (height) {
        return height;
    }

    return defaultHeight;
};

const Dice = ({
    index,
    imgWidthProps,
    imgHeightProps,
    isText,
    widthArray,
    isWidthFixed,
    isHeightFixed,
    height,
    staticWidth,
    inputArray,
    isTextDice,
    diceValues,
    diceTypeArray,
    longTextFontSize,
    fontArray,

    isEmpty
}) => {
    const getFontSize = (v) => (v && v.toString().length >= 3 ? longTextFontSize : 'default');

    const getFontFamily = (i, isTextDice) => {
        if (fontArray) {
            if (isTextDice) {
                return fontArray?.[i] ? 'SassoonInfantRg-Regular' : 'inherit';
            }

            const index = inputArray?.[i]?.findIndex((el) => el === diceValues[i]);

            if (index !== -1) {
                return fontArray?.[i]?.[index] ? 'SassoonInfantRg-Regular' : 'inherit';
            }
        }

        return 'inherit';
    };

    if (isEmpty) {
        return (
            <div
                className="die-text-container"
                style={{
                    width: getWidth(
                        index,
                        imgWidthProps,
                        isText,
                        widthArray,
                        isWidthFixed,
                        staticWidth,
                        isTextDice,
                        inputArray,
                        diceValues,
                        diceTypeArray[index] === diceInputType.IMAGE
                    ),
                    height: getHeight(imgHeightProps, isText, isHeightFixed, height, diceTypeArray[index] === diceInputType.IMAGE)
                }}>
                <div className="die-text">?</div>
            </div>
        );
    }

    if (isText) {
        if (diceInputType.IMAGE === diceTypeArray[index]) {
            return (
                <div className="die-image-container">
                    <div
                        className="image-step-die-image"
                        style={{
                            width: getWidth(
                                index,
                                imgWidthProps,
                                isText,
                                widthArray,
                                isWidthFixed,
                                staticWidth,
                                isTextDice,
                                inputArray,
                                diceValues,
                                true
                            ),
                            height: getHeight(imgHeightProps, isText, isHeightFixed, height, true)
                        }}>
                        <img
                            style={{
                                maxWidth: getWidth(
                                    index,
                                    imgWidthProps,
                                    isText,
                                    widthArray,
                                    isWidthFixed,
                                    staticWidth,
                                    isTextDice,
                                    inputArray,
                                    diceValues,
                                    true
                                ),
                                maxHeight: getHeight(imgHeightProps, isText, isHeightFixed, height, true)
                            }}
                            src={diceValues[index]}
                        />
                    </div>
                </div>
            );
        }

        return (
            <div
                className="die-text-container"
                style={{
                    width: getWidth(index, null, isText, widthArray, isWidthFixed, staticWidth, isTextDice, inputArray, diceValues, false),
                    height: getHeight(null, isText, isHeightFixed, height, false)
                }}>
                <div
                    className="die-text"
                    style={{
                        fontSize: getFontSize(diceValues[index]),
                        fontFamily: getFontFamily(index, isTextDice)
                    }}>
                    {diceValues[index] === 0 || diceValues[index] ? diceValues[index] : '?'}
                </div>
            </div>
        );
    }

    return (
        <div className="die-image-container">
            <div className="die-image">
                <img
                    width={getWidth(
                        index,
                        imgWidthProps,
                        isText,
                        widthArray,
                        isWidthFixed,
                        staticWidth,
                        isTextDice,
                        inputArray,
                        diceValues,
                        false
                    )}
                    height={getHeight(imgHeightProps, isText, isHeightFixed, height, false)}
                    src={diceValues[index]}
                />
            </div>
        </div>
    );
};

Dice.propTypes = {
    index: PropTypes.number,
    imgWidthProps: PropTypes.string,
    imgHeightProps: PropTypes.string,
    isText: PropTypes.bool,
    widthArray: PropTypes.array,
    diceTypeArray: PropTypes.array,
    isWidthFixed: PropTypes.bool,
    isHeightFixed: PropTypes.bool,
    height: PropTypes.string,
    staticWidth: PropTypes.string,
    inputArray: PropTypes.array,
    isTextDice: PropTypes.bool,
    diceValues: PropTypes.array,
    fontArray: PropTypes.arrayOf(PropTypes.array),
    longTextFontSize: PropTypes.string,

    isEmpty: PropTypes.bool
};

export default Dice;
