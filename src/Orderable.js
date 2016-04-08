import classNames from 'classnames';
import React from 'react';
import styles from './Orderable.scss';

class Orderable extends React.Component {
  static propTypes = {
    axis: React.PropTypes.string,
    className: React.PropTypes.string,
    itemGetter: React.PropTypes.func.isRequired,
    itemIds: React.PropTypes.array.isRequired,
    itemSize: React.PropTypes.number.isRequired,
    logger: React.PropTypes.func,
    onChange: React.PropTypes.func.isRequired,
  };

  static defaultProps = {
    axis: 'y',
  };

  constructor(props) {
    super(props);

    const { itemIds } = props;
    this.state = {
      currentMousePosition: 0,
      draggingId: null,
      itemIds,
      originalItemIds: null,
      originalItemPosition: 0,
      startMousePosition: 0,
    };

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  clamp(itemPosition) {
    const { itemSize } = this.props;
    const { itemIds } = this.state;
    return Math.max(0, Math.min(itemSize * (itemIds.length - 1), itemPosition));
  }

  componentWillReceiveProps(nextProps) {
    if (!this.isDragging(this.state)) {
      this.setState({
        itemIds: nextProps.itemIds,
      });
    }
  }

  getItemPositionProperty() {
    const { axis } = this.props;
    return axis === 'x' ? 'left' : 'top';
  }

  getMousePositionProperty() {
    const { axis } = this.props;
    return axis === 'x' ? 'clientX' : 'clientY';
  }

  getSizeProperty() {
    const { axis } = this.props;
    return axis === 'x' ? 'width' : 'height';
  }

  handleMouseDown(id, e) {
    const { itemSize, onDragStart } = this.props;
    const { itemIds } = this.state;
    e.stopPropagation();
    const draggingIndex = itemIds.indexOf(id);
    this.setState({
      currentMousePosition: e[this.getMousePositionProperty()],
      draggingId: id,
      // Save the original item id order so that we can use transitions
      // During a drag, the item id set does not change
      originalItemIds: itemIds,
      originalItemPosition: itemSize * draggingIndex,
      startMousePosition: e[this.getMousePositionProperty()],
    });

    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);

    onDragStart();
  }

  handleMouseMove(e) {
    const { itemSize } = this.props;
    const { draggingId, itemIds, originalItemPosition, startMousePosition } = this.state;
    const currentMousePosition = e[this.getMousePositionProperty()];
    this.setState({
      currentMousePosition,
    });

    // If the item is moved and covers more than 50% of a different item, swap places.
    const draggingIndex = itemIds.indexOf(draggingId);
    const itemPosition = this.clamp(
      originalItemPosition + currentMousePosition - startMousePosition
    );
    let newItemIds;
    if (draggingIndex !== 0) {
      const prevIndex = draggingIndex - 1;
      const prevItemPosition = itemSize * prevIndex;
      if ((itemPosition - prevItemPosition) / itemSize < 0.5) {
        this.log('swap prev', draggingIndex);
        newItemIds = itemIds.slice();
        newItemIds[prevIndex] = draggingId;
        newItemIds[draggingIndex] = itemIds[prevIndex];
      }
    }

    if (draggingIndex !== itemIds.length) {
      const nextIndex = draggingIndex + 1;
      const nextItemPosition = itemSize * nextIndex;
      if ((nextItemPosition - itemPosition) / itemSize < 0.5) {
        this.log('swap next', draggingIndex);
        newItemIds = itemIds.slice();
        newItemIds[nextIndex] = draggingId;
        newItemIds[draggingIndex] = itemIds[nextIndex];
      }
    }

    if (newItemIds) {
      this.log('new item ids', newItemIds);
      this.setState({
        itemIds: newItemIds,
      });
    }
  }

  handleMouseUp() {
    const { onChange } = this.props;

    this.setState({
      draggingId: null,
    }, () => {
      onChange(this.state.itemIds);
    });

    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  isDragging(state) {
    const { draggingId } = state;
    return draggingId !== null;
  }

  log(...args) {
    const { logger } = this.props;
    if (logger) {
      logger(...args);
    }
  }

  render() {
    const {
      axis,
      className,
      itemGetter,
      itemSize,
    } = this.props;

    const {
      currentMousePosition,
      draggingId,
      itemIds,
      originalItemIds,
      originalItemPosition,
      startMousePosition,
    } = this.state;

    const sortedItemIds = this.isDragging(this.state) ? originalItemIds : itemIds;

    return (
      <div
        className={className}
        style={{
          [this.getSizeProperty()]: itemSize * itemIds.length,
        }}
      >
        {sortedItemIds.map(id => {
          const index = itemIds.indexOf(id);
          const draggingItem = draggingId === id;
          const itemComponent = itemGetter(id, {
            onMouseDown: e => this.handleMouseDown(id, e),
          });

          return React.cloneElement(itemComponent, {
            className: classNames(
              styles.item,
              styles[`item--${axis}`],
              this.isDragging(this.state) && styles['item--dragging'],
              draggingItem && styles['item--draggingItem'],
              itemComponent.props.className
            ),
            key: id,
            style: {
              [this.getItemPositionProperty()]: draggingItem ?
                this.clamp(originalItemPosition + currentMousePosition - startMousePosition) :
                itemSize * index,
              [this.getSizeProperty()]: itemSize,
            },
          });
        })}
      </div>
    );
  }
}

export default Orderable;
