import WaffleChart from "./waffle.js";
import BarChart from "./bar.js";
import ScatterPlot from "./scatter.js";
import Choropleth from "./choropleth.js";
import ChordChart from "./chord_chart.js";
// import RacingLineChart from "./racing_line_chart.js";
import RacingBarChart from "./racing_bar_chart.js";
import updateTop5Countries from "./weekly_top_5.js";
import updateInfoWindow, { hideInfoWindow } from "./infobox.js";
import LineChart from "./line.js";
import WeekManager from "./week_manager.js";
import ViolinPlot from "./violin_plot.js";
import BoxPlot from "./box_plot.js";
import WordCloud from "./word_cloud.js";

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
const top5Data = d3.csv('data/processed/weekly_top_25_material_conflict.csv', d3.autoType);
const racingData = d3.csv('data/processed/racing_bar_chart.csv', d3.autoType);
const lineChartMyanmarData = d3.csv('data/processed/myanmar_fatalities_over_time.csv', d3.autoType);
const lineChartBurkinaData = d3.csv('data/processed/burkina_faso_fatalities_over_time.csv', d3.autoType);
const newsArticlesData = d3.csv('data/processed/news_articles_datetime.csv', d3.autoType);
const violinPlotToneData = d3.csv('data/processed/violin_plot_tone.csv', d3.autoType);
const violinPlotImpactData = d3.csv('data/processed/violin_plot_impact.csv', d3.autoType);

const myanmarWordCloudData = d3.csv('data/processed/myanmar_word_cloud.csv', d3.autoType);
const burkinaFasoWordCloudData = d3.csv('data/processed/burkina_faso_word_cloud.csv', d3.autoType);
const palestineWordCloudData = d3.csv('data/processed/palestine_word_cloud.csv', d3.autoType);

// ===== JSON =====
const geoData = await d3.json('src/json/world.json');
const continentColors = await d3.json('src/json/continent_colors.json');
const fips = await d3.json('src/json/fips.json');

// ===== INITIALIZE CENTRALIZED WEEK MANAGER =====
const weekManager = new WeekManager();

// Load all datasets that contain week data
const loadedChoroplethData = await choroplethData;
const loadedChordData = await chordData;
const loadedRacingData = await racingData;
const loadedTop5Data = await top5Data;
const loadedInfoData = await newsArticlesData;

// Build the complete week list from all datasets
weekManager.buildWeekList(
    loadedChoroplethData,
    loadedChordData,
    loadedRacingData,
    loadedTop5Data,
    loadedInfoData
);


// ===== SCROLL TO TOP BUTTON =====
const scrollTopBtn = document.getElementById('scrollTop');


window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollTopBtn.style.visibility = 'visible';
        scrollTopBtn.style.opacity = '1';
        scrollTopBtn.style.pointerEvents = 'auto';
    } else {
        scrollTopBtn.style.opacity = '0';
        scrollTopBtn.style.pointerEvents = 'none';
        // Delay hiding to allow fade out transition
        setTimeout(() => {
            if (window.pageYOffset <= 300) {
                scrollTopBtn.style.visibility = 'hidden';
            }
        }, 300); // Match your transition duration
    }
});

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

scrollTopBtn.addEventListener('click', scrollToTop);


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
const racingChart = new RacingBarChart('racing-chart', racingData, tooltip, fips, continentColors);

chordDiagram.setWeekManager(weekManager);
choroplethMap.setWeekManager(weekManager);
racingChart.setWeekManager(weekManager);

// Load top 5 and info data early
let allTop5Data = null;
let allInfoData = null;


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

const mobileLegendContainer = document.getElementById('mobile-choropleth-legend');
if (mobileLegendContainer && continentColors) {
    const mobileLegendItems = mobileLegendContainer.querySelectorAll('.flex.items-center.gap-1');
    mobileLegendItems.forEach(item => {
        let continentName = item.querySelector('span')?.textContent.trim();
        const colorBox = item.querySelector('.w-4.h-4.rounded-full');
        switch(continentName){
            case 'NorthAmerica' : continentName = 'North America'; break;
            case 'SouthAmerica' : continentName = 'South America'; break;
            case 'OC' : continentName = 'Oceania'; break;
            case 'EU' : continentName = 'Europe'; break;
            case 'AS' : continentName = 'Asia'; break;
            case 'AF' : continentName = 'Africa'; break;
        }

        if (continentName && continentColors[continentName] && colorBox) {
            colorBox.style.backgroundColor = continentColors[continentName];
        }
    });
}

// Helper function to update info window based on current week
function syncInfoToWeek(weekIndex) {
    // 1. Safety check: ensure data is loaded
    if (!allInfoData) return;

    // 2. Get the week from the manager
    const rawWeek = weekManager.getWeekAtIndex(weekIndex);
    if (!rawWeek) return;

    // Convert to timestamp safely (handles both String and Date)
    const targetTime = new Date(rawWeek).getTime();

    // 3. Filter data
    // We assume d.mention_week is a Date (from d3.autoType).
    const weekData = allInfoData.filter(d => {
        const dTime = d.mention_week instanceof Date ? d.mention_week.getTime() : new Date(d.mention_week).getTime();
        return dTime === targetTime;
    });

    // 4. Update info window content
    updateInfoWindow(weekData);
}

// Helper function to update top 5 based on current week
function syncTop5ToWeek(weekIndex, source) {
    // 1. Safety check: ensure data is loaded
    if (!allTop5Data) return;
    
    // 2. Get the week from the manager
    const rawWeek = weekManager.getWeekAtIndex(weekIndex);
    if (!rawWeek) return;
    
    // Convert to timestamp safely (handles both String and Date)
    const targetTime = new Date(rawWeek).getTime();
    
    // 3. Filter data
    // We assume d.mention_week is a Date (from d3.autoType). 
    // If it's not, we convert it to match the targetTime.
    const weekData = allTop5Data.filter(d => {
        const dTime = d.mention_week instanceof Date ? d.mention_week.getTime() : new Date(d.mention_week).getTime();
        return dTime === targetTime;
    });
    
    // 4. Call your original function (Single Argument)
    updateTop5Countries(weekData);
}

// ===== SHARED ANIMATION STATE =====
let isAnimationPlaying = false;

// Helper to update play button appearance
function updatePlayButtonUI() {
    const playButton = document.getElementById('play-button');
    if (playButton) {
        playButton.innerHTML = isAnimationPlaying ? '<svg id="pause-icon" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4z"/><path d="M11 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>' : '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>';
        playButton.setAttribute('aria-label', isAnimationPlaying ? 'Pause' : 'Play');
    }
}

// ===== TIMELINE MARKERS ======
/**
 * Add timeline markers at key reference points
 * @param {WeekManager} weekManager - The week manager instance
 * @param {Array} markerDates - Array of date strings to mark (e.g., ['2015-06-01', '2016-01-01'])
 */
function addTimelineMarkers(weekManager, markerDates = null) {
    const weeks = weekManager.getWeeks();
    const totalWeeks = weeks.length;
    
    if (totalWeeks === 0) return;
    
    const markerContainer = document.getElementById('timeline-markers');
    const labelContainer = document.getElementById('timeline-labels');
    
    if (!markerContainer || !labelContainer) return;
    
    // Clear existing markers
    markerContainer.innerHTML = '';
    labelContainer.innerHTML = '';
    
    let markersToAdd = [];
    
    if (markerDates && markerDates.length > 0) {
        // Use provided dates
        markersToAdd = markerDates.map(dateStr => {
            const index = weekManager.getWeekIndex(dateStr);
            return index >= 0 ? { index, date: dateStr } : null;
        }).filter(m => m !== null);
    } else {
        // Auto-generate markers - evenly spaced throughout timeline
        const numMarkers = 6;
        const step = Math.floor(totalWeeks / (numMarkers + 1));
        
        for (let i = 1; i <= numMarkers; i++) {
            const index = i * step;
            if (index < totalWeeks) {
                markersToAdd.push({ index, date: weeks[index] });
            }
        }
    }
    
    // Create marker elements
    markersToAdd.forEach(({ index, date }) => {
        const position = (index / (totalWeeks - 1)) * 100;
        
        // Create marker tick
        const marker = document.createElement('div');
        marker.className = 'timeline-marker';
        marker.style.left = `${position}%`;
        marker.dataset.index = index;
        marker.dataset.date = date;
        
        // Click to jump to this week
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            const weekIndex = parseInt(marker.dataset.index);
            
            // Update all charts
            if (window.choroplethMap) window.choroplethMap.setWeek(weekIndex);
            if (window.chordDiagram) window.chordDiagram.setWeek(weekIndex);
            if (window.racingChart) window.racingChart.setWeek(weekIndex);
        });
        
        markerContainer.appendChild(marker);
        
        // Create label with responsive text wrapping
        const label = document.createElement('div');
        label.className = 'timeline-marker-label text-[0.3rem] lg:text-[0.6rem] text-gray-400 font-medium whitespace-normal max-w-[3rem] md:max-w-[4rem] lg:whitespace-nowrap lg:max-w-none text-center leading-tight';
        label.style.left = `${position}%`;
        
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
            year: 'numeric' 
        });
        label.textContent = formattedDate;
        
        labelContainer.appendChild(label);
    });
}

addTimelineMarkers(weekManager);

// ===== INITIALIZATION =====
let visualizationsInitialized = false;

setTimeout(async () => {
    if (!visualizationsInitialized) {
        visualizationsInitialized = true;
        
        // Load top 5 data
        allTop5Data = loadedTop5Data;

        // Load info window data
        allInfoData = loadedInfoData;
        
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
            syncInfoToWeek(weekIndex);
        });
        
        // Set up callback for chord to update top 5 when playing
        chordDiagram.onWeekChange = (weekIndex) => {
            syncTop5ToWeek(weekIndex, 'chord');
            syncInfoToWeek(weekIndex);
        };
        
        // Initial render of top 5 for week 0
        syncTop5ToWeek(0, 'map');
        // Initial render of info window for week 0
        syncInfoToWeek(0);
        
        // Connect play button - single source of truth for play/pause state
        document.getElementById('play-button')?.addEventListener('click', () => {
            // Toggle the shared state
            isAnimationPlaying = !isAnimationPlaying;
            
            const currentView = getCurrentView();
            
            if (isAnimationPlaying) {
                // Start playing
                if (currentView === 'map') {
                    choroplethMap.play();
                } else {
                    chordDiagram.play();
                }
                racingChart.play();
            } else {
                // Pause all charts
                choroplethMap.pause();
                chordDiagram.pause();
                racingChart.pause();
            }
            
            updatePlayButtonUI();
        });
        
        // Connect slider - this is the single source of truth for week position
        document.getElementById('week-slider')?.addEventListener('input', (e) => {
            const weekIndex = parseInt(e.target.value);
            const currentView = getCurrentView();
            
            // Always pause when manually scrubbing
            isAnimationPlaying = false;
            
            // Pause all charts
            choroplethMap.pause();
            chordDiagram.pause();
            racingChart.pause();
            
            // Update all visualizations
            choroplethMap.setWeek(weekIndex);
            chordDiagram.setWeek(weekIndex);
            racingChart.setWeek(weekIndex);
            
            // Update top 5 based on current view
            syncTop5ToWeek(weekIndex, currentView);
            // Update info window based on current week
            syncInfoToWeek(weekIndex);
            
            // Update button UI
            updatePlayButtonUI();
        });
        
        // Initialize play button UI
        updatePlayButtonUI();
        
        // ===== MOBILE INFO WINDOW TOGGLE =====
        const mobileInfoToggleButton = document.getElementById('mobile-info-toggle-button');
        const mobileInfoWindow = document.getElementById('mobile-info-window');
        const mobileInfoCloseButton = document.getElementById('mobile-info-close-button');
        const choroplethMapContainer = document.getElementById('choropleth-container');
        const chordDiagramContainer = document.getElementById('chord-container');
        
        function openInfoWindow() {
            // Pause animation when opening info window
            if (isAnimationPlaying) {
                isAnimationPlaying = false;
                choroplethMap.pause();
                chordDiagram.pause();
                racingChart.pause();
                updatePlayButtonUI();
            }
            
            // Show info window
            mobileInfoWindow?.classList.remove('hidden');
        }
        
        function closeInfoWindow() {
            // Hide info window
            mobileInfoWindow?.classList.add('hidden');
        }
        
        // Info button click - opens window and pauses animation
        mobileInfoToggleButton?.addEventListener('click', openInfoWindow);
        
        // Close button click
        mobileInfoCloseButton?.addEventListener('click', closeInfoWindow);
        
        // Click on map/chord to close info window
        choroplethMapContainer?.addEventListener('click', (e) => {
            // Only close if clicking on the container itself, not on countries
            if (e.target === choroplethMapContainer || e.target.tagName === 'svg') {
                closeInfoWindow();
            }
        });
        
        chordDiagramContainer?.addEventListener('click', (e) => {
            if (e.target === chordDiagramContainer || e.target.tagName === 'svg') {
                closeInfoWindow();
            }
        });


        const loader = document.getElementById('loading-overlay');
        const progressBar = document.getElementById('loading-progress');
        
        if (loader) {
            // 1. Snap progress bar to 100% instantly when data is ready
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.style.transitionDuration = '300ms'; // Fast finish
            }

            // 2. Wait a tiny bit for the bar to fill, then fade out
            setTimeout(() => {
                // Fade out visually
                loader.classList.add('opacity-0', 'pointer-events-none');
                
                // Re-enable scrolling
                document.body.classList.remove('overflow-hidden');
                
                // Remove from DOM
                setTimeout(() => {
                    loader.remove();
                }, 700);
            }, 500); // Wait 500ms for user to see the "100%" state
        }

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
    const infobox = document.getElementById('desktop-info-box');

    let legendTitles = document.querySelectorAll('#choropleth-legend');
    
    if (getCurrentView() === 'map') {
        // Switch to chord view
        chordContainer.classList.remove('hidden');
        choroplethContainer.classList.add('hidden');
        mapIcon.classList.remove('hidden');
        chordIcon.classList.add('hidden');
        infobox.classList.add('lg:hidden');

        legendTitles.forEach(title => {
            title.textContent = 'Continents';
        });
        
        // Sync week position from map to chord
        const currentWeek = choroplethMap.currentWeekIndex;
        chordDiagram.setWeek(currentWeek);
        
        // Preserve animation state - only play if it was already playing
        if (isAnimationPlaying) {
            choroplethMap.pause(); // Pause the hidden one
            chordDiagram.play();   // Continue playing the visible one
            updatePlayButtonUI();

        } else {
            chordDiagram.pause();  // Keep paused if it was paused
        }
        
        // Sync top 5 to current week
        syncTop5ToWeek(currentWeek, 'chord');
        syncInfoToWeek(currentWeek);

        
    } else {
        // Switch to map view
        choroplethContainer.classList.remove('hidden');
        chordContainer.classList.add('hidden');
        mapIcon.classList.add('hidden');
        chordIcon.classList.remove('hidden');
        infobox.classList.remove('lg:hidden');

        legendTitles.forEach(title => {
            title.textContent = 'Most Mentioned Continent';
        });
        
        // Sync week position from chord to map
        const currentWeek = chordDiagram.currentWeekIndex;
        choroplethMap.setWeek(currentWeek);
        
        // Preserve animation state - only play if it was already playing
        if (isAnimationPlaying) {
            chordDiagram.pause();    // Pause the hidden one
            choroplethMap.play();     // Continue playing the visible one
            updatePlayButtonUI();

        } else {
            choroplethMap.pause();   // Keep paused if it was paused
        }
        
        // Sync top 5 to current week
        syncTop5ToWeek(currentWeek, 'map');
    }
});

document.getElementById('mobile-view-toggle-button')?.addEventListener('click', function() {
    const mapIcon = document.getElementById('mobile-map-icon');
    const chordIcon = document.getElementById('mobile-chord-icon');
    const choroplethContainer = document.getElementById('choropleth-container');
    const chordContainer = document.getElementById('chord-container');

    let legendTitles = document.querySelectorAll('#choropleth-legend');
    
    if (getCurrentView() === 'map') {
        // Switch to chord view
        chordContainer.classList.remove('hidden');
        choroplethContainer.classList.add('hidden');
        mapIcon.classList.remove('hidden');
        chordIcon.classList.add('hidden');


        legendTitles.forEach(title => {
            title.textContent = 'Continents';
        });


        // Close mobile info window if it's open
        const mobileInfoWindow = document.getElementById('mobile-info-window');
        mobileInfoWindow?.classList.add('hidden');
        
        // Sync week position from map to chord
        const currentWeek = choroplethMap.currentWeekIndex;
        chordDiagram.setWeek(currentWeek);
        
        // Preserve animation state - only play if it was already playing
        if (isAnimationPlaying) {
            choroplethMap.pause(); // Pause the hidden one
            chordDiagram.play();   // Continue playing the visible one
        } else {
            chordDiagram.pause();  // Keep paused if it was paused
        }
        
        // Sync top 5 to current week
        syncTop5ToWeek(currentWeek, 'chord');
        syncInfoToWeek(currentWeek);
    } else {
        // Switch to map view
        choroplethContainer.classList.remove('hidden');
        chordContainer.classList.add('hidden');
        mapIcon.classList.add('hidden');
        chordIcon.classList.remove('hidden');

        legendTitles.forEach(title => {
            title.textContent = 'Most Mentioned Continent';
        });
        
        // Sync week position from chord to map
        const currentWeek = chordDiagram.currentWeekIndex;
        choroplethMap.setWeek(currentWeek);
        
        // Preserve animation state - only play if it was already playing
        if (isAnimationPlaying) {
            chordDiagram.pause();    // Pause the hidden one
            choroplethMap.play();     // Continue playing the visible one
        } else {
            choroplethMap.pause();   // Keep paused if it was paused
        }
        
        // Sync top 5 to current week
        syncTop5ToWeek(currentWeek, 'map');
        syncInfoToWeek(currentWeek);
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

// ===== LINE CHARTS =====
const lineChartMyanmar = new LineChart('myanmar-line-chart', lineChartMyanmarData, tooltip);
const lineChartBurkina = new LineChart('burkina-line-chart', lineChartBurkinaData, tooltip);
const LineCharts = [lineChartMyanmar, lineChartBurkina];

setTimeout(() => {
    LineCharts.forEach(chart => {
        if (chart) {
            chart.init();
            if (chart.g) {
                chart.draw();
            }
        }
    });
}, 500);


// ===== VIOLIN PLOT =====
const violinPlotTone = new ViolinPlot('violinplot-tone-chart', violinPlotToneData, tooltip);
const violinPlotImpact = new ViolinPlot('violinplot-impact-chart', violinPlotImpactData, tooltip);
const violinPlots = [violinPlotTone, violinPlotImpact];

const boxPlotTone = new BoxPlot('boxplot-tone-chart', violinPlotToneData, tooltip);
const boxPlotImpact = new BoxPlot('boxplot-impact-chart', violinPlotImpactData, tooltip);
const boxPlots = [boxPlotTone, boxPlotImpact];

setTimeout(() => {
    violinPlots.forEach(violinPlot => {
        if (violinPlot) {
            violinPlot.init();
            if (violinPlot.g) {
                violinPlot.draw();
            }
        }
    });

    boxPlots.forEach(boxPlot => {
        if (boxPlot) {
            boxPlot.init();
            if(boxPlot.g){
                boxPlot.draw();
            }
        }
    })
}, 500);


// Get Buttons
let toneViolinToggleButton = document.getElementById('tone-violin-toggle-button');
let impactViolinToggleButton = document.getElementById('impact-violin-toggle-button');

// Add Event Listeners
toneViolinToggleButton.addEventListener('click', () => {
    let isCurrentlyViolin = !document.getElementById('violinplot-tone-chart').classList.contains('hidden');
    if (isCurrentlyViolin) {
        // Switch to box plot - show violin icon (to indicate you can switch back to violin)
        document.getElementById('violinplot-tone-chart').classList.add('hidden');
        document.getElementById('boxplot-tone-chart').classList.remove('hidden');
        document.getElementById('violin-tone-icon').classList.remove('hidden');
        document.getElementById('box-tone-icon').classList.add('hidden');
    } else {
        // Switch to violin plot - show box icon (to indicate you can switch to box)
        document.getElementById('violinplot-tone-chart').classList.remove('hidden');
        document.getElementById('boxplot-tone-chart').classList.add('hidden');
        document.getElementById('violin-tone-icon').classList.add('hidden');
        document.getElementById('box-tone-icon').classList.remove('hidden');
    }
});

impactViolinToggleButton.addEventListener('click', () => {
    let isCurrentlyViolin = !document.getElementById('violinplot-impact-chart').classList.contains('hidden');
    if (isCurrentlyViolin) {
        // Switch to box plot - show violin icon (to indicate you can switch back to violin)
        document.getElementById('violinplot-impact-chart').classList.add('hidden');
        document.getElementById('boxplot-impact-chart').classList.remove('hidden');
        document.getElementById('violin-impact-icon').classList.remove('hidden');
        document.getElementById('box-impact-icon').classList.add('hidden');
    } else {
        // Switch to violin plot - show box icon (to indicate you can switch to box)
        document.getElementById('violinplot-impact-chart').classList.remove('hidden');
        document.getElementById('boxplot-impact-chart').classList.add('hidden');
        document.getElementById('violin-impact-icon').classList.add('hidden');
        document.getElementById('box-impact-icon').classList.remove('hidden');
    }
});

// ===== WORD CLOUD =====
const wordClouds = {
    'myanmar': new WordCloud('word-cloud-chart', myanmarWordCloudData, 'Myanmar', tooltip),
    'burkina': new WordCloud('word-cloud-chart', burkinaFasoWordCloudData, 'Burkina Faso', tooltip),
    'palestine': new WordCloud('word-cloud-chart', palestineWordCloudData, 'Palestine', tooltip),
};

let myanmarButton = document.getElementById('myanmar-word-cloud-button');
let burkinaButton = document.getElementById('burkina-word-cloud-button');
let palestineButton = document.getElementById('palestine-word-cloud-button');

let wordCloud = wordClouds['myanmar']; // Default

setTimeout(() => {
    if (wordCloud) {
        wordCloud.init();
        if (wordCloud.g) {
            wordCloud.draw();
        }
    }
});

myanmarButton.addEventListener('click', () => {
    wordCloud = wordClouds['myanmar'];
    wordCloud.init();
    if (wordCloud.g) {
        wordCloud.draw();
    }
});

burkinaButton.addEventListener('click', () => {
    wordCloud = wordClouds['burkina'];
    wordCloud.init();
    if (wordCloud.g) {
        wordCloud.draw();
    }
});

palestineButton.addEventListener('click', () => {
    wordCloud = wordClouds['palestine'];
    wordCloud.init();
    if (wordCloud.g) {
        wordCloud.draw();
    }
});


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
let lastWindowWidth = window.innerWidth;
window.addEventListener('resize', () => {
    if (window.innerWidth === lastWindowWidth) return;
    // Update last window width
    lastWindowWidth = window.innerWidth;

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
                choroplethMap.setWeek(currentMapWeek);
            }
        }
        
        if (chordDiagram) {
            const currentChordWeek = chordDiagram.currentWeekIndex;
            chordDiagram.init();
            if (chordDiagram.g) {
                chordDiagram.draw();
                chordDiagram.setWeek(currentChordWeek);
            }
        }
        
        if (racingChart) {
            const currentRacingWeek = racingChart.currentWeekIndex;
            racingChart.init();
            if (racingChart.g) {
                racingChart.draw();
                racingChart.setWeek(currentRacingWeek);
            }
        }

        LineCharts.forEach(chart => {
             if (chart) { chart.init(); if (chart.g) chart.draw(); }
        });        

        [...violinPlots, ...boxPlots].forEach(plot => {
            // Check if the container is hidden before redrawing
            const container = document.getElementById(plot.id);
            if (plot && container && !container.classList.contains('hidden')) {
                plot.init();
                if (plot.g) plot.draw();
            }
        });        

        // --- 5. Word Cloud ---
        if (wordCloud) {
            wordCloud.init();
            if (wordCloud.g) wordCloud.draw();
        }

    }, 250);
});

// ====== CAROUSEL INITIALIZATION ======
// Carousel initialization function
function initCarousel(carouselId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    const dots = carousel.querySelectorAll('.carousel-dot');
    
    let currentSlide = 0;
    const totalSlides = slides.length;
    
    function updateCarousel() {
        track.style.transform = `translateX(-${currentSlide * 100}%)`;
        
        // Update dots
        dots.forEach((dot, index) => {
            if (index === currentSlide) {
                dot.classList.add('bg-white');
                dot.classList.remove('bg-white/60');
            } else {
                dot.classList.add('bg-white/60');
                dot.classList.remove('bg-white');
            }
        });
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
    }
    
    function prevSlide() {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel();
    }
    
    // Event listeners
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            updateCarousel();
        });
    });
        
    // Keyboard navigation
    carousel.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'ArrowRight') nextSlide();
    });
    
    // Touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    
    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    carousel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) nextSlide();
        if (touchEndX - touchStartX > 50) prevSlide();
    });
}

// Initialize carousels
// Auto-initialize all carousels on the page
document.querySelectorAll('[id$="-carousel"]').forEach(carousel => {
    initCarousel(carousel.id);
});