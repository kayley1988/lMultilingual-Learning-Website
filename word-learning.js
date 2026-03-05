// 📚 多语言单词学习工具 - 核心逻辑
// 作者：AI Assistant
// 版本：v1.0

// ==================== 全局状态管理 ====================
// 注意：LANGUAGES 常量从 vocabulary.js 引入，不在此处重复声明
const AppState = {
    currentMode: 'card',
    currentBook: '',
    vocabulary: [],
    filteredWords: [],
    currentWordIndex: 0,
    
    // 学习进度
    masteredWords: new Set(),
    difficultWords: new Set(),
    fuzzyWords: new Set(),
    todayReviewed: 0,
    
    // 卡片状态
    enlargedCard: null,
    
    // 听写状态
    currentDictationWord: null,
    dictationInputMode: 'keyboard',
    dictationLanguage: 'en',
    dictationVoiceIndex: 0,
    availableVoices: [],
    
    // 游戏状态
    currentGame: null,
    gameScore: 0,
    gameLevel: 1,
    selectedTiles: [],
    
    // 词汇图谱
    graphExpanded: false,
    currentGraphWord: null,
    graphLines: [],
    
    // 词汇关联数据库 (从AI导入)
    wordRelations: {},
    
    // MySQL同步配置
    mysqlConfig: {
        enabled: false,
        apiUrl: '/api/learning',
        autoSync: true
    },
    syncStatus: {
        syncing: false,
        lastSync: null
    }
};

// ==================== 初始化 ====================
function initApp() {
    console.log('📚 单词学习工具初始化...');
    
    // 预加载语音（确保Xiaoxiao可用）
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
        // 监听语音列表加载完成
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => {
                const voices = speechSynthesis.getVoices();
                const xiaoxiao = voices.find(v => 
                    v.name.toLowerCase().includes('xiaoxiao') || v.name.includes('晓晓')
                );
                if (xiaoxiao) {
                    console.log('✅ Xiaoxiao语音已加载:', xiaoxiao.name);
                } else {
                    console.log('⚠️ 未找到Xiaoxiao语音，将使用系统默认中文语音');
                }
            };
        }
    }
    
    // 加载本地数据
    loadMySQLConfig();
    loadVocabulary();
    loadProgress();
    loadWordRelations();
    
    // 初始化UI
    initBookSelector();
    initModeSwitch();
    initProgressDisplay();
    
    // 初始化各个模式
    initCardMode();
    initDictationMode();
    initGameMode();
    initGraphMode();
    initImportMode();
    
    // 绑定全局事件
    bindGlobalEvents();
    
    // 显示默认模式
    switchMode('card');
    
    console.log('✅ 初始化完成');
    showNotification('欢迎使用多语言单词学习工具！', 'info');
}

// ==================== 数据加载 ====================
function loadVocabulary() {
    try {
        const data = localStorage.getItem('vocabulary');
        AppState.vocabulary = data ? JSON.parse(data) : [];
        
        // 如果没有单词，添加一些示例单词（仅用于演示）
        if (AppState.vocabulary.length === 0) {
            console.log('📚 本地没有单词数据，请从单词本选择预设单词源');
            // 不自动添加示例单词，让用户选择单词源加载
        }
        
        console.log(`加载了 ${AppState.vocabulary.length} 个单词`);
    } catch (error) {
        console.error('加载单词库失败:', error);
        AppState.vocabulary = [];
    }
}

function loadProgress() {
    try {
        const progress = localStorage.getItem('learningProgress');
        if (progress) {
            const data = JSON.parse(progress);
            AppState.masteredWords = new Set(data.mastered || []);
            AppState.difficultWords = new Set(data.difficult || []);
            AppState.fuzzyWords = new Set(data.fuzzy || []);
            AppState.todayReviewed = data.todayReviewed || 0;
        }
    } catch (error) {
        console.error('加载学习进度失败:', error);
    }
}

function loadWordRelations() {
    try {
        const data = localStorage.getItem('wordRelations');
        AppState.wordRelations = data ? JSON.parse(data) : {};
        console.log(`加载了 ${Object.keys(AppState.wordRelations).length} 个词汇关联`);
    } catch (error) {
        console.error('加载词汇关联失败:', error);
        AppState.wordRelations = {};
    }
}

function saveProgress() {
    const data = {
        mastered: Array.from(AppState.masteredWords),
        difficult: Array.from(AppState.difficultWords),
        fuzzy: Array.from(AppState.fuzzyWords),
        todayReviewed: AppState.todayReviewed,
        lastUpdate: Date.now()
    };
    localStorage.setItem('learningProgress', JSON.stringify(data));
    
    // 如果启用MySQL，同步到服务器
    if (AppState.mysqlConfig.enabled && AppState.mysqlConfig.autoSync) {
        clearTimeout(window.saveProgressTimer);
        window.saveProgressTimer = setTimeout(() => {
            syncProgressToMySQL();
        }, 3000); // 3秒后同步
    }
}

function saveWordRelations() {
    localStorage.setItem('wordRelations', JSON.stringify(AppState.wordRelations));
}

// ==================== 单词本选择器 ====================
function initBookSelector() {
    const select = document.getElementById('book-select');
    const wordCount = document.getElementById('word-count');
    
    if (!select) return;
    
    // 加载文件夹结构
    try {
        const fsData = localStorage.getItem('folderStructure');
        if (fsData) {
            const fs = JSON.parse(fsData);
            const folders = fs.folders || [];
            
            folders.forEach(folder => {
                if (folder.id !== 'root') {
                    const option = document.createElement('option');
                    option.value = folder.id;
                    option.textContent = folder.name;
                    select.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('加载单词本列表失败:', error);
    }
    
    // 监听选择变化
    select.addEventListener('change', async () => {
        const selectedFolderId = select.value;
        
        // 如果是 word-source 类型，需要先加载单词
        if (selectedFolderId) {
            try {
                const fsData = localStorage.getItem('folderStructure');
                if (fsData) {
                    const fs = JSON.parse(fsData);
                    const selectedFolder = fs.folders.find(f => f.id === selectedFolderId);
                    
                    if (selectedFolder && selectedFolder.type === 'word-source' && selectedFolder.excelPath) {
                        // 这是一个单词源文件夹，需要加载
                        console.log('📚 正在加载单词源:', selectedFolder.name);
                        if (typeof loadWordSourceFolder === 'function') {
                            try {
                                await loadWordSourceFolder(selectedFolderId);
                                // 加载完成后，重新从 localStorage 加载词汇数据
                                const vocabData = localStorage.getItem('vocabulary');
                                if (vocabData) {
                                    AppState.vocabulary = JSON.parse(vocabData);
                                    console.log('✅ 已重新加载词汇数据，共', AppState.vocabulary.length, '个单词');
                                }
                            } catch (error) {
                                console.error('加载单词源失败:', error);
                                showNotification('❌ 加载单词源失败，请检查网络连接', 'error');
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('加载单词源失败:', error);
            }
        }
        
        filterWordsByBook(selectedFolderId);
        updateWordCount();
        refreshCurrentMode();
    });
    
    // 初始加载
    filterWordsByBook('');
    updateWordCount();
}

function filterWordsByBook(bookId) {
    console.log('📚 筛选单词本:', bookId);
    console.log('📚 总单词数:', AppState.vocabulary.length);
    
    if (!bookId) {
        AppState.filteredWords = [...AppState.vocabulary];
    } else {
        // 检查前 10 个单词的 parentId
        AppState.vocabulary.slice(0, 10).forEach((word, idx) => {
            console.log(`单词 ${idx}:`, word.word, 'parentId:', word.parentId, 'type:', word.type);
        });
        
        // 使用 parentId 进行筛选（与 vocabulary.js 保持一致）
        AppState.filteredWords = AppState.vocabulary.filter(word => {
            const match = word.parentId === bookId;
            if (match) {
                console.log('✅ 匹配单词:', word.word, 'parentId:', word.parentId);
            }
            return match;
        });
        console.log('📚 筛选后单词数:', AppState.filteredWords.length);
    }
    AppState.currentBook = bookId;
    AppState.currentWordIndex = 0;
}

function updateWordCount() {
    const elem = document.getElementById('word-count');
    if (elem) {
        elem.textContent = `共 ${AppState.filteredWords.length} 个单词`;
    }
}

// ==================== 模式切换 ====================
function initModeSwitch() {
    const buttons = document.querySelectorAll('.nav-btn[data-mode]');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchMode(mode);
        });
    });
}

function switchMode(mode) {
    AppState.currentMode = mode;
    
    // 更新按钮状态
    document.querySelectorAll('.nav-btn[data-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // 隐藏所有模式
    document.querySelectorAll('.card-mode, .dictation-mode, .game-mode, .graph-mode, .import-mode').forEach(el => {
        el.classList.remove('active');
    });
    
    // 显示当前模式
    const modeClass = `.${mode}-mode`;
    const modeElement = document.querySelector(modeClass);
    if (modeElement) {
        modeElement.classList.add('active');
    }
    
    // 初始化对应模式
    switch (mode) {
        case 'card':
            renderCards();
            break;
        case 'dictation':
            startDictation();
            break;
        case 'game':
            // 游戏模式需要用户选择游戏类型
            break;
        case 'graph':
            // 图谱模式需要用户输入单词
            break;
        case 'import':
            // 导入模式无需初始化
            break;
    }
}

function refreshCurrentMode() {
    switchMode(AppState.currentMode);
}

// ==================== 进度显示 ====================
function initProgressDisplay() {
    updateProgressDisplay();
}

function updateProgressDisplay() {
    const total = AppState.filteredWords.length;
    const mastered = Array.from(AppState.masteredWords).filter(word => 
        AppState.filteredWords.some(w => w.word === word)
    ).length;
    const difficult = Array.from(AppState.difficultWords).filter(word => 
        AppState.filteredWords.some(w => w.word === word)
    ).length;
    
    // 更新掌握进度
    updateProgressCircle('mastery-circle', 'mastery-text', mastered, total);
    
    // 更新今日复习
    updateProgressCircle('today-circle', 'today-text', AppState.todayReviewed, total);
    
    // 更新难题剩余
    updateProgressCircle('difficult-circle', 'difficult-text', difficult, total);
}

function updateProgressCircle(circleId, textId, current, total) {
    const circle = document.getElementById(circleId);
    const text = document.getElementById(textId);
    
    if (!circle || !text) return;
    
    const percentage = total > 0 ? (current / total) * 100 : 0;
    const degrees = (percentage / 100) * 360;
    
    // 更新圆形进度条 - 美拉德配色
    circle.style.background = `conic-gradient(
        #8B6F47 0deg,
        #A87C5C ${degrees}deg,
        #eee ${degrees}deg
    )`;
    
    // 更新文本
    if (circleId === 'mastery-circle') {
        text.textContent = `${current}/${total}`;
    } else {
        text.textContent = current;
    }
}

// ==================== 单词卡片模式 ====================
function initCardMode() {
    // 初始化已在 renderCards 中完成
}

function renderCards() {
    const container = document.getElementById('cards-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (AppState.filteredWords.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">暂无单词，请在单词本中添加单词</p>';
        return;
    }
    
    AppState.filteredWords.forEach((word, index) => {
        const card = createWordCard(word, index);
        container.appendChild(card);
    });
}

function createWordCard(word, index) {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.dataset.index = index;
    card.dataset.word = word.word;
    
    // 检查单词状态
    const isMastered = AppState.masteredWords.has(word.word);
    const isDifficult = AppState.difficultWords.has(word.word);
    const isFuzzy = AppState.fuzzyWords.has(word.word);
    
    card.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <div class="card-word">${word.word}</div>
                <div class="card-actions">
                    <button class="card-btn know" data-action="know" title="认识">◉ 认识</button>
                    <button class="card-btn fuzzy" data-action="fuzzy" title="模糊">◐ 模糊</button>
                    <button class="card-btn unknown" data-action="unknown" title="不认识">○ 不认识</button>
                </div>
            </div>
            <div class="card-back">
                <div class="card-meaning">${word.translation || word.meaning || '暂无释义'}</div>
                <div class="card-actions">
                    <button class="card-btn" data-action="graph" title="查看图谱">🌐 图谱</button>
                </div>
            </div>
        </div>
    `;
    
    // 根据状态添加标记 - 美拉德配色
    if (isMastered) card.style.borderColor = '#8B6F47'; // 焦糖棕 - 已掌握
    if (isDifficult) card.style.borderColor = '#A87C5C'; // 焦糖色 - 困难
    if (isFuzzy) card.style.borderColor = '#D4A574'; // 烤面包色 - 模糊
    
    // 绑定事件
    bindCardEvents(card, word);
    
    return card;
}

function bindCardEvents(card, word) {
    const inner = card.querySelector('.card-inner');
    let startX, startY;
    let isSwiping = false;
    
    // 点击翻转
    card.addEventListener('click', (e) => {
        if (e.target.classList.contains('card-btn')) return;
        if (AppState.enlargedCard === card) return;
        card.classList.toggle('flipped');
    });
    
    // 双击放大
    card.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        toggleEnlargeCard(card);
    });
    
    // 触摸/鼠标滑动
    card.addEventListener('mousedown', handleSwipeStart);
    card.addEventListener('touchstart', handleSwipeStart);
    
    function handleSwipeStart(e) {
        if (e.target.classList.contains('card-btn')) return;
        
        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        isSwiping = true;
        
        document.addEventListener('mousemove', handleSwipeMove);
        document.addEventListener('touchmove', handleSwipeMove);
        document.addEventListener('mouseup', handleSwipeEnd);
        document.addEventListener('touchend', handleSwipeEnd);
    }
    
    function handleSwipeMove(e) {
        if (!isSwiping) return;
        
        const touch = e.touches ? e.touches[0] : e;
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        // 视觉反馈
        card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${deltaX * 0.1}deg)`;
    }
    
    function handleSwipeEnd(e) {
        if (!isSwiping) return;
        isSwiping = false;
        
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        document.removeEventListener('mousemove', handleSwipeMove);
        document.removeEventListener('touchmove', handleSwipeMove);
        document.removeEventListener('mouseup', handleSwipeEnd);
        document.removeEventListener('touchend', handleSwipeEnd);
        
        // 判断滑动方向
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
            if (deltaY < 0) {
                // 上滑：收藏
                handleCardAction(card, word, 'favorite');
            } else {
                // 下滑：跳过
                handleCardAction(card, word, 'skip');
            }
        } else if (Math.abs(deltaX) > 100) {
            // 左右滑动切换卡片
            const direction = deltaX > 0 ? -1 : 1;
            switchCard(direction);
        }
        
        // 重置位置
        card.style.transform = '';
    }
    
    // 按钮事件
    card.querySelectorAll('.card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            handleCardAction(card, word, action);
        });
    });
}

function toggleEnlargeCard(card) {
    if (AppState.enlargedCard === card) {
        card.classList.remove('enlarged');
        AppState.enlargedCard = null;
        document.body.style.overflow = '';
    } else {
        if (AppState.enlargedCard) {
            AppState.enlargedCard.classList.remove('enlarged');
        }
        card.classList.add('enlarged');
        AppState.enlargedCard = card;
        document.body.style.overflow = 'hidden';
    }
}

function handleCardAction(card, word, action) {
    const wordText = word.word;
    
    switch (action) {
        case 'know':
            AppState.masteredWords.add(wordText);
            AppState.difficultWords.delete(wordText);
            AppState.fuzzyWords.delete(wordText);
            card.style.borderColor = '#8B6F47'; // 焦糖棕
            showNotification(`✅ "${wordText}" 已标记为掌握`, 'success');
            // 记录到MySQL
            recordLearningActivity(word.id || wordText, 'card', true);
            break;
            
        case 'unknown':
            AppState.difficultWords.add(wordText);
            AppState.masteredWords.delete(wordText);
            AppState.fuzzyWords.delete(wordText);
            card.style.borderColor = '#A87C5C'; // 焦糖色
            showNotification(`❌ "${wordText}" 已标记为难题`, 'error');
            // 记录到MySQL
            recordLearningActivity(word.id || wordText, 'card', false);
            break;
            
        case 'fuzzy':
            AppState.fuzzyWords.add(wordText);
            AppState.masteredWords.delete(wordText);
            AppState.difficultWords.delete(wordText);
            card.style.borderColor = '#D4A574'; // 烤面包色
            showNotification(`❓ "${wordText}" 已标记为模糊`, 'info');
            // 记录到MySQL
            recordLearningActivity(word.id || wordText, 'card', false);
            break;
            
        case 'favorite':
            // 收藏功能（可扩展）
            showNotification(`⭐ "${wordText}" 已收藏`, 'success');
            break;
            
        case 'skip':
            // 跳过功能
            showNotification(`⏭️ 已跳过 "${wordText}"`, 'info');
            break;
            
        case 'graph':
            // 显示词汇图谱
            switchMode('graph');
            showWordGraph(word);
            break;
    }
    
    AppState.todayReviewed++;
    saveProgress();
    updateProgressDisplay();
}

function switchCard(direction) {
    // 切换到下一张/上一张卡片（可扩展为焦点切换动画）
    console.log('切换卡片:', direction);
}

// ==================== 听写模式 ====================
function initDictationMode() {
    console.log('=== 初始化听写模式 ===');
    
    const keyboardBtn = document.getElementById('keyboard-mode');
    const nextBtn = document.getElementById('next-dictation');
    const playBtn = document.getElementById('play-word-btn');
    const autoLangBtn = document.getElementById('auto-lang-detect');
    const langSelect = document.getElementById('dictation-lang-select');
    const voiceSelect = document.getElementById('dictation-voice-select');
    
    console.log('按钮元素:', {
        keyboardBtn: !!keyboardBtn,
        nextBtn: !!nextBtn,
        playBtn: !!playBtn,
        autoLangBtn: !!autoLangBtn,
        langSelect: !!langSelect,
        voiceSelect: !!voiceSelect
    });
    
    // 加载可用语音
    loadAvailableVoices();
    
    // 下一个单词
    nextBtn?.addEventListener('click', () => {
        console.log('=== 下一个按钮被点击 ===');
        startDictation();
    });
    
    // 朗读单词
    playBtn?.addEventListener('click', () => {
        console.log('=== 朗读按钮被点击 ===');
        playCurrentWord();
    });
    
    // 自动识别语言
    autoLangBtn?.addEventListener('click', () => {
        console.log('=== 自动识别按钮被点击 ===');
        autoDetectLanguage();
    });
    
    // 语言选择变化
    langSelect?.addEventListener('change', (e) => {
        AppState.dictationLanguage = e.target.value;
        updateVoiceOptions();
        startDictation(); // 重新选择该语言的单词
    });
    
    // 口音选择变化
    voiceSelect?.addEventListener('change', (e) => {
        AppState.dictationVoiceIndex = parseInt(e.target.value);
    });
    
    // 键盘输入监听
    const input = document.getElementById('dictation-input');
    if (input) {
        input.addEventListener('input', checkDictationAnswer);
    }
}

// 加载可用语音
function loadAvailableVoices() {
    if (!('speechSynthesis' in window)) return;
    
    const loadVoices = () => {
        AppState.availableVoices = speechSynthesis.getVoices();
        console.log('加载了', AppState.availableVoices.length, '个语音');
        updateVoiceOptions();
    };
    
    loadVoices();
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
}

// 更新口音选项
function updateVoiceOptions() {
    const voiceSelect = document.getElementById('dictation-voice-select');
    if (!voiceSelect) return;
    
    const lang = AppState.dictationLanguage;
    
    // 检查 LANGUAGES 是否已加载
    if (typeof LANGUAGES === 'undefined') {
        console.warn('LANGUAGES not loaded yet');
        voiceSelect.innerHTML = '<option value="0">加载中...</option>';
        return;
    }
    
    const langConfig = LANGUAGES[lang];
    if (!langConfig) {
        voiceSelect.innerHTML = '<option value="0">系统默认</option>';
        return;
    }
    
    // 获取该语言的所有可用语音
    const voiceLangPrefix = langConfig.voice.split('-')[0];
    const availableVoices = AppState.availableVoices.filter(v => 
        v.lang.startsWith(voiceLangPrefix) || v.lang.startsWith(lang)
    );
    
    voiceSelect.innerHTML = '';
    
    if (availableVoices.length === 0) {
        voiceSelect.innerHTML = '<option value="0">系统默认</option>';
        return;
    }
    
    availableVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = voice.name + (voice.localService ? ' (本地)' : ' (在线)');
        voiceSelect.appendChild(option);
    });
    
    // 恢复之前选择的口音
    if (AppState.dictationVoiceIndex < availableVoices.length) {
        voiceSelect.value = AppState.dictationVoiceIndex;
    }
}

// 自动识别当前单词的语言
function autoDetectLanguage() {
    if (!AppState.currentDictationWord) {
        showNotification('请先开始听写', 'info');
        return;
    }
    
    const word = AppState.currentDictationWord.word;
    const detectedLang = detectWordLanguage(word);
    
    AppState.dictationLanguage = detectedLang;
    
    const langSelect = document.getElementById('dictation-lang-select');
    if (langSelect) {
        langSelect.value = detectedLang;
    }
    
    updateVoiceOptions();
    
    const langName = LANGUAGES[detectedLang]?.name || detectedLang;
    showNotification(`🔍 识别为：${langName}`, 'success');
}

// 检测单词语言
function detectWordLanguage(text) {
    if (!text) return 'en';
    
    // 中文
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
    // 日文
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    // 韩文
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    // 俄文
    if (/[\u0400-\u04ff]/.test(text)) return 'ru';
    // 阿拉伯文
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    // 泰文
    if (/[\u0e00-\u0e7f]/.test(text)) return 'th';
    // 印地文
    if (/[\u0900-\u097f]/.test(text)) return 'hi';
    
    // 默认英语
    return 'en';
}



function startDictation() {
    console.log('=== startDictation 开始 ===');
    console.log('filteredWords 数量:', AppState.filteredWords.length);
    
    if (AppState.filteredWords.length === 0) {
        showNotification('没有可听写的单词，请先添加单词！', 'error');
        return;
    }
    
    // 简化逻辑：直接随机选择一个单词
    const randomIndex = Math.floor(Math.random() * AppState.filteredWords.length);
    AppState.currentDictationWord = AppState.filteredWords[randomIndex];
    
    console.log('选中的单词:', AppState.currentDictationWord);
    
    if (!AppState.currentDictationWord || !AppState.currentDictationWord.word) {
        showNotification('❌ 单词数据异常', 'error');
        console.error('异常的单词对象:', AppState.currentDictationWord);
        return;
    }
    
    // 自动检测语言
    const word = AppState.currentDictationWord.word;
    const detectedLang = detectWordLanguage(word);
    
    console.log('检测到的语言:', detectedLang);
    
    AppState.dictationLanguage = detectedLang;
    
    // 更新语言选择器
    const langSelect = document.getElementById('dictation-lang-select');
    if (langSelect) {
        langSelect.value = detectedLang;
    }
    
    // 更新口音选项
    updateVoiceOptions();
    
    // 显示释义
    const meaningElem = document.getElementById('dictation-meaning');
    if (meaningElem) {
        const langConfig = typeof LANGUAGES !== 'undefined' ? LANGUAGES[detectedLang] : null;
        const langName = langConfig?.name || '未知';
        const langFlag = langConfig?.flag || '🌍';
        
        // 获取释义
        const meaning = AppState.currentDictationWord.translation || 
                       AppState.currentDictationWord.meaning || 
                       AppState.currentDictationWord.chinese ||
                       '暂无释义';
        
        meaningElem.innerHTML = `
            <div style="font-size: 14px; color: #666; margin-bottom: 10px;">
                语言: ${langFlag} ${langName}
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #333;">
                ${meaning}
            </div>
        `;
        
        console.log('显示释义:', meaning);
    }
    
    // 清空输入
    const input = document.getElementById('dictation-input');
    if (input) {
        input.value = '';
        input.className = 'dictation-input';
        input.focus(); // 自动聚焦输入框
    }
    
    clearHandwriting();
    
    console.log('=== startDictation 完成 ===');
}

// 朗读当前单词
function playCurrentWord() {
    if (!AppState.currentDictationWord) {
        showNotification('请先开始听写', 'info');
        return;
    }
    
    const word = AppState.currentDictationWord.word;
    const lang = AppState.dictationLanguage;
    
    // 检查 LANGUAGES 是否已加载
    if (typeof LANGUAGES === 'undefined') {
        showNotification('❌ 语言配置未加载', 'error');
        return;
    }
    
    const langConfig = LANGUAGES[lang];
    
    if (!langConfig) {
        showNotification('语言配置错误', 'error');
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = langConfig.voice;
    utterance.rate = 0.9; // 稍慢一点，方便听写
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // 使用选择的口音
    const voiceLangPrefix = langConfig.voice.split('-')[0];
    const availableVoices = AppState.availableVoices.filter(v => 
        v.lang.startsWith(voiceLangPrefix) || v.lang.startsWith(lang)
    );
    
    if (availableVoices.length > 0 && AppState.dictationVoiceIndex < availableVoices.length) {
        utterance.voice = availableVoices[AppState.dictationVoiceIndex];
    }
    
    speechSynthesis.cancel(); // 停止之前的朗读
    speechSynthesis.speak(utterance);
    
    showNotification(`🔊 正在朗读...`, 'info');
}

function checkDictationAnswer() {
    const input = document.getElementById('dictation-input');
    if (!input || !AppState.currentDictationWord) return;
    
    const userInput = input.value.trim().toLowerCase();
    const correctAnswer = AppState.currentDictationWord.word.toLowerCase();
    
    // 容错：忽略大小写、空格
    if (userInput === correctAnswer) {
        input.className = 'dictation-input correct';
        showNotification('✅ 正确！', 'success');
        AppState.masteredWords.add(AppState.currentDictationWord.word);
        AppState.todayReviewed++;
        saveProgress();
        updateProgressDisplay();
        
        // 记录听写成功到MySQL
        recordLearningActivity(
            AppState.currentDictationWord.id || AppState.currentDictationWord.word, 
            'dictation', 
            true
        );
        
        setTimeout(() => startDictation(), 1500);
    } else if (correctAnswer.startsWith(userInput) && userInput.length > 0) {
        // 输入中...
        input.className = 'dictation-input';
    } else if (userInput.length > 0) {
        // 错误
        input.className = 'dictation-input wrong';
        
        // 轻微拼写错误容错
        if (levenshteinDistance(userInput, correctAnswer) <= 2) {
            showNotification('⚠️ 拼写有误，但很接近了！', 'info');
        }
    }
}

// 编辑距离算法（容错）
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];
    
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[len1][len2];
}



// ==================== 游戏模式 ====================
function initGameMode() {
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            const gameType = card.dataset.game;
            startGame(gameType);
        });
    });
}

function startGame(gameType) {
    AppState.currentGame = gameType;
    AppState.gameScore = 0;
    AppState.gameLevel = 1;
    AppState.selectedTiles = [];
    
    const container = document.getElementById('game-container');
    if (!container) return;
    
    container.innerHTML = `<h3 style="text-align: center; margin-bottom: 15px;">关卡 ${AppState.gameLevel} | 得分: <span id="game-score">0</span></h3>`;
    
    switch (gameType) {
        case 'match':
            initMatchGame();
            break;
        case 'similar':
            initSimilarGame();
            break;
        case 'falling':
            initFallingGame();
            break;
    }
}

// 中英配对消除
function initMatchGame() {
    const container = document.getElementById('game-container');
    const board = document.createElement('div');
    board.className = 'game-board match-game';
    
    // 选择本关卡的单词（数量随关卡增加）
    const wordCount = Math.min(4 + AppState.gameLevel, 8);
    const words = AppState.filteredWords.slice(0, wordCount);
    
    if (words.length === 0) {
        container.innerHTML += '<p style="text-align: center;">没有可用的单词</p>';
        return;
    }
    
    // 生成配对题目
    const tiles = [];
    words.forEach(word => {
        tiles.push({ type: 'word', content: word.word, id: word.word });
        tiles.push({ type: 'meaning', content: word.translation || word.meaning || '?', id: word.word });
    });
    
    // 打乱顺序
    shuffle(tiles);
    
    tiles.forEach((tile, index) => {
        const tileElem = document.createElement('div');
        tileElem.className = 'game-tile';
        tileElem.textContent = tile.content;
        tileElem.dataset.id = tile.id;
        tileElem.dataset.type = tile.type;
        tileElem.dataset.index = index;
        
        tileElem.addEventListener('click', () => handleMatchTileClick(tileElem, tile));
        
        board.appendChild(tileElem);
    });
    
    container.appendChild(board);
}

function handleMatchTileClick(tileElem, tile) {
    if (tileElem.classList.contains('matched')) return;
    
    if (AppState.selectedTiles.length === 0) {
        // 选中第一个
        tileElem.classList.add('selected');
        AppState.selectedTiles.push({ elem: tileElem, tile });
    } else if (AppState.selectedTiles.length === 1) {
        const first = AppState.selectedTiles[0];
        
        // 检查是否匹配
        if (first.tile.id === tile.id && first.tile.type !== tile.type) {
            // 匹配成功 - 触发粒子爆炸效果
            createParticleExplosion(first.elem);
            createParticleExplosion(tileElem);
            playSuccessSound();
            
            first.elem.classList.add('matched');
            tileElem.classList.add('matched');
            AppState.gameScore += 10;
            updateGameScore();
            
            // 显示鼓励文字
            showEncouragement();
            
            // 检查是否全部完成
            setTimeout(() => {
                const allMatched = document.querySelectorAll('.game-tile.matched').length === 
                                  document.querySelectorAll('.game-tile').length;
                if (allMatched) {
                    nextGameLevel();
                }
            }, 500);
        } else {
            // 配对失败
            first.elem.classList.add('wrong');
            tileElem.classList.add('wrong');
            playErrorSound();
            
            setTimeout(() => {
                first.elem.classList.remove('wrong');
                tileElem.classList.remove('wrong');
            }, 500);
        }
        
        first.elem.classList.remove('selected');
        AppState.selectedTiles = [];
    }
}

function updateGameScore() {
    const scoreElem = document.getElementById('game-score');
    if (scoreElem) {
        scoreElem.textContent = AppState.gameScore;
    }
}

function nextGameLevel() {
    AppState.gameLevel++;
    
    // 通关庆祝效果
    createLevelCompleteEffect();
    playLevelCompleteSound();
    showBigMessage('🎉 太棒了！通关！');
    
    setTimeout(() => {
        startGame(AppState.currentGame);
    }, 2000);
}

// ==================== 粒子爆炸效果 ====================
function createParticleExplosion(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // 生成彩色粒子
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // 随机方向和距离
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 50 + Math.random() * 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        
        document.body.appendChild(particle);
        
        // 动画结束后移除
        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}

// 通关时的满屏粒子效果
function createLevelCompleteEffect() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F39C12', '#E74C3C'];
    const particleCount = 100;
    
    for (let i = 0; i < particleCount; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // 随机起始位置
            const startX = Math.random() * window.innerWidth;
            const startY = Math.random() * window.innerHeight;
            
            particle.style.left = startX + 'px';
            particle.style.top = startY + 'px';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.width = (15 + Math.random() * 20) + 'px';
            particle.style.height = particle.style.width;
            
            // 随机方向
            const angle = Math.random() * Math.PI * 2;
            const velocity = 100 + Math.random() * 150;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;
            
            particle.style.setProperty('--tx', tx + 'px');
            particle.style.setProperty('--ty', ty + 'px');
            
            document.body.appendChild(particle);
            
            setTimeout(() => {
                particle.remove();
            }, 1000);
        }, i * 10);
    }
}

// ==================== 音效系统 ====================
function playSuccessSound() {
    // 使用Xiaoxiao语音朗读鼓励词
    const encouragements = ['真棒', '很好', '完美', '厉害', '加油'];
    const text = encouragements[Math.floor(Math.random() * encouragements.length)];
    speakWithXiaoxiao(text, 1.2, 1.3); // 快速、高音调
}

function playErrorSound() {
    // 错误时使用简短的中文提示
    speakWithXiaoxiao('再试试', 0.9, 0.8);
}

function playLevelCompleteSound() {
    // 通关时朗读"太棒了"
    speakWithXiaoxiao('太棒了！通关啦！', 1.0, 1.2);
}

function speakWithXiaoxiao(text, rate = 1.0, pitch = 1.0) {
    if (!('speechSynthesis' in window)) {
        console.warn('浏览器不支持语音合成');
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 0.9;
    
    // 尝试使用Xiaoxiao语音
    const voices = speechSynthesis.getVoices();
    const xiaoxiao = voices.find(v => 
        v.name.toLowerCase().includes('xiaoxiao') || 
        v.name.includes('晓晓') ||
        v.name.toLowerCase().includes('huihui') ||
        v.name.includes('慧慧')
    );
    
    if (xiaoxiao) {
        utterance.voice = xiaoxiao;
        console.log('使用语音:', xiaoxiao.name);
    } else {
        // 如果没有Xiaoxiao，使用任何中文女声
        const chineseFemale = voices.find(v => 
            v.lang.startsWith('zh') && v.name.toLowerCase().includes('female')
        );
        if (chineseFemale) {
            utterance.voice = chineseFemale;
        } else {
            // 使用任何中文语音
            const chinese = voices.find(v => v.lang.startsWith('zh'));
            if (chinese) utterance.voice = chinese;
        }
    }
    
    speechSynthesis.speak(utterance);
}

function speakEncouragement(text) {
    speakWithXiaoxiao(text, 1.0, 1.2);
}

// ==================== 鼓励文字显示 ====================
const encouragements = [
    '太棒了', '完美', '真厉害', '继续加油', 
    '干得好', '你真聪明', '棒极了', '很好', '真棒', '加油'
];

function showEncouragement() {
    const message = encouragements[Math.floor(Math.random() * encouragements.length)];
    showNotification(`✨ ${message}！`, 'success');
}

function showBigMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = text;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'success-pop 0.6s ease-out reverse';
        setTimeout(() => {
            messageDiv.remove();
        }, 600);
    }, 1500);
}

// 形近词归类消除
function initSimilarGame() {
    const container = document.getElementById('game-container');
    const board = document.createElement('div');
    board.className = 'game-board match-game';
    board.style.gridTemplateColumns = 'repeat(3, 1fr)';
    
    // 选择形近词组（同一标签）
    const similarGroups = [
        { tag: 'affect类', words: ['affect', 'effect', 'effort'] },
        { tag: 'accept类', words: ['accept', 'except', 'expect'] },
        { tag: 'desert类', words: ['desert', 'dessert', 'deserted'] }
    ];
    
    // 根据关卡选择词组数量
    const groupCount = Math.min(1 + Math.floor(AppState.gameLevel / 2), similarGroups.length);
    const selectedGroups = similarGroups.slice(0, groupCount);
    
    const tiles = [];
    selectedGroups.forEach((group, groupIndex) => {
        group.words.forEach(word => {
            // 尝试从词库中找到该单词
            const wordObj = AppState.filteredWords.find(w => w.word.toLowerCase() === word.toLowerCase());
            const meaning = wordObj ? (wordObj.translation || wordObj.meaning || '相似词') : `${group.tag}`;
            
            tiles.push({ 
                type: 'word', 
                content: word, 
                groupId: groupIndex,
                tag: group.tag
            });
        });
    });
    
    shuffle(tiles);
    
    tiles.forEach((tile, index) => {
        const tileElem = document.createElement('div');
        tileElem.className = 'game-tile';
        tileElem.innerHTML = `
            <div style="font-size: 18px; font-weight: bold;">${tile.content}</div>
            <div style="font-size: 11px; color: #999; margin-top: 5px;">标签: ${tile.tag}</div>
        `;
        tileElem.dataset.groupId = tile.groupId;
        tileElem.dataset.tag = tile.tag;
        tileElem.dataset.index = index;
        
        tileElem.addEventListener('click', () => handleSimilarTileClick(tileElem, tile));
        
        board.appendChild(tileElem);
    });
    
    // 添加批量消除按钮
    const batchBtn = document.createElement('button');
    batchBtn.className = 'nav-btn';
    batchBtn.textContent = '🎯 批量消除选中';
    batchBtn.style.marginTop = '20px';
    batchBtn.addEventListener('click', batchRemoveSimilar);
    
    container.appendChild(board);
    container.appendChild(batchBtn);
}

function handleSimilarTileClick(tileElem, tile) {
    if (tileElem.classList.contains('matched')) return;
    
    // 切换选中状态
    tileElem.classList.toggle('selected');
    
    // 单次配对消除：选中两个同标签的词
    const selectedTiles = document.querySelectorAll('.game-tile.selected:not(.matched)');
    
    if (selectedTiles.length === 2) {
        const first = selectedTiles[0];
        const second = selectedTiles[1];
        
        if (first.dataset.groupId === second.dataset.groupId) {
            // 配对成功
            createParticleExplosion(first);
            createParticleExplosion(second);
            playSuccessSound();
            
            first.classList.add('matched');
            second.classList.add('matched');
            first.classList.remove('selected');
            second.classList.remove('selected');
            
            AppState.gameScore += 20; // 形近词配对分数更高
            updateGameScore();
            showEncouragement();
            
            // 检查是否全部完成
            setTimeout(() => {
                const allMatched = document.querySelectorAll('.game-tile.matched').length === 
                                  document.querySelectorAll('.game-tile').length;
                if (allMatched) {
                    nextGameLevel();
                }
            }, 500);
        } else {
            // 不是同组，取消选择
            first.classList.remove('selected');
            second.classList.remove('selected');
            playErrorSound();
        }
    }
}

function batchRemoveSimilar() {
    const selectedTiles = Array.from(document.querySelectorAll('.game-tile.selected:not(.matched)'));
    
    if (selectedTiles.length === 0) {
        showNotification('请先选择要消除的单词', 'info');
        return;
    }
    
    // 检查是否同一标签
    const firstTag = selectedTiles[0].dataset.tag;
    const allSameTag = selectedTiles.every(tile => tile.dataset.tag === firstTag);
    
    if (allSameTag && selectedTiles.length >= 2) {
        // 批量消除成功
        selectedTiles.forEach(tile => {
            createParticleExplosion(tile);
            tile.classList.add('matched');
            tile.classList.remove('selected');
        });
        
        playLevelCompleteSound();
        AppState.gameScore += selectedTiles.length * 15;
        updateGameScore();
        showBigMessage(`🎊 批量消除 ${selectedTiles.length} 个！`);
        
        // 检查是否全部完成
        setTimeout(() => {
            const allMatched = document.querySelectorAll('.game-tile.matched').length === 
                              document.querySelectorAll('.game-tile').length;
            if (allMatched) {
                nextGameLevel();
            }
        }, 1000);
    } else {
        showNotification('❌ 所选单词标签不一致！', 'error');
        playErrorSound();
        selectedTiles.forEach(tile => tile.classList.remove('selected'));
    }
}

// 掉落式消除
let fallingGameState = {
    running: false,
    fallingWords: [],
    speed: 2,
    spawnInterval: null,
    animationFrame: null
};

function initFallingGame() {
    const container = document.getElementById('game-container');
    
    if (AppState.filteredWords.length === 0) {
        container.innerHTML += '<p style="text-align: center;">没有可用的单词</p>';
        return;
    }
    
    // 创建游戏区域 - 美拉德配色
    container.innerHTML = `
        <div style="position: relative; width: 100%; height: 500px; border: 3px solid #8B6F47; border-radius: 12px; overflow: hidden; background: linear-gradient(180deg, #f5ebe0 0%, #e3d5ca 100%);">
            <div id="falling-game-area" style="position: relative; width: 100%; height: 100%;"></div>
        </div>
        <div style="margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;" id="falling-options"></div>
        <div style="margin-top: 15px; text-align: center;">
            <span style="font-size: 18px; font-weight: bold;">⏱️ 剩余时间: <span id="falling-timer">60</span>秒</span>
        </div>
    `;
    
    // 初始化掉落游戏
    startFallingGame();
}

function startFallingGame() {
    fallingGameState.running = true;
    fallingGameState.speed = 1 + AppState.gameLevel * 0.3;
    fallingGameState.fallingWords = [];
    
    const gameArea = document.getElementById('falling-game-area');
    const optionsArea = document.getElementById('falling-options');
    
    // 准备单词池（本关卡使用的单词）
    const wordPool = AppState.filteredWords.slice(0, Math.min(8, AppState.filteredWords.length));
    
    // 创建选项按钮（包含干扰项）
    const options = [...wordPool];
    // 添加2个干扰项
    const distractors = AppState.filteredWords.filter(w => !wordPool.includes(w)).slice(0, 2);
    options.push(...distractors);
    shuffle(options);
    
    optionsArea.innerHTML = '';
    options.forEach(word => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.textContent = word.translation || word.meaning || '?';
        btn.style.fontSize = '14px';
        btn.style.padding = '8px 16px';
        btn.dataset.word = word.word;
        
        btn.addEventListener('click', () => checkFallingAnswer(word.word));
        
        optionsArea.appendChild(btn);
    });
    
    // 倒计时
    let timeLeft = 60;
    const timerElem = document.getElementById('falling-timer');
    const timerInterval = setInterval(() => {
        timeLeft--;
        if (timerElem) timerElem.textContent = timeLeft;
        
        if (timeLeft <= 0 || !fallingGameState.running) {
            clearInterval(timerInterval);
            endFallingGame();
        }
    }, 1000);
    
    // 生成掉落单词
    fallingGameState.spawnInterval = setInterval(() => {
        if (fallingGameState.running) {
            spawnFallingWord(wordPool);
        }
    }, 2000 / fallingGameState.speed);
    
    // 动画循环
    animateFallingWords();
}

function spawnFallingWord(wordPool) {
    const gameArea = document.getElementById('falling-game-area');
    if (!gameArea) return;
    
    const word = wordPool[Math.floor(Math.random() * wordPool.length)];
    
    const wordElem = document.createElement('div');
    wordElem.className = 'falling-word';
    wordElem.textContent = word.word;
    wordElem.style.position = 'absolute';
    wordElem.style.left = (Math.random() * 80 + 10) + '%';
    wordElem.style.top = '-50px';
    wordElem.style.background = 'linear-gradient(135deg, #8B6F47, #A87C5C)'; // 美拉德渐变
    wordElem.style.color = 'white';
    wordElem.style.padding = '10px 20px';
    wordElem.style.borderRadius = '8px';
    wordElem.style.fontWeight = 'bold';
    wordElem.style.fontSize = '18px';
    wordElem.style.cursor = 'pointer';
    wordElem.style.transition = 'transform 0.2s';
    wordElem.dataset.word = word.word;
    wordElem.dataset.posY = '-50';
    
    wordElem.addEventListener('click', () => {
        // 点击也可以触发匹配（快捷方式）
        checkFallingAnswer(word.word, wordElem);
    });
    
    gameArea.appendChild(wordElem);
    fallingGameState.fallingWords.push(wordElem);
}

function animateFallingWords() {
    if (!fallingGameState.running) return;
    
    fallingGameState.fallingWords.forEach((wordElem, index) => {
        if (!wordElem.parentNode) {
            fallingGameState.fallingWords.splice(index, 1);
            return;
        }
        
        let posY = parseFloat(wordElem.dataset.posY);
        posY += fallingGameState.speed;
        wordElem.dataset.posY = posY;
        wordElem.style.top = posY + 'px';
        
        // 掉出屏幕
        if (posY > 520) {
            wordElem.remove();
            fallingGameState.fallingWords.splice(index, 1);
            // 扣分
            AppState.gameScore = Math.max(0, AppState.gameScore - 5);
            updateGameScore();
        }
    });
    
    fallingGameState.animationFrame = requestAnimationFrame(animateFallingWords);
}

function checkFallingAnswer(selectedWord, wordElem = null) {
    // 如果没有传入wordElem，从掉落的单词中查找
    if (!wordElem) {
        wordElem = fallingGameState.fallingWords.find(elem => elem.dataset.word === selectedWord);
    }
    
    if (wordElem && wordElem.parentNode) {
        // 配对成功
        createParticleExplosion(wordElem);
        playSuccessSound();
        wordElem.remove();
        
        const index = fallingGameState.fallingWords.indexOf(wordElem);
        if (index > -1) {
            fallingGameState.fallingWords.splice(index, 1);
        }
        
        AppState.gameScore += 15;
        updateGameScore();
        showEncouragement();
    }
}

function endFallingGame() {
    fallingGameState.running = false;
    
    if (fallingGameState.spawnInterval) {
        clearInterval(fallingGameState.spawnInterval);
    }
    
    if (fallingGameState.animationFrame) {
        cancelAnimationFrame(fallingGameState.animationFrame);
    }
    
    // 清理所有掉落单词
    fallingGameState.fallingWords.forEach(elem => elem.remove());
    fallingGameState.fallingWords = [];
    
    // 显示结果
    showBigMessage(`🎮 游戏结束！得分: ${AppState.gameScore}`);
    playLevelCompleteSound();
    
    setTimeout(() => {
        nextGameLevel();
    }, 2500);
}

// 工具函数：数组打乱
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==================== 词汇图谱模式 ====================
function initGraphMode() {
    const searchBtn = document.getElementById('show-graph-btn');
    const randomBtn = document.getElementById('random-graph-btn');
    const aiGenerateBtn = document.getElementById('ai-generate-graph-btn');
    const backBtn = document.getElementById('back-to-card-btn');
    const searchInput = document.getElementById('graph-search');
    
    // 返回卡片模式
    backBtn?.addEventListener('click', () => {
        switchMode('card');
    });
    
    // 显示指定单词的图谱
    searchBtn?.addEventListener('click', () => {
        const word = searchInput.value.trim();
        if (word) {
            const wordObj = AppState.filteredWords.find(w => w.word.toLowerCase() === word.toLowerCase());
            if (wordObj) {
                showWordGraph(wordObj);
            } else {
                showNotification('未找到该单词：' + word, 'error');
            }
        } else {
            showNotification('请输入单词', 'info');
        }
    });
    
    // 随机选择一个单词显示图谱
    randomBtn?.addEventListener('click', () => {
        if (AppState.filteredWords.length === 0) {
            showNotification('没有可用的单词', 'error');
            return;
        }
        const randomIndex = Math.floor(Math.random() * AppState.filteredWords.length);
        const randomWord = AppState.filteredWords[randomIndex];
        searchInput.value = randomWord.word;
        showWordGraph(randomWord);
    });
    
    // AI生成关联信息
    aiGenerateBtn?.addEventListener('click', () => {
        aiGenerateWordRelations();
    });
    
    // 回车键搜索
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn?.click();
        }
    });
}

function showWordGraph(word) {
    const graph = document.getElementById('word-graph');
    const center = document.getElementById('graph-center');
    
    if (!graph || !center) return;
    
    // 清空旧节点和SVG
    graph.querySelectorAll('.graph-node').forEach(node => node.remove());
    const oldSvg = graph.querySelector('.graph-svg');
    if (oldSvg) oldSvg.remove();
    
    // 创建SVG容器用于绘制连接线
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('graph-svg');
    graph.insertBefore(svg, graph.firstChild);
    
    // 设置中心词
    center.textContent = word.word;
    
    // 中心节点也可以拖拽
    makeCenterDraggable(center, graph);
    
    AppState.currentGraphWord = word;
    
    // 获取关联数据
    const relations = AppState.wordRelations[word.word] || {};
    
    // 优先使用单词对象中的数据，然后才是relations中的数据
    const meaning = word.translation || word.meaning || word.chinese || '暂无释义';
    const root = word.root || relations.roots || '暂无数据';
    const similar = word.similar || relations.similar || '暂无数据';
    const antonym = word.antonym || relations.antonym || '暂无';
    const example = word.example || relations.example || '暂无例句';
    const phonetic = word.phonetic || '暂无音标';
    
    // 创建关联节点 - 使用黑白灰配色
    const nodes = [
        { 
            title: '📝 释义', 
            content: meaning,
            fullContent: meaning,
            position: { top: '10%', left: '50%' },
            color: '#666'
        },
        { 
            title: '🔤 词根词缀', 
            content: root,
            fullContent: root,
            position: { top: '30%', left: '15%' },
            color: '#888'
        },
        { 
            title: '🔗 相似词', 
            content: similar,
            fullContent: similar,
            position: { top: '30%', left: '85%' },
            color: '#999'
        },
        { 
            title: '↔️ 反义词', 
            content: antonym,
            fullContent: antonym,
            position: { top: '70%', left: '15%' },
            color: '#555'
        },
        { 
            title: '📚 例句', 
            content: example,
            fullContent: example,
            position: { top: '70%', left: '85%' },
            color: '#777'
        },
        { 
            title: '🔊 音标', 
            content: phonetic,
            fullContent: phonetic,
            position: { top: '90%', left: '50%' },
            color: '#444'
        }
    ];
    
    const centerX = graph.offsetWidth / 2;
    const centerY = graph.offsetHeight / 2;
    const lines = [];
    
    nodes.forEach((nodeData, index) => {
        const node = document.createElement('div');
        node.className = 'graph-node';
        node.style.top = nodeData.position.top;
        node.style.left = nodeData.position.left;
        node.style.borderColor = nodeData.color;
        node.dataset.index = index;
        
        const displayContent = nodeData.content.length > 60 ? 
            nodeData.content.substring(0, 60) + '...' : nodeData.content;
        
        node.innerHTML = `
            <button class="node-speaker" title="朗读内容">🔊</button>
            <h4 style="color: ${nodeData.color}; margin: 0 0 8px 0; font-size: 14px;">${nodeData.title}</h4>
            <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.5;">${displayContent}</p>
        `;
        
        // 朗读按钮事件
        const speakerBtn = node.querySelector('.node-speaker');
        speakerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speakNodeContent(nodeData.fullContent);
        });
        
        graph.appendChild(node);
        
        // 创建连接线
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.classList.add('graph-line');
        line.setAttribute('stroke', nodeData.color);
        svg.appendChild(line);
        lines.push({ line, node, color: nodeData.color });
        
        // 添加拖拽功能（不带回弹）
        makeNodeDraggable(node, graph, lines, centerX, centerY);
        
        // 延迟显示动画
        setTimeout(() => {
            node.classList.add('show');
            updateLine(node, line, centerX, centerY);
        }, index * 100);
    });
    
    AppState.graphExpanded = true;
    AppState.graphLines = lines;
}

// 多语言朗读功能（参考阅读页面）
function speakNodeContent(text) {
    if (!text || text === '暂无数据' || text === '暂无' || text === '暂无例句' || text === '暂无音标' || text === '暂无释义') {
        return;
    }
    
    // 停止当前朗读
    window.speechSynthesis.cancel();
    
    // 检测语言
    const detectedLang = detectContentLanguage(text);
    
    // 获取可用声音
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    
    // 根据语言选择合适的声音
    const voiceMap = {
        'zh-CN': ['Microsoft Xiaoxiao', 'Ting-Ting', 'zh-CN', 'zh_CN', 'Chinese'],
        'en-US': ['Microsoft Zira', 'Samantha', 'en-US', 'en_US', 'English'],
        'ja-JP': ['Microsoft Ayumi', 'Kyoko', 'ja-JP', 'ja_JP', 'Japanese'],
        'ko-KR': ['Microsoft Heami', 'Yuna', 'ko-KR', 'ko_KR', 'Korean'],
        'fr-FR': ['Microsoft Hortense', 'Amelie', 'fr-FR', 'fr_FR', 'French'],
        'de-DE': ['Microsoft Hedda', 'Anna', 'de-DE', 'de_DE', 'German'],
        'es-ES': ['Microsoft Helena', 'Monica', 'es-ES', 'es_ES', 'Spanish'],
        'ru-RU': ['Microsoft Irina', 'Milena', 'ru-RU', 'ru_RU', 'Russian'],
        'ar-SA': ['Microsoft Hoda', 'ar-SA', 'ar_SA', 'Arabic'],
        'th-TH': ['Microsoft Achara', 'th-TH', 'th_TH', 'Thai']
    };
    
    const preferredVoices = voiceMap[detectedLang] || voiceMap['en-US'];
    
    for (const preferred of preferredVoices) {
        selectedVoice = voices.find(v => 
            v.name.includes(preferred) || 
            v.lang.includes(preferred.replace('_', '-'))
        );
        if (selectedVoice) break;
    }
    
    // 如果没找到特定声音，使用语言代码匹配
    if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith(detectedLang.substring(0, 2)));
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = detectedLang;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    
    utterance.onend = () => {
        console.log('朗读完成');
    };
    
    utterance.onerror = (e) => {
        console.error('朗读失败:', e);
    };
    
    window.speechSynthesis.speak(utterance);
}

// 检测文本语言（参考阅读页面的逻辑）
function detectContentLanguage(text) {
    if (!text || !text.trim()) return 'en-US';
    
    const hasEnglish = /[a-zA-Z]{2,}/.test(text);
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    const hasRussian = /[\u0400-\u04FF]/.test(text);
    const hasJapanese = /[\u3040-\u30ff\u31f0-\u31ff]/.test(text);
    const hasKorean = /[\uac00-\ud7af]/.test(text);
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    const hasFrench = /[àâäçèéêëîïôùûüÿœæ]/i.test(text);
    const hasGerman = /[äöüß]/i.test(text);
    const hasSpanish = /[áéíóúñü¿¡]/i.test(text);
    
    // 纯语言优先
    if (hasChinese && !hasEnglish && !hasJapanese && !hasKorean) return 'zh-CN';
    if (hasEnglish && !hasChinese && !hasRussian && !hasJapanese && !hasKorean) return 'en-US';
    if (hasRussian && !hasEnglish && !hasChinese) return 'ru-RU';
    if (hasJapanese && !hasEnglish && !hasChinese && !hasKorean) return 'ja-JP';
    if (hasKorean && !hasEnglish && !hasChinese && !hasJapanese) return 'ko-KR';
    if (hasArabic) return 'ar-SA';
    if (hasFrench) return 'fr-FR';
    if (hasGerman) return 'de-DE';
    if (hasSpanish) return 'es-ES';
    
    // 混合语言时按优先级
    if (hasChinese) return 'zh-CN';
    if (hasEnglish) return 'en-US';
    if (hasRussian) return 'ru-RU';
    if (hasJapanese) return 'ja-JP';
    if (hasKorean) return 'ko-KR';
    
    return 'en-US';
}

// 更新连接线位置
function updateLine(node, line, centerX, centerY) {
    const rect = node.getBoundingClientRect();
    const graphRect = node.parentElement.getBoundingClientRect();
    
    const nodeX = rect.left - graphRect.left + rect.width / 2;
    const nodeY = rect.top - graphRect.top + rect.height / 2;
    
    line.setAttribute('x1', centerX);
    line.setAttribute('y1', centerY);
    line.setAttribute('x2', nodeX);
    line.setAttribute('y2', nodeY);
}

// 使节点可拖拽（固定位置，不回弹）
function makeNodeDraggable(node, container, allLines, centerX, centerY) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    
    node.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('node-speaker')) return;
        
        isDragging = true;
        node.classList.add('dragging');
        
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = node.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        initialLeft = rect.left - containerRect.left + rect.width / 2;
        initialTop = rect.top - containerRect.top + rect.height / 2;
        
        e.preventDefault();
    });
    
    const onMouseMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newLeft = initialLeft + deltaX;
        const newTop = initialTop + deltaY;
        
        // 限制在容器内
        const maxX = container.offsetWidth;
        const maxY = container.offsetHeight;
        const clampedLeft = Math.max(50, Math.min(maxX - 50, newLeft));
        const clampedTop = Math.max(30, Math.min(maxY - 30, newTop));
        
        node.style.left = clampedLeft + 'px';
        node.style.top = clampedTop + 'px';
        
        // 更新对应的连接线
        const nodeLine = allLines.find(l => l.node === node);
        if (nodeLine) {
            updateLine(node, nodeLine.line, centerX, centerY);
        }
    };
    
    const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        node.classList.remove('dragging');
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// 使中心节点可拖拽
function makeCenterDraggable(center, container) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    
    center.addEventListener('mousedown', (e) => {
        isDragging = true;
        center.classList.add('dragging');
        
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = center.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        initialLeft = rect.left - containerRect.left + rect.width / 2;
        initialTop = rect.top - containerRect.top + rect.height / 2;
        
        e.preventDefault();
    });
    
    const onMouseMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newLeft = initialLeft + deltaX;
        const newTop = initialTop + deltaY;
        
        // 限制在容器内
        const maxX = container.offsetWidth;
        const maxY = container.offsetHeight;
        const clampedLeft = Math.max(60, Math.min(maxX - 60, newLeft));
        const clampedTop = Math.max(60, Math.min(maxY - 60, newTop));
        
        center.style.left = clampedLeft + 'px';
        center.style.top = clampedTop + 'px';
        
        // 更新所有连接线
        if (AppState.graphLines && AppState.graphLines.length > 0) {
            AppState.graphLines.forEach(lineObj => {
                updateLine(lineObj.node, lineObj.line, clampedLeft, clampedTop);
            });
        }
    };
    
    const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        center.classList.remove('dragging');
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// AI生成词汇关联信息
async function aiGenerateWordRelations() {
    const searchInput = document.getElementById('graph-search');
    const wordInput = searchInput?.value.trim();
    
    if (!wordInput) {
        showNotification('请先在搜索框输入单词', 'info');
        return;
    }
    
    console.log('=== AI生成关联开始 ===');
    console.log('输入的单词:', wordInput, '类型:', typeof wordInput);
    
    // 检查API配置
    const settings = loadAPISettings();
    if (!settings.api || !settings.api.key) {
        showNotification('❌ 未配置API密钥，请先在设置中配置', 'error');
        setTimeout(() => {
            if (confirm('是否前往设置页面配置API？')) {
                window.open('setting.html', '_blank');
            }
        }, 500);
        return;
    }
    
    const aiBtn = document.getElementById('ai-generate-graph-btn');
    const originalText = aiBtn.innerHTML;
    aiBtn.innerHTML = '✨ AI生成中...';
    aiBtn.disabled = true;
    
    try {
        showNotification(`🤖 正在为「${wordInput}」生成词汇关联...`, 'info');
        
        // 调用AI生成数据
        const wordData = await callAIForWordData(wordInput, settings);
        
        if (!wordData) {
            throw new Error('AI生成失败');
        }
        
        console.log('AI返回的数据:', wordData);
        
        // 查找或创建单词对象 - 使用wordInput而不是word
        let wordObj = AppState.filteredWords.find(w => 
            w.word && typeof w.word === 'string' && 
            w.word.toLowerCase() === wordInput.toLowerCase()
        );
        
        if (!wordObj) {
            // 单词不存在，创建新单词
            wordObj = {
                word: wordData.word || wordInput,
                language: wordData.language || detectWordLanguage(wordInput),
                phonetic: wordData.phonetic || '',
                translation: wordData.translation || '',
                meaning: wordData.meaning || '',
                example: wordData.example || '',
                root: wordData.root || '',
                similar: wordData.similar || '',
                antonym: wordData.antonym || ''
            };
            
            AppState.vocabulary.push(wordObj);
            AppState.filteredWords.push(wordObj);
            localStorage.setItem('vocabulary', JSON.stringify(AppState.vocabulary));
            
            showNotification('✅ 单词不存在，已自动添加到词库', 'success');
        } else {
            // 更新现有单词信息
            wordObj.phonetic = wordData.phonetic || wordObj.phonetic;
            wordObj.translation = wordData.translation || wordObj.translation;
            wordObj.meaning = wordData.meaning || wordObj.meaning;
            wordObj.example = wordData.example || wordObj.example;
            wordObj.root = wordData.root || wordObj.root;
            wordObj.similar = wordData.similar || wordObj.similar;
            wordObj.antonym = wordData.antonym || wordObj.antonym;
            
            localStorage.setItem('vocabulary', JSON.stringify(AppState.vocabulary));
        }
        
        // 更新词汇关系
        AppState.wordRelations[wordInput] = {
            roots: wordData.root || '',
            similar: wordData.similar || '',
            antonym: wordData.antonym || '',
            example: wordData.example || ''
        };
        saveWordRelations();
        
        // 显示图谱
        showWordGraph(wordObj);
        
        showNotification(`✅ AI生成完成！已更新「${wordInput}」的词汇关联`, 'success');
        
    } catch (error) {
        console.error('AI生成失败:', error);
        showNotification('❌ AI生成失败: ' + error.message, 'error');
    } finally {
        aiBtn.innerHTML = originalText;
        aiBtn.disabled = false;
    }
}

// ==================== AI数据导入模式 ====================
function initImportMode() {
    const extractBtn = document.getElementById('extract-btn');
    const aiEnhanceBtn = document.getElementById('ai-enhance-btn');
    const confirmBtn = document.getElementById('confirm-import-btn');
    
    extractBtn?.addEventListener('click', extractAIData);
    aiEnhanceBtn?.addEventListener('click', aiEnhanceWords);
    confirmBtn?.addEventListener('click', confirmImport);
    
    // 检查API配置状态
    checkAPIConfig();
}

// 检查API配置
function checkAPIConfig() {
    const statusDiv = document.getElementById('api-config-status');
    if (!statusDiv) return;
    
    const settings = loadAPISettings();
    
    if (settings.api && settings.api.key) {
        statusDiv.style.display = 'block';
        statusDiv.style.background = 'rgba(139, 111, 71, 0.1)'; // 浅焦糖背景
        statusDiv.style.border = '2px solid #8B6F47'; // 焦糖棕边框
        statusDiv.style.color = '#3d2e1f'; // 深棕文字
        statusDiv.innerHTML = `✅ API已配置 (${settings.api.provider || 'DeepSeek'}) - AI增强功能可用`;
    } else {
        statusDiv.style.display = 'block';
        statusDiv.style.background = 'rgba(212, 165, 116, 0.15)'; // 浅烤面包背景
        statusDiv.style.border = '2px solid #D4A574'; // 烤面包色边框
        statusDiv.style.color = '#6B5344'; // 咖啡色文字
        statusDiv.innerHTML = `⚠️ 未配置API密钥 - AI增强功能不可用。<a href="setting.html" target="_blank" style="color: #8B6F47; text-decoration: underline;">前往设置</a>`;
    }
}

// 加载API设置
function loadAPISettings() {
    try {
        const settings = localStorage.getItem('languageHubSettings');
        return settings ? JSON.parse(settings) : { api: { provider: 'deepseek', key: '', baseUrl: '' } };
    } catch (error) {
        console.error('加载API设置失败:', error);
        return { api: { provider: 'deepseek', key: '', baseUrl: '' } };
    }
}

// AI增强处理单词列表
async function aiEnhanceWords() {
    const textarea = document.getElementById('import-textarea');
    if (!textarea) return;
    
    const input = textarea.value.trim();
    if (!input) {
        showNotification('请先输入单词列表', 'info');
        return;
    }
    
    // 检查API配置
    const settings = loadAPISettings();
    if (!settings.api || !settings.api.key) {
        showNotification('❌ 未配置API密钥，请先在设置中配置', 'error');
        setTimeout(() => {
            if (confirm('是否前往设置页面配置API？')) {
                window.open('setting.html', '_blank');
            }
        }, 500);
        return;
    }
    
    // 解析输入的单词列表
    const words = input.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//') && !line.startsWith('#'))
        .filter(word => /^[a-zA-Z\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fa5\uac00-\ud7af]+$/.test(word)); // 只保留有效单词
    
    if (words.length === 0) {
        showNotification('未识别到有效的单词，请检查输入格式', 'error');
        return;
    }
    
    if (words.length > 50) {
        showNotification('单次最多处理50个单词，已截取前50个', 'info');
        words.splice(50);
    }
    
    const aiEnhanceBtn = document.getElementById('ai-enhance-btn');
    const originalText = aiEnhanceBtn.innerHTML;
    aiEnhanceBtn.innerHTML = '✨ AI处理中...';
    aiEnhanceBtn.disabled = true;
    
    showNotification(`🤖 开始处理 ${words.length} 个单词...`, 'info');
    
    extractedData = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        try {
            showNotification(`⏳ 正在处理 ${i + 1}/${words.length}: ${word}`, 'info');
            
            const wordData = await callAIForWordData(word, settings);
            
            if (wordData) {
                extractedData.push(wordData);
                successCount++;
            } else {
                failCount++;
            }
            
            // 延迟避免API限流
            if (i < words.length - 1) {
                await new Promise(resolve => setTimeout(resolve, settings.default?.delay || 500));
            }
            
        } catch (error) {
            console.error(`处理单词 ${word} 失败:`, error);
            failCount++;
        }
    }
    
    aiEnhanceBtn.innerHTML = originalText;
    aiEnhanceBtn.disabled = false;
    
    if (successCount > 0) {
        showNotification(`✅ 处理完成！成功 ${successCount} 个，失败 ${failCount} 个`, 'success');
        
        // 显示预览
        document.getElementById('preview-btn').style.display = 'inline-block';
        document.getElementById('confirm-import-btn').style.display = 'inline-block';
        
        previewImportData();
    } else {
        showNotification('❌ 处理失败，请检查API配置或网络连接', 'error');
    }
}

// 调用AI获取单词数据
async function callAIForWordData(word, settings) {
    const apiType = settings.api.provider || 'deepseek';
    const apiKey = settings.api.key;
    const baseUrl = settings.api.baseUrl;
    
    const endpoints = {
        'deepseek': baseUrl || 'https://api.deepseek.com/v1/chat/completions',
        'openai': baseUrl || 'https://api.openai.com/v1/chat/completions',
        'claude': baseUrl || 'https://api.anthropic.com/v1/messages',
        'gemini': baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    };
    
    const prompt = `请为单词"${word}"提供详细的学习数据，以JSON格式返回，只返回JSON，不要任何额外说明。格式如下：
{
  "word": "${word}",
  "language": "语言代码(en/ja/ko/zh/fr等)",
  "phonetic": "音标",
  "translation": "中文翻译",
  "meaning": "详细释义",
  "root": "词根词缀分析",
  "similar": "相似词，用逗号分隔",
  "antonym": "反义词，用逗号分隔或写'无'",
  "example": "例句（包含该单词）"
}`;
    
    try {
        const response = await fetch(endpoints[apiType], {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: apiType === 'deepseek' ? 'deepseek-chat' : 
                       apiType === 'openai' ? 'gpt-4' : 
                       apiType === 'claude' ? 'claude-3-sonnet-20240229' : 
                       'gemini-pro',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        let content = '';
        
        if (apiType === 'deepseek' || apiType === 'openai') {
            content = data.choices[0].message.content;
        } else if (apiType === 'claude') {
            content = data.content[0].text;
        } else if (apiType === 'gemini') {
            content = data.candidates[0].content.parts[0].text;
        }
        
        // 提取JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const wordData = JSON.parse(jsonMatch[0]);
            console.log('AI返回数据:', wordData);
            return wordData;
        } else {
            console.error('AI返回的内容不是有效JSON:', content);
            return null;
        }
        
    } catch (error) {
        console.error('AI调用失败:', error);
        return null;
    }
}

let extractedData = [];

function extractAIData() {
    const textarea = document.getElementById('import-textarea');
    const text = textarea.value.trim();
    
    if (!text) {
        showNotification('请先粘贴数据', 'info');
        return;
    }
    
    try {
        extractedData = [];
        
        // 尝试解析JSON格式
        if (text.startsWith('[') || text.startsWith('{')) {
            try {
                const jsonData = JSON.parse(text);
                const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
                
                dataArray.forEach(item => {
                    if (item.word) {
                        extractedData.push({
                            word: item.word,
                            language: item.language || detectWordLanguage(item.word),
                            phonetic: item.phonetic || '',
                            translation: item.translation || item.meaning || item.chinese || '',
                            meaning: item.meaning || item.translation || '',
                            root: item.root || item.roots || '',
                            similar: item.similar || '',
                            antonym: item.antonym || '',
                            example: item.example || ''
                        });
                    }
                });
                
                if (extractedData.length > 0) {
                    showNotification(`✅ 成功解析JSON格式，提取 ${extractedData.length} 个单词`, 'success');
                    previewImportData();
                    document.getElementById('preview-btn').style.display = 'inline-block';
                    document.getElementById('confirm-import-btn').style.display = 'inline-block';
                    return;
                }
            } catch (e) {
                console.log('非JSON格式，尝试文本解析');
            }
        }
        
        // 文本格式解析
        const blocks = text.split(/\n\s*\n/);
        
        blocks.forEach(block => {
            const wordMatch = block.match(/单词[：:]\s*(\S+)/);
            const rootsMatch = block.match(/词根词缀[：:]\s*(.+)/);
            const similarMatch = block.match(/相似词[：:]\s*(.+)/);
            const antonymMatch = block.match(/反义词[：:]\s*(.+)/);
            const exampleMatch = block.match(/例句[：:]\s*(.+)/);
            
            if (wordMatch) {
                const word = wordMatch[1].trim();
                extractedData.push({
                    word: word,
                    language: detectWordLanguage(word),
                    root: rootsMatch ? rootsMatch[1].trim() : '',
                    similar: similarMatch ? similarMatch[1].trim() : '',
                    antonym: antonymMatch ? antonymMatch[1].trim() : '',
                    example: exampleMatch ? exampleMatch[1].trim() : ''
                });
            }
        });
        
        if (extractedData.length === 0) {
            showNotification('未能提取到有效数据，请检查格式或使用AI增强功能', 'error');
            return;
        }
        
        previewImportData();
        document.getElementById('preview-btn').style.display = 'inline-block';
        document.getElementById('confirm-import-btn').style.display = 'inline-block';
        
        showNotification(`✅ 成功提取 ${extractedData.length} 个单词的关联数据`, 'success');
        
    } catch (error) {
        console.error('数据提取失败:', error);
        showNotification('数据提取失败: ' + error.message, 'error');
    }
}

function previewImportData() {
    const preview = document.getElementById('import-preview');
    if (!preview) return;
    
    preview.style.display = 'block';
    
    let html = '<div style="max-height: 400px; overflow-y: auto;"><table style="width: 100%; border-collapse: collapse;">';
    html += '<thead><tr style="background: #8B6F47; color: white;"><th>单词</th><th>语言</th><th>释义</th><th>词根</th><th>相似词</th><th>反义词</th></tr></thead><tbody>';
    
    extractedData.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
        html += `
            <tr style="background: ${bgColor};">
                <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${item.word}</strong></td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${LANGUAGES[item.language]?.flag || ''} ${LANGUAGES[item.language]?.name || item.language}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.translation || item.meaning || '-'}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.root || '-'}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.similar || '-'}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.antonym || '-'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    preview.innerHTML = html;
}

function confirmImport() {
    if (extractedData.length === 0) {
        showNotification('没有可导入的数据', 'error');
        return;
    }
    
    let vocabUpdated = 0;
    let vocabAdded = 0;
    let relationsUpdated = 0;
    let relationsAdded = 0;
    
    extractedData.forEach(item => {
        // 1. 添加或更新单词到vocabulary
        const existingWord = AppState.vocabulary.find(w => w.word.toLowerCase() === item.word.toLowerCase());
        
        if (existingWord) {
            // 更新现有单词
            existingWord.language = item.language || existingWord.language;
            existingWord.phonetic = item.phonetic || existingWord.phonetic;
            existingWord.translation = item.translation || existingWord.translation;
            existingWord.meaning = item.meaning || existingWord.meaning;
            existingWord.example = item.example || existingWord.example;
            existingWord.root = item.root || existingWord.root;
            existingWord.similar = item.similar || existingWord.similar;
            existingWord.antonym = item.antonym || existingWord.antonym;
            vocabUpdated++;
        } else {
            // 添加新单词
            AppState.vocabulary.push({
                word: item.word,
                language: item.language || 'en',
                phonetic: item.phonetic || '',
                translation: item.translation || '',
                meaning: item.meaning || '',
                example: item.example || '',
                root: item.root || '',
                similar: item.similar || '',
                antonym: item.antonym || '',
                folderId: AppState.currentBook || ''
            });
            vocabAdded++;
        }
        
        // 2. 添加或更新词汇关系
        if (AppState.wordRelations[item.word]) {
            relationsUpdated++;
        } else {
            relationsAdded++;
        }
        
        AppState.wordRelations[item.word] = {
            roots: item.root || '',
            similar: item.similar || '',
            antonym: item.antonym || '',
            example: item.example || ''
        };
    });
    
    // 保存到localStorage
    localStorage.setItem('vocabulary', JSON.stringify(AppState.vocabulary));
    saveWordRelations();
    
    // 刷新显示
    filterWordsByBook(AppState.currentBook);
    updateWordCount();
    updateProgressDisplay();
    
    showNotification(
        `✅ 导入成功！\n` +
        `单词：新增 ${vocabAdded} 个，更新 ${vocabUpdated} 个\n` +
        `关系：新增 ${relationsAdded} 个，更新 ${relationsUpdated} 个`, 
        'success'
    );
    
    // 清空
    document.getElementById('import-textarea').value = '';
    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('preview-btn').style.display = 'none';
    document.getElementById('confirm-import-btn').style.display = 'none';
    extractedData = [];
}

// ==================== 全局事件 ====================
function bindGlobalEvents() {
    // 点击放大卡片外部关闭
    document.addEventListener('click', (e) => {
        if (AppState.enlargedCard && !e.target.closest('.word-card')) {
            toggleEnlargeCard(AppState.enlargedCard);
        }
    });
    
    // ESC键关闭放大卡片
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && AppState.enlargedCard) {
            toggleEnlargeCard(AppState.enlargedCard);
        }
    });
}

// ==================== 通知系统 ====================
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ==================== MySQL学习进度同步 ====================

// 加载MySQL配置
function loadMySQLConfig() {
    try {
        const saved = localStorage.getItem('mysqlConfig');
        if (saved) {
            const config = JSON.parse(saved);
            AppState.mysqlConfig = { ...AppState.mysqlConfig, ...config };
        }
    } catch (e) {
        console.error('加载MySQL配置失败:', e);
    }
}

// 记录学习活动到MySQL
async function recordLearningActivity(wordId, mode, isCorrect = true) {
    if (!AppState.mysqlConfig.enabled) return;
    
    try {
        const word = AppState.filteredWords.find(w => w.id === wordId || w.word === wordId);
        if (!word) return;
        
        const response = await fetch(`${AppState.mysqlConfig.apiUrl}/progress.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word_id: word.id || word.word,
                mode: mode, // 'card', 'dictation', 'game', 'graph'
                is_correct: isCorrect,
                accuracy: isCorrect ? 100 : 0
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success) {
            console.log(`✅ 学习记录已同步: ${word.word} (${mode})`);
        }
    } catch (error) {
        console.error('记录学习活动失败:', error);
    }
}

// 同步学习进度到MySQL
async function syncProgressToMySQL() {
    if (!AppState.mysqlConfig.enabled) return;
    if (AppState.syncStatus.syncing) return;
    
    try {
        AppState.syncStatus.syncing = true;
        
        // 同步已掌握的单词
        for (const wordId of AppState.masteredWords) {
            await updateWordMasteryStatus(wordId, 'mastered', true);
        }
        
        // 同步困难单词
        for (const wordId of AppState.difficultWords) {
            await updateWordMasteryStatus(wordId, 'difficult', true);
        }
        
        // 同步模糊单词
        for (const wordId of AppState.fuzzyWords) {
            await updateWordMasteryStatus(wordId, 'fuzzy', true);
        }
        
        AppState.syncStatus.lastSync = new Date().toISOString();
        AppState.syncStatus.syncing = false;
        
        console.log('✅ 学习进度已同步到MySQL');
    } catch (error) {
        console.error('同步进度失败:', error);
        AppState.syncStatus.syncing = false;
    }
}

// 更新单词掌握状态
async function updateWordMasteryStatus(wordId, type, value) {
    try {
        const word = AppState.vocabulary.find(w => w.id === wordId || w.word === wordId);
        if (!word) return;
        
        const response = await fetch(`${AppState.mysqlConfig.apiUrl}/progress.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word_id: word.id || word.word,
                [`is_${type}`]: value
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`更新${type}状态失败:`, error);
        return null;
    }
}

// 从MySQL加载学习进度
async function loadProgressFromMySQL() {
    if (!AppState.mysqlConfig.enabled) return;
    
    try {
        const response = await fetch(`${AppState.mysqlConfig.apiUrl}/progress.php`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success && result.data) {
            // 更新本地进度
            const progress = result.data;
            
            AppState.masteredWords = new Set(
                progress.filter(p => p.is_mastered).map(p => p.word_id)
            );
            AppState.difficultWords = new Set(
                progress.filter(p => p.is_difficult).map(p => p.word_id)
            );
            AppState.fuzzyWords = new Set(
                progress.filter(p => p.is_fuzzy).map(p => p.word_id)
            );
            
            // 保存到LocalStorage
            const data = {
                mastered: Array.from(AppState.masteredWords),
                difficult: Array.from(AppState.difficultWords),
                fuzzy: Array.from(AppState.fuzzyWords),
                todayReviewed: AppState.todayReviewed,
                lastUpdate: Date.now()
            };
            localStorage.setItem('learningProgress', JSON.stringify(data));
            
            // 更新UI显示
            updateProgressDisplay();
            
            console.log('✅ 已从MySQL加载学习进度');
            return result.data;
        }
    } catch (error) {
        console.error('从MySQL加载进度失败:', error);
        return null;
    }
}

// 获取学习统计
async function getLearningStats() {
    if (!AppState.mysqlConfig.enabled) return null;
    
    try {
        const response = await fetch(`${AppState.mysqlConfig.apiUrl}/progress.php`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success && result.stats) {
            return result.stats;
        }
    } catch (error) {
        console.error('获取学习统计失败:', error);
        return null;
    }
}

// ==================== 启动应用 ====================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    // 如果启用MySQL，加载服务器上的学习进度
    if (AppState.mysqlConfig.enabled) {
        setTimeout(() => {
            loadProgressFromMySQL();
        }, 2000); // 2秒后加载，避免阻塞页面
    }
});
