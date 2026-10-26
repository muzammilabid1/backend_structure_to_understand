/* eslint-disable @next/next/no-img-element */
import Handlebars from 'handlebars/dist/cjs/handlebars';
import { isEmpty, random, range, times } from 'lodash';
import dynamic from 'next/dynamic';
import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useState } from 'react';

import { escapeHtmlTags } from '../../../shared/Services/handler';
import LwpButton from '../Button/LWPButton';
import Dice from './modules/Dice';

const JsxParser = dynamic(() => import('react-jsx-parser'), { ssr: false });

export const diceInputType = {
    TEXT: 'TEXT',
    IMAGE: 'IMAGE'
};

const getRandomValueFromArray = (values) => values[random(0, values.length - 1)];

const PreloadImages = ({ images }) => {
    return <div style={{ display: 'none' }}>{images && images.map((im, i) => <img key={i} src={im} />)}</div>;
};

PreloadImages.propTypes = {
    images: PropTypes.array,
    i: PropTypes.number
};

const DiceComponent = ({
    onRollComplete,
    inputArray,
    diceTypeArray,
    favorItems,
    inputType,
    longTextFontSize,
    expression,
    smallerThanItems,
    btnText,
    imgWidthProps,
    imgHeightProps,
    isWidthFixed,
    isHeightFixed,
    widthArray,
    fontArray,
    height,
    staticWidth,
    isTextDice
}) => {
    const numberOfDice = inputArray.length;
    const isSmallerThanItems = smallerThanItems && smallerThanItems.length > 0;
    const totalRollMilliSeconds = isSmallerThanItems ? 800 : 1500;
    const eachRollMilliSecond = 100;
    const [diceValues, setDiceValues] = useState([]);
    const [favorIndex, setFavorIndex] = useState(0);
    const [isRolling, setIsRolling] = useState(false);
    const isText = inputType === diceInputType.TEXT;

    expression =
        null != expression && '' !== expression.trim()
            ? expression
            : times(numberOfDice)
                  .map((i) => `{{dice${i + 1}}}`)
                  .join('');

    const getNextDiceValues = () => inputArray.map((i) => getRandomValueFromArray(i));

    const isInValidDiceValues = (diceValuesToCheck) => {
        return (
            isSmallerThanItems &&
            smallerThanItems.some(([greaterIndex, smallerIndex]) => {
                return diceValuesToCheck[greaterIndex] <= diceValuesToCheck[smallerIndex];
            })
        );
    };

    const randomDiceValues = () => {
        setDiceValues(getNextDiceValues());
    };

    const rollDice = useCallback(() => {
        setIsRolling(true);
        const id = setInterval(randomDiceValues, eachRollMilliSecond);

        const stopInterval = () => {
            const favorItem = favorItems[favorIndex];

            if (favorItem) {
                setTimeout(() => {
                    setDiceValues(favorItem);
                    setFavorIndex((f) => ++f);
                    setIsRolling(false);
                    clearInterval(id);
                }, eachRollMilliSecond);
            } else {
                setIsRolling(false);
                clearInterval(id);
            }
        };

        setTimeout(() => {
            stopInterval();
        }, totalRollMilliSeconds);
    }, [favorItems, setIsRolling, setIsRolling, setDiceValues]);

    useEffect(() => {
        if (!isRolling && diceValues && diceValues.length > 0) {
            if (isSmallerThanItems && isInValidDiceValues(diceValues)) {
                rollDice();
            } else {
                onRollComplete && onRollComplete(diceValues);
            }
        }
    }, [isRolling, diceValues, onRollComplete, rollDice]);

    const dice = times(numberOfDice).map((i) => (
        <div className={'mb2'} style={{ display: 'inline-block' }}>
            <Dice
                key={i}
                index={i}
                widthArray={widthArray}
                imgWidthProps={imgWidthProps}
                imgHeightProps={imgHeightProps}
                staticWidth={staticWidth}
                diceTypeArray={diceTypeArray}
                isText={isText}
                inputArray={inputArray}
                diceValues={diceValues}
                isWidthFixed={isWidthFixed}
                isHeightFixed={isHeightFixed}
                isTextDice={isTextDice}
                height={height}
                longTextFontSize={longTextFontSize}
                fontArray={fontArray}
                isEmpty={isEmpty(diceValues)}
            />
        </div>
    ));

    const ExpressionComponent = () => {
        Handlebars.registerHelper('fraction', function (adobe, below) {
            return new Handlebars.SafeString(`
                    <div>
                        <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: .5rem; font-size: 26px;">
                            ${adobe}
                        </div>
                        <hr />
                        <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: .5rem; font-size: 26px;">
                            ${below}
                        </div>
                    </div>
                `);
        });

        // Add break lines
        const preparedExpression = escapeHtmlTags(expression)
            .split('{{break}}')
            .map(
                (line) => `
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: .5rem; font-size: 26px;">
                        ${line}
                    </div>
                `
            )
            .join('');

        const firstCompileParams = {};
        const params = {};
        const components = {};

        for (const [index, die] of dice.entries()) {
            firstCompileParams[`dice${index + 1}`] = `{{dice${index + 1}}}`;
            params[`dice${index + 1}`] = new Handlebars.SafeString(`<Dice${index + 1}/>`);
            components[`Dice${index + 1}`] = () => die;
        }

        let template, rendered;

        try {
            template = Handlebars.compile(preparedExpression);
            template = Handlebars.compile(template(firstCompileParams));
            rendered = template(params);
        } catch {
            return <p style={{ color: 'red' }}>Invalid expression.</p>;
        }

        return <JsxParser components={components} jsx={rendered} />;
    };

    /* @@@FIX - currently preloading images from first die */
    return (
        <>
            {!isText && <PreloadImages images={inputArray[0]} />}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    marginTop: 15
                }}>
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        width: '100%',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                    <ExpressionComponent />
                </div>
                <div className="mt2 activity_contain_roll_btn">
                    <LwpButton color="inherit" disabled={isRolling} onClick={rollDice} btnText={btnText ?? 'Roll'} />
                </div>
            </div>
        </>
    );
};

/*
favorItems: Its an array that holds the dice values that should be shown on the "i"th roll
    Eg:
        For 2 dice with sequence of 1-6, if the dice value has to be 2 and 3 on each dice respectively for "2"nd roll then,
            favorItems: [
                [],
                [2, 3]
            ]

    NOTE: Might take time based on the conditions
    smallerThanItems: Its an array that holds the dice value that should be greater than the other
    Eg:
        For 3 dice if, 
        - 0th dice must be greater than 1st
        - 1st dice must be greater than 2nd
        then the input must be like below
        smallerThanItems: [
            [0, 1],
            [1, 2]
        ]
*/

DiceComponent.propTypes = {
    onRollComplete: PropTypes.func.isRequired,
    inputArray: PropTypes.arrayOf(PropTypes.array),
    widthArray: PropTypes.arrayOf(PropTypes.array),
    fontArray: PropTypes.arrayOf(PropTypes.array),
    favorItems: PropTypes.arrayOf(PropTypes.array),
    diceTypeArray: PropTypes.arrayOf(PropTypes.array),
    smallerThanItems: PropTypes.arrayOf(PropTypes.array),
    inputType: PropTypes.string,
    longTextFontSize: PropTypes.string,
    expression: PropTypes.string,
    btnText: PropTypes.string,
    height: PropTypes.string,
    isWidthFixed: PropTypes.bool,
    isHeightFixed: PropTypes.bool,
    isTextDice: PropTypes.bool,
    imgWidthProps: PropTypes.string,
    imgHeightProps: PropTypes.string,
    staticWidth: PropTypes.string
};

DiceComponent.defaultProps = {
    inputArray: [range(1, 7), range(1, 7)],
    diceTypeArray: [],
    favorItems: [],
    smallerThanItems: [],
    inputType: diceInputType.TEXT,
    longTextFontSize: '16px',
    expression: '',
    btnText: 'Roll',
    isTextDice: false,
    // imgWidthProps: '116px',
    // imgHeightProps: '116px'
    imgWidthProps: '',
    imgHeightProps: '',
    isWidthFixed: false,
    isHeightFixed: false
};

export default DiceComponent;
