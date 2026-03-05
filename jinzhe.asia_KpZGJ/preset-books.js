// 预设书籍配置文件
// 在这里配置你BOOK文件夹中的预设书籍

const PRESET_BOOKS = [
    // ========== 实际存在的书籍 ==========
    {
        id: 'book-blot-scutcheon',
        title: 'A Blot In The Scutcheon',
        type: 'document',
        fileName: 'A Blot In The \'Scutcheon.txt',
        filePath: 'A Blot In The \'Scutcheon.txt',
        coverEmoji: '📖',
        description: '经典文学作品',
        author: 'Unknown',
        tags: ['文学', '经典'],
        addedDate: '2026-03-02'
    },
    {
        id: 'book-scoundrels',
        title: 'A Book of Scoundrels',
        type: 'document',
        fileName: 'A Book of Scoundrels.txt',
        filePath: 'A Book of Scoundrels.txt',
        coverEmoji: '📖',
        description: '经典文学作品',
        author: 'Unknown',
        tags: ['文学', '经典'],
        addedDate: '2026-03-02'
    },
    {
        id: 'book-ballads',
        title: 'A Bundle of Ballads',
        type: 'document',
        fileName: 'A Bundle of Ballads.txt',
        filePath: 'A Bundle of Ballads.txt',
        coverEmoji: '📖',
        description: '经典文学作品',
        author: 'Unknown',
        tags: ['文学', '诗歌'],
        addedDate: '2026-03-02'
    },
    {
        id: 'book-letters',
        title: 'A Bundle of Letters',
        type: 'document',
        fileName: 'A Bundle of Letters.txt',
        filePath: 'A Bundle of Letters.txt',
        coverEmoji: '📖',
        description: '经典文学作品',
        author: 'Unknown',
        tags: ['文学', '书信'],
        addedDate: '2026-03-02'
    },
    {
        id: 'book-cathedral',
        title: 'A Cathedral Courtship',
        type: 'document',
        fileName: 'A Cathedral Courtship.txt',
        filePath: 'A Cathedral Courtship.txt',
        coverEmoji: '📖',
        description: '经典文学作品',
        author: 'Unknown',
        tags: ['文学', '经典'],
        addedDate: '2026-03-02'
    }
];

// ========== 批量剧本+音频配置 ==========
// 如果你有多个剧本文件，可以使用以下格式批量配置
const PRESET_SCRIPTS = [
    // 示例：
    // {
    //     id: 'script-1',
    //     title: '剧本标题',
    //     fileName: '剧本.docx',
    //     filePath: 'BOOK/剧本/剧本.docx',
    //     audioPath: 'BOOK/剧本/剧本.mp3',
    //     coverEmoji: '🎭',
    //     hasAudio: true,
    //     author: '编剧名',
    //     narrator: '配音演员',
    //     tags: ['剧本', '配音']
    // }
];

// 导出配置（如果需要在其他文件中使用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PRESET_BOOKS, PRESET_SCRIPTS };
}
