class VocabularyManager {
    static STORAGE_KEY = 'vocabulary';
    static FOLDER_KEY = 'folder_structure';
    static PENDING_KEY = 'pending_extracted_words';

    static vocabulary = [];
    static folderStructure = {
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
    static currentFolderId = 'root';
    static selectedWords = new Set();
    static currentView = 'card';
    static currentFilter = 'all';
    static currentSearchTerm = '';

    static initialize() {
        this.loadVocabulary();
        this.loadFolderStructure();
        this.migrateOldData();
        this.checkPendingWords();
    }

    static loadVocabulary() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            this.vocabulary = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('加载单词本失败:', error);
            this.vocabulary = [];
        }
    }

    static saveVocabulary() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.vocabulary));
            this.updateStats();
        } catch (error) {
            console.error('保存单词本失败:', error);
        }
    }

    static loadFolderStructure() {
        try {
            const saved = localStorage.getItem(this.FOLDER_KEY);
            if (saved) {
                this.folderStructure = JSON.parse(saved);
            }
        } catch (error) {
            console.error('加载文件夹结构失败:', error);
        }
    }

    static saveFolderStructure() {
        try {
            localStorage.setItem(this.FOLDER_KEY, JSON.stringify(this.folderStructure));
        } catch (error) {
            console.error('保存文件夹结构失败:', error);
        }
    }

    static migrateOldData() {
        const migrated = localStorage.getItem('vocabulary_migrated');
        if (migrated) return;

        this.vocabulary = this.vocabulary.map(item => ({
            ...item,
            id: item.id || Date.now() + Math.random(),
            parentId: item.parentId || 'root',
            addedDate: item.addedDate || new Date().toISOString()
        }));

        localStorage.setItem('vocabulary_migrated', 'true');
        this.saveVocabulary();
    }

    static checkPendingWords() {
        const pendingData = localStorage.getItem(this.PENDING_KEY);
        if (!pendingData) return;

        try {
            const data = JSON.parse(pendingData);
            const words = data.words || [];
            const folderName = data.folderName;
            const folderId = data.folderId;

            if (!Array.isArray(words) || words.length === 0) {
                localStorage.removeItem(this.PENDING_KEY);
                return;
            }

            NotificationManager.show(
                `📥 从阅读页面提取了 ${words.length} 个单词`,
                { body: folderName ? `到文件夹 "${folderName}"` : '' }
            );

            let targetFolderId = this.findOrCreateFolder(folderId, folderName);
            this.addWordsToFolder(words, targetFolderId);
            
            this.saveVocabulary();
            this.saveFolderStructure();

            localStorage.removeItem(this.PENDING_KEY);

            setTimeout(() => {
                this.autoCompleteWords(words);
            }, 500);

        } catch (error) {
            console.error('处理提取单词失败:', error);
            localStorage.removeItem(this.PENDING_KEY);
        }
    }

    static findOrCreateFolder(folderId, folderName) {
        if (folderId) {
            const folder = this.folderStructure.folders.find(f => f.id === folderId);
            if (folder) return folder.id;
        }

        if (folderName) {
            let folder = this.folderStructure.folders.find(
                f => f.name === folderName && f.type === 'folder'
            );
            
            if (!folder) {
                folder = {
                    id: 'folder-' + Date.now(),
                    name: folderName,
                    type: 'folder',
                    parentId: 'root',
                    expanded: true,
                    unviewed: true
                };
                this.folderStructure.folders.push(folder);
            }
            
            return folder.id;
        }

        return 'root';
    }

    static addWordsToFolder(words, folderId) {
        words.forEach(word => {
            const existingWord = this.vocabulary.find(
                v => v.word === word.word && v.type === 'word'
            );
            
            if (!existingWord) {
                this.vocabulary.push({
                    id: Date.now() + Math.random(),
                    word: word.word,
                    pronunciation: '',
                    romanization: '',
                    translation: '',
                    language: word.language || 'unknown',
                    source: word.source || '阅读提取',
                    addedDate: new Date().toISOString(),
                    type: 'word',
                    parentId: folderId
                });
            }
        });
    }

    static async autoCompleteWords(words) {
        try {
            const settings = ConfigManager.get('ai') || {};
            let successCount = 0;

            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const vocabItem = this.vocabulary.find(v => v.word === word.word);

                if (vocabItem && (!vocabItem.romanization || !vocabItem.translation)) {
                    const completed = await this.completeWordInfo(
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

                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            this.saveVocabulary();
            NotificationManager.show(
                `✅ AI补全完成！成功处理 ${successCount}/${words.length} 个单词`
            );

        } catch (error) {
            console.error('补全错误:', error);
            NotificationManager.show('❌ AI补全失败：' + error.message);
        }
    }

    static async completeWordInfo(word, language, apiType, apiKey) {
        try {
            const langInfo = LanguageConfig.getLanguage(language);
            const langName = langInfo ? langInfo.name : language;

            const prompt = `请为单词"${word}"（${langName}）提供以下信息，以JSON格式返回：
            {
                "pronunciation": "音标或发音",
                "romanization": "罗马音或拼音",
                "translation": "中文释义"
            }`;

            if (apiType === 'deepseek') {
                const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7
                    })
                });

                const data = await response.json();
                const content = data.choices[0].message.content;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            }

            return null;
        } catch (error) {
            console.error('补全单词信息失败:', error);
            return null;
        }
    }

    static addWord(wordData) {
        const newWord = {
            id: Date.now() + Math.random(),
            word: wordData.word,
            pronunciation: wordData.pronunciation || '',
            romanization: wordData.romanization || '',
            translation: wordData.translation || '',
            language: wordData.language || 'en',
            source: wordData.source || '手动添加',
            addedDate: new Date().toISOString(),
            type: 'word',
            parentId: wordData.parentId || this.currentFolderId
        };

        this.vocabulary.push(newWord);
        this.saveVocabulary();
        return newWord;
    }

    static updateWord(id, updates) {
        const index = this.vocabulary.findIndex(v => v.id == id);
        if (index !== -1) {
            this.vocabulary[index] = { ...this.vocabulary[index], ...updates };
            this.saveVocabulary();
            return true;
        }
        return false;
    }

    static deleteWord(id) {
        const index = this.vocabulary.findIndex(v => v.id == id);
        if (index !== -1) {
            this.vocabulary.splice(index, 1);
            this.saveVocabulary();
            return true;
        }
        return false;
    }

    static deleteWords(ids) {
        this.vocabulary = this.vocabulary.filter(v => !ids.includes(v.id));
        this.saveVocabulary();
    }

    static getWord(id) {
        return this.vocabulary.find(v => v.id == id);
    }

    static getCurrentFolderWords() {
        const folderIds = this.getFolderAndSubfolderIds(this.currentFolderId);
        return this.vocabulary.filter(v => folderIds.includes(v.parentId));
    }

    static getFolderAndSubfolderIds(folderId) {
        const ids = [folderId];
        const children = this.folderStructure.folders.filter(f => f.parentId === folderId);
        
        children.forEach(child => {
            ids.push(...this.getFolderAndSubfolderIds(child.id));
        });

        return ids;
    }

    static getFilteredVocabulary() {
        const folderWords = this.getCurrentFolderWords();

        return folderWords.filter(item => {
            if (this.currentFilter !== 'all' && item.language !== this.currentFilter) {
                return false;
            }

            if (this.currentSearchTerm) {
                const searchLower = this.currentSearchTerm.toLowerCase();
                return item.word.toLowerCase().includes(searchLower) ||
                       (item.translation && item.translation.toLowerCase().includes(searchLower)) ||
                       (item.romanization && item.romanization.toLowerCase().includes(searchLower));
            }

            return true;
        });
    }

    static addFolder(name, parentId = 'root') {
        const newFolder = {
            id: 'folder-' + Date.now(),
            name: name,
            type: 'folder',
            parentId: parentId,
            expanded: true
        };

        this.folderStructure.folders.push(newFolder);
        this.saveFolderStructure();
        return newFolder;
    }

    static deleteFolder(folderId) {
        const folder = this.folderStructure.folders.find(f => f.id === folderId);
        if (!folder || folderId === 'root') {
            return false;
        }

        const folderIds = this.getFolderAndSubfolderIds(folderId);
        this.vocabulary = this.vocabulary.filter(v => !folderIds.includes(v.parentId));
        this.folderStructure.folders = this.folderStructure.folders.filter(
            f => !folderIds.includes(f.id)
        );

        this.saveVocabulary();
        this.saveFolderStructure();
        return true;
    }

    static updateFolder(folderId, updates) {
        const folder = this.folderStructure.folders.find(f => f.id === folderId);
        if (folder) {
            Object.assign(folder, updates);
            this.saveFolderStructure();
            return true;
        }
        return false;
    }

    static getFolder(folderId) {
        return this.folderStructure.folders.find(f => f.id === folderId);
    }

    static getSubfolders(folderId) {
        return this.folderStructure.folders.filter(f => f.parentId === folderId);
    }

    static toggleFolder(folderId) {
        const folder = this.getFolder(folderId);
        if (folder) {
            folder.expanded = !folder.expanded;
            this.saveFolderStructure();
        }
    }

    static setCurrentFolder(folderId) {
        this.currentFolderId = folderId;
    }

    static toggleSelectWord(id) {
        if (this.selectedWords.has(id)) {
            this.selectedWords.delete(id);
        } else {
            this.selectedWords.add(id);
        }
    }

    static selectAllWords() {
        const words = this.getFilteredVocabulary();
        words.forEach(word => this.selectedWords.add(word.id));
    }

    static deselectAllWords() {
        this.selectedWords.clear();
    }

    static updateStats() {
        const totalWords = this.vocabulary.length;
        const today = new Date().toDateString();
        const todayAdded = this.vocabulary.filter(v => 
            new Date(v.addedDate).toDateString() === today
        ).length;
        const languages = new Set(this.vocabulary.map(v => v.language));

        return {
            totalWords,
            todayAdded,
            languageCount: languages.size
        };
    }

    static exportToJSON() {
        return JSON.stringify({
            vocabulary: this.vocabulary,
            folderStructure: this.folderStructure,
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    static importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (data.vocabulary) {
                this.vocabulary = data.vocabulary;
            }
            
            if (data.folderStructure) {
                this.folderStructure = data.folderStructure;
            }

            this.saveVocabulary();
            this.saveFolderStructure();
            
            return { success: true };
        } catch (error) {
            console.error('导入失败:', error);
            return { success: false, error: error.message };
        }
    }

    static search(query) {
        this.currentSearchTerm = query;
    }

    static filterByLanguage(language) {
        this.currentFilter = language;
    }

    static setView(view) {
        this.currentView = view;
    }
}

VocabularyManager.initialize();
