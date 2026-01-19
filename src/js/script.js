import WaffleChart from "./waffle.js";
import BarChart from "./bar.js";
import ScatterPlot from "./scatter.js";
import Choropleth from "./choropleth.js";
import ChordChart from "./chord_chart.js";
import RacingLineChart from "./racing_line_chart.js";
import updateTop5Countries from "./weekly_top_5.js";

// ===== TOOLTIP =====
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
const barChartData = d3.csv('data/processed/bar_chart.csv', d3.autoType);
const scatterData = d3.csv('data/processed/scatter_plot_material_conflict.csv', d3.autoType);
const choroplethData = d3.csv('data/processed/choropleth_top_1_material_conflict.csv', d3.autoType);
const chordData = d3.csv('data/processed/chord_continent_data.csv', d3.autoType);
const top5Data = d3.csv('data/processed/weekly_top_5_material_conflict.csv', d3.autoType);
const racingData = d3.csv('data/processed/racing_line_chart.csv', d3.autoType);

// ===== JSON =====
const geoData = await d3.json('src/json/world.json');
const continentColors = await d3.json('src/json/continent_colors.json');

// ===== INITIALIZE =====
// Desktop charts
let desktopChartConfigs = [];
let currentDesktopChart = null;
let currentStepIndex = -1;
let isTransitioning = false;

// Footnotes
let desktopFootnote = document.getElementById('desktop-footnote');
const footnotes = [
    'Data source: <a href="https://acleddata.com/" target="_blank" rel="noopener noreferrer" class="underline">ACLED</a>',
    'Data source: <a href="https://acleddata.com/" target="_blank" rel="noopener noreferrer" class="underline">ACLED</a>',
    'Data source: <a href="https://acleddata.com/" target="_blank" rel="noopener noreferrer" class="underline">ACLED</a>',
    'Data sources: <a href="https://acleddata.com/" target="_blank" rel="noopener noreferrer" class="underline">ACLED</a> and <a href="https://gdeltproject.org/" target="_blank" rel="noopener noreferrer" class="underline">GDELT</a>',
];

function updateDesktopFootnote(stepIndex) {
    if (stepIndex >= 0 && stepIndex < footnotes.length) {
        desktopFootnote.innerHTML = footnotes[stepIndex];
    } else {
        desktopFootnote.innerHTML = '';
    }
}

updateDesktopFootnote(0);

// Mobile charts
const mobileCharts = [
    new WaffleChart('mobile-chart-0', waffleData, tooltip),
    new BarChart('mobile-chart-1', barChartData, tooltip, true),
    new ScatterPlot('mobile-chart-2', scatterData, tooltip),
];

// Desktop chart configs
setTimeout(() => {
    desktopChartConfigs = [
        { type: WaffleChart, params: ['desktop-chart', waffleData, tooltip] },
        { type: BarChart, params: ['desktop-chart', barChartData, tooltip, false] },
        { type: ScatterPlot, params: ['desktop-chart', scatterData, tooltip] },
    ];
    
    const svg = d3.select('#desktop-chart');
    svg.selectAll('*').remove();
    
    const firstConfig = desktopChartConfigs[0];
    currentDesktopChart = new firstConfig.type(...firstConfig.params);
    currentStepIndex = 0;
    
    setTimeout(() => {
        if (currentDesktopChart && currentDesktopChart.g) {
            currentDesktopChart.draw();
        }
    }, 50);
}, 100);

// ===== MAP SECTION VISUALIZATIONS =====
const chordDiagram = new ChordChart('chord-diagram', chordData, tooltip, continentColors);
const choroplethMap = new Choropleth('choropleth-map', choroplethData, tooltip, geoData, continentColors);
const racingChart = new RacingLineChart('racing-chart', racingData, tooltip);

// Load top 5 data early
let allTop5Data = null;

// Initialize continent legend colors
const legendContainer = document.querySelector('#choropleth-legend')?.nextElementSibling;
if (legendContainer && continentColors) {
    const legendItems = legendContainer.querySelectorAll('.flex.items-center.gap-3');
    
    legendItems.forEach(item => {
        const continentName = item.querySelector('span')?.textContent.trim();
        const colorBox = item.querySelector('.w-6.h-6.rounded-full');
        
        if (continentName && continentColors[continentName] && colorBox) {
            colorBox.style.backgroundColor = continentColors[continentName];
        }
    });
}

// Helper function to update top 5 based on current week
function syncTop5ToWeek(weekIndex, source) {
    if (!allTop5Data) return;
    
    let week;
    if (source === 'map') {
        week = choroplethMap.weeks[weekIndex];
    } else if (source === 'chord') {
        week = chordDiagram.allWeeks[weekIndex];
    } else {
        week = racingChart.allWeeks[weekIndex];
    }
    
    if (!week) return;
    
    const weekTime = week.getTime();
    const weekData = allTop5Data.filter(d => d.mention_week.getTime() === weekTime);
    updateTop5Countries(weekData);
}

// Initialize all map section visualizations once
let visualizationsInitialized = false;

setTimeout(async () => {
    if (!visualizationsInitialized) {
        visualizationsInitialized = true;
        
        // Load top 5 data
        allTop5Data = await top5Data;
        
        // Initialize map (visible by default)
        choroplethMap.init();
        if (choroplethMap.g) {
            await choroplethMap.draw();
        }
        
        // Initialize chord (hidden by default) 
        chordDiagram.init();
        if (chordDiagram.g) {
            chordDiagram.draw();
        }
        
        // Initialize racing chart
        racingChart.init();
        if (racingChart.g) {
            racingChart.draw();
        }
        
        // Set up callback for choropleth to update top 5 when playing
        choroplethMap.onWeekChange((weekIndex) => {
            syncTop5ToWeek(weekIndex, 'map');
        });
        
        // Set up callback for chord to update top 5 when playing
        chordDiagram.onWeekChange = (weekIndex) => {
            syncTop5ToWeek(weekIndex, 'chord');
        };
        
        // Initial render of top 5 for week 0
        syncTop5ToWeek(0, 'map');
        
        // Connect play button
        document.getElementById('play-button')?.addEventListener('click', () => {
            const currentView = getCurrentView();
            
            if (currentView === 'map') {
                choroplethMap.togglePlay();
            } else {
                chordDiagram.togglePlay();
            }
            racingChart.togglePlay();
        });
        
        // Connect slider - this is the single source of truth
        document.getElementById('week-slider')?.addEventListener('input', (e) => {
            const weekIndex = parseInt(e.target.value);
            const currentView = getCurrentView();
            
            if (currentView === 'map') {
                choroplethMap.pause();
                choroplethMap.setWeek(weekIndex);
            } else {
                chordDiagram.pause();
                chordDiagram.setWeek(weekIndex);
            }
            
            racingChart.pause();
            racingChart.setWeek(weekIndex);
            
            // Update top 5 based on current view
            syncTop5ToWeek(weekIndex, currentView);
        });
    }
}, 500);

// ===== HELPER FUNCTIONS =====
function getCurrentView() {
    const choroplethContainer = document.getElementById('choropleth-container');
    return choroplethContainer?.classList.contains('hidden') ? 'chord' : 'map';
}

// ===== VIEW TOGGLE BUTTON =====
document.getElementById('view-toggle-button')?.addEventListener('click', function() {
    const mapIcon = document.getElementById('map-icon');
    const chordIcon = document.getElementById('chord-icon');
    const choroplethContainer = document.getElementById('choropleth-container');
    const chordContainer = document.getElementById('chord-container');
    
    if (getCurrentView() === 'map') {
        // Switch to chord
        chordContainer.classList.remove('hidden');
        choroplethContainer.classList.add('hidden');
        mapIcon.classList.remove('hidden');
        chordIcon.classList.add('hidden');
        
        //choroplethMap.pause();
        chordDiagram.setWeek(choroplethMap.currentWeekIndex);
        chordDiagram.play();
        // Sync top 5 to chord's current week
        syncTop5ToWeek(chordDiagram.currentWeekIndex, 'chord');
        
    } else {
        // Switch to map
        choroplethContainer.classList.remove('hidden');
        chordContainer.classList.add('hidden');
        mapIcon.classList.add('hidden');
        chordIcon.classList.remove('hidden');
        
        //chordDiagram.pause();
        choroplethMap.setWeek(chordDiagram.currentWeekIndex);
        choroplethMap.play();
        
        // Sync top 5 to map's current week
        syncTop5ToWeek(choroplethMap.currentWeekIndex, 'map');
    }
});

// ===== CHART SWITCHING =====
function createChartInstance(stepIndex) {
    if (!desktopChartConfigs.length || stepIndex < 0 || stepIndex >= desktopChartConfigs.length) {
        return null;
    }
    
    const config = desktopChartConfigs[stepIndex];
    return new config.type(...config.params);
}

function switchToChart(newStepIndex, animate = true) {
    if (!desktopChartConfigs.length || newStepIndex < 0 || newStepIndex >= desktopChartConfigs.length) return;
    
    if (isTransitioning) {
        isTransitioning = false;
        const svg = d3.select('#desktop-chart');
        svg.interrupt();
    }
    
    if (currentStepIndex === newStepIndex) {
        return;
    }
    
    updateDesktopFootnote(newStepIndex);
    
    const stepDistance = Math.abs(newStepIndex - currentStepIndex);
    const shouldAnimate = animate && stepDistance === 1;
    
    const svg = d3.select('#desktop-chart');
    
    if (shouldAnimate) {
        isTransitioning = true;
        
        svg.transition()
            .duration(200)
            .style('opacity', 0)
            .on('end', () => {
                svg.selectAll('*').remove();
                svg.style('opacity', 0);
                
                currentDesktopChart = createChartInstance(newStepIndex);
                currentStepIndex = newStepIndex;
                
                if (currentDesktopChart && currentDesktopChart.g) {
                    currentDesktopChart.draw();
                    
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
        isTransitioning = false;
        
        svg.interrupt();
        svg.selectAll('*').remove();
        svg.style('opacity', 1);
        
        currentDesktopChart = createChartInstance(newStepIndex);
        currentStepIndex = newStepIndex;
        
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
        // Desktop chart
        if (currentDesktopChart && desktopChartConfigs.length > 0) {
            isTransitioning = false;
            
            const svg = d3.select('#desktop-chart');
            svg.interrupt();
            svg.selectAll('*').remove();
            svg.style('opacity', 1);
            
            currentDesktopChart.init();
            if (currentDesktopChart.g) {
                currentDesktopChart.draw();
            }
        }
        
        // Mobile charts
        mobileCharts.forEach(chart => {
            if (chart) {
                chart.init();
                if (chart.g) {
                    chart.draw();
                }
            }
        });

        // Map section visualizations - preserve week state
        if (choroplethMap) {
            const currentMapWeek = choroplethMap.currentWeekIndex;
            choroplethMap.init();
            if (choroplethMap.g) {
                choroplethMap.draw();
                setTimeout(() => choroplethMap.setWeek(currentMapWeek), 50);
            }
        }
        
        if (chordDiagram) {
            const currentChordWeek = chordDiagram.currentWeekIndex;
            chordDiagram.init();
            if (chordDiagram.g) {
                chordDiagram.draw();
                setTimeout(() => chordDiagram.setWeek(currentChordWeek), 50);
            }
        }
        
        if (racingChart) {
            const currentRacingWeek = racingChart.currentWeekIndex;
            racingChart.init();
            if (racingChart.g) {
                racingChart.draw();
                setTimeout(() => racingChart.setWeek(currentRacingWeek), 50);
            }
        }

    }, 250);
});