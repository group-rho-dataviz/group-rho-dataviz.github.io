import ScrollyChart from './scrolly_chart.js';

export default class WaffleChart extends ScrollyChart {
    constructor(svgId, data, tooltip) {
        // data is expected to be a Promise that resolves to an array of objects
        super(svgId, data, tooltip);
        this.colors = ['#505050', '#d22700'];
        this.colorsDetailed =  ['#505050', '#cfa08a', '#b8613c', '#8f2f1f'];
        this.selectedDetailed = false;

        // Title specific to WaffleChart
        this.title.text("Percentage of Countries in Conflict");
    }

    draw() {
        if (!this.g) return;

        const totalUnits = 100;
        const unitsPerRow = 10;
        const unitSize = Math.min(this.innerWidth / unitsPerRow, this.innerHeight / (totalUnits / unitsPerRow));
        const unitPadding = 2;

        const category_to_index = {
            'not_in_conflict': 0,
            'low': 1,
            'medium': 2,
            'high': 3,
            'in_conflict': 1
        };

        // ensure we have a CSS transition for waffle units so color/opacity changes animate
        if (!this._waffleStyleAdded) {
            this._waffleStyleAdded = true;
            const style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = `
            .waffle-unit {
                transition: fill 600ms ease, opacity 300ms ease;
                will-change: fill, opacity;
            }
            `;
            document.head.appendChild(style);
        }

        // mark whether we should animate this draw (used implicitly by CSS transitions when properties change)
        if (this._lastSelectedDetailed === undefined) this._lastSelectedDetailed = this.selectedDetailed;
        this._detailToggled = (this._lastSelectedDetailed !== this.selectedDetailed);
        this._lastSelectedDetailed = this.selectedDetailed;

        const unitsData = [];
        this.data.then(data => {
            data.forEach((d, i) => {
                const numUnits = Math.round((d.value / d3.sum(data, dd => dd.value)) * totalUnits);
                for (let j = 0; j < numUnits; j++) {
                    const absolute = this.selectedDetailed ? d.absolute : (d.category === 'not_in_conflict' ? d.absolute : d3.sum(data, dd => dd.category !== 'not_in_conflict' ? dd.absolute : 0));
                    const percent = absolute / d3.sum(data, dd => dd.absolute) * 100;
                    const category = this.selectedDetailed ? d.category : (d.category === 'not_in_conflict' ? 'not_in_conflict' : 'in_conflict');
                    const color = this.selectedDetailed ? this.colorsDetailed[category_to_index[category] % this.colorsDetailed.length] : this.colors[category_to_index[category] % this.colors.length];
                    if (i === 0 && j === 0 && !this._subtitleAdded) {
                        this._subtitleAdded = true;
                        // add subtitle centered in the SVG using percentage x
                        this.subtitle = this.svg.append('text')
                            .attr('class', 'subtitle')
                            .attr('x', '50%')
                            .attr('text-anchor', 'middle')
                            .attr('y', this.margin.top * 3/4)
                            .attr('fill', '#9ca3af')
                            .style('font-family', 'Inter, sans-serif')
                            .style('font-size', Math.max(this.width / 35, 8) + 'px')
                            .style('font-style', 'italic')
                            .text('Click to see details');

                        // toggle detail view on svg click and redraw
                        this.svg.on('click', () => {
                            this.selectedDetailed = !this.selectedDetailed;
                            this.draw();
                        });
                    }

                    unitsData.push({
                        category: category,
                        color: color,
                        absolute: absolute,
                        percent: percent.toFixed(1)
                    });
                }
            });

            this.renderUnits(unitsData, unitSize, unitPadding, unitsPerRow);
        });

        // resize the SVG to fit the waffle chart
        const chartWidth = unitSize * unitsPerRow + this.margin.left + this.margin.right;
        const chartHeight = unitSize * (totalUnits / unitsPerRow) + this.margin.top + this.margin.bottom;
        this.svg.attr('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
        this.width = chartWidth;
        this.height = chartHeight;
        this.title
            .attr('x', this.width / 2)
            .attr('y', this.margin.top / 2)
            .text("Percentage of Countries in Conflict");
    }

    renderUnits(unitsData, unitSize, unitPadding, unitsPerRow) {
        if (!this.g || !this.tooltip || unitSize <= 0) return;

        this.g.selectAll('.waffle-unit')
            .data(unitsData)
            .join('rect')
            .attr('class', 'waffle-unit')
            .attr('width', unitSize - unitPadding)
            .attr('height', unitSize - unitPadding)
            .attr('x', (d, i) => (unitsPerRow - 1 - i % unitsPerRow) * unitSize)
            .attr('y', (d, i) => Math.floor(i / unitsPerRow) * unitSize)
            .attr('rx', unitSize * 0.1)
            .attr('ry', unitSize * 0.1)
            .attr('fill', d => d.color)
            .attr('opacity', 0.85)
            .on('mouseover', (event, d) => {
                this.tooltip
                    .style('opacity', 1)
                    .html(
                        `<div style="display:flex;align-items:center;gap:8px;">
                            <div style="width:12px;height:12px;background:${d.color};border-radius:2px;flex:0 0 12px;"></div>
                            <div style="line-height:1;">
                                <strong>${
                                    d.category == 'low' ? 'Low Number of Fatalities' :
                                    d.category == 'medium' ? 'Medium Number of Fatalities' :
                                    d.category == 'high' ? 'High Number of Fatalities' :
                                    d.category == 'in_conflict' ? 'In Conflict' : 'Not in Conflict'
                                }</strong><br/>
                                <span style="font-size:12px;color:#ddd;">${d.percent}%</span><br/>
                                <span style="font-size:12px;color:#ddd;">${d.absolute} countries</span>
                            </div>
                        </div>`
                    );
            })
            .on('mousemove', (event) => {
                this.positionTooltip(event);
            })
            .on('mouseout', () => {
                this.tooltip.style('opacity', 0);
            })
            .on('scroll', () => {
                this.tooltip.style('opacity', 0);
            });
    }
}