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

  const {
    tracks,
    playTrack,
    pauseTrack,
    resumeTrack,
    stopTrack,
    stopAll,
    setTrackVolume,
  } = useAudioClipController(() => new ReactNativeAudioEngine());

  const activeCount = useMemo(
    () =>
      Object.values(tracks).filter(
        (t) =>
          t.status === 'playing' ||
          t.status === 'paused' ||
          t.status === 'loading'
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
              ? 'Tap Start on multiple cards to layer looping sounds'
              : `${activeCount} bird track${activeCount > 1 ? 's' : ''} active`}
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
            onStart={playTrack}
            onPause={pauseTrack}
            onResume={resumeTrack}
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