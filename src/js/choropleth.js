import ScrollyChart from './scrolly_chart.js';

export default class Choropleth extends ScrollyChart {
    constructor(svgId, data, tooltip, geoData, colors = d3.schemeTableau10) {
        super(svgId, data, tooltip);
        this.colors = colors;
        this.currentWeekIndex = 0;
        this.weeks = [];
        this.processedData = null;
        this.geoData = geoData;
        this.isPlaying = false;
        this.playInterval = null;
        this.hoveredCountry = null; // Track currently hovered country
        
        // Color mapping for conflict countries
        this.conflictCountryColors = new Map();
        this.colorPalette = [
            '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
            '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
            '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
            '#ec4899', '#f43f5e', '#fb923c', '#fbbf24', '#a3e635'
        ];
    }

    async init() {
        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = bbox.width;
        
        // Adjust margins for mobile
        const isMobile = this.width < 640;
        this.height = isMobile ? Math.max(bbox.height, 450) : Math.max(bbox.height, 550);

        this.margin = { 
            top: isMobile ? 70 : 60,
            right: isMobile ? 20 : 30, 
            bottom: isMobile ? 90 : 100,
            left: isMobile ? 20 : 30
        };
        
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.selectAll('*').remove();
        
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Set up projection
        this.projection = d3.geoMercator()
            .scale(isMobile ? this.innerWidth / 6.5 : this.innerWidth / 6)
            .translate([this.innerWidth / 2, this.innerHeight / 1.5]);

        this.path = d3.geoPath().projection(this.projection);

        // Title
        this.title = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2.5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#f3f4f6')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', Math.min(this.width / 22, 22) + 'px')
            .style('font-weight', '600')
            .text('Media Coverage of Conflicts by Country');

        // Week display
        this.weekText = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 1.5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#9ca3af')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', Math.max(this.width / 40, 11) + 'px')
            .style('font-weight', '500');

        // Controls container
        const controlsY = this.height - this.margin.bottom + (isMobile ? 25 : 30);
        
        // Play/Pause button
        this.playButton = this.svg.append('g')
            .attr('class', 'play-button-group')
            .style('cursor', 'pointer')
            .attr('transform', `translate(${this.width / 2 - 40}, ${controlsY})`)
            .on('click', () => this.togglePlay());
        
        this.playButton.append('rect')
            .attr('width', 80)
            .attr('height', 32)
            .attr('rx', 5)
            .attr('fill', '#5a6c7d')
            .on('mouseover', function() {
                d3.select(this).attr('fill', '#4a5c6d');
            })
            .on('mouseout', function() {
                d3.select(this).attr('fill', '#5a6c7d');
            });
        
        this.playButtonText = this.playButton.append('text')
            .attr('x', 40)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', '14px')
            .style('font-weight', '500')
            .style('pointer-events', 'none')
            .text('▶ Play');

        // Timeline slider
        const sliderWidth = isMobile ? this.width * 0.7 : Math.min(400, this.width * 0.6);
        const sliderX = this.width / 2 - sliderWidth / 2;
        const sliderY = controlsY + (isMobile ? 50 : 48);

        this.sliderGroup = this.svg.append('g')
            .attr('class', 'slider-group')
            .attr('transform', `translate(${sliderX}, ${sliderY})`);

        // Slider track
        this.sliderGroup.append('line')
            .attr('class', 'slider-track')
            .attr('x1', 0)
            .attr('x2', sliderWidth)
            .attr('stroke', '#374151')
            .attr('stroke-width', 4)
            .attr('stroke-linecap', 'round');

        // Slider handle
        this.sliderHandle = this.sliderGroup.append('circle')
            .attr('class', 'slider-handle')
            .attr('cx', 0)
            .attr('r', 8)
            .attr('fill', '#5a6c7d')
            .attr('stroke', '#f3f4f6')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer');

        this.sliderWidth = sliderWidth;
        this.setupSliderInteraction();
    }

    setupSliderInteraction() {
        const drag = d3.drag()
            .on('start drag', (event) => {
                this.pause();
                const x = Math.max(0, Math.min(this.sliderWidth, event.x));
                const index = Math.round((x / this.sliderWidth) * (this.weeks.length - 1));
                this.setWeek(index);
            });

        this.sliderHandle.call(drag);
        
        // Also allow clicking on track
        this.sliderGroup.select('.slider-track')
            .style('cursor', 'pointer')
            .on('click', (event) => {
                this.pause();
                const [x] = d3.pointer(event);
                const clampedX = Math.max(0, Math.min(this.sliderWidth, x));
                const index = Math.round((clampedX / this.sliderWidth) * (this.weeks.length - 1));
                this.setWeek(index);
            });
    }

    async draw() {
        // Wait for data to load
        const rawData = await this.data;
        
        // Process data
        this.processData(rawData);
        
        // Draw initial map
        this.drawMap();
        
        // Show first week
        if (this.weeks.length > 0) {
            this.updateMap(0);
        }
    }

    processData(rawData) {
        // Get all unique conflict countries and assign colors
        const uniqueConflictCountries = Array.from(new Set(rawData.map(d => d.conflict_country_name)));
        uniqueConflictCountries.forEach((country, i) => {
            this.conflictCountryColors.set(country, this.colorPalette[i % this.colorPalette.length]);
        });
        
        // Group by week and media country
        const grouped = d3.group(rawData, 
            d => d.mention_week,
            d => d.media_country
        );
        
        // Get sorted weeks (convert to Date for proper sorting)
        this.weeks = Array.from(grouped.keys()).sort((a, b) => {
            return new Date(a) - new Date(b);
        });
        
        // Create lookup structure
        this.processedData = new Map();
        
        grouped.forEach((mediaCountries, week) => {
            const weekData = new Map();
            mediaCountries.forEach((countries, mediaCountry) => {
                // Get the top covered country for this media country
                const topCountry = countries.reduce((max, curr) => 
                    curr.material_conflict_mentions > max.material_conflict_mentions ? curr : max
                );
                weekData.set(mediaCountry, topCountry);
            });
            this.processedData.set(week, weekData);
        });
    }

    getColorForCountry(conflictCountryName) {
        return this.conflictCountryColors.get(conflictCountryName) || '#6b7280';
    }

    drawMap() {
        if (!this.geoData) return;

        // Filter out Antarctica
        const features = this.geoData.features.filter(d => 
            d.properties.name !== 'Antarctica'
        );

        this.countries = this.g.selectAll('.country')
            .data(features)
            .enter()
            .append('path')
            .attr('class', 'country')
            .attr('d', this.path)
            .attr('fill', '#2d3748')
            .attr('stroke', '#1a202c')
            .attr('stroke-width', 0.5)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => this.handleMouseOver(event, d))
            .on('mousemove', (event) => this.positionTooltip(event))
            .on('mouseout', () => this.handleMouseOut())
            .on('scroll', () => {
                this.tooltip.style('opacity', 0);
            });
    }

    updateMap(weekIndex) {
        this.currentWeekIndex = weekIndex;
        const week = this.weeks[weekIndex];
        const weekData = this.processedData.get(week);

        // Update week display
        const date = new Date(week);
        this.weekText.text(`Week of ${date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        })}`);

        // Update slider position
        const sliderX = (weekIndex / (this.weeks.length - 1)) * this.sliderWidth;
        this.sliderHandle
            .transition()
            .duration(100)
            .attr('cx', sliderX);

        // Update country colors based on which conflict country they covered most
        if (this.countries) {
            this.countries
                .transition()
                .duration(300)
                .attr('fill', d => {
                    const countryName = d.properties.name;
                    const data = weekData?.get(countryName);
                    if (!data) return '#2d3748';
                    return this.getColorForCountry(data.conflict_country_name);
                });
        }
        
        // Update tooltip if currently hovering over a country
        if (this.hoveredCountry) {
            this.updateTooltipContent(this.hoveredCountry);
        }
    }

    updateTooltipContent(countryName) {
        const week = this.weeks[this.currentWeekIndex];
        const weekData = this.processedData.get(week);
        const data = weekData?.get(countryName);

        if (data) {
            this.tooltip
                .html(`
                    <strong>${countryName}</strong><br/>
                    <span style="display: inline-block; width: 10px; height: 10px; background-color: ${this.getColorForCountry(data.conflict_country_name)}; border-radius: 2px; margin-right: 4px;"></span>
                    Top covered: ${data.conflict_country_name}<br/>
                    Mentions: ${data.material_conflict_mentions.toLocaleString()}<br/>
                    Events: ${data.material_conflict_unique_events.toLocaleString()}
                `);
        } else {
            this.tooltip
                .html(`<strong>${countryName}</strong><br/>No data`);
        }
    }

    handleMouseOver(event, d) {
        const countryName = d.properties.name;
        this.hoveredCountry = countryName;

        d3.select(event.currentTarget).attr('stroke-width', 2).attr('stroke', '#f3f4f6');

        this.tooltip
            .style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        
        this.updateTooltipContent(countryName);
    }

    handleMouseOut() {
        this.hoveredCountry = null;
        this.countries.attr('stroke-width', 0.5).attr('stroke', '#1a202c');
        this.tooltip.style('opacity', 0);
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.isPlaying = true;
        this.playButtonText.text('⏸ Pause');
        
        this.playInterval = setInterval(() => {
            if (this.currentWeekIndex < this.weeks.length - 1) {
                this.updateMap(this.currentWeekIndex + 1);
            } else {
                // Loop back to start
                this.updateMap(0);
            }
        }, 1000); // Change week every second
    }

    pause() {
        this.isPlaying = false;
        this.playButtonText.text('▶ Play');
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    setWeek(index) {
        if (index >= 0 && index < this.weeks.length) {
            this.updateMap(index);
        }
    }
}