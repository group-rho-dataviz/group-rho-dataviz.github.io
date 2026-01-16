import ScrollyChart from './scrolly_chart.js';

export default class ChordChart extends ScrollyChart {
    constructor(svgId, data, tooltip) {
        super(svgId, data, tooltip);
        this.currentWeek = null;
        this.allWeeks = [];
        this.weekData = new Map();
        this.currentWeekIndex = 0;
        this.isPlaying = false;
        this.playInterval = null;
    }

    init() {
        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = bbox.width;
        this.height = Math.max(bbox.height, 600);

        // Minimal margins for chord diagram
        this.margin = { 
            top: 80,
            right: 20, 
            bottom: 60,
            left: 20 
        };
        
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.selectAll('*').remove();
        
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.width / 2},${this.height / 2})`);

        // Title
        this.title = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .attr('fill', '#f3f4f6')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', Math.min(this.width / 25, 20) + 'px')
            .style('font-weight', '600')
            .text('Media Coverage Flow');

        // Subtitle
        this.subtitle = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', 52)
            .attr('text-anchor', 'middle')
            .attr('fill', '#9ca3af')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', Math.min(this.width / 35, 13) + 'px')
            .style('font-style', 'italic');

        // Legend
        this.legendGroup = this.svg.append('g')
            .attr('transform', `translate(20, ${this.height - 40})`);

        const legendData = [
            { label: 'Media Countries', color: '#3b82f6' },
            { label: 'Conflict Countries', color: '#ef4444' }
        ];

        legendData.forEach((d, i) => {
            const lg = this.legendGroup.append('g')
                .attr('transform', `translate(${i * 150}, 0)`);

            lg.append('circle')
                .attr('r', 6)
                .attr('fill', d.color)
                .attr('opacity', 0.8);

            lg.append('text')
                .attr('x', 12)
                .attr('y', 4)
                .attr('fill', '#9ca3af')
                .style('font-family', 'Inter, sans-serif')
                .style('font-size', '11px')
                .text(d.label);
        });
    }

    async draw() {
        const rawData = await this.data;
        this.processData(rawData);
        
        // Start with the oldest week
        if (this.allWeeks.length > 0) {
            this.currentWeekIndex = 0;
            this.currentWeek = this.allWeeks[0];
            this.drawChord(this.currentWeek);
        }
    }

    processData(rawData) {
        // Group data by week
        const weekGroups = d3.group(rawData, d => d.mention_week);
        
        this.allWeeks = Array.from(weekGroups.keys()).sort();
        
        weekGroups.forEach((records, week) => {
            // Get unique countries
            const mediaCountries = new Set();
            const conflictCountries = new Set();
            
            records.forEach(d => {
                mediaCountries.add(d.media_country);
                conflictCountries.add(d.conflict_country_name);
            });

            // Create matrix for chord diagram
            const countries = Array.from(new Set([...conflictCountries, ...mediaCountries]));
            const n = countries.length;
            const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
            
            const countryIndex = new Map(countries.map((c, i) => [c, i]));
            
            records.forEach(d => {
                const sourceIdx = countryIndex.get(d.media_country);
                const targetIdx = countryIndex.get(d.conflict_country_name);
                
                if (sourceIdx !== undefined && targetIdx !== undefined && sourceIdx !== targetIdx) {
                    matrix[sourceIdx][targetIdx] += d.material_conflict_mentions;
                }
            });

            this.weekData.set(week, {
                matrix,
                countries,
                conflictCountries: Array.from(conflictCountries),
                mediaCountries: Array.from(mediaCountries),
                records
            });
        });
    }

    drawChord(week) {
        const data = this.weekData.get(week);
        if (!data) return;

        // Update current week index
        this.currentWeekIndex = this.allWeeks.indexOf(week);

        // Update subtitle with week
        const weekDate = new Date(week);
        this.subtitle.text(`Week of ${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);

        // Update HTML week display (external to SVG)
        const weekDisplay = document.getElementById('week-display');
        if (weekDisplay) {
            weekDisplay.textContent = `Week of ${weekDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
            })}`;
        }

        // Update HTML slider position (external to SVG)
        const weekSlider = document.getElementById('week-slider');
        if (weekSlider) {
            weekSlider.max = this.allWeeks.length - 1;
            weekSlider.value = this.currentWeekIndex;
        }
        
        const { matrix, countries, conflictCountries, mediaCountries } = data;

        // Calculate radius based on available space
        const radius = Math.min(this.innerWidth, this.innerHeight) / 2 - 100;
        
        // Create chord layout
        const chord = d3.chord()
            .padAngle(0.05)
            .sortSubgroups(d3.descending);

        const arc = d3.arc()
            .innerRadius(radius)
            .outerRadius(radius + 20);

        const ribbon = d3.ribbon()
            .radius(radius);

        const chords = chord(matrix);

        // Color scale
        const colorScale = (country) => {
            if (conflictCountries.includes(country)) return '#ef4444'; // Red for conflict
            if (mediaCountries.includes(country)) return '#3b82f6'; // Blue for media
            return '#9ca3af';
        };

        // Clear previous elements
        this.g.selectAll('*').remove();

        // Draw ribbons (connections)
        const ribbonGroup = this.g.append('g')
            .attr('class', 'ribbons')
            .selectAll('path')
            .data(chords)
            .join('path')
            .attr('d', ribbon)
            .attr('fill', d => colorScale(countries[d.source.index]))
            .attr('opacity', 0)
            .attr('stroke', 'none')
            .on('mouseover', (event, d) => {
                // Highlight ribbon
                d3.select(event.currentTarget)
                    .attr('opacity', 0.9);

                // Show tooltip
                const sourceCountry = countries[d.source.index];
                const targetCountry = countries[d.target.index];
                const mentions = matrix[d.source.index][d.target.index];

                this.tooltip
                    .style('opacity', 1)
                    .html(`
                        <strong>${sourceCountry}</strong> → <strong>${targetCountry}</strong><br/>
                        ${mentions.toLocaleString()} mentions
                    `);
                this.positionTooltip(event);
            })
            .on('mousemove', (event) => {
                this.positionTooltip(event);
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget)
                    .attr('opacity', 0.6);
                this.tooltip.style('opacity', 0);
            });

        // Animate ribbons
        ribbonGroup.transition()
            .duration(800)
            .delay((d, i) => i * 20)
            .attr('opacity', 0.6);

        // Draw arcs (countries)
        const arcGroup = this.g.append('g')
            .attr('class', 'arcs')
            .selectAll('g')
            .data(chords.groups)
            .join('g');

        arcGroup.append('path')
            .attr('d', arc)
            .attr('fill', d => colorScale(countries[d.index]))
            .attr('opacity', 0)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('mouseover', (event, d) => {
                // Highlight arc
                d3.select(event.currentTarget)
                    .attr('opacity', 1);

                // Highlight related ribbons
                ribbonGroup
                    .attr('opacity', rd => 
                        (rd.source.index === d.index || rd.target.index === d.index) ? 0.9 : 0.1
                    );

                // Show tooltip
                const country = countries[d.index];
                const totalMentions = d3.sum(matrix[d.index]);
                const isConflict = conflictCountries.includes(country);

                this.tooltip
                    .style('opacity', 1)
                    .html(`
                        <strong>${country}</strong><br/>
                        ${isConflict ? 'Conflict country' : 'Media country'}<br/>
                        ${totalMentions.toLocaleString()} total mentions
                    `);
                this.positionTooltip(event);
            })
            .on('mousemove', (event) => {
                this.positionTooltip(event);
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget)
                    .attr('opacity', 0.9);

                ribbonGroup.attr('opacity', 0.6);
                this.tooltip.style('opacity', 0);
            })
            .transition()
            .duration(600)
            .attr('opacity', 0.9);

        // Add country labels
        arcGroup.append('text')
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr('dy', '.35em')
            .attr('transform', d => `
                rotate(${(d.angle * 180 / Math.PI - 90)})
                translate(${radius + 35})
                ${d.angle > Math.PI ? 'rotate(180)' : ''}
            `)
            .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
            .attr('fill', '#f3f4f6')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', '10px')
            .style('font-weight', '500')
            .style('opacity', 0)
            .text(d => {
                const country = countries[d.index];
                // Truncate long country names
                return country.length > 15 ? country.substring(0, 12) + '...' : country;
            })
            .transition()
            .duration(600)
            .delay(400)
            .style('opacity', 1);
    }

    // Method to update to a specific week (can be called externally)
    updateWeek(week) {
        if (this.weekData.has(week)) {
            this.currentWeek = week;
            this.drawChord(week);
        }
    }

    // Method to get all available weeks
    getWeeks() {
        return this.allWeeks;
    }

    // Set week by index
    setWeek(index) {
        if (index >= 0 && index < this.allWeeks.length) {
            this.currentWeekIndex = index;
            this.currentWeek = this.allWeeks[index];
            this.drawChord(this.currentWeek);
        }
    }

    // Play/pause functionality
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
            if (this.currentWeekIndex < this.allWeeks.length - 1) {
                this.setWeek(this.currentWeekIndex + 1);
            } else {
                this.setWeek(0); // Loop back
            }
        }, 1000);
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

}