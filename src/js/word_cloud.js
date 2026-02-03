import ScrollyChart from './scrolly_chart.js';

export default class WordCloud extends ScrollyChart {
    /**
     * Word Cloud Visualization - Andy Kirk Philosophy Implementation
     * 
     * Design Principles Applied:
     * - Clarity: Clear visual encoding, readable typography, intuitive color scheme
     * - Accuracy: Proportional sizing, gradient reflects actor ratio
     * - Functionality: Responsive, interactive, collision-free positioning
     * - Beauty: Harmonious colors, elegant layout, smooth animations
     * 
     * Data structure: { country, countAsActor1, countAsActor2 }
     * - Size: Based on total count (countAsActor1 + countAsActor2)
     * - Color: Gradient from actor1 color to actor2 color based on ratio
     * - Focus country: Special highlight color
     */
    constructor(svgId, data, focusCountry, tooltip = null) {
        super(svgId, data, tooltip);
        this.focusCountry = focusCountry;
        this.words = [];
        
        // Refined color palette matching your site's aesthetic
        this.colors = {
            focusCountry: '#e83095',      // Warm orange for main country
            actor1Pure: '#ff0000',         // Muted terracotta red (perpetrators)
            actor2Pure: '#00a2ff',         // Deep teal blue (victims)
            text: '#1a1a1a',               // Near black for readability
            textSecondary: '#666666',      // Mid gray
            background: '#fafafa'          // Subtle off-white
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
            .style('font-size', Math.min(this.width / 40, 12) + 'px')
            .style('font-weight', '400');
    }

    processData(data) {
        this.words = data.map(d => {
            const totalCount = +d.totalCount || 0;
            const actor1Count = +d.countAsActor1 || 0;
            const actor2Count = +d.countAsActor2 || 0;
            
            // Calculate ratio: 0 = pure actor2, 0.5 = balanced, 1 = pure actor1
            let ratio = 0.5;
            if (totalCount > 0) {
                ratio = actor1Count / totalCount;
            }
            
            return {
                country: d.country_name,  // CSV uses country_name
                countAsActor1: actor1Count,
                countAsActor2: actor2Count,
                totalCount: totalCount,
                ratio: ratio,
                isFocus: d.country_name === this.focusCountry
            };
        }).filter(d => d.totalCount > 0); // Only keep countries with events
        
        // Sort by total count descending for better layout
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

        // Calculate font sizes based on actual data using logarithmic scale
        const maxCount = d3.max(this.words, d => d.totalCount);
        const minCount = d3.min(this.words, d => d.totalCount);
        
        // Logarithmic scale for better visual balance - allows 2nd/3rd to compete with 1st
        const fontSizeScale = d3.scaleLog()
            .domain([Math.max(1, minCount), maxCount])
            .range([Math.min(this.width / 60, 14), Math.min(this.width / 10, 60)])
            .clamp(true);

        // Add font sizes to words - focus country slightly larger but not dominant
        this.words.forEach(word => {
            word.fontSize = word.isFocus ? 
                fontSizeScale(word.totalCount) * 1.1 : // Focus only 10% larger
                fontSizeScale(word.totalCount);
        });

        // Use D3 force simulation for organic, collision-free placement
        this.layoutWords();

        // Update title and subtitle positions
        this.title
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2)
            .text(`Countries Involved in the Events happening in ${this.focusCountry}`);

        this.subtitle
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2 + 20)
            .text('Size shows total events • Color shows perpetrator/victim ratio');
    }

    layoutWords() {
        // Create a simple bounding box for each word based on approximate text dimensions
        this.words.forEach(word => {
            // Safety check
            if (!word.country || !word.fontSize) {
                console.warn('Invalid word data:', word);
                return;
            }
            
            // More accurate text dimensions (approximate)
            word.width = this.getTextWidth(
            word.country,
            word.fontSize,
            'Inter, sans-serif'
            );
            word.height = word.fontSize * 1.2;
            
            // Focus country starts at exact center, others start randomly around it
            if (word.isFocus) {
                word.x = this.innerWidth / 2;
                word.y = this.innerHeight / 2;
            } else {
                word.x = this.innerWidth / 2 + (Math.random() - 0.5) * this.innerWidth * 0.6;
                word.y = this.innerHeight / 2 + (Math.random() - 0.5) * this.innerHeight * 0.6;
            }
        });

        // Filter out any invalid words
        this.words = this.words.filter(w => w.width && w.height && w.country);

        if (this.words.length === 0) {
            console.error('No valid words to display');
            return;
        }

        // Define your custom area here (or pass it in)
        const activeArea = {
            x: this.innerWidth * 0.1,      // Start at 20% width
            y: this.innerHeight * 0.4,     // Start at 20% height
            width: this.innerWidth * 0.75,  // Use 60% width
            height: this.innerHeight * 0.3 // Use 60% height
        };
        
        // Calculate the center of the active area
        const areaCenterX = activeArea.x + (activeArea.width / 2);
        const areaCenterY = activeArea.y + (activeArea.height / 2);        

        // Create force simulation for collision-free layout
        const simulation = d3.forceSimulation(this.words)
            .force('charge', d3.forceManyBody().strength(-50))
            .force(
            'collision',
            d3.forceCollide()
                .radius(d => Math.max(d.width, d.height) / 2 + 4)
                .strength(1)
                .iterations(2)
            )
            // --- Pull words to the center of your activeArea ---
            .force('x', d3.forceX(areaCenterX).strength(d => d.isFocus ? 0.5 : 0.05))
            .force('y', d3.forceY(areaCenterY).strength(d => d.isFocus ? 0.5 : 0.05))
            // --- Pass the area to boundaryForce ---
            .force('boundary', this.boundaryForce(activeArea)) 
            .stop();        // Run simulation synchronously for immediate layout
            for (let i = 0; i < 500; i++) { // More iterations for better convergence
                simulation.tick();
            }

        // Draw the words
        this.drawWords();
    }

    boundaryForce(area) {
        // If no area provided, default to full screen (backward compatibility)
        const bounds = area || { 
            x: 0, 
            y: 0, 
            width: this.innerWidth, 
            height: this.innerHeight 
        };        

        // Keep words within bounds with padding
        return () => {
            this.words.forEach(word => {
                const padding = 20;
                word.x = Math.max(bounds.x + word.width / 2 + padding, 
                         Math.min(bounds.x + bounds.width - word.width / 2 - padding, word.x));
                word.y = Math.max(bounds.y + word.height / 2 + padding, 
                         Math.min(bounds.y + bounds.height - word.height / 2 - padding, word.y));
            });
        };
    }

    getTextWidth(text, fontSize, fontFamily) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        context.font = `700 ${fontSize}px ${fontFamily}`; // measuring with bold weight to be safe
        return context.measureText(text).width;
    }    

    getWordColor(word) {
        /*
        if (word.isFocus) {
            return this.colors.focusCountry;
        }
        */
        
        // More harmonious gradient based on actor1/actor2 ratio
        // Use softer, more readable colors
        const actor1Color = d3.rgb(255, 0, 0);  // Softer brown-red
        const actor2Color = d3.rgb(0, 140, 255); // Steel blue
        
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
            .style('font-family', 'Inter, sans-serif') // Consistent font for all
            .style('font-size', d => `${d.fontSize}px`)
            .style('font-weight', d => d.isFocus ? '700' : '500') // Focus bolder
            .style('cursor', 'pointer')
            .style('user-select', 'none')
            .text(d => d.country);

        // Animate words in with stagger
        wordElements
            .transition()
            .delay((d, i) => i * 20)
            .duration(400)
            .attr('opacity', d => d.isFocus ? 1 : 0.8);

        // Add interactivity
        this.addInteractivity(wordElements);
    }

    drawTitleSubtitle() {
        const titleGroup = this.svg.append('g')
            .attr('class', 'title-group')
            .attr('transform', `translate(${this.margin.left + this.innerWidth / 2}, ${this.margin.top - 50})`);

        // Title
        titleGroup.append('text')
            .attr('class', 'chart-title text-center text-base sm:text-lg md:text-xl lg:text-2xl')
            .attr('x', 0)
            .attr('y', -25)
            .attr('text-anchor', 'middle')
            .attr('fill', this.colors.text)
            .style('font-family', "'Georgia', serif")
            .style('font-weight', '700')
            .style('letter-spacing', '-0.02em')
            .text(`Countries Involved in the Events happening in ${this.focusCountry}`)
            .attr('opacity', 0)
            .transition()
            .duration(800)
            .attr('opacity', 1);

        // Subtitle
        titleGroup.append('text')
            .attr('class', 'chart-subtitle text-center text-xs sm:text-sm md:text-base')
            .attr('x', 0)
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .attr('fill', this.colors.textSecondary)
            .style('font-family', "'Inter', sans-serif")
            .style('font-weight', '400')
            .text('Perpetrators in red • Victims in blue • Size shows total events')
            .attr('opacity', 0)
            .transition()
            .delay(300)
            .duration(800)
            .attr('opacity', 1);
    }

    addInteractivity(wordElements) {
        wordElements
            .on('mouseenter', (event, d) => {
                //if (event.pointerType === 'touch') return;
                
                // Subtle highlight
                d3.select(event.currentTarget)
                    .transition()
                    .duration(150)
                    .attr('opacity', 1)
                    .style('font-weight', '700');
                
                // Fade others slightly
                wordElements
                    .filter(w => w.country !== d.country)
                    .transition()
                    .duration(150)
                    .attr('opacity', 0.4);
                
                // Show tooltip
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
                //if (event.pointerType === 'touch') return;
                this.positionTooltip(event);
            })
            .on('mouseout', (event, d) => {
                //if (event.pointerType === 'touch') return;
                
                // Restore word
                d3.select(event.currentTarget)
                    .transition()
                    .duration(150)
                    .attr('opacity', d.isFocus ? 1 : 0.8)
                    .style('font-weight', d.isFocus ? '700' : '500');
                
                // Restore all words
                wordElements
                    .transition()
                    .duration(150)
                    .attr('opacity', w => w.isFocus ? 1 : 0.8);
                
                // Hide tooltip
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