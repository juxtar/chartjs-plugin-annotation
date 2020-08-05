// Get the chart variable
import Chart from "chart.js";
import annotationPlugin from "./annotation";

export default annotationPlugin;

Chart.pluginService.register(annotationPlugin);
