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
        this.weekManager = null; // Will be set externally
        
        // Color mapping by continent
        this.continentColors = colors;
        
        // Store scales for reuse
        this.xScale = null;
        this.yScale = null;
        
        // Store x-axis information
        this.xAxis = null;
        this.xAxisGroup = null;
        this.maxValueByWeek = new Map(); // Store max value for each week
    }
    
    /**
     * Set the centralized week manager
     * @param {WeekManager} weekManager - The shared week manager instance
     */
    setWeekManager(weekManager) {
        this.weekManager = weekManager;
        if (weekManager) {
            this.allWeeks = weekManager.getWeeks();
        }
    }


    init() {
        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = bbox.width;
        this.height = bbox.height;

        // Margins to accommodate top axis
        this.margin = { top: 80, right: 40, bottom: 40, left: 20 };
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
        
        /*
        // Convert weeks to Date objects and sort them properly
        this.allWeeks = Array.from(weekGroups.keys())
            .map(week => ({
                dateString: week,
                dateObject: new Date(week)
            }))
            .sort((a, b) => a.dateObject - b.dateObject)
            .map(w => w.dateString);
        */

        // If week manager is set, use its weeks; otherwise build from data
        if (this.weekManager) {
            this.allWeeks = this.weekManager.getWeeks();
        } else {
            // Fallback: build weeks from data (old behavior)
            this.allWeeks = Array.from(weekGroups.keys())
                .map(week => ({
                    dateString: week,
                    dateObject: new Date(week)
                }))
                .sort((a, b) => a.dateObject - b.dateObject)
                .map(w => w.dateString);
        }

        this.processedData = new Map();
        this.maxValueByWeek = new Map();

        // For each week, store the data and compute max value
        weekGroups.forEach((records, week) => {
            const matchedWeek = this.allWeeks.find(w => new Date(w).getTime() === new Date(week).getTime());            
            const finalKey = matchedWeek || week;            

            const weekData = new Map();
            let maxValue = 0;
            
            // For each week since the first to week included
            // Sum up mentions for each country to get cumulative values
            records.forEach(record => {                
                const mentions = record.material_conflict_mentions || 0;
                weekData.set(record.conflict_country_name, {
                    name: record.conflict_country_name,
                    continent: record.conflict_continent,
                    mentions: mentions
                });
                maxValue = Math.max(maxValue, mentions);
            });
            
            this.processedData.set(finalKey, weekData);
            this.maxValueByWeek.set(finalKey, maxValue);
        });
        
        // Initialize missing weeks with data from the previous week
        this.allWeeks.forEach((week, index) => {
            if (!this.processedData.has(week)) {
            // Use data from previous week if available
            if (index > 0) {
                const prevWeek = this.allWeeks[index - 1];
                const prevData = this.processedData.get(prevWeek);
                if (prevData) {
                this.processedData.set(week, new Map(prevData));
                this.maxValueByWeek.set(week, this.maxValueByWeek.get(prevWeek));
                } else {
                this.processedData.set(week, new Map());
                this.maxValueByWeek.set(week, 100);
                }
            } else {
                this.processedData.set(week, new Map());
                this.maxValueByWeek.set(week, 100);
            }
            }
        });

    }

    setupChart() {
        // Create x scale that will be reused and updated (logarithmic)
        this.xScale = d3.scaleLog()
            .range([0, this.innerWidth])
            .clamp(true); // Prevent issues with zero/negative values
        
        // Create y scale for positioning bars
        this.yScale = d3.scaleBand()
            .range([0, this.innerHeight])
            .padding(0.2);
        
        // Create x-axis with custom formatting
        this.xAxis = d3.axisTop(this.xScale)
            .tickSize(-this.innerHeight) // Grid lines extending down
            .tickPadding(12)
            .tickValues([10000, 100000, 1000000, 10000000, 100000000]); // 5 ticks with custom formatting
        
        // Create axis group with styling
        this.xAxisGroup = this.g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, -20)`); // Position above the chart
        
        // Style the axis
        this.styleAxis();
    }
    
    formatAxisValue(value) {
        // Format large numbers in a readable way
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'k';
        }
        return value.toFixed(0);
    }
    
    styleAxis() {
        if (!this.xAxisGroup) return;
        
        // Style the domain line (make it invisible)
        this.xAxisGroup.select('.domain')
            .style('stroke', 'none');
        
        // Style grid lines
        this.xAxisGroup.selectAll('.tick line')
            .style('stroke', '#e5e7eb')
            .style('stroke-width', '1px')
            .style('stroke-dasharray', '2,3')
            .style('opacity', 0.5);
        
        // Style tick labels
        this.xAxisGroup.selectAll('.tick text')
            .style('font-family', 'Inter, system-ui, sans-serif')
            .style('font-size', '11px')
            .style('font-weight', '500')
            .style('fill', '#6b7280')
            .style('letter-spacing', '0.01em');
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
        const formattedValue = d.value >= 1000000 
            ? (d.value / 1000000).toFixed(1) + 'M' 
            :
            d.value >= 1000 
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
        
        // Update scales - for log scale, ensure minimum value is at least 1
        const maxValue = this.maxValueByWeek.get(currentWeek) || 100;
        const minValue = d3.min(topCountries, d => d.value) || 1;
        
        // Set domain with intelligent bounds for logarithmic scale
        // Use a nice round lower bound (power of 10)
        const lowerBound = Math.pow(10, Math.floor(Math.log10(minValue)));
        // Upper bound with some padding
        const upperBound = maxValue * 1.2;
        
        this.xScale.domain([lowerBound, upperBound]);
        this.yScale.domain(topCountries.map(d => d.name));
        
        // Dynamically filter tick values to only show those within the visible range
        const allTickValues = [10000, 100000, 1000000, 10000000, 100000000];
        const visibleTicks = allTickValues.filter(tick => 
            tick >= lowerBound && tick <= upperBound
        );

        // Update the axis tick values
        this.xAxis.tickValues(visibleTicks);

        // Update axis with smooth transition
        if (this.xAxisGroup) {
            this.xAxisGroup
                .transition()
                .duration(500)
                .ease(d3.easeQuadInOut)
                .call(this.xAxis);
            
            // Re-apply styling after transition
            this.styleAxis();
        }
        
        // Bind data to bars
        const bars = this.g.selectAll('.country-bar')
            .data(topCountries, d => d.name);
        
        // Exit
        bars.exit()
            .transition()
            .duration(500)
            .attr('width', this.safeWidth(0))
            .attr('opacity', 0)
            .remove();
        
        // Enter
        const barsEnter = bars.enter()
            .append('rect')
            .attr('class', 'country-bar')
            .attr('x', 0)
            .attr('y', d => this.yScale(d.name))
            .attr('height', this.yScale.bandwidth())
            .attr('width', this.safeWidth(0))
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
            .ease(d3.easeQuadInOut)
            .attr('y', d => this.yScale(d.name))
            .attr('height', this.yScale.bandwidth())
            .attr('width', d => this.safeWidth(this.xScale(Math.max(1, d.value)))) // Ensure value is at least 1 for log scale
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
            .ease(d3.easeQuadInOut)
            .attr('x', d => this.xScale(Math.max(1, d.value)) / 2) // Center horizontally
            .attr('y', d => this.yScale(d.name) + this.yScale.bandwidth() / 2)
            .attr('opacity', function(d) {
                const displayName = self.getDisplayName(d.name);
                // Calculate approximate text width (rough estimate: 7px per character)
                const textWidth = displayName.length * 7 + 20; // +20 for padding
                const barWidth = self.xScale(Math.max(1, d.value));
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
        // Update tooltip if currently hovering over a bar
        if (this.hoveredBar) {
            // Find the updated data for the hovered bar
            const updatedData = topCountries.find(d => d.name === this.hoveredBar.name);
            if (updatedData) {
                this.hoveredBar = updatedData; // Update reference
                this.updateTooltipContent(updatedData);
            }
        }

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