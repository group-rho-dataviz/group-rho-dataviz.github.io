import ScrollyChart from "./scrolly_chart.js";
import WaffleChart from "./waffle.js";
import BarChart from "./bar.js";

// ===== DATA =====
/* const data = {
    regions: [
        { name: 'Middle East', events: 1247, coverage: 89, fatalities: 89234, color: '#ef4444' },
        { name: 'Sub-Saharan Africa', events: 2103, coverage: 18, fatalities: 176500, color: '#f97316' },
        { name: 'South Asia', events: 834, coverage: 38, fatalities: 23456, color: '#fbbf24' },
        { name: 'East Asia', events: 456, coverage: 42, fatalities: 12300, color: '#10b981' },
        { name: 'Americas', events: 678, coverage: 28, fatalities: 18900, color: '#3b82f6' },
        { name: 'Europe', events: 234, coverage: 97, fatalities: 8900, color: '#6b7280' }
    ],
    conflicts: [
        { name: 'Syria', fatalities: 610000, coverage: 92, x: 0.58, y: 0.35 },
        { name: 'Yemen', fatalities: 377000, coverage: 45, x: 0.62, y: 0.42 },
        { name: 'DRC', fatalities: 1200000, coverage: 18, x: 0.52, y: 0.52 },
        { name: 'Ukraine', fatalities: 186000, coverage: 97, x: 0.53, y: 0.28 },
        { name: 'Myanmar', fatalities: 155000, coverage: 42, x: 0.72, y: 0.45 },
        { name: 'Sudan', fatalities: 350000, coverage: 12, x: 0.55, y: 0.48 },
        { name: 'Iraq', fatalities: 459000, coverage: 88, x: 0.60, y: 0.38 },
        { name: 'Afghanistan', fatalities: 212000, coverage: 76, x: 0.65, y: 0.38 },
        { name: 'Nigeria', fatalities: 350000, coverage: 31, x: 0.48, y: 0.48 },
        { name: 'Somalia', fatalities: 600000, coverage: 28, x: 0.58, y: 0.52 }
    ]
}; */
// ===== DATA =====
const waffleData = d3.csv('data/processed/waffle_chart_data.csv', d3.autoType);
const barChartData = d3.csv('data/processed/bar_chart.csv', d3.autoType);

// ===== INITIALIZE =====
const waffleColors = ['lightgray', '#ff4d4d'];

// Desktop charts - each step gets its own chart instance
let desktopCharts = [];
let currentDesktopChart = null;
let isTransitioning = false;

// Mobile charts - one per step, each with its own SVG
const mobileCharts = [
    new WaffleChart('mobile-chart-0', waffleData, waffleColors),
    new BarChart('mobile-chart-1', barChartData),
    new WaffleChart('mobile-chart-2', waffleData),
    new WaffleChart('mobile-chart-3', waffleData)
];

// Initialize desktop charts after a brief delay to ensure DOM is ready
setTimeout(() => {
    desktopCharts = [
        new WaffleChart('desktop-chart', waffleData, waffleColors),
        new BarChart('desktop-chart', barChartData),
        new WaffleChart('desktop-chart', waffleData),
        new WaffleChart('desktop-chart', waffleData)
    ];
    
    // Set initial desktop chart
    currentDesktopChart = desktopCharts[0];
    
    // Initial render
    if (currentDesktopChart && currentDesktopChart.g) {
        currentDesktopChart.draw();
    }
}, 100);

// Function to smoothly transition between desktop charts
function transitionToChart(newChart) {
    if (isTransitioning || !currentDesktopChart || !newChart) return;
    if (currentDesktopChart === newChart) return;
    
    isTransitioning = true;
    const svg = d3.select('#desktop-chart');
    
    // Fade out current chart
    svg.transition()
        .duration(300)
        .style('opacity', 0)
        .on('end', () => {
            // Switch to new chart
            currentDesktopChart = newChart;
            currentDesktopChart.init();
            
            // Draw new chart (but keep it invisible initially)
            if (currentDesktopChart.g) {
                svg.style('opacity', 0);
                currentDesktopChart.draw();
                
                // Fade in new chart
                svg.transition()
                    .duration(400)
                    .style('opacity', 1)
                    .on('end', () => {
                        isTransitioning = false;
                    });
            }
        });
}

// ===== SCROLL OBSERVER =====
let currentStep = -1;

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const stepEl = entry.target;
        const stepContent = stepEl.querySelector('.step-content');
        
        if (entry.isIntersecting) {
            stepContent?.classList.add('is-active');
            
            const step = parseInt(stepEl.dataset.step);
            if (step !== currentStep && desktopCharts.length > 0) {
                currentStep = step;
                
                // Update desktop chart with smooth transition
                if (desktopCharts[step]) {
                    transitionToChart(desktopCharts[step]);
                }
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
        if (currentDesktopChart && desktopCharts.length > 0) {
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