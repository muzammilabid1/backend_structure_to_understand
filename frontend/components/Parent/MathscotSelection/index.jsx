/* eslint-disable @next/next/no-img-element */
import { useQuery } from '@apollo/client';
import { Grid, Paper } from '@mui/material';
import { makeStyles } from '@mui/styles';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { DEFAULT_EMPTY_IMAGE, MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { capitalizeFirstLetter, ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonLoading from '../../Shared/CommonLoading';
import Heading1 from '../../Shared/Typography/Heading1';
import Paragraph from '../../Shared/Typography/Paragraph';

// Queries

const getStaticPeriodForMathscotSelection = gql`
    query getStaticPeriod($index: Float!) {
        getStaticPeriod(index: $index) {
            index
            characters
            colours
        }
        getTshirts {
            id
            imageIconPath
        }
    }
`;

// Component
const useStyles = makeStyles((theme) => ({
    mathscotSubheding: {
        maxWidth: '375px',
        margin: '0 auto'
    },
    root: {
        flexGrow: 1
    },
    paper: {
        padding: theme.spacing(2),
        margin: 'auto',
        maxWidth: '152px',
        maxHeight: '135px'
    },
    image: {
        width: '100%',
        height: '100%'
    },
    img: {
        margin: 'auto',
        display: 'block',
        maxWidth: '100%',
        maxHeight: '100%'
    },
    grid_margin: {
        justifyContent: 'center',
        marginTop: 50
    }
}));

const MathscotSelection = ({ onClick, pupilTopicPeriodIndex }) => {
    const classes = useStyles();
    const { callSnackbar } = useContext(ThemeContext);
    const [characters, setCharacters] = useState([]);
    const [colors, setColors] = useState([]);
    const [shirts, setShirts] = useState([]);

    const {
        loading,
        error,
        data: staticPeriod
    } = useQuery(getStaticPeriodForMathscotSelection, {
        variables: { index: pupilTopicPeriodIndex }
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        if (staticPeriod?.getStaticPeriod?.characters?.length > 0) {
            setCharacters(
                staticPeriod?.getStaticPeriod?.characters?.map((ch) => ({
                    image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.PUPILMATHSCOTS}/${ch}/head.png`,
                    id: ch
                }))
            );

            setColors(
                staticPeriod?.getStaticPeriod?.colours?.map((cl) => ({
                    image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.PUPILMATHSCOTCOLORS}/${getColor(cl)}.png`,
                    id: cl,
                    text: capitalizeFirstLetter(cl)
                }))
            );
        }

        if (staticPeriod?.getTshirts?.length > 0) {
            setShirts(
                staticPeriod?.getTshirts?.map((shirt) => ({
                    id: shirt.id,
                    image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.PUPILMATHSCOTICONS}/${shirt.imageIconPath}`
                }))
            );
        }
    }, [staticPeriod]);

    const getColor = (color) => {
        if (color === 'NATURAL') return 'GRAY';

        return color.toUpperCase();
    };

    const [selectedCharacter, setSelectedCharacter] = useState(null);
    const [selectedShirt, setSelectedShirt] = useState(null);
    const [selectedColor, setSelectedColor] = useState(null);

    const getTShirtName = (shirtName) => {
        switch (shirtName) {
            case 'shirt1':
                return 'TShirt1';

            case 'shirt2':
                return 'TShirt2';

            case 'shirt3':
                return 'TShirt3';

            default:
                return 'TShirt1';
        }
    };

    if (loading) return <CommonLoading />;

    return (
        <div>
            <Heading1 text="Create your new Mathscot" centerText customClass="main-heading" />
            <div className={classes.mathscotSubheding}>
                <Paragraph text="Please choose your animal, shirt and colour from below." centerText />
            </div>

            <Grid container className={`mathscot_container ${classes.grid_margin}`}>
                <Grid container className="mathscot_1" lg={8} md={9} spacing={1}>
                    {characters.map((character, key) => (
                        <Grid
                            data-test={`mathscot-character-${key}`}
                            key={key}
                            onClick={() => setSelectedCharacter(character.id)}
                            className={`mathscot_2`}
                            lg={4}
                            md={4}
                            sm={4}
                            xs={4}
                            item>
                            <Paper className={`grid_img ${classes.paper} ${selectedCharacter === character.id ? 'active' : ''}`}>
                                <div className="mathscot_img">
                                    <img className={classes.img} alt="complex" src={character.image} />
                                </div>
                            </Paper>
                        </Grid>
                    ))}
                    {shirts.map((shirt, key) => (
                        <Grid
                            key={key}
                            onClick={() => setSelectedShirt(shirt.id)}
                            className="mathscot_2"
                            lg={4}
                            md={4}
                            sm={4}
                            xs={4}
                            item
                            data-test={`mathscot-shirt-${key}`}>
                            <Paper className={`grid_img ${classes.paper} ${selectedShirt === shirt.id ? 'active' : ''}`}>
                                <img className={classes.img} alt="complex" src={shirt.image} />
                            </Paper>
                        </Grid>
                    ))}
                    {colors.map((color, key) => (
                        <Grid
                            key={key}
                            onClick={() => setSelectedColor(color.id)}
                            className="mathscot_2"
                            lg={4}
                            md={4}
                            sm={4}
                            xs={4}
                            item
                            data-test={`mathscot-color-${key}`}>
                            <Paper className={`grid_img grid_rev ${classes.paper} ${selectedColor === color.id ? 'active' : ''}`}>
                                <img className={classes.img} alt="complex" src={color.image} />
                                {color.text && <Paragraph bold customClass="paragraph_text" text={color.text} />}
                            </Paper>
                        </Grid>
                    ))}
                </Grid>

                <Grid lg={4} md={12} sm={12} xs={12} item>
                    <img
                        src={
                            selectedCharacter && selectedShirt && selectedColor
                                ? `${process.env.NEXT_PUBLIC_GRAPHQL_BASE}/mathscots/${selectedShirt}_${selectedCharacter}_${selectedColor}_600.png`
                                : DEFAULT_EMPTY_IMAGE
                        }
                        className={`img_custum_1 `}
                        alt="complex"
                    />
                </Grid>
                <div className="mathscote_btn">
                    <LWPButton
                        disabled={!(selectedCharacter && selectedShirt && selectedColor)}
                        onClick={() =>
                            onClick({
                                image: `${process.env.NEXT_PUBLIC_GRAPHQL_BASE}/mathscots/${selectedShirt}_${selectedCharacter}_${selectedColor}_600.png`,
                                character: selectedCharacter.toUpperCase(),
                                colour: selectedColor.toUpperCase(),
                                shirt: getTShirtName(selectedShirt)
                            })
                        }
                        btnText="Create my new mathscot"
                        dataTest={'create-mathscot-submit-button'}
                    />
                </div>
            </Grid>
        </div>
    );
};

MathscotSelection.propTypes = {
    onClick: PropTypes.func,
    pupilTopicPeriodIndex: PropTypes.number
};

export default MathscotSelection;
