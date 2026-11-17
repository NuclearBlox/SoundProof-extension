// =============================================================================
// SoundProof popup
//
// NOTE: The popup code lives in its own file because Chromes *odd* security 
// doesnt allow CSS or HTML to be injected from a content script which
// could only be fixed by cramming a year of work into one file.
//  Masochist rejoice! with the shadow DOM and event listeners this file is a nightmare to debug and maintain, 
// but it works...mostly
//
// Expects (defined in other content scripts / libs):
//   - supabase                    (supabase-js global)
//   - getArtistStatus(artist, platformClass, flag)
//   - window.renderLocalListBanner(...)   [optional]
//   - from localListBanner.js (needed by the Personal view): PERSONAL_STORAGE_KEY,
//     normalizeKey, songKey, normalizePersonalBlock, loadPersonalBlock,
//     savePersonalBlock, tokenizeTitle
//
// Layout of this file:
//   1. Config & constants
//   2. Icons
//   3. Small helpers
//   4. API calls
//   5. Popup CSS
//   6. Popup HTML template
//   7. Positioning
//   8. Render functions (one per section of the card)
//   9. Public entry points: showPopup / hidePopup / castVote

// =============================================================================


// -----------------------------------------------------------------------------
// 1. Config & constants
// -----------------------------------------------------------------------------

const LOG_PREFIX = '[SoundProof]';


//    ██     ██  █████  ██ ████████      █████      ███████ ███████  ██████ ██ 
//    ██     ██ ██   ██ ██    ██        ██   ██     ██      ██      ██      ██ 
//    ██  █  ██ ███████ ██    ██        ███████     ███████ █████   ██      ██ 
//    ██ ███ ██ ██   ██ ██    ██        ██   ██          ██ ██      ██         
//     ███ ███  ██   ██ ██    ██        ██   ██     ███████ ███████  ██████ ██ 

// You can put the scraper away! The database is already free and updated daily at https://github.com/NuclearBlox/SoundProof-Dumps
// If you would like to use our data, please use the SoundProof dumps; our API is really only able to handle SoundProof itself (hence the heavy caching on the client).
// The dumps contain both the full dataset and everything that changed in the most recent update.
// If you need anything else, please open an issue! We would be happy to provide any data we have.

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

// Most term chips shown in the Personal view.
const MAX_TERMS = 16;

// The card has two views (AI, Personal) picked with the switcher in the footer.
// The third switcher button (Settings) opens the extension's settings page.
const VIEWS = ['ai', 'personal'];

const DEFAULT_STATUS = {
    out_human: 0,
    out_ai: 0,
    out_score: 0,
    out_verified: false,
    my_current_vote: null
};

let hideTimer;

if (!window.supabaseClient) {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}


// -----------------------------------------------------------------------------
// 2. Icons
// -----------------------------------------------------------------------------

const VERIFIED_ICON = `
    <span class="tooltip-wrap">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 -960 960 960"
            fill="#22c55e"
            style="flex-shrink: 0; display: block;"
        >
            <path d="
                m344-60-76-128-144-32 14-148-98-112 98-112-14-148 144-32 76-128
                136 58 136-58 76 128 144 32-14 148 98 112-98 112 14 148-144 32
                -76 128-136-58-136 58Zm94-278 226-226-56-58-170 170-86-84-56 58
                142 140Z
            "/>
        </svg>
        <span class="tooltip">
            A human moderator has reviewed this artist and confirmed the rating —
            either through a high vote count or a resolved report.
        </span>
    </span>
`;

const LOCK_ICON = `
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 -960 960 960"
        fill="#71717a"
        style="flex-shrink: 0;"
    >
        <path d="
            M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80
            q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5
            23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm240-200q33 0 56.5-23.5
            T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5
            56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85
            v80Z
        "/>
    </svg>
`;


const SWITCH_ICONS = {
    ai: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>
            <path d="M19 15v4M17 17h4"/>
        </svg>
    `,
    personal: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
    `,
    settings: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 6h8.5M17.5 6H20M4 12h1.5M10.5 12H20M4 18h6.5M15.5 18H20"/>
            <circle cx="15" cy="6" r="2.5"/>
            <circle cx="8" cy="12" r="2.5"/>
            <circle cx="13" cy="18" r="2.5"/>
        </svg>
    `
};


// -----------------------------------------------------------------------------
// 3. Small helpers
// -----------------------------------------------------------------------------

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
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

    let hPct = 0;
    let aPct = 0;
    let displayPct = 0;
    let label = 'UNKNOWN';

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
// 4. API calls
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

async function castVote(artistName, type, badge, platformClass, songTitle) {
    try {
        const { error } = await window.supabaseClient.rpc('handle_vote', {
            artist_id_input: artistName,
            vote_type_input: type,
            platform_input: platformClass
        });
        if (error) console.error(LOG_PREFIX, 'handle_vote error:', error);

        // Re-open the popup so it shows the fresh counts.
        window.showPopup(null, badge, null, artistName, platformClass, songTitle);
    } catch (err) {
        console.error(LOG_PREFIX, 'Vote failed:', err);
    }
}


// -----------------------------------------------------------------------------
// 5. Popup CSS (lives inside the shadow DOM)
// -----------------------------------------------------------------------------

const POPUP_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@500&family=Saira+Extra+Condensed:wght@700;800&family=Bebas+Neue&display=swap');


    /* ======================================================================
       Theme
       ====================================================================== */

    :host {
        all: initial;

        --human: #22c55e;
        --human-low: #10b981;
        --ai: #ef4444;
        --ai-low: #f59e0b;
        --bg: #0c0c0e;
        --text: #f4f4f5;
        --dim: #71717a;

        /* Chips */
        --SelectedColor: var(--ai);
        --primary: var(--bg);
        --pad-x: 10px;
        --pad-x-hover: 14px;
        --grow: calc(var(--pad-x-hover) - var(--pad-x));
        --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
        --easing: cubic-bezier(0.4, 0, 0.2, 1);
    }


    /* ======================================================================
       Card
       ====================================================================== */

    .card {
        position: relative;
        overflow: hidden;

        width: 360px;
        padding: 18px;

        background: rgba(12, 12, 14, 0.82);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);

        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;

        color: var(--text);
        font-family: 'Inter', sans-serif;

        box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);

        animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1);
    }

    @keyframes pop {
        from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .glow-orb {
        position: absolute;
        top: -60px;
        right: -60px;
        z-index: 0;

        width: 220px;
        height: 220px;

        border-radius: 50%;
        filter: blur(55px);
        opacity: 0.45;

        transition: background 0.6s ease;
        pointer-events: none;
    }

    /* Keep real content above the glow orb */
    .top,
    .views,
    .footer {
        position: relative;
        z-index: 1;
    }


    /* ======================================================================
       Header: artist name + verdict
       ====================================================================== */

    .top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }

    .name-box {
        flex: 1;
        min-width: 0;
    }

    .name {
        display: flex;
        align-items: center;
        align-self: flex-start;
        gap: 6px;

        margin-bottom: 6px;

        font-size: 20px;
        font-weight: 800;
        line-height: 1.1;
        overflow-wrap: break-word;
    }

    .sub {
        display: block;

        font-size: 10px;
        font-weight: 600;
        color: #a1a1aa;
        text-decoration: none;
    }

    .sub:hover {
        color: var(--text);
        text-decoration: underline;
    }

    .verdict {
        position: relative;
        flex-shrink: 0;

        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .pct {
        position: relative;
        z-index: 1;

        font-family: 'Bebas Neue', sans-serif;
        font-size: 56px;
        font-weight: 400;
        line-height: 0.85;
        letter-spacing: 0.01em;
    }

    .tag {
        position: relative;
        z-index: 1;

        margin-top: 6px;

        font-family: 'Saira Extra Condensed', sans-serif;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.05em;
    }


    /* ======================================================================
       Meter + vote counts
       ====================================================================== */

    .meter-bar {
        display: flex;
        overflow: hidden;

        height: 6px;
        margin-bottom: 5px;

        background: rgba(255, 255, 255, 0.08);
        border-radius: 100px;
    }

    .fill {
        transition: width 0.8s cubic-bezier(0.2, 0, 0, 1);
    }

    .stats {
        display: flex;
        justify-content: space-between;
        align-items: center;

        margin-bottom: 15px;
        padding: 0 2px;
    }

    .stat-val {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: -0.02em;
    }

    .stat-val .plus {
        margin-right: 1px;

        font-size: 10px;
        font-weight: 500;
        opacity: 0.8;
    }

    .stat-label {
        margin-left: 3px;

        font-family: 'Inter', sans-serif;
        font-size: 9px;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: lowercase;
        opacity: 0.5;
    }


    /* ======================================================================
       Vote buttons
       ====================================================================== */

    .btns {
        display: flex;
        gap: 8px;

        height: 42px;
        margin-bottom: 15px;
    }

    .btn {
        flex: 1;

        display: flex;
        align-items: center;
        justify-content: center;

        border: 2.5px solid transparent;
        border-radius: 9px;
        cursor: pointer;

        font-size: 13px;
        font-weight: 800;

        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Default (not yet voted) */
    .btn-h {
        background: var(--human);
        border-color: var(--human);
        color: #052e16;
    }

    .btn-a {
        background: var(--ai);
        border-color: var(--ai);
        color: #450a0a;
    }

    .btn-h:hover {
        background: transparent !important;
        color: var(--human);
    }

    .btn-a:hover {
        background: transparent !important;
        color: var(--ai);
    }

    /* After the user has voted (outlined, slightly wider) */
    .btn.voted-h {
        flex: 1.6 !important;
        background: transparent !important;
        border-color: var(--human);
        color: var(--human);
    }

    .btn.voted-a {
        flex: 1.6 !important;
        background: transparent !important;
        border-color: var(--ai);
        color: var(--ai);
    }

    .btn.voted-h:hover {
        background: var(--human) !important;
        color: #052e16;
    }

    .btn.voted-a:hover {
        background: var(--ai) !important;
        color: #450a0a;
    }

    /* Hover: grow the hovered button, shrink the other one */
    .btns:hover .btn:not(:hover) {
        flex: 0.6;
        opacity: 0.6;
    }

    .btns .btn:hover {
        flex: 1.8;
    }

    /* Shown instead of the buttons when a moderator has locked the result */
    .btn-locked {
        flex: 1;

        display: flex;
        align-items: center;
        justify-content: center;

        background: rgba(255, 255, 255, 0.06);
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        border-radius: 9px;
        cursor: default;

        color: var(--text);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
    }


    /* ======================================================================
       Verified-badge tooltip
       ====================================================================== */

    .tooltip-wrap {
        position: relative;

        display: flex;
        align-items: center;

        cursor: default;
    }

    .tooltip {
        display: none;
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;

        width: 200px;
        padding: 8px 10px;

        background: #1c1c1f;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);

        color: #d4d4d8;
        font-size: 11px;
        font-weight: 400;
        line-height: 1.5;

        pointer-events: none;
    }


    /* ======================================================================
       Loading skeleton
       ====================================================================== */

    .skeleton {
        background: rgba(255, 255, 255, 0.06);
        border-radius: 4px;
        animation: pulse 1.2s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.4; }
    }


    /* ======================================================================
       Footer: skip settings / blocking toggle (left) + view switcher (right)
       ====================================================================== */

    .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;

        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Left side of the footer: the Personal view swaps the skip settings
       for the "Personal blocking enabled" checkbox */
    .footer-ctx {
        display: none;
    }

    .card[data-view="personal"] .footer-ctx {
        display: flex;
    }

    .card[data-view="personal"] .skip {
        display: none;
    }

    .pb-toggle {
        align-items: center;
        gap: 7px;

        font-size: 11px;
        font-weight: 700;

        cursor: pointer;
        user-select: none;
    }

    .pb-toggle input {
        width: 14px;
        height: 14px;
        margin: 0;

        accent-color: var(--ai);
        cursor: pointer;
    }

    .skip {
        display: flex;
        align-items: center;
        gap: 6px;

        font-size: 11px;
        font-weight: 700;
    }

    .skip-input-wrapper {
        position: relative;

        display: flex;
        align-items: center;
    }

    /* Shared look for both number inputs */
    .skip-in,
    .min-in {
        background: #18181b;
        border: 1.5px solid #333;
        border-radius: 6px;

        color: var(--human);
        font-family: 'Saira Extra Condensed', sans-serif;
        font-size: 16px;
        font-weight: 700;
        text-align: left;

        appearance: textfield;
    }

    .skip-in {
        width: 32px;
        padding: 3px 18px 3px 6px;
        transition: border-color 0.2s, color 0.2s;
    }

    .min-in {
        width: 24px;
        padding: 3px 3px 3px 6px;
        transition: border-color 0.2s;
    }

    /* Hide the browser's up/down spinner arrows */
    .skip-in::-webkit-outer-spin-button,
    .skip-in::-webkit-inner-spin-button,
    .min-in::-webkit-outer-spin-button,
    .min-in::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .skip-in:focus,
    .min-in:focus {
        outline: none;
        border-color: var(--human);
    }

    /* Red when the threshold is above 100% */
    .skip-in.is-over-max {
        color: #ef4444 !important;
        border-color: #ef4444 !important;
    }

    /* Tooltip for the threshold warning */
    .skip-input-wrapper[data-tooltip]::after {
        content: attr(data-tooltip);

        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 20;

        padding: 4px 8px;

        background: #1c1c1f;
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);

        color: #fca5a5;
        font-size: 10px;
        font-weight: 600;
        white-space: nowrap;

        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
    }

    .skip-input-wrapper.has-tooltip:hover::after {
        opacity: 1;
    }

    .pct-symbol {
        position: absolute;
        right: 6px;

        font-size: 9px;
        color: var(--dim);

        pointer-events: none;
    }

    .ai-label {
        color: var(--dim);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
    }


    /* ======================================================================
       Views (AI / Personal share one card; data-view picks one)
       ====================================================================== */

    .view {
        display: none;
        animation: view-in 0.2s ease;
    }

    .card[data-view="ai"] .view-ai,
    .card[data-view="personal"] .view-personal {
        display: block;
    }

    @keyframes view-in {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
        .view { animation: none; }
        .sw-thumb { transition: none; }
    }


    /* ======================================================================
       Personal view: term chips, scope chips, Cancel / Block
       ====================================================================== */

    .terms-block {
        margin-bottom: 12px;
    }

    .p-head {
        display: flex;
        align-items: baseline;
        gap: 8px;

        margin-bottom: 8px;
    }

    .p-title {
        font-size: 13px;
        font-weight: 800;
    }

    .p-hint {
        color: var(--dim);
        font-size: 10px;
        font-weight: 500;
    }

    .grid {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;

        /* Room so a shifted/expanded edge chip isn't clipped */
        padding: 0 var(--grow);
    }

    .grid.scope {
        margin-bottom: 14px;
    }

    .chip-inactive,
    .chip-active {
        box-sizing: border-box;
        height: 30px;
        min-width: 0;
        margin: 0;
        padding: 6px var(--pad-x);
        flex-shrink: 1;

        font-family: inherit;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;

        white-space: nowrap;
        cursor: pointer;

        transition:
            padding 0.3s var(--spring),
            margin 0.3s var(--spring),
            translate 0.3s var(--spring),
            border-radius 0.15s var(--easing);
    }

    .chip-inactive {
        background-color: transparent;
        border: 3px solid #ffffff;
        border-radius: 10px;
        color: #ffffff;
    }

    .chip-active {
        background-color: var(--SelectedColor);
        border: 3px solid var(--SelectedColor);
        border-radius: 20px;
        color: var(--primary);
    }

    /* Hovered chip: looks wider, but its layout footprint is unchanged
       (padding grows, margin shrinks by the same amount on each side),
       so rows never re-wrap. */
    .chip-inactive:hover,
    .chip-active:hover {
        padding: 6px var(--pad-x-hover);
        margin-inline: calc(var(--grow) * -1);
    }

    /* Visual "push": siblings slide out of the way using translate
       (no layout effect). */
    .grid > :is(.chip-inactive, .chip-active):hover ~ :is(.chip-inactive, .chip-active) {
        translate: var(--grow) 0;
    }

    .grid > :is(.chip-inactive, .chip-active):has(~ :is(.chip-inactive, .chip-active):hover) {
        translate: calc(var(--grow) * -1) 0;
    }

    /* "This song" when the song title isn't available */
    .chip-inactive:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    /* Cancel / Block reuse the vote buttons (.btns > .btn).
       Block is .btn-a (red); Cancel is .btn-c, a neutral twin of .btn-h / .btn-a. */
    .btn-c {
        background: var(--text);
        border-color: var(--text);
        color: var(--bg);
    }

    .btn-c:hover {
        background: transparent !important;
        color: var(--text);
    }

    /* Block is disabled until something changes */
    .p-block:disabled {
        opacity: 0.4;
        cursor: default;
        pointer-events: none;
    }


    /* ======================================================================
       View switcher (pill with a sliding thumb)
       ====================================================================== */

    .switcher {
        position: relative;

        display: flex;
        gap: 2px;

        margin-left: auto;
        padding: 3px;

        background: rgba(255, 255, 255, 0.08);
        border-radius: 100px;
    }

    .sw-thumb {
        position: absolute;
        top: 3px;
        left: 3px;

        width: 28px;
        height: 28px;

        background: var(--text);
        border-radius: 50%;

        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .card[data-view="personal"] .sw-thumb { transform: translateX(30px); }
    .card[data-view="settings"] .sw-thumb { transform: translateX(60px); }

    .sw-btn {
        position: relative;
        z-index: 1;

        display: flex;
        align-items: center;
        justify-content: center;

        width: 28px;
        height: 28px;
        padding: 0;

        background: none;
        border: none;
        border-radius: 50%;
        cursor: pointer;

        color: #a1a1aa;
        transition: color 0.2s;
    }

    .sw-btn svg {
        display: block;
        width: 16px;
        height: 16px;
    }

    .sw-btn:hover {
        color: var(--text);
    }

    .sw-btn[aria-pressed="true"],
    .sw-btn[aria-pressed="true"]:hover {
        color: #0c0c0e;
    }

    .sw-btn:focus-visible {
        outline: 2px solid var(--human);
        outline-offset: 1px;
    }
`;


// -----------------------------------------------------------------------------
// 6. Popup HTML template (initial "loading" state)
// -----------------------------------------------------------------------------

function buildCardHtml(artist) {
    return `
        <div class="glow-orb" id="glow"></div>

        <!-- Header: artist name + verdict -->
        <div class="top">
            <div class="name-box">
                <div class="name">${escapeHtml(artist)}</div>

                <a
                    href="${WIKI_HOW_IT_WORKS}"
                    target="_blank"
                    class="sub"
                >
                    How it works &amp; FAQ →
                </a>
            </div>

            <div class="verdict">
                <div class="pct" style="color: var(--dim);">—%</div>
                <div class="tag" style="color: var(--dim);">...</div>
            </div>
        </div>

        <!-- Views: only the one matching card[data-view] is visible -->
        <div class="views">

            <!-- AI: meter, vote counts, vote buttons -->
            <section class="view view-ai">
                <div class="meter-bar">
                    <div class="fill skeleton" style="width: 100%;"></div>
                </div>

                <div class="stats">
                    <span class="stat-val" style="color: #3f3f46;">
                        <span class="plus">+</span>0<span class="stat-label">human</span>
                    </span>

                    <span class="stat-val" style="color: #3f3f46;">
                        <span class="plus">+</span>0<span class="stat-label">AI</span>
                    </span>
                </div>

                <!-- Vote buttons (disabled until data loads) -->
                <div class="btns">
                    <button class="btn btn-h" disabled>Human</button>
                    <button class="btn btn-a" disabled>AI</button>
                </div>
            </section>

            <!-- Personal: block by term / artist / song (filled in by renderPersonal) -->
            <section class="view view-personal">
                <div class="terms-block">
                    <div class="p-head">
                        <span class="p-title">Terms</span>
                        <span class="p-hint">click a term to block it</span>
                    </div>
                    <div class="grid" id="term-chips"></div>
                </div>

                <div class="grid scope">
                    <button type="button" class="chip-inactive" id="scope-artist">Artist</button>
                    <button type="button" class="chip-inactive" id="scope-song">This song</button>
                </div>

                <div class="btns">
                    <button type="button" class="btn btn-c" id="p-cancel">Cancel</button>
                    <button type="button" class="btn btn-a p-block" id="p-block" disabled>Block</button>
                </div>
            </section>
        </div>

        <!-- Footer: skip settings (AI view) or blocking toggle (Personal view), plus the switcher -->
        <div class="footer">
            <div class="skip">
                Skip past

                <div class="skip-input-wrapper">
                    <input
                        type="number"
                        id="skip-in"
                        class="skip-in"
                        value="${DEFAULT_THRESHOLD}"
                    >
                    <span class="pct-symbol">%</span>
                </div>

                <span class="ai-label">AI</span>

                <span style="margin-left: 6px;">with</span>

                <div class="min-votes-wrapper">
                    <input
                        type="number"
                        id="min-in"
                        class="min-in"
                        value="${DEFAULT_MIN_VOTES}"
                    >
                </div>

                <span class="ai-label">votes</span>
            </div>

            <label class="footer-ctx pb-toggle">
                <input type="checkbox" id="pb-enabled">
                Personal blocking enabled
            </label>

            <div class="switcher" role="group" aria-label="Popup view">
                <span class="sw-thumb"></span>
                <button type="button" class="sw-btn" data-view="ai"
                        title="AI" aria-label="AI" aria-pressed="true">${SWITCH_ICONS.ai}</button>
                <button type="button" class="sw-btn" data-view="personal"
                        title="Personal" aria-label="Personal" aria-pressed="false">${SWITCH_ICONS.personal}</button>
                <!-- Not a view: opens the settings page in a new tab -->
                <button type="button" class="sw-btn" data-action="settings"
                        title="Settings" aria-label="Settings">${SWITCH_ICONS.settings}</button>
            </div>
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
    card.dataset.view = 'ai';
    card.innerHTML = buildCardHtml(artist);

    shadow.appendChild(style);
    shadow.appendChild(bannerHost);
    shadow.appendChild(card);
    document.body.appendChild(host);

    return { host, shadow };
}


// -----------------------------------------------------------------------------
// 7. Positioning
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
// 8. Render functions (each fills in one section of the card)
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
        ? `
            <div class="fill" style="width: 100%; background: #3f3f46;"></div>
        `
        : `
            <div class="fill" style="width: ${hPct}%; background: var(--human);"></div>
            <div class="fill" style="width: ${aPct}%; background: var(--ai);"></div>
        `;
}

function renderStats(shadow, status, verdict) {
    const [humanStat, aiStat] = shadow.querySelectorAll('.stat-val');

    humanStat.style.color = verdict.isEmpty ? '#3f3f46' : 'var(--human)';
    humanStat.innerHTML = `
        <span class="plus">+</span>${status.out_human}<span class="stat-label">human</span>
    `;

    aiStat.style.color = verdict.isEmpty ? '#3f3f46' : 'var(--ai)';
    aiStat.innerHTML = `
        <span class="plus">+</span>${status.out_ai}<span class="stat-label">AI</span>
    `;
}

function renderVoteButtons(shadow, artist, status, badge, platformClass, songTitle) {
    const btns = shadow.querySelector('.btns');

    if (status.out_verified) {
        btns.innerHTML = `
            <button class="btn btn-locked">
                ${LOCK_ICON} Voting locked · Moderated result
            </button>
        `;
        return;
    }

    const [humanBtn, aiBtn] = btns.querySelectorAll('.btn');
    humanBtn.removeAttribute('disabled');
    aiBtn.removeAttribute('disabled');

    if (status.my_current_vote === 'human') humanBtn.classList.add('voted-h');
    if (status.my_current_vote === 'ai')    aiBtn.classList.add('voted-a');

    humanBtn.onclick = () => castVote(artist, 'human', badge, platformClass, songTitle);
    aiBtn.onclick    = () => castVote(artist, 'ai', badge, platformClass, songTitle);
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

function setView(shadow, host, view) {
    const card = shadow.querySelector('.card');
    if (!VIEWS.includes(view) || card.dataset.view === view) return;

    const prevBottom = host.getBoundingClientRect().bottom;

    card.dataset.view = view;
    shadow.querySelectorAll('.sw-btn[data-view]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.view === view));
    });

    const newHeight = host.getBoundingClientRect().height;
    const maxTop = window.innerHeight - newHeight - POPUP_MARGIN;
    const top = Math.max(POPUP_MARGIN, Math.min(prevBottom - newHeight, maxTop));
    host.style.top = `${top}px`;
}

// Content scripts cant open extension pages for a reason i dont care to learn. This asks the background script to do it
async function openSettingsPage() {
    try {
        await chrome.runtime.sendMessage({ type: 'open-settings' });
    } catch (err) {
        console.error(LOG_PREFIX, 'Could not open settings page:', err);
    }
}

function renderSwitcher(shadow, host) {
    // AI and Personal switch the card's view.
    shadow.querySelectorAll('.sw-btn[data-view]').forEach((btn) => {
        btn.onclick = () => setView(shadow, host, btn.dataset.view);
    });

    // Settings leaves the popup for its own page.
    shadow.querySelector('.sw-btn[data-action="settings"]').onclick = openSettingsPage;
}

// Chips swap between two classes: outlined (inactive) and filled (active).
function setChipActive(chip, isActive) {
    chip.classList.toggle('chip-active', isActive);
    chip.classList.toggle('chip-inactive', !isActive);
}

function renderPersonal(shadow, host, artist, songTitle, personalBlock) {
    const termsBlock = shadow.querySelector('.terms-block');
    const termChips = shadow.querySelector('#term-chips');
    const artistChip = shadow.querySelector('#scope-artist');
    const songChip = shadow.querySelector('#scope-song');
    const blockBtn = shadow.querySelector('#p-block');
    const cancelBtn = shadow.querySelector('#p-cancel');
    const enabledBox = shadow.querySelector('#pb-enabled');

    const artistKey = normalizeKey(artist);
    const terms = songTitle ? tokenizeTitle(songTitle, MAX_TERMS) : [];
    const termKeys = terms.map((t) => normalizeKey(t));

    const readSaved = (pb) => ({
        artist: pb.artists.includes(artistKey),
        song: Boolean(songTitle) && pb.songs.includes(songKey(artist, songTitle)),
        terms: new Set(termKeys.filter((k) => pb.terms.includes(k)))
    });

    let saved = readSaved(personalBlock);
    const selected = {
        artist: saved.artist,
        song: saved.song,
        terms: new Set(saved.terms)
    };

    const countChanges = () => {
        let adds = 0;
        let removes = 0;
        const tally = (now, was) => {
            if (now && !was) adds++;
            if (!now && was) removes++;
        };
        tally(selected.artist, saved.artist);
        tally(selected.song, saved.song);
        termKeys.forEach((k) => tally(selected.terms.has(k), saved.terms.has(k)));
        return { adds, removes };
    };

    const refresh = () => {
        setChipActive(artistChip, selected.artist);
        setChipActive(songChip, selected.song);
        termChips.querySelectorAll('button').forEach((chip) => {
            setChipActive(chip, selected.terms.has(chip.dataset.key));
        });

        const { adds, removes } = countChanges();
        blockBtn.disabled = adds + removes === 0;
        blockBtn.textContent = adds && removes ? 'Save' : removes ? 'Unblock' : 'Block';
    };

    
    termChips.textContent = '';
    terms.forEach((term, i) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip-inactive';
        chip.dataset.key = termKeys[i];
        chip.textContent = term;
        chip.onclick = () => {
            if (selected.terms.has(termKeys[i])) selected.terms.delete(termKeys[i]);
            else selected.terms.add(termKeys[i]);
            refresh();
        };
        termChips.appendChild(chip);
    });
    termsBlock.style.display = terms.length ? '' : 'none';


    artistChip.onclick = () => {
        selected.artist = !selected.artist;
        refresh();
    };
    songChip.disabled = !songTitle;
    songChip.title = songTitle || 'Song title not available here';
    songChip.onclick = () => {
        selected.song = !selected.song;
        refresh();
    };

    // Cancel button --------------------------------------------------------------------------------
    cancelBtn.onclick = () => {
        selected.artist = saved.artist;
        selected.song = saved.song;
        selected.terms = new Set(saved.terms);
        refresh();
        setView(shadow, host, 'ai');
    };

    // Block button --------------------------------------------------------------------------------
    blockBtn.onclick = async () => {
        blockBtn.disabled = true;
        try {
            // Re-read so changes made in another tab are not overwritten.
            const pb = await loadPersonalBlock();
            const setMember = (list, value, on) => {
                const without = list.filter((v) => v !== value);
                return on ? [...without, value] : without;
            };

            pb.artists = setMember(pb.artists, artistKey, selected.artist);
            if (songTitle) {
                pb.songs = setMember(pb.songs, songKey(artist, songTitle), selected.song);
            }
            termKeys.forEach((k) => {
                pb.terms = setMember(pb.terms, k, selected.terms.has(k));
            });

            await savePersonalBlock(pb);
            saved = readSaved(pb);
            blockBtn.textContent = 'Saved';

            setTimeout(() => {
                if (!host.isConnected) return;
                refresh();
                setView(shadow, host, 'ai');
            }, 700);
        } catch (err) {
            console.error(LOG_PREFIX, 'Saving personal block failed:', err);
            refresh();
        }
    };

    
    enabledBox.checked = personalBlock.enabled;
    enabledBox.onchange = async () => {
        try {
            const pb = await loadPersonalBlock();
            pb.enabled = enabledBox.checked;
            await savePersonalBlock(pb);
        } catch (err) {
            console.error(LOG_PREFIX, 'Saving personal blocking toggle failed:', err);
        }
    };

    refresh();
}


// -----------------------------------------------------------------------------
// 9. Public entry points
// -----------------------------------------------------------------------------

window.showPopup = async function (container, badge, human, artist, platformClass, songTitle) {
    clearTimeout(hideTimer);
    removeExistingPopup();

    const { host, shadow } = buildPopup(artist);

    host.onmouseenter = () => clearTimeout(hideTimer);
    host.onmouseleave = () => window.hidePopup();

    // Load vote status and saved settings in parallel.
    const [status, settings] = await Promise.all([
        getArtistStatus(artist, platformClass, true),
        chrome.storage.local.get(['threshold', 'minVotes', PERSONAL_STORAGE_KEY])
    ]);

    // Popup was dismissed while we were loading.
    if (!document.body.contains(host)) return;

    const threshold = settings.threshold ?? DEFAULT_THRESHOLD;
    const minVotes = settings.minVotes ?? DEFAULT_MIN_VOTES;
    const verdict = computeVerdict(status);

    renderHeader(shadow, artist, status, verdict);
    renderMeter(shadow, verdict);
    renderStats(shadow, status, verdict);
    renderVoteButtons(shadow, artist, status, badge, platformClass, songTitle);
    renderSettings(shadow, threshold, minVotes);
    renderPersonal(shadow, host, artist, songTitle, normalizePersonalBlock(settings[PERSONAL_STORAGE_KEY]));
    renderSwitcher(shadow, host);

    if (typeof window.renderLocalListBanner === 'function') {
        await window.renderLocalListBanner(shadow, artist, platformClass, status, badge, verdict.label, songTitle);
    }

    requestAnimationFrame(() => positionPopup(host, badge));
};

window.hidePopup = function () {
    hideTimer = setTimeout(() => {
        const host = document.body.querySelector('.ai-guard-wrapper');
        if (host) host.remove();
    }, HIDE_DELAY_MS);
};