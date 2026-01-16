import ScatterPlot from "./scatter.js";
import LineChart from "./line.js";
import ScrollyChart from "./scrolly_chart.js";

const ChartType = Object.freeze({
    LINE: 0,
    SCATTER: 1
});

export default class LineScatterChart extends ScrollyChart {
    constructor(svgId, data, tooltip = null) {
        // data is expected to be a Promise that resolves to an array of objects
        super(svgId, data, tooltip);
        this.lineChart = new LineChart(svgId, data, tooltip);
        this.scatterPlot = new ScatterPlot(svgId, data, tooltip);
        this.selectedChart = ChartType.SCATTER;
    }

    init() {
        super.init();

        if (this.selectedChart === undefined) {
            this.selectedChart = ChartType.SCATTER;
        } else {
            // Initialize the selected chart
            switch (this.selectedChart) {
                case ChartType.LINE:
                    this.lineChart.init();
                    break;
                case ChartType.SCATTER:
                    this.scatterPlot.init();
                    break;
                default:
                    console.error("Init: Unknown chart type", this.selectedChart);
            }
        }

        // Add button to the parent container to switch between Line and Scatter
        const container = this.svg.node().parentNode;
        // Remove existing button if any
        d3.select(container).select('button#toggle-line-scatter-button').remove();
        const button = d3.select(container)
            .append('button')
            .attr('id', 'toggle-line-scatter-button')
            .text('Switch to Line Chart')
            .style('display', 'block')
            .style('margin', 'auto auto')
            .style('color', 'white')
            .style('background-color', '#007BFF')
            .style('border', '1px solid #007BFF')
            .style('padding', '2px')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .on('click', () => {
                // Toggle chart type
                switch (this.selectedChart) {
                    case ChartType.LINE:
                        this.selectedChart = ChartType.SCATTER;
                        button.text('Switch to Line Chart');
                        this.scatterPlot.init();
                        this.scatterPlot.draw();
                        break;
                    case ChartType.SCATTER:
                        this.selectedChart = ChartType.LINE;
                        button.text('Switch to Scatter Plot');
                        this.lineChart.init();
                        this.lineChart.draw();
                        break;
                    default:
                        console.error("Button click: Unknown chart type", this.selectedChart);
                }
            });
    }

    draw() {
        // Draw a button 
        switch (this.selectedChart) {
            case ChartType.LINE:
                this.lineChart.draw();
                break;
            case ChartType.SCATTER:
                this.scatterPlot.draw();
                break;
            default:
                console.error("Draw: Unknown chart type", this.selectedChart);
        }
    }
}