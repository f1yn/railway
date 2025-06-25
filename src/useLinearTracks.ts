import { useMemo } from 'react';
import type { TrackMap, Direction } from './useRailwayProviderValue';
import { LEFT, RIGHT, DOWN } from './Railway';

export type StepDefinition = { id: string; direction?: Direction; render: () => React.ReactNode };

function directionToPositionDelta(direction: Direction) {
	if (direction === 'left') return LEFT;
	if (direction === 'right') return RIGHT;
	if (direction === 'down') return DOWN;
	return DOWN;
}

/**
 * Generates a track map from an array of step definitions, assigning each step a position based on its direction.
 * 
 * @param stepDefinitions - An array of step definitions, each containing an id, an optional direction, and a render function.
 * @returns A TrackMap where each key is a step id and the value contains the position and render function for that step.
 */
function generateTracksFromSteps(stepDefinitions: StepDefinition[]) {
	const tracks = new Map() as TrackMap;

	let currentPositionX = 0;
	let currentPositionY = 0;
	let index: number;
	let stepRef: StepDefinition;
	let dX: number;
	let dY: number;

	for (index = 0; index < stepDefinitions.length; index++) {
		stepRef = stepDefinitions[index];

		if (index) {
			[dX, dY] = directionToPositionDelta(stepRef.direction || 'right');

			currentPositionX += dX;
			currentPositionY += dY;
		}

		tracks.set(stepRef.id, {
			position: [currentPositionX, currentPositionY],
			render: stepRef.render
		});
	}

	return tracks;
}

/**
 * React hook that memoizes the generation of a linear track map from step definitions.
 * 
 * @param stepDefinitions - An array of step definitions to generate the track map from.
 * @returns A memoized TrackMap representing the positions and render functions of each step.
 */
export default function useLinearTrack(stepDefinitions: StepDefinition[]) {
	return useMemo(() => generateTracksFromSteps(stepDefinitions), [stepDefinitions]);
}
