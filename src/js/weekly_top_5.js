// TO DO: TOGGLE FOR WEIGHTED / UNWEIGHTED MENTIONS

// Track previous week's rankings
let previousRankings = new Map();

export default function updateTop5Countries(weekData) {
    // Get top 5 for current week and sort
    const top5 = weekData
        .sort((a, b) => b.material_conflict_mentions - a.material_conflict_mentions)
        .slice(0, 25);
    
    // Create current rankings map
    const currentRankings = new Map();
    top5.forEach((d, index) => {
        currentRankings.set(d.conflict_country_name, index + 1);
    });
    
    // Update each position (1-5)
    for (let i = 0; i < 5; i++) {
        const position = i + 1;
        const data = top5[i];
        
        if (data) {
            // Update country name
            const nameEl = document.querySelector(`.country-name-${position}`);
            if (nameEl) {
                nameEl.textContent = data.conflict_country_name;
            }
            
            // Update mentions count
            const mentionsEl = document.querySelector(`.mentions-count-${position}`);
            if (mentionsEl) {
                mentionsEl.textContent = `${data.material_conflict_mentions.toLocaleString()} Mentions`;
            }
            
            // Update rank change indicator
            const rankChangeEl = document.querySelector(`.rank-change-${position}`);
            if (rankChangeEl) {
                const currentRank = position;
                const previousRank = previousRankings.get(data.conflict_country_name);
                
                if (previousRank === undefined) {
                    // New entry
                    rankChangeEl.innerHTML = '<span class="text-green-400">↑ NEW</span>';
                } else if (previousRank < currentRank) {
                    // Moved down
                    rankChangeEl.innerHTML = `<span class="text-red-400">↓ (${previousRank})</span>`;
                } else if (previousRank > currentRank) {
                    // Moved up
                    rankChangeEl.innerHTML = `<span class="text-green-400">↑ (${previousRank})</span>`;
                } else {
                    // Same position
                    rankChangeEl.innerHTML = `<span class="text-blue-400">− (${previousRank})</span>`;
                }
            }
        } else {
            // No data for this position - show placeholder
            const nameEl = document.querySelector(`.country-name-${position}`);
            if (nameEl) nameEl.textContent = '—';
            
            const mentionsEl = document.querySelector(`.mentions-count-${position}`);
            if (mentionsEl) mentionsEl.textContent = '— Mentions';
            
            const rankChangeEl = document.querySelector(`.rank-change-${position}`);
            if (rankChangeEl) rankChangeEl.innerHTML = '';
        }
    }
    
    // Update previous rankings for next comparison
    previousRankings = currentRankings;
}