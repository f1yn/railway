import clsx from 'clsx';

import React, {
	useRef,
	useMemo,
	useEffect,
	useContext,
	createContext,
} from 'react';

import styles from './Railway.module.css';

import useRailwayProviderValue, {
	TrackMap,
	Direction,
} from './useRailwayProviderValue';

type useRailwayResult = ReturnType<typeof useRailwayProviderValue>;

const RailwayContext = createContext<useRailwayResult | null>(null);

export { type TrackMap };

export const DOWN = [0, 1] as const;
export const LEFT = [-1, 0] as const;
export const RIGHT = [1, 0] as const;

export const direction = (direction: Direction) => {
	if (direction == 'left') return [-1, 0];
	if (direction == 'right') return [1, 0];
	return [0, 1];
};

export function useRailway() {
	return useContext(RailwayContext)!;
}

type RailwayComponentContext = { [key: string]: any };

/**
 * Adds overlay tracks on the current view (for routing to nested views)
 * @param id The current track ID
 * @param mapCreator The new tracks to lay down, relative to the position of the current track
 */
export function useRailwayTracks(
	id: string,
	mapCreator: (context?: RailwayComponentContext) => TrackMap
) {
	const railway = useRailway();

	useEffect(() => {
		// Don't create tracks unless we are on this view
		if (!railway.isCurrentTrack(id)) return;
		const newTracks = mapCreator();
		railway.registerNewTracks(id, newTracks);
		return () => railway.deregisterTracks(id);
	}, [id]);
}

export default function Railway({
	defaultTracks,
	className,
	children,
}: {
	defaultTracks: TrackMap;
	className?: string;
	children?: any;
}) {
	const previousTrackIdRef = useRef<string>();
	const providerValue = useRailwayProviderValue(defaultTracks);
	const {
		currentPosition,
		allTracksAsList,
		contextMap,
		journeyStack,
		currentTrack,
	} = providerValue;

	// If we are in a custom position, we apply the offset (forces a transition)
	const offsetStyleOverrides = useMemo<React.CSSProperties>(
		() => ({
			transform: `translateX(${currentPosition[0] * -100}%) translateY(-${
				currentPosition[1] * 100
			}%)`,
		}),
		[currentPosition]
	);

	useEffect(() => {
		previousTrackIdRef.current = currentTrack?.id;
	}, [currentTrack?.id]);

	return (
		<div className={clsx(styles.wrapper, className)}>
			<RailwayContext.Provider value={providerValue}>
				{allTracksAsList.map(({ position: [x, y], id, render }) => {
					// Determine if it's active or not
					const isActive =
						currentPosition[0] == x && currentPosition[1] == y;
					const isActiveProp = {
						'data-is-active': isActive || undefined,
					};
					const wasPrevious = previousTrackIdRef.current === id;
					const shouldRender =
						isActive || wasPrevious || journeyStack.includes(id);
					const isFunction = typeof render === 'function';

					return (
						<div
							key={id}
							className={styles.track}
							data-position-x={x}
							data-position-y={y}
							style={{
								...offsetStyleOverrides,
								// @ts-expect-error - This is a css variable override!
								'--railway-track-pos-x': x,
								'--railway-track-pos-y': y,
							}}
							{...isActiveProp}
						>
							{(shouldRender &&
								(isFunction
									? render(contextMap.get(id) || {})
									: render)) ||
								null}
						</div>
					);
				})}
				{children}
			</RailwayContext.Provider>
		</div>
	);
}
