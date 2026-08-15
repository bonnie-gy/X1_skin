let products = [];
let scenes = [];

const productTabs = document.querySelector('#productTabs');
const productImage = document.querySelector('#productImage');
const productName = document.querySelector('#productName');
const productEyebrow = document.querySelector('#productEyebrow');
const productDescription = document.querySelector('#productDescription');
const productStage = document.querySelector('#productStage');
const productSpecs = document.querySelector('#productSpecs');
const sceneTabs = document.querySelector('#sceneTabs');
const sceneVideo = document.querySelector('#sceneVideo');
const sceneName = document.querySelector('#sceneName');
const sceneIndex = document.querySelector('#sceneIndex');
const sceneDescription = document.querySelector('#sceneDescription');
const sceneValues = document.querySelector('#sceneValues');
const sceneDelivery = document.querySelector('#sceneDelivery');
const sceneVideoStatus = document.querySelector('#sceneVideoStatus');
const sceneVideoStatusText = sceneVideoStatus.querySelector('[data-status-text]');
let activeSceneIndex = 0;
let sceneLoadId = 0;
const sceneVideoUrls = new Map();
const sceneVideoDownloads = new Map();

function renderProduct(index) {
  const item = products[index];
  if (!item) return;

  productImage.src = item.image;
  productImage.alt = item.alt;
  productName.textContent = item.name;
  productEyebrow.textContent = item.eyebrow;
  productDescription.textContent = item.description;
  productStage.textContent = item.stage;
  productSpecs.innerHTML = item.specs
    .map(([label, value]) => `<div><dt class="text-xs text-slate-500">${label}</dt><dd class="mt-1 font-semibold">${value}</dd></div>`)
    .join('');
  productTabs.querySelectorAll('button').forEach((button, itemIndex) => {
    button.setAttribute('aria-selected', String(itemIndex === index));
  });
}

function renderProductTabs() {
  productTabs.innerHTML = products.map((item, index) => `
    <button class="product-thumb lift flex min-h-28 items-center justify-between border border-line bg-white p-5 text-left dark:border-[#283337] dark:bg-[#101719]" type="button" role="tab" aria-selected="${index === 0}" data-product="${index}">
      <span><span class="text-xs text-slate-500">0${index + 1} / ${item.stage}</span><strong class="mt-2 block text-lg">${item.name}</strong></span>
      <i data-lucide="arrow-right" class="size-4 text-slate-400"></i>
    </button>`).join('');
  renderProduct(0);
}

function setSceneVideoStatus(state, message) {
  const icon = sceneVideoStatus.querySelector('[data-status-icon]');
  sceneVideoStatus.classList.toggle('hidden', state === 'ready');
  sceneVideoStatus.classList.toggle('grid', state !== 'ready');
  icon.classList.toggle('animate-spin', state === 'loading');
  sceneVideoStatusText.textContent = message;
}

function downloadSceneVideo(item, retry) {
  if (retry) {
    sceneVideoDownloads.delete(item.video);
    const previousUrl = sceneVideoUrls.get(item.video);
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    sceneVideoUrls.delete(item.video);
  }

  if (!sceneVideoDownloads.has(item.video)) {
    const download = fetch(item.video, { cache: retry ? 'reload' : 'force-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`Video returned ${response.status}`);
        return response.blob();
      })
      .then(blob => {
        if (!blob.type.startsWith('video/')) throw new Error('Invalid video response');
        const objectUrl = URL.createObjectURL(blob);
        sceneVideoUrls.set(item.video, objectUrl);
        return objectUrl;
      })
      .catch(error => {
        sceneVideoDownloads.delete(item.video);
        throw error;
      });
    sceneVideoDownloads.set(item.video, download);
  }

  return sceneVideoDownloads.get(item.video);
}

async function loadSceneVideo(item, loadId, retry = false) {
  setSceneVideoStatus('loading', retry ? '正在重新加载视频...' : '视频加载中...');
  sceneVideo.pause();
  sceneVideo.removeAttribute('src');
  sceneVideo.load();
  const loadTimeout = window.setTimeout(() => {
    if (loadId === sceneLoadId && sceneVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setSceneVideoStatus('error', '视频加载超时，点击重试');
    }
  }, 20000);

  let videoUrl;
  try {
    videoUrl = await downloadSceneVideo(item, retry);
  } catch (error) {
    window.clearTimeout(loadTimeout);
    if (loadId === sceneLoadId) setSceneVideoStatus('error', '视频下载失败，点击重试');
    return;
  }
  if (loadId !== sceneLoadId) return;

  sceneVideo.src = videoUrl;
  sceneVideo.load();

  const handleReady = async () => {
    if (loadId !== sceneLoadId) return;
    window.clearTimeout(loadTimeout);
    setSceneVideoStatus('ready', '');
    try {
      await sceneVideo.play();
    } catch (error) {
      if (error.name !== 'AbortError' && loadId === sceneLoadId) {
        setSceneVideoStatus('error', '点击播放视频');
      }
    }
  };

  const handleError = () => {
    window.clearTimeout(loadTimeout);
    if (loadId === sceneLoadId) setSceneVideoStatus('error', '视频加载失败，点击重试');
  };

  sceneVideo.addEventListener('canplay', handleReady, { once: true });
  sceneVideo.addEventListener('error', handleError, { once: true });
}

function renderScene(index) {
  const item = scenes[index];
  if (!item) return;

  activeSceneIndex = index;
  sceneName.textContent = item.name;
  sceneIndex.textContent = `SCENE 0${index + 1}`;
  sceneDescription.textContent = item.description;
  sceneValues.innerHTML = item.values
    .map(value => `<li class="flex gap-3"><i data-lucide="check" class="mt-0.5 size-4 shrink-0 text-cyan"></i><span>${value}</span></li>`)
    .join('');
  sceneDelivery.textContent = item.delivery;
  sceneLoadId += 1;
  loadSceneVideo(item, sceneLoadId);
  sceneTabs.querySelectorAll('button').forEach((button, itemIndex) => {
    button.setAttribute('aria-selected', String(itemIndex === index));
  });
  lucide.createIcons();
}

function renderSceneTabs() {
  sceneTabs.innerHTML = scenes.map((item, index) => `
    <button class="scene-tab shrink-0 border border-line px-4 py-2.5 text-sm text-slate-600 transition-colors hover:border-tech hover:text-tech dark:border-[#344044] dark:text-slate-300" type="button" role="tab" aria-selected="${index === 0}" data-scene="${index}">${item.short}</button>`)
    .join('');
  renderScene(0);
}

async function loadContent() {
  try {
    const response = await fetch('/api/content');
    if (!response.ok) throw new Error(`Content API returned ${response.status}`);
    const content = await response.json();
    products = content.products || [];
    scenes = content.scenes || [];
    renderProductTabs();
    renderSceneTabs();
    lucide.createIcons();
  } catch (error) {
    console.error(error);
    productTabs.innerHTML = '<p class="border border-line p-5 text-sm text-slate-500">产品数据暂时无法加载，请确认后端服务已启动。</p>';
    sceneTabs.innerHTML = '<p class="text-sm text-slate-500">应用数据暂时无法加载。</p>';
  }
}

productTabs.addEventListener('click', event => {
  const button = event.target.closest('[data-product]');
  if (button) renderProduct(Number(button.dataset.product));
});

sceneTabs.addEventListener('click', event => {
  const button = event.target.closest('[data-scene]');
  if (button) renderScene(Number(button.dataset.scene));
});

sceneVideoStatus.addEventListener('click', () => {
  const item = scenes[activeSceneIndex];
  if (!item) return;
  if (sceneVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    sceneVideo.play()
      .then(() => setSceneVideoStatus('ready', ''))
      .catch(() => setSceneVideoStatus('error', '视频无法播放，点击重试'));
    return;
  }
  sceneLoadId += 1;
  loadSceneVideo(item, sceneLoadId, true);
});

window.addEventListener('beforeunload', () => {
  sceneVideoUrls.forEach(url => URL.revokeObjectURL(url));
});

const root = document.documentElement;
const storedTheme = localStorage.getItem('x1-theme');
const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (storedTheme === 'dark' || (!storedTheme && preferDark)) root.classList.add('dark');

document.querySelector('#themeToggle').addEventListener('click', () => {
  root.classList.toggle('dark');
  localStorage.setItem('x1-theme', root.classList.contains('dark') ? 'dark' : 'light');
});

const header = document.querySelector('#siteHeader');
const backToTop = document.querySelector('#backToTop');
const hero = document.querySelector('#home');
const heroStoryVideo = document.querySelector('#heroStoryVideo');
const heroStoryCurrent = document.querySelector('#heroStoryCurrent');
const heroStoryScenes = [...document.querySelectorAll('[data-story-scene]')];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(start, end, value) {
  const amount = clamp((value - start) / (end - start));
  return amount * amount * (3 - 2 * amount);
}

function updateHeroStory() {
  if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rect = hero.getBoundingClientRect();
  const scrollableHeight = Math.max(1, hero.offsetHeight - window.innerHeight);
  const progress = clamp(-rect.top / scrollableHeight);
  const introExit = smoothstep(.08, .3, progress);
  const materialEnter = smoothstep(.2, .38, progress);
  const materialExit = smoothstep(.56, .72, progress);
  const signalEnter = smoothstep(.62, .82, progress);
  const materialOpacity = materialEnter * (1 - materialExit);
  const introOpacity = 1 - introExit;
  const signalOpacity = signalEnter;
  const materialFocus = materialOpacity;
  const mobile = window.innerWidth < 768;
  const storyScale = 1 + materialFocus * (mobile ? .13 : .24) + signalEnter * (mobile ? .2 : .36);
  const storyShiftX = materialFocus * (mobile ? -20 : -145) + signalEnter * (mobile ? 34 : 150);
  const storyShiftY = materialFocus * (mobile ? 18 : 24) - signalEnter * (mobile ? 20 : 34);
  const productOpacity = 1 - signalEnter * .5;
  const videoOpacity = materialFocus * .34 + signalEnter * .64;
  const phase = progress < .31 ? 0 : progress < .7 ? 1 : 2;

  hero.dataset.storyPhase = String(phase);
  hero.style.setProperty('--scene-intro-opacity', introOpacity.toFixed(3));
  hero.style.setProperty('--scene-material-opacity', materialOpacity.toFixed(3));
  hero.style.setProperty('--scene-signal-opacity', signalOpacity.toFixed(3));
  hero.style.setProperty('--scene-intro-shift', `${introExit * -48}px`);
  hero.style.setProperty('--scene-material-shift', `${(1 - materialEnter) * 36 - materialExit * 34}px`);
  hero.style.setProperty('--scene-signal-shift', `${(1 - signalEnter) * 38}px`);
  hero.style.setProperty('--story-scale', storyScale.toFixed(3));
  hero.style.setProperty('--story-shift-x', `${storyShiftX.toFixed(1)}px`);
  hero.style.setProperty('--story-shift-y', `${storyShiftY.toFixed(1)}px`);
  hero.style.setProperty('--product-opacity', productOpacity.toFixed(3));
  hero.style.setProperty('--story-video-opacity', videoOpacity.toFixed(3));
  hero.style.setProperty('--story-progress', `${(progress * 100).toFixed(1)}%`);
  heroStoryCurrent.textContent = `0${phase + 1}`;

  heroStoryScenes.forEach((scene, index) => {
    scene.setAttribute('aria-hidden', String(index !== phase));
  });

  if (heroStoryVideo?.duration && Number.isFinite(heroStoryVideo.duration)) {
    const targetTime = progress * Math.max(0, heroStoryVideo.duration - .04);
    if (Math.abs(heroStoryVideo.currentTime - targetTime) > .035) heroStoryVideo.currentTime = targetTime;
  }
}

function initHeroScrollStory() {
  if (!heroStoryVideo) return;
  heroStoryVideo.pause();
  heroStoryVideo.addEventListener('loadedmetadata', updateHeroStory);
  heroStoryVideo.addEventListener('canplay', updateHeroStory);
  window.addEventListener('resize', updateHeroStory, { passive: true });
  updateHeroStory();
}

function handleScroll() {
  const y = window.scrollY;
  const onHero = y < hero.offsetTop + hero.offsetHeight - 1;
  const showBackToTop = y >= hero.offsetTop + hero.offsetHeight;
  header.classList.toggle('nav-scrolled', y > 24);
  header.classList.toggle('on-hero', onHero);
  backToTop.classList.toggle('opacity-0', !showBackToTop);
  backToTop.classList.toggle('translate-y-3', !showBackToTop);
  backToTop.classList.toggle('pointer-events-none', !showBackToTop);
  updateHeroStory();
}

window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll();
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

const menuToggle = document.querySelector('#menuToggle');
const mobileMenu = document.querySelector('#mobileMenu');

function closeMenu() {
  mobileMenu.classList.add('hidden');
  menuToggle.setAttribute('aria-expanded', 'false');
}

menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  mobileMenu.classList.toggle('hidden', open);
  menuToggle.setAttribute('aria-expanded', String(!open));
});
document.querySelectorAll('.mobile-link').forEach(link => link.addEventListener('click', closeMenu));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));

document.querySelectorAll('[data-contact-topic]').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('#contactForm [name="topic"]').value = link.dataset.contactTopic;
  });
});

function initHeroExperience() {
  const canvas = document.querySelector('#heroFlowCanvas');
  if (!hero || !canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const heroStage = hero.querySelector('.hero-sticky');

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const pointer = { x: 0, y: 0, active: false };
  const particles = [];
  const colors = [178, 195, 211, 14, 88];
  let width = 0;
  let height = 0;
  let frameId = 0;
  let running = true;
  let lastTime = performance.now();

  function resetParticle(particle, randomX = true) {
    particle.x = randomX ? Math.random() * width : -20;
    particle.y = Math.random() * height;
    particle.px = particle.x;
    particle.py = particle.y;
    particle.speed = .35 + Math.random() * .75;
    particle.life = 180 + Math.random() * 320;
    particle.hue = colors[Math.floor(Math.random() * colors.length)];
    particle.alpha = .16 + Math.random() * .32;
    particle.width = .45 + Math.random() * 1.25;
  }

  function resizeCanvas() {
    const rect = heroStage.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles.length = 0;
    const particleCount = width < 768 ? 38 : 76;
    for (let index = 0; index < particleCount; index += 1) {
      const particle = {};
      resetParticle(particle);
      particles.push(particle);
    }
    context.clearRect(0, 0, width, height);
  }

  function setPointer(clientX, clientY) {
    const rect = heroStage.getBoundingClientRect();
    const localX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const localY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    pointer.x = localX;
    pointer.y = localY;
    pointer.active = true;

    const normalizedX = localX / rect.width - .5;
    const normalizedY = localY / rect.height - .5;
    hero.style.setProperty('--flow-x', `${(localX / rect.width) * 100}%`);
    hero.style.setProperty('--flow-y', `${(localY / rect.height) * 100}%`);
    hero.style.setProperty('--pointer-x', `${normalizedX * 28}px`);
    hero.style.setProperty('--pointer-y', `${normalizedY * 18}px`);
    hero.style.setProperty('--grid-x', `${normalizedX * -12}px`);
    hero.style.setProperty('--grid-y', `${normalizedY * -10}px`);
    hero.style.setProperty('--sensor-x', `${normalizedX * -16}px`);
    hero.style.setProperty('--sensor-y', `${normalizedY * -11}px`);
  }

  function relaxPointer() {
    pointer.active = false;
    hero.style.setProperty('--flow-x', '68%');
    hero.style.setProperty('--flow-y', '34%');
    hero.style.setProperty('--pointer-x', '0px');
    hero.style.setProperty('--pointer-y', '0px');
    hero.style.setProperty('--grid-x', '0px');
    hero.style.setProperty('--grid-y', '0px');
    hero.style.setProperty('--sensor-x', '0px');
    hero.style.setProperty('--sensor-y', '0px');
  }

  function draw(time) {
    if (!running) return;
    const delta = Math.min(2, (time - lastTime) / 16.67);
    lastTime = time;
    context.fillStyle = 'rgba(7, 23, 30, .075)';
    context.fillRect(0, 0, width, height);

    particles.forEach(particle => {
      particle.px = particle.x;
      particle.py = particle.y;
      const fieldX = Math.sin(particle.y * .007 + time * .00034) + Math.cos(particle.x * .003 - time * .00022);
      const fieldY = Math.cos(particle.x * .005 + time * .00028) * .72 + Math.sin(particle.y * .004) * .35;
      const storyEnergy = 1 + Number(hero.dataset.storyPhase || 0) * .22;
      let velocityX = (1.05 + fieldX * .44) * particle.speed * storyEnergy;
      let velocityY = fieldY * particle.speed * storyEnergy;

      if (pointer.active) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 240 && distance > 1) {
          const force = (1 - distance / 240) * 2.1;
          velocityX += (-dy / distance) * force;
          velocityY += (dx / distance) * force;
        }
      }

      particle.x += velocityX * delta;
      particle.y += velocityY * delta;
      particle.life -= delta;

      context.beginPath();
      context.moveTo(particle.px, particle.py);
      context.lineTo(particle.x, particle.y);
      context.strokeStyle = `hsla(${particle.hue}, 84%, 67%, ${particle.alpha})`;
      context.lineWidth = particle.width;
      context.stroke();

      if (particle.x > width + 30 || particle.y < -40 || particle.y > height + 40 || particle.life <= 0) {
        resetParticle(particle, false);
      }
    });

    frameId = requestAnimationFrame(draw);
  }

  heroStage.addEventListener('pointermove', event => setPointer(event.clientX, event.clientY), { passive: true });
  heroStage.addEventListener('pointerleave', relaxPointer);
  window.addEventListener('resize', resizeCanvas, { passive: true });

  const visibilityObserver = new IntersectionObserver(entries => {
    const visible = entries[0]?.isIntersecting;
    if (visible && !running) {
      running = true;
      lastTime = performance.now();
      frameId = requestAnimationFrame(draw);
    } else if (!visible && running) {
      running = false;
      cancelAnimationFrame(frameId);
    }
  }, { threshold: 0.02 });
  visibilityObserver.observe(hero);

  resizeCanvas();
  frameId = requestAnimationFrame(draw);
}

document.querySelector('#contactForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const status = document.querySelector('#formStatus');
  const payload = Object.fromEntries(new FormData(form).entries());

  submitButton.disabled = true;
  submitButton.classList.add('opacity-60', 'cursor-not-allowed');
  status.textContent = '正在提交合作需求...';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || '提交失败');
    status.textContent = result.message;
    status.className = 'text-xs text-[#138c83]';
    form.reset();
  } catch (error) {
    status.textContent = error.message || '提交失败，请稍后重试。';
    status.className = 'text-xs text-red-600 dark:text-red-400';
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove('opacity-60', 'cursor-not-allowed');
  }
});

lucide.createIcons();
loadContent();
initHeroScrollStory();
initHeroExperience();
