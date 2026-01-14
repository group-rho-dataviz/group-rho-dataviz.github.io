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
                bottom: 50,
                left: 50 
            };

            this.innerWidth = this.width - this.margin.left - this.margin.right;
            this.innerHeight = this.height - this.margin.top - this.margin.bottom;

            // Year Selector - dropdown
            this.year = 2025; // default year
            const years = Array.from(new Set(data.map(d => d.YEAR))).sort();
            const container = this.svg.node()?.parentElement;
            if (container) {
                const yearSelector = d3.select(container)
                    .append('select')
                    .attr('id', 'year-selector')
                    .style('margin-top', '10px')
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

                // Center the year selector
                yearSelector.style('display', 'block')
                    .style('margin-left', 'auto')
                    .style('margin-right', 'auto');

                // Change style of dropdown options and year selector
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
                yearSelector
                    .style('background-color', '#5a6c7d')
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
                .attr('y', this.height - 10)
                .attr('text-anchor', 'middle')
                .attr('fill', '#9ca3af')
                .style('font-family', 'Inter, sans-serif')
                .style('font-size', Math.min(this.width / 30, 16) + 'px')
                .style('font-weight', '500')
                .text('Number of Mentions in News Articles');

            this.svg.append('text')
                .attr('class', 'y')
                .attr('x', -(this.margin.top + this.innerHeight / 2))
                .attr('y', 15)
                .attr('transform', 'rotate(-90)')
                .attr('text-anchor', 'middle')
                .attr('fill', '#9ca3af')
                .style('font-family', 'Inter, sans-serif')
                .style('font-size', Math.min(this.width / 30, 16) + 'px')
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
                    if (this.tooltip) {
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
                    if (this.tooltip) {
                        this.tooltip.style('opacity', 0);
                    }
                });

                if (this.specialCountries.size > 0) {
                    this.drawSpecialCountries();
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