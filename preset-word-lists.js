// 预设单词表库 - 根据实际文件配置
const PRESET_FOLDER_STRUCTURE = {
    folders: [
        // 根文件夹
        {
            id: 'root',
            name: '我的单词本',
            type: 'folder',
            parentId: null,
            expanded: true
        },
        // 一级分类：英语
        {
            id: 'english',
            name: '📚 英语',
            type: 'folder',
            parentId: 'root',
            expanded: true,
            description: '英语学习资源库'
        },
        // 英语 -> 考试词汇
        {
            id: 'english-exam',
            name: '🎯 考试词汇',
            type: 'folder',
            parentId: 'english',
            expanded: true
        },
        {
            id: 'kaoyan',
            name: '🎓 考研英语大纲词汇',
            type: 'folder',
            parentId: 'english-exam',
            expanded: false
        },
        {
            id: 'kaoyan-zhengxu',
            name: '📖 考研词汇正序版',
            type: 'word-source',
            parentId: 'kaoyan',
            excelPath: '01.kaoyan/01.考研英语词汇正序版.xls',
            wordCount: 5500,
            difficulty: 'advanced',
            language: 'en'
        },
        {
            id: 'kaoyan-luanxu',
            name: '📖 考研词汇乱序版',
            type: 'word-source',
            parentId: 'kaoyan',
            excelPath: '01.kaoyan/01.考研英语词汇乱序版.xls',
            wordCount: 5500,
            difficulty: 'advanced',
            language: 'en'
        },
        {
            id: 'cet4',
            name: '📘 大学英语四级词汇',
            type: 'folder',
            parentId: 'english-exam',
            expanded: false
        },
        {
            id: 'cet4-zhengxu',
            name: '📖 四级词汇顺序版',
            type: 'word-source',
            parentId: 'cet4',
            excelPath: '02.siji/大学英语四级词汇完整版带音标-顺序版.xls',
            wordCount: 4500,
            difficulty: 'intermediate',
            language: 'en'
        },
        {
            id: 'cet4-luanxu',
            name: '📖 四级词汇乱序版',
            type: 'word-source',
            parentId: 'cet4',
            excelPath: '02.siji/大学英语四级词汇完整版带音标-乱序版.xls',
            wordCount: 4500,
            difficulty: 'intermediate',
            language: 'en'
        },
        {
            id: 'cet6',
            name: '📗 大学英语六级词汇',
            type: 'folder',
            parentId: 'english-exam',
            expanded: false
        },
        {
            id: 'cet6-zhengxu',
            name: '📖 六级词汇顺序版',
            type: 'word-source',
            parentId: 'cet6',
            excelPath: '03.liji/大学英语六级词汇完整版带音标-顺序版.xls',
            wordCount: 5500,
            difficulty: 'advanced',
            language: 'en'
        },
        {
            id: 'cet6-luanxu',
            name: '📖 六级词汇乱序版',
            type: 'word-source',
            parentId: 'cet6',
            excelPath: '03.liji/大学英语六级词汇完整版带音标-乱序版.xls',
            wordCount: 5500,
            difficulty: 'advanced',
            language: 'en'
        },
        {
            id: 'ielts',
            name: '🌍 雅思核心词汇',
            type: 'folder',
            parentId: 'english-exam',
            expanded: false
        },
        {
            id: 'ielts-9400-luanxu',
            name: '📖 雅思9400词乱序版',
            type: 'word-source',
            parentId: 'ielts',
            excelPath: '06.ielts/雅思词汇9400词EXCEL词-乱序版.xls',
            wordCount: 9400,
            difficulty: 'advanced',
            language: 'en'
        },
        {
            id: 'ielts-9400-zhengxu',
            name: '📖 雅思9400词顺序版',
            type: 'word-source',
            parentId: 'ielts',
            excelPath: '06.ielts/雅思词汇9400词EXCEL版-顺序版.xls',
            wordCount: 9400,
            difficulty: 'advanced',
            language: 'en'
        },
        {
            id: 'ielts-8000-luanxu',
            name: '📖 雅思8000词乱序版',
            type: 'word-source',
            parentId: 'ielts',
            excelPath: '06.ielts/雅思词汇8000词EXCEL词-乱序版.xls',
            wordCount: 8000,
            difficulty: 'advanced',
            language: 'en'
        },
        {
            id: 'ielts-8000-zhengxu',
            name: '📖 雅思8000词顺序版',
            type: 'word-source',
            parentId: 'ielts',
            excelPath: '06.ielts/雅思词汇8000词EXCEL版-顺序版.xls',
            wordCount: 8000,
            difficulty: 'advanced',
            language: 'en'
        },
        // 英语 -> 基础词汇
        {
            id: 'english-basic',
            name: '📖 基础词汇',
            type: 'folder',
            parentId: 'english',
            expanded: false
        },
        {
            id: 'gaozhong',
            name: '📕 高中英语词汇',
            type: 'word-source',
            parentId: 'english-basic',
            excelPath: '05.gaozhong/4.【简易3935行】新课标高考英语考纲3500词汇表（英汉+词性+音标，Excel可编辑打印）  .xls',
            wordCount: 3500,
            difficulty: 'intermediate',
            language: 'en'
        },
        {
            id: 'coca-20000',
            name: '📊 COCA 20000词频表',
            type: 'word-source',
            parentId: 'english-basic',
            excelPath: 'COCA20000词汇音标版.xlsx',
            wordCount: 20000,
            difficulty: 'comprehensive',
            language: 'en',
            description: 'COCA美国当代英语语料库20000高频词汇（带音标）'
        }
    ]
};
