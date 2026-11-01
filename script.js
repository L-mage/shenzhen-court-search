// Real judge data loaded from judge-data.js

// ===== Constants =====
const PAGE_SIZE = 200;

// ===== State =====
const state = {
  searchQuery: "",
  filters: {
    department: null,
    caseType: null,
    district: null,
    court: null,
    deptDetail: null,
  },
  visibleCount: PAGE_SIZE,
  currentResults: [],
};

// ===== DOM Elements =====
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const searchTags = document.getElementById("searchTags");
const resultsContainer = document.getElementById("resultsContainer");
const noResults = document.getElementById("noResults");
const resultCount = document.getElementById("resultCount");
const activeFilterTags = document.getElementById("activeFilterTags");
const clearAllFilters = document.getElementById("clearAllFilters");
const activeFiltersDiv = document.getElementById("activeFilters");
const deptDetailFilters = document.getElementById("deptDetailFilters");

// 庭室筛选：按当前所选法院动态生成，避免不同法院的庭室名混在一起
let deptDetailExpanded = false;
const DEPT_DETAIL_LIMIT = 10;

// Load-more button
const loadMoreBtn = document.createElement("button");
loadMoreBtn.className = "load-more-btn";
loadMoreBtn.textContent = "加载更多...";
loadMoreBtn.addEventListener("click", () => {
  state.visibleCount += PAGE_SIZE;
  renderResults(state.currentResults);
});
document.querySelector(".results-section").appendChild(loadMoreBtn);

// ===== Initialization =====
function init() {
  state.currentResults = judgeData;
  renderDeptDetailFilters();
  renderResults(judgeData);
  bindEvents();
}

function bindEvents() {
  // Search input
  searchInput.addEventListener("input", () => {
    const val = searchInput.value.trim();
    state.searchQuery = val;
    searchClear.classList.toggle("visible", val.length > 0);
    applyAllFilters();
  });

  // Search clear button
  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    state.searchQuery = "";
    searchClear.classList.remove("visible");
    applyAllFilters();
    searchInput.focus();
  });

  // Search tags
  searchTags.addEventListener("click", (e) => {
    const tag = e.target.closest(".tag");
    if (!tag) return;
    const query = tag.dataset.search;
    searchInput.value = query;
    state.searchQuery = query;
    searchClear.classList.add("visible");
    applyAllFilters();
  });

  // Filter chips
  document.querySelectorAll(".filter-chips").forEach((group) => {
    group.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      if (chip.classList.contains("chip-more")) {
        deptDetailExpanded = !deptDetailExpanded;
        renderDeptDetailFilters();
        return;
      }
      const filterKey = chip.dataset.filter;
      const filterValue = chip.dataset.value;

      if (state.filters[filterKey] === filterValue) {
        // Deselect
        state.filters[filterKey] = null;
        chip.classList.remove("active");
      } else {
        // Deselect sibling
        group.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        // Select
        state.filters[filterKey] = filterValue;
        chip.classList.add("active");
      }

      // 法院变化时重建庭室选项
      if (filterKey === "court") renderDeptDetailFilters();

      updateActiveFilterTags();
      applyAllFilters();
    });
  });

  // Clear all filters
  clearAllFilters.addEventListener("click", () => {
    Object.keys(state.filters).forEach((k) => (state.filters[k] = null));
    document.querySelectorAll(".chip.active").forEach((c) => c.classList.remove("active"));
    renderDeptDetailFilters();
    updateActiveFilterTags();
    applyAllFilters();
  });
}

// ===== 庭室筛选（动态） =====
function getDeptDetailOptions() {
  const court = state.filters.court;
  const counts = new Map();
  judgeData.forEach((j) => {
    if (court && j.court !== court) return;
    const v = (j.deptDetail || "").trim();
    if (!v) return;
    counts.set(v, (counts.get(v) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function renderDeptDetailFilters() {
  if (!deptDetailFilters) return;
  const all = getDeptDetailOptions();

  // 切换法院后，原先选中的庭室可能在该法院不存在，自动失效
  if (state.filters.deptDetail && !all.some(([v]) => v === state.filters.deptDetail)) {
    state.filters.deptDetail = null;
  }

  const list = deptDetailExpanded ? all : all.slice(0, DEPT_DETAIL_LIMIT);
  const chips = list
    .map(([v, n]) => {
      const active = state.filters.deptDetail === v ? " active" : "";
      return `<button class="chip${active}" data-filter="deptDetail" data-value="${v}">${v}<span class="chip-count">${n}</span></button>`;
    })
    .join("");

  const more =
    all.length > DEPT_DETAIL_LIMIT
      ? `<button class="chip chip-more">${
          deptDetailExpanded ? "收起" : `更多 ${all.length - DEPT_DETAIL_LIMIT} 个`
        }</button>`
      : "";

  deptDetailFilters.innerHTML = chips + more;
}

// ===== Filter Logic =====
function applyAllFilters() {
  let results = [...judgeData];

  // Text search
  const q = state.searchQuery.toLowerCase();
  if (q) {
    results = results.filter(
      (j) =>
        j.name.includes(q) ||
        j.court.includes(q) ||
        j.department.includes(q) ||
        j.caseType.includes(q) ||
        j.district.includes(q) ||
        j.phone.includes(q) ||
        (j.deptDetail && j.deptDetail.includes(q))
    );
  }

  // Filter chips
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value) {
      results = results.filter((j) => j[key] === value);
    }
  });

  // Reset pagination
  state.visibleCount = PAGE_SIZE;
  state.currentResults = results;
  renderResults(results);
}

// ===== Render =====
function renderResults(results) {
  resultsContainer.innerHTML = "";

  const totalCount = results.length;
  resultCount.textContent = `（共 ${totalCount} 条结果）`;

  if (totalCount === 0) {
    noResults.classList.remove("hidden");
    loadMoreBtn.classList.add("hidden");
  } else {
    noResults.classList.add("hidden");
    // Only render up to visibleCount
    const toShow = results.slice(0, state.visibleCount);
    const fragment = document.createDocumentFragment();
    toShow.forEach((judge) => {
      fragment.appendChild(createJudgeCard(judge));
    });
    resultsContainer.appendChild(fragment);

    // Toggle load-more button
    if (state.visibleCount >= totalCount) {
      loadMoreBtn.classList.add("hidden");
    } else {
      loadMoreBtn.classList.remove("hidden");
      loadMoreBtn.textContent = `加载更多（已显示 ${state.visibleCount} / 共 ${totalCount} 条）`;
    }
  }
}

function buildReportMailto(judge) {
  const subject = `【更正/删除申请】${judge.name} - ${judge.court}`;
  const body =
    `您好，我发现以下记录需要更正或删除：\n\n` +
    `姓名：${judge.name}\n` +
    `法院：${judge.court}\n` +
    `庭室：${judge.department}${judge.deptDetail && judge.deptDetail !== judge.department ? " / " + judge.deptDetail : ""}\n` +
    `电话：${judge.phone}\n\n` +
    `申请类型（更正 / 删除）：\n` +
    `具体说明：\n\n` +
    `（如为删除申请，本站将下架该条并加入不再采集名单。为核验关联性，可能请您提供工号或任职证明，核验材料用后即删。）`;
  return `mailto:3219657129@qq.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function createJudgeCard(judge) {
  const card = document.createElement("div");
  card.className = "judge-card";

  const deptChips = [];
  if (judge.deptDetail && judge.deptDetail !== judge.department) {
    deptChips.push(`<span class="mini-chip dept-detail">${judge.deptDetail}</span>`);
  }
  deptChips.push(`<span class="mini-chip dept-main">${judge.department}</span>`);
  if (judge.caseType) {
    deptChips.push(`<span class="mini-chip case-type">${judge.caseType}</span>`);
  }

  card.innerHTML = `
    <div class="judge-name">${judge.name}</div>
    <div class="judge-info">
      <span class="judge-info-item">
        <span class="judge-info-dot"></span>${judge.court}
      </span>
      <span class="judge-info-item">
        <span class="judge-info-dot"></span>${judge.district}
      </span>
    </div>
    <div class="judge-department">
      ${deptChips.join("")}
    </div>
    <div class="judge-phone-wrapper">
      <span class="judge-phone-label">公务电话</span>
      <a href="tel:${judge.phone}" class="judge-phone">${judge.phone}</a>
      <button class="copy-btn" data-phone="${judge.phone}">复制号码</button>
    </div>
    <a class="report-link" href="${buildReportMailto(judge)}">信息有误？申请更正 / 删除</a>
  `;

  // Copy button logic
  const copyBtn = card.querySelector(".copy-btn");
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const phone = copyBtn.dataset.phone;
    navigator.clipboard.writeText(phone).then(() => {
      copyBtn.textContent = "已复制 ✓";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.textContent = "复制号码";
        copyBtn.classList.remove("copied");
      }, 1500);
    });
  });

  return card;
}

// ===== Active Filter Tags =====
function updateActiveFilterTags() {
  activeFilterTags.innerHTML = "";

  const labelMap = {
    department: "职能部门",
    caseType: "案件类型",
    district: "区县",
    court: "法院",
    deptDetail: "庭室",
  };

  let hasFilters = false;
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value) {
      hasFilters = true;
      const tag = document.createElement("span");
      tag.className = "active-filter-tag";
      tag.innerHTML = `${value} <span class="remove">&times;</span>`;
      tag.addEventListener("click", () => {
        state.filters[key] = null;
        // Remove active from the corresponding chip
        document
          .querySelector(`.chip[data-filter="${key}"][data-value="${value}"]`)
          ?.classList.remove("active");
        updateActiveFilterTags();
        applyAllFilters();
      });
      activeFilterTags.appendChild(tag);
    }
  });

  activeFiltersDiv.style.display = hasFilters ? "flex" : "none";
}

// ===== Start =====
document.addEventListener("DOMContentLoaded", init);
