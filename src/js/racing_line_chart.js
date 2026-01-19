import ScrollyChart from './scrolly_chart.js';

export default class RacingLineChart extends ScrollyChart {
    constructor(svgId, data, tooltip) {
        super(svgId, data, tooltip);
        this.allWeeks = [];
        this.weekData = new Map();
        this.currentWeekIndex = 0;
        this.isPlaying = false;
        this.playInterval = null;
        this.windowSize = 10; // Number of weeks to show in the moving window
        this.topN = 5; // Number of countries to track
        
        // Color mapping by continent
        this.continentColors = {
            'Africa': '#cd853f',
            'Asia': '#f59e0b',
            'Europe': '#3b82f6',
            'North America': '#ef4444',
            'South America': '#22c55e',
            'Oceania': '#8b5cf6'
        };
        
        // Store scales for reuse
        this.xScale = null;
        this.yScale = null;
        this.line = null;
    }

    init() {
        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = bbox.width;
        this.height = bbox.height;

        // Adjusted margins for better visibility
        this.margin = { top: 40, right: 150, bottom: 60, left: 80 };
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.selectAll('*').remove();
        
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    async draw() {
        const rawData = await this.data;
        this.processData(rawData);
        
        if (this.allWeeks.length > 0) {
            this.currentWeekIndex = Math.min(this.windowSize - 1, this.allWeeks.length - 1);
            this.setupChart();
            this.updateChart();
        }
    }

    processData(rawData) {
        // Group by week and sort chronologically
        const weekGroups = d3.group(rawData, d => d.mention_week);
        
        // Convert weeks to Date objects and sort them properly
        this.allWeeks = Array.from(weekGroups.keys())
            .map(week => ({
                dateString: week,
                dateObject: new Date(week)
            }))
            .sort((a, b) => a.dateObject - b.dateObject)
            .map(w => w.dateString);
        
        // For each week, store the data
        weekGroups.forEach((records, week) => {
            this.weekData.set(week, records);
        });
        
        // Build cumulative data for all countries across all weeks
        this.countriesData = new Map();
        
        this.allWeeks.forEach((week, weekIndex) => {
            const records = this.weekData.get(week);
            
            records.forEach(record => {
                const country = record.conflict_country_name;
                
                if (!this.countriesData.has(country)) {
                    this.countriesData.set(country, {
                        name: country,
                        continent: record.conflict_continent,
                        values: []
                    });
                }
                
                this.countriesData.get(country).values.push({
                    week: week,
                    weekIndex: weekIndex,
                    mentions: record.material_conflict_mentions || 0
                });
            });
        });
        
        // Fill in missing weeks with 0
        this.countriesData.forEach(countryData => {
            const existingWeeks = new Set(countryData.values.map(v => v.week));
            
            this.allWeeks.forEach((week, weekIndex) => {
                if (!existingWeeks.has(week)) {
                    countryData.values.push({
                        week: week,
                        weekIndex: weekIndex,
                        mentions: 0
                    });
                }
            });
            
            // Sort by weekIndex to maintain chronological order
            countryData.values.sort((a, b) => a.weekIndex - b.weekIndex);
        });
        
        // Determine top N countries by total mentions
        const countryTotals = Array.from(this.countriesData.entries()).map(([name, data]) => {
            const total = d3.sum(data.values, v => v.mentions);
            return { name, total, data };
        });
        
        countryTotals.sort((a, b) => b.total - a.total);
        this.topCountries = countryTotals.slice(0, this.topN).map(c => c.data);
    }

    setupChart() {
        // Calculate the maximum mentions across ALL data to keep scale consistent
        const maxMentions = d3.max(this.topCountries, d => 
            d3.max(d.values, v => v.mentions)
        ) || 100;
        
        // Create scales that will be reused
        this.xScale = d3.scaleLinear()
            .domain([0, this.windowSize - 1])
            .range([0, this.innerWidth]);
        
        this.yScale = d3.scaleLinear()
            .domain([0, maxMentions * 1.15])
            .range([this.innerHeight, 0]);
        
        // Line generator with smoother curve
        this.line = d3.line()
            .x((d, i) => this.xScale(i))
            .y(d => this.yScale(d.mentions))
            .curve(d3.curveMonotoneX);
        
        // Draw static elements (axes, grid)
        this.drawStaticElements();
    }

    drawStaticElements() {
        // Clear only the static group if it exists
        this.g.selectAll('.static-elements').remove();
        
        const staticGroup = this.g.append('g').attr('class', 'static-elements');
        
        // Grid lines
        staticGroup.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(this.yScale)
                .tickSize(-this.innerWidth)
                .tickFormat('')
            )
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line')
                .attr('stroke', '#374151')
                .attr('stroke-opacity', 0.3)
            );
        
        // Y-axis
        const yAxis = d3.axisLeft(this.yScale)
            .ticks(6)
            .tickFormat(d => {
                if (d >= 1000) return (d/1000).toFixed(0) + 'k';
                return d.toLocaleString();
            });
        
        staticGroup.append('g')
            .call(yAxis)
            .call(g => g.select('.domain').attr('stroke', '#9ca3af'))
            .call(g => g.selectAll('.tick line').attr('stroke', '#9ca3af'))
            .call(g => g.selectAll('.tick text')
                .attr('fill', '#9ca3af')
                .style('font-family', 'Inter, sans-serif')
                .style('font-size', '11px')
            );
        
        // Y-axis label
        staticGroup.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.innerHeight / 2)
            .attr('y', -55)
            .attr('text-anchor', 'middle')
            .attr('fill', '#9ca3af')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .text('Material Conflict Mentions');
    }

    updateChart() {
        // Calculate window bounds
        const startIdx = Math.max(0, this.currentWeekIndex - this.windowSize + 1);
        const endIdx = this.currentWeekIndex;
        const visibleWeeks = this.allWeeks.slice(startIdx, endIdx + 1);
        
        // Get data for visible window
        const windowData = this.topCountries.map(country => {
            const visibleValues = country.values.slice(startIdx, endIdx + 1);
            return {
                ...country,
                visibleValues: visibleValues
            };
        });
        
        // Update X-axis with better date formatting
        this.g.selectAll('.x-axis').remove();
        
        const xAxis = d3.axisBottom(this.xScale)
            .tickValues([0, Math.floor((visibleWeeks.length - 1) / 2), visibleWeeks.length - 1])
            .tickFormat((d) => {
                const weekIndex = Math.floor(d);
                if (weekIndex < 0 || weekIndex >= visibleWeeks.length) return '';
                const date = new Date(visibleWeeks[weekIndex]);
                return date.toLocaleDateString('en-US', { 
                    year: '2-digit',
                    month: 'short', 
                    day: 'numeric' 
                });
            });
        
        this.g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.innerHeight})`)
            .call(xAxis)
            .call(g => g.select('.domain').attr('stroke', '#9ca3af'))
            .call(g => g.selectAll('.tick line').attr('stroke', '#9ca3af'))
            .call(g => g.selectAll('.tick text')
                .attr('fill', '#9ca3af')
                .style('font-family', 'Inter, sans-serif')
                .style('font-size', '10px')
            );
        
        // X-axis label
        this.g.selectAll('.x-label').remove();
        this.g.append('text')
            .attr('class', 'x-label')
            .attr('x', this.innerWidth / 2)
            .attr('y', this.innerHeight + 45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#9ca3af')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', '11px')
            .style('font-weight', '500')
            .text('Week');
        
        // Update or create lines with better visibility
        const lines = this.g.selectAll('.country-line')
            .data(windowData, d => d.name);
        
        // Exit
        lines.exit().remove();
        
        // Enter + Update
        const linesEnterUpdate = lines.enter()
            .append('path')
            .attr('class', 'country-line')
            .attr('fill', 'none')
            .attr('stroke', d => this.continentColors[d.continent] || '#6b7280')
            .attr('stroke-width', 3)
            .attr('opacity', 0.9)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .merge(lines)
            .attr('d', d => this.line(d.visibleValues));
        
        // Update dots - larger for better visibility
        const dots = this.g.selectAll('.end-dot')
            .data(windowData, d => d.name);
        
        dots.exit().remove();
        
        dots.enter()
            .append('circle')
            .attr('class', 'end-dot')
            .attr('r', 7)
            .attr('fill', d => this.continentColors[d.continent] || '#6b7280')
            .attr('stroke', '#1f2937')
            .attr('stroke-width', 2.5)
            .merge(dots)
            .attr('cx', this.xScale(visibleWeeks.length - 1))
            .attr('cy', d => this.yScale(d.visibleValues[d.visibleValues.length - 1].mentions));
        
        // Update labels with better positioning
        const labels = this.g.selectAll('.end-label')
            .data(windowData, d => d.name);
        
        labels.exit().remove();
        
        labels.enter()
            .append('text')
            .attr('class', 'end-label')
            .attr('dy', '0.35em')
            .attr('fill', d => this.continentColors[d.continent] || '#6b7280')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .merge(labels)
            .attr('x', this.xScale(visibleWeeks.length - 1) + 12)
            .attr('y', d => this.yScale(d.visibleValues[d.visibleValues.length - 1].mentions))
            .text(d => d.name.length > 15 ? d.name.substring(0, 13) + '...' : d.name);
    }

    setWeek(index) {
        if (index >= 0 && index < this.allWeeks.length) {
            this.currentWeekIndex = index;
            this.updateChart();
        }
    }

    play() {
        this.isPlaying = true;
        
        this.playInterval = setInterval(() => {
            if (this.currentWeekIndex < this.allWeeks.length - 1) {
                this.setWeek(this.currentWeekIndex + 1);
            } else {
                this.pause();
            }
        }, 1000);
    }

    pause() {
        this.isPlaying = false;
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
}