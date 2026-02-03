import ScrollyChart from "./scrolly_chart.js";

export default class ViolinPlot extends ScrollyChart {
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
                    return { q1, median, q3, min, max };
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

            // Draw violin plots
            const violinWidth = this.xScale.bandwidth() * 0.8;

            // remove existing violins to avoid duplicates
            this.g.selectAll('.violin').remove();

            this.g.selectAll('.violin')
                .data(summaryStats)
                .join('g')
                .attr('class', 'violin')
                .attr('transform', d => `translate(${this.xScale(d.country) + this.xScale.bandwidth() / 2},0)`)
                .each((d, i, nodes) => {
                    // build weighted sample by repeating value according to mentions_count (caps to avoid extreme expansion)
                    const raw = data.filter(dd => dd.country === d.country);
                    const countryData = [];
                    raw.forEach(dd => {
                        const val = +dd.value;
                        const count = Math.max(1, Math.round(Math.min(dd.mentions_count, 200))); // cap to 200 repeats
                        for (let r = 0; r < count; r++) countryData.push(val);
                    });
                    if (countryData.length === 0) return;

                    // Silverman's rule of thumb for bandwidth (per-country)
                    const sd = d3.deviation(countryData) || (this.yScale.domain()[1] - this.yScale.domain()[0]) / 10;
                    const bw = Math.max( (1.06 * sd * Math.pow(countryData.length, -1/5)), (this.yScale.domain()[1] - this.yScale.domain()[0]) * 1e-3 );

                    // KDE over y domain ticks
                    const kde = kernelDensityEstimator(kernelEpanechnikov(bw), this.yScale.ticks(60));
                    const density = kde(countryData);
                    const maxDensity = d3.max(density, dd => dd[1]) || 0.0001;

                    const y = this.yScale;
                    const x = d3.scaleLinear()
                        .range([0, violinWidth / 2])
                        .domain([0, maxDensity]);
                    const area = d3.area()
                        .x0(dd => -x(dd[1]))
                        .x1(dd => x(dd[1]))
                        .y(dd => y(dd[0]))
                        .curve(d3.curveLinear);
                    const path = d3.select(nodes[i]).append('path')
                        .datum(density)
                        .attr('d', area)
                        .attr('opacity', 0.7);

                    if (this.svgId.includes('tone')) {
                        path.attr('fill', '#6b7280');
                    } else {
                        path.attr('fill', 'red');
                    }

                    // Draw median line slightly shorter than full violin width
                    const medianY = y(d.median);
                    const medianWidth = violinWidth * 0.7;
                    d3.select(nodes[i]).append('line')
                        .attr('x1', -medianWidth / 2)
                        .attr('x2', medianWidth / 2)
                        .attr('y1', medianY)
                        .attr('y2', medianY)
                        .attr('stroke', 'darkslategray')
                        .attr('stroke-width', 2);
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
                .style('font-size', Math.min(this.width / 40, 12) + 'px')
            if (this.svgId.includes('tone')) {
                yAxisLabel.text('Median News Tone Score');
            } else {
                yAxisLabel.text('Median News Impact Score');
            }

            function kernelDensityEstimator(kernel, X) {
                return function(V) {
                    return X.map(function(x) {
                        return [x, d3.mean(V, function(v) { return kernel(x - v); })];
                    });
                };
            }

            function kernelEpanechnikov(bandwidth) {
                // returns a kernel function that already includes 1/h scaling
                return function(v) {
                    const u = v / bandwidth;
                    return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) / bandwidth : 0;
                };
            }
        });

        // Update title position
        this.title
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2)
        if (this.svgId.includes('tone')) {
            this.title
                .text("Distribution of Conflict-Related News Tone (2021-2025)");
        } else {
            this.title
                .text("Distribution of Conflict-Related News Impact (2021-2025)");
        }
    }
}