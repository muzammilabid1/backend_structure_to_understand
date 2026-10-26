import PropTypes from 'prop-types';
import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';

const CommonLazyLoading = ({ children, previousDataLength, fetchMore, hasMoreLoading, loadingContent, className, height, hasChildren }) => {
    return (
        <InfiniteScroll
            className={className}
            dataLength={previousDataLength}
            next={fetchMore}
            hasMore={hasMoreLoading}
            loader={loadingContent}
            height={height}
            hasChildren={hasChildren}>
            {children}
        </InfiniteScroll>
    );
};

CommonLazyLoading.defaultProps = {
    children: <span />,
    previousDataLength: 0,
    fetchMore: () => {},
    hasMoreLoading: false
};

CommonLazyLoading.propTypes = {
    children: PropTypes.node.isRequired,
    previousDataLength: PropTypes.number.isRequired,
    fetchMore: PropTypes.func.isRequired,
    hasMoreLoading: PropTypes.bool.isRequired,
    className: PropTypes.string,
    loadingContent: PropTypes.node,
    height: PropTypes.number,
    hasChildren: PropTypes.bool
};

export default CommonLazyLoading;
