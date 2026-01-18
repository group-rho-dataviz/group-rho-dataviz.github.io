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
        this.height = bbox.height;
        
        this.margin = { top: 10, right: 10, bottom: 10, left: 10 };
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.selectAll('*').remove();
        
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Set up projection - responsive scaling
        const scale = Math.min(this.innerWidth / 6, this.innerHeight / 3.2);
        this.projection = d3.geoMercator()
            .scale(scale)
            .center([15, 25])
            .translate([this.innerWidth / 2 + 22, this.innerHeight / 2 + 52]);

        this.path = d3.geoPath().projection(this.projection);
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

        // Update HTML week display (external to SVG)
        const weekDisplay = document.getElementById('week-display');
        if (weekDisplay) {
            const date = new Date(week);
            weekDisplay.textContent = `Week of ${date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            })}`;
        }

        // Update HTML slider position (external to SVG)
        const weekSlider = document.getElementById('week-slider');
        if (weekSlider) {
            weekSlider.max = this.weeks.length - 1;
            weekSlider.value = weekIndex;
        }

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
        const playButton = document.getElementById('play-button');
        if (playButton) {
            playButton.innerHTML = `
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4z"/>
                    <path d="M11 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                </svg>                
                Pause
            `;
        }
        
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
        const playButton = document.getElementById('play-button');
        if (playButton) {
            playButton.innerHTML = `
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                </svg>
                Play
            `;
        }

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