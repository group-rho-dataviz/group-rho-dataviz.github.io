import ScrollyChart from './scrolly_chart.js';

export default class BarChart extends ScrollyChart {
    constructor(svgId, data, colors = d3.schemeTableau10) {
        super(svgId, data);
        this.colors = colors;
        this.currentView = 'clusters';
        this.selectedCluster = null;
        
        // Muted colors for conflict data
        this.clusterColors = {
            'Low': '#7da87b',
            'Medium': '#c49a6c',
            'High': '#a67c7c'
        };
        
        // Add tooltip
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('padding', '8px 12px')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', 10);
    }

    init() {
        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = bbox.width;
        
        // Adjust margins for mobile
        const isMobile = this.width < 640;
        this.height = isMobile ? Math.max(bbox.height, 500) : Math.max(bbox.height, 550);

        this.margin = { 
            top: isMobile ? 100 : 50,  // Extra space for back button on mobile
            right: isMobile ? 20 : 30, 
            bottom: isMobile ? 60 : 80,  // More space for range labels
            left: isMobile ? 50 : 70 
        };
        
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.selectAll('*').remove();
        
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        this.xScale = d3.scaleBand().range([0, this.innerWidth]).padding(0.2);
        this.yScale = d3.scaleLinear().range([this.innerHeight, 0]);

        this.xAxisG = this.g.append('g')
            .attr('transform', `translate(0,${this.innerHeight})`);

        this.yAxisG = this.g.append('g');

        // Title - positioned at top
        this.title = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', isMobile ? 50 : 25)
            .attr('text-anchor', 'middle')
            .attr('fill', '#f3f4f6')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', isMobile ? '13px' : '16px')
            .style('font-weight', '600');

        // Y-axis label
        this.yAxisLabel = this.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(this.margin.top + this.innerHeight / 2))
            .attr('y', isMobile ? 15 : 20)
            .attr('text-anchor', 'middle')
            .attr('fill', '#9ca3af')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', '12px')
            .style('font-weight', '500');
            
        // Hint text for tap interaction
        this.hintText = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', isMobile ? 70 : 43)
            .attr('text-anchor', 'middle')
            .attr('fill', '#9ca3af')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', '11px')
            .style('font-style', 'italic')
            .style('opacity', 0);
        
        // Back button as SVG element (positioned below title on mobile)
        this.backButton = this.svg.append('g')
            .attr('class', 'back-button-group')
            .style('cursor', 'pointer')
            .style('opacity', 0)
            .style('pointer-events', 'none')
            .on('click', () => this.showClusters());
        
        const buttonWidth = isMobile ? 70 : 80;

        const buttonX = this.width - buttonWidth - (isMobile ? 12 : 16);
        const buttonY = isMobile ? 12 : 10;
        
        this.backButton.append('rect')
            .attr('x', buttonX)
            .attr('y', buttonY)
            .attr('width', isMobile ? 70 : 80)
            .attr('height', 28)
            .attr('rx', 5)
            .attr('fill', '#5a6c7d')
            .on('mouseover', function() {
                d3.select(this).attr('fill', '#4a5c6d');
            })
            .on('mouseout', function() {
                d3.select(this).attr('fill', '#5a6c7d');
            });
        
        this.backButton.append('text')
            .attr('x', buttonX + (isMobile ? 35 : 40))
            .attr('y', buttonY + 18)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', '13px')
            .style('font-weight', '500')
            .style('pointer-events', 'none')
            .text('← Back');
    }

    updateAxes() {
        if (!this.xAxisG || !this.yAxisG) return;
        
        const isMobile = this.width < 640;

        this.xAxisG
            .transition()
            .duration(800)
            .call(d3.axisBottom(this.xScale))
            .selectAll('text')
            .attr('fill', '#9ca3af')
            .style('font-size', isMobile ? '10px' : '11px')
            .attr('transform', 'rotate(0)')
            .style('text-anchor', 'middle');

        this.yAxisG
            .transition()
            .duration(800)
            .call(d3.axisLeft(this.yScale)
                .ticks(isMobile ? 4 : 5)
                .tickFormat(d => {
                    // Format large numbers better for mobile
                    if (d >= 1000000) return (d / 1000000).toFixed(0) + 'M';
                    if (d >= 1000) return (d / 1000).toFixed(0) + 'K';
                    return d;
                }))
            .selectAll('text')
            .attr('fill', '#9ca3af')
            .style('font-size', isMobile ? '10px' : '11px');

        this.xAxisG.selectAll('line, path').attr('stroke', '#374151');
        this.yAxisG.selectAll('line, path').attr('stroke', '#374151');
        
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
                    .attr('y', this.innerHeight + (isMobile ? 38 : 42))
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#6b7280')
                    .style('font-size', isMobile ? '9px' : '10px')
                    .style('font-style', 'italic')
                    .text(ranges[d.cluster]);
            });
        } else if (this.currentView === 'countries' && this.selectedCluster) {
            // Show range for the selected cluster
            this.g.append('text')
                .attr('class', 'range-label')
                .attr('x', this.xScale(this.selectedCluster) + this.xScale.bandwidth() / 2)
                .attr('y', this.innerHeight + (isMobile ? 38 : 42))
                .attr('text-anchor', 'middle')
                .attr('fill', '#6b7280')
                .style('font-size', isMobile ? '9px' : '10px')
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
        
        // Hide back button
        this.backButton
            .transition()
            .duration(300)
            .style('opacity', 0)
            .on('end', () => this.backButton.style('pointer-events', 'none'));
        
        // Update title
        this.title
            .transition()
            .duration(300)
            .text('Countries by Fatality Cluster (2025)');

        this.yAxisLabel
            .transition()
            .duration(300)
            .text('Number of Countries');
            
        // Show hint text
        this.hintText
            .text(isMobile ? 'Tap a bar to see details' : 'Click a bar to see details')
            .transition()
            .duration(300)
            .style('opacity', 1);
        
        // Update scales
        this.xScale.domain(this.clusterData.map(d => d.cluster));
        this.yScale.domain([0, d3.max(this.clusterData, d => d.count) * 1.1]);
        
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
            .attr('width', this.xScale.bandwidth())
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .attr('fill', d => d.color)
            .style('cursor', 'pointer');
        
        // Update
        bars.merge(barsEnter)
            .on('click', (event, d) => this.showCountries(d.cluster))
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget).style('opacity', 0.8);
                this.tooltip
                    .style('opacity', 1)
                    .html(`<strong>${d.cluster}</strong><br/>${d.count} countries`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget).style('opacity', 1);
                this.tooltip.style('opacity', 0);
            })
            .transition()
            .duration(600)
            .attr('x', d => this.xScale(d.cluster))
            .attr('width', this.xScale.bandwidth())
            .attr('y', d => this.yScale(d.count))
            .attr('height', d => this.innerHeight - this.yScale(d.count))
            .attr('fill', d => d.color);
        
        // Remove country labels
        this.g.selectAll('.country-label').remove();
    }

    showCountries(cluster) {
        this.currentView = 'countries';
        this.selectedCluster = cluster;
        const isMobile = this.width < 640;
        
        // Remove range labels
        this.g.selectAll('.range-label').remove();
        
        // Show back button
        this.backButton
            .style('pointer-events', 'all')
            .transition()
            .duration(300)
            .style('opacity', 1);
        
        // Update title (shorter for mobile)
        const titleText = isMobile 
            ? `${cluster} Cluster Fatalities` 
            : `Fatalities by Country - ${cluster} Cluster`;
        
        this.title
            .transition()
            .duration(300)
            .text(titleText);

        this.yAxisLabel
            .transition()
            .duration(300)
            .text('Total Fatalities');            
        
        // Hide hint text
        this.hintText
            .transition()
            .duration(300)
            .style('opacity', 0);
        
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
        this.yScale.domain([0, totalFatalities * 1.05]);
        
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
            .attr('width', this.xScale.bandwidth())
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .style('cursor', 'default');
        
        // Update
        bars.merge(barsEnter)
            .on('click', null)
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget).style('opacity', 0.8);
                this.tooltip
                    .style('opacity', 1)
                    .html(`<strong>${d.country}</strong><br/>${d.fatalities.toLocaleString()} fatalities`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget).style('opacity', 1);
                this.tooltip.style('opacity', 0);
            })
            .transition()
            .duration(600)
            .attr('x', this.xScale(cluster))
            .attr('width', this.xScale.bandwidth())
            .attr('y', d => this.yScale(d.end))
            .attr('height', d => this.yScale(d.start) - this.yScale(d.end))
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
            .style('font-size', isMobile ? '9px' : '10px')
            .style('font-weight', '500')
            .style('pointer-events', 'none')
            .attr('x', this.xScale(cluster) + this.xScale.bandwidth() / 2)
            .attr('y', this.innerHeight)
            .style('opacity', 0);
        
        labels.merge(labelsEnter)
            .transition()
            .duration(600)
            .attr('x', this.xScale(cluster) + this.xScale.bandwidth() / 2)
            .attr('y', d => this.yScale(d.end) + (this.yScale(d.start) - this.yScale(d.end)) / 2 + 4)
            .text(d => d.country)
            .style('opacity', 1);
    }
}