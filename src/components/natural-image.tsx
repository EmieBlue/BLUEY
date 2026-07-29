import { Image, type ImageLoadEventData, type ImageStyle } from 'expo-image';
import { useState } from 'react';
import type { StyleProp } from 'react-native';

/**
 * Renders an image at its NATURAL aspect ratio, so nothing is cropped — tall
 * images show tall, wide images show wide. Uses a 16:9 placeholder ratio until
 * the image reports its real dimensions via onLoad, then snaps to the true shape.
 */
export function NaturalImage({
  uri,
  radius = 12,
  style,
}: {
  uri: string;
  radius?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const [ratio, setRatio] = useState(16 / 9);
  return (
    <Image
      source={{ uri }}
      contentFit="contain"
      transition={150}
      onLoad={(e: ImageLoadEventData) => {
        const w = e.source?.width;
        const h = e.source?.height;
        if (w && h) setRatio(w / h);
      }}
      style={[{ width: '100%', aspectRatio: ratio, borderRadius: radius }, style]}
    />
  );
}
