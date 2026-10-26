import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import Carousel from 'react-material-ui-carousel';

import RenderHtml from '../CommonRenderHtml';

const ReactCarousel = ({ array }) => {
    const divRefs = useRef([]);
    const maxHeightRef = useRef(154);
    const [maxHeight, setMaxHeight] = useState(154);

    useEffect(() => {
        const calculateMaxHeight = () => {
            const heights = divRefs.current.map((div) => div?.offsetHeight || 0);
            const newMaxHeight = Math.max(...heights);

            maxHeightRef.current = Math.max(maxHeightRef.current, newMaxHeight);
        };

        calculateMaxHeight();
        setMaxHeight(maxHeightRef.current); // Update state once after calculation
    }, [array]);

    return (
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
            {array.map((item, i) => {
                const isString = typeof item === 'string';
                const text = isString ? item : item?.text;
                const fontSize = isString ? 32 : +item?.fontSize;

                return (
                    <div key={i} className="react_material_body_container">
                        <div ref={(el) => (divRefs.current[i] = el)} className="react_material_body">
                            <RenderHtml text={text} fontSize={fontSize} />
                        </div>
                    </div>
                );
            })}
        </Carousel>
    );
};

ReactCarousel.propTypes = { array: PropTypes.array };
ReactCarousel.defaultProps = { array: ['Example text 1', 'Example text 2'] };

export default ReactCarousel;
