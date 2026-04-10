(() => {
    let hideTimer;
    const supabaseUrl = 'https://solsneywdlhvwbtghopw.supabase.co';
    const supabaseKey = 'sb_publishable_dlFufI-1QXA4VJdGoMWxMw_ouWHyl3k';

    if (!window.supabaseClient) {
        window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    }

    const DEFAULT_STATUS = { out_human: 0, out_ai: 0, out_score: 0, out_verified: false, my_current_vote: null };

    const VERIFIED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="var(--human)" style="flex-shrink:0;margin-left:4px">
        <path d="M12 1l2.9 3.4L19 3l.7 4.1L24 9l-2 3.9 2 3.9-4.3 1.9L19 23l-4.1-1.4L12 24l-2.9-2.6L5 23l-.7-4.1L0 16.8l2-3.9L0 9l4.3-1.9L5 3l4.1 1.4z"/>
        <polyline points="7,12.5 10.5,16 17,9" stroke="#052e16" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    function getVerdictColor(label, pct) {
        if (label === 'AI') return pct >= 50 ? '#ef4444' : '#f59e0b';
        if (label === 'HUMAN') return pct >= 50 ? '#22c55e' : '#10b981';
        return '#71717a';
    }

    async function fetchArtistStatus(artist) {
        try {
            const { data, error } = await window.supabaseClient.rpc('get_artist_status', {
                target_id: artist.toLowerCase()
            });
            if (error) { console.error('[AI Guard] get_artist_status error:', error); return DEFAULT_STATUS; }
            if (Array.isArray(data) && data.length > 0) return data[0];
            if (data && typeof data === 'object' && !Array.isArray(data)) return data;
            return DEFAULT_STATUS;
        } catch (err) {
            console.error('[AI Guard] Fetch failed:', err);
            return DEFAULT_STATUS;
        }
    }

    window.showPopup = async function(container, badge, human, artist) {
        clearTimeout(hideTimer);
        const existingHost = document.body.querySelector('.ai-guard-wrapper');
        if (existingHost) existingHost.remove();

        const host = document.createElement('div');
        host.className = 'ai-guard-wrapper';
        const shadow = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@500&family=Saira+Extra+Condensed:wght@700;800&display=swap');

            :host { 
                all: initial; 
                --human: #22c55e; 
                --human-low: #10b981;
                --ai: #ef4444; 
                --ai-low: #f59e0b;
                --bg: #0c0c0e; 
                --text: #f4f4f5; 
                --dim: #71717a; 
            }

            .card {
                width: 360px; padding: 18px; background: var(--bg);
                border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
                color: var(--text); font-family: 'Inter', sans-serif;
                box-shadow: 0 12px 40px rgba(0,0,0,0.6);
                animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1);
            }

            @keyframes pop { 
                from { opacity: 0; transform: translateY(10px) scale(0.98); } 
                to   { opacity: 1; transform: translateY(0) scale(1); } 
            }

            .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px; }
            .name-box { flex: 1; min-width: 0; }
            .name { font-size: 20px; font-weight: 800; line-height: 1.1; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; overflow-wrap: break-word; }
            .sub { font-size: 10px; color: #a1a1aa; text-decoration: none; font-weight: 600; display: block; }
            .sub:hover { color: var(--text); text-decoration: underline; }

            .verdict { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
            .pct { font-family: 'Saira Extra Condensed', sans-serif; font-size: clamp(32px, 5vw, 48px); font-weight: 800; line-height: 0.8; }
            .tag { font-family: 'Saira Extra Condensed', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; margin-top: 8px; }

            .meter-bar { height: 6px; background: rgba(255,255,255,0.08); border-radius: 100px; overflow: hidden; display: flex; margin-bottom: 5px; }
            .fill { transition: width 0.8s cubic-bezier(0.2, 0, 0, 1); }

            .stats { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 9px; margin-bottom: 15px; }

            .btns { display: flex; gap: 8px; margin-bottom: 15px; height: 42px; }
            .btn {
                flex: 1; border-radius: 9px; border: 2.5px solid transparent; cursor: pointer;
                font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .btn-h { background: var(--human); color: #052e16; border-color: var(--human); }
            .btn-a { background: var(--ai); color: #450a0a; border-color: var(--ai); }
            .btn-h:hover { background: transparent !important; color: var(--human); }
            .btn-a:hover { background: transparent !important; color: var(--ai); }
            .btn.voted-h { background: transparent !important; color: var(--human); border-color: var(--human); flex: 1.6 !important; }
            .btn.voted-a { background: transparent !important; color: var(--ai); border-color: var(--ai); flex: 1.6 !important; }
            .btn.voted-h:hover { background: var(--human) !important; color: #052e16; }
            .btn.voted-a:hover { background: var(--ai) !important; color: #450a0a; }
            .btns:hover .btn:not(:hover) { flex: 0.6; opacity: 0.6; }
            .btns .btn:hover { flex: 1.8; }

            .btn-locked {
                flex: 1; background: transparent; color: var(--dim);
                border: 1.5px dashed rgba(255,255,255,0.1); cursor: default;
                font-size: 11px; font-weight: 500; border-radius: 9px;
                display: flex; align-items: center; justify-content: center;
            }

            /* Skeleton loading */
            .skeleton { animation: pulse 1.2s ease-in-out infinite; background: rgba(255,255,255,0.06); border-radius: 4px; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

            .footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); }
            .skip { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; }

            .skip-input-wrapper { position: relative; display: flex; align-items: center; }
            .skip-in {
                width: 52px; background: #18181b; border: 1.5px solid #333; color: var(--human);
                border-radius: 6px; text-align: left; font-family: 'Saira Extra Condensed', sans-serif;
                font-size: 16px; font-weight: 700; padding: 3px 18px 3px 6px;
                appearance: textfield; transition: border-color 0.2s;
            }
            .skip-in::-webkit-outer-spin-button,
            .skip-in::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            .skip-in:focus { outline: none; border-color: var(--human); }
            .pct-symbol { position: absolute; right: 6px; font-size: 9px; color: var(--dim); pointer-events: none; }
            .ai-label { color: var(--dim); font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }

            .appeal {
                font-size: 10px; color: var(--dim); cursor: pointer; text-decoration: none;
                background: rgba(255,255,255,0.05); padding: 5px 12px; border-radius: 100px;
                display: flex; align-items: center; overflow: hidden; white-space: nowrap;
                max-width: 65px; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2);
            }
            .appeal:hover { max-width: 180px; background: rgba(255,255,255,0.1); color: var(--text); }
            .full { opacity: 0; width: 0; transition: 0.3s; margin-left: 0; }
            .appeal:hover .full { opacity: 0.8; width: auto; margin-left: 4px; }
        `;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="top">
                <div class="name-box">
                    <div class="name">${artist}</div>
                    <a href="https://github.com/NuclearBlox/Check-SoulOverAI-extension/wiki/How-songs-status-gets-decided" target="_blank" class="sub">How it's decided →</a>
                </div>
                <div class="verdict">
                    <div class="pct" style="color:var(--dim)">—%</div>
                    <div class="tag" style="color:var(--dim)">...</div>
                </div>
            </div>
            <div class="meter-bar"><div class="fill skeleton" style="width:100%"></div></div>
            <div class="stats">
                <span style="color:#3f3f46">+0 human</span>
                <span style="color:#3f3f46">+0 AI</span>
            </div>
            <div class="btns">
                <button class="btn btn-h" disabled>Human</button>
                <button class="btn btn-a" disabled>AI</button>
            </div>
            <div class="footer">
                <div class="skip">
                    Skip past
                    <div class="skip-input-wrapper">
                        <input type="number" id="skip-in" class="skip-in" value="50">
                        <span class="pct-symbol">%</span>
                    </div>
                    <span class="ai-label">AI</span>
                </div>
                <a href="https://github.com/NuclearBlox/Check-SoulOverAI-extension/wiki/Appealing-an-incorrect-rating" target="_blank" class="appeal">
                    <span>Appeal</span><span class="full">Mistake?</span>
                </a>
            </div>
        `;

        const rect = badge.getBoundingClientRect();
        host.style.cssText = `position: fixed; left: ${rect.left + rect.width / 2}px; top: ${rect.top - 12}px; transform: translate(-50%, -100%); z-index: 2147483647;`;
        shadow.appendChild(style);
        shadow.appendChild(card);
        document.body.appendChild(host);
        host.onmouseenter = () => clearTimeout(hideTimer);
        host.onmouseleave = () => window.hidePopup();

        const [status, res] = await Promise.all([
            fetchArtistStatus(artist),
            chrome.storage.local.get('threshold')
        ]);

        if (!document.body.contains(host)) return;

        const threshold = res.threshold || 50;
        const total = status.out_human + status.out_ai;
        const isEmpty = total === 0;
        let hPct = 0, aPct = 0, displayPct = 0, label = 'UNKNOWN';

        if (!isEmpty) {
            hPct = Math.round((status.out_human / total) * 100);
            aPct = 100 - hPct;
            displayPct = Math.round((Math.abs(status.out_human - status.out_ai) / total) * 100);
            if (status.out_human > status.out_ai) label = 'HUMAN';
            else if (status.out_ai > status.out_human) label = 'AI';
            else label = 'TIE';
        }

        const themeColor = getVerdictColor(label, displayPct);

        // Patch name + verified badge
        shadow.querySelector('.name').innerHTML = 
            artist + (status.out_verified ? VERIFIED_SVG : '');

        // Patch verdict
        shadow.querySelector('.pct').style.color = themeColor;
        shadow.querySelector('.pct').textContent = isEmpty ? '—%' : `${displayPct}%`;
        shadow.querySelector('.tag').style.color = themeColor;
        shadow.querySelector('.tag').textContent = label;

        // Patch meter
        shadow.querySelector('.meter-bar').innerHTML = isEmpty
            ? '<div class="fill" style="width:100%;background:#3f3f46"></div>'
            : `<div class="fill" style="width:${hPct}%;background:var(--human)"></div>
               <div class="fill" style="width:${aPct}%;background:var(--ai)"></div>`;

        // Patch stats
        const [humanStat, aiStat] = shadow.querySelectorAll('.stats span');
        humanStat.style.color = isEmpty ? '#3f3f46' : 'var(--human)';
        humanStat.textContent = `+${status.out_human} human`;
        aiStat.style.color = isEmpty ? '#3f3f46' : 'var(--ai)';
        aiStat.textContent = `+${status.out_ai} AI`;

        // Patch buttons — handle locked state
        const btns = shadow.querySelector('.btns');
        if (status.out_verified) {
            btns.innerHTML = `<button class="btn btn-locked">Locked · Moderated result.</button>`;
        } else {
            const [vH, vA] = btns.querySelectorAll('.btn');
            vH.removeAttribute('disabled');
            vA.removeAttribute('disabled');
            if (status.my_current_vote === 'human') vH.classList.add('voted-h');
            if (status.my_current_vote === 'ai') vA.classList.add('voted-a');
            vH.onclick = () => castVote(artist, 'human', badge);
            vA.onclick = () => castVote(artist, 'ai', badge);
        }

        shadow.querySelector('#skip-in').value = threshold;
        shadow.querySelector('#skip-in').onchange = (e) => 
            chrome.storage.local.set({ threshold: e.target.value });
    };

    window.hidePopup = function() {
        hideTimer = setTimeout(() => {
            const host = document.body.querySelector('.ai-guard-wrapper');
            if (host) host.remove();
        }, 300);
    };

    async function castVote(artistName, type, badge) {
        try {
            const { error } = await window.supabaseClient.rpc('handle_vote', {
                artist_id_input: artistName,
                vote_type_input: type
            });
            if (error) console.error('[AI Guard] handle_vote error:', error);
            window.showPopup(null, badge, null, artistName);
        } catch (err) {
            console.error('[AI Guard] Vote failed:', err);
        }
    }
})();