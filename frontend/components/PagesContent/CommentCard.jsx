/* eslint-disable @next/next/no-img-element */
import { Card } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import InputField from './../../components/Shared/InputField/InputField';
import Heading3 from './../../components/Shared/Typography/Heading3';

const CommentCard = ({
    title,
    helperText,
    customClass,
    label,
    sideImg,
    textBoxImg,
    type,
    value,
    name,
    onChange,
    error,
    touched,
    onBlur,
    disabled,
    pupilImage,
    childImage,
    dataTest
}) => {
    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <div className={`comment-card-container ${type}-bg`}>
            <Card className={`comment-card ${customClass ? customClass : ''}  `}>
                {pupilImage && (
                    <aside className="child-comment-card-left-sec">
                        <img src={childImage} alt="" className="side-image" />
                    </aside>
                )}
                <aside className="comment-card-left-sec">
                    <Heading3 text={`${title} comment`} customClass="pb3" />
                    <InputField
                        disabled={disabled}
                        onChange={onChange}
                        name={name}
                        value={value}
                        multiline
                        rows={6}
                        lg={12}
                        md={12}
                        label={label}
                        helperText={<span className="helper-text">e.g. &quot;{helperText}&quot;</span>}
                        textareaBackgroundImage={`${matches ? textBoxImg : ''}`}
                        error={error}
                        touched={touched}
                        onBlur={onBlur}
                        dataTest={dataTest}
                    />
                </aside>
                {!pupilImage && (
                    <aside className="comment-card-right-sec">
                        <img src={sideImg} alt="" className="side-image" />
                    </aside>
                )}
            </Card>
        </div>
    );
};

CommentCard.propTypes = {
    title: PropTypes.string,
    helperText: PropTypes.string,
    customClass: PropTypes.string,
    sideImg: PropTypes.string,
    textBoxImg: PropTypes.string,
    label: PropTypes.string,
    type: PropTypes.string,
    name: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func,
    error: PropTypes.string,
    touched: PropTypes.bool,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
    pupilImage: PropTypes.bool,
    childImage: PropTypes.bool,
    dataTest: PropTypes.string
};
CommentCard.defaultProps = {
    // title: 'Family',
    helperText: 'It was fun using objects from around the house to do maths',
    label: 'What did Name enjoy or do well in this activity?',
    sideImg: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/parent-child-high-five.png`,
    childImage: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/base-model.png`,
    textBoxImg: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/parent-child-high-five.png`,
    type: 'general',
    pupilImage: false
};

export default CommentCard;
