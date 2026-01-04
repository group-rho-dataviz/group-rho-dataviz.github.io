import ScrollyChart from "./scrolly_chart.js";
import WaffleChart from "./waffle.js";

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
// For waffle chart, load data from CSV, parse it in an array
const waffleData = d3.csv('../data/processed/waffle_chart_data.csv', d3.autoType);

// ===== INITIALIZE =====
const waffleColors = [/*gray*/ 'lightgray', /*red*/ '#ff4d4d'];
// Desktop chart (one sticky instance)
const desktopCharts = [
    new WaffleChart('desktop-chart', waffleData, waffleColors),
    new WaffleChart('desktop-chart', waffleData),
    new WaffleChart('desktop-chart', waffleData),
    new WaffleChart('desktop-chart', waffleData)
];
let desktopChart = desktopCharts[0];

// Mobile charts (one per step)
const mobileCharts = [
    new WaffleChart('mobile-chart-0', waffleData, waffleColors),
    new WaffleChart('mobile-chart-1', waffleData),
    new WaffleChart('mobile-chart-2', waffleData),
    new WaffleChart('mobile-chart-3', waffleData)
];

// ===== SCROLL OBSERVER =====
let currentStep = -1;

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const stepEl = entry.target;
        const stepContent = stepEl.querySelector('.step-content');
        
        if (entry.isIntersecting) {
            stepContent?.classList.add('is-active');
            
            const step = parseInt(stepEl.dataset.step);
            if (step !== currentStep) {
                currentStep = step;
                
                // Update desktop chart
                if (desktopChart.g) {
                    switch(step) {
                        case 0: desktopChart = desktopCharts[0]; desktopChart.draw(); break;
                        case 1: desktopChart = desktopCharts[1]; desktopChart.draw(); break;
                        case 2: desktopChart = desktopCharts[2]; desktopChart.draw(); break;
                        case 3: desktopChart = desktopCharts[3]; desktopChart.draw(); break;
                    }
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

// ===== INITIAL RENDER =====
setTimeout(() => {
    // Desktop
    if (desktopChart.g) desktopChart.draw();
    
    // Mobile (render all charts immediately)
    mobileCharts.forEach(chart => {
        if (chart.g) chart.draw();
    });
}, 500);

// ===== RESIZE =====
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        desktopChart.init();
        mobileCharts.forEach(c => c.init());
        
        // Redraw current state
        if (desktopChart.g) {
            switch(currentStep) {
                case 0: desktopChart = desktopCharts[0]; desktopChart.draw(); break;
                case 1: desktopChart = desktopCharts[1]; desktopChart.draw(); break;
                case 2: desktopChart = desktopCharts[2]; desktopChart.draw(); break;
                case 3: desktopChart = desktopCharts[3]; desktopChart.draw(); break;
            }
        }
        
        // Redraw mobile charts
        mobileCharts.forEach(chart => {
            if (chart.g) {
                chart.draw();
            }
        });
    }, 250);
});
