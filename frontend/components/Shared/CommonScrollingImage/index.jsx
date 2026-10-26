/* eslint-disable @next/next/no-img-element */
import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import React from 'react';

import RenderHtml from '../CommonRenderHtml';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        overflow: 'auto',
        gap: '8px'
        // height: '200px',
    },
    image: {
        margin: '0 3px'
    }
});

const CommonScrollingImage = ({ array }) => {
    const classes = useStyles();

    return (
        <div className={classes?.root}>
            {array.map((item) => {
                if (item?.type === 'TEXT') {
                    return (
                        <div className={`react_material_body`}>
                            <RenderHtml text={item?.textEditorState} />
                        </div>
                    );
                } else {
                    return <img key={item.key} className={classes?.image} src={item?.imageUrl} alt={item?.alt} />;
                }
            })}
        </div>
    );
};

CommonScrollingImage.propTypes = { array: PropTypes.array.isRequired };

export default CommonScrollingImage;
