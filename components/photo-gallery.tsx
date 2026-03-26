import { Image } from 'expo-image';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';

import { Localization } from '@/constants/localization';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { IssuePhotoResponse } from '@/types/issues';

const GALLERY_HEIGHT = 250;

type ValidPhoto = IssuePhotoResponse & { url: string };

function isValidPhoto(p: IssuePhotoResponse): p is ValidPhoto {
  return p.url != null;
}

type PhotoGalleryProps = {
  photos: IssuePhotoResponse[];
};

function PhotoItem({
  item,
  width,
  onPress,
}: {
  item: ValidPhoto;
  width: number;
  onPress: (id: string) => void;
}) {
  const handlePress = useCallback(() => onPress(item.id), [onPress, item.id]);

  return (
    <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel={item.description || Localization.detail.photoAlt}>
      <Image
        source={{ uri: item.url }}
        style={[styles.photo, { width }]}
        contentFit="cover"
        transition={200}
        recyclingKey={item.id}
        accessible={false}
      />
    </Pressable>
  );
}

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 } as const;

const keyExtractor = (item: ValidPhoto) => item.id;

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const border = useThemeColor({}, 'border');
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<ValidPhoto>>(null);
  const { width: screenWidth } = useWindowDimensions();

  const validPhotos = photos.filter(isValidPhoto);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<ValidPhoto>[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const viewerImages = useMemo(
    () => validPhotos.map((p) => ({ uri: p.url })),
    [validPhotos],
  );

  const handlePhotoPress = useCallback((id: string) => {
    const index = validPhotos.findIndex((p) => p.id === id);
    if (index >= 0) {
      setViewerIndex(index);
      setViewerVisible(true);
    }
  }, [validPhotos]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth],
  );

  if (validPhotos.length === 0) {
    return <View style={[styles.placeholder, { backgroundColor: border }]} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={validPhotos}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <PhotoItem item={item} width={screenWidth} onPress={handlePhotoPress} />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
      />

      {validPhotos.length > 1 && (
        <View style={styles.dotsContainer} pointerEvents="none">
          {validPhotos.map((photo, index) => (
            <View
              key={photo.id}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === activeIndex
                      ? '#FFFFFF'
                      : 'rgba(255,255,255,0.5)',
                },
              ]}
            />
          ))}
        </View>
      )}

      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: GALLERY_HEIGHT,
  },
  photo: {
    height: GALLERY_HEIGHT,
  },
  placeholder: {
    height: GALLERY_HEIGHT,
    width: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: Spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.xs,
    borderCurve: 'continuous',
  },
});
