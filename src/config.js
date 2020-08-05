import BoxAnnotation from "./types/box";
import LineAnnotation from "./types/line";
import MarkerAnnotation from "./types/marker";

export const drawTimeOptions = {
	afterDraw: 'afterDraw',
	afterDatasetsDraw: 'afterDatasetsDraw',
	beforeDatasetsDraw: 'beforeDatasetsDraw'
};

/* eslint-disable global-require */
export const types = {
	line: LineAnnotation,
	box: BoxAnnotation,
	marker: MarkerAnnotation
};
