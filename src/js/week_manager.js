/**
 * WeekManager - Centralized week timeline management for synchronized visualizations
 * 
 * This utility ensures all visualizations share the same complete timeline,
 * including filling gaps for missing weeks in the data.
 * 
 * Usage:
 * 
 * // In script.js (main initialization)
 * const weekManager = new WeekManager();
 * const allWeeks = weekManager.buildWeekList(
 *     await choroplethData,
 *     await chordData, 
 *     await racingData,
 *     await top5Data
 * );
 * 
 * // Pass to each visualization
 * choroplethMap.setWeekManager(weekManager);
 * chordDiagram.setWeekManager(weekManager);
 * racingChart.setWeekManager(weekManager);
 */

export default class WeekManager {
    constructor() {
        this.completeWeeks = [];
        this.weekSet = new Set();
    }

    /**
     * Build complete week list from multiple datasets
     * @param {...Array} datasets - Multiple arrays of data objects with mention_week property
     * @returns {Array} - Sorted array of week strings in ISO format (YYYY-MM-DD)
     */
    buildWeekList(...datasets) {
        const allWeeks = new Set();
        
        // Collect all unique weeks from all datasets
        datasets.forEach(dataset => {
            if (Array.isArray(dataset)) {
                dataset.forEach(row => {
                    if (row.mention_week) {
                        // Handle both Date objects and string formats
                        const weekStr = row.mention_week instanceof Date 
                            ? row.mention_week.toISOString().split('T')[0]
                            : row.mention_week;
                        allWeeks.add(weekStr);
                    }
                });
            }
        });

        // Convert to sorted array
        const weeks = Array.from(allWeeks).sort((a, b) => {
            return new Date(a) - new Date(b);
        });

        // Fill in any missing weeks
        this.completeWeeks = this.fillMissingWeeks(weeks);
        this.weekSet = new Set(this.completeWeeks);
        
        return this.completeWeeks;
    }

    /**
     * Fill in missing weeks between start and end dates
     * @param {Array} weeks - Array of week strings
     * @returns {Array} - Complete array with no gaps
     */
    fillMissingWeeks(weeks) {
        if (weeks.length < 2) return weeks;
        
        const result = [];
        
        for (let i = 0; i < weeks.length - 1; i++) {
            const current = new Date(weeks[i]);
            const next = new Date(weeks[i + 1]);
            
            result.push(weeks[i]);
            
            // Add missing weeks (7-day intervals)
            let checkDate = new Date(current);
            checkDate.setDate(checkDate.getDate() + 7);
            
            while (checkDate < next) {
                // Format as YYYY-MM-DD
                const yearStr = checkDate.getFullYear();
                const monthStr = String(checkDate.getMonth() + 1).padStart(2, '0');
                const dayStr = String(checkDate.getDate()).padStart(2, '0');
                result.push(`${yearStr}-${monthStr}-${dayStr}`);
                
                checkDate.setDate(checkDate.getDate() + 7);
            }
        }
        
        // Add the last week
        result.push(weeks[weeks.length - 1]);
        
        return result;
    }

    /**
     * Get the complete week list
     * @returns {Array} - Array of week strings
     */
    getWeeks() {
        return this.completeWeeks;
    }

    /**
     * Check if a week exists in the complete timeline
     * @param {string|Date} week - Week to check
     * @returns {boolean}
     */
    hasWeek(week) {
        const weekStr = week instanceof Date 
            ? week.toISOString().split('T')[0]
            : week;
        return this.weekSet.has(weekStr);
    }

    /**
     * Get the index of a week in the timeline
     * @param {string|Date} week - Week to find
     * @returns {number} - Index or -1 if not found
     */
    getWeekIndex(week) {
        const weekStr = week instanceof Date 
            ? week.toISOString().split('T')[0]
            : week;
        return this.completeWeeks.indexOf(weekStr);
    }

    /**
     * Get week at a specific index
     * @param {number} index - Index in timeline
     * @returns {string|null} - Week string or null if out of bounds
     */
    getWeekAtIndex(index) {
        if (index >= 0 && index < this.completeWeeks.length) {
            return this.completeWeeks[index];
        }
        return null;
    }

    /**
     * Get total number of weeks
     * @returns {number}
     */
    getWeekCount() {
        return this.completeWeeks.length;
    }

    /**
     * Convert week strings to Date objects
     * @returns {Array} - Array of Date objects
     */
    getWeeksAsDate() {
        return this.completeWeeks.map(week => new Date(week));
    }
}
