(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('chart.js')) :
	typeof define === 'function' && define.amd ? define(['chart.js'], factory) :
	(global = global || self, global.ChartAnnotationPlugin = factory(global.ChartJS));
}(this, (function (Chart) { 'use strict';

	Chart = Chart && Object.prototype.hasOwnProperty.call(Chart, 'default') ? Chart['default'] : Chart;

	const defaults = {
	  drawTime: 'afterDatasetsDraw',
	  dblClickSpeed: 350,
	  // ms
	  events: [],
	  annotations: []
	};
	const labelDefaults = {
	  backgroundColor: 'rgba(0,0,0,0.8)',
	  fontFamily: Chart.defaults.global.defaultFontFamily,
	  fontSize: Chart.defaults.global.defaultFontSize,
	  fontStyle: 'bold',
	  fontColor: '#fff',
	  xPadding: 6,
	  yPadding: 6,
	  cornerRadius: 6,
	  position: 'center',
	  xAdjust: 0,
	  yAdjust: 0,
	  enabled: false,
	  content: null
	};

	function noop() {}

	function elements(chartInstance) {
	  // Turn the elements object into an array of elements
	  var els = chartInstance.annotation.elements;
	  return Object.keys(els).map(function (id) {
	    return els[id];
	  });
	}

	function objectId() {
	  return Math.random().toString(36).substr(2, 6);
	}

	function isValid(rawValue) {
	  if (rawValue === null || typeof rawValue === 'undefined') {
	    return false;
	  } else if (typeof rawValue === 'number') {
	    return isFinite(rawValue);
	  }

	  return !!rawValue;
	}

	function decorate(obj, prop, func) {
	  var prefix = '$';

	  if (!obj[prefix + prop]) {
	    if (obj[prop]) {
	      obj[prefix + prop] = obj[prop].bind(obj);

	      obj[prop] = function () {
	        var args = [obj[prefix + prop]].concat(Array.prototype.slice.call(arguments));
	        return func.apply(obj, args);
	      };
	    } else {
	      obj[prop] = function () {
	        var args = [undefined].concat(Array.prototype.slice.call(arguments));
	        return func.apply(obj, args);
	      };
	    }
	  }
	}

	function callEach(fns, method) {
	  fns.forEach(function (fn) {
	    (method ? fn[method] : fn)();
	  });
	}

	function getEventHandlerName(eventName) {
	  return 'on' + eventName[0].toUpperCase() + eventName.substring(1);
	}

	function createMouseEvent(type, previousEvent) {
	  try {
	    return new MouseEvent(type, previousEvent);
	  } catch (exception) {
	    try {
	      var m = document.createEvent('MouseEvent');
	      m.initMouseEvent(type, previousEvent.canBubble, previousEvent.cancelable, previousEvent.view, previousEvent.detail, previousEvent.screenX, previousEvent.screenY, previousEvent.clientX, previousEvent.clientY, previousEvent.ctrlKey, previousEvent.altKey, previousEvent.shiftKey, previousEvent.metaKey, previousEvent.button, previousEvent.relatedTarget);
	      return m;
	    } catch (exception2) {
	      var e = document.createEvent('Event');
	      e.initEvent(type, previousEvent.canBubble, previousEvent.cancelable);
	      return e;
	    }
	  }
	}

	var chartHelpers = Chart.helpers;

	function initConfig(config) {
	  config = chartHelpers.configMerge(defaults, config);

	  if (chartHelpers.isArray(config.annotations)) {
	    config.annotations.forEach(function (annotation) {
	      annotation.label = chartHelpers.configMerge(labelDefaults, annotation.label);
	    });
	  }

	  return config;
	}

	function getScaleLimits(scaleId, annotations, scaleMin, scaleMax) {
	  var ranges = annotations.filter(function (annotation) {
	    return !!annotation._model.ranges[scaleId];
	  }).map(function (annotation) {
	    return annotation._model.ranges[scaleId];
	  });
	  var min = ranges.map(function (range) {
	    return Number(range.min);
	  }).reduce(function (a, b) {
	    return isFinite(b) && !isNaN(b) && b < a ? b : a;
	  }, scaleMin);
	  var max = ranges.map(function (range) {
	    return Number(range.max);
	  }).reduce(function (a, b) {
	    return isFinite(b) && !isNaN(b) && b > a ? b : a;
	  }, scaleMax);
	  return {
	    min: min,
	    max: max
	  };
	}

	function adjustScaleRange(scale) {
	  // Adjust the scale range to include annotation values
	  var range = getScaleLimits(scale.id, elements(scale.chart), scale.min, scale.max);

	  if (typeof scale.options.ticks.min === 'undefined' && typeof scale.options.ticks.suggestedMin === 'undefined') {
	    scale.min = range.min;
	  }

	  if (typeof scale.options.ticks.max === 'undefined' && typeof scale.options.ticks.suggestedMax === 'undefined') {
	    scale.max = range.max;
	  }

	  if (scale.handleTickRangeOptions) {
	    scale.handleTickRangeOptions();
	  }
	}

	function getNearestItems(annotations, position) {
	  var minDistance = Number.POSITIVE_INFINITY;
	  return annotations.filter(function (element) {
	    return element.inRange(position.x, position.y);
	  }).reduce(function (nearestItems, element) {
	    var center = element.getCenterPoint();
	    var distance = chartHelpers.distanceBetweenPoints(position, center);

	    if (distance < minDistance) {
	      nearestItems = [element];
	      minDistance = distance;
	    } else if (distance === minDistance) {
	      // Can have multiple items at the same distance in which case we sort by size
	      nearestItems.push(element);
	    }

	    return nearestItems;
	  }, []).sort(function (a, b) {
	    // If there are multiple elements equally close,
	    // sort them by size, then by index
	    var sizeA = a.getArea();
	    var sizeB = b.getArea();
	    return sizeA > sizeB || sizeA < sizeB ? sizeA - sizeB : a._index - b._index;
	  }).slice(0, 1)[0]; // return only the top item
	}

	var helpers = {
	  initConfig: initConfig,
	  elements: elements,
	  callEach: callEach,
	  noop: noop,
	  objectId: objectId,
	  isValid: isValid,
	  decorate: decorate,
	  adjustScaleRange: adjustScaleRange,
	  getNearestItems: getNearestItems,
	  getEventHandlerName: getEventHandlerName,
	  createMouseEvent: createMouseEvent
	};

	var chartHelpers$1 = Chart.helpers;

	function collapseHoverEvents(events) {
	  var hover = false;
	  var filteredEvents = events.filter(function (eventName) {
	    switch (eventName) {
	      case 'mouseenter':
	      case 'mouseover':
	      case 'mouseout':
	      case 'mouseleave':
	        hover = true;
	        return false;

	      default:
	        return true;
	    }
	  });

	  if (hover && filteredEvents.indexOf('mousemove') === -1) {
	    filteredEvents.push('mousemove');
	  }

	  return filteredEvents;
	}

	function dispatcher(e) {
	  var ns = this.annotation;
	  var elements = helpers.elements(this);
	  var position = chartHelpers$1.getRelativePosition(e, this.chart);
	  var element = helpers.getNearestItems(elements, position);
	  var events = collapseHoverEvents(ns.options.events);
	  var dblClickSpeed = ns.options.dblClickSpeed;
	  var eventHandlers = [];
	  var eventHandlerName = helpers.getEventHandlerName(e.type);
	  var options = (element || {}).options; // Detect hover events

	  if (e.type === 'mousemove') {
	    if (element && !element.hovering) {
	      // hover started
	      ['mouseenter', 'mouseover'].forEach(function (eventName) {
	        var handlerName = helpers.getEventHandlerName(eventName);
	        var hoverEvent = helpers.createMouseEvent(eventName, e); // recreate the event to match the handler

	        element.hovering = true;

	        if (typeof options[handlerName] === 'function') {
	          eventHandlers.push([options[handlerName], hoverEvent, element]);
	        }
	      });
	    } else if (!element) {
	      // hover ended
	      elements.forEach(function (el) {
	        if (el.hovering) {
	          el.hovering = false;
	          var opt = el.options;
	          ['mouseout', 'mouseleave'].forEach(function (eventName) {
	            var handlerName = helpers.getEventHandlerName(eventName);
	            var hoverEvent = helpers.createMouseEvent(eventName, e); // recreate the event to match the handler

	            if (typeof opt[handlerName] === 'function') {
	              eventHandlers.push([opt[handlerName], hoverEvent, el]);
	            }
	          });
	        }
	      });
	    }
	  } // Suppress duplicate click events during a double click
	  // 1. click -> 2. click -> 3. dblclick
	  //
	  // 1: wait dblClickSpeed ms, then fire click
	  // 2: cancel (1) if it is waiting then wait dblClickSpeed ms then fire click, else fire click immediately
	  // 3: cancel (1) or (2) if waiting, then fire dblclick


	  if (element && events.indexOf('dblclick') > -1 && typeof options.onDblclick === 'function') {
	    if (e.type === 'click' && typeof options.onClick === 'function') {
	      clearTimeout(element.clickTimeout);
	      element.clickTimeout = setTimeout(function () {
	        delete element.clickTimeout;
	        options.onClick.call(element, e);
	      }, dblClickSpeed);
	      e.stopImmediatePropagation();
	      e.preventDefault();
	      return;
	    } else if (e.type === 'dblclick' && element.clickTimeout) {
	      clearTimeout(element.clickTimeout);
	      delete element.clickTimeout;
	    }
	  } // Dispatch the event to the usual handler, but only if we haven't substituted it


	  if (element && typeof options[eventHandlerName] === 'function' && eventHandlers.length === 0) {
	    eventHandlers.push([options[eventHandlerName], e, element]);
	  }

	  if (eventHandlers.length > 0) {
	    e.stopImmediatePropagation();
	    e.preventDefault();
	    eventHandlers.forEach(function (eventHandler) {
	      // [handler, event, element]
	      eventHandler[0].call(eventHandler[2], eventHandler[1]);
	    });
	  }
	}

	var events = {
	  dispatcher: dispatcher,
	  collapseHoverEvents: collapseHoverEvents
	};

	var chartHelpers$2 = Chart.helpers;
	var AnnotationElement = Chart.Element.extend({
	  initialize: function () {
	    this.hidden = false;
	    this.hovering = false;
	    this._model = chartHelpers$2.clone(this._model) || {};
	    this.setDataLimits();
	  },
	  destroy: function () {},
	  setDataLimits: function () {},
	  configure: function () {},
	  inRange: function () {},
	  getCenterPoint: function () {},
	  getWidth: function () {},
	  getHeight: function () {},
	  getArea: function () {},
	  draw: function () {}
	});

	// Box Annotation implementation
	var BoxAnnotation = AnnotationElement.extend({
	  setDataLimits: function () {
	    var model = this._model;
	    var options = this.options;
	    var chartInstance = this.chartInstance;
	    var xScale = chartInstance.scales[options.xScaleID];
	    var yScale = chartInstance.scales[options.yScaleID];
	    var chartArea = chartInstance.chartArea; // Set the data range for this annotation

	    model.ranges = {};

	    if (!chartArea) {
	      return;
	    }

	    var min = 0;
	    var max = 0;

	    if (xScale) {
	      min = helpers.isValid(options.xMin) ? options.xMin : xScale.getValueForPixel(chartArea.left);
	      max = helpers.isValid(options.xMax) ? options.xMax : xScale.getValueForPixel(chartArea.right);
	      model.ranges[options.xScaleID] = {
	        min: Math.min(min, max),
	        max: Math.max(min, max)
	      };
	    }

	    if (yScale) {
	      min = helpers.isValid(options.yMin) ? options.yMin : yScale.getValueForPixel(chartArea.bottom);
	      max = helpers.isValid(options.yMax) ? options.yMax : yScale.getValueForPixel(chartArea.top);
	      model.ranges[options.yScaleID] = {
	        min: Math.min(min, max),
	        max: Math.max(min, max)
	      };
	    }
	  },
	  configure: function () {
	    var model = this._model;
	    var options = this.options;
	    var chartInstance = this.chartInstance;
	    var xScale = chartInstance.scales[options.xScaleID];
	    var yScale = chartInstance.scales[options.yScaleID];
	    var chartArea = chartInstance.chartArea; // clip annotations to the chart area

	    model.clip = {
	      x1: chartArea.left,
	      x2: chartArea.right,
	      y1: chartArea.top,
	      y2: chartArea.bottom
	    };
	    var left = chartArea.left;
	    var top = chartArea.top;
	    var right = chartArea.right;
	    var bottom = chartArea.bottom;
	    var min, max;

	    if (xScale) {
	      min = helpers.isValid(options.xMin) ? xScale.getPixelForValue(options.xMin) : chartArea.left;
	      max = helpers.isValid(options.xMax) ? xScale.getPixelForValue(options.xMax) : chartArea.right;
	      left = Math.min(min, max);
	      right = Math.max(min, max);
	    }

	    if (yScale) {
	      min = helpers.isValid(options.yMin) ? yScale.getPixelForValue(options.yMin) : chartArea.bottom;
	      max = helpers.isValid(options.yMax) ? yScale.getPixelForValue(options.yMax) : chartArea.top;
	      top = Math.min(min, max);
	      bottom = Math.max(min, max);
	    } // Ensure model has rect coordinates


	    model.left = left;
	    model.top = top;
	    model.right = right;
	    model.bottom = bottom; // Stylistic options

	    model.borderColor = options.borderColor;
	    model.borderWidth = options.borderWidth;
	    model.backgroundColor = options.backgroundColor;
	  },
	  inRange: function (mouseX, mouseY) {
	    var model = this._model;
	    return model && mouseX >= model.left && mouseX <= model.right && mouseY >= model.top && mouseY <= model.bottom;
	  },
	  getCenterPoint: function () {
	    var model = this._model;
	    return {
	      x: (model.right + model.left) / 2,
	      y: (model.bottom + model.top) / 2
	    };
	  },
	  getWidth: function () {
	    var model = this._model;
	    return Math.abs(model.right - model.left);
	  },
	  getHeight: function () {
	    var model = this._model;
	    return Math.abs(model.bottom - model.top);
	  },
	  getArea: function () {
	    return this.getWidth() * this.getHeight();
	  },
	  draw: function () {
	    var view = this._view;
	    var ctx = this.chartInstance.chart.ctx;
	    ctx.save(); // Canvas setup

	    ctx.beginPath();
	    ctx.rect(view.clip.x1, view.clip.y1, view.clip.x2 - view.clip.x1, view.clip.y2 - view.clip.y1);
	    ctx.clip();
	    ctx.lineWidth = view.borderWidth;
	    ctx.strokeStyle = view.borderColor;
	    ctx.fillStyle = view.backgroundColor; // Draw

	    var width = view.right - view.left;
	    var height = view.bottom - view.top;
	    ctx.fillRect(view.left, view.top, width, height);
	    ctx.strokeRect(view.left, view.top, width, height);
	    ctx.restore();
	  }
	});

	// Line Annotation implementation
	var chartHelpers$3 = Chart.helpers;
	var horizontalKeyword = 'horizontal';
	var verticalKeyword = 'vertical';

	function LineFunction(view) {
	  // Describe the line in slope-intercept form (y = mx + b).
	  // Note that the axes are rotated 90° CCW, which causes the
	  // x- and y-axes to be swapped.
	  var m = (view.x2 - view.x1) / (view.y2 - view.y1);
	  var b = view.x1 || 0;
	  this.m = m;
	  this.b = b;

	  this.getX = function (y) {
	    // Coordinates are relative to the origin of the canvas
	    return m * (y - view.y1) + b;
	  };

	  this.getY = function (x) {
	    return (x - b) / m + view.y1;
	  };

	  this.intersects = function (x, y, epsilon) {
	    epsilon = epsilon || 0.001;
	    var dy = this.getY(x);
	    var dx = this.getX(y);
	    return (!isFinite(dy) || Math.abs(y - dy) < epsilon) && (!isFinite(dx) || Math.abs(x - dx) < epsilon);
	  };
	}

	function calculateLabelPosition(view, width, height, padWidth, padHeight) {
	  var line = view.line;
	  var ret = {};
	  var xa = 0;
	  var ya = 0;

	  switch (true) {
	    // top align
	    case view.mode === verticalKeyword && view.labelPosition === 'top':
	      ya = padHeight + view.labelYAdjust;
	      xa = width / 2 + view.labelXAdjust;
	      ret.y = view.y1 + ya;
	      ret.x = (isFinite(line.m) ? line.getX(ret.y) : view.x1) - xa;
	      break;
	    // bottom align

	    case view.mode === verticalKeyword && view.labelPosition === 'bottom':
	      ya = height + padHeight + view.labelYAdjust;
	      xa = width / 2 + view.labelXAdjust;
	      ret.y = view.y2 - ya;
	      ret.x = (isFinite(line.m) ? line.getX(ret.y) : view.x1) - xa;
	      break;
	    // left align

	    case view.mode === horizontalKeyword && view.labelPosition === 'left':
	      xa = padWidth + view.labelXAdjust;
	      ya = -(height / 2) + view.labelYAdjust;
	      ret.x = view.x1 + xa;
	      ret.y = line.getY(ret.x) + ya;
	      break;
	    // right align

	    case view.mode === horizontalKeyword && view.labelPosition === 'right':
	      xa = width + padWidth + view.labelXAdjust;
	      ya = -(height / 2) + view.labelYAdjust;
	      ret.x = view.x2 - xa;
	      ret.y = line.getY(ret.x) + ya;
	      break;
	    // center align

	    default:
	      ret.x = (view.x1 + view.x2 - width) / 2 + view.labelXAdjust;
	      ret.y = (view.y1 + view.y2 - height) / 2 + view.labelYAdjust;
	  }

	  return ret;
	}

	var LineAnnotation = AnnotationElement.extend({
	  setDataLimits: function () {
	    var model = this._model;
	    var options = this.options; // Set the data range for this annotation

	    model.ranges = {};
	    model.ranges[options.scaleID] = {
	      min: options.value,
	      max: options.endValue || options.value
	    };
	  },
	  configure: function () {
	    var model = this._model;
	    var options = this.options;
	    var chartInstance = this.chartInstance;
	    var ctx = chartInstance.chart.ctx;
	    var scale = chartInstance.scales[options.scaleID];
	    var pixel, endPixel;

	    if (scale) {
	      pixel = helpers.isValid(options.value) ? scale.getPixelForValue(options.value, options.value.index) : NaN;
	      endPixel = helpers.isValid(options.endValue) ? scale.getPixelForValue(options.endValue, options.value.index) : pixel;
	    }

	    if (isNaN(pixel)) {
	      return;
	    }

	    var chartArea = chartInstance.chartArea; // clip annotations to the chart area

	    model.clip = {
	      x1: chartArea.left,
	      x2: chartArea.right,
	      y1: chartArea.top,
	      y2: chartArea.bottom
	    };

	    if (this.options.mode === horizontalKeyword) {
	      model.x1 = chartArea.left;
	      model.x2 = chartArea.right;
	      model.y1 = pixel;
	      model.y2 = endPixel;
	    } else {
	      model.y1 = chartArea.top;
	      model.y2 = chartArea.bottom;
	      model.x1 = pixel;
	      model.x2 = endPixel;
	    }

	    model.line = new LineFunction(model);
	    model.mode = options.mode; // Figure out the label:

	    model.labelBackgroundColor = options.label.backgroundColor;
	    model.labelFontFamily = options.label.fontFamily;
	    model.labelFontSize = options.label.fontSize;
	    model.labelFontStyle = options.label.fontStyle;
	    model.labelFontColor = options.label.fontColor;
	    model.labelXPadding = options.label.xPadding;
	    model.labelYPadding = options.label.yPadding;
	    model.labelCornerRadius = options.label.cornerRadius;
	    model.labelPosition = options.label.position;
	    model.labelXAdjust = options.label.xAdjust;
	    model.labelYAdjust = options.label.yAdjust;
	    model.labelEnabled = options.label.enabled;
	    model.labelContent = options.label.content;
	    ctx.font = chartHelpers$3.fontString(model.labelFontSize, model.labelFontStyle, model.labelFontFamily);
	    var textWidth = ctx.measureText(model.labelContent).width;
	    var textHeight = model.labelFontSize;
	    model.labelHeight = textHeight + 2 * model.labelYPadding;

	    if (model.labelContent && chartHelpers$3.isArray(model.labelContent)) {
	      var labelContentArray = model.labelContent.slice(0);
	      var longestLabel = labelContentArray.sort(function (a, b) {
	        return b.length - a.length;
	      })[0];
	      textWidth = ctx.measureText(longestLabel).width;
	      model.labelHeight = textHeight * model.labelContent.length + 2 * model.labelYPadding; // Add padding in between each label item

	      model.labelHeight += model.labelYPadding * (model.labelContent.length - 1);
	    }

	    var labelPosition = calculateLabelPosition(model, textWidth, textHeight, model.labelXPadding, model.labelYPadding);
	    model.labelX = labelPosition.x - model.labelXPadding;
	    model.labelY = labelPosition.y - model.labelYPadding;
	    model.labelWidth = textWidth + 2 * model.labelXPadding;
	    model.borderColor = options.borderColor;
	    model.borderWidth = options.borderWidth;
	    model.borderDash = options.borderDash || [];
	    model.borderDashOffset = options.borderDashOffset || 0;
	  },
	  inRange: function (mouseX, mouseY) {
	    var model = this._model;
	    return (// On the line
	      model.line && model.line.intersects(mouseX, mouseY, this.getHeight()) || // On the label
	      model.labelEnabled && model.labelContent && mouseX >= model.labelX && mouseX <= model.labelX + model.labelWidth && mouseY >= model.labelY && mouseY <= model.labelY + model.labelHeight
	    );
	  },
	  getCenterPoint: function () {
	    return {
	      x: (this._model.x2 + this._model.x1) / 2,
	      y: (this._model.y2 + this._model.y1) / 2
	    };
	  },
	  getWidth: function () {
	    return Math.abs(this._model.right - this._model.left);
	  },
	  getHeight: function () {
	    return this._model.borderWidth || 1;
	  },
	  getArea: function () {
	    return Math.sqrt(Math.pow(this.getWidth(), 2) + Math.pow(this.getHeight(), 2));
	  },
	  draw: function () {
	    var view = this._view;
	    var ctx = this.chartInstance.chart.ctx;

	    if (!view.clip) {
	      return;
	    }

	    ctx.save(); // Canvas setup

	    ctx.beginPath();
	    ctx.rect(view.clip.x1, view.clip.y1, view.clip.x2 - view.clip.x1, view.clip.y2 - view.clip.y1);
	    ctx.clip();
	    ctx.lineWidth = view.borderWidth;
	    ctx.strokeStyle = view.borderColor;

	    if (ctx.setLineDash) {
	      ctx.setLineDash(view.borderDash);
	    }

	    ctx.lineDashOffset = view.borderDashOffset; // Draw

	    ctx.beginPath();
	    ctx.moveTo(view.x1, view.y1);
	    ctx.lineTo(view.x2, view.y2);
	    ctx.stroke();

	    if (view.labelEnabled && view.labelContent) {
	      ctx.beginPath();
	      ctx.rect(view.clip.x1, view.clip.y1, view.clip.x2 - view.clip.x1, view.clip.y2 - view.clip.y1);
	      ctx.clip();
	      ctx.fillStyle = view.labelBackgroundColor; // Draw the tooltip

	      chartHelpers$3.drawRoundedRectangle(ctx, view.labelX, // x
	      view.labelY, // y
	      view.labelWidth, // width
	      view.labelHeight, // height
	      view.labelCornerRadius // radius
	      );
	      ctx.fill(); // Draw the text

	      ctx.font = chartHelpers$3.fontString(view.labelFontSize, view.labelFontStyle, view.labelFontFamily);
	      ctx.fillStyle = view.labelFontColor;
	      ctx.textAlign = 'center';

	      if (view.labelContent && chartHelpers$3.isArray(view.labelContent)) {
	        var textYPosition = view.labelY + view.labelYPadding;

	        for (var i = 0; i < view.labelContent.length; i++) {
	          ctx.textBaseline = 'top';
	          ctx.fillText(view.labelContent[i], view.labelX + view.labelWidth / 2, textYPosition);
	          textYPosition += view.labelFontSize + view.labelYPadding;
	        }
	      } else {
	        ctx.textBaseline = 'middle';
	        ctx.fillText(view.labelContent, view.labelX + view.labelWidth / 2, view.labelY + view.labelHeight / 2);
	      }
	    }

	    ctx.restore();
	  }
	});

	// Marker Annotation implementation
	var degrees = 45;
	var radians = degrees * Math.PI / 180; // For 45 degrees, sin and cos are the same

	var diagonalRatio = Math.sin(radians);
	var MarkerAnnotation = AnnotationElement.extend({
	  setDataLimits: function () {
	    var model = this._model;
	    var options = this.options;
	    var chartInstance = this.chartInstance;
	    var chartArea = chartInstance.chartArea; // Set the data range for this annotation

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
	  configure: function () {
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
	    } // clip annotations to the chart area


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
	    model.bottom = pixelY + sideSize; // Stylistic options

	    model.borderColor = options.borderColor;
	    model.borderWidth = options.borderWidth;
	    model.backgroundColor = options.backgroundColor;
	  },
	  inRange: function (mouseX, mouseY) {
	    var model = this._model;
	    return model && mouseX >= model.left && mouseX <= model.right && mouseY >= model.top && mouseY <= model.bottom;
	  },
	  getCenterPoint: function () {
	    var model = this._model;
	    return {
	      x: (model.right + model.left) / 2,
	      y: (model.bottom + model.top) / 2
	    };
	  },
	  getWidth: function () {
	    var model = this._model;
	    return Math.abs(model.right - model.left);
	  },
	  getHeight: function () {
	    var model = this._model;
	    return Math.abs(model.bottom - model.top);
	  },
	  getArea: function () {
	    return this.getWidth() * this.getHeight();
	  },
	  draw: function () {
	    var view = this._view;
	    var options = this.options;
	    var ctx = this.chartInstance.chart.ctx;
	    var sizeOffset = options.size / 2;
	    ctx.save(); // Canvas setup

	    ctx.beginPath();
	    ctx.rect(view.clip.x1, view.clip.y1, view.clip.x2 - view.clip.x1, view.clip.y2 - view.clip.y1);
	    ctx.clip();
	    ctx.lineWidth = view.borderWidth;
	    ctx.strokeStyle = view.borderColor;
	    ctx.fillStyle = view.backgroundColor;
	    var xcoord = 0.5 / diagonalRatio * (view.x1 + view.y1) - sizeOffset;
	    var ycoord = 0.5 / diagonalRatio * (view.y1 - view.x1) - sizeOffset; // Draw

	    ctx.rotate(radians);
	    ctx.fillRect(xcoord, ycoord, options.size, options.size);
	    ctx.strokeRect(xcoord, ycoord, options.size, options.size);
	    ctx.rotate(-radians);
	    ctx.restore();
	  }
	});

	/* eslint-disable global-require */

	const types = {
	  line: LineAnnotation,
	  box: BoxAnnotation,
	  marker: MarkerAnnotation
	};

	var chartHelpers$4 = Chart.helpers;

	function setAfterDataLimitsHook(axisOptions) {
	  helpers.decorate(axisOptions, 'afterDataLimits', function (previous, scale) {
	    if (previous) {
	      previous(scale);
	    }

	    helpers.adjustScaleRange(scale);
	  });
	}

	function draw(drawTime) {
	  return function (chartInstance, easingDecimal) {
	    var defaultDrawTime = chartInstance.annotation.options.drawTime;
	    helpers.elements(chartInstance).filter(function (element) {
	      return drawTime === (element.options.drawTime || defaultDrawTime);
	    }).forEach(function (element) {
	      element.configure();
	      element.transition(easingDecimal).draw();
	    });
	  };
	}

	function getAnnotationConfig(chartOptions) {
	  var plugins = chartOptions.plugins;
	  var pluginAnnotation = plugins && plugins.annotation ? plugins.annotation : null;
	  return pluginAnnotation || chartOptions.annotation || {};
	}

	var annotationPlugin = {
	  id: 'annotation',
	  beforeInit: function (chartInstance) {
	    var chartOptions = chartInstance.options; // Initialize chart instance plugin namespace

	    var ns = chartInstance.annotation = {
	      elements: {},
	      options: helpers.initConfig(getAnnotationConfig(chartOptions)),
	      onDestroy: [],
	      firstRun: true,
	      supported: false
	    }; // Add the annotation scale adjuster to each scale's afterDataLimits hook

	    chartInstance.ensureScalesHaveIDs();

	    if (chartOptions.scales) {
	      ns.supported = true;
	      chartHelpers$4.each(chartOptions.scales.xAxes, setAfterDataLimitsHook);
	      chartHelpers$4.each(chartOptions.scales.yAxes, setAfterDataLimitsHook);
	    }
	  },
	  beforeUpdate: function (chartInstance) {
	    var ns = chartInstance.annotation;

	    if (!ns.supported) {
	      return;
	    }

	    if (!ns.firstRun) {
	      ns.options = helpers.initConfig(getAnnotationConfig(chartInstance.options));
	    } else {
	      ns.firstRun = false;
	    }

	    var elementIds = []; // Add new elements, or update existing ones

	    ns.options.annotations.forEach(function (annotation) {
	      var id = annotation.id || helpers.objectId(); // No element with that ID exists, and it's a valid annotation type

	      if (!ns.elements[id] && types[annotation.type]) {
	        var cls = types[annotation.type];
	        var element = new cls({
	          id: id,
	          options: annotation,
	          chartInstance: chartInstance
	        });
	        element.initialize();
	        ns.elements[id] = element;
	        annotation.id = id;
	        elementIds.push(id);
	      } else if (ns.elements[id]) {
	        // Nothing to do for update, since the element config references
	        // the same object that exists in the chart annotation config
	        elementIds.push(id);
	      }
	    }); // Delete removed elements

	    Object.keys(ns.elements).forEach(function (id) {
	      if (elementIds.indexOf(id) === -1) {
	        ns.elements[id].destroy();
	        delete ns.elements[id];
	      }
	    });
	  },
	  beforeDatasetsDraw: draw('beforeDatasetsDraw'),
	  afterDatasetsDraw: draw('afterDatasetsDraw'),
	  afterDraw: draw('afterDraw'),
	  afterInit: function (chartInstance) {
	    // Detect and intercept events that happen on an annotation element
	    var watchFor = chartInstance.annotation.options.events;

	    if (chartHelpers$4.isArray(watchFor) && watchFor.length > 0) {
	      var canvas = chartInstance.chart.canvas;
	      var eventHandler = events.dispatcher.bind(chartInstance);
	      events.collapseHoverEvents(watchFor).forEach(function (eventName) {
	        chartHelpers$4.addEvent(canvas, eventName, eventHandler);
	        chartInstance.annotation.onDestroy.push(function () {
	          chartHelpers$4.removeEvent(canvas, eventName, eventHandler);
	        });
	      });
	    }
	  },
	  destroy: function (chartInstance) {
	    if (!chartInstance || !chartInstance.annotation) {
	      return;
	    }

	    var deregisterers = chartInstance.annotation.onDestroy;

	    while (deregisterers.length > 0) {
	      deregisterers.pop()();
	    }
	  }
	};

	// Get the chart variable
	Chart.pluginService.register(annotationPlugin);

	return annotationPlugin;

})));
