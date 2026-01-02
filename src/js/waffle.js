import ScrollyChart from './scrolly_chart.js';

export default class WaffleChart extends ScrollyChart {
    constructor(svgId, data) {
        super(svgId, data);
    }

    draw() {
        if (!this.g) return;

        const totalUnits = 100;
        const unitsPerRow = 10;
        const unitSize = Math.min(this.innerWidth / unitsPerRow, this.innerHeight / (totalUnits / unitsPerRow));
        const unitPadding = 2;
        const colors = d3.schemeCategory10;

        const unitsData = [];
        this.data.forEach((d, i) => {
            for (let j = 0; j < d.value; j++) {
                unitsData.push({ category: d.category, color: colors[i % colors.length] });
            }
        });

        this.g.selectAll('.waffle-unit')
            .data(unitsData)
            .join('rect')
            .attr('class', 'waffle-unit')
            .attr('width', unitSize - unitPadding)
            .attr('height', unitSize - unitPadding)
            .attr('x', (d, i) => (i % unitsPerRow) * unitSize)
            .attr('y', (d, i) => Math.floor(i / unitsPerRow) * unitSize)
            .attr('fill', d => d.color)
            .attr('opacity', 0.85);
    }
}