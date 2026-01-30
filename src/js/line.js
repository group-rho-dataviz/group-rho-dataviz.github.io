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

        if (this.svg.id === 'myanmar-line-chart')
            console.log("Drawing Myanmar Line Chart");
        else if (this.svg.id === 'burkina-line-chart')
            console.log("Drawing Burkina Faso Line Chart");

        this.data.then(data => {
            // Process data
            const xDomain = data.map(d => d.date);
            const yMax = d3.max(data, d => d.fatalities);
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
                .x(d => this.xScale(d.date) + this.xScale.bandwidth() / 2)
                .y(d => this.yScale(d.fatalities))
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
                        const cx = this.xScale(d.date) + this.xScale.bandwidth() / 2;
                        const cy = this.yScale(d.fatalities);
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
                            .html(`Date: ${d3.timeFormat("%b %Y")(closest.date)}<br>Fatalities: ${closest.fatalities}`);
                    } else {
                        this.tooltip.style("opacity", 0).style("display", "none");
                    }

                    this.positionTooltip(event);
                })
                .on("mouseout", () => {
                    this.tooltip.style("opacity", 0).style("display", "none");
                });

            // Set title
            this.title.text("Fatalities Over Time");
        });
    }
}