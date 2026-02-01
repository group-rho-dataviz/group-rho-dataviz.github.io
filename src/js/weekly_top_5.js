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
            const nameEls = document.querySelectorAll(`.country-name-${position}`);
            if (nameEls) {
                nameEls.forEach(el => {
                    el.textContent = data.conflict_country_name;
                });
            }

            // Update mobile country name
            const mobileNameEls = document.querySelectorAll(`.mobile-country-name-${position}`);
            if (mobileNameEls) {
                mobileNameEls.forEach(el => {
                    if (data.conflict_country_name == 'United States') {
                        el.textContent = 'U.S.';
                    } 
                    else if (data.conflict_country_name == 'United Kingdom') {
                        el.textContent = 'U.K.';
                    } 
                    else {    
                        el.textContent = data.conflict_country_name;
                    }
                });
            }

            
            // Update mentions count
            const mentionsEls = document.querySelectorAll(`.mentions-count-${position}`);
            if (mentionsEls) {
                mentionsEls.forEach(el => {
                    el.textContent = `${data.material_conflict_mentions.toLocaleString()}`;
                });
            }
            
            // Update rank change indicator
            const rankChangeEls = document.querySelectorAll(`.rank-change-${position}`);
            if (rankChangeEls) {
                const currentRank = position;
                const previousRank = previousRankings.get(data.conflict_country_name);
                
                if (previousRank === undefined) {
                    // New entry
                    rankChangeEls.forEach(el => {
                        el.innerHTML = '<span class="text-green-400">↑ NEW</span>';
                    });
                } else if (previousRank < currentRank) {
                    // Moved down
                    rankChangeEls.forEach(el => {
                        el.innerHTML = `<span class="text-red-400">↓ (${previousRank})</span>`;
                    });
                } else if (previousRank > currentRank) {
                    // Moved up
                    rankChangeEls.forEach(el => {
                        el.innerHTML = `<span class="text-green-400">↑ (${previousRank})</span>`;
                    });
                } else {
                    // Same position
                    rankChangeEls.forEach(el => {
                        el.innerHTML = `<span class="text-blue-400">− (${previousRank})</span>`;
                    });
                }
            }
        } else {
            // No data for this position - show placeholder
            const nameEls = document.querySelectorAll(`.country-name-${position}`);
            if (nameEls) {
                nameEls.forEach(el => {
                    el.textContent = '—';
                });
            }
            
            const mentionsEls = document.querySelectorAll(`.mentions-count-${position}`);
            if (mentionsEls) {
                mentionsEls.forEach(el => {
                    el.textContent = '— Mentions';
                });
            }
            
            const rankChangeEls = document.querySelectorAll(`.rank-change-${position}`);
            if (rankChangeEls) {
                rankChangeEls.forEach(el => {
                    el.innerHTML = '';
                });
            }
        }
    }
    
    // Update previous rankings for next comparison
    previousRankings = currentRankings;
}