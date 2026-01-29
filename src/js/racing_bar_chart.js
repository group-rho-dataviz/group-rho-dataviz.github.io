import ScrollyChart from './scrolly_chart.js';

export default class RacingBarChart extends ScrollyChart {
    constructor(svgId, data, tooltip, fipsNames = null, colors = {}) {
        super(svgId, data, tooltip);
        this.currentWeekIndex = 0;
        this.allWeeks = [];
        this.processedData = null; // TO KEEP
        this.isPlaying = false;
        this.playInterval = null;
        this.topN = 10; // Number of countries to show
        this.fipsNames = fipsNames; // FIPS code to name mapping
        this.hoveredBar = null; // Track currently hovered bar
        
        // Color mapping by continent
        this.continentColors = colors;
        
        // Store scales for reuse
        this.xScale = null;
        this.yScale = null;
        
        // Store raw country data by week (not cumulative)
    }

    init() {
        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = bbox.width;
        this.height = bbox.height;

        // Minimal margins since we don't need axes
        this.margin = { top: 60, right: 20, bottom: 40, left: 20 };
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
            // Start at the first week
            this.currentWeekIndex = 0;
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
        

        this.processedData = new Map();

        // For each week, store the data
        weekGroups.forEach((records, week) => {
            const weekData = new Map();
            // For each week since the first to week included
            // Sum up mentions for each country to get cumulative values
            records.forEach(record => {                
                weekData.set(record.conflict_country_name, {
                    name: record.conflict_country_name,
                    continent: record.conflict_continent,
                    mentions: record.material_conflict_mentions_weighted || 0
                });
            });
            this.processedData.set(week, weekData);
        });
        
    }

    setupChart() {
        // Create x scale that will be reused and updated
        this.xScale = d3.scaleLinear()
            .range([0, this.innerWidth]);
        
        // Create y scale for positioning bars
        this.yScale = d3.scaleBand()
            .range([0, this.innerHeight])
            .padding(0.2);
    }

    getDisplayName(countryName) {
        // If we have FIPS names, look up the country code
        if (this.fipsNames) {
            // Find the FIPS code for this country name
            for (const [code, name] of Object.entries(this.fipsNames)) {
                if (name === countryName) {
                    return code; // Already have the short name
                }
            }
            // If not found in FIPS, check if the countryName itself might be a match
            // by comparing against long form names in the original data
            return countryName;
        }
        return countryName;
    }

    updateTooltipContent(d) {
        if (!this.tooltip) return;
        
        const displayName = d.name;
        const formattedValue = d.value >= 1000 
            ? (d.value / 1000).toFixed(1) + 'k' 
            : Math.round(d.value).toLocaleString();
        
        this.tooltip
            .html(`
                <strong>${displayName}</strong><br/>
                <span style="display: inline-block; width: 10px; height: 10px; background-color: ${this.continentColors[d.continent] || '#6b7280'}; border-radius: 2px; margin-right: 4px;"></span>
                Mentions: ${formattedValue}
            `)
            .style('opacity', 1);
    }


    updateChart() {
        const currentWeek = this.allWeeks[this.currentWeekIndex];
        
        const countriesAtWeek = Array.from(this.processedData.get(currentWeek).entries()).map(([name, data]) => {
            return {
                name: name,
                continent: data.continent,
                value: data.mentions,
                rank: 0
            };
        });
        
        // Sort by value and take top N
        countriesAtWeek.sort((a, b) => b.value - a.value);
        const topCountries = countriesAtWeek.slice(0, this.topN);
        
        // Assign ranks
        topCountries.forEach((d, i) => d.rank = i);
        
        // Update scales
        const maxValue = d3.max(topCountries, d => d.value) || 100;
        this.xScale.domain([0, maxValue * 1.1]);
        this.yScale.domain(topCountries.map(d => d.name));
        
        // Bind data to bars
        const bars = this.g.selectAll('.country-bar')
            .data(topCountries, d => d.name);
        
        // Exit
        bars.exit()
            .transition()
            .duration(500)
            .attr('width', 0)
            .attr('opacity', 0)
            .remove();
        
        // Enter
        const barsEnter = bars.enter()
            .append('rect')
            .attr('class', 'country-bar')
            .attr('x', 0)
            .attr('y', d => this.yScale(d.name))
            .attr('height', this.yScale.bandwidth())
            .attr('width', 0)
            .attr('fill', d => this.continentColors[d.continent] || '#6b7280')
            .attr('rx', 4)
            .attr('opacity', 0.9);
        
        // Add tooltip interactions
        const self = this;
        barsEnter
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 1);
                self.hoveredBar = d;
                
                if (self.tooltip) {
                    self.tooltip
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px');
                    self.updateTooltipContent(d);
                }
            })
            .on('mousemove', function(event) {
                if (self.tooltip) {
                    self.tooltip
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px');
                }
            })
            .on('mouseout', function(event, d) {
                d3.select(this).attr('opacity', 0.9);
                self.hoveredBar = null;
                if (self.tooltip) {
                    self.tooltip.style('opacity', 0);
                }
            });
        
        // Update
        const barsUpdate = bars.merge(barsEnter);
        
        barsUpdate
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 1);
                self.hoveredBar = d;
                
                if (self.tooltip) {
                    self.tooltip
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px');
                    self.updateTooltipContent(d);
                }
            })
            .on('mousemove', function(event) {
                if (self.tooltip) {
                    self.tooltip
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px');
                }
            })
            .on('mouseout', function(event, d) {
                d3.select(this).attr('opacity', 0.9);
                self.hoveredBar = null;
                if (self.tooltip) {
                    self.tooltip.style('opacity', 0);
                }
            });
        
        barsUpdate
            .transition()
            .duration(500)
            .attr('y', d => this.yScale(d.name))
            .attr('height', this.yScale.bandwidth())
            .attr('width', d => this.xScale(d.value))
            .attr('fill', d => this.continentColors[d.continent] || '#6b7280');
        
        // Country labels (centered on bars) - only show if they fit
        const labels = this.g.selectAll('.country-label')
            .data(topCountries, d => d.name);
        
        // Exit
        labels.exit()
            .transition()
            .duration(500)
            .attr('opacity', 0)
            .remove();
        
        // Enter
        const labelsEnter = labels.enter()
            .append('text')
            .attr('class', 'country-label')
            .attr('x', 0)
            .attr('y', d => this.yScale(d.name) + this.yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', '#ffffff')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.5)')
            .attr('opacity', 0);
        
        // Update - check if label fits in bar and center it
        const labelsUpdate = labels.merge(labelsEnter);
        
        labelsUpdate
            .transition()
            .duration(500)
            .attr('x', d => this.xScale(d.value) / 2) // Center horizontally
            .attr('y', d => this.yScale(d.name) + this.yScale.bandwidth() / 2)
            .attr('opacity', function(d) {
                const displayName = self.getDisplayName(d.name);
                // Calculate approximate text width (rough estimate: 7px per character)
                const textWidth = displayName.length * 7 + 20; // +20 for padding
                const barWidth = self.xScale(d.value);
                return barWidth > textWidth ? 1 : 0;
            })
            .tween('text', function(d) {
                const node = this;
                return function(t) {
                    // Only update text at the end of transition to avoid flickering
                    if (t > 0.9) {
                        const displayName = self.getDisplayName(d.name);
                        d3.select(node).text(displayName);
                    }
                };
            });
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
                // Loop back to start
                this.setWeek(0);
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