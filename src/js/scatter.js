import ScrollyChart from './scrolly_chart.js';

export default class ScatterPlot extends ScrollyChart {
    // Scatter Plot showing relationship between number of mentions in news articles
    // and number of fatalities in a given country for a given year.
    constructor(svgId, data, tooltip = null) {
        super(svgId, data, tooltip);
        
        this.title.text("Mentions vs Fatalities");
    }

    init() {
        super.init();

        // Countries to highlight
        this.specialCountries = new Set(['Ukraine', 'India', 'Pakistan', 'Afghanistan', 'Palestine', 'United States', 'Russia', 'Israel']);

        const setup = (data) => {
            this.margin = { 
                top: 60,  
                right: 40,
                bottom: 100,
                left: 50 
            };

            this.innerWidth = this.width - this.margin.left - this.margin.right;
            this.innerHeight = this.height - this.margin.top - this.margin.bottom;

            // Year Selector - dropdown
            this.year = 2025; // default year
            const years = Array.from(new Set(data.map(d => d.YEAR))).sort();
            const container = this.svg.node()?.parentElement;
            if (container) {
                // append the year selector inside the SVG at the bottom using a foreignObject
                const selectorWidth = 220;
                d3.select(this.svg.node()).selectAll('#year-selector-fo').remove();
                const fo = d3.select(this.svg.node())
                    .append('foreignObject')
                    .attr('id', 'year-selector-fo')
                    .attr('width', selectorWidth)
                    .attr('height', 40)
                    .attr('x', (this.width - selectorWidth) / 2)
                    .attr('y', this.height - this.margin.bottom / 2)
                    .style('overflow', 'visible');

                const foDiv = fo.append('xhtml:div')
                    .style('width', selectorWidth + 'px')
                    .style('height', '100%')
                    .style('display', 'flex')
                    .style('align-items', 'center')
                    .style('justify-content', 'center');

                const yearSelector = foDiv.append('select')
                    .attr('id', 'year-selector')
                    .style('margin-top', '5px')
                    .on('change', (event) => {
                        this.selectYear(+event.target.value);
                    });

                yearSelector.selectAll('option')
                    .data(years)
                    .enter()
                    .append('option')
                    .attr('value', d => d)
                    .property('selected', d => d === this.year)
                    .text(d => d);

                // Centering and styling (kept similar to previous)
                yearSelector.style('background-color', '#5a6c7d')
                    .style('color', '#f3f4f6')
                    .style('font-size', '14px')
                    .style('font-weight', '500')
                    .style('border', '1px solid #374151')
                    .style('border-radius', '4px')
                    .style('padding', '4px 8px')
                    .on('mouseover', function() {
                        d3.select(this).attr('fill', '#4a5c6d');
                    })
                    .on('mouseout', function() {
                        d3.select(this).attr('fill', '#5a6c7d');
                    });

                yearSelector.selectAll('option')
                    .style('background-color', '#5a6c7d')
                    .style('color', '#f3f4f6')
                    .style('font-size', '14px')
                    .style('font-weight', '500')
                    .on('mouseover', function() {
                        d3.select(this).attr('fill', '#4a5c6d');
                    })
                    .on('mouseout', function() {
                        d3.select(this).attr('fill', '#5a6c7d');
                    });
            }
        };

        if (this.data && typeof this.data.then === 'function') {
            this.data.then(data => setup(data));
        } else {
            setup(this.data || []);
        }
    }

    selectYear(year) {
        this.year = year;
        this.draw();
    }

    processDataByYear(data, year) {
        return data.filter(d => d.YEAR === year);
    }

    draw() {
        if (!this.g) return;
        this.title.text("Mentions vs Fatalities");
        this.data.then(data => {
            // Get data for the selected year
            const yearData = this.processDataByYear(data, this.year);

            // Set up scales
            const xMax = d3.max(yearData, d => d.MENTIONS) || 10;
            this.xScale = d3.scaleSymlog()
                .clamp(true)
                .range([0, this.innerWidth])
                .domain([1, xMax]);

            const yMax = d3.max(yearData, d => d.FATALITIES) || 1;
            this.yScale = d3.scaleSymlog()
                .clamp(true)
                .range([this.innerHeight, 0])
                .domain([1, yMax]);

            // compute tick values at powers of ten (1, 10, 100, 1k, ...)
            const xMaxPow = Math.max(0, Math.ceil(Math.log10(xMax)));
            const xTickValues = [];
            for (let p = 0; p < xMaxPow; p++) {
                xTickValues.push(Math.pow(10, p));
            }
            xTickValues[xTickValues.length-1] = xMax;

            const yMaxPow = Math.max(0, Math.ceil(Math.log10(yMax)));
            const yTickValues = [];
            for (let p = 0; p <= yMaxPow; p++) {
                yTickValues.push(Math.pow(10, p));
            }
            yTickValues[yTickValues.length-1] = yMax;

            this.svg.selectAll('g').remove();
            this.g = this.svg.append('g')
                .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

            // x-axis, put ticks and labels only every power of ten
            const xAxis = d3.axisBottom(this.xScale)
                .tickValues(xTickValues)
                .tickFormat(d3.format(".0s"));
            this.xAxisG = this.g.append('g')
                .attr('transform', `translate(0,${this.innerHeight})`)
                .call(xAxis);

            // y-axis, put ticks and labels only every power of ten
            const yAxis = d3.axisLeft(this.yScale)
                .tickValues(yTickValues)
                .tickFormat(d3.format(".0s"));

            this.yAxisG = this.g.append('g')
                .call(yAxis);

            // Axis labels
            this.svg.append('text')
                .attr('class', 'x')
                .attr('x', this.margin.left + this.innerWidth / 2)
                .attr('y', this.height - this.margin.bottom / 1.7)
                .attr('text-anchor', 'middle')
                .attr('fill', '#9ca3af')
                .style('font-family', 'Inter, sans-serif')
                .style('font-size', Math.min(this.width / 25, 16) + 'px')
                .style('font-weight', '500')
                .text('Number of Mentions');

            this.svg.append('text')
                .attr('class', 'y')
                .attr('x', -(this.margin.top + this.innerHeight / 2))
                .attr('y', this.margin.left / 3)
                .attr('transform', 'rotate(-90)')
                .attr('text-anchor', 'middle')
                .attr('fill', '#9ca3af')
                .style('font-family', 'Inter, sans-serif')
                .style('font-size', Math.min(this.width / 25, 16) + 'px')
                .style('font-weight', '500')
                .text('Number of Fatalities');
            
            // Draw points
            this.g.selectAll('.scatter-point')
                .data(yearData)
                .enter()
                .append('circle')
                    .attr('class', 'scatter-point')
                    .attr('cx', d => this.xScale(d.MENTIONS))
                    .attr('cy', d => this.yScale(d.FATALITIES))
                    .attr('r', this.width < 640 ? 4 : 6)
                    .attr('fill', 'lightgray')
                    .attr('opacity', 0.75)
                .on('mouseover', (event, d) => {
                    // gray out other points and remove their labels
                    this.g.selectAll('.scatter-point')
                        .attr('opacity', p => (p === d ? 0.9 : 0.1));
                    this.g.selectAll('.point-label').remove();
                    /* TOOLTIP LINES REMOVED FOR NOW
                    // draw previous years for this country (as a line on the scatter plot)
                    const countryData = data.filter(p => p.COUNTRY === d.COUNTRY && p.YEAR <= this.year);
                    console.log("countryData", countryData);
                    if (countryData.length > 0) {
                        const lineGenerator = d3.line()
                            .x(p => this.xScale(p.MENTIONS))
                            .y(p => this.yScale(p.FATALITIES));
                        this.g.append('path')
                            .datum(countryData)
                            .attr('class', 'country-line')
                            .attr('d', lineGenerator)
                            .attr('fill', 'none')
                            .attr('stroke', '#f3f4f6')
                            .attr('stroke-width', 2)
                            .attr('opacity', 0.8);
                        // add labels for each year point
                        this.g.selectAll('.country-point-label')
                            .data(countryData)
                            .enter()
                            .append('text')
                            .attr('class', 'country-point-label')
                            .attr('x', p => this.xScale(p.MENTIONS))
                            .attr('y', p => this.yScale(p.FATALITIES) - 10)
                            .attr('text-anchor', 'middle')
                            .attr('font-size', this.width < 640 ? '10px' : '12px')
                            .attr('font-weight', '500')
                            .attr('fill', 'red')
                            .text(p => p.YEAR);
                    }
                    */
                    if (this.tooltip) {
                        // show tooltip
                        this.tooltip
                            .style('opacity', 1)
                            .html(`<strong>Country:</strong> ${d.COUNTRY}<br><strong>Mentions:</strong> ${d.MENTIONS}<br><strong>Fatalities:</strong> ${d.FATALITIES}`)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px');
                    }
                })
                .on('mousemove', (event) => {
                    this.positionTooltip(event);
                })
                .on('mouseout', () => {
                    // restore all points and redraw special country labels
                    this.g.selectAll('.scatter-point')
                        .attr('opacity', 0.75);
                    this.g.selectAll('.point-label').remove();
                    this.drawSpecialCountries();
                    /* TOOLTIP LINES REMOVED FOR NOW
                    // remove country line
                    this.g.selectAll('.country-line').remove();
                    this.g.selectAll('.country-point-label').remove();
                    */
                    if (this.tooltip) {
                        this.tooltip.style('opacity', 0);
                    }
                });

                if (this.specialCountries.size > 0) {
                    this.drawSpecialCountries();
                }

            // If year is 2025, add circle highlighting countries with more than 1k fatalities but less than 100k mentions
            if (this.year === 2025) {
                const radiusX = this.xScale(100000);
                const radiusY = this.yScale(1000);
                console.log("Drawing highlight ellipse with radii:", radiusX, radiusY);
                this.g.append('ellipse')
                    .attr('cx', this.xScale(1000) + (radiusX - this.xScale(1000)) / 2)
                    .attr('cy', this.yScale(20000) + (radiusY - this.yScale(20000)) / 2)
                    .attr('rx', (radiusX - this.xScale(1000)) / 2)
                    .attr('ry', (radiusY - this.yScale(20000)) / 2)
                    .attr('fill', 'none')
                    .attr('stroke', '#f1c503')
                    .attr('stroke-width', 3)
                    .attr('stroke-dasharray', '6,4')
                    .attr('opacity', 0.8);
                // Add label for the highlighted area shifted to the top left
                const labelX = this.xScale(20);
                const labelY = this.yScale(30000);
                const label = this.g.append('text')
                    .attr('x', labelX)
                    .attr('y', labelY)
                    .attr('text-anchor', 'start')
                    .attr('font-size', this.width < 640 ? '12px' : '14px')
                    .attr('font-weight', '600')
                    .attr('fill', '#f1c503');
                label.append('tspan')
                    .attr('x', labelX)
                    .attr('dy', '0em')
                    .text('High Fatalities,');
                label.append('tspan')
                    .attr('x', labelX)
                    .attr('dy', '1.4em')
                    .text('Low Mentions');
            }
        });
    }

    drawSpecialCountries() {
        // Highlight special countries, bring them to front and add a label
        this.g.selectAll('.scatter-point')
            .filter(d => this.specialCountries.has(d.COUNTRY))
            .attr('fill', '#ff4d4d')
            .attr('opacity', 1)
            .attr('r', this.width < 640 ? 6 : 8)
            .raise()
            .each((d, i, nodes) => {
                const point = d3.select(nodes[i]);
                this.g.append('text')
                    .attr('class', 'point-label')
                    .attr('x', point.attr('cx'))
                    .attr('y', i % 2 === 1 ? point.attr('cy') - 10 : +point.attr('cy') + 15)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', this.width < 640 ? '10px' : '12px')
                    .attr('font-weight', '600')
                    .attr('fill', '#f3f4f6')
                    .text(d.COUNTRY);
            });
    }
}