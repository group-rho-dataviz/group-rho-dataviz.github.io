export default function updateInfoWindow(weekData) {
    const mobileBtn = document.getElementById('mobile-info-toggle-button');
    const desktopBox = document.getElementById('desktop-info-box');

    const infoTextEls = document.querySelectorAll('.information-text');
    const infoLinkEls = document.querySelectorAll('.information-link');

    // Check if chord view is currently visible
    const chordContainer = document.getElementById('chord-container');
    const isChordViewActive = chordContainer && !chordContainer.classList.contains('hidden');

    // If chord view is active, always hide the infobox
    if (isChordViewActive) {
        mobileBtn?.classList.add('hidden');
        desktopBox?.classList.add('lg:hidden');
        
        // Clear content
        infoTextEls.forEach(el => {
            el.textContent = '';
            el.innerHTML = '';
        });
        infoLinkEls.forEach(el => {
            el.removeAttribute('href');
            el.innerHTML = '';
            el.className = 'information-link inline-flex items-center gap-2 lg:gap-1.5 text-orange-600 font-sans font-semibold hover:text-orange-700 transition-colors text-sm lg:text-xs group';
        });
        return;
    }

    // Take first row for the week (0 or 1 expected)
    const row = weekData && weekData.length > 0 ? weekData[0] : null;

    // Check if we have valid data (row exists, info is not null/undefined, and it's not an empty string)
    if (row && row.info !== null && row.info !== undefined && row.info !== '') {
        // SHOW (Tailwind-driven)
        mobileBtn?.classList.remove('hidden');   // still lg:hidden in HTML
        desktopBox?.classList.remove('lg:hidden');  // still lg:block in HTML

        // Parse info (might be JSON object/array or string)
        let infoArray = [];
        try {
            let parsed = row.info;
            
            if (typeof parsed === 'string') {
                // Handle format like {'item1','item2'}
                if (parsed.trim().startsWith('{') && parsed.trim().endsWith('}')) {
                    // Remove outer braces
                    parsed = parsed.trim().slice(1, -1);
                    // Split by ',' but handle quotes properly
                    infoArray = parsed.split(/','/).map(item => 
                        item.replace(/^'/, '').replace(/'$/, '').trim()
                    );
                } else if (parsed.trim().startsWith('[')) {
                    // Handle standard JSON array
                    infoArray = JSON.parse(parsed);
                } else {
                    infoArray = [parsed];
                }
            } else if (Array.isArray(parsed)) {
                infoArray = parsed;
            } else {
                infoArray = [parsed];
            }
        } catch (e) {
            console.error('Error parsing info:', e);
            infoArray = [row.info];
        }

        // Parse url (might be JSON object/array or string)
        let urlArray = [];
        try {
            let parsed = row.url;
            
            // Only parse if url is not null/undefined
            if (parsed !== null && parsed !== undefined && parsed !== '') {
                if (typeof parsed === 'string') {
                    // Handle format like {'url1','url2'}
                    if (parsed.trim().startsWith('{') && parsed.trim().endsWith('}')) {
                        // Remove outer braces
                        parsed = parsed.trim().slice(1, -1);
                        // Split by ',' but handle quotes properly
                        urlArray = parsed.split(/','/).map(item => 
                            item.replace(/^'/, '').replace(/'$/, '').trim()
                        );
                    } else if (parsed.trim().startsWith('[')) {
                        // Handle standard JSON array
                        urlArray = JSON.parse(parsed);
                    } else {
                        urlArray = [parsed];
                    }
                } else if (Array.isArray(parsed)) {
                    urlArray = parsed;
                } else {
                    urlArray = [parsed];
                }
            }
        } catch (e) {
            console.error('Error parsing url:', e);
            urlArray = row.url ? [row.url] : [];
        }

        // Update text - display as list if multiple items
        infoTextEls.forEach(el => {
            if (!el || !el.parentNode) return; // Safety check
            
            if (infoArray.length === 1) {
                el.textContent = infoArray[0];
            } else {
                // Create a list of news items
                el.innerHTML = '';
                const list = document.createElement('ul');
                list.className = 'space-y-2';
                
                infoArray.forEach((info, index) => {
                    const li = document.createElement('li');
                    li.className = 'flex gap-2';
                    li.innerHTML = `<span class="font-bold text-orange-600">•</span><span>${info}</span>`;
                    list.appendChild(li);
                });
                
                el.appendChild(list);
            }
        });

        // Update links
        infoLinkEls.forEach(el => {
            if (!el || !el.parentNode) return; // Safety check
            
            // Clear existing content
            el.innerHTML = '';
            
            if (infoArray.length === 1) {
                // Single link - keep original structure
                el.href = urlArray[0] || '#';
                el.className = 'information-link inline-flex items-center gap-2 lg:gap-1.5 text-orange-600 font-sans font-semibold hover:text-orange-700 transition-colors text-sm lg:text-xs group';
                el.innerHTML = `Learn more 
                    <svg class="w-4 h-4 lg:w-3.5 lg:h-3.5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                    </svg>`;
            } else {
                // Multiple links - create numbered links for each story
                el.removeAttribute('href');
                el.className = 'information-link flex flex-col gap-2';
                
                infoArray.forEach((info, index) => {
                    const linkEl = document.createElement('a');
                    linkEl.href = urlArray[index] || '#';
                    linkEl.target = '_blank';
                    linkEl.rel = 'noopener noreferrer';
                    linkEl.className = 'inline-flex items-center gap-1.5 text-orange-600 font-sans font-semibold hover:text-orange-700 transition-colors text-sm lg:text-xs group';
                    linkEl.innerHTML = `Read story ${index + 1}
                        <svg class="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                        </svg>`;
                    el.appendChild(linkEl);
                });
            }
        });

    } else {
        // HIDE
        mobileBtn?.classList.add('hidden');
        desktopBox?.classList.add('lg:hidden');

        // Clear content (important to avoid stale state)
        infoTextEls.forEach(el => {
            el.textContent = '';
            el.innerHTML = '';
        });

        infoLinkEls.forEach(el => {
            el.removeAttribute('href');
            el.innerHTML = '';
            el.className = 'information-link inline-flex items-center gap-2 lg:gap-1.5 text-orange-600 font-sans font-semibold hover:text-orange-700 transition-colors text-sm lg:text-xs group';
        });
    }
}

// Export a hide function for explicit hiding
export function hideInfoWindow() {
    const mobileBtn = document.getElementById('mobile-info-toggle-button');
    const desktopBox = document.getElementById('desktop-info-box');
    const infoTextEls = document.querySelectorAll('.information-text');
    const infoLinkEls = document.querySelectorAll('.information-link');

    mobileBtn?.classList.add('hidden');
    desktopBox?.classList.add('lg:hidden');
    
    infoTextEls.forEach(el => {
        el.textContent = '';
        el.innerHTML = '';
    });
    infoLinkEls.forEach(el => {
        el.removeAttribute('href');
        el.innerHTML = '';
        el.className = 'information-link inline-flex items-center gap-2 lg:gap-1.5 text-orange-600 font-sans font-semibold hover:text-orange-700 transition-colors text-sm lg:text-xs group';
    });
}