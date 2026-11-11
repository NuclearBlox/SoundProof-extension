// NOTE: This file has grown to be quite a mess weird chrome bug could only be fixed by moving the popup code to its own file. It currently works so no plan to refactor it, but if you do, be careful with the shadow DOM and event listeners. They are a bit tricky to get right.
import React from 'react';
import { createRoot } from 'react-dom/client';
import Card from '../reactCom/app.jsx';


let hideTimer;
    const supabaseUrl = 'https://solsneywdlhvwbtghopw.supabase.co';
    const supabaseKey = 'sb_publishable_dlFufI-1QXA4VJdGoMWxMw_ouWHyl3k';

    if (!window.supabaseClient) {
        window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    }

    const DEFAULT_STATUS = { out_human: 0, out_ai: 0, out_score: 0, out_verified: false, my_current_vote: null };

    const VERIFIED_ICON = `
        <span class="tooltip-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 -960 960 960" fill="#22c55e" style="flex-shrink:0;display:block">
                <path d="m344-60-76-128-144-32 14-148-98-112 98-112-14-148 144-32 76-128 136 58 136-58 76 128 144 32-14 148 98 112-98 112 14 148-144 32-76 128-136-58-136 58Zm94-278 226-226-56-58-170 170-86-84-56 58 142 140Z"/>
            </svg>
            <span class="tooltip">A human moderator has reviewed this artist and confirmed the rating — either through a high vote count or a resolved report.</span>
        </span>`;
    const LOCK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="#71717a" style="flex-shrink:0">
        <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm240-200q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"/>
    </svg>`;

    function getVerdictColor(label, pct) {
        if (label === 'AI') return pct >= 50 ? '#ef4444' : '#f59e0b';
        if (label === 'HUMAN') return pct >= 50 ? '#22c55e' : '#10b981';
        return '#71717a';
    }

    async function fetchArtistStatus(artist, platformClass) {
        try {
            const { data, error } = await window.supabaseClient.rpc('get_artist_status', {
                target_id: artist.toLowerCase(),
                platform_input: platformClass
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

function positionPopup(host, badge) {
    const MARGIN = 12;
    const POP_W = 360;

    const rect = badge.getBoundingClientRect();
    const popH = host.getBoundingClientRect().height ?? 260;

    let left = rect.left + rect.width / 2 - POP_W / 2;
    let top = rect.top - popH - MARGIN;

    left = Math.max(MARGIN, Math.min(left, window.innerWidth - POP_W - MARGIN));

    if (top < MARGIN) {
        top = rect.bottom + MARGIN;
    }

    const maxTop = window.innerHeight - popH - MARGIN;
    if (top > maxTop) {
        top = Math.max(MARGIN, maxTop);
        if (top < rect.bottom + MARGIN && top + popH > rect.top - MARGIN) {
            top = rect.top - popH - MARGIN;
        }
    }

    host.style.cssText = `
        position: fixed;
        left: ${left}px;
        top: ${top}px;
        z-index: 2147483647;
    `;
}

    function updateThresholdWarning(inputEl) {
        const val = Number(inputEl.value);
        const wrapper = inputEl.closest('.skip-input-wrapper');

        if (val > 100) {
            inputEl.classList.add('is-over-max');
            inputEl.title = "This effectively disables soundproof";
            if (wrapper) {
                wrapper.classList.add('has-tooltip');
                wrapper.setAttribute('data-tooltip', 'This effectively disables soundproof');
            }
        } else {
            inputEl.classList.remove('is-over-max');
            inputEl.removeAttribute('title');
            if (wrapper) {
                wrapper.classList.remove('has-tooltip');
                wrapper.removeAttribute('data-tooltip');
            }
        }
    }

    window.showPopup = async function(container, badge, human, artist, platformClass) {
        clearTimeout(hideTimer);
        const existingHost = document.body.querySelector('.ai-guard-wrapper');
        if (existingHost) existingHost.remove();

        const mountPoint = document.createElement('div');
        const root = createRoot(mountPoint);

        
        shadow.appendChild(mountPoint);
        root.render(React.createElement(Card)); 

    window.hidePopup = function() {
        hideTimer = setTimeout(() => {
            const host = document.body.querySelector('.ai-guard-wrapper');
            if (host) host.remove();
        }, 300);
    };

    async function castVote(artistName, type, badge, platformClass) {
        try {
            const { error } = await window.supabaseClient.rpc('handle_vote', {
                artist_id_input: artistName,
                vote_type_input: type,
                platform_input: platformClass
            });
            if (error) console.error('[SoundProof] handle_vote error:', error);
            window.showPopup(null, badge, null, artistName, platformClass);
        } catch (err) {
            console.error('[SoundProof] Vote failed:', err);
        }
    }
}