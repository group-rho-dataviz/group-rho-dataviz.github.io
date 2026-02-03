import ScrollyChart from "./scrolly_chart.js";

export default class BoxPlot extends ScrollyChart {
    constructor(svgId, data, tooltip) {
        // data is expected to be a Promise that resolves to an array of objects
        super(svgId, data, tooltip);
    }

    init() {
        this.margin = { top: 60, right: 10, bottom: 40, left: 40 };

        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = bbox.width;
        this.height = bbox.height;

        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.svg.selectAll('*').remove();
        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        this.xScale = d3.scaleBand().range([0, this.innerWidth]).padding(0.2);
        this.yScale = d3.scaleLinear().range([this.innerHeight, 0]);

        this.xAxisG = this.g.append('g')
            .attr('transform', `translate(0,${this.innerHeight})`);

        this.yAxisG = this.g.append('g');

        // Title - positioned at top center
        this.title = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', 'darkslategray')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', Math.min(this.width / 30, 20) + 'px')
            .style('font-weight', '600');
    }

    draw() {
        if (!this.g) return;

        this.data.then(data => {
            // ensure numeric values and defaults
            data.forEach(d => {
                d.value = +d.value;
                d.mentions_count = +d.mentions_count || 1;
            });

            // Process data to get summary statistics per country
            const summaryStats = d3.rollups(
                data,
                v => {
                    const tones = v.map(d => d.value).sort(d3.ascending);
                    const q1 = d3.quantile(tones, 0.25);
                    const median = d3.quantile(tones, 0.5);
                    const q3 = d3.quantile(tones, 0.75);
                    const min = d3.min(tones);
                    const max = d3.max(tones);
                    const iqr = q3 - q1;
                    // Calculate whiskers using 1.5 * IQR rule
                    const lowerWhisker = Math.max(min, q1 - 1.5 * iqr);
                    const upperWhisker = Math.min(max, q3 + 1.5 * iqr);
                    // Outliers are points outside whiskers
                    const outliers = tones.filter(t => t < lowerWhisker || t > upperWhisker);
                    return { q1, median, q3, min, max, lowerWhisker, upperWhisker, outliers };
                },
                d => d.country
            ).map(([country, stats]) => ({ country, ...stats }));

            // Set scales
            this.xScale.domain(summaryStats.map(d => d.country));
            const yMin = d3.min(summaryStats, d => d.min);
            const yMax = d3.max(summaryStats, d => d.max);
            this.yScale.domain([yMin, yMax]).nice();
            
            // Draw horizontal grid lines
            this.yAxisG.selectAll('.grid-line').remove();
            this.yAxisG.selectAll('.grid-line')
                .data(this.yScale.ticks())
                .join('line')
                .attr('class', 'grid-line')
                .attr('x1', 0)
                .attr('x2', this.innerWidth)
                .attr('y1', d => this.yScale(d))
                .attr('y2', d => this.yScale(d))
                .attr('stroke', 'lightgray');
            
            // Y-axis labels size 12px or smaller
            this.yAxisG.call(d3.axisLeft(this.yScale).tickSizeOuter(0));
            this.yAxisG.selectAll('text')
                .style('font-size', Math.min(this.width / 40, 12) + 'px');
            
            // Remove y-axis line
            this.yAxisG.selectAll('.domain').remove();
            
            // X-axis labels
            this.xAxisG.call(d3.axisBottom(this.xScale).tickSizeOuter(0));
            
            // Rotate x-axis labels if too crowded
            if (this.xScale.bandwidth() < 50) {
                this.xAxisG.selectAll('text')
                    .attr("transform", "rotate(-40)")
                    .style("text-anchor", "end")
                    .attr("dx", "-0.2em")
                    .attr("dy", "-0.1em")
                    .style('font-size', Math.min(this.width / 30, 10) + 'px');
            } else {
                this.xAxisG.selectAll('text')
                    .attr("transform", "rotate(0)")
                    .style("text-anchor", "middle")
                    .attr("dx", "0em")
                    .attr("dy", "0.75em");
            }
            
            // Remove x-axis ticks
            this.xAxisG.selectAll('.tick line').remove();

            // Draw box plots
            const boxWidth = this.xScale.bandwidth() * 0.5;

            // Remove existing boxes to avoid duplicates
            this.g.selectAll('.boxplot').remove();

            const boxColor = this.svgId.includes('tone') ? '#6b7280' : 'red';

            this.g.selectAll('.boxplot')
                .data(summaryStats)
                .join('g')
                .attr('class', 'boxplot')
                .attr('transform', d => `translate(${this.xScale(d.country) + this.xScale.bandwidth() / 2},0)`)
                .each((d, i, nodes) => {
                    const node = d3.select(nodes[i]);
                    const y = this.yScale;

                    // Draw vertical line from lower whisker to upper whisker
                    node.append('line')
                        .attr('x1', 0)
                        .attr('x2', 0)
                        .attr('y1', y(d.lowerWhisker))
                        .attr('y2', y(d.upperWhisker))
                        .attr('stroke', 'darkslategray')
                        .attr('stroke-width', 1.5);

                    // Draw lower whisker horizontal line
                    node.append('line')
                        .attr('x1', -boxWidth / 4)
                        .attr('x2', boxWidth / 4)
                        .attr('y1', y(d.lowerWhisker))
                        .attr('y2', y(d.lowerWhisker))
                        .attr('stroke', 'darkslategray')
                        .attr('stroke-width', 1.5);

                    // Draw upper whisker horizontal line
                    node.append('line')
                        .attr('x1', -boxWidth / 4)
                        .attr('x2', boxWidth / 4)
                        .attr('y1', y(d.upperWhisker))
                        .attr('y2', y(d.upperWhisker))
                        .attr('stroke', 'darkslategray')
                        .attr('stroke-width', 1.5);

                    // Draw the box (Q1 to Q3)
                    const boxHeight = y(d.q1) - y(d.q3);
                    node.append('rect')
                        .attr('x', -boxWidth / 2)
                        .attr('y', y(d.q3))
                        .attr('width', boxWidth)
                        .attr('height', boxHeight)
                        .attr('fill', boxColor)
                        .attr('opacity', 0.7)
                        .attr('stroke', 'darkslategray')
                        .attr('stroke-width', 1.5);

                    // Draw median line
                    node.append('line')
                        .attr('x1', -boxWidth / 2)
                        .attr('x2', boxWidth / 2)
                        .attr('y1', y(d.median))
                        .attr('y2', y(d.median))
                        .attr('stroke', 'darkslategray')
                        .attr('stroke-width', 2.5);

                    // Draw outliers as small circles
                    if (d.outliers && d.outliers.length > 0) {
                        node.selectAll('.outlier')
                            .data(d.outliers)
                            .join('circle')
                            .attr('class', 'outlier')
                            .attr('cx', 0)
                            .attr('cy', outlier => y(outlier))
                            .attr('r', 2)
                            .attr('fill', boxColor)
                            .attr('opacity', 0.6)
                            .attr('stroke', 'darkslategray')
                            .attr('stroke-width', 0.5);
                    }
                });

            // Add y-axis label
            this.svg.selectAll('.y-axis-label').remove();
            const yAxisLabel = this.svg.append('text')
                .attr('class', 'y-axis-label')
                .attr('transform', `rotate(-90)`)
                .attr('x', -this.height / 2)
                .attr('y', this.margin.left / 5)
                .attr('text-anchor', 'middle')
                .attr('fill', '#9ca3af')
                .style('font-family', 'Inter, sans-serif')
                .style('font-size', Math.min(this.width / 40, 12) + 'px');
            
            if (this.svgId.includes('tone')) {
                yAxisLabel.text('Median News Tone Score');
            } else {
                yAxisLabel.text('Median News Impact Score');
            }
        });

        // Update title position
        this.title
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2);
        
        if (this.svgId.includes('tone')) {
            this.title
                .text("Distribution of Conflict-Related News Tone (2021-2025)");
        } else {
            this.title
                .text("Distribution of Conflict-Related News Impact (2021-2025)");
        }
    }
}