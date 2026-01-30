import ScrollyChart from "./scrolly_chart.js";

export default class LineChart extends ScrollyChart {
    constructor(svgId, data, tooltip) {
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
            .style('font-size', Math.min(this.width / 22, 22) + 'px')
            .style('font-weight', '600');
    }

    draw() {
        if (!this.g) return;

        this.data.then(data => {
            // Process data
            const xDomain = data.map(d => d.Date);
            const yMax = d3.max(data, d => d.Fatalities);
            this.xScale.domain(xDomain);
            this.yScale.domain([0, yMax]);

            // Draw axes (x-axis has a tick every year, NOT EVERY MONTH!)
            const xAxis = d3.axisBottom(this.xScale)
                .tickValues(this.xScale.domain().filter(d => d?.getMonth() === 0 && d?.getYear() % 2 === 1))
                .tickFormat(d3.timeFormat("%Y"));
            this.xAxisG.call(xAxis).selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");

            const yAxis = d3.axisLeft(this.yScale).ticks(5);
            this.yAxisG.call(yAxis).selectAll("path").remove();

            // Draw thin horizontal grid lines at y ticks
            const yTicks = this.yScale.ticks(5);
            this.g.append('g')
                .attr('class', 'y-grid')
                .selectAll('line')
                .data(yTicks)
                .enter()
                .append('line')
                .attr('x1', 0)
                .attr('x2', this.innerWidth)
                .attr('y1', d => this.yScale(d))
                .attr('y2', d => this.yScale(d))
                .attr('stroke', '#374151')
                .attr('stroke-opacity', 0.3)
                .attr('stroke-width', 1);

            // Draw line
            const line = d3.line()
                .x(d => this.xScale(d.Date) + this.xScale.bandwidth() / 2)
                .y(d => this.yScale(d.Fatalities))
                .curve(d3.curveMonotoneX);
            this.g.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("d", line);

            // Invisible wide hover path to trigger tooltip near the line
            const bisectThreshold = 20; // px tolerance for "close enough"

            this.g.append("path")
                .datum(data)
                .attr("class", "hover-line")
                .attr("d", line)
                .attr("fill", "none")
                .attr("stroke", "transparent")
                .attr("stroke-width", 30) // wide stroke to make hovering easier
                .style("pointer-events", "stroke")
                .on("mouseover", (event) => {
                    this.tooltip.style("display", "block").style("opacity", 1);
                })
                .on("mousemove", (event) => {
                    // determine nearest data point to mouse
                    const [mx, my] = d3.pointer(event, this.g.node());
                    let closest = null;
                    let minDist = Infinity;
                    data.forEach(d => {
                        const cx = this.xScale(d.Date) + this.xScale.bandwidth() / 2;
                        const cy = this.yScale(d.Fatalities);
                        const dist = Math.hypot(mx - cx, my - cy);
                        if (dist < minDist) {
                            minDist = dist;
                            closest = d;
                        }
                    });

                    if (closest && minDist <= bisectThreshold) {
                        this.tooltip
                            .style("display", "block")
                            .style("opacity", 1)
                            .html(`Date: ${d3.timeFormat("%b %Y")(closest.Date)}<br>Fatalities: ${closest.Fatalities}`);
                    } else {
                        this.tooltip.style("opacity", 0).style("display", "none");
                    }

                    this.positionTooltip(event);
                })
                .on("mouseout", () => {
                    this.tooltip.style("opacity", 0).style("display", "none");
                });

            // Add Annotation
            if (this.svgId === 'myanmar-line-chart') {
                // Find data point for August 2017
                const RohingyaData = data.find(d => d.Date.getFullYear() === 2017 && d.Date.getMonth() === 7);
                if (RohingyaData) {
                    const ax = this.xScale(RohingyaData.Date) + this.xScale.bandwidth() / 2;
                    const ay = this.yScale(RohingyaData.Fatalities);
                    this.g.append("circle")
                        .attr("cx", ax)
                        .attr("cy", ay)
                        .attr("r", 5)
                        .attr("fill", "orange")
                        .attr("pointer-events", "none");
                    this.g.append("text")
                        .attr("x", ax) // center align
                        .attr("y", ay - 10)
                        .attr("fill", "orange")
                        .attr("text-anchor", "middle")
                        .style("font-size", "12px")
                        .text("Rohingya Crisis Peak");
                }

                // Find data point for February 2021
                const CoupData = data.find(d => d.Date.getFullYear() === 2021 && d.Date.getMonth() === 1);
                if (CoupData) {
                    const ax = this.xScale(CoupData.Date) + this.xScale.bandwidth() / 2;
                    const ay = this.yScale(CoupData.Fatalities);
                    this.g.append("circle")
                        .attr("cx", ax)
                        .attr("cy", ay)
                        .attr("r", 5)
                        .attr("fill", "orange")
                        .attr("pointer-events", "none");
                    this.g.append("text")
                        .attr("x", ax + 10) // center align
                        .attr("y", ay)
                        .attr("fill", "orange")
                        .attr("text-anchor", "left")
                        .style("font-size", "12px")
                        .text("Military Coup");
                }
            } else if (this.svgId === 'burkina-line-chart') {
                // Find data point for January 2016
                const AttackData = data.find(d => d.Date.getFullYear() === 2016 && d.Date.getMonth() === 0);
                if (AttackData) {
                    const ax = this.xScale(AttackData.Date) + this.xScale.bandwidth() / 2;
                    const ay = this.yScale(AttackData.Fatalities);
                    this.g.append("circle")
                        .attr("cx", ax)
                        .attr("cy", ay)
                        .attr("r", 5)
                        .attr("fill", "orange")
                        .attr("pointer-events", "none");
                    this.g.append("text")
                        .attr("x", ax) // center align
                        .attr("y", ay - 10)
                        .attr("fill", "orange")
                        .attr("text-anchor", "middle")
                        .style("font-size", "12px")
                        .text("Ouagadougou Attacks");
                }

                // Find data point for January 2022
                const CoupData = data.find(d => d.Date.getFullYear() === 2022 && d.Date.getMonth() === 0);
                if (CoupData) {
                    const ax = this.xScale(CoupData.Date) + this.xScale.bandwidth() / 2;
                    const ay = this.yScale(CoupData.Fatalities);
                    this.g.append("circle")
                        .attr("cx", ax)
                        .attr("cy", ay)
                        .attr("r", 5)
                        .attr("fill", "orange")
                        .attr("pointer-events", "none");
                    this.g.append("text")
                        .attr("x", ax - 15) // center align
                        .attr("y", ay - 12)
                        .attr("fill", "orange")
                        .attr("text-anchor", "middle")
                        .style("font-size", "12px")
                        .text("Military Coup");
                }
            }

            // Set title
            this.title.text("Fatalities Over Time");
        });
    }
}