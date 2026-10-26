import { Card } from '@mui/material';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';

import Paragraph from './../Typography/Paragraph';
import Divider from './../Divider';
import Adventure from './adventure';
import AlphabeticalCategories from './alphabeticalCategories';
import AnimalAlphabet from './animalAlphabet';
import AnimalVegetableMineral from './animalVegetableMineral';
import AToZOfSaid from './aToZOfSaid';
import BecauseInABook from './becauseInABook';
import BeginningBecause from './beginningBecause';
import BodyWriting from './bodyWriting';
import BookReviewChat from './bookReviewChat';
import BuildMyName from './buildMyName';
import CerealSentences from './cerealSentences';
import ChairInTheWorld from './chairInTheWorld';
import ClapClap from './clapClap';
import DiamondWords from './diamondWords';
import DrawIt from './drawIt';
import ExceptionWordObstacleCourse from './exceptionWordObstacleCourse';
import FindAWord from './findAWord';
import FingerSpaceLollyStick from './fingerSpaceLollyStick';
import FlipIt from './flipIt';
import Ghost from './ghost';
import GoodAndBad from './goodAndBad';
import GuessMyWord from './guessMyWord';
import GuessTheAnimal from './guessTheAnimal';
import HappyBirthday from './happyBirthday';
import HelpMeTellAStory from './helpMeTellAStory';
import IFeelSaid from './iFeelSaid';
import ImagineYouAreThere from './imagineYouAreThere';
import ImproveIt from './improveIt';
import InterviewingMyFamily from './interviewingMyFamily';
import LettersInFlour from './lettersInFlour';
import LightningInTheFridge from './lightningInTheFridge';
import MakingTheAlphabet from './makingTheAlphabet';
import MakingWords from './makingWords';
import MinisterCat from './ministerCat';
import MyCafe from './myCafe';
import MyRoom from './myRoom';
import OnOrIn from './onOrIn';
import Opposites from './opposites';
import RainbowName from './rainbowName';
import RiverPoem from './riverPoem';
import SaidSwap from './saidSwap';
import SavedOrDestroyed from './savedOrDestroyed';
import ShiftingSentences from './shiftingSentences';
import SillyAnswers from './sillyAnswers';
import SillyStatements from './sillyStatements';
import SoundsScavengerHunt from './soundsScavengerHunt';
import SpeedReading from './speedReading';
import SpellingJars from './spellingJars';
import SpellingJarsYearFiveOrSix from './spellingJarsYearFiveOrSix';
import SpellingOutMyName from './spellingOutMyName';
import SpellingPosters from './spellingPosters';
import SpotTheDifference from './spotTheDifference';
import TheAlphabetSong from './theAlphabetSong';
import TheBecauseGame from './theBecauseGame';
import TheQuestionsGame from './theQuestionsGame';
import TheTravellingAlphabet from './theTravellingAlphabet';
import TheWhyBoat from './TheWhyBoat';
import ThisPlace from './thisPlace';
import TopFiveAnimals from './topFiveAnimals';
import UpTheDictionary from './upTheDictionary';
import VictorianSampler from './victorianSampler';
import WhatIf from './whatIf';
import WhatIs from './whatIs';
import WhatsInMyPocket from './whatsInMyPocket';
import WhatsInTheBag from './whatsInTheBag';
import Why from './why';
import WordCards from './wordCards';
import WordWheels from './wordWheels';
import WouldYouRather from './wouldYouRather';
import WritingMyFullName from './writingMyFullName';

const RenderStaticActivies = ({ activityComponentName, type, context, readOnly, pupilName, isAdminView }) => {
    const getActivity = (activityComponentName) => {
        switch (activityComponentName) {
            case 'GuessTheAnimal':
                return <GuessTheAnimal type={type} />;

            case 'ClapClap':
                return <ClapClap type={type} />;

            case 'SoundsScavengerHunt':
                return <SoundsScavengerHunt type={type} context={context} readOnly={readOnly} />;

            case 'FingerSpaceLollyStick':
                return <FingerSpaceLollyStick type={type} />;

            case 'HappyBirthday':
                return <HappyBirthday type={type} />;

            case 'TheAlphabetSong':
                return <TheAlphabetSong />;

            case 'SpellingOutMyName':
                return <SpellingOutMyName />;

            case 'CerealSentences':
                return <CerealSentences pupilName={pupilName} />;

            case 'TopFiveAnimals':
                return <TopFiveAnimals type={type} />;

            case 'MakingWords':
                return <MakingWords type={type} />;

            case 'MyCafe':
                return <MyCafe />;

            case 'TheBecauseGame':
                return <TheBecauseGame type={type} />;

            case 'BecauseInABook':
                return <BecauseInABook />;

            case 'SillyStatements':
                return <SillyStatements />;

            case 'Opposites':
                return <Opposites type={type} />;

            case 'ImproveIt':
                return <ImproveIt type={type} />;

            case 'AnimalVegetableMineral':
                return <AnimalVegetableMineral type={type} />;

            case 'MakingTheAlphabet':
                return <MakingTheAlphabet />;

            case 'RainbowName':
                return <RainbowName pupilName={pupilName} type={type} />;

            case 'BuildMyName':
                return <BuildMyName pupilName={pupilName} type={type} />;

            case 'MyRoom':
                return <MyRoom type={type} readOnly={readOnly} />;

            case 'SpeedReading':
                return <SpeedReading />;

            case 'ExceptionWordObstacleCourse':
                return <ExceptionWordObstacleCourse />;

            case 'BodyWriting':
                return <BodyWriting />;

            case 'TheQuestionsGame':
                return <TheQuestionsGame type={type} />;

            case 'SillyAnswers':
                return <SillyAnswers />;

            case 'LettersInFlour':
                return <LettersInFlour type={type} />;

            case 'MinisterCat':
                return <MinisterCat />;

            case 'ThisPlace':
                return <ThisPlace />;

            case 'ChairInTheWorld':
                return <ChairInTheWorld type={type} />;

            case 'GoodAndBad':
                return <GoodAndBad type={type} />;

            case 'WhatsInMyPocket':
                return <WhatsInMyPocket type={type} />;

            case 'WordCards':
                return <WordCards />;

            case 'ShiftingSentences':
                return <ShiftingSentences type={type} />;

            case 'RiverPoem':
                return <RiverPoem type={type} />;

            case 'AToZOfSaid':
                return <AToZOfSaid type={type} />;

            case 'SpotTheDifference':
                return <SpotTheDifference />;

            case 'SpellingPosters':
                return <SpellingPosters />;

            case 'DrawIt':
                return <DrawIt />;

            case 'BeginningBecause':
                return <BeginningBecause type={type} />;

            case 'WritingMyFullName':
                return <WritingMyFullName pupilName={pupilName} />;

            case 'TheTravellingAlphabet':
                return <TheTravellingAlphabet />;

            case 'VictorianSampler':
                return <VictorianSampler type={type} />;

            case 'SpellingJars':
                return <SpellingJars type={type} />;

            case 'FindAWord':
                return <FindAWord type={type} isAdminView={isAdminView} context={context} />;

            case 'UpTheDictionary':
                return <UpTheDictionary />;

            case 'SaidSwap':
                return <SaidSwap />;

            case 'IFeelSaid':
                return <IFeelSaid />;

            case 'Why':
                return <Why />;

            case 'WhatIf':
                return <WhatIf />;

            case 'WhatIs':
                return <WhatIs />;

            case 'SavedOrDestroyed':
                return <SavedOrDestroyed />;

            case 'FlipIt':
                return <FlipIt />;

            case 'DiamondWords':
                return <DiamondWords type={type} />;

            case 'GuessMyWord':
                return <GuessMyWord type={type} />;

            case 'Ghost':
                return <Ghost type={type} />;

            case 'LightningInTheFridge':
                return <LightningInTheFridge />;

            case 'HelpMeTellAStory':
                return <HelpMeTellAStory />;

            case 'WordWheels':
                return <WordWheels type={type} />;

            case 'SpellingJarsYearFiveOrSix':
                return <SpellingJarsYearFiveOrSix type={type} />;

            case 'TheWhyBoat':
                return <TheWhyBoat type={type} />;

            case 'InterviewingMyFamily':
                return <InterviewingMyFamily type={type} />;

            case 'WouldYouRather':
                return <WouldYouRather />;

            case 'BookReviewChat':
                return <BookReviewChat />;

            case 'Adventure':
                return <Adventure />;

            case 'WhatsInTheBag':
                return <WhatsInTheBag type={type} />;

            case 'ImagineYouAreThere':
                return <ImagineYouAreThere />;

            case 'AnimalAlphabet':
                return <AnimalAlphabet />;

            case 'AlphabeticalCategories':
                return <AlphabeticalCategories type={type} />;

            case 'OnOrIn':
                return <OnOrIn />;

            default:
                if (typeof window !== 'undefined') {
                    const message = `Unknown static activity component: ${activityComponentName ?? '(none)'}`;
                    window.newrelic?.noticeError(new Error(message), { caught: true, handled: true });
                    console.warn(message);
                }
                return <Paragraph centerText text="This activity is not available." />;
        }
    };

    return (
        <Fragment>
            <Card className={`guess_the_animal_container top-${type}-border`}>
                {getActivity(activityComponentName)}
                <Divider />
            </Card>
        </Fragment>
    );
};

RenderStaticActivies.propTypes = {
    readOnly: PropTypes.bool,
    isAdminView: PropTypes.bool,
    type: PropTypes.string,
    activityComponentName: PropTypes.string,
    context: PropTypes.string,
    pupilName: PropTypes.string
};

RenderStaticActivies.defaultProps = {
    isAdminView: false
};

export default RenderStaticActivies;
