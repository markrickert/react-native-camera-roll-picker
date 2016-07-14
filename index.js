'use strict';

var React = require('react');
var ReactNative = require('react-native');

var {
  CameraRoll,
  Image,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ListView,
} = ReactNative;

var CameraRollPicker = React.createClass({
  propTypes: {
    groupTypes: React.PropTypes.oneOf([
      'Album',
      'All',
      'Event',
      'Faces',
      'Library',
      'PhotoStream',
      'SavedPhotos',
    ]),

    batchSize: React.PropTypes.number,

    maximum: React.PropTypes.number,

    assetType: React.PropTypes.oneOf([
      'Photos',
      'Videos',
      'All',
    ]),

    imagesPerRow: React.PropTypes.number,

    imageMargin: React.PropTypes.number,

    callback: React.PropTypes.func,
  },

  getDefaultProps: function() {
    return {
      groupTypes: 'SavedPhotos',
      batchSize: 30,
      maximum: 15,
      imagesPerRow: 3,
      imageMargin: 5,
      selectedMarker: null,
      assetType: 'Photos',
      callback: function(d) {
        console.log(d);
      },
    };
  },

  getInitialState: function() {
    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    return {
      images: [],
      selected: [],
      lastCursor: null,
      loadingMore: false,
      noMore: false,
      dataSource: ds.cloneWithRows({}),
    };
  },

  componentDidMount: function() {
    this.fetch();
  },

  measureView(event) {
    this.setState({
      x: event.nativeEvent.layout.x,
      y: event.nativeEvent.layout.y,
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height
    })
  },

  reset: function() {
    this.setState(this.getInitialState());
    this.fetch();
  },

  fetch: function() {
    if (!this.state.loadingMore) {
      this.setState({ loadingMore: true }, () => { this._fetch(); });
    }
  },

  _fetch: function() {

    var fetchParams = {
      first: this.props.batchSize,
      groupTypes: this.props.groupTypes,
      assetType: this.props.assetType,
    };

    if (Platform.OS === "android") {
      // not supported in android
      delete fetchParams.groupTypes;
    }

    if (this.state.lastCursor) {
      fetchParams.after = this.state.lastCursor;
    }

    CameraRoll.getPhotos(fetchParams)
      .then((data) => this._appendImages(data), (e) => console.log(e));
  },

  _appendImages: function(data) {
    var assets = data.edges;
    // android will return image which width and height = -1;
    var images = assets.map((asset) => asset.node.image).filter(image => image.width > 0 && image.height > 0);

    this.setState({
      loadingMore: false,
    });

    if (!data.page_info.has_next_page) {
      this.setState({
        noMore: true,
      });
    }

    const allImages = this.state.images.concat(images)

    if (assets.length > 0) {
      this.setState({
        lastCursor: data.page_info.end_cursor,
        images: allImages,
        dataSource: this.state.dataSource.cloneWithRows(allImages),
      })
    }
  },

  _selectImage: function(image) {
    var selected = this.state.selected;

    var index = selected.indexOf(image);

    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      if (selected.length < this.props.maximum) {
        selected.push(image);
      } else if (this.props.maximum === 1) {
        selected = [image];
      }
    }

    this.setState({
      selected: selected,
    });

    this.props.callback(this.state.selected);
  },

  onEndReached: function() {
    if (!this.state.noMore) {
      this.fetch();
    }
  },

  renderItem: function(image: string, rowID: number) {
    const imageSize = (this.state.width / this.props.imagesPerRow) - (this.props.imagesPerRow * this.props.imageMargin)

    return (
      <TouchableOpacity
        key={image.uri}
        style={{margin: this.props.imageMargin / 2}}
        onPress={this._selectImage.bind(null, image.uri)}>
        <Image
          style={{width: imageSize, height: imageSize}}
          source={{ uri: image.uri }}>
          {this.renderSelectedMarker(image)}
        </Image>
      </TouchableOpacity>
    )
  },

  renderSelectedMarker: function(image) {
    if (this.state.selected.indexOf(image.uri) >= 0) {
      if (this.props.selectedMarker) {
        return (
          this.props.selectedMarker
        )
      } else {
        return (
          <Image
            style={styles.checkIcon}
            source={require('./circle-check.png')}
          />
        )
      }
    } else {
      return null
    }
  },

  renderGroup: function(group) {
    var that = this;
    var items = group.map(function(item, index) {
      return that.renderItem(item, index);
    });

    return (
      <View style={styles.group}>
        {items}
      </View>
    );
  },

  render: function() {
    const groups = this.groupItems(this.state.images, this.props.imagesPerRow);
    return (
      <View onLayout={(event) => this.measureView(event)}>
        <ListView
          {...this.props}
          onEndReached={this.onEndReached}
          scrollEventThrottle={16}
          dataSource={this.state.dataSource.cloneWithRows(groups)}
          renderRow={this.renderGroup}
          enableEmptySections />
      </View>
    );
  },

  groupItems: function(items, imagesPerRow) {
      var itemsGroups = [];
      var group = [];
      items.forEach(function(item) {
        if (group.length === imagesPerRow) {
          itemsGroups.push(group);
          group = [item];
        } else {
          group.push(item);
        }
      });

      if (group.length > 0) {
        itemsGroups.push(group);
      }

      return itemsGroups;
  },
});

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  checkIcon: {
    position: 'absolute',
    width: 25,
    height: 25,
    top: 5,
    right: 5,
    backgroundColor: 'transparent',
  },
});

module.exports = CameraRollPicker;
