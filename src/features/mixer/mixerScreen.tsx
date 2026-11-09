import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { getAllBirds } from '../../data/birdCatalog';
import { BirdSpecies } from '../../domain/bird';
import { useAudioClipController } from '../../audio/audioEngine';
import { ReactNativeAudioEngine } from '../../audio/ReactNativeAudioEngine';
import { BirdTrackRow } from './components/birdTrackRow';

type SheetDetent = 'peek' | 'medium' | 'large';

interface BirdSection {
  key: 'favorites' | 'general';
  title: string;
  subtitle: string;
  data: BirdSpecies[];
}

export function MixerScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const birds = useMemo(() => getAllBirds(), []);

  const sectionListRef = useRef<SectionList<BirdSpecies, BirdSection>>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [highlightedSpeciesId, setHighlightedSpeciesId] = useState<string | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const toggleFavorite = useCallback((speciesId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(speciesId)
        ? prev.filter((id) => id !== speciesId)
        : [...prev, speciesId]
    );
  }, []);

  const {
    tracks,
    playTrack,
    pauseTrack,
    resumeTrack,
    stopTrack,
    stopAll,
    setTrackVolume,
  } = useAudioClipController(() => new ReactNativeAudioEngine());

  const sections = useMemo<BirdSection[]>(() => {
    const favoriteBirds = birds.filter((b) =>
      favoriteIds.includes(b.speciesId)
    );
    const generalBirds = birds.filter(
      (b) => !favoriteIds.includes(b.speciesId)
    );

    return [
      {
        key: 'favorites',
        title: `Favorites (${favoriteBirds.length})`,
        subtitle:
          favoriteBirds.length === 0
            ? 'Tap ♡ on any bird card below to pin it to your Favorites'
            : 'Pinned for quick access',
        data: favoriteBirds,
      },
      {
        key: 'general',
        title: `General (${generalBirds.length})`,
        subtitle: 'All other birds in catalog',
        data: generalBirds,
      },
    ];
  }, [birds, favoriteIds]);

  const activeBirds = useMemo(
    () =>
      birds.filter((b) => {
        const status = tracks[b.speciesId]?.status;
        return (
          status === 'playing' || status === 'paused' || status === 'loading'
        );
      }),
    [birds, tracks]
  );

  const detents = useMemo(() => {
    const large = Math.max(80, Math.round(windowHeight * 0.12));
    const medium = Math.round(windowHeight * 0.46);
    const peek = Math.round(windowHeight * 0.78);
    return { large, medium, peek };
  }, [windowHeight]);

  const [currentDetent, setCurrentDetent] = useState<SheetDetent>('medium');
  const translateY = useRef(new Animated.Value(detents.medium)).current;
  const currentYRef = useRef<number>(detents.medium);
  const dragStartYRef = useRef<number>(detents.medium);

  const snapToDetent = useCallback(
    (target: SheetDetent) => {
      const toValue = detents[target];
      currentYRef.current = toValue;
      setCurrentDetent(target);
      Animated.spring(translateY, {
        toValue,
        useNativeDriver: true,
        damping: 22,
        stiffness: 180,
        mass: 0.8,
      }).start();
    },
    [detents, translateY]
  );

  // Finds the bird's section & item index, expands the sheet if needed, and scrolls to it
  const jumpToBirdCard = useCallback(
    (speciesId: string) => {
      let targetSectionIndex = -1;
      let targetItemIndex = -1;

      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const iIdx = sections[sIdx].data.findIndex(
          (b) => b.speciesId === speciesId
        );
        if (iIdx !== -1) {
          targetSectionIndex = sIdx;
          targetItemIndex = iIdx;
          break;
        }
      }

      if (targetSectionIndex === -1 || targetItemIndex === -1) return;

      // Expand sheet to medium if it is currently minimized ('peek')
      if (currentDetent === 'peek') {
        snapToDetent('medium');
      }

      // Scroll the SectionList to that specific card
      sectionListRef.current?.scrollToLocation({
        sectionIndex: targetSectionIndex,
        itemIndex: targetItemIndex,
        viewOffset: 16,
        animated: true,
      });

      // Highlight the card briefly so the user sees it immediately
      setHighlightedSpeciesId(speciesId);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedSpeciesId(null);
      }, 1500);
    },
    [currentDetent, sections, snapToDetent]
  );

  const cycleDetent = useCallback(() => {
    if (currentDetent === 'peek') {
      snapToDetent('medium');
    } else if (currentDetent === 'medium') {
      snapToDetent('large');
    } else {
      snapToDetent('medium');
    }
  }, [currentDetent, snapToDetent]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 5,
        onPanResponderGrant: () => {
          dragStartYRef.current = currentYRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const nextY = Math.max(
            detents.large,
            Math.min(detents.peek, dragStartYRef.current + gestureState.dy)
          );
          translateY.setValue(nextY);
        },
        onPanResponderRelease: (_, gestureState) => {
          const projectedY =
            dragStartYRef.current + gestureState.dy + gestureState.vy * 110;

          const entries: [SheetDetent, number][] = [
            ['large', detents.large],
            ['medium', detents.medium],
            ['peek', detents.peek],
          ];

          let closest: SheetDetent = 'medium';
          let minDistance = Infinity;
          for (const [name, pos] of entries) {
            const dist = Math.abs(projectedY - pos);
            if (dist < minDistance) {
              minDistance = dist;
              closest = name;
            }
          }
          snapToDetent(closest);
        },
      }),
    [detents, snapToDetent, translateY]
  );

  return (
    <View style={styles.root}>
      {/* Background Scene Canvas */}
      <SafeAreaView style={styles.sceneContainer}>
        <View style={styles.sceneHeader}>
          <View>
            <Text style={styles.sceneBadge}>CURRENT SCENE</Text>
            <Text style={styles.sceneTitle}>Woodland Canopy</Text>
          </View>

          {activeBirds.length > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={stopAll}
              style={({ pressed }) => [
                styles.stopAllButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.stopAllText}>Stop All</Text>
            </Pressable>
          )}
        </View>

        {/* Active Birds Visual Indicator in the Scene */}
        <View style={styles.sceneStage}>
          {activeBirds.length === 0 ? (
            <View style={styles.emptySceneBox}>
              <Text style={styles.emptySceneTitle}>Quiet Forest</Text>
              <Text style={styles.emptySceneSubtitle}>
                Pull up the bird sheet below and press Start on any bird to
                build your soundscape.
              </Text>
            </View>
          ) : (
            <View style={styles.activeScenePills}>
              {activeBirds.map((bird) => {
                const track = tracks[bird.speciesId];
                const isPaused = track?.status === 'paused';
                return (
                  <Pressable
                    key={bird.speciesId}
                    accessibilityRole="button"
                    accessibilityLabel={`Jump to ${bird.displayName} controls`}
                    onPress={() => jumpToBirdCard(bird.speciesId)}
                    style={({ pressed }) => [
                      styles.sceneBirdPill,
                      isPaused && styles.sceneBirdPillPaused,
                      pressed && styles.sceneBirdPillPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.liveDot,
                        isPaused && styles.liveDotPaused,
                      ]}
                    />
                    <Text style={styles.sceneBirdPillName}>
                      {bird.displayName}
                    </Text>
                    <Text style={styles.sceneBirdPillMeta}>
                      {isPaused
                        ? 'PAUSED'
                        : `${Math.round((track?.volume ?? 0.8) * 100)}%`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Pull-Up .sheet() Overlay */}
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            height: windowHeight - detents.large,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Sheet Drag Handle + Header */}
        <View
          style={styles.sheetDragArea}
          {...sheetPanResponder.panHandlers}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle sheet height"
            onPress={cycleDetent}
            style={styles.handleHitArea}
          >
            <View style={styles.sheetHandleBar} />
          </Pressable>

          <View style={styles.sheetTopBar}>
            <View>
              <Text style={styles.sheetTitle}>Birds</Text>
              <Text style={styles.sheetSubtitle}>
                {activeBirds.length === 0
                  ? 'Layer birds into the scene'
                  : `${activeBirds.length} active • Tap a bird above to jump to card`}
              </Text>
            </View>

            <View style={styles.detentButtonsRow}>
              {(['peek', 'medium', 'large'] as SheetDetent[]).map((detent) => (
                <Pressable
                  key={detent}
                  onPress={() => snapToDetent(detent)}
                  style={[
                    styles.detentPill,
                    currentDetent === detent && styles.detentPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.detentPillText,
                      currentDetent === detent && styles.detentPillTextActive,
                    ]}
                  >
                    {detent === 'peek'
                      ? 'Min'
                      : detent === 'medium'
                        ? 'Half'
                        : 'Full'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Categorized Vertical Scroll List */}
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(item) => item.speciesId}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={(info) => {
            // Fallback if target card hasn't been measured yet
            setTimeout(() => {
              sectionListRef.current?.scrollToLocation({
                sectionIndex: info.index,
                itemIndex: 0,
                animated: true,
              });
            }, 100);
          }}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <BirdTrackRow
              species={item}
              trackState={tracks[item.speciesId]}
              isFavorite={favoriteIds.includes(item.speciesId)}
              isHighlighted={highlightedSpeciesId === item.speciesId}
              onToggleFavorite={toggleFavorite}
              onStart={playTrack}
              onPause={pauseTrack}
              onResume={resumeTrack}
              onStop={stopTrack}
              onVolumeChange={setTrackVolume}
            />
          )}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1b4332',
  },
  sceneContainer: {
    flex: 1,
  },
  sceneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sceneBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#95d5b2',
    letterSpacing: 1.2,
  },
  sceneTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  stopAllButton: {
    backgroundColor: '#ae2012',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  stopAllText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  sceneStage: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  emptySceneBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  emptySceneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d8f3dc',
    marginBottom: 4,
  },
  emptySceneSubtitle: {
    fontSize: 14,
    color: '#b7e4c7',
    lineHeight: 20,
  },
  activeScenePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sceneBirdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(149, 213, 178, 0.4)',
  },
  sceneBirdPillPaused: {
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  sceneBirdPillPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#52b788',
    marginRight: 8,
  },
  liveDotPaused: {
    backgroundColor: '#fbbf24',
  },
  sceneBirdPillName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  sceneBirdPillMeta: {
    color: '#b7e4c7',
    fontSize: 11,
    fontWeight: '700',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: '#f4f6f4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
    overflow: 'hidden',
  },
  sheetDragArea: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8e4',
  },
  handleHitArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  sheetHandleBar: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ced4da',
  },
  sheetTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b4332',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#52796f',
    marginTop: 2,
  },
  detentButtonsRow: {
    flexDirection: 'row',
    backgroundColor: '#eef2ef',
    borderRadius: 8,
    padding: 2,
  },
  detentPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  detentPillActive: {
    backgroundColor: '#2d6a4f',
  },
  detentPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  detentPillTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b4332',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
});