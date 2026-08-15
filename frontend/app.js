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
const heroVideo = document.querySelector('#heroVideo');

function handleScroll() {
  const y = window.scrollY;
  header.classList.toggle('nav-scrolled', y > 24);
  header.classList.toggle('on-hero', y <= 24);
  backToTop.classList.toggle('opacity-0', y < 700);
  backToTop.classList.toggle('translate-y-3', y < 700);
  backToTop.classList.toggle('pointer-events-none', y < 700);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && y < window.innerHeight) {
    heroVideo.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
  }
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
