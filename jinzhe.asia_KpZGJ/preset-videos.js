// 预设视频库配置
// 用于影子跟读功能

const PRESET_VIDEOS = [
    {
        id: 'ted-1',
        title: 'TED: 如何在6个月内学会任何一门语言',
        videoId: '9yjZpBq1XBE',
        category: 'TED演讲',
        difficulty: '中级',
        duration: '18:27',
        language: 'en',
        subtitle: 'en',
        thumbnail: 'https://img.youtube.com/vi/9yjZpBq1XBE/maxresdefault.jpg',
        description: 'Chris Lonsdale分享在6个月内掌握外语的5大原则和7个行动',
        tags: ['学习方法', '语言学习', '教育']
    },
    {
        id: 'ted-2',
        title: 'TED: The first 20 hours -- how to learn anything',
        videoId: '5MgBikgcWnY',
        category: 'TED演讲',
        difficulty: '中级',
        duration: '19:27',
        language: 'en',
        subtitle: 'en',
        thumbnail: 'https://img.youtube.com/vi/5MgBikgcWnY/maxresdefault.jpg',
        description: 'Josh Kaufman讲解快速学习任何技能的方法',
        tags: ['学习', '自我提升', '技能']
    },
    {
        id: 'bbc-1',
        title: 'BBC纪录片：地球脉动 第一集',
        videoId: 'c8aFcHFu8QM',
        category: 'BBC纪录片',
        difficulty: '高级',
        duration: '50:24',
        language: 'en',
        subtitle: 'en',
        thumbnail: 'https://img.youtube.com/vi/c8aFcHFu8QM/maxresdefault.jpg',
        description: '探索地球上最壮丽的自然景观',
        tags: ['自然', '地理', '动物']
    },
    {
        id: 'news-1',
        title: 'CNN新闻：科技前沿报道',
        videoId: 'dQw4w9WgXcQ',
        category: '新闻',
        difficulty: '中高级',
        duration: '5:32',
        language: 'en',
        subtitle: 'en',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: '最新科技发展趋势报道',
        tags: ['新闻', '科技', '时事']
    },
    {
        id: 'movie-1',
        title: '电影片段：肖申克的救赎 经典片段',
        videoId: '6hB3S9bIaco',
        category: '电影',
        difficulty: '中级',
        duration: '3:45',
        language: 'en',
        subtitle: 'en',
        thumbnail: 'https://img.youtube.com/vi/6hB3S9bIaco/maxresdefault.jpg',
        description: '经典电影片段，学习地道口语表达',
        tags: ['电影', '口语', '经典']
    },
    {
        id: 'edu-1',
        title: 'Crash Course: 世界历史 #1',
        videoId: 'Yocja_N5s1I',
        category: '教育',
        difficulty: '中高级',
        duration: '11:33',
        language: 'en',
        subtitle: 'en',
        thumbnail: 'https://img.youtube.com/vi/Yocja_N5s1I/maxresdefault.jpg',
        description: 'Crash Course系列教育视频，学习历史知识',
        tags: ['教育', '历史', 'Crash Course']
    },
    {
        id: 'vlog-1',
        title: '日常Vlog：纽约一日游',
        videoId: 'sample-vlog',
        category: 'Vlog',
        difficulty: '初中级',
        duration: '8:15',
        language: 'en',
        subtitle: 'en',
        thumbnail: 'https://via.placeholder.com/1280x720/007AFF/FFFFFF?text=NYC+Vlog',
        description: '跟随vlogger体验纽约生活，学习日常口语',
        tags: ['生活', '旅行', '日常']
    },
    {
        id: 'interview-1',
        title: '名人访谈：Elon Musk on AI',
        videoId: 'sample-interview',
        category: '访谈',
        difficulty: '高级',
        duration: '25:40',
        language: 'en',
        subtitle: 'en',
        thumbnail: 'https://via.placeholder.com/1280x720/FF3B30/FFFFFF?text=Elon+Interview',
        description: '马斯克谈人工智能的未来',
        tags: ['访谈', 'AI', '科技']
    }
];

// 视频分类
const VIDEO_CATEGORIES = [
    { id: 'all', name: '全部', icon: '🎬' },
    { id: 'TED演讲', name: 'TED演讲', icon: '🎤' },
    { id: 'BBC纪录片', name: 'BBC纪录片', icon: '🌍' },
    { id: '新闻', name: '新闻', icon: '📰' },
    { id: '电影', name: '电影', icon: '🎥' },
    { id: '教育', name: '教育', icon: '📚' },
    { id: 'Vlog', name: 'Vlog', icon: '📹' },
    { id: '访谈', name: '访谈', icon: '🎙️' }
];

// 难度级别
const DIFFICULTY_LEVELS = [
    { id: 'all', name: '全部难度', color: '#8E8E93' },
    { id: '初级', name: '初级', color: '#34C759' },
    { id: '初中级', name: '初中级', color: '#30D158' },
    { id: '中级', name: '中级', color: '#FF9500' },
    { id: '中高级', name: '中高级', color: '#FF9F0A' },
    { id: '高级', name: '高级', color: '#FF3B30' }
];

// 获取所有视频
function getAllVideos() {
    return PRESET_VIDEOS;
}

// 按分类获取视频
function getVideosByCategory(category) {
    if (category === 'all') {
        return PRESET_VIDEOS;
    }
    return PRESET_VIDEOS.filter(video => video.category === category);
}

// 按难度获取视频
function getVideosByDifficulty(difficulty) {
    if (difficulty === 'all') {
        return PRESET_VIDEOS;
    }
    return PRESET_VIDEOS.filter(video => video.difficulty === difficulty);
}

// 按标签搜索视频
function searchVideosByTag(tag) {
    return PRESET_VIDEOS.filter(video => 
        video.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
    );
}

// 搜索视频
function searchVideos(query) {
    const lowerQuery = query.toLowerCase();
    return PRESET_VIDEOS.filter(video => 
        video.title.toLowerCase().includes(lowerQuery) ||
        video.description.toLowerCase().includes(lowerQuery) ||
        video.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
}

// 获取视频详情
function getVideoById(id) {
    return PRESET_VIDEOS.find(video => video.id === id);
}

// 获取推荐视频
function getRecommendedVideos(currentVideoId, count = 4) {
    const currentVideo = getVideoById(currentVideoId);
    if (!currentVideo) return PRESET_VIDEOS.slice(0, count);
    
    // 基于分类和标签推荐
    const recommended = PRESET_VIDEOS.filter(video => 
        video.id !== currentVideoId && (
            video.category === currentVideo.category ||
            video.tags.some(tag => currentVideo.tags.includes(tag))
        )
    );
    
    return recommended.slice(0, count);
}

// 获取统计信息
function getVideoStats() {
    return {
        total: PRESET_VIDEOS.length,
        byCategory: VIDEO_CATEGORIES.map(cat => ({
            category: cat.name,
            count: cat.id === 'all' ? PRESET_VIDEOS.length : getVideosByCategory(cat.id).length
        })),
        byDifficulty: DIFFICULTY_LEVELS.map(diff => ({
            difficulty: diff.name,
            count: diff.id === 'all' ? PRESET_VIDEOS.length : getVideosByDifficulty(diff.id).length
        }))
    };
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRESET_VIDEOS,
        VIDEO_CATEGORIES,
        DIFFICULTY_LEVELS,
        getAllVideos,
        getVideosByCategory,
        getVideosByDifficulty,
        searchVideosByTag,
        searchVideos,
        getVideoById,
        getRecommendedVideos,
        getVideoStats
    };
}
