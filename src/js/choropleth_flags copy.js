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
        this.hoveredCountry = null;
        
        // Fallback color palette
        this.conflictCountryColors = new Map();
        this.colorPalette = [
            '#e63946', '#f77f00', '#fcbf49', '#06d6a0', '#118ab2',
            '#ef476f', '#ffd166', '#06ffa5', '#1b9aaa', '#d62828',
            '#003049', '#d90429', '#2a9d8f', '#e76f51', '#f4a261',
            '#e9c46a', '#264653', '#a8dadc', '#457b9d', '#1d3557'
        ];
        
        // ISO country codes - these should match your flag filenames
        // Save flags as: src/images/flags/us.png, src/images/flags/gb.png, etc.
        this.countryToISO = {
            'Afghanistan': 'af', 'Albania': 'al', 'Algeria': 'dz', 'Argentina': 'ar',
            'Australia': 'au', 'Austria': 'at', 'Bangladesh': 'bd', 'Belarus': 'by', 'Belgium': 'be',
            'Brazil': 'br', 'Canada': 'ca', 'Chile': 'cl', 'China': 'cn',
            'Colombia': 'co', 'Cuba': 'cu', 'Denmark': 'dk', 'Egypt': 'eg',
            'Ethiopia': 'et', 'Finland': 'fi', 'France': 'fr', 'Germany': 'de',
            'Ghana': 'gh', 'Greece': 'gr', 'India': 'in', 'Indonesia': 'id',
            'Iran': 'ir', 'Iraq': 'iq', 'Ireland': 'ie', 'Israel': 'il',
            'Italy': 'it', 'Japan': 'jp', 'Jordan': 'jo', 'Kenya': 'ke',
            'Libya': 'ly', 'Malaysia': 'my', 'Mexico': 'mx', 'Morocco': 'ma',
            'Myanmar': 'mm', 'Netherlands': 'nl', 'Nigeria': 'ng', 'Norway': 'no',
            'Pakistan': 'pk', 'Peru': 'pe', 'Philippines': 'ph', 'Poland': 'pl',
            'Portugal': 'pt', 'Romania': 'ro', 'Russia': 'ru', 'Saudi Arabia': 'sa',
            'Somalia': 'so', 'South Africa': 'za', 'South Korea': 'kr', 'Spain': 'es',
            'Sudan': 'sd', 'Sweden': 'se', 'Switzerland': 'ch', 'Syria': 'sy',
            'Thailand': 'th', 'Turkey': 'tr', 'Uganda': 'ug', 'Ukraine': 'ua',
            'United Arab Emirates': 'ae', 'United Kingdom': 'gb', 'United States': 'us',
            'Venezuela': 've', 'Vietnam': 'vn', 'Yemen': 'ye', 'Zimbabwe': 'zw',
            'Democratic Republic of the Congo': 'cd', 'DRC': 'cd', 
            'Republic of the Congo': 'cg', 'England': 'gb', 'UAE': 'ae', 
            'Palestine': 'ps', 'North Korea': 'kp', 'Lebanon': 'lb',
            'Azerbaijan': 'az', 'Armenia': 'am', 'Georgia': 'ge',
            'Kazakhstan': 'kz', 'Uzbekistan': 'uz', 'Tunisia': 'tn',
            'Angola': 'ao', 'Mozambique': 'mz', 'Chad': 'td',
            'Mali': 'ml', 'Niger': 'ne', 'Burkina Faso': 'bf',
            'Cameroon': 'cm', 'Senegal': 'sn', 'Ivory Coast': 'ci',
            'Bosnia and Herzegovina': 'ba', 'Serbia': 'rs', 'Croatia': 'hr',
            'Taiwan': 'tw', 'Hong Kong': 'hk', 'Singapore': 'sg', 'Sri Lanka': 'lk', 'Qatar': 'qa', 'New Zealand': 'nz',
            'Bolivia': 'bo', 'Ecuador': 'ec', 'Guatemala': 'gt', 'Honduras': 'hn',
            'Paraguay': 'py', 'Uruguay': 'uy', 'El Salvador': 'sv',
            'Chile': 'cl', 'Cile': 'cl', 'Bahrain': 'bh', 'Brunei': 'bn', 'Cambodia': 'kh', 'Burma': 'mm'
        };
    }

    async init() {
        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = bbox.width;
        
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
        
        // DON'T remove defs - preserve patterns!
        this.svg.selectAll('g').remove();
        this.svg.selectAll('text').remove();
        this.svg.selectAll('circle').remove();
        this.svg.selectAll('line').remove();
        this.svg.selectAll('rect').remove();
        
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

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

        this.weekText = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 1.5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#9ca3af')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', Math.max(this.width / 40, 11) + 'px')
            .style('font-weight', '500');

        const controlsY = this.height - this.margin.bottom + (isMobile ? 25 : 30);
        
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

        const sliderWidth = isMobile ? this.width * 0.7 : Math.min(400, this.width * 0.6);
        const sliderX = this.width / 2 - sliderWidth / 2;
        const sliderY = controlsY + (isMobile ? 50 : 48);

        this.sliderGroup = this.svg.append('g')
            .attr('class', 'slider-group')
            .attr('transform', `translate(${sliderX}, ${sliderY})`);

        this.sliderGroup.append('line')
            .attr('class', 'slider-track')
            .attr('x1', 0)
            .attr('x2', sliderWidth)
            .attr('stroke', '#374151')
            .attr('stroke-width', 4)
            .attr('stroke-linecap', 'round');

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
        const rawData = await this.data;
        this.processData(rawData);
        this.drawMap();
        
        if (this.weeks.length > 0) {
            this.updateMap(0);
        }
    }

    createFlagPattern(country, iso, defs) {
        const patternId = `flag-${iso}`;
        
        if (defs.select(`#${patternId}`).empty()) {
            const color = this.getColorForCountry(country);
            
            // Create pattern with repeating flag
            const pattern = defs.append('pattern')
                .attr('id', patternId)
                .attr('patternUnits', 'userSpaceOnUse')
                .attr('width', 30)
                .attr('height', 30);

            // Fallback color background
            pattern.append('rect')
                .attr('width', 30)
                .attr('height', 30)
                .attr('fill', color);

            // Add dark overlay for better country outline visibility
            pattern.append('rect')
                .attr('width', 30)
                .attr('height', 30)
                .attr('fill', '#000')
                .attr('opacity', 0.2);

            // Add flag image
            const img = pattern.append('image')
                .attr('href', `src/images/flags/${iso}.png`)
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', 30)
                .attr('height', 30)
                .attr('preserveAspectRatio', 'xMidYMid slice');

            // Start with flag visible (if it loads, great; if not, color shows through)
            img.attr('opacity', 0.75);

            // On error, hide the broken image
            img.on('error', function() {
                console.log(`Flag not found: src/images/flags/${iso}.png`);
                d3.select(this).attr('opacity', 0);
            });
        }
        
        return patternId;
    }

    processData(rawData) {
        const uniqueConflictCountries = Array.from(new Set(rawData.map(d => d.conflict_country_name)));
        
        // Assign colors to all conflict countries as fallback
        uniqueConflictCountries.forEach((country, i) => {
            this.conflictCountryColors.set(country, this.colorPalette[i % this.colorPalette.length]);
        });
        
        // Create or get defs for patterns
        let defs = this.svg.select('defs');
        if (defs.empty()) {
            defs = this.svg.insert('defs', ':first-child');
        }

        // Create flag patterns for all conflict countries (only if they don't exist)
        uniqueConflictCountries.forEach(country => {
            const iso = this.countryToISO[country];
            if (iso && defs.select(`#flag-${iso}`).empty()) {
                this.createFlagPattern(country, iso, defs);
            }
        });
        
        const grouped = d3.group(rawData, 
            d => d.mention_week,
            d => d.media_country
        );
        
        this.weeks = Array.from(grouped.keys()).sort((a, b) => {
            return new Date(a) - new Date(b);
        });
        
        this.processedData = new Map();
        
        grouped.forEach((mediaCountries, week) => {
            const weekData = new Map();
            mediaCountries.forEach((countries, mediaCountry) => {
                const topCountry = countries.reduce((max, curr) => 
                    curr.material_conflict_mentions > max.material_conflict_mentions ? curr : max
                );
                weekData.set(mediaCountry, topCountry);
            });
            this.processedData.set(week, weekData);
        });
    }

    getColorForCountry(country) {
        return this.conflictCountryColors.get(country) || '#6b7280';
    }

    getFillForCountry(conflictCountryName) {
        const iso = this.countryToISO[conflictCountryName];
        
        if (iso) {
            return `url(#flag-${iso})`;
        }
        
        return this.getColorForCountry(conflictCountryName);
    }

    drawMap() {
        if (!this.geoData) return;

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
            .style('pointer-events', 'all')
            .on('mouseenter', (event, d) => this.handleMouseOver(event, d))
            .on('mousemove', (event) => this.positionTooltip(event))
            .on('mouseleave', () => this.handleMouseOut());
    }

    updateMap(weekIndex) {
        this.currentWeekIndex = weekIndex;
        const week = this.weeks[weekIndex];
        const weekData = this.processedData.get(week);

        const date = new Date(week);
        this.weekText.text(`Week of ${date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        })}`);

        const sliderX = (weekIndex / (this.weeks.length - 1)) * this.sliderWidth;
        this.sliderHandle
            .transition()
            .duration(100)
            .attr('cx', sliderX);

        if (this.countries) {
            this.countries
                .transition()
                .duration(300)
                .attr('fill', d => {
                    const countryName = d.properties.name;
                    const data = weekData?.get(countryName);
                    if (!data) return '#2d3748';
                    return this.getFillForCountry(data.conflict_country_name);
                });
        }
        
        if (this.hoveredCountry) {
            this.updateTooltipContent(this.hoveredCountry);
        }
    }

    updateTooltipContent(countryName) {
        const week = this.weeks[this.currentWeekIndex];
        const weekData = this.processedData.get(week);
        const data = weekData?.get(countryName);

        if (data) {
            const iso = this.countryToISO[data.conflict_country_name];
            const color = this.getColorForCountry(data.conflict_country_name);
            
            this.tooltip
                .html(`
                    <div style="font-family: Inter, sans-serif; min-width: 200px;">
                        <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; border-bottom: 2px solid ${color}; padding-bottom: 4px;">
                            ${countryName}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                            ${iso ? `<img src="src/images/flags/${iso}.png" alt="" style="width: 24px; height: 16px; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);" onerror="this.style.display='none'">` : `<div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></div>`}
                            <span style="font-weight: 500; color: #f3f4f6;">Top: ${data.conflict_country_name}</span>
                        </div>
                        <div style="font-size: 12px; color: #d1d5db; line-height: 1.6;">
                            <div style="margin: 4px 0;">📰 <strong>${data.material_conflict_mentions.toLocaleString()}</strong> mentions</div>
                            <div style="margin: 4px 0;">⚡ <strong>${data.material_conflict_unique_events.toLocaleString()}</strong> events</div>
                        </div>
                    </div>
                `);
        } else {
            this.tooltip
                .html(`
                    <div style="font-family: Inter, sans-serif;">
                        <div style="font-weight: 600; font-size: 14px;">${countryName}</div>
                        <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">No data available</div>
                    </div>
                `);
        }
    }

    handleMouseOver(event, d) {
        const countryName = d.properties.name;
        this.hoveredCountry = countryName;

        d3.select(event.currentTarget)
            .attr('stroke-width', 1.5)
            .attr('stroke', '#f3f4f6')
            .style('filter', 'brightness(1.2)');

        this.tooltip
            .style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        
        this.updateTooltipContent(countryName);
    }

    handleMouseOut() {
        this.hoveredCountry = null;
        this.countries
            .attr('stroke-width', 0.5)
            .attr('stroke', '#1a202c')
            .style('filter', 'none');
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
                this.updateMap(0);
            }
        }, 1000);
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