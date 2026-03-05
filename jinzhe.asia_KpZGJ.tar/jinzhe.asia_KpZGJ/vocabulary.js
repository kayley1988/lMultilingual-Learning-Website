
/* ==================== 全局变量 ==================== */
/* ==================== 新的数据结构 ==================== */
let vocabulary = []; // 迁移后保留，但结构改为包含文件夹
let folderStructure = {
    folders: [
        {
            id: 'root',
            name: '我的单词本',
            type: 'folder',
            parentId: null,
            expanded: true
        }
    ]
}; // 文件夹结构树
let currentFolderId = 'root'; // 当前所在文件夹
let selectedWords = new Set(); // 选中的单词
let currentView = 'card'; // 当前视图模式
let currentFilter = 'all'; // 当前语言过滤
let selectedLanguage = ''; // AI生成选择的语言
let currentSearchTerm = ''; // 当前搜索词
let currentPage = 1;
let itemsPerPage = 20; // 每页显示20个单词
let importTargetFolderId = null; // 导入时的目标文件夹
let aiSelectedTargetFolderId = 'root'; // AI 模态中树形选择器当前选中项



/* ==================== MySQL 配置 ==================== */
let mysqlConfig = {
    enabled: false, // 是否启用MySQL同步
    apiUrl: '/api/learning', // API基础URL
    autoSync: true, // 是否自动同步
    syncInterval: 30000, // 自动同步间隔（30秒）
    lastSync: null // 上次同步时间
};
let syncStatus = {
    syncing: false,
    pending: 0, // 待同步项目数
    lastError: null
};

/* ==================== 语言配置（20种语言） ==================== */
const LANGUAGES = {
    'en': { name: '英语', flag: '🇬🇧', voice: 'en-US', romanType: 'ipa' },
    'ja': { name: '日语', flag: '🇯🇵', voice: 'ja-JP', romanType: 'romaji' },
    'ko': { name: '韩语', flag: '🇰🇷', voice: 'ko-KR', romanType: 'romanization' },
    'zh': { name: '中文', flag: '🇨🇳', voice: 'zh-CN', romanType: 'pinyin' },
    'fr': { name: '法语', flag: '🇫🇷', voice: 'fr-FR', romanType: 'ipa' },
    'de': { name: '德语', flag: '🇩🇪', voice: 'de-DE', romanType: 'ipa' },
    'es': { name: '西班牙语', flag: '🇪🇸', voice: 'es-ES', romanType: 'ipa' },
    'it': { name: '意大利语', flag: '🇮🇹', voice: 'it-IT', romanType: 'ipa' },
    'pt': { name: '葡萄牙语', flag: '🇵🇹', voice: 'pt-PT', romanType: 'ipa' },
    'ru': { name: '俄语', flag: '🇷🇺', voice: 'ru-RU', romanType: 'romanization' },
    'ar': { name: '阿拉伯语', flag: '🇸🇦', voice: 'ar-SA', romanType: 'romanization' },
    'hi': { name: '印地语', flag: '🇮🇳', voice: 'hi-IN', romanType: 'romanization' },
    'th': { name: '泰语', flag: '🇹🇭', voice: 'th-TH', romanType: 'romanization' },
    'vi': { name: '越南语', flag: '🇻🇳', voice: 'vi-VN', romanType: 'romanization' },
    'tr': { name: '土耳其语', flag: '🇹🇷', voice: 'tr-TR', romanType: 'ipa' },
    'pl': { name: '波兰语', flag: '🇵🇱', voice: 'pl-PL', romanType: 'ipa' },
    'nl': { name: '荷兰语', flag: '🇳🇱', voice: 'nl-NL', romanType: 'ipa' },
    'sv': { name: '瑞典语', flag: '🇸🇪', voice: 'sv-SE', romanType: 'ipa' },
    'da': { name: '丹麦语', flag: '🇩🇰', voice: 'da-DK', romanType: 'ipa' },
    'no': { name: '挪威语', flag: '🇳🇴', voice: 'no-NO', romanType: 'ipa' },
    'kk': { name: '哈萨克语', flag: '🇰🇿', voice: 'kk-KZ', romanType: 'romanization' },
    'ur': { name: '乌尔都语', flag: '🇵🇰', voice: 'ur-PK', romanType: 'romanization' }
};

/* ==================== 初始化 ==================== */
document.addEventListener('DOMContentLoaded', function() {
    loadMySQLConfig();          // 新增：加载MySQL配置
    loadVocabulary();
    loadFolderStructure();      // 新增：加载文件夹结构
    migrateOldData();           // 新增：迁移旧数据
    updateStats();
    renderFolderBreadcrumb();   // 新增：渲染面包屑
    renderFolderSidebar();      // 新增：渲染侧边栏
    renderVocabulary();
    checkPendingWords();
    initSidebarResizer();
    initSyncUI();               // 新增：初始化同步UI
    if (mysqlConfig.enabled && mysqlConfig.autoSync) {
        startAutoSync();        // 新增：启动自动同步
    }
    
    // 确保函数在全局作用域
    window.generateExample = generateExample;
    window.showWordGraphModal = showWordGraphModal;
    window.editWord = editWord;
    window.deleteWord = deleteWord;
    window.switchView = switchView;
});



/* ==================== 侧栏宽度拖拽调整 ==================== */
function initSidebarResizer() {
    const resizer = document.getElementById('sidebarResizer');
    const sidebar = document.getElementById('folderSidebar');
    if (!resizer || !sidebar) return;

    // 恢复上次宽度
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        sidebar.style.width = savedWidth + 'px';
    }

    let dragging = false;
    let startX = 0;
    let startWidth = 0;

    const minWidth = parseInt(getComputedStyle(sidebar).minWidth) || 200;
    const maxWidth = parseInt(getComputedStyle(sidebar).maxWidth) || 600;

    function onPointerDown(e) {
        e.preventDefault();
        dragging = true;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startWidth = sidebar.getBoundingClientRect().width;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    function onPointerMove(e) {
        if (!dragging) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        if (typeof clientX !== 'number') return;
        const delta = clientX - startX;
        let newWidth = startWidth + delta;
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;
        sidebar.style.width = newWidth + 'px';
    }

    function onPointerUp() {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // 保存宽度
        const finalWidth = sidebar.getBoundingClientRect().width;
        localStorage.setItem('sidebarWidth', Math.round(finalWidth));
    }

    // 鼠标事件
    resizer.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    // Touch 事件
    resizer.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    // 键盘支持：左右键微调
    resizer.addEventListener('keydown', (e) => {
        const step = 8;
        const current = sidebar.getBoundingClientRect().width;
        if (e.key === 'ArrowLeft') {
            const newW = Math.max(minWidth, current - step);
            sidebar.style.width = newW + 'px';
            localStorage.setItem('sidebarWidth', Math.round(newW));
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            const newW = Math.min(maxWidth, current + step);
            sidebar.style.width = newW + 'px';
            localStorage.setItem('sidebarWidth', Math.round(newW));
            e.preventDefault();
        }
    });
}

/* ==================== 加载单词本数据 ==================== */
function loadVocabulary() {
    const saved = localStorage.getItem('vocabulary');
    if (saved) {
        try {
            vocabulary = JSON.parse(saved);
        } catch (e) {
            console.error('加载单词本失败:', e);
            vocabulary = [];
        }
    }
}

function saveVocabulary() {
    localStorage.setItem('vocabulary', JSON.stringify(vocabulary));
    updateStats();
}

/* ==================== 检查从阅读页面提取的单词 ==================== */
function checkPendingWords() {
    const pendingData = localStorage.getItem('pendingExtractedWords');
    if (pendingData) {
        try {
            const data = JSON.parse(pendingData);
            const words = data.words || [];
            const folderName = data.folderName;
            const folderIdFromPending = data.folderId;
            const stats = data.stats || {};
            
            if (!Array.isArray(words) || words.length === 0) {
                localStorage.removeItem('pendingExtractedWords');
                return;
            }
            
            // 显示提示（包含统计信息）
            const statsText = stats.total ? `\n处理统计：\n- 总词汇数：${stats.total}\n- 跳过词汇：${stats.skipped || 0}\n- 重复词汇：${stats.duplicate || 0}\n- 新增词汇：${stats.new || words.length}` : '';
            showNotification(`📥 从阅读页面提取了 ${words.length} 个单词${folderName ? ' 到文件夹 "' + folderName + '"' : ''}，正在AI补全...${statsText}`);
            
            // 如果有指定 folderId 优先使用；否则按 folderName 查找或创建
            let targetFolderId = 'root';
            if (folderIdFromPending) {
                const found = folderStructure.folders.find(f => f.id === folderIdFromPending);
                if (found) {
                    targetFolderId = folderIdFromPending;
                } else if (folderName) {
                    // fallback to name-based creation if id不存在
                    let folder = folderStructure.folders.find(f => f.name === folderName && f.type === 'folder');
                    if (!folder) {
                        folder = {
                            id: 'folder-' + Date.now(),
                            name: folderName,
                            type: 'folder',
                            parentId: 'root',
                            expanded: true
                        };
                        folderStructure.folders.push(folder);
                        saveFolderStructure();
                    }
                    targetFolderId = folder.id;
                }
            } else if (folderName) {
                let folder = folderStructure.folders.find(f => f.name === folderName && f.type === 'folder');
                if (!folder) {
                    folder = {
                        id: 'folder-' + Date.now(),
                        name: folderName,
                        type: 'folder',
                        parentId: 'root',
                        expanded: true
                    };
                    folderStructure.folders.push(folder);
                    saveFolderStructure();
                }
                targetFolderId = folder.id;
            }
            
            // 性能限制：如果单词太多，只处理前1000个
            const MAX_WORDS = 1000;
            let wordsToProcess = words;
            if (words.length > MAX_WORDS) {
                wordsToProcess = words.slice(0, MAX_WORDS);
                console.warn(`单词数量超过限制（${words.length}），只处理前 ${MAX_WORDS} 个`);
                showNotification(`⚠️ 单词数量较多（${words.length}），为避免性能问题，只处理前 ${MAX_WORDS} 个`);
            }
            
            // 添加到单词本（改进的去重逻辑）
            let addedCount = 0;
            let duplicateCount = 0;
            
            wordsToProcess.forEach(word => {
                if (!word || !word.word) return;
                
                // 使用小写进行去重检查，但保留原始大小写
                const wordLower = String(word.word).toLowerCase();
                const existingWord = vocabulary.find(v => 
                    v.word && 
                    String(v.word).toLowerCase() === wordLower && 
                    v.type === 'word'
                );
                
                if (!existingWord) {
                    vocabulary.push({
                        id: Date.now() + Math.random(),
                        word: word.word,
                        pronunciation: '',
                        romanization: '',
                        translation: '',
                        language: word.language || 'unknown',
                        source: word.source || '阅读提取',
                        addedDate: new Date().toISOString(),
                        type: 'word',
                        parentId: targetFolderId
                    });
                    addedCount++;
                } else {
                    duplicateCount++;
                }
            });
            
            saveVocabulary();
            // 标记目标文件夹为未查看（recent/unviewed）
            const folder = folderStructure.folders.find(f => f.id === targetFolderId);
            if (folder) {
                folder.unviewed = true;
                saveFolderStructure();
            }
            renderFolderSidebar();
            renderVocabulary();
            
            // 显示详细结果
            const resultText = `📥 已将 ${addedCount} 个单词添加到文件夹 "${folderName || '根目录'}"`;
            if (duplicateCount > 0) {
                showNotification(`${resultText}（跳过 ${duplicateCount} 个重复单词）。AI 正在后台补全单词信息...`);
            } else {
                showNotification(`${resultText}。AI 正在后台补全单词信息...`);
            }
            
            // 在后台异步运行 AI 补全（不改变当前视图）
            setTimeout(() => {
                autoCompleteExtractedWords(wordsToProcess);
            }, 500);
            
            // 清除临时数据
            localStorage.removeItem('pendingExtractedWords');
        } catch (e) {
            console.error('处理提取单词失败:', e);
            localStorage.removeItem('pendingExtractedWords');
        }
    }
}
/* ==================== 自动补全提取的单词（修复版） ==================== */
async function autoCompleteExtractedWords(words) {
    showLoadingOverlay('AI正在批量补全单词信息...');
    
    try {
        const settings = loadSettings();
        let successCount = 0;
        
        // 批量处理，添加延迟避免API限流
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const vocabItem = vocabulary.find(v => v.word === word.word);
            
            if (vocabItem && (!vocabItem.romanization || !vocabItem.translation)) {
                updateLoadingText(`正在补全 ${i + 1}/${words.length}: ${word.word}`);
                
                const completed = await completeWordInfo(
                    word.word, 
                    word.language, 
                    settings.apiType || 'deepseek', 
                    settings.apiKey
                );
                
                if (completed && completed.translation) {
                    vocabItem.romanization = completed.romanization || '';
                    vocabItem.pronunciation = completed.pronunciation || '';
                    vocabItem.translation = completed.translation || '';
                    successCount++;
                }
                
                // 延迟500ms避免API限流（DeepSeek免费版限制较严）
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        saveVocabulary();
        renderVocabulary();
        hideLoadingOverlay();
        showNotification(`✅ AI补全完成！成功处理 ${successCount}/${words.length} 个单词`);
        
    } catch (error) {
        hideLoadingOverlay();
        showNotification('❌ AI补全失败：' + error.message);
        console.error('补全错误:', error);
    }
}

/* ==================== 更新统计数据 ==================== */
function updateStats() {
    // 只在 vocabulary.html 中更新统计数据
    const totalWordsEl = document.getElementById('totalWords');
    if (totalWordsEl) {
        totalWordsEl.textContent = vocabulary.length;
        
        // 今日新增
        const today = new Date().toDateString();
        const todayAdded = vocabulary.filter(v => 
            new Date(v.addedDate).toDateString() === today
        ).length;
        const todayAddedEl = document.getElementById('todayAdded');
        if (todayAddedEl) {
            todayAddedEl.textContent = todayAdded;
        }
        
        // 语言种类
        const languages = new Set(vocabulary.map(v => v.language));
        const languageCountEl = document.getElementById('languageCount');
        if (languageCountEl) {
            languageCountEl.textContent = languages.size;
        }
    }
}

/* ==================== 视图切换 ==================== */
function switchView(view) {
    currentView = view;
    
    // 更新按钮状态
    document.getElementById('cardViewBtn').classList.toggle('active', view === 'card');
    document.getElementById('tableViewBtn').classList.toggle('active', view === 'table');
    
    renderVocabulary();
}

/* ==================== 渲染单词本 ==================== */
function renderVocabulary() {
    // 只在 vocabulary.html 中渲染
    const vocabGrid = document.getElementById('vocabGrid');
    if (!vocabGrid) {
        return; // 不在 vocabulary.html 中，直接返回
    }
    
    const filteredVocab = getFilteredVocabulary();
    
    if (filteredVocab.length === 0) {
        const emptyState = document.getElementById('emptyState');
        const vocabTable = document.getElementById('vocabTable');
        const pagination = document.getElementById('pagination');
        
        if (emptyState) emptyState.style.display = 'block';
        if (vocabGrid) vocabGrid.style.display = 'none';
        if (vocabTable) vocabTable.style.display = 'none';
        if (pagination) pagination.style.display = 'none';
        return;
    }
    
    // 分页处理
    const totalPages = Math.ceil(filteredVocab.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedVocab = filteredVocab.slice(startIndex, endIndex);
    
    document.getElementById('emptyState').style.display = 'none';
    
    if (currentView === 'card') {
        renderCardView(paginatedVocab);
    } else {
        renderTableView(paginatedVocab);
    }
    
    // 渲染分页控件
    renderPagination(totalPages, filteredVocab.length);
}

/* ==================== 获取过滤后的单词 ==================== */
function getFilteredVocabulary() {
    // 首先获取当前文件夹下的单词（支持嵌套文件夹显示）
    const folderWords = getCurrentFolderWords();

    return folderWords.filter(item => {
        // 语言过滤
        if (currentFilter !== 'all' && item.language !== currentFilter) {
            return false;
        }

        // 搜索过滤
        if (currentSearchTerm) {
            const searchLower = currentSearchTerm.toLowerCase();
            return item.word.toLowerCase().includes(searchLower) ||
                   (item.translation && item.translation.toLowerCase().includes(searchLower)) ||
                   (item.romanization && item.romanization.toLowerCase().includes(searchLower));
        }

        return true;
    });
}

/* ==================== 卡片视图 ==================== */
function renderCardView(vocabList) {
    const grid = document.getElementById('vocabGrid');
    grid.style.display = 'grid';
    document.getElementById('vocabTable').style.display = 'none';
    
    grid.innerHTML = vocabList.map(item => {
        const langInfo = LANGUAGES[item.language] || { name: '未知', flag: '🌐' };
        return `
        <div class="vocab-card" data-id="${item.id}">
            <input type="checkbox" class="card-checkbox" 
                   ${selectedWords.has(item.id) ? 'checked' : ''}
                   onchange="toggleSelectWord('${item.id}')">
            
            <div class="card-header">
                <div class="word-main">
                    <div class="word-title">${escapeHtml(item.word)}</div>
                    ${item.pronunciation ? `<div class="word-pronunciation">${escapeHtml(item.pronunciation)}</div>` : ''}
                    ${item.romanization ? `<div class="word-romanization">${escapeHtml(item.romanization)}</div>` : ''}
                </div>
                <button class="play-word-btn" data-action="playWord" data-word="${escapeHtml(item.word)}" data-language="${item.language}" title="朗读">
                    🔊
                </button>
            </div>

            <div class="card-content">
                <div class="word-translation">
                    ${item.translation || '暂无释义'}
                </div>
                
                <div class="word-meta">
                    <span class="language-badge">${langInfo.flag} ${langInfo.name}</span>
                    ${item.source ? `<span class="source-badge">${escapeHtml(item.source)}</span>` : ''}
                </div>
            </div>

            <div class="card-actions">
                <button class="card-action-btn" data-action="generateExample" data-id="${item.id}">💬 例句</button>
                <button class="card-action-btn" data-action="showWordGraphModal" data-id="${item.id}">🌐 词谱</button>
                <button class="card-action-btn" data-action="editWord" data-id="${item.id}">✏️ 编辑</button>
                <button class="card-action-btn delete" data-action="deleteWord" data-id="${item.id}">🗑️ 删除</button>
            </div>
        </div>
        `;
    }).join('');
    
    // 使用事件委托绑定点击事件
    grid.querySelectorAll('.card-action-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const action = this.dataset.action;
            const id = this.dataset.id;
            const word = this.dataset.word;
            const language = this.dataset.language;
            console.log('Card button clicked:', action, id, word, language);
            if (action) {
                if (action === 'playWord' && word && language) {
                    window[action](word, language);
                } else if (id) {
                    window[action](id);
                }
            }
        });
    });
    
    // 绑定播放按钮事件
    grid.querySelectorAll('.play-word-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const word = this.dataset.word;
            const language = this.dataset.language;
            console.log('Play button clicked:', word, language);
            if (word && language) {
                playWord(word, language);
            }
        });
    });
}

/* ==================== 分页控件渲染 ==================== */
function renderPagination(totalPages, totalItems) {
    const pagination = document.getElementById('pagination');
    if (!pagination) {
        // 创建分页容器
        const container = document.getElementById('mainContent');
        if (container) {
            const paginationDiv = document.createElement('div');
            paginationDiv.id = 'pagination';
            paginationDiv.className = 'pagination';
            container.appendChild(paginationDiv);
        } else {
            console.warn('分页容器不存在');
            return;
        }
    }
    
    const paginationElement = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationElement.style.display = 'none';
        return;
    }
    
    paginationElement.style.display = 'flex';
    paginationElement.style.justifyContent = 'center';
    paginationElement.style.alignItems = 'center';
    paginationElement.style.gap = '8px';
    paginationElement.style.marginTop = '20px';
    paginationElement.style.padding = '10px';
    paginationElement.style.borderTop = '1px solid #e5e7eb';
    
    let paginationHTML = `
        <span style="font-size: 14px; color: #6b7280;">共 ${totalItems} 个单词</span>
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(1)" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; color: ${currentPage === 1 ? '#9ca3af' : '#374151'};">首页</button>
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; color: ${currentPage === 1 ? '#9ca3af' : '#374151'};">上一页</button>
    `;
    
    // 页码显示逻辑
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" style="padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; background: ${i === currentPage ? '#8B6F47' : 'white'}; color: ${i === currentPage ? 'white' : '#374151'}; cursor: pointer;">${i}</button>
        `;
    }
    
    paginationHTML += `
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; color: ${currentPage === totalPages ? '#9ca3af' : '#374151'};">下一页</button>
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${totalPages})" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; color: ${currentPage === totalPages ? '#9ca3af' : '#374151'};">末页</button>
        <select onchange="changeItemsPerPage(this.value)" style="padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; margin-left: 10px;">
            <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10条/页</option>
            <option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20条/页</option>
            <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50条/页</option>
            <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100条/页</option>
        </select>
    `;
    
    paginationElement.innerHTML = paginationHTML;
}

/* ==================== 页码改变 ==================== */
function changePage(page) {
    currentPage = page;
    renderVocabulary();
}

/* ==================== 每页显示数量改变 ==================== */
function changeItemsPerPage(value) {
    itemsPerPage = parseInt(value);
    currentPage = 1; // 重置到第一页
    renderVocabulary();
}

/* ==================== 表格视图 ==================== */
function renderTableView(vocabList) {
    const table = document.getElementById('vocabTable');
    const tbody = document.getElementById('vocabTableBody');
    
    document.getElementById('vocabGrid').style.display = 'none';
    table.style.display = 'block';
    
    tbody.innerHTML = vocabList.map(item => {
        const langInfo = LANGUAGES[item.language] || { name: '未知', flag: '🌐' };
        return `
        <tr data-id="${item.id}">
            <td>
                <input type="checkbox" 
                       ${selectedWords.has(item.id) ? 'checked' : ''}
                       onchange="toggleSelectWord('${item.id}')">
            </td>
            <td>
                <div class="table-word">${escapeHtml(item.word)}</div>
                ${item.pronunciation ? `<div class="word-pronunciation">${escapeHtml(item.pronunciation)}</div>` : ''}
            </td>
            <td>
                <div class="table-romanization">${item.romanization || '-'}</div>
            </td>
            <td>
                <div class="table-translation">${item.translation || '暂无释义'}</div>
            </td>
            <td>${langInfo.flag} ${langInfo.name}</td>
            <td>${item.source || '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn" data-action="generateExample" data-id="${item.id}" title="生成例句">💬</button>
                    <button class="table-action-btn" data-action="showWordGraphModal" data-id="${item.id}" title="词汇图谱">🌐</button>
                    <button class="table-action-btn" data-action="playWord" data-word="${escapeHtml(item.word)}" data-language="${item.language}" title="朗读">🔊</button>
                    <button class="table-action-btn" data-action="editWord" data-id="${item.id}" title="编辑">✏️</button>
                    <button class="table-action-btn" data-action="deleteWord" data-id="${item.id}" title="删除">🗑️</button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
    
    // 使用事件委托绑定点击事件
    tbody.querySelectorAll('.table-action-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const action = this.dataset.action;
            const id = this.dataset.id;
            const word = this.dataset.word;
            const language = this.dataset.language;
            console.log('Table button clicked:', action, id, word, language);
            if (action) {
                if (action === 'playWord' && word && language) {
                    window[action](word, language);
                } else if (id) {
                    window[action](id);
                }
            }
        });
    });
}

/* ==================== 搜索功能 ==================== */
function searchVocabulary() {
    currentSearchTerm = document.getElementById('vocabSearch').value;
    currentPage = 1; // 重置页码
    renderVocabulary();
}

/* ==================== 语言过滤 ==================== */
function filterByLanguage(lang) {
    currentFilter = lang;
    currentPage = 1; // 重置页码
    // 如果存在筛选按钮，移除其 active（兼容不同 UI）
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));

    renderVocabulary();
}

// 创建一个新的顶层单词本（作为 root 的子文件夹）
function createTopLevelVocabulary() {
    const name = prompt('请输入单词本名称（将作为顶层文件夹）：');
    if (!name || !name.trim()) return;

    const newFolder = {
        id: 'vocab-' + Date.now(),
        name: name.trim(),
        type: 'folder',
        parentId: 'root',
        expanded: true
    };

    folderStructure.folders.push(newFolder);
    saveFolderStructure();
    renderFolderSidebar();

    showNotification(`✅ 单词本 "${name}" 创建成功`);
}

/* ==================== 选择单词 ==================== */
function toggleSelectWord(id) {
    if (selectedWords.has(id)) {
        selectedWords.delete(id);
    } else {
        selectedWords.add(id);
    }
}

function toggleSelectAll() {
    const checked = document.getElementById('selectAllTable').checked;
    const filteredVocab = getFilteredVocabulary();
    
    if (checked) {
        filteredVocab.forEach(item => selectedWords.add(item.id));
    } else {
        selectedWords.clear();
    }
    
    renderVocabulary();
}

/* ==================== 删除功能 ==================== */
function deleteWord(id) {
    if (confirm('确定要删除这个单词吗？')) {
        vocabulary = vocabulary.filter(v => v.id !== id);
        selectedWords.delete(id);
        saveVocabulary();
        renderVocabulary();
        showNotification('✅ 单词已删除');
    }
}

function deleteSelected() {
    if (selectedWords.size === 0) {
        showNotification('⚠️ 请先选择要删除的单词');
        return;
    }
    
    if (confirm(`确定要删除选中的 ${selectedWords.size} 个单词吗？`)) {
        vocabulary = vocabulary.filter(v => !selectedWords.has(v.id));
        selectedWords.clear();
        saveVocabulary();
        renderVocabulary();
        showNotification('✅ 已删除选中的单词');
    }
}

/* ==================== 朗读功能 ==================== */
function playWord(word, language) {
    const langInfo = LANGUAGES[language];
    if (!langInfo) {
        showNotification('❌ 不支持该语言的朗读');
        return;
    }
    
    // 使用 Web Speech API
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = langInfo.voice;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    // 使用保存的语音偏好（关键修复：应用用户选择的口音）
    if (typeof getVoiceForLanguage === 'function') {
        const voice = getVoiceForLanguage(langInfo.voice);
        if (voice) {
            utterance.voice = voice;
            console.log('使用语音:', voice.name);
        }
    }
    
    speechSynthesis.speak(utterance);
}

// 朗读文本（用于朗读例句）
function speakText(text, language = 'en') {
    // 将语言代码转换为voice代码
    const langInfo = LANGUAGES[language];
    const voiceCode = langInfo ? langInfo.voice : 'en-US';
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceCode;
    utterance.rate = 0.85;
    utterance.pitch = 1;
    
    // 使用保存的语音偏好
    if (typeof getVoiceForLanguage === 'function') {
        const voice = getVoiceForLanguage(voiceCode);
        if (voice) {
            utterance.voice = voice;
        }
    }
    
    speechSynthesis.speak(utterance);
}

/* ==================== AI 生成单词本 ==================== */
function showAIGenerateModal() {
    populateTargetFolderOptions(); // 兼容旧名：此函数现在渲染树形选择器
    document.getElementById('aiGenerateModal').classList.add('show');
}

function closeAIGenerateModal() {
    document.getElementById('aiGenerateModal').classList.remove('show');
}

function selectLanguage(lang) {
    selectedLanguage = lang;
    
    // 更新选中状态
    document.querySelectorAll('.language-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelector(`[data-lang="${lang}"]`).classList.add('selected');
}

async function generateVocabulary() {
    if (!selectedLanguage) {
        showNotification('⚠️ 请选择语言');
        return;
    }
    
    const topic = document.getElementById('aiTopic').value.trim();
    const count = parseInt(document.getElementById('aiCount').value);
    const level = document.getElementById('aiLevel').value;
    const apiType = document.getElementById('aiAPI').value;
    
    if (!topic) {
        showNotification('⚠️ 请输入主题');
        return;
    }
    
    if (count < 5 || count > 200) {
        showNotification('⚠️ 生成数量需在 5-200 之间');
        return;
    }
    
    const settings = loadSettings();
    if (!settings.apiKey) {
        showNotification('⚠️ 请先在设置页面配置 API Key');
        return;
    }
    
    closeAIGenerateModal();
    showLoadingOverlay(`AI正在生成 ${count} 个${LANGUAGES[selectedLanguage].name}单词...`);
    
    try {
        const generatedWords = await callAIGenerate(selectedLanguage, topic, count, level, apiType, settings.apiKey);
    // 获取目标文件夹（树形选择器的选中项）
    const targetFolderId = aiSelectedTargetFolderId || 'root';

        // 添加到单词本（并设置 parentId 和 type）
        generatedWords.forEach(word => {
            if (!vocabulary.find(v => v.word === word.word)) {
                vocabulary.push({
                    id: Date.now() + Math.random(),
                    word: word.word,
                    pronunciation: word.pronunciation || '',
                    romanization: word.romanization || '',
                    translation: word.translation || '',
                    language: selectedLanguage,
                    source: `AI生成-${topic}`,
                    addedDate: new Date().toISOString(),
                    parentId: targetFolderId,
                    type: 'word'
                });
            }
        });
        
        saveVocabulary();
        renderVocabulary();
        hideLoadingOverlay();
        showNotification(`✅ 成功生成 ${generatedWords.length} 个单词！`);
        
    } catch (error) {
        hideLoadingOverlay();
        showNotification('❌ 生成失败：' + error.message);
    }
}

// 填充 AI 生成模态框的目标文件夹下拉
function populateTargetFolderOptions() {
    // 渲染为树形选择器（完整层级，支持展开/收起）
    const container = document.getElementById('aiTargetFolderTree');
    if (!container) return;

    // 清空并构建树
    container.innerHTML = '';

    function createNode(folder) {
        const node = document.createElement('div');
        node.className = 'tree-node';
        node.dataset.folderId = folder.id;

        // toggle 图标（有子节点时可展开）
        const hasChildren = folderStructure.folders.some(f => f.parentId === folder.id);
        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        toggle.innerHTML = hasChildren ? (folder.expanded ? '▾' : '▸') : '';
        node.appendChild(toggle);

        const label = document.createElement('span');
        label.textContent = folder.name;
        label.title = folder.name;
        label.style.flex = '1';
        node.appendChild(label);

        const count = document.createElement('span');
        count.className = 'folder-count';
        count.textContent = `(${getWordCountInFolder(folder.id)})`;
        node.appendChild(count);

        // 选择逻辑
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            // 取消之前选中
            container.querySelectorAll('.tree-node.selected').forEach(n => n.classList.remove('selected'));
            node.classList.add('selected');
            aiSelectedTargetFolderId = folder.id;
        });

        // toggle 点击切换展开
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            folder.expanded = !folder.expanded;
            saveFolderStructure();
            populateTargetFolderOptions();
        });

        return node;
    }

    function renderChildren(parentId, parentElem) {
        const children = folderStructure.folders.filter(f => f.parentId === parentId);
        if (!children || children.length === 0) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'tree-children';
        if (!folderStructure.folders.find(f => f.id === parentId)?.expanded) {
            wrapper.classList.add('collapsed');
        }

        children.forEach(child => {
            const node = createNode(child);
            wrapper.appendChild(node);
            renderChildren(child.id, wrapper);
        });

        parentElem.appendChild(wrapper);
    }

    // 找到根节点并渲染其子树（包含 root 本身）
    const root = folderStructure.folders.find(f => f.id === 'root');
    if (!root) return;

    const rootNode = createNode(root);
    // 如果之前选择的是 root，则高亮
    if (aiSelectedTargetFolderId === 'root') rootNode.classList.add('selected');
    container.appendChild(rootNode);
    renderChildren('root', container);

    // 如果之前有选中某个非 root 的 folder，尝试高亮它
    if (aiSelectedTargetFolderId && aiSelectedTargetFolderId !== 'root') {
        const prev = container.querySelector(`[data-folder-id="${aiSelectedTargetFolderId}"]`);
        if (prev) prev.classList.add('selected');
    }
}

// 在模态框中创建新文件夹并选中
function createFolderFromModal() {
    const name = prompt('请输入新单词本名称：');
    if (!name || !name.trim()) return;

    const newFolder = {
        id: 'folder-' + Date.now(),
        name: name.trim(),
        type: 'folder',
        parentId: 'root',
        expanded: true
    };

    folderStructure.folders.push(newFolder);
    saveFolderStructure();
    renderFolderSidebar();
    populateTargetFolderOptions();

    // 选中新创建的（树形选择器）
    aiSelectedTargetFolderId = newFolder.id;
    const container = document.getElementById('aiTargetFolderTree');
    if (container) {
        container.querySelectorAll('.tree-node.selected').forEach(n => n.classList.remove('selected'));
        const newNode = container.querySelector(`[data-folder-id="${newFolder.id}"]`);
        if (newNode) newNode.classList.add('selected');
    }

    showNotification(`✅ 单词本 "${name}" 已创建并选中`);
}

/* ==================== AI API 调用 ==================== */
async function callAIGenerate(language, topic, count, level, apiType, apiKey) {
    const langInfo = LANGUAGES[language];
    const romanType = langInfo.romanType === 'ipa' ? '国际音标(IPA)' : 
                     langInfo.romanType === 'romaji' ? '罗马音(Romaji)' :
                     langInfo.romanType === 'pinyin' ? '拼音' : '罗马化拼写';
    
    const prompt = `请生成 ${count} 个${langInfo.name}单词，主题是"${topic}"，难度级别是${level}。

要求：
1. 每个单词必须包含：单词本身、${romanType}、中文释义
2. 单词要与主题高度相关
3. 难度符合 ${level} 级别
4. 返回 JSON 格式数组，格式如下：
[
  {
    "word": "单词",
    "romanization": "${romanType}",
    "pronunciation": "发音标注",
    "translation": "中文释义"
  }
]

请直接返回 JSON 数组，不要其他说明文字。`;

    const apiEndpoints = {
        'deepseek': 'https://api.deepseek.com/v1/chat/completions',
        'openai': 'https://api.openai.com/v1/chat/completions',
        'claude': 'https://api.anthropic.com/v1/messages',
        'gemini': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    };

    const endpoint = apiEndpoints[apiType];
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: apiType === 'deepseek' ? 'deepseek-chat' : 
                       apiType === 'openai' ? 'gpt-4' : 
                       apiType === 'claude' ? 'claude-3-opus-20240229' : 'gemini-pro',
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        let content = '';
        
        if (apiType === 'claude') {
            content = data.content[0].text;
        } else if (apiType === 'gemini') {
            content = data.candidates[0].content.parts[0].text;
        } else {
            content = data.choices[0].message.content;
        }
        
        // 提取 JSON
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('AI 返回格式错误');
        }
        
        const words = JSON.parse(jsonMatch[0]);
        return words;
        
    } catch (error) {
        console.error('AI 生成失败:', error);
        throw error;
    }
}

/* ==================== AI 一键补全 ==================== */
function showAICompleteModal() {
    if (vocabulary.length === 0) {
        showNotification('⚠️ 单词本为空');
        return;
    }
    
    const incompleteCount = vocabulary.filter(v => !v.romanization || !v.translation).length;
    if (incompleteCount === 0) {
        showNotification('✅ 所有单词已完整！');
        return;
    }
    
    document.getElementById('estimatedTime').textContent = Math.ceil(incompleteCount * 0.5) + '-' + Math.ceil(incompleteCount);
    document.getElementById('aiCompleteModal').classList.add('show');
}

function closeAICompleteModal() {
    document.getElementById('aiCompleteModal').classList.remove('show');
}

async function completeAllVocabulary() {
    const incompleteWords = vocabulary.filter(v => !v.romanization || !v.translation);
    
    if (incompleteWords.length === 0) {
        showNotification('✅ 所有单词已完整！');
        return;
    }
    
    const settings = loadSettings();
    const apiType = document.getElementById('completeAPI').value;
    
    if (!settings.apiKey) {
        showNotification('⚠️ 请先在设置页面配置 API Key');
        return;
    }
    
    closeAICompleteModal();
    showLoadingOverlay(`AI正在补全 ${incompleteWords.length} 个单词...`);
    
    try {
        for (let i = 0; i < incompleteWords.length; i++) {
            const item = incompleteWords[i];
            updateLoadingText(`正在补全 ${i + 1}/${incompleteWords.length}: ${item.word}`);
            
            const completed = await completeWordInfo(item.word, item.language, apiType, settings.apiKey);
            if (completed) {
                item.romanization = completed.romanization;
                item.pronunciation = completed.pronunciation;
                item.translation = completed.translation;
            }
            
            // 延迟避免API限流
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        saveVocabulary();
        renderVocabulary();
        hideLoadingOverlay();
        showNotification('✅ AI补全完成！');
        
    } catch (error) {
        hideLoadingOverlay();
        showNotification('❌ 补全失败：' + error.message);
    }
}

async function completeWordInfo(word, language, apiType, apiKey) {
    const langInfo = LANGUAGES[language] || { name: '未知', romanType: 'romanization' };
    const romanType = langInfo.romanType === 'ipa' ? '国际音标(IPA)' : 
                     langInfo.romanType === 'romaji' ? '罗马音(Romaji)' :
                     langInfo.romanType === 'pinyin' ? '拼音' : '罗马化拼写';
    
    const prompt = `请为以下${langInfo.name}单词提供信息：

单词：${word}

请返回 JSON 格式：
{
  "romanization": "${romanType}",
  "pronunciation": "发音标注",
  "translation": "中文释义"
}

只返回 JSON，不要其他文字。`;

    const apiEndpoints = {
        'deepseek': 'https://api.deepseek.com/v1/chat/completions',
        'openai': 'https://api.openai.com/v1/chat/completions',
        'claude': 'https://api.anthropic.com/v1/messages',
        'gemini': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    };

    try {
        const response = await fetch(apiEndpoints[apiType], {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: apiType === 'deepseek' ? 'deepseek-chat' : 
                       apiType === 'openai' ? 'gpt-4' : 
                       apiType === 'claude' ? 'claude-3-opus-20240229' : 'gemini-pro',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`API 请求失败`);
        }

        const data = await response.json();
        let content = '';
        
        if (apiType === 'claude') {
            content = data.content[0].text;
        } else if (apiType === 'gemini') {
            content = data.candidates[0].content.parts[0].text;
        } else {
            content = data.choices[0].message.content;
        }
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return null;
        }
        
        return JSON.parse(jsonMatch[0]);
        
    } catch (error) {
        console.error('补全失败:', error);
        return null;
    }
}

/* ==================== 导入导出功能 ==================== */
function showExportModal() {
    if (vocabulary.length === 0) {
        showNotification('⚠️ 单词本为空，无法导出');
        return;
    }
    document.getElementById('exportModal').classList.add('show');
}

function closeExportModal() {
    document.getElementById('exportModal').classList.remove('show');
}

function exportToFormat(format) {
    closeExportModal();
    
    switch(format) {
        case 'excel':
            exportToExcel();
            break;
        case 'txt':
            exportToText();
            break;
        case 'csv':
            exportToCSV();
            break;
        case 'json':
            exportToJSON();
            break;
        case 'anki':
            exportToAnki();
            break;
    }
}

function exportToExcel() {
    const data = vocabulary.map(v => ({
        '单词': v.word,
        '罗马发音/音标': v.romanization || v.pronunciation || '',
        '中文释义': v.translation || '',
        '语言': LANGUAGES[v.language]?.name || v.language,
        '来源': v.source || '',
        '添加日期': new Date(v.addedDate).toLocaleDateString('zh-CN')
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "单词本");
    
    XLSX.writeFile(wb, `单词本_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('✅ Excel 导出成功！');
}

function exportToText() {
    let text = '# 我的单词本\n\n';
    text += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
    text += `总单词数：${vocabulary.length}\n\n`;
    text += '---\n\n';
    
    vocabulary.forEach((v, index) => {
        text += `${index + 1}. ${v.word}\n`;
        if (v.romanization) text += `   发音：${v.romanization}\n`;
        if (v.translation) text += `   释义：${v.translation}\n`;
        text += `   语言：${LANGUAGES[v.language]?.name || v.language}\n`;
        text += '\n';
    });
    
    downloadFile(text, `单词本_${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
    showNotification('✅ 文本导出成功！');
}

function exportToCSV() {
    let csv = '\ufeff'; // BOM for Excel
    csv += '单词,罗马发音/音标,中文释义,语言,来源,添加日期\n';
    
    vocabulary.forEach(v => {
        csv += `"${v.word}","${v.romanization || v.pronunciation || ''}","${v.translation || ''}","${LANGUAGES[v.language]?.name || v.language}","${v.source || ''}","${new Date(v.addedDate).toLocaleDateString('zh-CN')}"\n`;
    });
    
    downloadFile(csv, `单词本_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showNotification('✅ CSV 导出成功！');
}

function exportToJSON() {
    const json = JSON.stringify(vocabulary, null, 2);
    downloadFile(json, `单词本_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    showNotification('✅ JSON 导出成功！');
}

function exportToAnki() {
    let anki = '';
    vocabulary.forEach(v => {
        anki += `${v.word}\t${v.romanization || ''}\t${v.translation || ''}\n`;
    });
    
    downloadFile(anki, `单词本_Anki_${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
    showNotification('✅ Anki 格式导出成功！');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ==================== 导入功能 ==================== */
function importVocabulary() {
    document.getElementById('importFile').click();
}

async function handleImport() {
    const file = document.getElementById('importFile').files[0];
    if (!file) return;
    
    const fileType = file.name.split('.').pop().toLowerCase();
    
    showLoadingOverlay('正在导入...');
    
    try {
        if (fileType === 'xlsx' || fileType === 'xls') {
            await importFromExcel(file);
        } else if (fileType === 'json') {
            await importFromJSON(file);
        } else if (fileType === 'csv') {
            await importFromCSV(file);
        } else {
            throw new Error('不支持的文件格式');
        }
        
        hideLoadingOverlay();
        showNotification('✅ 导入成功！');
        
    } catch (error) {
        hideLoadingOverlay();
        showNotification('❌ 导入失败：' + error.message);
    }
    
    // 清空文件输入
    document.getElementById('importFile').value = '';
    // 重置导入目标
    importTargetFolderId = null;
}

async function importFromExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                
                // 智能识别列名
                const columnMappings = [
                    { word: ['单词', 'word', 'Word', '词'], 
                      roman: ['罗马发音', '音标', '发音', 'romanization', 'pronunciation', 'ipa', 'IPA', 'pinyin', '拼音'],
                      translation: ['中文', '释义', '翻译', 'translation', 'meaning', '中文释义'],
                      language: ['语言', 'language', 'lang']
                    }
                ];
                
                jsonData.forEach(row => {
                    const keys = Object.keys(row);
                    
                    // 智能匹配列
                    const wordKey = keys.find(k => columnMappings[0].word.some(m => k.includes(m))) || keys[0];
                    const romanKey = keys.find(k => columnMappings[0].roman.some(m => k.includes(m))) || keys[1];
                    const translationKey = keys.find(k => columnMappings[0].translation.some(m => k.includes(m))) || keys[2];
                    const languageKey = keys.find(k => columnMappings[0].language.some(m => k.includes(m)));
                    
                    const word = row[wordKey];
                    if (!word) return;
                    
                    // 检查是否已存在
                    if (!vocabulary.find(v => v.word === word)) {
                        vocabulary.push({
                            id: Date.now() + Math.random(),
                            word: word,
                            pronunciation: '',
                            romanization: row[romanKey] || '',
                            translation: row[translationKey] || '',
                            language: detectLanguage(word, row[languageKey]),
                            source: '导入',
                            addedDate: new Date().toISOString(),
                            parentId: importTargetFolderId || 'root',
                            type: 'word'
                        });
                    }
                });
                
                saveVocabulary();
                renderVocabulary();
                resolve();
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsArrayBuffer(file);
    });
}

async function importFromJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!Array.isArray(data)) {
                    throw new Error('JSON 格式错误');
                }
                
                data.forEach(item => {
                    if (item.word && !vocabulary.find(v => v.word === item.word)) {
                        vocabulary.push({
                            id: Date.now() + Math.random(),
                            word: item.word,
                            pronunciation: item.pronunciation || '',
                            romanization: item.romanization || '',
                            translation: item.translation || '',
                            language: item.language || detectLanguage(item.word),
                            source: item.source || '导入',
                            addedDate: item.addedDate || new Date().toISOString(),
                            parentId: importTargetFolderId || 'root',
                            type: 'word'
                        });
                    }
                });
                
                saveVocabulary();
                renderVocabulary();
                resolve();
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
    });
}

async function importFromCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n');
                
                // 跳过标题行
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
                    
                    if (parts[0] && !vocabulary.find(v => v.word === parts[0])) {
                        vocabulary.push({
                            id: Date.now() + Math.random(),
                            word: parts[0],
                            pronunciation: '',
                            romanization: parts[1] || '',
                            translation: parts[2] || '',
                            language: detectLanguage(parts[0], parts[3]),
                            source: '导入',
                            addedDate: new Date().toISOString(),
                            parentId: importTargetFolderId || 'root',
                            type: 'word'
                        });
                    }
                }
                
                saveVocabulary();
                renderVocabulary();
                resolve();
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
    });
}

/* ==================== 语言检测 ==================== */
function detectLanguage(text, hint) {
    if (hint) {
        // 如果有提示，尝试匹配
        for (let [code, info] of Object.entries(LANGUAGES)) {
            if (info.name === hint || code === hint) {
                return code;
            }
        }
    }
    
    // 简单的语言检测
    if (/^[a-zA-Z\s]+$/.test(text)) return 'en';
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
    
    return 'unknown';
}

/* ==================== AI 小助手 ==================== */
let chatMessages = [];

function toggleAIChat() {
    const panel = document.getElementById('aiChatPanel');
    panel.classList.toggle('show');
}

async function sendAIMessage() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // 添加用户消息
    addChatMessage('user', message);
    input.value = '';
    
    // 显示加载中
    const loadingId = addChatMessage('assistant', '思考中...');
    
    try {
        const settings = loadSettings();
        // 检查是否配置 API Key
        if (!settings.apiKey) {
            if (confirm('未检测到已配置的 API Key，是否现在前往设置页面进行配置？')) {
                openSettings();
            }
            removeChatMessage(loadingId);
            return;
        }

        const response = await callAIChat(message, settings.apiType || 'deepseek', settings.apiKey);
        
        // 移除加载消息
        removeChatMessage(loadingId);
        
        // 添加 AI 回复（包含可点击的单词）
        addChatMessage('assistant', processMessageWords(response));
        
    } catch (error) {
        removeChatMessage(loadingId);
        addChatMessage('assistant', '抱歉，出现错误：' + error.message);
    }
}

// 打开设置页面（新窗口）
function openSettings() {
    // 尝试打开本地设置页面
    try {
        window.open('setting.html', '_blank');
    } catch (e) {
        // 退回到当前页跳转
        window.location.href = 'setting.html';
    }
}

function addChatMessage(role, content) {
    const container = document.getElementById('aiChatMessages');
    const id = 'msg-' + Date.now();
    
    const div = document.createElement('div');
    div.id = id;
    div.className = `ai-message ${role}`;
    div.innerHTML = content;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    
    chatMessages.push({ role, content });
    
    return id;
}

function removeChatMessage(id) {
    const elem = document.getElementById(id);
    if (elem) elem.remove();
}

function processMessageWords(text) {
    // 检测并标记单词（简单实现，可以扩展）
    return text.replace(/\b([a-zA-Z]{3,})\b/g, (match) => {
        return `<span class="message-word" onclick="addWordFromChat('${match}')">${match}</span>`;
    });
}

function addWordFromChat(word) {
    if (vocabulary.find(v => v.word === word)) {
        showNotification('⚠️ 单词已存在');
        return;
    }
    
    vocabulary.push({
        id: Date.now() + Math.random(),
        word: word,
        pronunciation: '',
        romanization: '',
        translation: '',
        language: detectLanguage(word),
        source: 'AI对话',
        addedDate: new Date().toISOString()
    });
    
    saveVocabulary();
    renderVocabulary();
    showNotification(`✅ 已添加 "${word}" 到单词本`);
}

async function callAIChat(message, apiType, apiKey) {
    const apiEndpoints = {
        'deepseek': 'https://api.deepseek.com/v1/chat/completions',
        'openai': 'https://api.openai.com/v1/chat/completions',
        'claude': 'https://api.anthropic.com/v1/messages',
        'gemini': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    };
    
    const messages = [
        { role: 'system', content: '你是一个专业的语言学习助手，擅长解释单词、语法和翻译。回答要简洁、准确、友好。' },
        ...chatMessages.slice(-5), // 保留最近5条对话
        { role: 'user', content: message }
    ];
    
    try {
        const response = await fetch(apiEndpoints[apiType], {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: apiType === 'deepseek' ? 'deepseek-chat' : 
                       apiType === 'openai' ? 'gpt-4' : 
                       apiType === 'claude' ? 'claude-3-opus-20240229' : 'gemini-pro',
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error('API 请求失败');
        }

        const data = await response.json();
        
        if (apiType === 'claude') {
            return data.content[0].text;
        } else if (apiType === 'gemini') {
            return data.candidates[0].content.parts[0].text;
        } else {
            return data.choices[0].message.content;
        }
        
    } catch (error) {
        throw error;
    }
}

/* ==================== 编辑单词（预留功能） ==================== */
function editWord(id) {
    const word = vocabulary.find(v => v.id === id);
    if (!word) return;
    
    const newTranslation = prompt('修改中文释义:', word.translation);
    if (newTranslation !== null) {
        word.translation = newTranslation;
        saveVocabulary();
        renderVocabulary();
        showNotification('✅ 修改成功');
    }
}

// 生成例句
async function generateExample(id) {
    const word = vocabulary.find(v => v.id === id);
    if (!word) return;
    
    const settings = loadSettings();
    if (!settings.apiKey) {
        showNotification('⚠️ 请先在设置中配置API密钥');
        return;
    }
    
    showLoadingOverlay('正在生成例句...');
    
    try {
        const prompt = `请为单词"${word.word}"生成3个实用的英文例句，每个例句带中文翻译。格式如下：
1. 英文例句 - 中文翻译
2. 英文例句 - 中文翻译
3. 英文例句 - 中文翻译`;
        
        const examples = await callAI(settings.apiType, settings.apiKey, prompt);
        
        // 保存例句到单词对象
        word.examples = examples;
        saveVocabulary();
        
        // 显示例句模态框
        showExamplesModal(word, examples);
        
    } catch (error) {
        console.error('生成例句失败:', error);
        showNotification('❌ 生成例句失败: ' + error.message);
    } finally {
        hideLoadingOverlay();
    }
}

// 显示例句模态框
function showExamplesModal(word, examples) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    
    // 创建模态框内容
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.maxWidth = '700px';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>💬 ${word.word} 的例句</h2>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div style="padding: 20px; max-height: 500px; overflow-y: auto;">
            <div style="white-space: pre-wrap; line-height: 1.8; font-size: 15px;">${escapeHtml(examples)}</div>
        </div>
        <div class="modal-actions">
            <button class="modal-btn primary" id="speakExampleBtn">
                🔊 朗读例句
            </button>
            <button class="modal-btn secondary" onclick="this.closest('.modal-overlay').remove()">
                关闭
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // 添加朗读按钮事件监听器
    document.getElementById('speakExampleBtn').addEventListener('click', () => {
        speakText(examples, word.language || 'en');
    });
}

// 显示词汇图谱模态框（引用word-learning.js的功能）
function showWordGraphModal(id) {
    const word = vocabulary.find(v => v.id === id);
    if (!word) return;
    
    // 创建词汇图谱模态框
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 90vh;">
            <div class="modal-header">
                <h2>🌐 ${word.word} 的词汇图谱</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div style="padding: 20px;">
                <div id="vocabWordGraph" style="position: relative; width: 100%; height: 600px; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
                    <!-- SVG容器会动态插入 -->
                    <div id="vocabGraphCenter" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 30px; border-radius: 50%; font-size: 24px; font-weight: bold; box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4); z-index: 100; cursor: move;">
                        ${word.word}
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn primary" onclick="regenerateGraph('${id}')">
                    🔄 AI重新生成关联
                </button>
                <button class="modal-btn secondary" onclick="this.closest('.modal-overlay').remove()">
                    关闭
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 渲染词汇图谱
    setTimeout(() => renderWordGraph(word), 100);
}

// 渲染词汇图谱（简化版的word-learning.js逻辑）
function renderWordGraph(word) {
    const graph = document.getElementById('vocabWordGraph');
    const center = document.getElementById('vocabGraphCenter');
    
    if (!graph || !center) return;
    
    // 清空旧节点
    graph.querySelectorAll('.graph-node').forEach(node => node.remove());
    const oldSvg = graph.querySelector('.graph-svg');
    if (oldSvg) oldSvg.remove();
    
    // 创建SVG容器
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;';
    svg.classList.add('graph-svg');
    graph.insertBefore(svg, graph.firstChild);
    
    // 创建关联节点
    const nodes = [
        { title: '📝 释义', content: word.translation || '暂无释义', position: { top: '10%', left: '50%' }, color: '#666' },
        { title: '🔤 发音', content: word.pronunciation || '暂无音标', position: { top: '30%', left: '15%' }, color: '#888' },
        { title: '📚 词性', content: word.partOfSpeech || '暂无', position: { top: '30%', left: '85%' }, color: '#999' },
        { title: '💡 例句', content: word.examples ? word.examples.split('\n')[0] : '点击生成例句', position: { top: '70%', left: '15%' }, color: '#777' },
        { title: '🌍 语言', content: word.language || 'en', position: { top: '70%', left: '85%' }, color: '#555' },
        { title: '📖 来源', content: word.source || '用户添加', position: { top: '90%', left: '50%' }, color: '#aaa' }
    ];
    
    nodes.forEach(nodeData => {
        const node = document.createElement('div');
        node.className = 'graph-node';
        node.style.cssText = `
            position: absolute;
            ${nodeData.position.top ? 'top: ' + nodeData.position.top : ''};
            ${nodeData.position.left ? 'left: ' + nodeData.position.left : ''};
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid ${nodeData.color};
            border-radius: 12px;
            padding: 12px 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            cursor: move;
            z-index: 10;
            max-width: 200px;
            word-wrap: break-word;
        `;
        node.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px; color: ${nodeData.color};">${nodeData.title}</div>
            <div style="font-size: 13px; color: #333;">${nodeData.content}</div>
        `;
        graph.appendChild(node);
        
        // 绘制连接线
        drawLine(svg, center, node);
        
        // 使节点可拖拽
        makeNodeDraggable(node, graph, svg, center);
    });
}

// 绘制连接线
function drawLine(svg, from, to) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    
    line.setAttribute('x1', fromRect.left + fromRect.width/2 - svgRect.left);
    line.setAttribute('y1', fromRect.top + fromRect.height/2 - svgRect.top);
    line.setAttribute('x2', toRect.left + toRect.width/2 - svgRect.left);
    line.setAttribute('y2', toRect.top + toRect.height/2 - svgRect.top);
    line.setAttribute('stroke', '#ddd');
    line.setAttribute('stroke-width', '2');
    line.classList.add('graph-line');
    
    svg.appendChild(line);
}

// 使节点可拖拽
function makeNodeDraggable(node, container, svg, center) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    node.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = node.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        startLeft = rect.left - containerRect.left + rect.width/2;
        startTop = rect.top - containerRect.top + rect.height/2;
        node.style.zIndex = '1000';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        node.style.left = startLeft + dx + 'px';
        node.style.top = startTop + dy + 'px';
        
        // 更新连接线
        const lines = svg.querySelectorAll('.graph-line');
        const nodeIndex = Array.from(container.querySelectorAll('.graph-node')).indexOf(node);
        if (lines[nodeIndex]) {
            const line = lines[nodeIndex];
            const fromRect = center.getBoundingClientRect();
            const toRect = node.getBoundingClientRect();
            const svgRect = svg.getBoundingClientRect();
            line.setAttribute('x2', toRect.left + toRect.width/2 - svgRect.left);
            line.setAttribute('y2', toRect.top + toRect.height/2 - svgRect.top);
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            node.style.zIndex = '10';
        }
    });
}

// AI重新生成关联信息
async function regenerateGraph(id) {
    const word = vocabulary.find(v => v.id === id);
    if (!word) return;
    
    const settings = loadSettings();
    if (!settings.apiKey) {
        showNotification('⚠️ 请先在设置中配置API密钥');
        return;
    }
    
    showLoadingOverlay('AI正在分析词汇关联...');
    
    try {
        const prompt = `请分析单词"${word.word}"，提供以下信息（简洁格式）：
1. 词根词缀分析
2. 3个相似词
3. 1个反义词
4. 1个例句（英文+中文）
5. 词性`;
        
        const analysis = await callAI(settings.apiType, settings.apiKey, prompt);
        
        // 解析AI返回的信息（简单版本）
        word.aiAnalysis = analysis;
        saveVocabulary();
        
        showNotification('✅ AI分析完成');
        
        // 关闭并重新打开模态框以刷新
        document.querySelector('.modal-overlay').remove();
        setTimeout(() => showWordGraphModal(id), 300);
        
    } catch (error) {
        console.error('AI分析失败:', error);
        showNotification('❌ AI分析失败: ' + error.message);
    } finally {
        hideLoadingOverlay();
    }
}

/* ==================== 工具函数 ==================== */
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('languageHubSettings') || '{}');
    return {
    apiKey: settings.api?.key || '',
    apiType: settings.api?.provider || 'deepseek'
    };
}

function showLoadingOverlay(text) {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function updateLoadingText(text) {
    document.getElementById('loadingText').textContent = text;
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    document.getElementById('notificationText').textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
/* ==================== 文件夹管理系统 ==================== */

// 获取当前文件夹下的所有单词
function getCurrentFolderWords() {
    const currentFolder = folderStructure.folders.find(f => f.id === currentFolderId);
    if (!currentFolder || currentFolderId === 'root') {
        // 根目录显示所有单词
        return vocabulary.filter(item => item.type === 'word');
    }
    
    // 子文件夹只显示属于自己的单词
    return vocabulary.filter(item => item.type === 'word' && item.parentId === currentFolderId);
}

// 渲染文件夹导航面包屑
function renderFolderBreadcrumb() {
    const breadcrumb = document.getElementById('folderBreadcrumb');
    if (!breadcrumb) return;
    
    const path = [];
    let currentId = currentFolderId;
    
    while (currentId) {
        const folder = folderStructure.folders.find(f => f.id === currentId);
        if (folder) {
            path.unshift(folder);
            currentId = folder.parentId;
        } else {
            break;
        }
    }
    
    breadcrumb.innerHTML = path.map((folder, index) => `
        <span class="breadcrumb-item" onclick="navigateToFolder('${folder.id}')">
            ${folder.name}
        </span>
        ${index < path.length - 1 ? '<span class="breadcrumb-separator">›</span>' : ''}
    `).join('');
}

// 渲染文件夹侧边栏
function renderFolderSidebar() {
    const sidebar = document.getElementById('folderSidebar');
    if (!sidebar) return;
    
    const rootFolder = folderStructure.folders.find(f => f.id === 'root');
    if (!rootFolder) return;
    
    sidebar.innerHTML = `
        <div class="folder-item root ${currentFolderId === 'root' ? 'active' : ''}" 
             onclick="navigateToFolder('root')">
            <span class="folder-icon">📁</span>
            <span class="folder-name" title="${escapeHtml(rootFolder.name)}">${escapeHtml(rootFolder.name)}</span>
            ${rootFolder.unviewed ? '<span class="recent-badge">新</span>' : ''}
        </div>
        <div class="folder-children">
            ${renderFolderTree(rootFolder.id, 0)}
        </div>
    `;
}

// 递归渲染文件夹树（带顶层快捷操作）
function renderFolderTree(parentId, level) {
    const children = folderStructure.folders.filter(f => f.parentId === parentId);

    if (children.length === 0) return '';

    return children.map(folder => {
        // word-source类型显示特殊图标和信息
        const isWordSource = folder.type === 'word-source';
        const icon = isWordSource ? '📋' : '📂';
        const wordCount = getWordCountInFolder(folder.id);
        const countText = isWordSource && wordCount === 0 ? 
            `(${folder.wordCount || 0}+)` : `(${wordCount})`;
        const loadedIndicator = isWordSource && folder.isLoaded ? 
            '<span style="color:#10b981;margin-left:4px;">✓</span>' : '';
        
        // 仅在顶层单词本（parentId === 'root'）显示快捷操作按钮
        const actions = folder.parentId === 'root' ? `
            <span style="display:flex;gap:6px;margin-left:8px;">
                <button class="table-action-btn" title="导入到此单词本" onclick="event.stopPropagation(); importFolder('${folder.id}')">📥</button>
                <button class="table-action-btn" title="导出此单词本" onclick="event.stopPropagation(); exportFolderPrompt('${folder.id}')">📤</button>
                <button class="table-action-btn" title="重命名" onclick="event.stopPropagation(); renameFolder('${folder.id}')">✏️</button>
                <button class="table-action-btn" title="删除" onclick="event.stopPropagation(); deleteFolder('${folder.id}')" style="color:#A87C5C;">🗑️</button>
            </span>
        ` : '';

        return `
        <div class="folder-item ${currentFolderId === folder.id ? 'active' : ''} ${isWordSource ? 'word-source' : ''}" 
             style="padding-left: ${level * 20 + 10}px;"
             onclick="navigateToFolder('${folder.id}')"
             oncontextmenu="showFolderMenu(event, '${folder.id}')">
            <span class="folder-icon">${icon}</span>
            <span class="folder-name" title="${escapeHtml(folder.name)}">${escapeHtml(folder.name)}</span>
            ${folder.unviewed ? '<span class="recent-badge">新</span>' : ''}
            ${loadedIndicator}
            <span class="folder-count">${countText}</span>
            ${actions}
        </div>
        <div class="folder-children">
            ${renderFolderTree(folder.id, level + 1)}
        </div>
    `;
    }).join('');
}

// 导入到指定文件夹（触发文件选择）
function importFolder(folderId) {
    importTargetFolderId = folderId;
    document.getElementById('importFile').click();
}

// 导出指定文件夹：先询问格式，然后导出
function exportFolderPrompt(folderId) {
    const format = prompt('请输入导出格式 (json / csv / excel)，默认为 json：', 'json');
    const fmt = (format || 'json').toLowerCase();
    exportFolder(folderId, fmt);
}

function exportFolder(folderId, format = 'json') {
    const words = vocabulary.filter(v => v.type === 'word' && v.parentId === folderId);
    if (!words || words.length === 0) {
        showNotification('⚠️ 该单词本没有单词可导出');
        return;
    }

    const name = (folderStructure.folders.find(f => f.id === folderId)?.name) || '单词本';
    const date = new Date().toISOString().split('T')[0];
    const filenameBase = `${name.replace(/[^\w\-\u4e00-\u9fa5]/g, '')}_${date}`;

    if (format === 'excel') {
        const data = words.map(v => ({
            '单词': v.word,
            '罗马发音/音标': v.romanization || v.pronunciation || '',
            '中文释义': v.translation || '',
            '语言': LANGUAGES[v.language]?.name || v.language,
            '来源': v.source || '',
            '添加日期': new Date(v.addedDate).toLocaleDateString('zh-CN')
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, name);
        XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        showNotification('✅ 导出成功（Excel）');
        return;
    }

    if (format === 'csv') {
        let csv = '\ufeff';
        csv += '单词,罗马发音/音标,中文释义,语言,来源,添加日期\n';
        words.forEach(v => {
            csv += `"${v.word}","${v.romanization || v.pronunciation || ''}","${v.translation || ''}","${LANGUAGES[v.language]?.name || v.language}","${v.source || ''}","${new Date(v.addedDate).toLocaleDateString('zh-CN')}"\n`;
        });

        downloadFile(csv, `${filenameBase}.csv`, 'text/csv');
        showNotification('✅ 导出成功（CSV）');
        return;
    }

    // 默认 JSON
    const json = JSON.stringify(words, null, 2);
    downloadFile(json, `${filenameBase}.json`, 'application/json');
    showNotification('✅ 导出成功（JSON）');
}

// 获取文件夹中的单词数量
function getWordCountInFolder(folderId) {
    if (folderId === 'root') {
        return vocabulary.filter(item => item.type === 'word').length;
    }
    return vocabulary.filter(item => item.type === 'word' && item.parentId === folderId).length;
}

// 导航到指定文件夹
function navigateToFolder(folderId) {
    currentFolderId = folderId;
    currentPage = 1; // 重置页码
    // 进入文件夹时清除未查看标记
    const folder = folderStructure.folders.find(f => f.id === folderId);
    if (folder && folder.unviewed) {
        delete folder.unviewed;
        saveFolderStructure();
    }

    // 如果是word-source类型且未加载，则懒加载
    if (folder && folder.type === 'word-source' && !folder.isLoaded) {
        loadWordSourceFolder(folderId);
    }

    renderFolderBreadcrumb();
    renderFolderSidebar();
    renderVocabulary();
}

// 懒加载word-source文件夹的单词（优化：只加载基本信息，按需加载详情）
async function loadWordSourceFolder(folderId) {
    const folder = folderStructure.folders.find(f => f.id === folderId);
    if (!folder || !folder.excelPath) {
        showNotification('❌ 找不到单词表文件路径');
        return;
    }

    showLoadingOverlay(`正在加载 ${folder.name}...`);

    try {
        // 先检查是否已经加载过
        const existingWords = vocabulary.filter(v => v.parentId === folderId && v.type === 'word');
        if (existingWords.length > 0) {
            // 已经有单词，直接显示
            folder.isLoaded = true;
            saveFolderStructure();
            renderFolderSidebar();
            renderVocabulary();
            hideLoadingOverlay();
            showNotification(`✅ ${folder.name} 已加载 (${existingWords.length} 个单词)`);
            return;
        }

        // 加载Excel文件
        // 确保使用正确的相对路径
        const basePath = ''; // 相对于当前页面的路径
        const excelUrl = basePath + folder.excelPath;
        console.log('📁 加载Excel文件:', excelUrl);
        const response = await fetch(excelUrl);
        if (!response.ok) {
            throw new Error('文件不存在：' + folder.excelPath);
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        // 智能识别列名
        const columnMappings = [
            { word: ['单词', 'word', 'Word', '词'], 
              roman: ['罗马发音', '音标', '发音', 'romanization', 'pronunciation', 'ipa', 'IPA', 'pinyin', '拼音'],
              translation: ['中文', '释义', '翻译', 'translation', 'meaning', '中文释义'],
              language: ['语言', 'language', 'lang']
            }
        ];

        let importCount = 0;
        const batchSize = 100; // 每批加载100个单词
        const totalWords = jsonData.length;

        // 分批加载单词
        for (let i = 0; i < totalWords; i += batchSize) {
            const batch = jsonData.slice(i, i + batchSize);
            
            for (const row of batch) {
                const keys = Object.keys(row);
                
                // 智能匹配列
                const wordKey = keys.find(k => columnMappings[0].word.some(m => k.includes(m))) || keys[0];
                const romanKey = keys.find(k => columnMappings[0].roman.some(m => k.includes(m))) || keys[1];
                const translationKey = keys.find(k => columnMappings[0].translation.some(m => k.includes(m))) || keys[2];
                
                const word = row[wordKey];
                if (!word) continue;
                
                // 检查是否已存在（在该文件夹中）
                const existsInFolder = vocabulary.find(v => 
                    v.word === word && 
                    v.type === 'word' && 
                    v.parentId === folderId
                );
                
                if (!existsInFolder) {
                    vocabulary.push({
                        id: Date.now() + Math.random(),
                        word: word,
                        pronunciation: '',
                        romanization: row[romanKey] || '',
                        translation: row[translationKey] || '',
                        language: 'en', // 默认英语
                        source: '预设单词表',
                        addedDate: new Date().toISOString(),
                        type: 'word',
                        parentId: folderId,
                        // 新增：标记为基本信息，详情按需加载
                        hasDetails: false
                    });
                    importCount++;
                }
            }

            // 每批保存一次，避免一次性保存大量数据
            saveVocabulary();
            updateStats();

            // 更新加载进度
            const progress = Math.min(100, Math.round((i + batch.length) / totalWords * 100));
            updateLoadingText(`正在加载 ${folder.name}... ${progress}%`);

            // 给浏览器一点时间处理UI更新
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // 标记为已加载
        folder.isLoaded = true;
        folder.wordCount = importCount;
        saveFolderStructure();

        renderFolderSidebar();
        renderVocabulary();
        hideLoadingOverlay();
        showNotification(`✅ 已加载 ${folder.name} (${importCount} 个单词)`);

        // 询问是否要AI补全
        if (importCount > 0 && confirm(`是否使用AI补全 ${folder.name} 的发音和释义？\n\n注意：这会消耗API额度。`)) {
            showAICompleteModal();
        }

    } catch (error) {
        console.error('加载单词表失败:', error);
        hideLoadingOverlay();
        showNotification('❌ 加载失败：' + error.message);
    }
}

// 创建新文件夹
function createFolder() {
    const name = prompt('请输入文件夹名称：');
    if (!name || !name.trim()) return;
    
    const newFolder = {
        id: 'folder-' + Date.now(),
        name: name.trim(),
        type: 'folder',
        parentId: currentFolderId,
        expanded: true
    };
    
    folderStructure.folders.push(newFolder);
    saveFolderStructure();
    renderFolderSidebar();
    
    showNotification(`✅ 文件夹 "${name}" 创建成功`);
}

// 删除文件夹（包含所有子文件夹和单词）
function deleteFolder(folderId) {
    const folder = folderStructure.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const wordCount = getWordCountInFolder(folderId);
    const confirmMsg = `确定删除文件夹 "${folder.name}" 吗？${wordCount > 0 ? `这将删除 ${wordCount} 个单词！` : ''}`;
    
    if (!confirm(confirmMsg)) return;
    
    // 递归删除所有子文件夹
    const children = folderStructure.folders.filter(f => f.parentId === folderId);
    children.forEach(child => deleteFolder(child.id));
    
    // 删除文件夹内的单词
    vocabulary = vocabulary.filter(item => !(item.type === 'word' && item.parentId === folderId));
    
    // 删除文件夹本身
    folderStructure.folders = folderStructure.folders.filter(f => f.id !== folderId);
    
    saveVocabulary();
    saveFolderStructure();
    
    if (currentFolderId === folderId) {
        navigateToFolder('root');
    } else {
        renderFolderSidebar();
        renderVocabulary();
    }
    
    showNotification(`🗑️ 文件夹 "${folder.name}" 已删除`);
}

// 重命名文件夹
function renameFolder(folderId) {
    const folder = folderStructure.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const newName = prompt('请输入新名称：', folder.name);
    if (!newName || !newName.trim() || newName === folder.name) return;
    
    folder.name = newName.trim();
    saveFolderStructure();
    renderFolderSidebar();
    renderFolderBreadcrumb();
    
    showNotification(`✅ 文件夹已重命名为 "${newName}"`);
}

// 保存文件夹结构
function saveFolderStructure() {
    localStorage.setItem('folderStructure', JSON.stringify(folderStructure));
}

// 加载文件夹结构
function loadFolderStructure() {
    const saved = localStorage.getItem('folderStructure');
    const savedVersion = localStorage.getItem('folderStructureVersion');
    const currentVersion = '2.1'; // 版本号，更新时递增

    if (saved && savedVersion === currentVersion) {
        folderStructure = JSON.parse(saved);
    } else {
        // 版本不匹配或首次加载，使用默认结构
        console.log('文件夹结构版本更新，重新初始化');
        if (typeof PRESET_FOLDER_STRUCTURE !== 'undefined') {
            folderStructure = {
                folders: PRESET_FOLDER_STRUCTURE.folders.map(f => ({
                    ...f,
                    isVirtual: f.type === 'word-source'
                }))
            };
        } else {
            // 即使PRESET_FOLDER_STRUCTURE未定义，也要确保folderStructure有默认值
            folderStructure = {
                folders: [
                    {
                        id: 'root',
                        name: '我的单词本',
                        type: 'folder',
                        parentId: null,
                        expanded: true
                    }
                ]
            };
        }
        localStorage.setItem('folderStructureVersion', currentVersion);
    }

    // 合并预设文件夹结构
    mergePresetFolders();
}

// 合并预设文件夹到当前结构
function mergePresetFolders() {
    if (typeof PRESET_FOLDER_STRUCTURE === 'undefined') {
        console.warn('PRESET_FOLDER_STRUCTURE未定义');
        return;
    }

    let hasChanges = false;

    // 遍历预设文件夹，添加不存在的或更新已存在的
    PRESET_FOLDER_STRUCTURE.folders.forEach(presetFolder => {
        // 跳过root，因为已经存在
        if (presetFolder.id === 'root') return;

        // 检查是否已存在
        const existingIndex = folderStructure.folders.findIndex(f => f.id === presetFolder.id);
        if (existingIndex === -1) {
            // 不存在，添加新文件夹
            folderStructure.folders.push({
                ...presetFolder,
                // 如果是word-source类型，标记为虚拟文件夹（懒加载）
                isVirtual: presetFolder.type === 'word-source'
            });
            hasChanges = true;
        } else {
            // 已存在，强制更新所有关键属性
            const existing = folderStructure.folders[existingIndex];
            // 检查是否需要更新
            const needsUpdate =
                existing.name !== presetFolder.name ||
                existing.excelPath !== presetFolder.excelPath ||
                existing.wordCount !== presetFolder.wordCount;

            if (needsUpdate) {
                folderStructure.folders[existingIndex] = {
                    ...existing,
                    ...presetFolder,
                    // 保留用户的状态（如expanded、isLoaded等）
                    expanded: existing.expanded !== undefined ? existing.expanded : presetFolder.expanded,
                    isLoaded: existing.isLoaded,
                    isVirtual: presetFolder.type === 'word-source'
                };
                hasChanges = true;
                console.log('更新文件夹:', presetFolder.id, '名称:', presetFolder.name, '词数:', presetFolder.wordCount);
            }
        }
    });

    if (hasChanges) {
        saveFolderStructure();
        console.log('文件夹结构已更新并保存');
    }
}

// 显示文件夹右键菜单（高级功能）
function showFolderMenu(event, folderId) {
    event.preventDefault();
    
    const menu = document.createElement('div');
    menu.className = 'folder-context-menu';
    menu.innerHTML = `
        <div class="menu-item" onclick="renameFolder('${folderId}')">✏️ 重命名</div>
        <div class="menu-item" onclick="deleteFolder('${folderId}')" style="color: #A87C5C;">🗑️ 删除</div>
    `;
    
    menu.style.cssText = `
        position: absolute;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 8px 0;
        z-index: 10000;
        left: ${event.pageX}px;
        top: ${event.pageY}px;
    `;
    
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 100);
}

/* ==================== 迁移旧数据 ==================== */

// 升级旧数据到新格式
function migrateOldData() {
    const oldData = localStorage.getItem('vocabulary');
    if (!oldData) return;
    
    try {
        const oldWords = JSON.parse(oldData);
        
        // 如果已经是新格式（包含type字段），则不需要迁移
        if (oldWords.length > 0 && oldWords[0].type) return;
        
        // 创建"历史单词"文件夹
        const historyFolder = {
            id: 'folder-history-' + Date.now(),
            name: '历史单词',
            type: 'folder',
            parentId: 'root',
            expanded: true
        };
        
        folderStructure.folders.push(historyFolder);
        
        // 迁移旧单词到新格式
        vocabulary = oldWords.map(word => ({
            ...word,
            type: 'word',
            parentId: historyFolder.id,
            migrated: true // 标记为迁移数据
        }));
        
        saveVocabulary();
        saveFolderStructure();
        
        showNotification('📥 历史数据已迁移到新版本！');
    } catch (e) {
        console.error('数据迁移失败:', e);
    }
}
/* ==================== MySQL 数据库集成 ==================== */

// 加载MySQL配置
function loadMySQLConfig() {
    const saved = localStorage.getItem('mysqlConfig');
    if (saved) {
        try {
            mysqlConfig = { ...mysqlConfig, ...JSON.parse(saved) };
        } catch (e) {
            console.error('加载MySQL配置失败:', e);
        }
    }
}

// 保存MySQL配置
function saveMySQLConfig() {
    localStorage.setItem('mysqlConfig', JSON.stringify(mysqlConfig));
}

// 启用/禁用MySQL同步
function toggleMySQL(enabled) {
    mysqlConfig.enabled = enabled;
    saveMySQLConfig();
    
    if (enabled && mysqlConfig.autoSync) {
        startAutoSync();
        showNotification('✅ MySQL同步已启用');
    } else {
        stopAutoSync();
        showNotification('⏸️ MySQL同步已禁用');
    }
    
    updateSyncUI();
}

// 初始化同步UI
function initSyncUI() {
    // 在页面顶部添加同步状态栏（如果不存在）
    if (!document.getElementById('syncStatusBar')) {
        const statusBar = document.createElement('div');
        statusBar.id = 'syncStatusBar';
        statusBar.className = 'sync-status-bar hidden';
        statusBar.innerHTML = `
            <span class="sync-status-icon">🔄</span>
            <span class="sync-status-text">准备同步...</span>
            <span class="sync-pending-count"></span>
            <button class="sync-now-btn" onclick="syncNow()">立即同步</button>
            <button class="sync-settings-btn" onclick="showSyncSettings()">⚙️</button>
        `;
        document.body.insertBefore(statusBar, document.body.firstChild);
    }
    
    updateSyncUI();
}

// 更新同步UI
function updateSyncUI() {
    const statusBar = document.getElementById('syncStatusBar');
    if (!statusBar) return;
    
    if (mysqlConfig.enabled) {
        statusBar.classList.remove('hidden');
        const statusText = statusBar.querySelector('.sync-status-text');
        const statusIcon = statusBar.querySelector('.sync-status-icon');
        const pendingCount = statusBar.querySelector('.sync-pending-count');
        
        if (syncStatus.syncing) {
            statusIcon.textContent = '⏳';
            statusText.textContent = '正在同步...';
            pendingCount.textContent = '';
        } else if (syncStatus.lastError) {
            statusIcon.textContent = '❌';
            statusText.textContent = '同步失败';
            pendingCount.textContent = '';
        } else if (syncStatus.pending > 0) {
            statusIcon.textContent = '📤';
            statusText.textContent = '有待同步数据';
            pendingCount.textContent = `(${syncStatus.pending}项)`;
        } else {
            statusIcon.textContent = '✅';
            statusText.textContent = mysqlConfig.lastSync 
                ? `上次同步: ${formatSyncTime(mysqlConfig.lastSync)}`
                : '就绪';
            pendingCount.textContent = '';
        }
    } else {
        statusBar.classList.add('hidden');
    }
}

// 格式化同步时间
function formatSyncTime(timestamp) {
    if (!timestamp) return '从未';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / 1000; // 秒
    
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// 立即同步
async function syncNow() {
    if (syncStatus.syncing) {
        showNotification('⏳ 正在同步中，请稍候...');
        return;
    }
    
    try {
        syncStatus.syncing = true;
        updateSyncUI();
        
        // 推送本地数据到MySQL
        await pushToMySQL();
        
        // 从MySQL拉取最新数据
        await pullFromMySQL();
        
        mysqlConfig.lastSync = new Date().toISOString();
        saveMySQLConfig();
        
        syncStatus.syncing = false;
        syncStatus.pending = 0;
        syncStatus.lastError = null;
        updateSyncUI();
        
        showNotification('✅ 同步完成！');
    } catch (error) {
        console.error('同步失败:', error);
        syncStatus.syncing = false;
        syncStatus.lastError = error.message;
        updateSyncUI();
        showNotification('❌ 同步失败: ' + error.message);
    }
}

// 推送数据到MySQL
async function pushToMySQL() {
    const response = await fetch(`${mysqlConfig.apiUrl}/sync.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'push',
            data: {
                vocabulary: vocabulary,
                folders: folderStructure.folders,
                last_sync: mysqlConfig.lastSync
            }
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || '推送失败');
    }
    
    return result;
}

// 从MySQL拉取数据
async function pullFromMySQL() {
    const response = await fetch(`${mysqlConfig.apiUrl}/sync.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'pull',
            last_sync: mysqlConfig.lastSync
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || '拉取失败');
    }
    
    // 合并数据（简单策略：服务器数据优先）
    if (result.data.vocabulary && result.data.vocabulary.length > 0) {
        vocabulary = result.data.vocabulary;
        localStorage.setItem('vocabulary', JSON.stringify(vocabulary));
    }
    
    if (result.data.folders && result.data.folders.length > 0) {
        folderStructure.folders = result.data.folders;
        localStorage.setItem('folderStructure', JSON.stringify(folderStructure));
    }
    
    // 刷新UI
    renderVocabulary();
    renderFolderSidebar();
    updateStats();
    
    return result;
}

// 自动同步定时器
let autoSyncTimer = null;

function startAutoSync() {
    if (autoSyncTimer) {
        clearInterval(autoSyncTimer);
    }
    
    autoSyncTimer = setInterval(() => {
        if (mysqlConfig.enabled && mysqlConfig.autoSync && !syncStatus.syncing) {
            syncNow();
        }
    }, mysqlConfig.syncInterval);
}

function stopAutoSync() {
    if (autoSyncTimer) {
        clearInterval(autoSyncTimer);
        autoSyncTimer = null;
    }
}

// 显示同步设置对话框
function showSyncSettings() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>🔄 MySQL同步设置</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="enableMySQL" ${mysqlConfig.enabled ? 'checked' : ''}>
                        启用MySQL云端同步
                    </label>
                </div>
                
                <div class="form-group">
                    <label>API地址</label>
                    <input type="text" id="apiUrl" value="${mysqlConfig.apiUrl}" 
                           placeholder="/api/learning" class="form-control">
                    <small>示例: /api/learning 或 https://your-domain.com/api/learning</small>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="autoSync" ${mysqlConfig.autoSync ? 'checked' : ''}>
                        自动同步
                    </label>
                </div>
                
                <div class="form-group">
                    <label>同步间隔（秒）</label>
                    <input type="number" id="syncInterval" value="${mysqlConfig.syncInterval / 1000}" 
                           min="10" max="300" class="form-control">
                    <small>建议: 30-60秒</small>
                </div>
                
                <div class="sync-status-info">
                    <p><strong>上次同步:</strong> ${mysqlConfig.lastSync ? new Date(mysqlConfig.lastSync).toLocaleString('zh-CN') : '从未'}</p>
                    <p><strong>待同步项:</strong> ${syncStatus.pending} 项</p>
                    <p><strong>状态:</strong> ${syncStatus.lastError ? '❌ ' + syncStatus.lastError : '✅ 正常'}</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                <button class="btn-primary" onclick="saveSyncSettings()">保存设置</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 保存同步设置
function saveSyncSettings() {
    const enabled = document.getElementById('enableMySQL').checked;
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const autoSync = document.getElementById('autoSync').checked;
    const syncInterval = parseInt(document.getElementById('syncInterval').value) * 1000;
    
    if (!apiUrl) {
        showNotification('❌ 请输入API地址');
        return;
    }
    
    mysqlConfig.enabled = enabled;
    mysqlConfig.apiUrl = apiUrl;
    mysqlConfig.autoSync = autoSync;
    mysqlConfig.syncInterval = syncInterval;
    
    saveMySQLConfig();
    
    if (enabled) {
        if (autoSync) {
            startAutoSync();
        } else {
            stopAutoSync();
        }
        showNotification('✅ 设置已保存，MySQL同步已启用');
    } else {
        stopAutoSync();
        showNotification('⏸️ 设置已保存，MySQL同步已禁用');
    }
    
    updateSyncUI();
    document.querySelector('.modal-overlay').remove();
}

// 添加单词时标记待同步
function markPendingSync() {
    if (mysqlConfig.enabled) {
        syncStatus.pending++;
        updateSyncUI();
    }
}

/* ==================== 修改原有的保存函数，添加自动同步支持 ==================== */

// 保存单词本到localStorage（修改为支持MySQL）
const originalSaveVocabulary = function() {
    localStorage.setItem('vocabulary', JSON.stringify(vocabulary));
};

function saveVocabulary() {
    originalSaveVocabulary();
    markPendingSync();
    
    // 如果启用了自动同步，延迟同步（避免频繁请求）
    if (mysqlConfig.enabled && mysqlConfig.autoSync) {
        clearTimeout(window.saveVocabularyTimer);
        window.saveVocabularyTimer = setTimeout(() => {
            syncNow();
        }, 5000); // 5秒后同步
    }
}

// 保存文件夹结构（修改为支持MySQL）
const originalSaveFolderStructure = function() {
    localStorage.setItem('folderStructure', JSON.stringify(folderStructure));
};

function saveFolderStructure() {
    originalSaveFolderStructure();
    markPendingSync();
    
    if (mysqlConfig.enabled && mysqlConfig.autoSync) {
        clearTimeout(window.saveFolderTimer);
        window.saveFolderTimer = setTimeout(() => {
            syncNow();
        }, 5000);
    }
}

/* ==================== 预设单词表功能 ==================== */

// 显示添加单词表模态框
function showAddWordSourceModal() {
    const modal = document.getElementById('addWordSourceModal');
    if (!modal) {
        showNotification('❌ 模态框加载失败');
        return;
    }
    
    // 填充父文件夹选项
    const parentSelect = document.getElementById('wordSourceParent');
    if (parentSelect) {
        let html = '<option value="root">我的单词本 (根目录)</option>';
        folderStructure.folders.forEach(f => {
            if (f.id !== 'root' && f.type === 'folder') {
                const depth = getFolderDepth(f.id);
                const indent = '　'.repeat(depth);
                html += `<option value="${f.id}">${indent}${f.name}</option>`;
            }
        });
        parentSelect.innerHTML = html;
    }
    
    modal.classList.add('active');
}

// 关闭添加单词表模态框
function closeAddWordSourceModal() {
    const modal = document.getElementById('addWordSourceModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// 保存新单词表
function saveNewWordSource() {
    const name = document.getElementById('wordSourceName').value.trim();
    const parentId = document.getElementById('wordSourceParent').value;
    const excelPath = document.getElementById('wordSourcePath').value.trim();
    const wordCount = parseInt(document.getElementById('wordSourceCount').value) || 1000;
    const difficulty = document.getElementById('wordSourceDifficulty').value;
    
    if (!name) {
        showNotification('⚠️ 请输入单词表名称');
        return;
    }
    
    if (!excelPath) {
        showNotification('⚠️ 请输入Excel文件路径');
        return;
    }
    
    // 创建新的word-source
    const newWordSource = {
        id: 'ws-' + Date.now(),
        name: '📋 ' + name,
        type: 'word-source',
        parentId: parentId,
        excelPath: excelPath,
        wordCount: wordCount,
        difficulty: difficulty,
        language: 'en',
        isVirtual: true
    };
    
    folderStructure.folders.push(newWordSource);
    saveFolderStructure();
    renderFolderSidebar();
    closeAddWordSourceModal();
    
    showNotification(`✅ 单词表 "${name}" 添加成功！点击即可加载`);
    
    // 清空表单
    document.getElementById('wordSourceName').value = '';
    document.getElementById('wordSourcePath').value = '';
    document.getElementById('wordSourceCount').value = '1000';
}

// 获取文件夹深度
function getFolderDepth(folderId) {
    let depth = 0;
    let folder = folderStructure.folders.find(f => f.id === folderId);
    while (folder && folder.parentId !== null) {
        depth++;
        folder = folderStructure.folders.find(f => f.id === folder.parentId);
    }
    return depth;
}

// 显示预设单词表模态框（已废弃，保留兼容性）
function showPresetListsModal() {
    showNotification('💡 单词表已内嵌到左侧文件夹中，点击即可查看！');
}

// 关闭预设单词表模态框
function closePresetListsModal() {
    // 保留空函数
}

// 导入预设单词表
// 导入预设Excel文件（用于懒加载）
async function importPresetExcelFile(relativePath, targetFolderId) {
    return new Promise((resolve, reject) => {
        const fullPath = relativePath;
        
        fetch(fullPath)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('文件不存在：' + fullPath + '\n\n请检查文件路径是否正确。');
                    }
                    throw new Error('无法加载文件：' + fullPath + ' (状态码: ' + response.status + ')');
                }
                return response.arrayBuffer();
            })
            .then(data => {
                try {
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    
                    // 智能识别列名
                    const columnMappings = [
                        { word: ['单词', 'word', 'Word', '词'], 
                          roman: ['罗马发音', '音标', '发音', 'romanization', 'pronunciation', 'ipa', 'IPA', 'pinyin', '拼音'],
                          translation: ['中文', '释义', '翻译', 'translation', 'meaning', '中文释义'],
                          language: ['语言', 'language', 'lang']
                        }
                    ];
                    
                    let importCount = 0;
                    jsonData.forEach(row => {
                        const keys = Object.keys(row);
                        
                        // 智能匹配列
                        const wordKey = keys.find(k => columnMappings[0].word.some(m => k.includes(m))) || keys[0];
                        const romanKey = keys.find(k => columnMappings[0].roman.some(m => k.includes(m))) || keys[1];
                        const translationKey = keys.find(k => columnMappings[0].translation.some(m => k.includes(m))) || keys[2];
                        
                        const word = row[wordKey];
                        if (!word) return;
                        
                        // 检查是否已存在（在该文件夹中）
                        const existsInFolder = vocabulary.find(v => 
                            v.word === word && 
                            v.type === 'word' && 
                            v.parentId === targetFolderId
                        );
                        
                        if (!existsInFolder) {
                            vocabulary.push({
                                id: Date.now() + Math.random(),
                                word: word,
                                pronunciation: '',
                                romanization: row[romanKey] || '',
                                translation: row[translationKey] || '',
                                language: 'en', // 默认英语
                                source: '预设单词表',
                                addedDate: new Date().toISOString(),
                                type: 'word',
                                parentId: targetFolderId
                            });
                            importCount++;
                        }
                    });
                    
                    saveVocabulary();
                    updateStats();
                    console.log(`成功导入 ${importCount} 个单词`);
                    resolve();
                    
                } catch (error) {
                    reject(new Error('解析Excel文件失败：' + error.message));
                }
            })
            .catch(error => {
                reject(error);
            });
    });
}

/* ==================== AI翻译单词本功能 ==================== */

// 显示AI翻译单词本模态框
function showTranslateFolderModal() {
    const modal = document.getElementById('translateFolderModal');
    if (!modal) {
        showNotification('❌ 模态框加载失败');
        return;
    }
    
    // 填充源文件夹选项
    const sourceSelect = document.getElementById('translateSourceFolder');
    if (sourceSelect) {
        let html = '<option value="">请选择...</option>';
        folderStructure.folders.forEach(f => {
            if (f.id !== 'root' && f.type === 'folder') {
                const wordCount = getWordCountInFolder(f.id);
                if (wordCount > 0) {
                    html += `<option value="${f.id}">${f.name} (${wordCount}词)</option>`;
                }
            }
        });
        sourceSelect.innerHTML = html;
        
        // 监听选择变化，更新预估
        sourceSelect.onchange = updateTranslateEstimate;
    }
    
    // 监听其他字段变化
    document.getElementById('translateBatchSize')?.addEventListener('input', updateTranslateEstimate);
    document.getElementById('translateDelay')?.addEventListener('input', updateTranslateEstimate);
    document.getElementById('translateStrategy')?.addEventListener('change', updateTranslateEstimate);
    document.getElementById('translateMode')?.addEventListener('change', updateTranslateEstimate);
    
    modal.classList.add('active');
    updateTranslateEstimate();
}

// 切换批处理设置显示
function toggleBatchSettings() {
    const strategy = document.getElementById('translateStrategy')?.value;
    const batchSettings = document.getElementById('batchSettings');
    if (batchSettings) {
        batchSettings.style.display = strategy === 'batch' ? 'block' : 'none';
    }
    updateTranslateEstimate();
}

// 关闭AI翻译单词本模态框
function closeTranslateFolderModal() {
    const modal = document.getElementById('translateFolderModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// 更新翻译预估时间和成本
function updateTranslateEstimate() {
    const folderId = document.getElementById('translateSourceFolder')?.value;
    const strategy = document.getElementById('translateStrategy')?.value || 'batch';
    const batchSize = parseInt(document.getElementById('translateBatchSize')?.value) || 10;
    const delay = parseInt(document.getElementById('translateDelay')?.value) || 1000;
    const mode = document.getElementById('translateMode')?.value || 'full';
    
    const timeEl = document.getElementById('estimatedTranslateTime');
    const costEl = document.getElementById('estimatedCost');
    const callsEl = document.getElementById('estimatedCalls');
    const tokensEl = document.getElementById('estimatedTokens');
    
    if (!folderId) {
        if (timeEl) timeEl.textContent = '请先选择单词本';
        if (costEl) costEl.textContent = '¥0.00';
        if (callsEl) callsEl.textContent = '0';
        if (tokensEl) tokensEl.textContent = '0';
        return;
    }
    
    const wordCount = getWordCountInFolder(folderId);
    const settings = loadSettings();
    const apiType = settings.apiType || 'deepseek';
    
    let batches, totalSeconds, apiCalls, totalTokens, cost;
    
    if (strategy === 'all') {
        // 一次性翻译
        batches = 1;
        totalSeconds = 5; // 约5秒
        apiCalls = 1;
        // 估算token：每个单词平均50 tokens（输入+输出）
        totalTokens = wordCount * (mode === 'full' ? 80 : 40);
    } else {
        // 分批处理
        batches = Math.ceil(wordCount / batchSize);
        totalSeconds = Math.ceil((batches * delay) / 1000) + batches * 3; // 每批约3秒响应时间
        apiCalls = batches;
        totalTokens = wordCount * (mode === 'full' ? 80 : 40);
    }
    
    // 计算成本
    if (apiType === 'deepseek') {
        // DeepSeek: ¥0.001/1K输入, ¥0.002/1K输出
        const inputTokens = totalTokens * 0.4; // 40%输入
        const outputTokens = totalTokens * 0.6; // 60%输出
        cost = (inputTokens / 1000 * 0.001) + (outputTokens / 1000 * 0.002);
    } else if (apiType === 'qwen') {
        // 通义千问: ¥0.0005/1K输入, ¥0.002/1K输出
        const inputTokens = totalTokens * 0.4;
        const outputTokens = totalTokens * 0.6;
        cost = (inputTokens / 1000 * 0.0005) + (outputTokens / 1000 * 0.002);
    } else {
        // 其他API估算
        cost = totalTokens / 1000 * 0.01; // 保守估计
    }
    
    // 更新显示
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    let timeText = '';
    if (minutes > 0) {
        timeText = `约 ${minutes} 分 ${seconds} 秒`;
    } else {
        timeText = `约 ${seconds} 秒`;
    }
    
    if (timeEl) {
        timeEl.textContent = `${timeText}（${wordCount} 个单词）`;
    }
    if (costEl) {
        costEl.textContent = `¥${cost.toFixed(2)} (${apiType === 'deepseek' ? 'DeepSeek' : apiType === 'qwen' ? '千问' : 'API'})`;
    }
    if (callsEl) {
        callsEl.textContent = apiCalls;
    }
    if (tokensEl) {
        tokensEl.textContent = Math.round(totalTokens).toLocaleString();
    }
}

// 开始翻译单词本
async function startTranslateFolder() {
    const folderId = document.getElementById('translateSourceFolder').value;
    const sourceLang = document.getElementById('translateSourceLang').value;
    const targetLang = document.getElementById('translateTargetLang').value;
    const mode = document.getElementById('translateMode').value;
    const strategy = document.getElementById('translateStrategy').value || 'batch';
    const batchSize = parseInt(document.getElementById('translateBatchSize').value) || 10;
    const delay = parseInt(document.getElementById('translateDelay').value) || 1000;
    
    if (!folderId) {
        showNotification('⚠️ 请选择源单词本');
        return;
    }
    
    if (sourceLang === targetLang) {
        showNotification('⚠️ 源语言和目标语言不能相同');
        return;
    }
    
    const settings = loadSettings();
    if (!settings.apiKey) {
        showNotification('⚠️ 请先在设置页面配置 API Key');
        return;
    }
    
    // 获取源文件夹信息
    const sourceFolder = folderStructure.folders.find(f => f.id === folderId);
    if (!sourceFolder) {
        showNotification('❌ 找不到源文件夹');
        return;
    }
    
    // 获取要翻译的单词
    const sourceWords = vocabulary.filter(v => v.type === 'word' && v.parentId === folderId);
    if (sourceWords.length === 0) {
        showNotification('⚠️ 该单词本没有单词');
        return;
    }
    
    // 一次性翻译的单词数量限制警告
    if (strategy === 'all' && sourceWords.length > 500) {
        if (!confirm(`检测到单词数量较多（${sourceWords.length}个），一次性翻译可能因token限制失败。\n\n建议选择"分批处理"模式。是否仍要继续？`)) {
            return;
        }
    }
    
    // 确认开始
    const costEstimate = document.getElementById('estimatedCost')?.textContent || '未知';
    if (!confirm(`确定要将 "${sourceFolder.name}" (${sourceWords.length}词) 翻译成${LANGUAGES[targetLang].name}吗？\n\n预计成本：${costEstimate}\n策略：${strategy === 'all' ? '一次性全部翻译' : '分批处理'}`)) {
        return;
    }
    
    closeTranslateFolderModal();
    
    // 创建新文件夹
    const targetFolderName = sourceFolder.name.replace(/英语|English/gi, LANGUAGES[targetLang].name);
    const newFolder = {
        id: 'folder-' + Date.now(),
        name: targetFolderName,
        type: 'folder',
        parentId: sourceFolder.parentId || 'root',
        expanded: true
    };
    folderStructure.folders.push(newFolder);
    saveFolderStructure();
    
    showLoadingOverlay(`正在翻译 ${sourceWords.length} 个单词...`);
    
    let successCount = 0;
    let failCount = 0;
    
    try {
        if (strategy === 'all') {
            // 一次性翻译全部
            updateLoadingText(`一次性翻译全部 ${sourceWords.length} 个单词...`);
            
            const results = await translateWordsBatch(sourceWords, sourceLang, targetLang, mode, settings);
            
            // 添加翻译结果
            results.forEach((result, idx) => {
                if (result.success) {
                    vocabulary.push({
                        id: Date.now() + Math.random(),
                        word: result.word,
                        pronunciation: result.pronunciation || '',
                        romanization: result.romanization || '',
                        translation: result.translation || '',
                        language: targetLang,
                        source: `AI翻译-${sourceFolder.name}`,
                        addedDate: new Date().toISOString(),
                        type: 'word',
                        parentId: newFolder.id,
                        originalWord: sourceWords[idx].word
                    });
                    successCount++;
                } else {
                    failCount++;
                }
            });
            
            saveVocabulary();
            
        } else {
            // 分批处理
            for (let i = 0; i < sourceWords.length; i += batchSize) {
                const batch = sourceWords.slice(i, i + batchSize);
                const batchNum = Math.floor(i / batchSize) + 1;
                const totalBatches = Math.ceil(sourceWords.length / batchSize);
                
                updateLoadingText(`正在翻译第 ${batchNum}/${totalBatches} 批 (${i + 1}-${Math.min(i + batchSize, sourceWords.length)}/${sourceWords.length})`);
                
                // 批量翻译
                const results = await translateWordsBatch(batch, sourceLang, targetLang, mode, settings);
                
                // 添加翻译结果到新文件夹
                results.forEach((result, idx) => {
                    if (result.success) {
                        vocabulary.push({
                            id: Date.now() + Math.random(),
                            word: result.word,
                            pronunciation: result.pronunciation || '',
                            romanization: result.romanization || '',
                            translation: result.translation || '',
                            language: targetLang,
                            source: `AI翻译-${sourceFolder.name}`,
                            addedDate: new Date().toISOString(),
                            type: 'word',
                            parentId: newFolder.id,
                            originalWord: batch[idx].word
                        });
                        successCount++;
                    } else {
                        failCount++;
                    }
                });
                
                saveVocabulary();
                
                // 延迟（避免API限流）
                if (i + batchSize < sourceWords.length && delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        renderFolderSidebar();
        navigateToFolder(newFolder.id);
        hideLoadingOverlay();
        
        const actualCost = document.getElementById('estimatedCost')?.textContent || '未知';
        showNotification(`✅ 翻译完成！成功 ${successCount} 个，失败 ${failCount} 个\n实际消耗：${actualCost}`);
        
    } catch (error) {
        console.error('翻译失败:', error);
        hideLoadingOverlay();
        showNotification('❌ 翻译失败：' + error.message);
    }
}

// 批量翻译单词
async function translateWordsBatch(words, sourceLang, targetLang, mode, settings) {
    const apiType = settings.apiType || 'deepseek';
    const apiKey = settings.apiKey;
    
    // 构建提示词
    const wordList = words.map(w => w.word).join(', ');
    const sourceLangName = LANGUAGES[sourceLang]?.name || sourceLang;
    const targetLangName = LANGUAGES[targetLang]?.name || targetLang;
    const romanType = LANGUAGES[targetLang]?.romanType || 'romanization';
    
    let prompt;
    if (mode === 'full') {
        prompt = `请将以下${sourceLangName}单词翻译成${targetLangName}，并提供对应的${romanType === 'ipa' ? '国际音标' : '罗马发音'}和中文释义。

单词列表：${wordList}

请严格按照以下JSON格式返回，不要添加任何其他文字：
[
  {
    "word": "${targetLangName}单词",
    "romanization": "${romanType === 'ipa' ? 'IPA音标' : '罗马发音'}",
    "translation": "中文释义"
  }
]`;
    } else {
        prompt = `请将以下${sourceLangName}单词翻译成${targetLangName}。

单词列表：${wordList}

请严格按照以下JSON格式返回，不要添加任何其他文字：
[
  {
    "word": "${targetLangName}单词",
    "romanization": "",
    "translation": ""
  }
]`;
    }
    
    try {
        const response = await callAI(apiType, apiKey, prompt);
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) {
            throw new Error('AI返回格式错误');
        }
        
        const results = JSON.parse(jsonMatch[0]);
        return results.map(r => ({
            success: true,
            word: r.word,
            romanization: r.romanization || '',
            translation: r.translation || ''
        }));
        
    } catch (error) {
        console.error('批量翻译失败:', error);
        // 返回失败结果
        return words.map(() => ({ success: false }));
    }
}

// 调用AI接口（支持千问）
async function callAI(apiType, apiKey, prompt) {
    let url, headers, body;
    
    if (apiType === 'qwen') {
        // 通义千问API
        url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
        body = {
            model: 'qwen-plus', // 或 qwen-turbo
            input: {
                messages: [
                    { role: 'system', content: '你是一个专业的语言翻译助手。' },
                    { role: 'user', content: prompt }
                ]
            },
            parameters: {
                temperature: 0.3,
                max_tokens: 2000
            }
        };
    } else if (apiType === 'deepseek') {
        // DeepSeek API
        url = 'https://api.deepseek.com/v1/chat/completions';
        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
        body = {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: '你是一个专业的语言翻译助手。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2000
        };
    } else {
        throw new Error('不支持的API类型');
    }
    
    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        throw new Error(`API请求失败: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (apiType === 'qwen') {
        return data.output?.text || data.output?.choices?.[0]?.message?.content || '';
    } else {
        return data.choices?.[0]?.message?.content || '';
    }
}
