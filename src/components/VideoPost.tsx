import { useVideoPlayer, VideoView } from 'expo-video';
import { type StyleProp, type ViewStyle } from 'react-native';

export function VideoPost({ uri, style }: { uri: string; style?: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  return <VideoView player={player} style={style} contentFit="contain" nativeControls allowsFullscreen />;
}
