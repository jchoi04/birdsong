import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BirdSpecies, Recording } from '../../../domain/bird';
import { BirdTrackState } from '../../../domain/soundscape';

interface BirdTrackRowProps {
  species: BirdSpecies;
  trackState?: BirdTrackState;
  isFavorite: boolean;
  onToggleFavorite: (speciesId: string) => void;
  onStart: (speciesId: string, recording: Recording) => void;
  onPause: (speciesId: string) => void;
  onResume: (speciesId: string) => void;
  onStop: (speciesId: string) => void;
  onVolumeChange: (speciesId: string, volume: number) => void;
}

export function BirdTrackRow({
  species,
  trackState,
  isFavorite,
  onToggleFavorite,
  onStart,
  onPause,
  onResume,
  onStop,
  onVolumeChange,
}: BirdTrackRowProps) {
  const [selectedRecId, setSelectedRecId] = useState<string>(
    trackState?.activeRecId ?? species.recordings[0]?.recId ?? ''
  );

  // Keep selected clip synced if card remounts when moving between sections
  useEffect(() => {
    if (trackState?.activeRecId) {
      setSelectedRecId(trackState.activeRecId);
    }
  }, [trackState?.activeRecId]);

  const selectedClip = useMemo(
    () =>
      species.recordings.find((r) => r.recId === selectedRecId) ??
      species.recordings[0],
    [species.recordings, selectedRecId]
  );

  const status = trackState?.status ?? 'idle';
  const volume = trackState?.volume ?? 0.8;
  const errorMessage = trackState?.errorMessage ?? null;

  const isLoading = status === 'loading';
  const isPlaying = status === 'playing';
  const isPaused = status === 'paused';
  const canStop = isPlaying || isPaused || isLoading;

  const primaryButtonLabel = isPlaying
    ? 'Pause'
    : isPaused
      ? 'Resume'
      : 'Start';

  const handlePrimaryPress = () => {
    if (!selectedClip) return;
    if (isPlaying) {
      onPause(species.speciesId);
    } else if (isPaused) {
      onResume(species.speciesId);
    } else {
      onStart(species.speciesId, selectedClip);
    }
  };

  // Horizontal Slider state & refs
  const sliderWidthRef = useRef<number>(1);
  const grantXRef = useRef<number>(0);

  const updateVolumeFromTouch = (touchX: number) => {
    const width = sliderWidthRef.current;
    if (width <= 0) return;
    const ratio = Math.max(0, Math.min(1, touchX / width));
    onVolumeChange(species.speciesId, ratio);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          grantXRef.current = evt.nativeEvent.locationX;
          updateVolumeFromTouch(grantXRef.current);
        },
        onPanResponderMove: (_, gestureState) => {
          updateVolumeFromTouch(grantXRef.current + gestureState.dx);
        },
      }),
    [species.speciesId, onVolumeChange]
  );

  const handleSliderLayout = (e: LayoutChangeEvent) => {
    sliderWidthRef.current = e.nativeEvent.layout.width;
  };

  if (!selectedClip) return null;

  return (
    <View
      style={[
        styles.card,
        isPlaying && styles.cardPlaying,
        isPaused && styles.cardPaused,
      ]}
    >
      {/* Top Row: Bird Info, Status Badge & Favorite Button */}
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          <Text style={styles.title}>{species.displayName}</Text>
          <Text style={styles.scientific}>{species.speciesScientific}</Text>
        </View>

        <View style={styles.headerRightActions}>
          <View
            style={[
              styles.statusBadge,
              isPaused && styles.statusBadgePaused,
            ]}
          >
            {isLoading && (
              <ActivityIndicator
                size="small"
                color="#2d6a4f"
                style={styles.spinner}
              />
            )}
            <Text
              style={[
                styles.statusText,
                isPlaying && styles.statusTextPlaying,
                isPaused && styles.statusTextPaused,
              ]}
            >
              {status.toUpperCase()}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite ? 'Remove from favorites' : 'Add to favorites'
            }
            hitSlop={8}
            onPress={() => onToggleFavorite(species.speciesId)}
            style={({ pressed }) => [
              styles.favoriteButton,
              isFavorite && styles.favoriteButtonActive,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text
              style={[
                styles.favoriteIcon,
                isFavorite && styles.favoriteIconActive,
              ]}
            >
              {isFavorite ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Recording Type Chips */}
      <View style={styles.chipsRow}>
        {species.recordings.map((rec) => {
          const isSelected = rec.recId === selectedClip.recId;
          return (
            <Pressable
              key={rec.recId}
              onPress={() => {
                setSelectedRecId(rec.recId);
                if (isPlaying) {
                  onStart(species.speciesId, rec);
                } else if (isPaused) {
                  onStop(species.speciesId);
                }
              }}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
              >
                {rec.type}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.metaText}>
        {selectedClip.recId} • {selectedClip.recordist} ({selectedClip.license})
      </Text>

      {/* Horizontal Volume Slider Spanning the Card */}
      <View style={styles.sliderSection}>
        <View style={styles.sliderLabelRow}>
          <Text style={styles.sliderLabel}>Volume</Text>
          <Text style={styles.sliderValue}>{Math.round(volume * 100)}%</Text>
        </View>

        <View
          style={styles.sliderHitSlop}
          onLayout={handleSliderLayout}
          {...panResponder.panHandlers}
        >
          <View style={styles.sliderTrack} pointerEvents="none">
            <View
              style={[styles.sliderFill, { width: `${volume * 100}%` }]}
            />
          </View>
          <View
            pointerEvents="none"
            style={[
              styles.sliderThumb,
              { left: `${volume * 100}%` },
            ]}
          />
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Start/Pause/Resume + Stop Controls */}
      <View style={styles.controlsRow}>
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={handlePrimaryPress}
          style={({ pressed }) => [
            styles.button,
            isPlaying ? styles.pauseButton : styles.startButton,
            isLoading && styles.buttonDisabled,
            pressed && !isLoading && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>{primaryButtonLabel}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!canStop}
          onPress={() => onStop(species.speciesId)}
          style={({ pressed }) => [
            styles.button,
            styles.stopButton,
            !canStop && styles.buttonDisabled,
            pressed && canStop && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPlaying: {
    borderColor: '#2d6a4f',
    backgroundColor: '#f8fbf9',
  },
  cardPaused: {
    borderColor: '#d97706',
    backgroundColor: '#fffdf9',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleColumn: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b4332',
  },
  scientific: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#52796f',
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9f5ee',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgePaused: {
    backgroundColor: '#fef3c7',
  },
  spinner: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#52796f',
  },
  statusTextPlaying: {
    color: '#2d6a4f',
  },
  statusTextPaused: {
    color: '#b45309',
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButtonActive: {
    backgroundColor: '#ffe3e3',
  },
  favoriteIcon: {
    fontSize: 17,
    color: '#6c757d',
  },
  favoriteIconActive: {
    color: '#e03131',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#eef2ef',
  },
  chipSelected: {
    backgroundColor: '#2d6a4f',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#343a40',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  metaText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
  },
  sliderSection: {
    marginBottom: 14,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#343a40',
  },
  sliderValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2d6a4f',
  },
  sliderHitSlop: {
    height: 28,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dee2e6',
    overflow: 'hidden',
    width: '100%',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#2d6a4f',
  },
  sliderThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1b4332',
    marginLeft: -9,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  errorBanner: {
    backgroundColor: '#ffe3e3',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#c92a2a',
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#2d6a4f',
  },
  pauseButton: {
    backgroundColor: '#d97706',
  },
  stopButton: {
    backgroundColor: '#ae2012',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});