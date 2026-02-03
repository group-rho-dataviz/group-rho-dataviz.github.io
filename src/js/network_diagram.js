import ScrollyChart from './scrolly_chart.js';

export default class NetworkDiagram extends ScrollyChart {
    /**
     * Redesigned Network Diagram - Andy Kirk Philosophy Implementation
     * 
     * Design Principles Applied:
     * - Clarity: Clear visual hierarchy, readable labels, intuitive layout
     * - Accuracy: Proportional node sizes, consistent spacing
     * - Functionality: Responsive, interactive, collision detection
     * - Beauty: Clean aesthetics, subtle animations, harmonious colors
     */
    constructor(svgId, data, focusCountry, tooltip = null) {
        super(svgId, data, tooltip);
        this.focusCountry = focusCountry;
        this.nodes = [];
        this.links = [];
        this.simulation = null;
        
        // Refined color palette matching your site's aesthetic
        // Based on the website: clean, professional, with accent colors
        this.colors = {
            focusCountry: '#e86930',      // Warm orange (vibrant but not glowy)
            actor1: '#8b3a3a',             // Muted terracotta red
            actor2: '#2c5f7c',             // Deep teal blue
            linkActor1: '#e86930',         // Same as focus for visual coherence
            linkActor2: '#2c5f7c',         // Match actor2
            text: '#1a1a1a',               // Near black for readability
            textSecondary: '#666666',      // Mid gray
            background: '#fafafa',         // Subtle off-white
            gridLine: '#e5e5e5'            // Very light grid
        };
    }

    init() {
        super.init();

        this.margin = { 
            top: 100,   // More space for title/subtitle
            right: 80,
            bottom: 60,
            left: 80 
        };

        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = bbox.width;
        this.height = bbox.height;


        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;
    }

    processData(data) {
        // Separate Actor1 and Actor2 countries
        const actor1Data = data.filter(d => {
            return d.isActor1 === true || d.isActor1 === 'true' || d.isActor1 === '1' || d.isActor1 === 1;
        });
        const actor2Data = data.filter(d => {
            return d.isActor1 === false || d.isActor1 === 'false' || d.isActor1 === '0' || d.isActor1 === 0;
        });

        this.nodes = [];
        this.links = [];

        // Central focus country node
        const totalCount = d3.sum(data, d => +d.count);
        
        this.nodes.push({
            id: this.focusCountry,
            country: this.focusCountry,
            count: totalCount,
            type: 'focus'
        });

        // Actor1 nodes (perpetrators)
        actor1Data.forEach((d, i) => {
            const count = +d.count;
            this.nodes.push({
                id: `actor1_${d.country}`,
                country: d.country,
                count: count,
                type: 'actor1',
                index: i
            });

            this.links.push({
                source: `actor1_${d.country}`,
                target: this.focusCountry,
                value: count,
                type: 'actor1'
            });
        });

        // Actor2 nodes (victims)
        actor2Data.forEach((d, i) => {
            const count = +d.count;
            this.nodes.push({
                id: `actor2_${d.country}`,
                country: d.country,
                count: count,
                type: 'actor2',
                index: i
            });

            this.links.push({
                source: this.focusCountry,
                target: `actor2_${d.country}`,
                value: count,
                type: 'actor2'
            });
        });
    }

    draw() {
        if (this.data && typeof this.data.then === 'function') {
            this.data.then(loadedData => {
                this.processData(loadedData);
                this.drawNetwork();
            });
        } else if (this.data) {
            this.processData(this.data);
            this.drawNetwork();
        }
    }

    drawNetwork() {
        this.g.selectAll("*").remove();
        if (!this.g || this.nodes.length === 0) return;

        // Add title and subtitle
        this.drawTitleSubtitle();

        // Calculate responsive bubble sizes
        const maxCount = d3.max(this.nodes, d => d.count);
        const minCount = d3.min(this.nodes.filter(d => d.type !== 'focus'), d => d.count);
        
        const radiusScale = d3.scaleSqrt()
            .domain([minCount, maxCount])
            .range([18, 70]);

        // Initialize force simulation for organic, non-overlapping layout
        this.initializeSimulation(radiusScale);

        // Create link elements (draw first, behind nodes)
        this.linkElements = this.g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(this.links)
            .enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', d => d.type === 'actor1' ? this.colors.linkActor1 : this.colors.linkActor2)
            .attr('stroke-width', d => Math.sqrt(d.value) * 0.15)
            .attr('stroke-opacity', 0.25)
            .attr('fill', 'none');

        // Create node groups
        this.nodeElements = this.g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(this.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .style('cursor', 'pointer')
            .call(this.dragBehavior());

        // Add circles to nodes
        this.nodeElements.append('circle')
            .attr('class', 'node-circle')
            .attr('r', d => radiusScale(d.count))
            .attr('fill', d => {
                if (d.type === 'focus') return this.colors.focusCountry;
                if (d.type === 'actor1') return this.colors.actor1;
                return this.colors.actor2;
            })
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2)
            .attr('opacity', 0)
            .transition()
            .delay((d, i) => i * 30)
            .duration(600)
            .attr('opacity', 0.9);

        // Add labels to nodes
        this.addNodeLabels(radiusScale);

        // Add interactivity
        this.addInteractivity(radiusScale);

        // Update positions on simulation tick
        this.simulation.on('tick', () => {
            this.linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            this.nodeElements
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }

    drawTitleSubtitle() {
        const titleGroup = this.svg.append('g')
            .attr('class', 'title-group')
            .attr('transform', `translate(${this.width / 2}, ${this.margin.top - 50})`);

        // Title - centered using text-anchor middle with responsive sizing via Tailwind
        titleGroup.append('text')
            .attr('class', 'chart-title text-center text-base sm:text-lg md:text-xl lg:text-2xl')
            .attr('x', 0)
            .attr('y', -25)
            .attr('text-anchor', 'middle')
            .attr('fill', this.colors.text)
            .style('font-family', "'Georgia', serif")
            .style('font-weight', '700')
            .style('letter-spacing', '-0.02em')
            .text(`Network of Actors: ${this.focusCountry}`)
            .attr('opacity', 0)
            .transition()
            .duration(800)
            .attr('opacity', 1);

        // Subtitle - centered using text-anchor middle with responsive sizing via Tailwind
        titleGroup.append('text')
            .attr('class', 'chart-subtitle text-center text-xs sm:text-sm md:text-base')
            .attr('x', 0)
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .attr('fill', this.colors.textSecondary)
            .style('font-family', "'Inter', sans-serif")
            .style('font-weight', '400')
            .text('Countries involved in reported events as perpetrators and victims')
            .attr('opacity', 0)
            .transition()
            .delay(300)
            .duration(800)
            .attr('opacity', 1);
    }

    initializeSimulation(radiusScale) {
        // Set initial positions to create a structured starting layout
        const focusNode = this.nodes.find(d => d.type === 'focus');
        const actor1Nodes = this.nodes.filter(d => d.type === 'actor1');
        const actor2Nodes = this.nodes.filter(d => d.type === 'actor2');

        // Center the focus node
        focusNode.x = this.innerWidth / 2;
        focusNode.y = this.innerHeight / 2;

        // Position actor1 nodes on the left
        actor1Nodes.forEach((node, i) => {
            node.x = this.innerWidth * 0.25;
            node.y = this.innerHeight * (0.2 + (i * 0.6) / Math.max(1, actor1Nodes.length - 1));
        });

        // Position actor2 nodes on the right
        actor2Nodes.forEach((node, i) => {
            node.x = this.innerWidth * 0.75;
            node.y = this.innerHeight * (0.2 + (i * 0.6) / Math.max(1, actor2Nodes.length - 1));
        });

        // Create force simulation with collision detection
        this.simulation = d3.forceSimulation(this.nodes)
            .force('link', d3.forceLink(this.links)
                .id(d => d.id)
                .distance(120)
                .strength(0.5))
            .force('charge', d3.forceManyBody()
                .strength(-200)
                .distanceMax(250))
            .force('collision', d3.forceCollide()
                .radius(d => radiusScale(d.count) + 8)
                .strength(0.9)
                .iterations(3))
            .force('x', d3.forceX()
                .x(d => {
                    if (d.type === 'focus') return this.innerWidth / 2;
                    if (d.type === 'actor1') return this.innerWidth * 0.25;
                    return this.innerWidth * 0.75;
                })
                .strength(0.3))
            .force('y', d3.forceY()
                .y(d => {
                    if (d.type === 'focus') return this.innerHeight / 2;
                    return this.innerHeight / 2;
                })
                .strength(0.1))
            .force('boundary', this.boundaryForce())
            .alphaDecay(0.02)
            .velocityDecay(0.3);

        // Pin the focus node
        focusNode.fx = this.innerWidth / 2;
        focusNode.fy = this.innerHeight / 2;
    }

    boundaryForce() {
        // Custom force to keep nodes within bounds
        const padding = 30;
        return () => {
            this.nodes.forEach(node => {
                const radius = node.r || 20;
                node.x = Math.max(padding + radius, Math.min(this.innerWidth - padding - radius, node.x));
                node.y = Math.max(padding + radius, Math.min(this.innerHeight - padding - radius, node.y));
            });
        };
    }

    dragBehavior() {
        const radiusScale = d3.scaleSqrt()
            .domain([d3.min(this.nodes.filter(d => d.type !== 'focus'), d => d.count), 
                     d3.max(this.nodes, d => d.count)])
            .range([18, 70]);
        
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                if (d.type === 'focus') {
                    // Apply responsive bounding box for focus country
                    // Use percentage-based padding that scales with viewport
                    const nodeRadius = radiusScale(d.count);
                    const paddingPercent = 0.0; // 15% of dimension as padding
                    const minPadding = 0; // Minimum padding in pixels
                    
                    const paddingX = Math.max(minPadding, this.innerWidth * paddingPercent);
                    const paddingY = Math.max(minPadding, this.innerHeight * paddingPercent);
                    
                    // Calculate bounds
                    const minX = paddingX + nodeRadius - 240;
                    const maxX = this.innerWidth - paddingX - nodeRadius + 370;
                    const minY = paddingY + nodeRadius;
                    const maxY = this.innerHeight - paddingY - nodeRadius + 280;
                    
                    // Constrain position
                    d.fx = Math.max(minX, Math.min(maxX, event.x));
                    d.fy = Math.max(minY, Math.min(maxY, event.y));
                } else {
                    d.fx = event.x;
                    d.fy = event.y;
                }
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                // Keep focus node fixed, release others
                if (d.type !== 'focus') {
                    d.fx = null;
                    d.fy = null;
                }
            });
    }

    addNodeLabels(radiusScale) {
        // Add labels for larger nodes or focus node
        this.nodeElements.each(function(d) {
            const node = d3.select(this);
            
            if (d.type === 'focus') {
                // Focus node label inside circle with responsive sizing
                node.append('text')
                    .attr('class', 'focus-label text-xs sm:text-sm md:text-base')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '-0.1em')
                    .attr('fill', '#ffffff')
                    .style('font-family', "'Inter', sans-serif")
                    .style('font-weight', '700')
                    .style('text-transform', 'uppercase')
                    .style('letter-spacing', '0.05em')
                    .style('pointer-events', 'none')
                    .text(d.country);

                node.append('text')
                    .attr('class', 'text-xs sm:text-sm')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '1.2em')
                    .attr('fill', '#ffffff')
                    .attr('fill-opacity', 0.95)
                    .style('font-family', "'Inter', sans-serif")
                    .style('font-weight', '500')
                    .style('pointer-events', 'none')
                    .text(d.count.toLocaleString() + ' events');
            } else {
                // External labels for actor nodes with responsive sizing
                const radius = radiusScale(d.count);
                const isActor1 = d.type === 'actor1';
                const offset = 8;
                
                node.append('text')
                    .attr('class', 'actor-label text-xs sm:text-sm')
                    .attr('x', isActor1 ? -(radius + offset) : (radius + offset))
                    .attr('dy', '0.35em')
                    .attr('text-anchor', isActor1 ? 'end' : 'start')
                    .attr('fill', '#1a1a1a')
                    .style('font-family', "'Inter', sans-serif")
                    .style('font-weight', '600')
                    .style('pointer-events', 'none')
                    .text(d.country);
            }
        });
    }

    addInteractivity(radiusScale) {
        this.nodeElements
            .on('pointerenter', (event, d) => {
                if (event.pointerType === 'touch') return;
                
                // Highlight connections
                this.highlightConnections(d, true);
                
                // Show tooltip with details
                if (this.tooltip) {
                    const role = d.type === 'actor1' ? 'Perpetrator' : 
                                 d.type === 'actor2' ? 'Victim' : 'Event Location';
                    
                    this.tooltip
                        .style('opacity', 1)
                        .html(`
                            <div style="font-weight: 700; margin-bottom: 4px; color: ${this.colors.text}">
                                ${d.country}
                            </div>
                            <div style="font-size: 12px; color: ${this.colors.textSecondary}">
                                ${role}
                            </div>
                            <div style="font-size: 13px; margin-top: 6px; color: ${this.colors.text}">
                                ${d.count.toLocaleString()} events
                            </div>
                        `);
                }

                // Enlarge node
                d3.select(event.currentTarget).select('.node-circle')
                    .transition()
                    .duration(200)
                    .attr('r', radiusScale(d.count) * 1.15)
                    .attr('opacity', 1);
            })
            .on('pointermove', (event) => {
                if (event.pointerType === 'touch') return;
                this.positionTooltip(event);
            })
            .on('pointerout', (event, d) => {
                if (event.pointerType === 'touch') return;
                
                this.highlightConnections(d, false);
                
                if (this.tooltip) {
                    this.tooltip.style('opacity', 0);
                }

                d3.select(event.currentTarget).select('.node-circle')
                    .transition()
                    .duration(200)
                    .attr('r', radiusScale(d.count))
                    .attr('opacity', 0.9);
            });
    }

    highlightConnections(node, highlight) {
        // Highlight connected links
        this.linkElements
            .transition()
            .duration(200)
            .attr('stroke-opacity', d => {
                const isConnected = d.source.id === node.id || d.target.id === node.id;
                return highlight ? (isConnected ? 0.7 : 0.1) : 0.25;
            })
            .attr('stroke-width', function(d) {
                const isConnected = d.source.id === node.id || d.target.id === node.id;
                const baseWidth = Math.sqrt(d.value) * 0.15;
                return highlight && isConnected ? baseWidth * 1.5 : baseWidth;
            });

        // Highlight connected nodes
        this.nodeElements
            .transition()
            .duration(200)
            .attr('opacity', d => {
                if (d.id === node.id) return 1;
                
                const isConnected = this.links.some(link => 
                    (link.source.id === node.id && link.target.id === d.id) ||
                    (link.target.id === node.id && link.source.id === d.id)
                );
                
                return highlight ? (isConnected ? 1 : 0.3) : 1;
            });
    }

    updateData(newCsvPath, newFocusCountry) {
        this.csvPath = newCsvPath;
        this.focusCountry = newFocusCountry;
        
        // Stop existing simulation
        if (this.simulation) {
            this.simulation.stop();
        }
        
        this.loadData();
    }

    // Clean up on destroy
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        super.destroy && super.destroy();
    }
}