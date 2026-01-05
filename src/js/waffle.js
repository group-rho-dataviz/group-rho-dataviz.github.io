import ScrollyChart from './scrolly_chart.js';

export default class WaffleChart extends ScrollyChart {
    constructor(svgId, data, tooltip, colors=d3.schemeTableau10) {
        // data is expected to be a Promise that resolves to an array of objects
        super(svgId, data, tooltip);
        this.colors = colors;

        // Title specific to WaffleChart
        this.title.text("Percentage of Countries in Conflict");
    }

    draw() {
        if (!this.g) return;

        this.g.selectAll('*').remove();
        this.title.text("Percentage of Countries in Conflict");

        const totalUnits = 100;
        const unitsPerRow = 10;
        const unitSize = Math.min(this.innerWidth / unitsPerRow, this.innerHeight / (totalUnits / unitsPerRow));
        const unitPadding = 2;

        const unitsData = [];
        this.data.then(data => {
            let unitIndex = 0;
            data.forEach((d, i) => {
                const numUnits = Math.round((d.value / d3.sum(data, dd => dd.value)) * totalUnits);
                for (let j = 0; j < numUnits; j++) {
                    unitsData.push({ category: d.category, color: this.colors[i % this.colors.length] });
                    unitIndex++;
                }
            });

            this.renderUnits(unitsData, unitSize, unitPadding, unitsPerRow);
        });

        // resize the SVG to fit the waffle chart
        const chartWidth = unitSize * unitsPerRow + this.margin.left + this.margin.right;
        const chartHeight = unitSize * (totalUnits / unitsPerRow) + this.margin.top + this.margin.bottom;
        this.svg.attr('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
    }

    renderUnits(unitsData, unitSize, unitPadding, unitsPerRow) {
        if (!this.g) return;

        this.g.selectAll('.waffle-unit')
            .data(unitsData)
            .join('rect')
            .attr('class', 'waffle-unit')
            .attr('width', unitSize - unitPadding)
            .attr('height', unitSize - unitPadding)
            .attr('x', (d, i) => (i % unitsPerRow) * unitSize)
            .attr('y', (d, i) => Math.floor(i / unitsPerRow) * unitSize)
            .attr('rx', unitSize * 0.1)
            .attr('ry', unitSize * 0.1)
            .attr('fill', d => d.color)
            .attr('opacity', 0.85)
            .on('mouseover', (event, d) => {
                const count = unitsData.filter(u => u.category === d.category).length;
                const percent = unitsData.length ? ((count / unitsData.length) * 100).toFixed(1) : '0.0';
                this.tooltip
                    .style('opacity', 1)
                    .html(
                        `<div style="display:flex;align-items:center;gap:8px;">
                            <div style="width:12px;height:12px;background:${d.color};border-radius:2px;flex:0 0 12px;"></div>
                            <div style="line-height:1;">
                                <strong>${d.category == 'in_conflict' ? 'In Conflict' : 'Not in Conflict'}</strong><br/>
                                <span style="font-size:12px;color:#ddd;">${percent}%</span>
                            </div>
                        </div>`
                    );
            })
            .on('mousemove', (event) => {
                this.tooltip
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => {
                this.tooltip.style('opacity', 0);
            })
            .on('scroll', () => {
                this.tooltip.style('opacity', 0);
            });
    }
}