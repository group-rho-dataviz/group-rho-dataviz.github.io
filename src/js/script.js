import WaffleChart from "./waffle.js";
import BarChart from "./bar.js";
import LineScatterChart from "./line_scatter.js";
import Choropleth from "./choropleth.js";
//import Choropleth from "./choropleth_flags.js";


// ===== TOOLTIP =====
// Add tooltip
let tooltip = d3.select('body').append('div')
    .attr('class', 'chart-tooltip')
    .style('position', 'absolute')
    .style('top', '0px')
    .style('left', '0px')
    .style('padding', '8px 12px')
    .style('background', 'rgba(0, 0, 0, 0.9)')
    .style('color', 'white')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('z-index', 10);

// ===== DATA =====
const waffleData = d3.csv('data/processed/waffle_chart_data.csv', d3.autoType);
const waffleDataDetailed = d3.csv('data/processed/waffle_chart_data_detailed.csv', d3.autoType);
const barChartData = d3.csv('data/processed/bar_chart.csv', d3.autoType);
const scatterData = d3.csv('data/processed/scatter_plot.csv', d3.autoType);
const choroplethData = d3.csv('data/processed/top_three_media_mentions_by_country_week_material_conflict.csv', d3.autoType);

// ===== JSON =====
const geoData = await d3.json('src/json/world.json');

// ===== INITIALIZE =====
const waffleColors = ['lightgray', '#ff4d4d'];
const waffleColorsDetailed = ['#393939', '#cfa08a', '#b8613c', '#8f2f1f'];

// Desktop charts - store chart constructors, not instances
let desktopChartConfigs = [];
let currentDesktopChart = null;
let currentStepIndex = -1;
let isTransitioning = false;

// I want to set the footnote text dynamically. 
// Each chart will have its own footnote. Many are shared. Each footnote also has the href link to the data source.
let desktopFootnote = document.getElementById('desktop-footnote');
const footnotes = [
    'Data source: <a href="https://acleddata.com/" target="_blank" rel="noopener noreferrer" class="underline">ACLED</a>',
    'Data source: <a href="https://acleddata.com/" target="_blank" rel="noopener noreferrer" class="underline">ACLED</a>',
    'Data source: <a href="https://acleddata.com/" target="_blank" rel="noopener noreferrer" class="underline">ACLED</a>',
    'Data sources: <a href="https://acleddata.com/" target="_blank" rel="noopener noreferrer" class="underline">ACLED</a> and <a href="https://gdeltproject.org/" target="_blank" rel="noopener noreferrer" class="underline">GDELT</a>',
    'Data source: <a href="https://gdeltproject.org/" target="_blank" rel="noopener noreferrer" class="underline">GDELT</a>'
];

// Update footnote when switching charts
function updateDesktopFootnote(stepIndex) {
    if (stepIndex >= 0 && stepIndex < footnotes.length) {
        desktopFootnote.innerHTML = footnotes[stepIndex];
    } else {
        desktopFootnote.innerHTML = '';
    }
}

// Call initially
updateDesktopFootnote(0);

// Mobile charts - one per step, each with its own SVG
const mobileCharts = [
    new WaffleChart('mobile-chart-0', waffleData, tooltip, waffleColors),
    new WaffleChart('mobile-chart-1', waffleDataDetailed, tooltip, waffleColorsDetailed),
    new BarChart('mobile-chart-2', barChartData, tooltip, true),
    new LineScatterChart('mobile-chart-3', scatterData, tooltip),
    new Choropleth('mobile-chart-4', choroplethData, tooltip, geoData)
];

// Store chart configurations instead of creating all instances at once
setTimeout(() => {
    desktopChartConfigs = [
        { type: WaffleChart, params: ['desktop-chart', waffleData, tooltip, waffleColors] },
        { type: WaffleChart, params: ['desktop-chart', waffleDataDetailed, tooltip, waffleColorsDetailed] },
        { type: BarChart, params: ['desktop-chart', barChartData, tooltip, false] },
        { type: LineScatterChart, params: ['desktop-chart', scatterData, tooltip] },
        { type: Choropleth, params: ['desktop-chart', choroplethData, tooltip, geoData] }
    ];
    
    // Initialize only the first chart
    const svg = d3.select('#desktop-chart');
    svg.selectAll('*').remove(); // Clear any existing content
    
    // Create first chart instance
    const firstConfig = desktopChartConfigs[0];
    currentDesktopChart = new firstConfig.type(...firstConfig.params);
    currentStepIndex = 0;
    
    // Initial render
    setTimeout(() => {
        if (currentDesktopChart && currentDesktopChart.g) {
            currentDesktopChart.draw();
        }
    }, 50);
}, 100);

// Function to create a chart instance from config
function createChartInstance(stepIndex) {
    if (!desktopChartConfigs.length || stepIndex < 0 || stepIndex >= desktopChartConfigs.length) {
        return null;
    }
    
    const config = desktopChartConfigs[stepIndex];
    return new config.type(...config.params);
}

// Function to switch charts (with or without animation)
function switchToChart(newStepIndex, animate = true) {
    if (!desktopChartConfigs.length || newStepIndex < 0 || newStepIndex >= desktopChartConfigs.length) return;
    
    // If transitioning, cancel and jump directly
    if (isTransitioning) {
        isTransitioning = false;
        const svg = d3.select('#desktop-chart');
        svg.interrupt(); // Stop any ongoing transitions
    }
    
    // If same chart, do nothing
    if (currentStepIndex === newStepIndex) {
        return;
    }
    
    // Update footnote
    updateDesktopFootnote(newStepIndex);
    
    // Calculate distance to determine if we should animate
    const stepDistance = Math.abs(newStepIndex - currentStepIndex);
    const shouldAnimate = animate && stepDistance === 1; // Only animate for adjacent steps
    
    const svg = d3.select('#desktop-chart');
    
    if (shouldAnimate) {
        // Smooth transition for adjacent steps
        isTransitioning = true;
        
        svg.transition()
            .duration(200)
            .style('opacity', 0)
            .on('end', () => {
                // CRITICAL: Completely clear the SVG and all nested elements
                svg.selectAll('*').remove();
                svg.style('opacity', 0);
                
                // Destroy old chart and create new one
                currentDesktopChart = createChartInstance(newStepIndex);
                currentStepIndex = newStepIndex;
                
                // Draw new chart
                if (currentDesktopChart && currentDesktopChart.g) {
                    currentDesktopChart.draw();
                    
                    // Fade in
                    svg.transition()
                        .duration(300)
                        .style('opacity', 1)
                        .on('end', () => {
                            isTransitioning = false;
                        });
                } else {
                    svg.style('opacity', 1);
                    isTransitioning = false;
                }
            });
    } else {
        // Instant switch for non-adjacent steps or when animation disabled
        isTransitioning = false;
        
        // CRITICAL: Completely clear the SVG
        svg.interrupt();
        svg.selectAll('*').remove();
        svg.style('opacity', 1);
        
        // Destroy old chart and create new one
        currentDesktopChart = createChartInstance(newStepIndex);
        currentStepIndex = newStepIndex;
        
        // Draw immediately
        if (currentDesktopChart && currentDesktopChart.g) {
            currentDesktopChart.draw();
        }
    }
}

// ===== SCROLL OBSERVER =====
let currentStep = -1;

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const stepEl = entry.target;
        const stepContent = stepEl.querySelector('.step-content');
        const mobileChartWrapper = stepEl.querySelector('.mobile-chart-wrapper');
        
        if (entry.isIntersecting) {
            stepContent?.classList.add('is-active');
            mobileChartWrapper?.classList.add('is-active');
            
            const step = parseInt(stepEl.dataset.step);
            if (step !== currentStep && desktopChartConfigs.length > 0) {
                currentStep = step;
                switchToChart(step, true);
            }
        } else {
            stepContent?.classList.remove('is-active');
        }
    });
}, {
    root: null,
    rootMargin: '-40% 0px -40% 0px',
    threshold: 0
});

document.querySelectorAll('[data-step]').forEach(el => observer.observe(el));

// ===== INITIAL MOBILE RENDER =====
setTimeout(() => {
    // Mobile - render all charts immediately
    mobileCharts.forEach(chart => {
        if (chart && chart.g) {
            chart.draw();
        }
    });
}, 500);

// ===== RESIZE =====
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Reinitialize and redraw current desktop chart
        if (currentDesktopChart && desktopChartConfigs.length > 0) {
            isTransitioning = false;
            
            const svg = d3.select('#desktop-chart');
            svg.interrupt();
            svg.selectAll('*').remove(); // Clear everything
            svg.style('opacity', 1);
            
            currentDesktopChart.init();
            if (currentDesktopChart.g) {
                currentDesktopChart.draw();
            }
        }
        
        // Reinitialize and redraw all mobile charts
        mobileCharts.forEach(chart => {
            if (chart) {
                chart.init();
                if (chart.g) {
                    chart.draw();
                }
            }
        });
    }, 250);
});
