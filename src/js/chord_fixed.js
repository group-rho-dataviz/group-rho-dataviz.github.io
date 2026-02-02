import ScrollyChart from './scrolly_chart.js';

export default class ChordChart extends ScrollyChart {
    constructor(svgId, data, tooltip, continentColors = {}) {
        super(svgId, data, tooltip);
        this.continentColors = continentColors;
        this.currentWeek = null;
        this.allWeeks = [];
        this.weekData = new Map();
        this.currentWeekIndex = 0;
        this.isPlaying = false;
        this.playInterval = null;
        this.continents = []; // Fixed order of continents (not duplicated)
        this.weekManager = null; // Will be set externally
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

        if (this.width === 0 || this.height === 0) {
            const grandparent = container.parentElement;
            if (grandparent) {
                const gpBox = grandparent.getBoundingClientRect();
                this.width = gpBox.width;
                this.height = gpBox.height;
            }
        }

        this.margin = { 
            top: 10,
            right: 10, 
            bottom: 10,
            left: 10 
        };
        
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.selectAll('*').remove();
        
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.width / 2},${this.height / 1.85})`);

    }

    async draw() {
        const rawData = await this.data;
        this.processData(rawData);
        
        if (this.allWeeks.length > 0) {
            this.currentWeekIndex = 0;
            this.currentWeek = this.allWeeks[0];
            this.drawChordInitial(this.currentWeek);
        }
    }

    processData(rawData) {
        // Get ALL unique continents across all data (not duplicated)
        // Exclude Antarctica
        const allContinents = new Set();
        rawData.forEach(d => {
            if (d.media_continent !== 'Antarctica') {
                allContinents.add(d.media_continent);
            }
            if (d.conflict_continent !== 'Antarctica') {
                allContinents.add(d.conflict_continent);
            }
        });
        
        // Fixed continent order (alphabetical for consistency)
        this.continents = Array.from(allContinents).sort();
        const n = this.continents.length;
        
        // Group data by week
        const weekGroups = d3.group(rawData, d => d.mention_week);

        // If week manager is set, use its weeks; otherwise build from data
        if (this.weekManager) {
            this.allWeeks = this.weekManager.getWeeks();
        } else {
            // Fallback: build weeks from data (old behavior)
            this.allWeeks = Array.from(weekGroups.keys()).sort((a, b) => {
                return new Date(a) - new Date(b);
            });
        }

        
        weekGroups.forEach((records, week) => {
            // Create matrix with fixed continent order
            const matchedWeek = this.allWeeks.find(w => new Date(w).getTime() === new Date(week).getTime());            
            const finalKey = matchedWeek || week;            

            const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
            const continentIndex = new Map(this.continents.map((c, i) => [c, i]));
            
            // Store detail records for tooltip lookup
            const detailLookup = new Map();
            
            records.forEach(d => {
                const sourceIdx = continentIndex.get(d.media_continent);
                const targetIdx = continentIndex.get(d.conflict_continent);
                
                if (sourceIdx !== undefined && targetIdx !== undefined) {
                    matrix[sourceIdx][targetIdx] += d.material_conflict_mentions;
                    
                    // Store detail for this source->target pair
                    const key = `${sourceIdx}-${targetIdx}`;
                    detailLookup.set(key, {
                        top_countries_detail: d.top_countries_detail,
                        mentions: d.material_conflict_mentions
                    });
                }
            });

            this.weekData.set(finalKey, {
                matrix,
                continents: this.continents,
                records,
                detailLookup
            });
        });
        
        // Initialize missing weeks with empty matrices (for weeks with no data)
        this.allWeeks.forEach(week => {
            if (!this.weekData.has(week)) {
                const emptyMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
                this.weekData.set(week, {
                    matrix: emptyMatrix,
                    continents: this.continents,
                    records: [],
                    detailLookup: new Map()
                });
            }
        });
        
    }

    /**
     * Safe wrapper for generating chord layout
     * Handles cases where matrix is all zeros (missing data)
     */
    getSafeChords(matrix) {
        const totalSum = d3.sum(matrix.map(row => d3.sum(row)));
        
        // If total mentions are 0, return a collapsed state to avoid NaNs
        if (totalSum === 0) {
            // Create a fake chords object that emulates d3.chord structure
            const emptyChords = []; // No ribbons
            
            // Create groups with 0 angles
            emptyChords.groups = this.continents.map((c, i) => ({
                index: i,
                startAngle: 0,
                endAngle: 0,
                value: 0
            }));
            
            return emptyChords;
        }

        // Standard layout for valid data
        return this.chordLayout(matrix);
    }

    drawChordInitial(week) {
        const data = this.weekData.get(week);
        if (!data) return;

        this.currentWeekIndex = this.allWeeks.indexOf(week);
        this.updateWeekDisplay(week);
        
        if (this.onWeekChange) {
            this.onWeekChange(this.currentWeekIndex);
        }
        
        const { matrix, continents, detailLookup } = data;
        this.currentMatrix = matrix;
        this.currentDetailLookup = detailLookup;
        
        const radius = Math.min(this.innerWidth, this.innerHeight) / 2.8;
        
        // Store radius and layout functions for updates
        this.radius = radius;
        this.chordLayout = d3.chordDirected()
            .padAngle(0.05)
            .sortSubgroups(d3.descending);

        this.arcGenerator = d3.arc()
            .innerRadius(radius)
            .outerRadius(radius + 20);

        this.ribbonGenerator = d3.ribbon()
            .radius(radius);

        // USE SAFE CHORD GENERATION
        const chords = this.getSafeChords(matrix);

        const colorScale = (continent) => {
            return this.continentColors[continent] || '#888888';
        };

        // Clear previous elements
        this.g.selectAll('*').remove();

        // Create groups container
        this.ribbonsContainer = this.g.append('g').attr('class', 'ribbons');
        this.arcsContainer = this.g.append('g').attr('class', 'arcs');

        // Draw ribbons (connections) - colored by source (media continent)
        this.ribbonPaths = this.ribbonsContainer
            .selectAll('path')
            .data(chords, d => `${d.source.index}-${d.target.index}`)
            .join('path')
            .attr('d', this.ribbonGenerator)
            .attr('fill', d => colorScale(continents[d.source.index]))
            .attr('opacity', 0.6)
            .attr('stroke', 'none')
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget).attr('opacity', 0.9);
                this.hoveredRibbon = d; // Track which ribbon is hovered
                this.updateRibbonTooltip(d, continents);
            })
            .on('mousemove', (event) => {
                this.positionTooltip(event);
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget).attr('opacity', 0.6);
                this.hoveredRibbon = null; // Clear hover state
                this.tooltip.style('opacity', 0);
            });

        // Draw arcs (continents)
        this.arcGroups = this.arcsContainer
            .selectAll('g')
            .data(chords.groups, d => d.index)
            .join('g');

        this.arcPaths = this.arcGroups
            .append('path')
            .attr('d', this.arcGenerator)
            .attr('fill', d => colorScale(continents[d.index]))
            .attr('opacity', 0.9)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget).attr('opacity', 1);

                this.ribbonPaths
                    .attr('opacity', rd => 
                        (rd.source.index === d.index || rd.target.index === d.index) ? 0.9 : 0.1
                    );

                this.hoveredArc = d; // Track which arc is hovered
                this.updateArcTooltip(d, continents);
            })
            .on('mousemove', (event) => {
                this.positionTooltip(event);
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget).attr('opacity', 0.9);
                this.ribbonPaths.attr('opacity', 0.6);
                this.hoveredArc = null; // Clear hover state
                this.tooltip.style('opacity', 0);
            });
    }

    updateRibbonTooltip(d, continents) {
        const sourceContinent = continents[d.source.index];
        const targetContinent = continents[d.target.index];
        const key = `${d.source.index}-${d.target.index}`;
        const detail = this.currentDetailLookup.get(key);

        let tooltipHtml = `
            <strong>${sourceContinent}</strong> → <strong>${targetContinent}</strong><br/>
            ${this.currentMatrix[d.source.index][d.target.index].toLocaleString()} total mentions
        `;

        // Only show top countries detail for self-loops (same continent)
        if (detail && detail.top_countries_detail) {
            try {
                const topCountries = JSON.parse(detail.top_countries_detail);
                tooltipHtml += '<br/><br/><strong>Top countries:</strong><br/>';
                Object.entries(topCountries).forEach(([country, mentions]) => {
                    tooltipHtml += `${country}: ${parseInt(mentions).toLocaleString()}<br/>`;
                });
            } catch (e) {
                // If parsing fails, skip the detail
            }
        }

        this.tooltip
            .style('opacity', 1)
            .html(tooltipHtml);
    }

    updateArcTooltip(d, continents) {
        const continent = continents[d.index];
        const totalMentions = d3.sum(this.currentMatrix[d.index]);

        this.tooltip
            .style('opacity', 1)
            .html(`
                <strong>${continent}</strong><br/>
                ${totalMentions.toLocaleString()} total mentions
            `);
    }

    updateChordSmooth(week) {
        const data = this.weekData.get(week);
        if (!data) return;

        this.currentWeekIndex = this.allWeeks.indexOf(week);
        this.updateWeekDisplay(week);
        
        if (this.onWeekChange) {
            this.onWeekChange(this.currentWeekIndex);
        }
        
        const { matrix, continents, detailLookup } = data;
        this.currentMatrix = matrix;
        this.currentDetailLookup = detailLookup;
        
        // USE SAFE CHORD GENERATION
        const chords = this.getSafeChords(matrix);

        const colorScale = (continent) => {
            return this.continentColors[continent] || '#888888';
        };

        // Check if containers still exist
        if (!this.ribbonsContainer || !this.ribbonsContainer.node() || !this.arcsContainer || !this.arcsContainer.node()) {
            this.ribbonsContainer = this.g.append('g').attr('class', 'ribbons');
            this.arcsContainer = this.g.append('g').attr('class', 'arcs');
        }

        // Initialize/Re-select paths to ensure proper data binding
        // Using .selectAll and .join helps maintain the selection state
        this.ribbonPaths = this.ribbonsContainer.selectAll('path')
            .data(chords, d => `${d.source.index}-${d.target.index}`);

        this.ribbonPaths.join(
            enter => enter.append('path')
                .attr('d', this.ribbonGenerator)
                .attr('fill', d => colorScale(continents[d.source.index]))
                .attr('opacity', 0) // Start invisible
                .call(enter => enter.transition().duration(400).attr('opacity', 0.6)),
            update => update
                .call(update => update.transition()
                    .duration(400)
                    .ease(d3.easeCubicInOut)
                    .attr('d', this.ribbonGenerator)
                    .attr('fill', d => colorScale(continents[d.source.index]))
                    .attr('opacity', 0.6)),
            exit => exit.transition().duration(400).attr('opacity', 0).remove()
        )
        // Re-attach listeners to all merged paths
        .on('mouseover', (event, d) => {
            d3.select(event.currentTarget).attr('opacity', 0.9);
            this.hoveredRibbon = d;
            this.updateRibbonTooltip(d, continents);
        })
        .on('mousemove', (event) => {
            this.positionTooltip(event);
        })
        .on('mouseout', (event) => {
            d3.select(event.currentTarget).attr('opacity', 0.6);
            this.hoveredRibbon = null;
            this.tooltip.style('opacity', 0);
        });

        // Smooth transition for arcs
        const arcData = chords.groups;
        
        // Re-select arc groups and paths
        this.arcGroups = this.arcsContainer.selectAll('g')
            .data(arcData, d => d.index)
            .join('g');

        // We need to manage the paths inside the groups
        // Since the groups correspond 1:1 with continents, we can select the path inside
        const paths = this.arcGroups.selectAll('path')
            .data(d => [d]); // Bind the single group data to the path

        paths.join(
            enter => enter.append('path')
                .attr('d', this.arcGenerator)
                .attr('fill', d => colorScale(continents[d.index]))
                .attr('stroke', '#fff')
                .attr('stroke-width', 2),
            update => update.transition()
                .duration(400)
                .ease(d3.easeCubicInOut)
                .attrTween('d', function(d) {
                    const node = this;
                    // Safely handle previous state. 
                    // If startAngle/endAngle are missing or NaN, default to 0
                    const previous = node.__data__ || { startAngle: 0, endAngle: 0, value: 0 };
                    
                    const pStart = isNaN(previous.startAngle) ? 0 : previous.startAngle;
                    const pEnd = isNaN(previous.endAngle) ? 0 : previous.endAngle;
                    const dStart = isNaN(d.startAngle) ? 0 : d.startAngle;
                    const dEnd = isNaN(d.endAngle) ? 0 : d.endAngle;

                    const interpolateStart = d3.interpolate(pStart, dStart);
                    const interpolateEnd = d3.interpolate(pEnd, dEnd);
                    
                    return (t) => {
                        return this.arcGenerator({
                            startAngle: interpolateStart(t),
                            endAngle: interpolateEnd(t),
                            index: d.index
                        });
                    };
                }.bind(this))
                .attr('fill', d => colorScale(continents[d.index]))
        )
        // Re-attach listeners
        .on('mouseover', (event, d) => {
            d3.select(event.currentTarget).attr('opacity', 1);
            // Highlight connected ribbons
            this.ribbonsContainer.selectAll('path')
                .attr('opacity', rd => 
                    (rd.source.index === d.index || rd.target.index === d.index) ? 0.9 : 0.1
                );
            this.hoveredArc = d;
            this.updateArcTooltip(d, continents);
        })
        .on('mousemove', (event) => {
            this.positionTooltip(event);
        })
        .on('mouseout', (event) => {
            d3.select(event.currentTarget).attr('opacity', 0.9);
            this.ribbonsContainer.selectAll('path').attr('opacity', 0.6);
            this.hoveredArc = null;
            this.tooltip.style('opacity', 0);
        });
    }

    updateWeekDisplay(week) {
        const weekDisplay = document.getElementById('week-display');
        if (weekDisplay) {
            const weekDate = new Date(week);
            weekDisplay.textContent = `Week of ${weekDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            })}`;
        }
        const mobileWeekDisplay = document.getElementById('mobile-week-display');
        if (mobileWeekDisplay) {
            const weekDate = new Date(week);
            mobileWeekDisplay.textContent = `Week of ${weekDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            })}`;
        }

        const weekSlider = document.getElementById('week-slider');
        if (weekSlider) {
            weekSlider.max = this.allWeeks.length - 1;
            weekSlider.value = this.currentWeekIndex;
        }
    }

    updateWeek(week) {
        if (this.weekData.has(week)) {
            this.currentWeek = week;
            this.updateChordSmooth(week);
        }
    }

    getWeeks() {
        return this.allWeeks;
    }

    setWeek(index) {
        if (index >= 0 && index < this.allWeeks.length) {
            this.currentWeekIndex = index;
            this.currentWeek = this.allWeeks[index];
            
            if (this.ribbonsContainer && this.arcsContainer) {
                this.updateChordSmooth(this.currentWeek);
            } else {
                this.drawChordInitial(this.currentWeek);
            }
        }
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
            `;
        }
        
        this.playInterval = setInterval(() => {
            if (this.currentWeekIndex < this.allWeeks.length - 1) {
                this.setWeek(this.currentWeekIndex + 1);
            } else {
                this.setWeek(0);
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
            `;
        }
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }
}