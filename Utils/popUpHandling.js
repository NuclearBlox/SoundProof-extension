// =============================================================================
// SoundProof popup
//
// NOTE: The popup code lives in its own file because of Chrome being terified of CSS for (security) reasons.
// could only be fixed by moving it here. If you refactor further, be careful
// with the shadow DOM and event listeners; I hate them so much and hope they die.
//
// Expects (defined in other content scripts / libs):
//   - supabase                    (supabase-js global)
//   - getArtistStatus(artist, platformClass, flag)
//   - window.renderLocalListBanner(...)   [optional]
//
// Layout of this file:
//   1. Config & constants
//   2. Small helpers
//   3. API calls
//   4. Popup CSS
//   5. Popup HTML template
//   6. Positioning
//   7. Render functions (one per section of the card)
//   8. Public entry points: showPopup / hidePopup / castVote
// =============================================================================


// -----------------------------------------------------------------------------
// 1. Config & constants
// -----------------------------------------------------------------------------

const LOG_PREFIX = '[SoundProof]';

const SUPABASE_URL = 'https://solsneywdlhvwbtghopw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dlFufI-1QXA4VJdGoMWxMw_ouWHyl3k';

const WIKI_BASE = 'https://github.com/NuclearBlox/Check-SoulOverAI-extension/wiki';
const WIKI_HOW_IT_WORKS = `${WIKI_BASE}/How-songs-status-gets-decided`;
const WIKI_APPEAL = `${WIKI_BASE}/Appealing-an-incorrect-rating`;

const DEFAULT_THRESHOLD = 50;
const DEFAULT_MIN_VOTES = 3;
const POPUP_WIDTH = 360;
const POPUP_MARGIN = 12;
const POPUP_FALLBACK_HEIGHT = 260;
const HIDE_DELAY_MS = 300;

const DEFAULT_STATUS = {
    out_human: 0,
    out_ai: 0,
    out_score: 0,
    out_verified: false,
    my_current_vote: null
};

const VERIFIED_ICON = `
    <span class="tooltip-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 -960 960 960" fill="#22c55e" style="flex-shrink:0;display:block">
            <path d="m344-60-76-128-144-32 14-148-98-112 98-112-14-148 144-32 76-128 136 58 136-58 76 128 144 32-14 148 98 112-98 112 14 148-144 32-76 128-136-58-136 58Zm94-278 226-226-56-58-170 170-86-84-56 58 142 140Z"/>
        </svg>
        <span class="tooltip">A human moderator has reviewed this artist and confirmed the rating — either through a high vote count or a resolved report.</span>
    </span>`;

const LOCK_ICON = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="#71717a" style="flex-shrink:0">
        <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm240-200q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"/>
    </svg>`;

let hideTimer;

if (!window.supabaseClient) {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}


// -----------------------------------------------------------------------------
// 2. Small helpers
// -----------------------------------------------------------------------------

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function getVerdictColor(label, pct) {
    if (label === 'AI')    return pct >= 50 ? '#ef4444' : '#f59e0b';
    if (label === 'HUMAN') return pct >= 50 ? '#22c55e' : '#10b981';
    return '#71717a';
}

// Turns raw vote counts into everything the card needs to display.
function computeVerdict(status) {
    const total = status.out_human + status.out_ai;
    const isEmpty = total === 0;

    let hPct = 0, aPct = 0, displayPct = 0, label = 'UNKNOWN';

    if (!isEmpty) {
        hPct = Math.round((status.out_human / total) * 100);
        aPct = 100 - hPct;
        displayPct = Math.round((Math.abs(status.out_human - status.out_ai) / total) * 100);

        if (status.out_human > status.out_ai)      label = 'HUMAN';
        else if (status.out_ai > status.out_human) label = 'AI';
        else                                       label = 'TIE';
    }

    return {
        isEmpty,
        hPct,
        aPct,
        displayPct,
        label,
        themeColor: getVerdictColor(label, displayPct)
    };
}

function removeExistingPopup() {
    const existing = document.body.querySelector('.ai-guard-wrapper');
    if (existing) existing.remove();
}


// -----------------------------------------------------------------------------
// 3. API calls
// -----------------------------------------------------------------------------

async function fetchArtistStatus(artist, platformClass) {
    try {
        const { data, error } = await window.supabaseClient.rpc('get_artist_status', {
            target_id: artist.toLowerCase(),
            platform_input: platformClass
        });

        if (error) {
            console.error(LOG_PREFIX, 'get_artist_status error:', error);
            return DEFAULT_STATUS;
        }
        if (Array.isArray(data) && data.length > 0) return data[0];
        if (data && typeof data === 'object' && !Array.isArray(data)) return data;
        return DEFAULT_STATUS;
    } catch (err) {
        console.error(LOG_PREFIX, 'Fetch failed:', err);
        return DEFAULT_STATUS;
    }
}

async function castVote(artistName, type, badge, platformClass) {
    try {
        const { error } = await window.supabaseClient.rpc('handle_vote', {
            artist_id_input: artistName,
            vote_type_input: type,
            platform_input: platformClass
        });
        if (error) console.error(LOG_PREFIX, 'handle_vote error:', error);

        // Re-open the popup so it shows the fresh counts.
        window.showPopup(null, badge, null, artistName, platformClass);
    } catch (err) {
        console.error(LOG_PREFIX, 'Vote failed:', err);
    }
}


// -----------------------------------------------------------------------------
// 4. Popup CSS (lives inside the shadow DOM)
// -----------------------------------------------------------------------------

const POPUP_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@500&family=Saira+Extra+Condensed:wght@700;800&family=Bebas+Neue&display=swap');

    /* ---- Theme ---- */
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

    /* ---- Card ---- */
    .card {
        width: 360px; padding: 18px;
        background: rgba(12, 12, 14, 0.82);
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
        color: var(--text); font-family: 'Inter', sans-serif;
        box-shadow: 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
        animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1);
        position: relative; overflow: hidden;
    }

    @keyframes pop {
        from { opacity: 0; transform: translateY(10px) scale(0.98); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .glow-orb {
        position: absolute; top: -60px; right: -60px;
        width: 220px; height: 220px; border-radius: 50%;
        filter: blur(55px); opacity: 0.45; z-index: 0;
        transition: background 0.6s ease;
        pointer-events: none;
    }

    .top, .meter-bar, .stats, .btns, .footer { position: relative; z-index: 1; }

    /* ---- Header: name + verdict ---- */
    .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px; }
    .name-box { flex: 1; min-width: 0; }
    .name { font-size: 20px; font-weight: 800; line-height: 1.1; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; overflow-wrap: break-word; align-self: flex-start; }
    .sub { font-size: 10px; color: #a1a1aa; text-decoration: none; font-weight: 600; display: block; }
    .sub:hover { color: var(--text); text-decoration: underline; }

    .verdict { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; position: relative; }
    .pct { font-family: 'Bebas Neue', sans-serif; font-size: 56px; font-weight: 400; line-height: 0.85; letter-spacing: 0.01em; position: relative; z-index: 1; }
    .tag { font-family: 'Saira Extra Condensed', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; margin-top: 6px; position: relative; z-index: 1; }

    /* ---- Meter + stats ---- */
    .meter-bar { height: 6px; background: rgba(255,255,255,0.08); border-radius: 100px; overflow: hidden; display: flex; margin-bottom: 5px; }
    .fill { transition: width 0.8s cubic-bezier(0.2, 0, 0, 1); }

    .stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 2px; }
    .stat-val { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; letter-spacing: -0.02em; }
    .stat-val .plus { font-size: 10px; font-weight: 500; margin-right: 1px; opacity: 0.8; }
    .stat-label { font-size: 9px; font-weight: 500; opacity: 0.5; margin-left: 3px; letter-spacing: 0.04em; text-transform: lowercase; font-family: 'Inter', sans-serif; }

    /* ---- Vote buttons ---- */
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
        flex: 1; background: rgba(255,255,255,0.06); color: var(--text);
        border: 1.5px solid rgba(255,255,255,0.15); cursor: default;
        font-size: 12px; font-weight: 700; border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        letter-spacing: 0.02em;
    }

    /* ---- Verified-badge tooltip ---- */
    .tooltip-wrap { position: relative; display: flex; align-items: center; cursor: default; }
    .tooltip {
        display: none; position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
        background: #1c1c1f; border: 1px solid rgba(255,255,255,0.12); color: #d4d4d8; font-size: 11px;
        font-weight: 400; line-height: 1.5; padding: 8px 10px; border-radius: 8px; width: 200px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5); pointer-events: none; z-index: 10;
    }

    /* ---- Loading skeleton ---- */
    .skeleton { animation: pulse 1.2s ease-in-out infinite; background: rgba(255,255,255,0.06); border-radius: 4px; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    /* ---- Footer: skip settings + report link ---- */
    .footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); }
    .skip { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; }

    .skip-input-wrapper { position: relative; display: flex; align-items: center; }

    .skip-in, .min-in {
        background: #18181b; border: 1.5px solid #333; color: var(--human);
        border-radius: 6px; text-align: left; font-family: 'Saira Extra Condensed', sans-serif;
        font-size: 16px; font-weight: 700;
        appearance: textfield;
    }
    .skip-in { width: 32px; padding: 3px 18px 3px 6px; transition: border-color 0.2s, color 0.2s; }
    .min-in  { width: 24px; padding: 3px 3px 3px 6px;  transition: border-color 0.2s; }

    .skip-in::-webkit-outer-spin-button, .skip-in::-webkit-inner-spin-button,
    .min-in::-webkit-outer-spin-button,  .min-in::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .skip-in:focus, .min-in:focus { outline: none; border-color: var(--human); }

    /* Red override when threshold is above 100% */
    .skip-in.is-over-max { color: #ef4444 !important; border-color: #ef4444 !important; }

    .skip-input-wrapper[data-tooltip]::after {
        content: attr(data-tooltip);
        position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
        background: #1c1c1f; border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5;
        font-size: 10px; font-weight: 600; white-space: nowrap;
        padding: 4px 8px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        opacity: 0; pointer-events: none; transition: opacity 0.2s ease; z-index: 20;
    }
    .skip-input-wrapper.has-tooltip:hover::after { opacity: 1; }

    .pct-symbol { position: absolute; right: 6px; font-size: 9px; color: var(--dim); pointer-events: none; }
    .ai-label { color: var(--dim); font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }

    .appeal {
        font-size: 11px; font-weight: 600; color: #a1a1aa; cursor: pointer; text-decoration: none;
        background: rgba(255,255,255,0.08); padding: 5px 12px; border-radius: 100px;
        display: flex; align-items: center; overflow: hidden; white-space: nowrap;
        max-width: 65px; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2);
    }
    .appeal:hover { max-width: 180px; background: rgba(255,255,255,0.15); color: var(--text); }
    .full { opacity: 0; width: 0; transition: 0.3s; margin-left: 0; }
    .appeal:hover .full { opacity: 1; width: auto; margin-left: 4px; }
`;


// -----------------------------------------------------------------------------
// 5. Popup HTML template (initial "loading" state)
// -----------------------------------------------------------------------------

function buildCardHtml(artist) {
    return `
        <div class="glow-orb" id="glow"></div>
        <div class="top">
            <div class="name-box">
                <div class="name">${escapeHtml(artist)}</div>
                <a href="${WIKI_HOW_IT_WORKS}" target="_blank" class="sub">How it works & FAQ →</a>
            </div>
            <div class="verdict">
                <div class="pct" style="color:var(--dim)">—%</div>
                <div class="tag" style="color:var(--dim)">...</div>
            </div>
        </div>
        <div class="meter-bar"><div class="fill skeleton" style="width:100%"></div></div>
        <div class="stats">
            <span class="stat-val" style="color:#3f3f46"><span class="plus">+</span>0<span class="stat-label">human</span></span>
            <span class="stat-val" style="color:#3f3f46"><span class="plus">+</span>0<span class="stat-label">AI</span></span>
        </div>
        <div class="btns">
            <button class="btn btn-h" disabled>Human</button>
            <button class="btn btn-a" disabled>AI</button>
        </div>
        <div class="footer">
            <div class="skip">
                Skip past
                <div class="skip-input-wrapper">
                    <input type="number" id="skip-in" class="skip-in" value="${DEFAULT_THRESHOLD}">
                    <span class="pct-symbol">%</span>
                </div>
                <span class="ai-label">AI</span>

                <span style="margin-left:6px;">with</span>

                <div class="min-votes-wrapper">
                    <input type="number" id="min-in" class="min-in" value="${DEFAULT_MIN_VOTES}">
                </div>
                <span class="ai-label">votes</span>
            </div>
            <a href="${WIKI_APPEAL}" target="_blank" class="appeal">
                <span>Report</span><span class="full">Mistake?</span>
            </a>
        </div>
    `;
}

// Creates the host element, shadow root, and card, and attaches it to the page.
// The host starts off-screen so we can measure it before positioning.
function buildPopup(artist) {
    const host = document.createElement('div');
    host.className = 'ai-guard-wrapper';
    host.style.cssText = 'position: fixed; left: -9999px; top: -9999px; z-index: 2147483647;';
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = POPUP_CSS;

    const bannerHost = document.createElement('div');
    bannerHost.id = 'locallist-banner';
    bannerHost.style.display = 'none';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = buildCardHtml(artist);

    shadow.appendChild(style);
    shadow.appendChild(bannerHost);
    shadow.appendChild(card);
    document.body.appendChild(host);

    return { host, shadow };
}


// -----------------------------------------------------------------------------
// 6. Positioning
// -----------------------------------------------------------------------------

function positionPopup(host, badge) {
    const rect = badge.getBoundingClientRect();
    const popH = host.getBoundingClientRect().height || POPUP_FALLBACK_HEIGHT;

    // Prefer above the badge, centered on it.
    let left = rect.left + rect.width / 2 - POPUP_WIDTH / 2;
    let top = rect.top - popH - POPUP_MARGIN;

    // Keep horizontally on screen.
    left = Math.max(POPUP_MARGIN, Math.min(left, window.innerWidth - POPUP_WIDTH - POPUP_MARGIN));

    // No room above? Go below.
    if (top < POPUP_MARGIN) {
        top = rect.bottom + POPUP_MARGIN;
    }

    // Keep vertically on screen, without covering the badge if possible.
    const maxTop = window.innerHeight - popH - POPUP_MARGIN;
    if (top > maxTop) {
        top = Math.max(POPUP_MARGIN, maxTop);
        if (top < rect.bottom + POPUP_MARGIN && top + popH > rect.top - POPUP_MARGIN) {
            top = rect.top - popH - POPUP_MARGIN;
        }
    }

    host.style.cssText = `
        position: fixed;
        left: ${left}px;
        top: ${top}px;
        z-index: 2147483647;
    `;
}


// -----------------------------------------------------------------------------
// 7. Render functions (each fills in one section of the card)
// -----------------------------------------------------------------------------

function renderHeader(shadow, artist, status, verdict) {
    const { isEmpty, displayPct, label, themeColor } = verdict;

    shadow.querySelector('.name').innerHTML =
        `<span>${escapeHtml(artist)}</span>` + (status.out_verified ? VERIFIED_ICON : '');

    shadow.querySelector('#glow').style.background = themeColor;

    const pctEl = shadow.querySelector('.pct');
    pctEl.style.color = themeColor;
    pctEl.textContent = isEmpty ? '—%' : `${displayPct}%`;

    const tagEl = shadow.querySelector('.tag');
    tagEl.style.color = themeColor;
    tagEl.textContent = label;
}

function renderMeter(shadow, verdict) {
    const { isEmpty, hPct, aPct } = verdict;

    shadow.querySelector('.meter-bar').innerHTML = isEmpty
        ? '<div class="fill" style="width:100%;background:#3f3f46"></div>'
        : `<div class="fill" style="width:${hPct}%;background:var(--human)"></div>
           <div class="fill" style="width:${aPct}%;background:var(--ai)"></div>`;
}

function renderStats(shadow, status, verdict) {
    const [humanStat, aiStat] = shadow.querySelectorAll('.stat-val');

    humanStat.style.color = verdict.isEmpty ? '#3f3f46' : 'var(--human)';
    humanStat.innerHTML = `<span class="plus">+</span>${status.out_human}<span class="stat-label">human</span>`;

    aiStat.style.color = verdict.isEmpty ? '#3f3f46' : 'var(--ai)';
    aiStat.innerHTML = `<span class="plus">+</span>${status.out_ai}<span class="stat-label">AI</span>`;
}

function renderVoteButtons(shadow, artist, status, badge, platformClass) {
    const btns = shadow.querySelector('.btns');

    if (status.out_verified) {
        btns.innerHTML = `<button class="btn btn-locked">${LOCK_ICON} Voting locked · Moderated result</button>`;
        return;
    }

    const [humanBtn, aiBtn] = btns.querySelectorAll('.btn');
    humanBtn.removeAttribute('disabled');
    aiBtn.removeAttribute('disabled');

    if (status.my_current_vote === 'human') humanBtn.classList.add('voted-h');
    if (status.my_current_vote === 'ai')    aiBtn.classList.add('voted-a');

    humanBtn.onclick = () => castVote(artist, 'human', badge, platformClass);
    aiBtn.onclick    = () => castVote(artist, 'ai', badge, platformClass);
}

function updateThresholdWarning(inputEl) {
    const val = Number(inputEl.value);
    const wrapper = inputEl.closest('.skip-input-wrapper');
    const isOverMax = val > 100;
    const message = 'This effectively disables soundproof';

    inputEl.classList.toggle('is-over-max', isOverMax);

    if (isOverMax) {
        inputEl.title = message;
        if (wrapper) {
            wrapper.classList.add('has-tooltip');
            wrapper.setAttribute('data-tooltip', message);
        }
    } else {
        inputEl.removeAttribute('title');
        if (wrapper) {
            wrapper.classList.remove('has-tooltip');
            wrapper.removeAttribute('data-tooltip');
        }
    }
}

function renderSettings(shadow, threshold, minVotes) {
    const skipInput = shadow.querySelector('#skip-in');
    const minInput = shadow.querySelector('#min-in');

    skipInput.value = threshold;
    minInput.value = minVotes;
    updateThresholdWarning(skipInput);

    skipInput.oninput = (e) => updateThresholdWarning(e.target);
    skipInput.onchange = (e) => {
        updateThresholdWarning(e.target);
        chrome.storage.local.set({ threshold: e.target.value });
    };
    minInput.onchange = (e) => chrome.storage.local.set({ minVotes: e.target.value });
}


// -----------------------------------------------------------------------------
// 8. Public entry points
// -----------------------------------------------------------------------------

window.showPopup = async function (container, badge, human, artist, platformClass) {
    clearTimeout(hideTimer);
    removeExistingPopup();

    const { host, shadow } = buildPopup(artist);

    host.onmouseenter = () => clearTimeout(hideTimer);
    host.onmouseleave = () => window.hidePopup();

    // Load vote status and saved settings in parallel.
    const [status, settings] = await Promise.all([
        getArtistStatus(artist, platformClass, true),
        chrome.storage.local.get(['threshold', 'minVotes'])
    ]);

    // Popup was dismissed while we were loading.
    if (!document.body.contains(host)) return;

    const threshold = settings.threshold ?? DEFAULT_THRESHOLD;
    const minVotes = settings.minVotes ?? DEFAULT_MIN_VOTES;
    const verdict = computeVerdict(status);

    renderHeader(shadow, artist, status, verdict);
    renderMeter(shadow, verdict);
    renderStats(shadow, status, verdict);
    renderVoteButtons(shadow, artist, status, badge, platformClass);
    renderSettings(shadow, threshold, minVotes);

    if (typeof window.renderLocalListBanner === 'function') {
        await window.renderLocalListBanner(shadow, artist, platformClass, status, badge, verdict.label);
    }

    requestAnimationFrame(() => positionPopup(host, badge));
};

window.hidePopup = function () {
    hideTimer = setTimeout(() => {
        const host = document.body.querySelector('.ai-guard-wrapper');
        if (host) host.remove();
    }, HIDE_DELAY_MS);
};