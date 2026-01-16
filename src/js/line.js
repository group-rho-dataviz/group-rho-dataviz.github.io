import ScrollyChart from "./scrolly_chart.js";

export default class LineChart extends ScrollyChart {
    constructor(svgId, data, tooltip = null) {
        // data is expected to be a Promise that resolves to an array of objects
        super(svgId, data, tooltip);
        this.init();
    }

    init() {
        super.init();
        // Title specific to LineChart
        this.title.text("Trends Over Time");
    }

    draw() {
        // Clear previous drawings
        this.g.selectAll("*").remove();

        if (!this.g) return;

        this.title.text("Trends Over Time");
        this.data.then(data => {
            const countries = Array.from(new Set(data.map(d => d.COUNTRY))).sort();
            if (countries.length === 0) return;

            // Country selector (inside SVG as foreignObject)
            const container = this.svg.node()?.parentElement;
            if (container) {
                d3.select(this.svg.node()).selectAll('#country-selector-fo').remove();
                const selW = 240;
                const fo = d3.select(this.svg.node())
                    .append('foreignObject')
                    .attr('id', 'country-selector-fo')
                    .attr('width', selW)
                    .attr('height', 40)
                    .attr('x', this.width - selW - 12)
                    .attr('y', 8)
                    .style('overflow', 'visible');

                const div = fo.append('xhtml:div')
                    .style('width', selW + 'px')
                    .style('height', '100%')
                    .style('display', 'flex')
                    .style('align-items', 'center')
                    .style('justify-content', 'center');

                const select = div.append('select')
                    .attr('id', 'country-selector')
                    .style('background-color', '#5a6c7d')
                    .style('color', '#f3f4f6')
                    .style('font-size', '14px')
                    .style('padding', '4px 8px')
                    .on('change', (event) => {
                        this.selectedCountry = event.target.value;
                        this.draw();
                    });

                select.selectAll('option')
                    .data(countries)
                    .enter()
                    .append('option')
                    .attr('value', d => d)
                    .property('selected', d => d === (this.selectedCountry || countries[0]))
                    .text(d => d);
            }

            // Determine selected country
            const country = this.selectedCountry || countries[0];
            this.selectedCountry = country;

            // Filter and prepare series for the country
            const countryData = data
                .filter(d => d.COUNTRY === country)
                .map(d => ({ YEAR: +d.YEAR, MENTIONS: +d.MENTIONS, FATALITIES: +d.FATALITIES }))
                .sort((a, b) => a.YEAR - b.YEAR);

            if (countryData.length === 0) {
                // show no-data text
                this.g.append('text')
                    .attr('x', this.innerWidth / 2)
                    .attr('y', this.innerHeight / 2)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#9ca3af')
                    .text('No data for selected country');
                return;
            }

            // Scales
            const minYear = d3.min(countryData, d => d.YEAR);
            const maxYear = d3.max(countryData, d => d.YEAR);
            this.xScale = d3.scaleLinear().domain([minYear, maxYear]).range([0, this.innerWidth]);

            const maxMentions = d3.max(countryData, d => d.MENTIONS) || 1;
            const maxFatalities = d3.max(countryData, d => d.FATALITIES) || 1;
            // use symlog so zeros/low values display better with wide ranges
            const yLeft = d3.scaleSymlog().domain([0, maxFatalities * 1.15]).range([this.innerHeight, 0]).clamp(true);
            const yRight = d3.scaleSymlog().domain([0, maxMentions * 1.15]).range([this.innerHeight, 0]).clamp(true);

            // assign left y to this.yScale so updateAxes can use it
            this.yScale = yLeft;

            // update axes
            this.updateAxes();

            // customize bottom axis ticks as integer years
            this.xAxisG.call(d3.axisBottom(this.xScale).ticks(Math.min(10, maxYear - minYear + 1)).tickFormat(d3.format("d")))
                .attr('transform', `translate(0,${this.innerHeight})`)
                .selectAll('text').attr('fill', '#9ca3af');

            // right axis (mentions)
            this.g.selectAll('.y-right-axis').remove();
            this.g.append('g')
                .attr('class', 'y-right-axis')
                .attr('transform', `translate(${this.innerWidth},0)`)
                .call(d3.axisRight(yRight).ticks(5))
                .selectAll('text')
                .attr('fill', '#9ca3af');

            // Line generators
            const lineFatalities = d3.line()
                .x(d => this.xScale(d.YEAR))
                .y(d => yLeft(d.FATALITIES))
                .defined(d => d.FATALITIES != null);

            const lineMentions = d3.line()
                .x(d => this.xScale(d.YEAR))
                .y(d => yRight(d.MENTIONS))
                .defined(d => d.MENTIONS != null);

            // Draw lines
            this.g.selectAll('.line-path').remove();

            this.g.append('path')
                .datum(countryData)
                .attr('class', 'line-path line-fatalities')
                .attr('fill', 'none')
                .attr('stroke', '#ef4444')
                .attr('stroke-width', 2.5)
                .attr('d', lineFatalities)
                .attr('opacity', 0.95);

            this.g.append('path')
                .datum(countryData)
                .attr('class', 'line-path line-mentions')
                .attr('fill', 'none')
                .attr('stroke', '#60a5fa')
                .attr('stroke-width', 2.5)
                .attr('d', lineMentions)
                .attr('opacity', 0.95);

            // Points + tooltips
            this.g.selectAll('.point-group').remove();
            const points = this.g.append('g').attr('class', 'point-group');

            points.selectAll('.pt-fatal')
                .data(countryData.filter(d => d.FATALITIES != null))
                .enter()
                .append('circle')
                .attr('class', 'pt-fatal')
                .attr('cx', d => this.xScale(d.YEAR))
                .attr('cy', d => yLeft(d.FATALITIES))
                .attr('r', 3.5)
                .attr('fill', '#ef4444')
                .on('mouseover', (event, d) => {
                    if (this.tooltip) {
                        this.tooltip.style('opacity', 1)
                            .html(`<strong>${country} ${d.YEAR}</strong><br>Fatalities: ${d.FATALITIES}`)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px');
                    }
                })
                .on('mousemove', (event) => this.positionTooltip(event))
                .on('mouseout', () => { if (this.tooltip) this.tooltip.style('opacity', 0); });

            points.selectAll('.pt-ment')
                .data(countryData.filter(d => d.MENTIONS != null))
                .enter()
                .append('circle')
                .attr('class', 'pt-ment')
                .attr('cx', d => this.xScale(d.YEAR))
                .attr('cy', d => yRight(d.MENTIONS))
                .attr('r', 3.5)
                .attr('fill', '#60a5fa')
                .on('mouseover', (event, d) => {
                    if (this.tooltip) {
                        this.tooltip.style('opacity', 1)
                            .html(`<strong>${country} ${d.YEAR}</strong><br>Mentions: ${d.MENTIONS}`)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px');
                    }
                })
                .on('mousemove', (event) => this.positionTooltip(event))
                .on('mouseout', () => { if (this.tooltip) this.tooltip.style('opacity', 0); });

            // Legend
            this.g.selectAll('.legend').remove();
            const legend = this.g.append('g').attr('class', 'legend')
                .attr('transform', `translate(${Math.max(8, this.innerWidth - 220)}, 0)`);

            legend.append('rect').attr('x', 0).attr('y', -6).attr('width', 200).attr('height', 42).attr('fill', 'none');
            legend.append('circle').attr('cx', 6).attr('cy', 6).attr('r', 5).attr('fill', '#ef4444');
            legend.append('text').attr('x', 16).attr('y', 10).attr('fill', '#f3f4f6').style('font-size', '12px').text('Fatalities (left axis)');
            legend.append('circle').attr('cx', 106).attr('cy', 6).attr('r', 5).attr('fill', '#60a5fa');
            legend.append('text').attr('x', 116).attr('y', 10).attr('fill', '#f3f4f6').style('font-size', '12px').text('Mentions (right axis)');
        });
    }
}