(() => {
    
    
    window.DecideBadge = async function(AIwidth, humanWidth, selector, badgeLocation, skipElement, padding) {
        const artistElement = document.querySelector(selector);
        if (!artistElement) return;

        let artistName = artistElement.textContent.trim();

        try {
            const { data, error } = await window.supabaseClient.rpc('get_artist_status', { 
                target_id: artistName 
            });

            const status = (data && data[0]) ? data[0] : { out_score: 0, out_verified: false };
            const isAI = status.out_verified || status.out_score > 0;

            if (isAI) {
                ShowWarningBadge(AIwidth, badgeLocation, artistName, padding);
            } else {
                ShowHumanBadge(humanWidth, badgeLocation, artistName, padding);
            }
        } catch (err) {
            console.error("Supabase Error:", err);
            ShowHumanBadge(humanWidth, badgeLocation, artistName, padding);
        }
    };
})();