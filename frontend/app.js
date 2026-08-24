let products = [];
let scenes = [];

const productTabs = document.querySelector('#productTabs');
const productImage = document.querySelector('#productImage');
const productVideo = document.querySelector('#productVideo');
const productName = document.querySelector('#productName');
const productEyebrow = document.querySelector('#productEyebrow');
const productDescription = document.querySelector('#productDescription');
const productStage = document.querySelector('#productStage');
const productSpecs = document.querySelector('#productSpecs');
const productVideos = [
  'assets/media/product-x1-skin.mp4?v=20260824-1',
  'assets/media/product-x1-vest.mp4?v=20260824-1',
  'assets/media/product-x1-studio.mp4?v=20260824-1'
];

productVideo?.addEventListener('error', () => productVideo.classList.add('is-unavailable'));
productVideo?.addEventListener('canplay', () => productVideo.classList.remove('is-unavailable'));
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

  // 添加淡出效果
  const productContent = document.querySelector('#productName').parentElement.parentElement.parentElement;
  productContent.style.opacity = '0';
  productContent.style.transform = 'translateY(10px)';
  productContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

  setTimeout(() => {
    productImage.src = item.image;
    productImage.alt = item.alt;
    if (productVideo) {
      const nextVideo = productVideos[index];
      productVideo.pause();
      // The engineering-development card uses the supplied lab image as its
      // hero artwork; don't let the legacy vest video cover it.
      if (index === 1) {
        productVideo.classList.add('is-unavailable');
        productVideo.removeAttribute('src');
        productVideo.load();
      } else {
        productVideo.classList.remove('is-unavailable');
        productVideo.src = nextVideo || '';
        productVideo.poster = item.image;
        productVideo.load();
        productVideo.play().catch(() => {});
      }
    }
    productName.textContent = item.name;
    productEyebrow.textContent = item.eyebrow;
    productDescription.textContent = item.description;
    productStage.textContent = item.stage;
    productSpecs.innerHTML = item.specs
      .map(([label, value]) => `<div><dt class="text-xs text-slate-500">${label}</dt><dd class="mt-1 font-semibold">${value}</dd></div>`)
      .join('');

    // 更新产品图片区域
    const productMain = document.querySelector('#productImage').parentElement;
    productMain.querySelector('.media-bottom')?.remove();
    const bottomOverlay = document.createElement('div');
    bottomOverlay.className = 'media-bottom pointer-events-none absolute inset-x-0 bottom-0 h-1/2';
    productMain.appendChild(bottomOverlay);

    // 选择产品后，在图片上方显示独立预售入口。
    const presaleBar = document.querySelector('#presaleBar');
    const presaleBtn = document.querySelector('#presaleBtn');
    const presaleProductName = document.querySelector('#presaleProductName');
    const hasPresale = item.presale?.enabled;
    if (hasPresale) {
      presaleProductName.textContent = item.name;
      presaleBar.classList.remove('hidden');
      presaleBar.classList.add('flex');
      presaleBtn.onclick = () => openPresaleModal(index);
    } else {
      presaleBar.classList.add('hidden');
      presaleBar.classList.remove('flex');
    }

    // 淡入效果
    productContent.style.opacity = '1';
    productContent.style.transform = 'translateY(0)';

    productTabs.querySelectorAll('button').forEach((button, itemIndex) => {
      button.setAttribute('aria-selected', String(itemIndex === index));
      // 更新选中状态样式
      if (itemIndex === index) {
        button.classList.add('border-tech', 'bg-tech/5');
        button.classList.remove('border-line');
      } else {
        button.classList.remove('border-tech', 'bg-tech/5');
        button.classList.add('border-line');
      }
    });
  }, 150);
}

function renderProductTabs() {
  productTabs.innerHTML = products.map((item, index) => {
    const hasPresale = item.presale?.enabled;
    const badge = hasPresale
      ? '<span class="rounded bg-signal/10 px-2 py-0.5 text-xs font-medium text-signal">预售</span>'
      : '<i data-lucide="arrow-right" class="size-4 text-slate-400"></i>';
    return `
    <button class="product-thumb lift flex min-h-28 items-center justify-between border border-line p-5 text-left transition-all duration-200 border-[#283337] bg-[#101719]" type="button" role="tab" aria-selected="${index === 0}" data-product="${index}">
      <span><span class="text-xs text-slate-500">0${index + 1} / ${item.stage}</span><strong class="mt-2 block text-lg">${item.name}</strong></span>
      ${badge}
    </button>`;
  }).join('');
  renderProduct(0);

  // 设置第一个标签的选中状态
  const firstTab = productTabs.querySelector('button[data-product="0"]');
  if (firstTab) {
    firstTab.classList.add('border-tech', 'bg-tech/5');
  }
}

function setSceneVideoStatus(state, message) {
  const icon = sceneVideoStatus.querySelector('[data-status-icon]');
  const text = sceneVideoStatus.querySelector('[data-status-text]');

  // 重置所有状态
  sceneVideoStatus.classList.remove('hidden', 'grid');
  icon.classList.remove('animate-spin');

  switch (state) {
    case 'ready':
      sceneVideoStatus.classList.add('hidden');
      break;
    case 'loading':
      sceneVideoStatus.classList.add('grid');
      icon.classList.add('animate-spin');
      icon.setAttribute('data-lucide', 'loader-2');
      text.textContent = message || '视频加载中...';
      break;
    case 'error':
      sceneVideoStatus.classList.add('grid');
      icon.setAttribute('data-lucide', 'refresh-cw');
      text.textContent = message || '视频加载失败';
      break;
    case 'paused':
      sceneVideoStatus.classList.add('grid');
      icon.setAttribute('data-lucide', 'play');
      text.textContent = '点击播放视频';
      break;
  }

  // 重新渲染图标
  lucide.createIcons();
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

  // 添加过渡效果
  const sceneContent = document.querySelector('#sceneName').parentElement.parentElement;
  sceneContent.style.opacity = '0.7';
  sceneContent.style.transition = 'opacity 0.2s ease';

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
    // 更新选中状态样式
    if (itemIndex === index) {
      button.classList.add('border-tech', 'text-tech', 'bg-tech/5');
    } else {
      button.classList.remove('border-tech', 'text-tech', 'bg-tech/5');
    }
  });

  // 淡入效果
  setTimeout(() => {
    sceneContent.style.opacity = '1';
  }, 200);

  lucide.createIcons();
}

function renderSceneTabs() {
  sceneTabs.innerHTML = scenes.map((item, index) => `
    <button class="scene-tab shrink-0 border border-line px-4 py-2.5 text-sm text-slate-600 transition-all duration-200 hover:border-tech hover:text-tech border-[#344044] text-slate-300" type="button" role="tab" aria-selected="${index === 0}" data-scene="${index}">${item.short}</button>`)
    .join('');
  renderScene(0);

  // 设置第一个标签的选中状态
  const firstTab = sceneTabs.querySelector('button[data-scene="0"]');
  if (firstTab) {
    firstTab.classList.add('border-tech', 'text-tech', 'bg-tech/5');
  }
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
  // Let the hero product clear before the final signal panel and the metrics band
  // arrive, so the hand never visually collides with the next section.
  const productOpacity = 1 - smoothstep(.78, .96, progress) * .16;
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
  const showBackToTop = y >= hero.offsetTop + hero.offsetHeight + 200; // 增加200px的延迟显示

  header.classList.toggle('nav-scrolled', y > 24);
  header.classList.toggle('on-hero', onHero);

  // 返回顶部按钮优化
  if (showBackToTop) {
    backToTop.classList.remove('opacity-0', 'translate-y-3', 'pointer-events-none');
    backToTop.classList.add('opacity-100', 'translate-y-0');
  } else {
    backToTop.classList.add('opacity-0', 'translate-y-3', 'pointer-events-none');
    backToTop.classList.remove('opacity-100', 'translate-y-0');
  }

  backToTop.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

  updateHeroStory();
}

window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll();

// 优化返回顶部按钮
backToTop.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

// 导航链接平滑滚动优化
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;

    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      e.preventDefault();

      // 关闭移动端菜单
      if (window.innerWidth < 1280) {
        closeMenu();
      }

      // 计算滚动位置，考虑固定头部高度
      const headerHeight = document.querySelector('#siteHeader').offsetHeight;
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;

      // 平滑滚动
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      // 更新 URL hash
      history.pushState(null, null, targetId);
    }
  });
});

const menuToggle = document.querySelector('#menuToggle');
const mobileMenu = document.querySelector('#mobileMenu');

function closeMenu() {
  mobileMenu.style.maxHeight = '0';
  mobileMenu.style.opacity = '0';
  mobileMenu.style.overflow = 'hidden';
  mobileMenu.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
  setTimeout(() => {
    mobileMenu.classList.add('hidden');
    mobileMenu.style.maxHeight = '';
    mobileMenu.style.opacity = '';
    mobileMenu.style.overflow = '';
  }, 300);
  menuToggle.setAttribute('aria-expanded', 'false');
}

menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';

  if (open) {
    closeMenu();
  } else {
    mobileMenu.classList.remove('hidden');
    // 强制重绘以触发动画
    mobileMenu.offsetHeight;
    mobileMenu.style.maxHeight = mobileMenu.scrollHeight + 'px';
    mobileMenu.style.opacity = '1';
    mobileMenu.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
    menuToggle.setAttribute('aria-expanded', 'true');
  }
});

document.querySelectorAll('.mobile-link').forEach(link => link.addEventListener('click', closeMenu));

// 点击菜单外部关闭菜单
document.addEventListener('click', (e) => {
  if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
    if (menuToggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
    }
  }
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));

// 跳过导航链接的键盘导航
document.querySelectorAll('nav a[href^="#"]').forEach(link => {
  link.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      link.click();
    }
  });
});

// 联系合作按钮点击跳转优化
document.querySelectorAll('[data-contact-topic]').forEach(link => {
  link.addEventListener('click', () => {
    const topic = link.dataset.contactTopic;
    document.querySelector('#contactForm [name="topic"]').value = topic;

    // 关闭移动端菜单（如果打开）
    if (window.innerWidth < 1280) {
      closeMenu();
    }

    // 平滑滚动到联系表单
    setTimeout(() => {
      const contactSection = document.querySelector('#contact');
      const headerHeight = document.querySelector('#siteHeader').offsetHeight;
      const targetPosition = contactSection.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      // 聚焦到姓名字段
      setTimeout(() => {
        document.querySelector('#contactForm [name="name"]').focus();
      }, 500);
    }, 100);
  });
});

// 视频播放控制增强
sceneVideo.addEventListener('loadeddata', () => {
  setSceneVideoStatus('ready', '');
});

sceneVideo.addEventListener('pause', () => {
  if (sceneVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    setSceneVideoStatus('paused', '点击播放视频');
  }
});

sceneVideo.addEventListener('play', () => {
  setSceneVideoStatus('ready', '');
});

// ESC 键关闭移动端菜单
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!mobileMenu.classList.contains('hidden')) {
      closeMenu();
      menuToggle.focus();
    }
  }
});

// 产品图片点击放大功能
const productImageWrapper = document.querySelector('#productImage').parentElement;
productImageWrapper.style.cursor = 'pointer';
productImageWrapper.addEventListener('click', function() {
  const imgSrc = document.querySelector('#productImage').src;
  // 创建全屏图片查看器
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: zoom-out;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  const img = document.createElement('img');
  img.src = imgSrc;
  img.style.cssText = `
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    transform: scale(0.9);
    transition: transform 0.3s ease;
  `;

  modal.appendChild(img);
  document.body.appendChild(modal);

  // 触发动画
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    img.style.transform = 'scale(1)';
  });

  // 点击关闭
  modal.addEventListener('click', () => {
    modal.style.opacity = '0';
    img.style.transform = 'scale(0.9)';
    setTimeout(() => modal.remove(), 300);
  });

  // ESC 关闭
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modal.style.opacity = '0';
      img.style.transform = 'scale(0.9)';
      setTimeout(() => modal.remove(), 300);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
});

// 添加加载指示器
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
});

// 页面可见性变化时的优化
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 页面隐藏时暂停视频和动画
    sceneVideo?.pause();
  } else {
    // 页面可见时恢复
    if (sceneVideo?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      sceneVideo.play().catch(() => {});
    }
  }
});

// 性能优化：防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 滚动事件性能优化
const optimizedHandleScroll = debounce(handleScroll, 10);
window.removeEventListener('scroll', handleScroll);
window.addEventListener('scroll', optimizedHandleScroll, { passive: true });

// 新闻卡片交互优化
document.querySelectorAll('#news article.lift').forEach(card => {
  // 鼠标悬浮效果
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-4px)';
    this.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.08)';
    this.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
  });

  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = 'none';
  });

  // 点击效果（目前是示例，可添加跳转或展开详情）
  card.addEventListener('click', function(e) {
    // 添加点击涟漪效果
    const ripple = document.createElement('div');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(23, 111, 223, 0.1);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
    `;

    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  });
});

// 产品卡片键盘导航支持
document.querySelectorAll('#productTabs button').forEach((button, index) => {
  button.addEventListener('keydown', (e) => {
    const buttons = Array.from(document.querySelectorAll('#productTabs button'));

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % buttons.length;
      buttons[nextIndex].focus();
      renderProduct(nextIndex);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + buttons.length) % buttons.length;
      buttons[prevIndex].focus();
      renderProduct(prevIndex);
    }
  });
});

// 场景标签键盘导航
document.querySelectorAll('#sceneTabs button').forEach((button, index) => {
  button.addEventListener('keydown', (e) => {
    const buttons = Array.from(document.querySelectorAll('#sceneTabs button'));

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % buttons.length;
      buttons[nextIndex].focus();
      renderScene(nextIndex);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + buttons.length) % buttons.length;
      buttons[prevIndex].focus();
      renderScene(prevIndex);
    }
  });
});

// 添加涟漪动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }

  #productTabs button[aria-selected="true"] {
    border-color: rgba(41, 156, 255, 0.62);
    background: linear-gradient(110deg, rgba(23, 111, 223, 0.16), rgba(32, 199, 194, 0.055));
    box-shadow: inset 0 0 0 1px rgba(41, 156, 255, 0.08), 0 14px 36px rgba(0, 0, 0, 0.2);
  }

  .product-thumb:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }

  .scene-tab[aria-selected="true"] {
    border-color: #176fdf;
    color: #176fdf;
    background: rgba(23, 111, 223, 0.05);
  }

  .scene-tab:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }
`;
document.head.appendChild(style);

function initHeroExperience() {
  const canvas = document.querySelector('#heroFlowCanvas');
  if (!hero || !canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const heroStage = hero.querySelector('.hero-sticky');

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const pointer = { x: 0, y: 0, active: false };
  const traces = [];
  const components = [];
  const signalColors = ['#ff7a18', '#4df58a', '#299cff'];
  const signalRgb = ['255,122,24', '77,245,138', '41,156,255'];
  let width = 0;
  let height = 0;
  let frameId = 0;
  let running = true;

  function snap(value, grid = 24) {
    return Math.round(value / grid) * grid;
  }

  function addTrace(points, colorIndex, index) {
    const segments = [];
    let totalLength = 0;

    for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
      const from = points[pointIndex - 1];
      const to = points[pointIndex];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      segments.push({ from, to, length, start: totalLength });
      totalLength += length;
    }

    traces.push({
      points,
      segments,
      totalLength,
      colorIndex,
      speed: 85 + (index % 5) * 18,
      offset: index * 137,
      width: colorIndex === 2 ? 1.15 : .9
    });
  }

  function buildCircuit() {
    traces.length = 0;
    components.length = 0;
    const compact = width < 768;
    const horizontalCount = compact ? 8 : 15;
    const verticalCount = compact ? 4 : 8;
    const grid = compact ? 20 : 24;

    for (let index = 0; index < horizontalCount; index += 1) {
      const y = snap(height * (.07 + index / horizontalCount * .88), grid);
      const x1 = snap(width * (.12 + ((index * 7) % 23) / 100), grid);
      const x2 = snap(width * (.46 + ((index * 11) % 28) / 100), grid);
      const bend = snap(y + ((index % 5) - 2) * grid, grid);
      const endY = snap(bend + ((index % 3) - 1) * grid, grid);
      addTrace([
        { x: -36, y },
        { x: x1, y },
        { x: x1 + grid, y: bend },
        { x: x2, y: bend },
        { x: x2 + grid, y: endY },
        { x: width + 36, y: endY }
      ], index % 3, index);
    }

    for (let index = 0; index < verticalCount; index += 1) {
      const x = snap(width * (.46 + index / Math.max(1, verticalCount - 1) * .5), grid);
      const y1 = snap(height * (.16 + ((index * 13) % 22) / 100), grid);
      const y2 = snap(height * (.58 + ((index * 9) % 24) / 100), grid);
      const bend = snap(x + ((index % 4) - 1.5) * grid, grid);
      addTrace([
        { x, y: -30 },
        { x, y: y1 },
        { x: bend, y: y1 + grid },
        { x: bend, y: y2 },
        { x: bend + (index % 2 ? grid : -grid), y: y2 + grid },
        { x: bend + (index % 2 ? grid : -grid), y: height + 30 }
      ], (index + 2) % 3, horizontalCount + index);
    }

    const componentCount = compact ? 6 : 12;
    for (let index = 0; index < componentCount; index += 1) {
      components.push({
        x: snap(width * (.38 + ((index * 17) % 57) / 100), grid),
        y: snap(height * (.08 + ((index * 23) % 78) / 100), grid),
        w: index % 3 === 0 ? grid * 2.2 : grid * 1.35,
        h: index % 3 === 0 ? grid * 1.3 : grid * .8
      });
    }
  }

  function pointAt(trace, distance) {
    const target = Math.max(0, Math.min(distance, trace.totalLength));
    const segment = trace.segments.find(item => target <= item.start + item.length) || trace.segments.at(-1);
    const amount = segment.length ? (target - segment.start) / segment.length : 0;
    return {
      x: segment.from.x + (segment.to.x - segment.from.x) * amount,
      y: segment.from.y + (segment.to.y - segment.from.y) * amount
    };
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
    buildCircuit();
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
    context.clearRect(0, 0, width, height);
    const parallaxX = pointer.active ? (pointer.x / width - .5) * -7 : 0;
    const parallaxY = pointer.active ? (pointer.y / height - .5) * -5 : 0;
    const storyEnergy = 1 + Number(hero.dataset.storyPhase || 0) * .16;

    context.save();
    context.translate(parallaxX, parallaxY);
    components.forEach((component, index) => {
      context.strokeStyle = index % 4 === 0 ? 'rgba(77,245,138,.16)' : 'rgba(101,145,151,.12)';
      context.fillStyle = 'rgba(4,12,16,.58)';
      context.lineWidth = 1;
      context.fillRect(component.x - component.w / 2, component.y - component.h / 2, component.w, component.h);
      context.strokeRect(component.x - component.w / 2, component.y - component.h / 2, component.w, component.h);
    });

    traces.forEach((trace, traceIndex) => {
      context.beginPath();
      trace.points.forEach((point, pointIndex) => {
        if (pointIndex === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.strokeStyle = `rgba(${signalRgb[trace.colorIndex]},${trace.colorIndex === 1 ? .16 : .11})`;
      context.lineWidth = trace.colorIndex === 2 ? 1.2 : .8;
      context.shadowBlur = 0;
      context.stroke();

      if (trace.colorIndex === 2) {
        context.save();
        context.translate(0, 4);
        context.strokeStyle = 'rgba(41,156,255,.075)';
        context.stroke();
        context.restore();
      }

      trace.points.slice(1, -1).forEach((point, nodeIndex) => {
        const flash = Math.pow(Math.max(0, Math.sin(time * .0022 + traceIndex * 1.7 + nodeIndex)), 9);
        const activeGreen = (traceIndex + nodeIndex) % 4 === 0;
        context.beginPath();
        context.arc(point.x, point.y, activeGreen ? 1.6 + flash * 1.8 : 1.15, 0, Math.PI * 2);
        context.fillStyle = activeGreen
          ? `rgba(77,245,138,${.24 + flash * .76})`
          : 'rgba(126,170,174,.18)';
        context.shadowColor = activeGreen ? '#4df58a' : 'transparent';
        context.shadowBlur = activeGreen ? 4 + flash * 14 : 0;
        context.fill();
      });

      const pulseCount = trace.colorIndex === 0 ? 2 : 1;
      for (let pulseIndex = 0; pulseIndex < pulseCount; pulseIndex += 1) {
        const pulseDistance = ((time * .001 * trace.speed * storyEnergy) + trace.offset + pulseIndex * trace.totalLength * .52) % trace.totalLength;
        const trailLength = trace.colorIndex === 2 ? 120 : trace.colorIndex === 0 ? 82 : 54;
        const steps = trace.colorIndex === 2 ? 18 : 12;
        for (let step = steps; step > 0; step -= 1) {
          const fromDistance = pulseDistance - trailLength * (step / steps);
          const toDistance = pulseDistance - trailLength * ((step - 1) / steps);
          if (toDistance <= 0) continue;
          const from = pointAt(trace, Math.max(0, fromDistance));
          const to = pointAt(trace, toDistance);
          const alpha = (1 - step / (steps + 1)) * (trace.colorIndex === 0 ? .92 : .74);
          context.beginPath();
          context.moveTo(from.x, from.y);
          context.lineTo(to.x, to.y);
          context.strokeStyle = `rgba(${signalRgb[trace.colorIndex]},${alpha})`;
          context.lineWidth = trace.width + (1 - step / steps) * 1.45;
          context.shadowColor = signalColors[trace.colorIndex];
          context.shadowBlur = trace.colorIndex === 0 ? 13 : 9;
          context.stroke();
        }

        const head = pointAt(trace, pulseDistance);
        context.beginPath();
        context.arc(head.x, head.y, trace.colorIndex === 0 ? 2.4 : 1.9, 0, Math.PI * 2);
        context.fillStyle = signalColors[trace.colorIndex];
        context.shadowColor = signalColors[trace.colorIndex];
        context.shadowBlur = trace.colorIndex === 0 ? 18 : 13;
        context.fill();
      }
    });
    context.restore();

    context.shadowBlur = 0;
    const vignette = context.createLinearGradient(0, 0, width, 0);
    vignette.addColorStop(0, 'rgba(2,6,9,.78)');
    vignette.addColorStop(.28, 'rgba(2,6,9,.24)');
    vignette.addColorStop(1, 'rgba(2,6,9,.04)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, width, height);

    const bottomFade = context.createLinearGradient(0, height * .66, 0, height);
    bottomFade.addColorStop(0, 'rgba(2,6,9,0)');
    bottomFade.addColorStop(1, 'rgba(2,6,9,.52)');
    context.fillStyle = bottomFade;
    context.fillRect(0, height * .66, width, height * .34);

    frameId = requestAnimationFrame(draw);
  }

  heroStage.addEventListener('pointermove', event => setPointer(event.clientX, event.clientY), { passive: true });
  heroStage.addEventListener('pointerleave', relaxPointer);
  window.addEventListener('resize', resizeCanvas, { passive: true });

  const visibilityObserver = new IntersectionObserver(entries => {
    const visible = entries[0]?.isIntersecting;
    if (visible && !running) {
      running = true;
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

// 表单验证和提交优化
document.querySelector('#contactForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const status = document.querySelector('#formStatus');
  const payload = Object.fromEntries(new FormData(form).entries());

  // 基本验证
  if (!payload.name || payload.name.trim().length < 2) {
    status.textContent = '请输入有效的姓名（至少2个字符）';
    status.className = 'text-xs text-red-600 text-red-400';
    form.querySelector('[name="name"]').focus();
    return;
  }

  if (!payload.email || !isValidEmail(payload.email)) {
    status.textContent = '请输入有效的邮箱地址';
    status.className = 'text-xs text-red-600 text-red-400';
    form.querySelector('[name="email"]').focus();
    return;
  }

  if (!payload.message || payload.message.trim().length < 10) {
    status.textContent = '需求说明至少需要10个字符';
    status.className = 'text-xs text-red-600 text-red-400';
    form.querySelector('[name="message"]').focus();
    return;
  }

  // 提交表单
  submitButton.disabled = true;
  submitButton.classList.add('opacity-60', 'cursor-not-allowed');
  status.textContent = '正在提交合作需求...';
  status.className = 'text-xs text-slate-500';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || '提交失败');

    status.textContent = '✓ ' + result.message;
    status.className = 'text-xs text-[#138c83] font-semibold';
    form.reset();

    // 3秒后恢复默认状态
    setTimeout(() => {
      status.textContent = '信息将提交至项目联系渠道，仅用于本次合作沟通。';
      status.className = 'text-xs text-slate-500';
    }, 3000);
  } catch (error) {
    status.textContent = error.message || '提交失败，请稍后重试。';
    status.className = 'text-xs text-red-600 text-red-400';
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove('opacity-60', 'cursor-not-allowed');
  }
});

// 邮箱验证函数
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 实时表单验证
document.querySelectorAll('#contactForm input, #contactForm textarea, #contactForm select').forEach(field => {
  field.addEventListener('blur', () => {
    const name = field.name;
    const value = field.value.trim();

    if (field.hasAttribute('required') && !value) {
      field.classList.add('border-red-500');
      field.classList.remove('border-line');
    } else if (name === 'email' && value && !isValidEmail(value)) {
      field.classList.add('border-red-500');
      field.classList.remove('border-line');
    } else {
      field.classList.remove('border-red-500');
      field.classList.add('border-line');
    }
  });

  // 输入时移除错误状态
  field.addEventListener('input', () => {
    field.classList.remove('border-red-500');
    field.classList.add('border-line');
  });
});

// 移动端场景滑动切换
let touchStartX = 0;
let touchEndX = 0;
const sceneContainer = document.querySelector('#sceneTabs')?.closest('section');

if (sceneContainer) {
  sceneContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  sceneContainer.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });
}

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) > swipeThreshold && scenes.length > 1) {
    if (diff > 0 && activeSceneIndex < scenes.length - 1) {
      renderScene(activeSceneIndex + 1);
    } else if (diff < 0 && activeSceneIndex > 0) {
      renderScene(activeSceneIndex - 1);
    }
  }
}

// 预售产品进入独立销售页。
function openPresaleModal(productIndex) {
  const item = products[productIndex];
  if (!item?.presale?.enabled) return;
  const productSlugs = ['x1-skin', 'x1-vest', 'x1-studio'];
  window.location.href = `/buy.html?product=${productSlugs[productIndex] || productSlugs[0]}`;
}

// 复制邮箱功能
document.querySelectorAll('.copy-email-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const email = btn.dataset.email;
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      const status = document.getElementById('copyEmailStatus');
      status.textContent = '已复制';
      status.style.opacity = '1';
      setTimeout(() => { status.style.opacity = '0'; }, 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  });
});

/* ── Circuit board background animation ── */
function initCircuitBoard() {
  const sections = [
    { id: 'about', particleColors: [[255,119,92],[184,229,96],[23,111,223]] },
    { id: 'resources', particleColors: [[255,119,92],[184,229,96],[23,111,223]] }
  ];

  sections.forEach(({ id, particleColors }) => {
    const section = document.getElementById(id);
    const svg = section?.querySelector('.cv-circuit-layer svg');
    if (!section || !svg) return;

    const paths = svg.querySelectorAll('.cv-cols path');
    if (!paths.length) return;

    const glowColor = '255,255,255';
    const allPaths = Array.from(paths);
    const particles = [];
    let running = true;
    let rafId = 0;

    allPaths.forEach((path, i) => {
      particles.push({
        path,
        progress: Math.random(),
        speed: .001 + Math.random() * .003,
        size: 1.2 + Math.random() * 2.5,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        alpha: .5 + Math.random() * .5,
        delay: (i / allPaths.length) * 5000 + Math.random() * 4000,
        started: false,
        startTime: 0
      });
    });

    const NS = 'http://www.w3.org/2000/svg';
    const container = document.createElementNS(NS, 'g');
    container.setAttribute('class', 'cv-particles');
    svg.appendChild(container);

    function createParticleEl() {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', '0');
      c.setAttribute('fill', `rgba(${glowColor},0)`);
      c.setAttribute('filter', `url(#${id === 'about' ? 'cvGlow' : 'cvGlowR'})`);
      container.appendChild(c);
      return c;
    }

    const particleEls = particles.map(() => createParticleEl());

    function animate(ts) {
      if (!running) return;

      particles.forEach((p, i) => {
        if (!p.started) {
          if (ts - p.startTime < p.delay) return;
          p.started = true;
        }

        p.progress += p.speed;
        if (p.progress > 1) {
          p.progress = 0;
          p.delay = 1500 + Math.random() * 5000;
          p.started = false;
          p.startTime = ts;
        }

        if (!p.started) return;

        try {
          const len = p.path.getTotalLength();
          const pt = p.path.getPointAtLength(p.progress * len);
          const el = particleEls[i];
          const fadeLen = .1;
          const alpha = p.progress < fadeLen
            ? p.alpha * (p.progress / fadeLen)
            : p.progress > 1 - fadeLen
              ? p.alpha * ((1 - p.progress) / fadeLen)
              : p.alpha;
          el.setAttribute('cx', pt.x.toFixed(1));
          el.setAttribute('cy', pt.y.toFixed(1));
          el.setAttribute('r', p.size.toFixed(1));
          el.setAttribute('fill', `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${alpha.toFixed(2)})`);
        } catch (e) { /* path not ready */ }
      });

      rafId = requestAnimationFrame(animate);
    }

    const observer = new IntersectionObserver(entries => {
      const visible = entries[0]?.isIntersecting;
      if (visible && !running) {
        running = true;
        rafId = requestAnimationFrame(animate);
      } else if (!visible && running) {
        running = false;
        cancelAnimationFrame(rafId);
      }
    }, { threshold: .02 });
    observer.observe(section);

    rafId = requestAnimationFrame(animate);
  });
}

initCircuitBoard();

lucide.createIcons();
loadContent();
initHeroScrollStory();
initHeroExperience();
