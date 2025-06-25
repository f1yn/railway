import { useState, useMemo, useRef } from 'react';

type TrackContext = { [key: string]: any };
type TrackPosition = readonly [x: number, y: number];
type TrackDefinition = { position: TrackPosition; render: ((content?: any) => React.ReactNode) | React.ReactNode };
type TrackIterDefinition = { id: string } & TrackDefinition;

export type Direction = 'left' | 'right' | 'down';
export type TrackMap = Map<string, TrackDefinition>;

/**
 * Quickly creates a array set of the two provided maps, by performing a union over them.
 */
function getTracksFromMap(mapA: TrackMap, setOfUserMaps: Map<string, TrackMap>): TrackIterDefinition[] {
	const unionMap = new Map(mapA) as TrackMap;
	const existingPositions = Array.from(unionMap.values()).map((i) => i.position);

	let index;
	let positionRef;

	// Here, we check the positioning data
	setOfUserMaps.forEach((mapB) => {
		mapB?.forEach((data, name) => {
			// check for direct name conflicts
			if (unionMap.has(name)) {
				// skip
				console.warn('The name', name, 'is already registered');
				return;
			}

			index = existingPositions.length;

			while (index--) {
				positionRef = existingPositions[index];

				if (positionRef[0] == data.position[0] && positionRef[1] == data.position[1]) {
					// conflict
					console.log(data, name, positionRef);
					console.warn('The dynamically added track has conflicts. Refusing to overlap tracks.');
					return;
				}
			}

			// Add to union map
			unionMap.set(name, data);
		});
	});

	return Array.from(unionMap.entries()).map(([id, value]) => ({ id, ...value }));
}

const findById = (id: string) => (track: TrackIterDefinition) => track.id === id;

export default function useRailwayProviderValue(defaultTracks: TrackMap) {
	// Context for the current track
	const initialContextMap = useMemo(() => new Map<string, any>(), []);
	const contextMapRef = useRef(initialContextMap);

	// A mutable reference to the current journey (needed to traverse backwards, safely)
	const [journeyStack, setJourneyStack] = useState<string[]>(['start']);
	const [currentPosition, setCurrentPosition] = useState<TrackPosition>([0, 0]);

	// Track storage
	const initialUserDefinedTrackMaps = useMemo(() => new Map<string, TrackMap>(), []);
	const [userDefinedTrackMaps, setUserDefinedTrackMaps] = useState(initialUserDefinedTrackMaps);

	const allTracksAsList = useMemo(
		() => getTracksFromMap(defaultTracks, userDefinedTrackMaps),
		[defaultTracks, userDefinedTrackMaps]
	);

	const currentTrack = useMemo(
		() =>
			allTracksAsList.find(
				(item) => item.position[0] === currentPosition[0] && item.position[1] === currentPosition[1]
			),
		[currentPosition]
	);

	const returnDirection = useMemo(() => {
		const previousTrackId = journeyStack[journeyStack.length - 2] || null;
		if (!previousTrackId) return null;

		const previousTrack = allTracksAsList.find(findById(previousTrackId));
		if (!previousTrack || !currentTrack) return null;

		// Compare the positions and calculate the delta (to determine if we are going up, left, or right)
		const dX = previousTrack.position[0] - currentPosition[0];

		if (dX < 0) return 'left';
		if (dX > 0) return 'right';
		return 'top';
	}, [journeyStack, currentPosition]);

	return useMemo(() => {
		return {
			isCurrentTrack(id: string) {
				return currentTrack?.id === id;
			},
			// actions
			navigateToView(id: string, context?: TrackContext) {
				const matchingTrack = allTracksAsList.find(findById(id));

				if (!matchingTrack) {
					// REPORT!
					console.error(id, 'is not a valid track');
					return;
				}

				contextMapRef.current.set(matchingTrack.id, context);
				setJourneyStack([...journeyStack, matchingTrack.id]);
				setCurrentPosition(matchingTrack.position);
			},
			returnToLast() {
				const previousTrackId = journeyStack[journeyStack.length - 2] || null;
				if (!previousTrackId) return;

				const matchingTrack = allTracksAsList.find(findById(previousTrackId));
				if (!matchingTrack) {
					console.error(previousTrackId, 'is not a valid track');
					return;
				}

				setJourneyStack(journeyStack.slice(0, -1));
				setCurrentPosition(matchingTrack.position);
			},
			// Registers new tracks at the given coordinates (or current location if non provided)
			registerNewTracks(id: string, initialTrackMap: TrackMap, userStartPosition?: TrackPosition) {
				// insert relative to
				const offsetX = userStartPosition?.[0] || currentPosition?.[0] || 0;
				const offsetY = userStartPosition?.[1] || currentPosition?.[1] || 0;

				const userTargetMap = new Map();

				// Apply relative coordinates
				initialTrackMap.forEach(({ position, ...rest }, trackName) => {
					userTargetMap.set(trackName, { ...rest, position: [offsetX + position[0], offsetY + position[1]] });
				});

				// register!
				userDefinedTrackMaps.set(id, userTargetMap);
				setUserDefinedTrackMaps(new Map(userDefinedTrackMaps));
			},
			deregisterTracks(id: string) {
				if (!id) {
					// Empty the tracks
					setUserDefinedTrackMaps(new Map());
				} else {
					// Remove by ref (update)
					const keysToRemove = userDefinedTrackMaps.get(id)?.keys() || [];

					// Remove context for said user routes
					for (const key of keysToRemove) {
						contextMapRef.current.delete(key);
					}

					userDefinedTrackMaps.delete(id);
					setUserDefinedTrackMaps(new Map(userDefinedTrackMaps));
				}
			},
			// data
			journeyStack,
			returnDirection,
			contextMap: contextMapRef.current,
			currentPosition,
			currentTrack,
			allTracksAsList
		};
	}, [returnDirection, journeyStack, currentPosition, currentTrack, userDefinedTrackMaps, allTracksAsList]);
}
