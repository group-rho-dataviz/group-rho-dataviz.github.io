import ScrollyChart from './scrolly_chart.js';

export default class WordCloud extends ScrollyChart {
    /**
     * Word Cloud Visualization - d3-cloud Optimized Version
     * FIXED: Ensures fonts are sized to fit the active area
     */
    constructor(svgId, data, focusCountry, tooltip = null) {
        super(svgId, data, tooltip);
        this.focusCountry = focusCountry;
        this.words = [];
        
        // Refined color palette matching your site's aesthetic
        this.colors = {
            focusCountry: '#e83095',
            actor1Pure: '#ff0000',
            actor2Pure: '#00a2ff',
            text: '#1a1a1a',
            textSecondary: '#666666',
            background: '#fafafa'
        };
    }

    init() {
        this.margin = { top: 60, right: 10, bottom: 40, left: 10 };

        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = bbox.width;
        this.height = bbox.height;

        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.svg.selectAll('*').remove();
        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Title - positioned at top center
        this.title = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', 'darkslategray')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', Math.min(this.width / 30, 20) + 'px')
            .style('font-weight', '600');

        // Subtitle
        this.subtitle = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2 + 20)
            .attr('text-anchor', 'middle')
            .attr('fill', '#6b7280')
            .style('font-family', 'Inter, sans-serif')
            .attr('class', 'lg:text-sm md:text-[0.55rem] text-[0.42rem] sm:text-[0.44rem]')
            .style('font-weight', '400');
    }

    processData(data) {
        this.words = data.map(d => {
            const totalCount = +d.totalCount || 0;
            const actor1Count = +d.countAsActor1 || 0;
            const actor2Count = +d.countAsActor2 || 0;
            
            let ratio = 0.5;
            if (totalCount > 0) {
                ratio = actor1Count / totalCount;
            }
            
            return {
                country: d.country_name,
                countAsActor1: actor1Count,
                countAsActor2: actor2Count,
                totalCount: totalCount,
                ratio: ratio,
                isFocus: d.country_name === this.focusCountry
            };
        }).filter(d => d.totalCount > 0);
        
        this.words.sort((a, b) => b.totalCount - a.totalCount);
    }

    draw() {
        if (!this.g) return;

        this.data.then(data => {
            this.processData(data);
            this.drawWordCloud();
        });
    }

    drawWordCloud() {
        if (!this.g || this.words.length === 0) return;

        // Define active area first - we'll use it to constrain font sizes
        const activeArea = {
            x: this.innerWidth * 0.05,
            y: this.innerHeight * 0.05,
            width: this.innerWidth * 0.9,
            height: this.innerHeight * 0.95
        };

        const maxCount = d3.max(this.words, d => d.totalCount);
        const minCount = d3.min(this.words, d => d.totalCount);
        
        // CRITICAL FIX: Max font size must be smaller than active area height
        // Reserve space for padding and multiple words
        const maxFontSize = Math.min(
            this.width / 12,           // Original max based on width
            activeArea.height * 0.5,   // NEW: 50% of active area height
            60                         // Absolute maximum
        );
        
        const minFontSize = Math.min(
            this.width / 60,
            activeArea.height * 0.02,   // 10% of active area height
            14
        );
        
        const fontSizeScale = d3.scaleLog()
            .domain([Math.max(1, minCount), maxCount])
            .range([minFontSize, maxFontSize])
            .clamp(true);

        this.words.forEach(word => {
            word.fontSize = word.isFocus ? 
                fontSizeScale(word.totalCount) * 1.1 : 
                fontSizeScale(word.totalCount);
        });

        this.layoutWords(activeArea);

        this.title
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2)
            .text(`Countries Involved in the Events happening in ${this.focusCountry}`);

        this.subtitle
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2 + 20)
            .text('Size shows total events mentioning the country as an actor • Color shows perpetrator/victim ratio');
    }

    layoutWords(activeArea) {
        // Prepare word data for d3-cloud
        const cloudWords = this.words.map(d => ({
            text: d.country,
            size: d.fontSize,
            originalData: d
        }));

        // Create d3-cloud layout
        const layout = d3.layout.cloud()
            .size([activeArea.width, activeArea.height])
            .words(cloudWords)
            .padding(5)
            .rotate(() => 0)
            .font('Inter, sans-serif')
            .fontSize(d => d.size)
            .spiral('archimedean')
            .on('end', (layoutWords) => {
                // Transfer layout positions back to original words array
                layoutWords.forEach((layoutWord) => {
                    const originalWord = this.words.find(w => w.country === layoutWord.text);
                    if (originalWord) {
                        // d3-cloud returns positions centered at (0,0) within the size bounds
                        const cloudX = layoutWord.x || 0;
                        const cloudY = layoutWord.y || 0;
                        
                        // Translate to our active area coordinates
                        originalWord.x = activeArea.x + (activeArea.width / 2) + cloudX;
                        originalWord.y = activeArea.y + (activeArea.height / 2) + cloudY;
                        
                        originalWord.width = this.getTextWidth(
                            originalWord.country,
                            originalWord.fontSize,
                            'Inter, sans-serif'
                        );
                        originalWord.height = originalWord.fontSize * 1.2;
                    }
                });

                // Draw the words after layout is complete
                this.drawWords();
            });

        layout.start();
    }

    getTextWidth(text, fontSize, fontFamily) {
        // Reuse canvas for better performance
        if (!this._measureCanvas) {
            this._measureCanvas = document.createElement("canvas");
            this._measureContext = this._measureCanvas.getContext("2d", { willReadFrequently: true });
        }
        this._measureContext.font = `700 ${fontSize}px ${fontFamily}`;
        return this._measureContext.measureText(text).width;
    }    

    getWordColor(word) {
        const actor1Color = d3.rgb(255, 0, 0);
        const actor2Color = d3.rgb(0, 140, 255);
        return d3.interpolateRgb(actor2Color, actor1Color)(word.ratio);
    }

    drawWords() {
        const wordElements = this.g.selectAll('.word')
            .data(this.words)
            .enter()
            .append('text')
            .attr('class', 'word')
            .attr('x', d => d.x)
            .attr('y', d => d.y)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', d => this.getWordColor(d))
            .attr('opacity', 0)
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', d => `${d.fontSize}px`)
            .style('font-weight', d => d.isFocus ? '700' : '500')
            .style('cursor', 'pointer')
            .style('user-select', 'none')
            .text(d => d.country);

        wordElements
            .transition()
            .delay((d, i) => i * 20)
            .duration(400)
            .attr('opacity', d => d.isFocus ? 1 : 0.8);

        this.addInteractivity(wordElements);
    }

    addInteractivity(wordElements) {
        wordElements
            .on('mouseenter', (event, d) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(150)
                    .attr('opacity', 1)
                    .style('font-weight', '700');
                
                wordElements
                    .filter(w => w.country !== d.country)
                    .transition()
                    .duration(150)
                    .attr('opacity', 0.4);
                
                if (this.tooltip) {
                    const perpetratorPercent = (d.ratio * 100).toFixed(0);
                    const victimPercent = ((1 - d.ratio) * 100).toFixed(0);
                    
                    this.tooltip
                        .style('opacity', 1)
                        .html(`
                            <strong>${d.country}</strong><br>
                            Perpetrator: ${d.countAsActor1.toLocaleString()} (${perpetratorPercent}%)<br>
                            Victim: ${d.countAsActor2.toLocaleString()} (${victimPercent}%)<br>
                            <strong>Total: ${d.totalCount.toLocaleString()}</strong>
                        `);
                }
            })
            .on('mousemove', (event) => {
                this.positionTooltip(event);
            })
            .on('mouseout', (event, d) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(150)
                    .attr('opacity', d.isFocus ? 1 : 0.8)
                    .style('font-weight', d.isFocus ? '700' : '500');
                
                wordElements
                    .transition()
                    .duration(150)
                    .attr('opacity', w => w.isFocus ? 1 : 0.8);
                
                if (this.tooltip) {
                    this.tooltip.style('opacity', 0);
                }
            });
    }

    updateData(newCsvPath, newFocusCountry) {
        this.csvPath = newCsvPath;
        this.focusCountry = newFocusCountry;
        this.loadData();
    }
}