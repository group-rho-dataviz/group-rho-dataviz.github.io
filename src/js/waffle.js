import ScrollyChart from './scrolly_chart.js';

export default class WaffleChart extends ScrollyChart {
    constructor(svgId, data, colors=d3.schemeTableau10) {
        // data is expected to be a Promise that resolves to an array of objects
        super(svgId, data);
        this.colors = colors;
    }

    draw() {
        if (!this.g) return;

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
        const chartWidth = unitSize * unitsPerRow;
        const chartHeight = unitSize * (totalUnits / unitsPerRow);
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
            .attr('rx', 2)
            .attr('ry', 2)
            .attr('fill', d => d.color)
            .attr('opacity', 0.85);
    }
}