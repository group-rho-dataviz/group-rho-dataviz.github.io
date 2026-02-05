import ScrollyChart from './scrolly_chart.js';

export default class BarChart extends ScrollyChart {
    constructor(svgId, data, tooltip, colors = d3.schemeTableau10) {
        super(svgId, data, tooltip);
        this.colors = colors;
        this.currentView = 'clusters';
        this.selectedCluster = null;
        
        // Muted colors for conflict data
        this.clusterColors = {
            'Low': '#cfa08a',
            'Medium': '#b8613c',
            'High': '#8f2f1f'
        };
    }

    init() {
        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = Math.max(360, bbox.width);
        
        // Adjust margins for mobile
        this.height = Math.max(bbox.height, 550);

        this.margin = { 
            top: 120,  // Extra space for value labels on top of bars
            right: 20, 
            bottom: 70,  // More space for larger labels and range
            left: 20   // Reduced since no y-axis
        };
        
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.selectAll('*').remove();
        
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        this.xScale = d3.scaleBand().range([0, this.innerWidth]).padding(0.2);
        this.safeBandwidth = () => Math.max(0, this.xScale.bandwidth());

        this.yScale = d3.scaleLinear().range([this.innerHeight, 0]);

        this.xAxisG = this.g.append('g')
            .attr('transform', `translate(0,${this.innerHeight})`);

        // No y-axis needed

        // Title - positioned at top
        this.title = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', '#f3f4f6')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', Math.min(this.width / 22, 22) + 'px')
            .style('font-weight', '600');
            
        // Hint text for tap interaction
        this.hintText = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.margin.top * 3/4)
            .attr('text-anchor', 'middle')
            .attr('fill', '#9ca3af')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', Math.min(this.width / 35, 12) + 'px')
            .style('font-style', 'italic');

        this.svg.on('click', () => this.currentView === 'clusters' ? null : this.showClusters());
    }

    updateAxes() {
        if (!this.xAxisG) return;
        
        const isMobile = this.width < 640;

        // X-axis with larger labels and no ticks
        this.xAxisG
            .transition()
            .duration(800)
            .call(d3.axisBottom(this.xScale)
                .tickSize(0)  // Remove tick lines
                .tickPadding(15))  // More space between axis and labels
            .selectAll('text')
            .attr('fill', '#e5e7eb')
            .style('font-size', isMobile ? '16px' : '20px')  // Much larger labels
            .style('font-weight', '600')
            .attr('transform', 'rotate(0)')
            .style('text-anchor', 'middle');

        // Remove the axis line
        this.xAxisG.select('.domain').remove();
        
        // Add range labels if in cluster view
        this.addRangeLabels();
    }
    
    addRangeLabels() {
        const isMobile = this.width < 640;
        const ranges = {
            'Low': '[10-100)',
            'Medium': '[100-1K)',
            'High': '[1K+)'
        };
        
        // Remove existing range labels
        this.g.selectAll('.range-label').remove();
        
        // Add range labels based on current view
        if (this.currentView === 'clusters') {
            this.clusterData.forEach(d => {
                this.g.append('text')
                    .attr('class', 'range-label')
                    .attr('x', this.xScale(d.cluster) + this.xScale.bandwidth() / 2)
                    .attr('y', this.innerHeight + (isMobile ? 48 : 52))
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#6b7280')
                    .style('font-size', isMobile ? '11px' : '13px')
                    .style('font-style', 'italic')
                    .text(ranges[d.cluster]);
            });
        } else if (this.currentView === 'countries' && this.selectedCluster) {
            // Show range for the selected cluster
            this.g.append('text')
                .attr('class', 'range-label')
                .attr('x', this.xScale(this.selectedCluster) + this.xScale.bandwidth() / 2)
                .attr('y', this.innerHeight + (isMobile ? 48 : 52))
                .attr('text-anchor', 'middle')
                .attr('fill', '#6b7280')
                .style('font-size', isMobile ? '11px' : '13px')
                .style('font-style', 'italic')
                .text(ranges[this.selectedCluster]);
        }
    }

    async draw() {
        // Wait for data to load
        const rawData = await this.data;
        
        // Process data to get cluster counts and country details
        this.processData(rawData);
        
        // Show initial cluster view
        this.showClusters();
    }

    processData(rawData) {
        // Count countries per cluster
        const clusterCounts = d3.rollup(
            rawData,
            v => v.length,
            d => d.FATALITY_CLUSTER
        );
        
        this.clusterData = Array.from(clusterCounts, ([cluster, count]) => ({
            cluster,
            count,
            color: this.clusterColors[cluster]
        })).sort((a, b) => {
            const order = { 'Low': 0, 'Medium': 1, 'High': 2 };
            return order[a.cluster] - order[b.cluster];
        });
        
        // Group countries by cluster
        this.countryData = {};
        ['Low', 'Medium', 'High'].forEach(cluster => {
            const countries = rawData
                .filter(d => d.FATALITY_CLUSTER === cluster)
                .sort((a, b) => b.FATALITIES - a.FATALITIES);
            
            // Take top 8 countries and aggregate the rest
            if (countries.length > 8) {
                const top8 = countries.slice(0, 8);
                const others = countries.slice(8);
                const othersSum = d3.sum(others, d => d.FATALITIES);
                
                this.countryData[cluster] = [
                    ...top8.map(d => ({ country: d.COUNTRY, fatalities: d.FATALITIES })),
                    { country: 'Others', fatalities: othersSum }
                ];
            } else {
                this.countryData[cluster] = countries.map(d => ({ 
                    country: d.COUNTRY, 
                    fatalities: d.FATALITIES 
                }));
            }
        });
    }

    showClusters() {
        this.currentView = 'clusters';
        const isMobile = this.width < 640;
        
        // Update title
        this.title
            .transition()
            .duration(300)
            .text(`Number of Countries per Fatalities (2025)`);
        
        // Show hint text
        this.hintText
            .text('Click a bar to see details')
            .transition()
            .duration(300);
        
        // Update scales
        this.xScale.domain(this.clusterData.map(d => d.cluster));
        this.yScale.domain([0, d3.max(this.clusterData, d => d.count) * 1.15]); // Extra space for labels
        
        // Update axes
        this.updateAxes();
        
        // Bind data
        const bars = this.g.selectAll('.cluster-bar')
            .data(this.clusterData, d => d.cluster);
        
        // Exit
        bars.exit()
            .transition()
            .duration(600)
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .remove();
        
        // Enter
        const barsEnter = bars.enter()
            .append('rect')
            .attr('class', 'cluster-bar')
            .attr('x', d => this.xScale(d.cluster))
            .attr('width', this.safeBandwidth())            
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .attr('fill', d => d.color)
            .attr('rx', 4)  // Rounded corners for polish
            .style('cursor', 'pointer');
        
        // Update
        bars.merge(barsEnter)
            .on('click', (event, d) => { event.stopPropagation(); this.showCountries(d.cluster); })
            .on('pointerover', (event, d) => {
                if (event.pointerType === 'touch' || event.pointerType === 'pen') return;

                d3.select(event.currentTarget).style('opacity', 0.8);
                this.tooltip
                    .style('opacity', 1)
                    .html(`<strong>${d.cluster}</strong><br/>${d.count} countries`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('pointermove', (event) => {
                if (event.pointerType === 'touch' || event.pointerType === 'pen') return;

                this.positionTooltip(event);
            })
            .on('pointerout', (event) => {
                if (event.pointerType === 'touch' || event.pointerType === 'pen') return;
                d3.select(event.currentTarget).style('opacity', 1);
                this.tooltip.style('opacity', 0);
            })
            .on('scroll', () => {
                this.tooltip.style('opacity', 0);
            })
            .transition()
            .duration(600)
            .attr('x', d => this.xScale(d.cluster))
            .attr('width', this.safeBandwidth())            
            .attr('y', d => this.yScale(d.count))
            .attr('height', d => this.innerHeight - this.yScale(d.count))
            .attr('fill', d => d.color);
        
        // Remove country labels
        this.g.selectAll('.country-label').remove();
        
        // Add value labels on top of bars
        const valueLabels = this.g.selectAll('.value-label')
            .data(this.clusterData, d => d.cluster);
        
        valueLabels.exit().remove();
        
        const valueLabelsEnter = valueLabels.enter()
            .append('text')
            .attr('class', 'value-label')
            .attr('text-anchor', 'middle')
            .attr('fill', '#f3f4f6')
            .style('font-size', isMobile ? '18px' : '22px')
            .style('font-weight', '700')
            .style('pointer-events', 'none')
            .attr('x', d => this.xScale(d.cluster) + this.xScale.bandwidth() / 2)
            .attr('y', this.innerHeight)
            .style('opacity', 0);
        
        valueLabels.merge(valueLabelsEnter)
            .transition()
            .duration(600)
            .attr('x', d => this.xScale(d.cluster) + this.xScale.bandwidth() / 2)
            .attr('y', d => this.yScale(d.count) - 12)  // Position above bar
            .text(d => d.count)
            .style('opacity', 1);
    }

    showCountries(cluster) {
        this.currentView = 'countries';
        this.selectedCluster = cluster;
        const isMobile = this.width < 640;
        
        // Remove range labels
        this.g.selectAll('.range-label').remove();
        
        // Update title (shorter for mobile)
        const titleText = isMobile 
            ? `${cluster} Range Fatalities (Stacked)` 
            : `Fatalities by Country - ${cluster} Range (Stacked)`;
        
        this.title
            .transition()
            .duration(300)
            .text(titleText);
        
        // Hide hint text
        this.hintText
            .text('Click again to go back')
            .transition()
            .duration(300);
        
        const countries = this.countryData[cluster];
        const totalFatalities = d3.sum(countries, d => d.fatalities);
        
        // Create stacked data
        let cumulative = 0;
        const stackedData = countries.map(d => {
            const start = cumulative;
            cumulative += d.fatalities;
            return {
                country: d.country,
                fatalities: d.fatalities,
                start,
                end: cumulative
            };
        });
        
        // Update scales
        this.xScale.domain([cluster]);
        this.yScale.domain([0, totalFatalities * 1.15]); // Extra space for label on top
        
        // Update axes
        this.updateAxes();
        
        // Color scale for stacked segments
        const clusterColor = this.clusterColors[cluster];
        const colorScale = d3.scaleSequential()
            .domain([0, countries.length - 1])
            .interpolator(t => d3.interpolate(
                d3.color(clusterColor).brighter(0.5), 
                d3.color(clusterColor).darker(1)
            )(t));
        
        // Bind data
        const bars = this.g.selectAll('.cluster-bar')
            .data(stackedData, d => d.country);
        
        // Exit
        bars.exit()
            .transition()
            .duration(600)
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .remove();
        
        // Enter
        const barsEnter = bars.enter()
            .append('rect')
            .attr('class', 'cluster-bar')
            .attr('x', this.xScale(cluster))
            .attr('width', this.safeBandwidth())            
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .attr('rx', 4)
            .style('cursor', 'pointer');
        
        // Update
        bars.merge(barsEnter)
            .on('click', null)
            .on('pointerover', (event, d) => {
                if (event.pointerType === 'touch' || event.pointerType === 'pen') return;

                d3.select(event.currentTarget).style('opacity', 0.8);
                this.tooltip
                    .style('opacity', 1)
                    .html(`<strong>${d.country}</strong><br/>${d.fatalities.toLocaleString()} fatalities`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('pointermove', (event) => {
                if (event.pointerType === 'touch' || event.pointerType === 'pen') return;
                this.positionTooltip(event);
            })
            .on('pointerout', (event) => {
                if (event.pointerType === 'touch' || event.pointerType === 'pen') return;
                d3.select(event.currentTarget).style('opacity', 1);
                this.tooltip.style('opacity', 0);
            })
            .on('scroll', () => {
                this.tooltip.style('opacity', 0);
            })
            .transition()
            .duration(600)
            .attr('x', this.xScale(cluster))
            .attr('width', this.safeBandwidth())            
            .attr('y', d => this.yScale(d.end))
            .attr('height', d => Math.max(0, this.yScale(d.start) - this.yScale(d.end)))
            .attr('fill', (d, i) => colorScale(i));
        
        // Add country labels for larger segments
        const minSegmentSize = isMobile ? 0.04 : 0.035; // Larger threshold on mobile
        const labels = this.g.selectAll('.country-label')
            .data(stackedData.filter(d => (d.end - d.start) / totalFatalities > minSegmentSize));
        
        labels.exit().remove();
        
        const labelsEnter = labels.enter()
            .append('text')
            .attr('class', 'country-label')
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', isMobile ? '10px' : '12px')
            .style('font-weight', '600')
            .style('pointer-events', 'none')
            .attr('x', this.xScale(cluster) + this.xScale.bandwidth() / 2)
            .attr('y', this.innerHeight)
            .style('opacity', 0);
        
        labels.merge(labelsEnter)
            .transition()
            .duration(600)
            .attr('x', this.xScale(cluster) + this.xScale.bandwidth() / 2)
            .attr('y', d => this.yScale(d.end) + (this.yScale(d.start) - this.yScale(d.end)) / 2 + 4)
            .text(d => d.country + ` (${d.fatalities.toLocaleString()})`)
            .style('opacity', 1);
        
        // Add total fatalities label on top
        const totalLabel = this.g.selectAll('.value-label')
            .data([totalFatalities]);
        
        totalLabel.exit().remove();
        
        const totalLabelEnter = totalLabel.enter()
            .append('text')
            .attr('class', 'value-label')
            .attr('text-anchor', 'middle')
            .attr('fill', '#f3f4f6')
            .style('font-size', isMobile ? '18px' : '22px')
            .style('font-weight', '700')
            .style('pointer-events', 'none')
            .attr('x', this.xScale(cluster) + this.xScale.bandwidth() / 2)
            .attr('y', this.innerHeight)
            .style('opacity', 0);
        
        totalLabel.merge(totalLabelEnter)
            .transition()
            .duration(600)
            .attr('x', this.xScale(cluster) + this.xScale.bandwidth() / 2)
            .attr('y', this.yScale(totalFatalities) - 12)  // Position above bar
            .text(d => d.toLocaleString() + ' Fatalities')  // Format with commas
            .style('opacity', 1);
    }
}