// Marker Annotation implementation
import helpers from "../helpers";
import AnnotationElement from "../element";

var degrees = 45;
var radians = degrees * Math.PI / 180;
// For 45 degrees, sin and cos are the same
var diagonalRatio = Math.sin(radians);

var MarkerAnnotation = AnnotationElement.extend({
	setDataLimits: function() {
		var model = this._model;
		var options = this.options;
		var chartInstance = this.chartInstance;

		var chartArea = chartInstance.chartArea;

		// Set the data range for this annotation
		model.ranges = {};
		model.ranges[options.xScaleID] = {
			min: options.xValue,
			max: options.xValue
		};
		model.ranges[options.yScaleID] = {
			min: options.yValue,
			max: options.yValue
		};

		if (!chartArea) {
			return;
		}
	},
	configure: function() {
		var model = this._model;
		var options = this.options;
		var chartInstance = this.chartInstance;

		var xScale = chartInstance.scales[options.xScaleID];
		var yScale = chartInstance.scales[options.yScaleID];
		var chartArea = chartInstance.chartArea;

		var pixelX, pixelY;

		if (xScale) {
			pixelX = helpers.isValid(options.xValue) ? xScale.getPixelForValue(options.xValue, options.xValue.index) : NaN;
		}

		if (yScale) {
			pixelY = helpers.isValid(options.yValue) ? yScale.getPixelForValue(options.yValue, options.yValue.index) : NaN;
		}

		if (isNaN(pixelX) || isNaN(pixelY)) {
			return;
		}

		// clip annotations to the chart area
		model.clip = {
			x1: chartArea.left - options.size,
			x2: chartArea.right + options.size,
			y1: chartArea.top - options.size,
			y2: chartArea.bottom + options.size
		};

		var sideSize = options.size / 2;
		model.x1 = model.x2 = pixelX;
		model.y1 = model.y2 = pixelY;

		model.left = pixelX - sideSize;
		model.top = pixelY - sideSize;
		model.right = pixelX + sideSize;
		model.bottom = pixelY + sideSize;

		// Stylistic options
		model.borderColor = options.borderColor;
		model.borderWidth = options.borderWidth;
		model.backgroundColor = options.backgroundColor;
	},
	inRange: function(mouseX, mouseY) {
		var model = this._model;
		return model &&
			mouseX >= model.left &&
			mouseX <= model.right &&
			mouseY >= model.top &&
			mouseY <= model.bottom;
	},
	getCenterPoint: function() {
		var model = this._model;
		return {
			x: (model.right + model.left) / 2,
			y: (model.bottom + model.top) / 2
		};
	},
	getWidth: function() {
		var model = this._model;
		return Math.abs(model.right - model.left);
	},
	getHeight: function() {
		var model = this._model;
		return Math.abs(model.bottom - model.top);
	},
	getArea: function() {
		return this.getWidth() * this.getHeight();
	},
	draw: function() {
		var view = this._view;
		var options = this.options;
		var ctx = this.chartInstance.chart.ctx;
		var sizeOffset = options.size / 2;

		ctx.save();

		// Canvas setup
		ctx.beginPath();
		ctx.rect(
			view.clip.x1,
			view.clip.y1,
			view.clip.x2 - view.clip.x1,
			view.clip.y2 - view.clip.y1
		);
		ctx.clip();

		ctx.lineWidth = view.borderWidth;
		ctx.strokeStyle = view.borderColor;
		ctx.fillStyle = view.backgroundColor;

		var xcoord = 0.5 / diagonalRatio * (view.x1 + view.y1) - sizeOffset;
		var ycoord = 0.5 / diagonalRatio * (view.y1 - view.x1) - sizeOffset;

		// Draw
		ctx.rotate(radians);
		ctx.fillRect(xcoord, ycoord, options.size, options.size);
		ctx.strokeRect(xcoord, ycoord, options.size, options.size);
		ctx.rotate(-radians);

		ctx.restore();
	}
});

export default MarkerAnnotation;
