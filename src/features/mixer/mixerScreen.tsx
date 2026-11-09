import React, { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getAllBirds } from '../../data/birdCatalog';
import { useAudioClipController } from '../../audio/audioEngine';
import { ReactNativeAudioEngine } from '../../audio/ReactNativeAudioEngine';
import { BirdTrackRow } from './components/birdTrackRow';

export function MixerScreen() {
  const birds = useMemo(() => getAllBirds(), []);

  const { tracks, playTrack, stopTrack, stopAll, setTrackVolume } =
    useAudioClipController(() => new ReactNativeAudioEngine());

  const activeCount = useMemo(
    () =>
      Object.values(tracks).filter(
        (t) => t.status === 'playing' || t.status === 'loading'
      ).length,
    [tracks]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.badge}>SOUNDSCAPE MIXER</Text>
          <Text style={styles.headerTitle}>All Birds ({birds.length})</Text>
          <Text style={styles.headerSubtitle}>
            {activeCount === 0
              ? 'Tap Play on multiple cards to layer sounds'
              : `${activeCount} bird${activeCount > 1 ? 's' : ''} active`}
          </Text>
        </View>

        {activeCount > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={stopAll}
            style={({ pressed }) => [
              styles.stopAllButton,
              pressed && styles.stopAllPressed,
            ]}
          >
            <Text style={styles.stopAllText}>Stop All</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={birds}
        keyExtractor={(item) => item.speciesId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <BirdTrackRow
            species={item}
            trackState={tracks[item.speciesId]}
            onPlay={playTrack}
            onStop={stopTrack}
            onVolumeChange={setTrackVolume}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8e4',
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2d6a4f',
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1b4332',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#52796f',
    marginTop: 2,
  },
  stopAllButton: {
    backgroundColor: '#ae2012',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stopAllPressed: {
    opacity: 0.8,
  },
  stopAllText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
});

// import React, { useMemo } from 'react';
// import {
//   ActivityIndicator,
//   Pressable,
//   StyleSheet,
//   Text,
//   View,
// } from 'react-native';
// import { getBirdById } from '../../data/birdCatalog';
// import { useAudioClipController } from '../../audio/audioEngine';
// import { ReactNativeAudioEngine } from '../../audio/ReactNativeAudioEngine';

// const DEFAULT_SPECIES_ID = 'black-capped-chickadee';

// export function MixerScreen() {
//   const species = useMemo(() => getBirdById(DEFAULT_SPECIES_ID), []);
//   const clip = species?.recordings[0];

//   const { status, errorMessage, play, stop } = useAudioClipController(
//     () => new ReactNativeAudioEngine()
//   );

//   if (!species || !clip) {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.errorText}>
//           No test clip found in localBirdCatalog for "{DEFAULT_SPECIES_ID}".
//         </Text>
//       </View>
//     );
//   }

//   const isLoading = status === 'loading';
//   const isPlaying = status === 'playing';

//   return (
//     <View style={styles.container}>
//       <Text style={styles.badge}>DEV VERTICAL SLICE</Text>
//       <Text style={styles.title}>{species.displayName}</Text>
//       <Text style={styles.scientific}>{species.speciesScientific}</Text>

//       <View style={styles.card}>
//         <Text style={styles.clipTitle}>{clip.title}</Text>
//         <Text style={styles.meta}>
//           Type: {clip.type} • ID: {clip.recId}
//         </Text>
//         <Text style={styles.meta}>
//           Recordist: {clip.recordist} ({clip.license})
//         </Text>

//         <View style={styles.statusRow}>
//           <Text style={styles.statusLabel}>Status:</Text>
//           <Text style={styles.statusValue}>{status.toUpperCase()}</Text>
//           {isLoading && (
//             <ActivityIndicator
//               size="small"
//               color="#2d6a4f"
//               style={styles.spinner}
//             />
//           )}
//         </View>

//         {errorMessage ? (
//           <View style={styles.errorBanner}>
//             <Text style={styles.errorBannerText}>
//               Playback Error: {errorMessage}
//             </Text>
//           </View>
//         ) : null}

//         <View style={styles.controlsRow}>
//           <Pressable
//             accessibilityRole="button"
//             disabled={isLoading}
//             onPress={() => play(clip)}
//             style={({ pressed }) => [
//               styles.button,
//               styles.playButton,
//               isLoading && styles.buttonDisabled,
//               pressed && !isLoading && styles.buttonPressed,
//             ]}
//           >
//             <Text style={styles.buttonText}>
//               {isPlaying ? 'Restart' : 'Play'}
//             </Text>
//           </Pressable>

//           <Pressable
//             accessibilityRole="button"
//             disabled={!isPlaying && !isLoading}
//             onPress={stop}
//             style={({ pressed }) => [
//               styles.button,
//               styles.stopButton,
//               !isPlaying && !isLoading && styles.buttonDisabled,
//               pressed && (isPlaying || isLoading) && styles.buttonPressed,
//             ]}
//           >
//             <Text style={styles.buttonText}>Stop</Text>
//           </Pressable>
//         </View>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f4f6f4',
//     padding: 24,
//     justifyContent: 'center',
//   },
//   badge: {
//     fontSize: 12,
//     fontWeight: '700',
//     color: '#2d6a4f',
//     letterSpacing: 1,
//     marginBottom: 4,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: '700',
//     color: '#1b4332',
//   },
//   scientific: {
//     fontSize: 16,
//     fontStyle: 'italic',
//     color: '#52796f',
//     marginBottom: 20,
//   },
//   card: {
//     backgroundColor: '#ffffff',
//     borderRadius: 12,
//     padding: 20,
//     shadowColor: '#000',
//     shadowOpacity: 0.06,
//     shadowRadius: 8,
//     shadowOffset: { width: 0, height: 2 },
//     elevation: 2,
//   },
//   clipTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#081c15',
//     marginBottom: 6,
//   },
//   meta: {
//     fontSize: 14,
//     color: '#495057',
//     marginBottom: 4,
//   },
//   statusRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 16,
//     marginBottom: 16,
//   },
//   statusLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#343a40',
//     marginRight: 6,
//   },
//   statusValue: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#2d6a4f',
//   },
//   spinner: {
//     marginLeft: 8,
//   },
//   errorBanner: {
//     backgroundColor: '#ffe3e3',
//     borderRadius: 8,
//     padding: 12,
//     marginBottom: 16,
//   },
//   errorBannerText: {
//     color: '#c92a2a',
//     fontSize: 13,
//   },
//   errorText: {
//     color: '#c92a2a',
//     fontSize: 15,
//     textAlign: 'center',
//   },
//   controlsRow: {
//     flexDirection: 'row',
//     gap: 12,
//   },
//   button: {
//     flex: 1,
//     paddingVertical: 14,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   playButton: {
//     backgroundColor: '#2d6a4f',
//   },
//   stopButton: {
//     backgroundColor: '#ae2012',
//   },
//   buttonDisabled: {
//     opacity: 0.45,
//   },
//   buttonPressed: {
//     opacity: 0.8,
//   },
//   buttonText: {
//     color: '#ffffff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });