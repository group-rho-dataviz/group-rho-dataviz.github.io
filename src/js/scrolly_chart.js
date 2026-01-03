// ===== CHART CLASS =====
export default class ScrollyChart {
    constructor(svgId, data) {
        this.svg = d3.select(`#${svgId}`);
        if (this.svg.empty()) return;
        
        this.margin = { top: 0, right: 0, bottom: 0, left: 0 };
        // Data should be a Promise that resolves to an array of objects
        this.data = data;
        this.init();
    }

    init() {
        const container = this.svg.node()?.parentElement;
        if (!container) return;

        const bbox = container.getBoundingClientRect();
        this.width = bbox.width;
        this.height = bbox.height;
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

        this.title = this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', 35)
            .attr('text-anchor', 'middle')
            .attr('fill', '#f3f4f6')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', '16px')
            .style('font-weight', '600');
    }
/*
    drawStep0() {
        if (!this.g) return;
        this.g.selectAll('.bar, .region-label').remove();
        this.title.text('Conflict Events by Region (2024)');

        this.xScale.domain(data.regions.map(d => d.name));
        this.yScale.domain([0, d3.max(data.regions, d => d.events) * 1.15]);

        this.g.selectAll('.bar')
            .data(data.regions)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', d => this.xScale(d.name))
            .attr('width', this.xScale.bandwidth())
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .attr('fill', d => d.color)
            .attr('opacity', 0.85)
            .transition()
            .duration(800)
            .attr('y', d => this.yScale(d.events))
            .attr('height', d => this.innerHeight - this.yScale(d.events));

        this.updateAxes();
    }

    drawStep1() {
        if (!this.g) return;
        this.g.selectAll('.bar, .region-label').remove();
        this.title.text('Events (gray) vs Coverage (color)');

        this.xScale.domain(data.regions.map(d => d.name));
        this.yScale.domain([0, 100]);

        const barWidth = this.xScale.bandwidth() / 2.5;

        this.g.selectAll('.bar-events')
            .data(data.regions)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', d => this.xScale(d.name))
            .attr('width', barWidth)
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .attr('fill', '#6b7280')
            .attr('opacity', 0.5)
            .transition()
            .duration(800)
            .attr('y', d => this.yScale((d.events / 2103) * 100))
            .attr('height', d => this.innerHeight - this.yScale((d.events / 2103) * 100));

        this.g.selectAll('.bar-coverage')
            .data(data.regions)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', d => this.xScale(d.name) + barWidth * 1.3)
            .attr('width', barWidth)
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .attr('fill', d => d.color)
            .attr('opacity', 0.85)
            .transition()
            .duration(800)
            .delay(200)
            .attr('y', d => this.yScale(d.coverage))
            .attr('height', d => this.innerHeight - this.yScale(d.coverage));

        this.updateAxes();
    }

    drawStep2() {
        if (!this.g) return;
        this.g.selectAll('.bar, .region-label').remove();
        this.title.text('Media Coverage Score (0-100)');

        const sorted = [...data.regions].sort((a, b) => a.coverage - b.coverage);

        this.xScale.domain(sorted.map(d => d.name));
        this.yScale.domain([0, 100]);

        this.g.selectAll('.bar')
            .data(sorted)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', d => this.xScale(d.name))
            .attr('width', this.xScale.bandwidth())
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .attr('fill', d => d.coverage < 50 ? '#ef4444' : '#10b981')
            .attr('opacity', 0.85)
            .transition()
            .duration(800)
            .attr('y', d => this.yScale(d.coverage))
            .attr('height', d => this.innerHeight - this.yScale(d.coverage));

        this.updateAxes();
    }

    drawStep3() {
        if (!this.g) return;
        this.g.selectAll('.bar, .region-label').remove();
        this.title.text('Fatalities (red) vs Coverage (gray)');

        this.xScale.domain(data.regions.map(d => d.name));
        
        const maxFatalities = d3.max(data.regions, d => d.fatalities);
        this.yScale.domain([0, maxFatalities * 1.1]);

        const barWidth = this.xScale.bandwidth() / 2.5;

        this.g.selectAll('.bar-fatalities')
            .data(data.regions)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', d => this.xScale(d.name))
            .attr('width', barWidth)
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .attr('fill', '#ef4444')
            .attr('opacity', 0.7)
            .transition()
            .duration(800)
            .attr('y', d => this.yScale(d.fatalities))
            .attr('height', d => this.innerHeight - this.yScale(d.fatalities));

        this.g.selectAll('.bar-coverage-scaled')
            .data(data.regions)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', d => this.xScale(d.name) + barWidth * 1.3)
            .attr('width', barWidth)
            .attr('y', this.innerHeight)
            .attr('height', 0)
            .attr('fill', '#6b7280')
            .attr('opacity', 0.5)
            .transition()
            .duration(800)
            .delay(200)
            .attr('y', d => this.yScale((d.coverage / 100) * maxFatalities))
            .attr('height', d => this.innerHeight - this.yScale((d.coverage / 100) * maxFatalities));

        this.updateAxes();
    }
*/
    updateAxes() {
        if (!this.xAxisG || !this.yAxisG) return;

        this.xAxisG
            .transition()
            .duration(800)
            .call(d3.axisBottom(this.xScale))
            .selectAll('text')
            .attr('fill', '#9ca3af')
            .style('font-size', '11px')
            .attr('transform', 'rotate(-15)')
            .style('text-anchor', 'end');

        this.yAxisG
            .transition()
            .duration(800)
            .call(d3.axisLeft(this.yScale).ticks(5))
            .selectAll('text')
            .attr('fill', '#9ca3af')
            .style('font-size', '11px');

        this.xAxisG.selectAll('line, path').attr('stroke', '#374151');
        this.yAxisG.selectAll('line, path').attr('stroke', '#374151');
    }
}