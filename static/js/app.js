// Copyright (c) 2026 Alex Wang
// @author Alex Wang <https://github.com/wanglongxiao>
// @contact https://www.linkedin.com/in/alexwanglx/>

(function () {
  var IMAGE_POOL = [];

  function fetchImages() {
    return fetch('/static/data/images.json')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          IMAGE_POOL = data;
        }
      })
      .catch(function (error) {
        console.warn('Failed to load image list, using empty pool.', error);
      });
  }

  var SITE_NAMES = [
    "Construction Site 1",
    "Construction Site 2",
    "Construction Site 3"
  ];

  var state = {
    images: [],
    analyzing: false,
    loadingImages: false,
    hoveredImg: null,
    stats: null,
    activeSite: 0,
    imagePageSize: 20,
    showAlerts: false
  };

  function hardHatIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 15V6.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V15"/><path d="M4 15V9a8 8 0 0 1 16 0v6"/></svg>';
  }

  function bellIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  }

  function alertTriangleIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  }

  function checkCircleIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
  }

  function refreshCwIcon(spin) {
    var cls = spin ? 'animate-spin' : '';
    return '<svg class="' + cls + '" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>';
  }

  function scanEyeIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  }

  function xIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  }

  function loader2Icon(size) {
    var s = size || 24;
    return '<svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
  }

  function $(id) {
    return document.getElementById(id);
  }

  function checkImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(true); };
      img.onerror = function () { reject(false); };
      img.src = url;
    });
  }

  function fetchConfig() {
    return fetch('/api/config')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var configuredPageSize = data && data.imagePageSize;
        if (configuredPageSize && configuredPageSize > 0) {
          state.imagePageSize = configuredPageSize;
        }
      })
      .catch(function (error) {
        console.warn('Failed to load runtime config, using defaults.', error);
      });
  }

  function generateImages() {
    state.loadingImages = true;
    state.images = [];
    renderImages();
    renderSiteButtons();

    var validImages = [];
    var candidates = IMAGE_POOL.slice();
    var targetCount = state.imagePageSize;

    candidates.sort(function () { return Math.random() - 0.5; });

    var idCounter = 1;

    var chain = Promise.resolve();

    candidates.forEach(function (url) {
      chain = chain.then(function () {
        if (validImages.length >= targetCount) return;
        return checkImage(url).then(function () {
          validImages.push({ id: idCounter++, url: url });
        }).catch(function () {
          console.warn('Image failed to load: ' + url);
        });
      });
    });

    chain.then(function () {
      if (validImages.length > 0 && validImages.length < targetCount) {
        var uniqueValidImages = validImages.slice();
        var i = 0;
        while (validImages.length < targetCount) {
          var sourceImg = uniqueValidImages[i % uniqueValidImages.length];
          validImages.push({ id: idCounter++, url: sourceImg.url });
          i++;
        }
      }

      state.images = validImages;
      state.loadingImages = false;
      renderImages();
      renderSiteButtons();
    });
  }

  function handleRefresh() {
    generateImages();
  }

  function handleAnalyze() {
    if (state.analyzing || state.loadingImages || state.images.length === 0) return;

    state.analyzing = true;
    state.stats = { totalTokens: 0, totalTime: 0 };
    renderStats();
    renderSiteButtons();

    var currentImages = state.images.slice();
    var totalTokens = 0;
    var startTime = Date.now();

    var promises = currentImages.map(function (img, index) {
      state.images[index].loading = true;
      renderImages();

      return fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: img.url })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var usage = data.usage;
          var result = Object.assign({}, data);
          delete result.usage;

          if (usage && usage.total_tokens) {
            totalTokens += usage.total_tokens;
          }

          state.images[index].loading = false;
          state.images[index].result = result;
          renderImages();
          renderAlerts();
          renderHazardLogs();
        })
        .catch(function (error) {
          console.error('Failed to analyze image ' + img.id, error);
          state.images[index].loading = false;
          state.images[index].result = { isSafe: false, reason: 'Analysis failed' };
          renderImages();
          renderAlerts();
          renderHazardLogs();
        });
    });

    Promise.all(promises).then(function () {
      var endTime = Date.now();
      state.stats = {
        totalTokens: totalTokens,
        totalTime: endTime - startTime
      };
      state.analyzing = false;
      renderStats();
      renderAlerts();
      renderHazardLogs();
      renderSiteButtons();
    });
  }

  function handleImageClick(img) {
    state.hoveredImg = img;
    renderModal();
  }

  function closeModal() {
    state.hoveredImg = null;
    renderModal();
  }

  function toggleAlerts() {
    state.showAlerts = !state.showAlerts;
    renderAlerts();
  }

  function setActiveSite(index) {
    state.activeSite = index;
    renderSiteButtons();
    generateImages();
  }

  function renderSiteButtons() {
    var container = $('site-buttons');
    if (!container) return;

    var html = '';
    SITE_NAMES.forEach(function (name, index) {
      var active = state.activeSite === index;
      var cls = 'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ';
      cls += active
        ? 'bg-blue-100 text-blue-700 border border-blue-200'
        : 'text-gray-600 hover:bg-gray-100';
      html += '<button class="' + cls + '" data-site="' + index + '">' + name + '</button>';
    });
    container.innerHTML = html;

    container.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setActiveSite(parseInt(btn.getAttribute('data-site'), 10));
      });
    });

    var titleEl = $('site-title');
    if (titleEl) {
      titleEl.textContent = SITE_NAMES[state.activeSite] + ' - Safety Monitor';
    }
  }

  function renderAlerts() {
    var bellBtn = $('alert-bell');
    var badge = $('alert-badge');
    var dropdown = $('alert-dropdown');
    var list = $('alert-list');

    if (!bellBtn || !dropdown || !list) return;

    var unsafeImages = state.images.filter(function (img) {
      return img.result && !img.result.isSafe;
    });
    var unsafeCount = unsafeImages.length;

    if (badge) {
      if (unsafeCount > 0) {
        badge.textContent = unsafeCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    if (state.showAlerts) {
      dropdown.style.display = 'block';
    } else {
      dropdown.style.display = 'none';
      return;
    }

    if (unsafeCount === 0) {
      list.innerHTML = '<div class="p-8 text-center text-gray-500 text-sm">' +
        checkCircleIcon().replace('width="24"', 'width="32"').replace('height="24"', 'height="32"') +
        '<p class="mt-2 opacity-50">No safety hazards detected.</p></div>';
    } else {
      var html = '';
      unsafeImages.forEach(function (img) {
        var reason = (img.result && (img.result.reason_en || img.result.reason)) || '';
        html += '<div class="p-3 bg-red-50/50 rounded-md border border-red-100 hover:bg-red-50 transition-colors cursor-pointer" data-img-id="' + img.id + '">' +
          '<div class="flex gap-3">' +
          '<img src="' + img.url + '" class="w-16 h-12 object-cover rounded bg-gray-200" alt="Alert ' + img.id + '" />' +
          '<div class="flex-1 min-w-0">' +
          '<div class="flex items-center justify-between mb-1">' +
          '<span class="text-xs font-bold text-red-700">Image #' + img.id + '</span>' +
          '</div>' +
          '<p class="text-xs text-gray-600 line-clamp-2">' + escapeHtml(reason) + '</p>' +
          '</div></div></div>';
      });
      list.innerHTML = html;

      list.querySelectorAll('[data-img-id]').forEach(function (el) {
        el.addEventListener('click', function () {
          var imgId = parseInt(el.getAttribute('data-img-id'), 10);
          var img = state.images.find(function (i) { return i.id === imgId; });
          if (img) {
            state.showAlerts = false;
            renderAlerts();
            handleImageClick(img);
          }
        });
      });
    }
  }

  function renderHazardLogs() {
    var section = $('hazard-logs');
    var list = $('hazard-log-list');
    if (!section || !list) return;

    var unsafeImages = state.images.filter(function (img) {
      return img.result && !img.result.isSafe;
    });

    if (unsafeImages.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';

    var html = '';
    unsafeImages.forEach(function (img) {
      var reason = (img.result && (img.result.reason_en || img.result.reason)) || '';
      var reasonZh = (img.result && img.result.reason_zh) || '';
      html += '<div class="flex items-start p-3 bg-red-50 rounded-md border border-red-100 text-sm">' +
        '<span class="font-mono font-bold text-red-700 mr-3 shrink-0">[Image #' + img.id + ']</span>' +
        '<div class="flex flex-col gap-1 text-gray-800">' +
        '<p>' + escapeHtml(reason) + '</p>' +
        (reasonZh ? '<p class="text-gray-600">' + escapeHtml(reasonZh) + '</p>' : '') +
        '</div></div>';
    });
    list.innerHTML = html;
  }

  function renderStats() {
    var overlay = $('stats-overlay');
    var tokensEl = $('stats-tokens');
    var timeEl = $('stats-time');
    if (!overlay) return;

    if (state.stats) {
      overlay.style.display = 'block';
      if (tokensEl) tokensEl.textContent = state.stats.totalTokens.toLocaleString();
      if (timeEl) timeEl.textContent = (state.stats.totalTime / 1000).toFixed(2) + 's';
    } else {
      overlay.style.display = 'none';
    }
  }

  function renderImages() {
    var grid = $('image-grid');
    var spinner = $('loading-spinner');
    if (!grid) return;

    if (state.loadingImages && state.images.length === 0) {
      if (spinner) spinner.style.display = 'flex';
      grid.innerHTML = '';
      return;
    }

    if (spinner) spinner.style.display = 'none';

    var html = '';
    state.images.forEach(function (img) {
      var borderCls = 'border-transparent';
      if (img.result && !img.result.isSafe) {
        borderCls = 'border-red-500 shadow-red-100';
      } else if (img.result && img.result.isSafe) {
        borderCls = 'border-green-500';
      }

      var statusHtml = '';
      if (!img.result && !img.loading) {
        statusHtml = '<p class="text-gray-400 text-xs">Waiting for analysis...</p>';
      } else if (img.result) {
        if (img.result.isSafe) {
          statusHtml = '<span class="inline-flex items-center text-green-600 font-medium text-xs">' +
            checkCircleIcon().replace('width="24"', 'width="12"').replace('height="24"', 'height="12"') +
            ' Safe</span>';
        } else {
          statusHtml = '<span class="inline-flex items-center text-red-600 font-medium text-xs">' +
            alertTriangleIcon().replace('width="24"', 'width="12"').replace('height="24"', 'height="12"') +
            ' Hazard Detected</span>';
        }
      }

      var loadingOverlay = '';
      if (img.loading) {
        loadingOverlay = '<div class="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-sm">' +
          loader2Icon(32).replace('class="animate-spin"', 'class="animate-spin text-white"') +
          '</div>';
      }

      html += '<div class="relative bg-white rounded-lg shadow-sm overflow-hidden border-2 transition-all cursor-pointer hover:shadow-md ' + borderCls + '" data-img-id="' + img.id + '">' +
        '<div class="aspect-video relative">' +
        '<img src="' + img.url + '" alt="Monitor ' + img.id + '" class="w-full h-full object-cover" />' +
        '<div class="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-mono">#' + img.id + '</div>' +
        loadingOverlay +
        '</div>' +
        '<div class="p-3 text-sm">' + statusHtml + '</div>' +
        '</div>';
    });
    grid.innerHTML = html;

    grid.querySelectorAll('[data-img-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        var imgId = parseInt(el.getAttribute('data-img-id'), 10);
        var img = state.images.find(function (i) { return i.id === imgId; });
        if (img) handleImageClick(img);
      });
    });

    var btnRefresh = $('btn-refresh');
    var btnAnalyze = $('btn-analyze');
    if (btnRefresh) {
      btnRefresh.disabled = state.analyzing || state.loadingImages;
      var spinActive = state.analyzing || state.loadingImages;
      btnRefresh.innerHTML = refreshCwIcon(spinActive) +
        '<span class="ml-2">' + (state.loadingImages ? 'Loading Images...' : 'Refresh') + '</span>';
    }
    if (btnAnalyze) {
      btnAnalyze.disabled = state.analyzing || state.loadingImages || state.images.length === 0;
    }
  }

  function renderModal() {
    var modal = $('image-modal');
    var modalImage = $('modal-image');
    var modalBbox = $('modal-bbox');
    var modalTitle = $('modal-title');
    var modalClose = $('modal-close');
    var modalResult = $('modal-result');

    if (!modal) return;

    if (!state.hoveredImg) {
      modal.style.display = 'none';
      return;
    }

    modal.style.display = 'flex';

    var img = state.hoveredImg;

    if (modalImage) {
      modalImage.src = img.url;
      modalImage.alt = 'Detail ' + img.id;
    }

    if (modalBbox) {
      if (img.result && img.result.bbox && img.result.bbox.length === 4) {
        var bbox = img.result.bbox;
        modalBbox.style.display = 'block';
        modalBbox.style.top = (bbox[0] / 10) + '%';
        modalBbox.style.left = (bbox[1] / 10) + '%';
        modalBbox.style.height = ((bbox[2] - bbox[0]) / 10) + '%';
        modalBbox.style.width = ((bbox[3] - bbox[1]) / 10) + '%';
      } else {
        modalBbox.style.display = 'none';
      }
    }

    if (modalTitle) {
      if (img.result && !img.result.isSafe) {
        modalTitle.innerHTML = alertTriangleIcon().replace('width="24"', 'width="20"').replace('height="24"', 'height="20"') +
          '<span class="ml-2 text-red-600">Hazard Detected - Image #' + img.id + '</span>';
        modalTitle.className = 'text-lg font-bold flex items-center';
      } else {
        modalTitle.innerHTML = scanEyeIcon().replace('width="16"', 'width="20"').replace('height="16"', 'height="20"') +
          '<span class="ml-2 text-gray-900">Image Monitor #' + img.id + '</span>';
        modalTitle.className = 'text-lg font-bold flex items-center';
      }
    }

    if (modalResult) {
      if (img.result) {
        if (!img.result.isSafe) {
          var reason = img.result.reason_en || img.result.reason || '';
          var reasonZh = img.result.reason_zh || '';
          modalResult.className = 'p-6 border-t bg-red-50 border-red-100';
          modalResult.innerHTML = '<div class="space-y-2">' +
            '<p class="text-lg font-medium text-gray-900">' + escapeHtml(reason) + '</p>' +
            (reasonZh ? '<p class="text-lg text-gray-700">' + escapeHtml(reasonZh) + '</p>' : '') +
            '</div>';
        } else {
          modalResult.className = 'p-6 border-t bg-green-50 border-green-100';
          modalResult.innerHTML = '<div class="flex items-center text-green-700">' +
            checkCircleIcon().replace('width="24"', 'width="24"') +
            '<span class="ml-3 text-lg font-medium">No obvious safety hazards detected in this frame.</span></div>';
        }
      } else {
        modalResult.className = 'p-6 border-t bg-gray-50 border-gray-100 text-center text-gray-500';
        modalResult.innerHTML = 'Analysis not yet performed on this image.';
      }
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetchConfig().then(function () {
      return fetchImages();
    }).then(function () {
      generateImages();
    });

    renderSiteButtons();
    renderAlerts();
    renderHazardLogs();
    renderStats();
    renderModal();

    var bellBtn = $('alert-bell');
    if (bellBtn) {
      bellBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleAlerts();
      });
    }

    document.addEventListener('click', function (e) {
      var dropdown = $('alert-dropdown');
      var bellBtn = $('alert-bell');
      if (state.showAlerts && dropdown && bellBtn) {
        if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
          state.showAlerts = false;
          renderAlerts();
        }
      }
    });

    var btnRefresh = $('btn-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', handleRefresh);
    }

    var btnAnalyze = $('btn-analyze');
    if (btnAnalyze) {
      btnAnalyze.addEventListener('click', handleAnalyze);
    }

    var modal = $('image-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          closeModal();
        }
      });
    }

    var modalClose = $('modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', function (e) {
        e.stopPropagation();
        closeModal();
      });
    }
  });
})();
