import ScrollyChart from './scrolly_chart.js';

export default class ScatterPlot extends ScrollyChart {
    constructor(svgId, data, tooltip = null) {
        super(svgId, data, tooltip);
        // Title specific to Scatter
        this.title.text("Scatter Plot Example");
    }

    draw() {
        if (!this.g) return;
        this.g.selectAll('*').remove();
        this.title.text("Scatter Plot Example");
        this.data.then(data => {
            // Set up scales
            this.xScale = d3.scaleLinear()
                .domain(d3.extent(data, d => d.x)).nice()
                .range([0, this.innerWidth]);
            this.yScale = d3.scaleLinear()
                .domain(d3.extent(data, d => d.y)).nice()
                .range([this.innerHeight, 0]);
            // Axes
            this.xAxisG.call(d3.axisBottom(this.xScale));
            this.yAxisG.call(d3.axisLeft(this.yScale));
            // Draw points
            this.g.selectAll('.scatter-point')
                .data(data)
                .join('circle')
                .attr('class', 'scatter-point')
                .attr('cx', d => this.xScale(d.x))
                .attr('cy', d => this.yScale(d.y))
                .attr('r', this.width < 640 ? 4 : 6)
                .attr('fill', '#ff4d4d')
                .attr('opacity', 0.7)
                .on('mouseover', (event, d) => {
                    if (this.tooltip) {
                        this.tooltip
                            .style('opacity', 1)
                            .html(`X: ${d.x}<br>Y: ${d.y}`)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px');
                    }
                })
                .on('mouseout', () => {
                    if (this.tooltip) {
                        this.tooltip.style('opacity', 0);
                    }
                });
        });

        // Resize SVG to fit scatter plot
        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
    }
}