import ScrollyChart from './scrolly_chart.js';

export default class ScatterPlot extends ScrollyChart {
    // Scatter Plot showing relationship between number of mentions in news articles
    // and number of fatalities in a given country for a given year.
    constructor(svgId, data, tooltip = null) {
        super(svgId, data, tooltip);

        // Countries to highlight + colors (map country -> color)
        this.specialCountries = new Map([
            ['Ukraine', '#ff4d4d'],
            ['India', '#ff4d4d'],
            ['Pakistan', '#ff4d4d'],
            ['Afghanistan', '#ff4d4d'],
            ['Palestine', '#ff4d4d'],
            ['United States', '#ff4d4d'],
            ['Russia', '#ff4d4d'],
            ['Israel', '#ff4d4d'],
            ['Myanmar', '#f1c503'],
            ['Burkina Faso', '#f1c503'],
        ]);
        
        this.title.text("Mentions vs Fatalities");
        this.selectedCountry = null; // Track clicked country
    }

    init() {
        super.init();

        // Fixed year to 2025
        this.year = 2025;

        const setup = (data) => {
            this.margin = { 
                top: 60,  
                right: 40,
                bottom: 60,
                left: 50 
            };

            this.innerWidth = this.width - this.margin.left - this.margin.right;
            this.innerHeight = this.height - this.margin.top - this.margin.bottom;
        };

        if (this.data && typeof this.data.then === 'function') {
            this.data.then(data => setup(data));
        } else {
            setup(this.data || []);
        }
    }

    selectYear(year) {
        // Year is now fixed to 2025
        return;
    }

    processDataByYear(data, year) {
        return data.filter(d => d.YEAR === year);
    }

    draw(showLowFatalities = true) {
        // Clear previous drawings
        this.g.selectAll("*").remove();

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
                .attr('y', this.height - this.margin.bottom / 3)
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
            const grayPointDelay = 5; // ms between each gray point
            const grayDuration = 300; // duration for each gray point
            const specialPointDelay = 50; // ms between special points
            const specialDuration = 100;
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
            console.log("Drawing countries:", specialData);
            const specialPoints = this.g.selectAll('.scatter-point-special')
                .data(specialData)
                .enter()
                .append('circle')
                    .attr('class', 'scatter-point scatter-point-special')
                    .attr('cx', d => this.xScale(d.MENTIONS))
                    .attr('cy', d => this.yScale(d.FATALITIES))
                    .attr('r', 0)
                    .attr('fill', d => {
                        return this.specialCountries.get(d.COUNTRY) || '#ff4d4d';
                    })
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
                        .attr('pointer-events', 'none')
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
                .style('cursor', 'pointer')
                .on('click', (event, d) => {
                    event.stopPropagation();
                    this.toggleCountryTrajectory(d, data);
                })
                .on('mouseover', (event, d) => {
                    // Don't dim points if trajectory is showing
                    if (!this.selectedCountry) {
                        this.g.selectAll('.scatter-point')
                            .attr('opacity', p => (p === d ? 0.9 : 0.1));
                        this.g.selectAll('.point-label').remove();
                    }
                    
                    if (this.tooltip) {
                        this.tooltip
                            .style('opacity', 1)
                            .html(`<strong>Country:</strong> ${d.COUNTRY}<br><strong>Mentions:</strong> ${d.MENTIONS}<br><strong>Fatalities:</strong> ${d.FATALITIES}<br><em>Click to see trajectory</em>`)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px');
                    }
                })
                .on('mousemove', (event) => {
                    this.positionTooltip(event);
                })
                .on('mouseout', () => {
                    if (!this.selectedCountry) {
                        this.g.selectAll('.scatter-point-gray')
                            .attr('opacity', 0.75);
                        this.g.selectAll('.scatter-point-special')
                            .attr('opacity', 1);
                        this.g.selectAll('.point-label').remove();
                        this.drawSpecialCountries();
                    }
                    
                    if (this.tooltip) {
                        this.tooltip.style('opacity', 0);
                    }
                });

            // Collapse trajectory when clicking elsewhere on the SVG (points stopPropagation so won't trigger)
            this.svg.on('click', () => {
                this.collapseTrajectory();
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
            .attr('fill', d => {
                return this.specialCountries.get(d.COUNTRY) || '#ff4d4d';
            })
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
                    .attr('pointer-events', 'none')
                    .text(d.COUNTRY);
            });
    }

    toggleCountryTrajectory(clickedPoint, allData) {
        const isMobile = this.width < 640;
        
        // If clicking the same country, collapse the trajectory
        if (this.selectedCountry === clickedPoint.COUNTRY) {
            this.collapseTrajectory();
            return;
        }
        
        // If another country was selected, collapse it first
        if (this.selectedCountry) {
            this.collapseTrajectory(false);
        }
        
        this.selectedCountry = clickedPoint.COUNTRY;
        
        // Get historical data for this country (2015-2025)
        const countryHistory = allData
            .filter(d => d.COUNTRY === clickedPoint.COUNTRY && d.YEAR >= 2015 && d.YEAR <= 2025)
            .sort((a, b) => a.YEAR - b.YEAR);
        
        if (countryHistory.length < 2) {
            this.selectedCountry = null;
            return;
        }
        
        // Dim all other points
        this.g.selectAll('.scatter-point')
            .transition()
            .duration(300)
            .attr('opacity', d => d.COUNTRY === clickedPoint.COUNTRY ? 1 : 0.15);
        
        // Remove special country labels
        this.g.selectAll('.point-label').remove();
        
        // Create trajectory group
        const trajectoryGroup = this.g.append('g')
            .attr('class', 'trajectory-group');
        
        // Create gradient for the line
        const gradientId = `gradient-${clickedPoint.COUNTRY.replace(/\s+/g, '-')}`;
        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', this.xScale(countryHistory[0].MENTIONS))
            .attr('y1', this.yScale(countryHistory[0].FATALITIES))
            .attr('x2', this.xScale(countryHistory[countryHistory.length - 1].MENTIONS))
            .attr('y2', this.yScale(countryHistory[countryHistory.length - 1].FATALITIES));
        
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#60a5fa')
            .attr('stop-opacity', 0.8);
        
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#a78bfa')
            .attr('stop-opacity', 1);
        
        // Draw the trajectory line with animation
        const lineGenerator = d3.line()
            .curve(d3.curveCatmullRom.alpha(0.5))
            .x(d => this.xScale(d.MENTIONS))
            .y(d => this.yScale(d.FATALITIES));
        
        const path = trajectoryGroup.append('path')
            .datum(countryHistory)
            .attr('class', 'trajectory-path')
            .attr('d', lineGenerator)
            .attr('fill', 'none')
            .attr('stroke', `url(#${gradientId})`)
            .attr('stroke-width', isMobile ? 3 : 4)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('opacity', 0);
        
        // Animate the line drawing
        const totalLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', totalLength + ' ' + totalLength)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(1500)
            .ease(d3.easeCubicInOut)
            .attr('stroke-dashoffset', 0)
            .attr('opacity', 1);
        
        // Add glow effect to the line
        trajectoryGroup.append('path')
            .datum(countryHistory)
            .attr('class', 'trajectory-glow')
            .attr('d', lineGenerator)
            .attr('fill', 'none')
            .attr('stroke', `url(#${gradientId})`)
            .attr('stroke-width', isMobile ? 8 : 12)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('opacity', 0)
            .attr('filter', 'blur(8px)')
            .attr('stroke-dasharray', totalLength + ' ' + totalLength)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(1500)
            .ease(d3.easeCubicInOut)
            .attr('stroke-dashoffset', 0)
            .attr('opacity', 0.3);
        
        // Add year markers and labels (show every 2-3 years to avoid clutter)
        const yearsToShow = isMobile 
            ? countryHistory.filter((d, i) => i % 3 === 0 || i === countryHistory.length - 1)
            : countryHistory.filter((d, i) => i % 2 === 0 || i === countryHistory.length - 1);
        
        yearsToShow.forEach((d, i) => {
            const delay = 1500 + i * 150;
            
            // Year marker circle
            const marker = trajectoryGroup.append('circle')
                .attr('class', 'trajectory-marker')
                .attr('cx', this.xScale(d.MENTIONS))
                .attr('cy', this.yScale(d.FATALITIES))
                .attr('r', 0)
                .attr('fill', d.YEAR === 2025 ? '#a78bfa' : '#60a5fa')
                .attr('stroke', '#1f2937')
                .attr('stroke-width', 2)
                .attr('opacity', 0)
                .on('mouseover', (event) => {
                    if (this.tooltip) {
                        this.tooltip.style('opacity', 1)
                            .html(`<strong>Country:</strong> ${d.COUNTRY}<br><strong>Year:</strong> ${d.YEAR}<br><strong>Mentions:</strong> ${d.MENTIONS}<br><strong>Fatalities:</strong> ${d.FATALITIES}`)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px');
                    }
                })
                .on('mousemove', (event) => {
                    this.positionTooltip(event);
                })
                .on('mouseout', () => {
                    if (this.tooltip) {
                        this.tooltip.style('opacity', 0);
                    }
                });
            
            marker.transition()
                .delay(delay)
                .duration(400)
                .ease(d3.easeBackOut.overshoot(1.5))
                .attr('r', isMobile ? 5 : 6)
                .attr('opacity', 1);
            
            // Year label with background
            const labelGroup = trajectoryGroup.append('g')
                .attr('class', 'trajectory-label-group')
                .attr('opacity', 0);
            
            const label = labelGroup.append('text')
                .attr('class', 'trajectory-label')
                .attr('x', this.xScale(d.MENTIONS))
                .attr('y', this.yScale(d.FATALITIES) - (isMobile ? 12 : 15))
                .attr('text-anchor', 'middle')
                .attr('font-size', isMobile ? '11px' : '13px')
                .attr('font-weight', '700')
                .attr('fill', d.YEAR === 2025 ? '#a78bfa' : '#60a5fa')
                .attr('paint-order', 'stroke')
                .attr('stroke', '#1f2937')
                .attr('stroke-width', 3)
                .text(d.YEAR);
            
            labelGroup.transition()
                .delay(delay + 200)
                .duration(400)
                .attr('opacity', 1);
        });
        
        // Add directional arrow at the end
        const lastPoint = countryHistory[countryHistory.length - 1];
        const secondLastPoint = countryHistory[countryHistory.length - 2];
        
        if (secondLastPoint) {
            const dx = this.xScale(lastPoint.MENTIONS) - this.xScale(secondLastPoint.MENTIONS);
            const dy = this.yScale(lastPoint.FATALITIES) - this.yScale(secondLastPoint.FATALITIES);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            const arrowSize = isMobile ? 10 : 12;
            trajectoryGroup.append('polygon')
                .attr('class', 'trajectory-arrow')
                .attr('points', `0,-${arrowSize/2} ${arrowSize},0 0,${arrowSize/2}`)
                .attr('transform', `translate(${this.xScale(lastPoint.MENTIONS)},${this.yScale(lastPoint.FATALITIES)}) rotate(${angle})`)
                .attr('fill', '#a78bfa')
                .attr('opacity', 0)
                .transition()
                .delay(2000)
                .duration(400)
                .attr('opacity', 1);
        }
        
        // Add title showing the country name
        const titleY = this.margin.top - 35;
        this.svg.append('text')
            .attr('class', 'trajectory-title')
            .attr('x', this.width / 2)
            .attr('y', titleY)
            .attr('dy', '2em')
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Inter, sans-serif')
            .attr('font-size', isMobile ? '14px' : '18px')
            .attr('font-weight', '700')
            .attr('fill', '#f3f4f6')
            .attr('opacity', 0)
            .text(`${clickedPoint.COUNTRY}: 2015-2025 Trajectory`)
            .transition()
            .duration(600)
            .attr('opacity', 1);
    }
    
    collapseTrajectory(animate = true) {
        if (!this.selectedCountry) return;
        
        const duration = animate ? 400 : 0;
        
        // Remove trajectory elements
        this.g.selectAll('.trajectory-group')
            .transition()
            .duration(duration)
            .attr('opacity', 0)
            .remove();
        
        this.svg.selectAll('.trajectory-title')
            .transition()
            .duration(duration)
            .attr('opacity', 0)
            .remove();
        
        this.svg.selectAll('defs').remove();
        
        // Restore point opacities
        this.g.selectAll('.scatter-point-gray')
            .transition()
            .duration(duration)
            .attr('opacity', 0.75);
        
        this.g.selectAll('.scatter-point-special')
            .transition()
            .duration(duration)
            .attr('opacity', 1);
        
        // Restore special country labels
        if (animate) {
            setTimeout(() => {
                this.drawSpecialCountries();
            }, duration);
        }
        
        this.selectedCountry = null;
    }
}