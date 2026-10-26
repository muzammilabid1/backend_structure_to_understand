/* eslint-disable @next/next/no-img-element */
import { debounce, useMediaQuery, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import Carousel from 'react-material-ui-carousel';

import RenderHtml from '../CommonRenderHtml';

const CommonActivityCarousel = ({ array, height, width, properties }) => {
    const divRefs = useRef([]);
    const maxHeightRef = useRef(154);
    const [maxHeight, setMaxHeight] = useState(154);
    const theme = useTheme();

    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [shouldRenderHidden, setShouldRenderHidden] = useState({ open: false, maxWidth: null });

    const maxOffsetWidth = () => {
        let maxOffsetWidth = 0;

        divRefs.current.forEach((element) => {
            if (element) {
                const width = element.offsetWidth;

                if (width > maxOffsetWidth) {
                    maxOffsetWidth = width;
                }
            }
        });

        return maxOffsetWidth;
    };

    useEffect(() => {
        const handleResize = debounce(() => {
            setShouldRenderHidden({ open: true, maxWidth: maxOffsetWidth() });
        }, 200);

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [divRefs]);

    useEffect(() => {
        if (shouldRenderHidden?.open) {
            calculateMaxHeight();
        }
    }, [shouldRenderHidden]);

    useEffect(() => {
        setShouldRenderHidden({ open: true, maxWidth: maxOffsetWidth() });
    }, [array]);

    const calculateMaxHeight = () => {
        if (!divRefs.current) return;

        const heights = divRefs.current.map((div) => div?.offsetHeight || 0);

        const newMaxHeight = Math.max(...heights);

        maxHeightRef.current = newMaxHeight;
        setMaxHeight(newMaxHeight);
        setShouldRenderHidden({ ...shouldRenderHidden, open: false });
    };

    const renderContent = (item, i, isScrollingImage, maxWidth) => {
        return (
            <div key={i} className="react_material_body_container">
                {item?.type === 'TEXT' ? (
                    <div
                        ref={(el) => (divRefs.current[i] = el)}
                        className={`react_material_body ${isScrollingImage ? 'render_text_scrollingImage' : 'render_text'}`}
                        style={{ width: maxWidth }}>
                        <RenderHtml text={item?.textEditorState} className="carousel-text" />
                    </div>
                ) : (
                    <div ref={(el) => (divRefs.current[i] = el)} className="image-carousel-container carousel-container">
                        <img
                            height={height || (isMobile ? '180px' : '250px')}
                            width={width || '80%'}
                            src={item?.imageUrl}
                            alt={`image ${i + 1}: ${item?.alt}`}
                            className={`image-fit-contain ${isScrollingImage ? 'img_fit_contain' : ''}`}
                        />

                        {item?.labelEditorState ? <RenderHtml text={item?.labelEditorState} className={'render_label'} /> : null}
                    </div>
                )}
            </div>
        );
    };

    if (properties?.scrollingImage) {
        return <div className="activity_carousel_container">{array.map((item, i) => renderContent(item, i, true))}</div>;
    }

    return (
        <>
            <Carousel
                className="react_material"
                navButtonsAlwaysVisible={true}
                navButtonsProps={{
                    className: 'custom_button'
                }}
                height={maxHeight}
                autoPlay={false}
                animation="slide"
                NextIcon={<span className="material-icons">navigate_next</span>}
                PrevIcon={<span className="material-icons">navigate_before</span>}>
                {array.map((item, i) => renderContent(item, i, false))}
            </Carousel>
            {shouldRenderHidden?.open && (
                <div className="hidden-carousel-container">
                    {array.map((item, i) => renderContent(item, i, false, shouldRenderHidden?.maxWidth))}
                </div>
            )}
        </>
    );
};

CommonActivityCarousel.propTypes = {
    array: PropTypes.arrayOf(
        PropTypes.shape({
            type: PropTypes.oneOf(['TEXT', 'IMAGE']).isRequired,
            imageUrl: PropTypes.string,
            textEditorState: PropTypes.string,
            labelEditorState: PropTypes.string,
            alt: PropTypes.string
        })
    ).isRequired,
    height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    properties: PropTypes.shape({
        scrollingImage: PropTypes.bool
    })
};

export default CommonActivityCarousel;
