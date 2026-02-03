

const style = document.createElement('style');
style.textContent = `
  @keyframes glow-pulse {
    0% {
      filter: sepia(1) hue-rotate(-50deg) saturate(5) brightness(1) drop-shadow(0 0 15px rgba(255, 0, 0, 0.8)) drop-shadow(0 0 30px rgba(255, 0, 0, 0.5));
    }
    50% {
      filter: sepia(1) hue-rotate(-50deg) saturate(7) brightness(1.3) drop-shadow(0 0 25px rgba(255, 0, 0, 1)) drop-shadow(0 0 50px rgba(255, 0, 0, 0.8));
    }
    100% {
      filter: sepia(1) hue-rotate(-50deg) saturate(5) brightness(1) drop-shadow(0 0 15px rgba(255, 0, 0, 0.8)) drop-shadow(0 0 30px rgba(255, 0, 0, 0.5));
    }
  }
`;
document.head.appendChild(style);

function attatchPopup(container, badge, human, artist) {
  container.addEventListener('mouseenter', () => {
    showPopup(container, badge, human, artist)
  });

  container.addEventListener('mouseleave', () => {
    hidePopup()
  });
}

function ShowWarningBadge(width, selector, artist, padding, removePrev = true) {
  let Placement;
  if (typeof (selector) == "string") {
    Placement = document.querySelector(selector);
  } else {
    Placement = selector
  }

  if (!Placement) {
    console.log("Screwed up");
    return;
  }
  const alreadyThere = document.querySelector('.ai-warning-container')
  if (removePrev) {
    RemoveBadges()
  }

  const container = document.createElement('div');
  container.className = 'ai-warning-container';
  container.style.position = 'relative';
  container.style.display = 'inline-block';
  container.style.margin = `0px ${padding}`;

  const badge = document.createElement('img');
  badge.className = 'ai-warning-badge';
  badge.src = chrome.runtime.getURL('Icons/ArtistUsesAI.png');

  badge.style.width = width;
  badge.style.display = 'block';
  badge.style.margin = '0 auto';
  badge.style.zIndex = '9999';

  badge.style.filter = 'sepia(1) hue-rotate(-50deg) saturate(5) brightness(1) drop-shadow(0 0 15px rgba(255, 0, 0, 0.8)) drop-shadow(0 0 30px rgba(255, 0, 0, 0.5))';
  badge.style.animation = 'glow-pulse 2s ease-in-out infinite';

  container.appendChild(badge);
  attatchPopup(container, badge, false, artist)

  Placement.parentElement.insertBefore(container, Placement.nextSibling);

  console.log("Should be there");

  return badge
}

function ShowHumanBadge(width, selector, artist, padding, removePrev = true) {
  let Placement;
  if (typeof (selector) == "string") {
    Placement = document.querySelector(selector);
  } else {
    Placement = selector
  }

  if (!Placement) {
    console.log("Screwed up");
    return;
  }
  if (removePrev) {
    RemoveBadges()
  }

  const container = document.createElement('div');
  container.className = 'human-container';
  container.style.position = 'relative';
  container.style.display = 'inline-block';
  container.style.margin = `0px ${padding}`;
  console.log("Padding set to", padding);

  const badge = document.createElement('img');
  badge.className = 'human-badge';
  badge.src = chrome.runtime.getURL('Icons/LooksHuman.png');

  badge.style.width = width;
  badge.style.display = 'block';
  badge.style.margin = '0 auto';
  badge.style.zIndex = '9999';
  badge.style.opacity = '.75';

  container.appendChild(badge);
  container.addEventListener('mouseenter', () => {
    showPopup(container, badge, true, artist)
  });

  container.addEventListener('mouseleave', () => {
    hidePopup()
  });

  Placement.parentElement.insertBefore(container, Placement.nextSibling);

  console.log("Should be there");

  return badge
}

function RemoveBadges() {
  const Aibadges = document.querySelectorAll('.ai-warning-container');
  const Humanbadges = document.querySelectorAll('.human-container');
  const popups = document.querySelectorAll('.ai-popup');

  Aibadges.forEach(Aibadge => {
    Aibadge.remove();
  })

  Humanbadges.forEach(Humanbadge => {
    Humanbadge.remove();
  })

  popups.forEach(popup => {
    popup.remove();
  })
}