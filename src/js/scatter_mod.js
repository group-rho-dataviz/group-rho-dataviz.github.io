import ScrollyChart from './scrolly_chart.js';

export default class ScatterPlot extends ScrollyChart {
    // Scatter Plot showing relationship between number of mentions in news articles
    // and number of fatalities in a given country for a given year.
    constructor(svgId, data, tooltip = null) {
        super(svgId, data, tooltip);
        
        this.title.text("Mentions vs Fatalities");
    }

    init() {
        super.init();

        // Countries to highlight
        this.specialCountries = new Set(['Ukraine', 'India', 'Pakistan', 'Afghanistan', 'Palestine', 'United States', 'Russia', 'Israel']);

        const setup = (data) => {
            this.margin = { 
                top: 60,  
                right: 40,
                bottom: 100,
                left: 50 
            };

            this.innerWidth = this.width - this.margin.left - this.margin.right;
            this.innerHeight = this.height - this.margin.top - this.margin.bottom;

            // Year Selector - dropdown
            this.year = 2025; // default year
            const years = Array.from(new Set(data.map(d => d.YEAR))).sort();
            const container = this.svg.node()?.parentElement;
            if (container) {
                // append the year selector inside the SVG at the bottom using a foreignObject
                const selectorWidth = 220;
                d3.select(this.svg.node()).selectAll('#year-selector-fo').remove();
                const fo = d3.select(this.svg.node())
                    .append('foreignObject')
                    .attr('id', 'year-selector-fo')
                    .attr('width', selectorWidth)
                    .attr('height', 40)
                    .attr('x', (this.width - selectorWidth) / 2)
                    .attr('y', this.height - this.margin.bottom / 2)
                    .style('overflow', 'visible');

                const foDiv = fo.append('xhtml:div')
                    .style('width', selectorWidth + 'px')
                    .style('height', '100%')
                    .style('display', 'flex')
                    .style('align-items', 'center')
                    .style('justify-content', 'center');

                const yearSelector = foDiv.append('select')
                    .attr('id', 'year-selector')
                    .style('margin-top', '5px')
                    .on('change', (event) => {
                        this.selectYear(+event.target.value);
                    });

                yearSelector.selectAll('option')
                    .data(years)
                    .enter()
                    .append('option')
                    .attr('value', d => d)
                    .property('selected', d => d === this.year)
                    .text(d => d);

                // Centering and styling
                yearSelector.style('background-color', '#5a6c7d')
                    .style('color', '#f3f4f6')
                    .style('font-size', '14px')
                    .style('font-weight', '500')
                    .style('border', '1px solid #374151')
                    .style('border-radius', '4px')
                    .style('padding', '4px 8px')
                    .on('mouseover', function() {
                        d3.select(this).attr('fill', '#4a5c6d');
                    })
                    .on('mouseout', function() {
                        d3.select(this).attr('fill', '#5a6c7d');
                    });

                yearSelector.selectAll('option')
                    .style('background-color', '#5a6c7d')
                    .style('color', '#f3f4f6')
                    .style('font-size', '14px')
                    .style('font-weight', '500')
                    .on('mouseover', function() {
                        d3.select(this).attr('fill', '#4a5c6d');
                    })
                    .on('mouseout', function() {
                        d3.select(this).attr('fill', '#5a6c7d');
                    });
            }
        };

        if (this.data && typeof this.data.then === 'function') {
            this.data.then(data => setup(data));
        } else {
            setup(this.data || []);
        }
    }

    selectYear(year) {
        this.year = year;
        this.draw();
    }

    processDataByYear(data, year) {
        return data.filter(d => d.YEAR === year);
    }

    draw(showLowFatalities = true) {
        if (!this.g) return;
        this.title.text("Mentions vs Fatalities");
        this.data.then(data => {
            // Get data for the selected year
            let yearData = this.processDataByYear(data, this.year);
            
            // Filter out low fatalities if requested
            if (!showLowFatalities) {
                yearData = yearData.filter(d => d.FATALITIES >= 10);
            }

            // Set up scales
            const xMax = d3.max(yearData, d => d.MENTIONS) || 10;
            this.xScale = d3.scaleSymlog()
                .clamp(true)
                .range([0, this.innerWidth])
                .domain([1, xMax]);

            const yMax = d3.max(yearData, d => d.FATALITIES) || 1;
            this.yScale = d3.scaleSymlog()
                .clamp(true)
                .range([this.innerHeight, 0])
                .domain([1, yMax]);

            // compute tick values at powers of ten
            const xMaxPow = Math.max(0, Math.ceil(Math.log10(xMax)));
            const xTickValues = [];
            for (let p = 0; p < xMaxPow; p++) {
                xTickValues.push(Math.pow(10, p));
            }
            xTickValues[xTickValues.length-1] = xMax;

            const yMaxPow = Math.max(0, Math.ceil(Math.log10(yMax)));
            const yTickValues = [];
            for (let p = 0; p <= yMaxPow; p++) {
                yTickValues.push(Math.pow(10, p));
            }
            yTickValues[yTickValues.length-1] = yMax;

            this.svg.selectAll('g').remove();
            this.g = this.svg.append('g')
                .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

            // x-axis
            const xAxis = d3.axisBottom(this.xScale)
                .tickValues(xTickValues)
                .tickFormat(d3.format(".0s"));
            this.xAxisG = this.g.append('g')
                .attr('transform', `translate(0,${this.innerHeight})`)
                .call(xAxis);

            // y-axis
            const yAxis = d3.axisLeft(this.yScale)
                .tickValues(yTickValues)
                .tickFormat(d3.format(".0s"));

            this.yAxisG = this.g.append('g')
                .call(yAxis);

            // Axis labels
            this.svg.append('text')
                .attr('class', 'x')
                .attr('x', this.margin.left + this.innerWidth / 2)
                .attr('y', this.height - this.margin.bottom / 1.7)
                .attr('text-anchor', 'middle')
                .attr('fill', '#9ca3af')
                .style('font-family', 'Inter, sans-serif')
                .style('font-size', Math.min(this.width / 25, 16) + 'px')
                .style('font-weight', '500')
                .text('Number of Mentions');

            this.svg.append('text')
                .attr('class', 'y')
                .attr('x', -(this.margin.top + this.innerHeight / 2))
                .attr('y', this.margin.left / 3)
                .attr('transform', 'rotate(-90)')
                .attr('text-anchor', 'middle')
                .attr('fill', '#9ca3af')
                .style('font-family', 'Inter, sans-serif')
                .style('font-size', Math.min(this.width / 25, 16) + 'px')
                .style('font-weight', '500')
                .text('Number of Fatalities');
            
            // Separate data into gray and special countries
            const grayData = yearData.filter(d => !this.specialCountries.has(d.COUNTRY));
            const specialData = yearData.filter(d => this.specialCountries.has(d.COUNTRY));
            
            // Sort special countries for staggered appearance (high to low fatalities)
            specialData.sort((a, b) => b.FATALITIES - a.FATALITIES);
            
            const isMobile = this.width < 640;
            const pointRadius = isMobile ? 4 : 6;
            const specialRadius = isMobile ? 6 : 8;
            
            // Animation timings
            const grayPointDelay = 15; // ms between each gray point
            const grayDuration = 400; // duration for each gray point
            const specialPointDelay = 100; // ms between special points
            const specialDuration = 500;
            const totalGrayTime = grayData.length * grayPointDelay;
            const totalSpecialTime = specialData.length * specialPointDelay;
            
            // Draw gray points with staggered animation
            this.g.selectAll('.scatter-point-gray')
                .data(grayData)
                .enter()
                .append('circle')
                    .attr('class', 'scatter-point scatter-point-gray')
                    .attr('cx', d => this.xScale(d.MENTIONS))
                    .attr('cy', d => this.yScale(d.FATALITIES))
                    .attr('r', 0)
                    .attr('fill', 'lightgray')
                    .attr('opacity', 0)
                .transition()
                    .delay((d, i) => i * grayPointDelay)
                    .duration(grayDuration)
                    .ease(d3.easeBackOut.overshoot(1.2))
                    .attr('r', pointRadius)
                    .attr('opacity', 0.75);
            
            // Draw special (red) points after gray points with staggered animation
            const specialPoints = this.g.selectAll('.scatter-point-special')
                .data(specialData)
                .enter()
                .append('circle')
                    .attr('class', 'scatter-point scatter-point-special')
                    .attr('cx', d => this.xScale(d.MENTIONS))
                    .attr('cy', d => this.yScale(d.FATALITIES))
                    .attr('r', 0)
                    .attr('fill', '#ff4d4d')
                    .attr('opacity', 0);
            
            specialPoints
                .transition()
                    .delay((d, i) => totalGrayTime + i * specialPointDelay)
                    .duration(specialDuration)
                    .ease(d3.easeBackOut.overshoot(1.5))
                    .attr('r', specialRadius)
                    .attr('opacity', 1);
            
            // Add labels for special countries after their points appear
            specialData.forEach((d, i) => {
                const delay = totalGrayTime + i * specialPointDelay + specialDuration;
                
                setTimeout(() => {
                    this.g.append('text')
                        .attr('class', 'point-label')
                        .attr('x', this.xScale(d.MENTIONS))
                        .attr('y', i % 2 === 1 
                            ? this.yScale(d.FATALITIES) - 10 
                            : this.yScale(d.FATALITIES) + 15)
                        .attr('text-anchor', 'middle')
                        .attr('font-size', isMobile ? '10px' : '12px')
                        .attr('font-weight', '600')
                        .attr('fill', '#f3f4f6')
                        .attr('opacity', 0)
                        .text(d.COUNTRY)
                        .transition()
                        .duration(300)
                        .attr('opacity', 1);
                }, delay);
            });
            
            // Draw annotation for 2025 after all points and labels
            if (this.year === 2025) {
                const annotationDelay = totalGrayTime + totalSpecialTime + specialDuration + 200;
                
                setTimeout(() => {
                    this.drawAnnotation(yearData, isMobile);
                }, annotationDelay);
            }

            // Add interaction handlers to all points
            this.g.selectAll('.scatter-point')
                .on('mouseover', (event, d) => {
                    this.g.selectAll('.scatter-point')
                        .attr('opacity', p => (p === d ? 0.9 : 0.1));
                    this.g.selectAll('.point-label').remove();
                    
                    if (this.tooltip) {
                        this.tooltip
                            .style('opacity', 1)
                            .html(`<strong>Country:</strong> ${d.COUNTRY}<br><strong>Mentions:</strong> ${d.MENTIONS}<br><strong>Fatalities:</strong> ${d.FATALITIES}`)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px');
                    }
                })
                .on('mousemove', (event) => {
                    this.positionTooltip(event);
                })
                .on('mouseout', () => {
                    this.g.selectAll('.scatter-point-gray')
                        .attr('opacity', 0.75);
                    this.g.selectAll('.scatter-point-special')
                        .attr('opacity', 1);
                    this.g.selectAll('.point-label').remove();
                    this.drawSpecialCountries();
                    
                    if (this.tooltip) {
                        this.tooltip.style('opacity', 0);
                    }
                });
        });
    }

    drawAnnotation(yearData, isMobile) {
        // Countries to highlight
        const highlightCountries = new Set([
            'Central African Republic', 'Cameroon', 'Niger', 'Kenya', 'Yemen', 
            'Haiti', 'South Sudan', 'Ecuador', 'Mali', 'Burkina Faso', 
            'Ethiopia', 'Somalia', 'Myanmar', 'Sudan'
        ]);
        
        // Get the points to enclose
        const pointsToEnclose = yearData
            .filter(d => highlightCountries.has(d.COUNTRY))
            .map(d => ({
                x: this.xScale(d.MENTIONS),
                y: this.yScale(d.FATALITIES),
                country: d.COUNTRY
            }));
        
        if (pointsToEnclose.length === 0) return;
        
        // Create annotation group
        const annotationGroup = this.g.append('g')
            .attr('class', 'annotation-layer')
            .attr('opacity', 0);
        
        // Compute convex hull for the blob shape
        const padding = isMobile ? 10 : 20;
        const paddedPoints = pointsToEnclose.map(p => [p.x, p.y]);
        
        // Compute hull
        const hull = d3.polygonHull(paddedPoints);
        
        if (!hull) return;
        
        // Expand hull by padding
        const centroid = d3.polygonCentroid(hull);
        const expandedHull = hull.map(point => {
            const dx = point[0] - centroid[0];
            const dy = point[1] - centroid[1];
            const dist = Math.sqrt(dx * dx + dy * dy);
            const scale = (dist + padding) / dist;
            return [
                centroid[0] + dx * scale,
                centroid[1] + dy * scale
            ];
        });
        
        // Create smooth blob using Catmull-Rom spline with closed curve
        const line = d3.line()
            .curve(d3.curveCatmullRomClosed.alpha(0.5));
        
        const blobPath = line(expandedHull);
        
        // Dashed border (no fill)
        annotationGroup.append('path')
            .attr('d', blobPath)
            .attr('fill', 'none')
            .attr('stroke', '#f1c503')
            .attr('stroke-width', isMobile ? 2.5 : 3)
            .attr('stroke-dasharray', '8,5')
            .attr('opacity', 0.9);
        
        // Position label based on device
        const bboxPoints = expandedHull;
        const minX = d3.min(bboxPoints, p => p[0]);
        const maxX = d3.max(bboxPoints, p => p[0]);
        const minY = d3.min(bboxPoints, p => p[1]);
        const maxY = d3.max(bboxPoints, p => p[1]);
        
        let labelX, labelY;
        
        if (isMobile) {
            // Position label above the blob on mobile
            labelX = (minX + maxX) / 2;
            labelY = minY - 35;
        } else {
            // Position label to the left on desktop
            labelX = minX - 15;
            labelY = minY + 20;
        }
        
        // Create elegant multi-line label
        const labelGroup = annotationGroup.append('g');
        
        const labelText = labelGroup.append('text')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('text-anchor', isMobile ? 'middle' : 'end')
            .attr('font-family', 'Inter, sans-serif')
            .attr('font-size', isMobile ? '12px' : '15px')
            .attr('font-weight', '600')
            .attr('fill', '#f1c503')
            .attr('letter-spacing', '0.3px');
        
        labelText.append('tspan')
            .attr('x', labelX)
            .attr('dy', '0em')
            .attr('dx', isMobile ? -15 : 0)
            .text('High Fatalities');
        
        labelText.append('tspan')
            .attr('x', labelX)
            .attr('dy', '1.3em')
            .attr('dx', isMobile ? -15 : 0)
            .text('Low Coverage');
        
        // Add connector with arrow only on desktop
        if (!isMobile) {
            const lineStartX = labelX + 5;
            const lineStartY = labelY + 10;
            const lineEndX = minX + 15;
            const lineEndY = minY + 15;
            
            const controlX = lineStartX + (lineEndX - lineStartX) * 0.6;
            const controlY = lineStartY;
            
            annotationGroup.append('path')
                .attr('d', `M ${lineStartX},${lineStartY} Q ${controlX},${controlY} ${lineEndX},${lineEndY}`)
                .attr('stroke', '#f1c503')
                .attr('stroke-width', 2)
                .attr('fill', 'none')
                .attr('opacity', 0.7);
            
            // Add arrowhead
            annotationGroup.append('polygon')
                .attr('points', `${lineEndX},${lineEndY} ${lineEndX-6},${lineEndY-6} ${lineEndX-4},${lineEndY+2}`)
                .attr('fill', '#f1c503')
                .attr('opacity', 0.7);
        }
        
        // Fade in the entire annotation
        annotationGroup
            .transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr('opacity', 1);
    }

    drawSpecialCountries() {
        const isMobile = this.width < 640;
        const specialRadius = isMobile ? 6 : 8;
        
        // Highlight special countries without animation (for hover restore)
        this.g.selectAll('.scatter-point')
            .filter(d => this.specialCountries.has(d.COUNTRY))
            .attr('fill', '#ff4d4d')
            .attr('opacity', 1)
            .attr('r', specialRadius)
            .raise()
            .each((d, i, nodes) => {
                const point = d3.select(nodes[i]);
                this.g.append('text')
                    .attr('class', 'point-label')
                    .attr('x', point.attr('cx'))
                    .attr('y', i % 2 === 1 ? point.attr('cy') - 10 : +point.attr('cy') + 15)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', isMobile ? '10px' : '12px')
                    .attr('font-weight', '600')
                    .attr('fill', '#f3f4f6')
                    .text(d.COUNTRY);
            });
    }
}