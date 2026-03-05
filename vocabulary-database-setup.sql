-- ============================================
-- 英语学习词汇数据库设计
-- 创建日期: 2026-01-04
-- ============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS english_learning
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE english_learning;

-- ============================================
-- 表1: 文件夹结构表 (folder_structure)
-- ============================================
CREATE TABLE IF NOT EXISTS folder_structure (
    id VARCHAR(50) PRIMARY KEY COMMENT '文件夹唯一ID',
    name VARCHAR(200) NOT NULL COMMENT '文件夹名称',
    type ENUM('folder', 'word-source') NOT NULL DEFAULT 'folder' COMMENT '类型：文件夹或词汇来源',
    parent_id VARCHAR(50) COMMENT '父文件夹ID',
    description TEXT COMMENT '描述',
    icon VARCHAR(50) COMMENT '图标emoji',
    expanded BOOLEAN DEFAULT TRUE COMMENT '是否展开',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    word_count INT DEFAULT 0 COMMENT '词汇数量',
    difficulty ENUM('beginner', 'intermediate', 'advanced', 'expert') COMMENT '难度级别',
    language VARCHAR(10) DEFAULT 'en' COMMENT '语言代码',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_parent (parent_id),
    INDEX idx_type (type),
    INDEX idx_language (language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件夹和词汇来源结构表';

-- ============================================
-- 表2: 词汇表 (vocabulary)
-- ============================================
CREATE TABLE IF NOT EXISTS vocabulary (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '词汇ID',
    folder_id VARCHAR(50) NOT NULL COMMENT '所属文件夹ID',
    word VARCHAR(200) NOT NULL COMMENT '单词/词组',
    phonetic VARCHAR(100) COMMENT '音标',
    translation TEXT COMMENT '翻译',
    example_sentence TEXT COMMENT '例句',
    example_translation TEXT COMMENT '例句翻译',
    language VARCHAR(10) DEFAULT 'en' COMMENT '语言代码',
    difficulty ENUM('beginner', 'intermediate', 'advanced', 'expert') COMMENT '难度级别',
    frequency INT DEFAULT 0 COMMENT '词频',
    tags TEXT COMMENT '标签（JSON数组）',
    audio_url VARCHAR(500) COMMENT '音频URL',
    image_url VARCHAR(500) COMMENT '配图URL',
    notes TEXT COMMENT '笔记',
    source VARCHAR(200) COMMENT '来源（如：考研大纲、四级词汇）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_folder (folder_id),
    INDEX idx_word (word),
    INDEX idx_language (language),
    INDEX idx_difficulty (difficulty),
    FULLTEXT idx_search (word, translation, example_sentence),
    FOREIGN KEY (folder_id) REFERENCES folder_structure(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='词汇主表';

-- ============================================
-- 表3: 学习记录表 (learning_progress)
-- ============================================
CREATE TABLE IF NOT EXISTS learning_progress (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
    user_id VARCHAR(50) DEFAULT 'default_user' COMMENT '用户ID',
    vocabulary_id INT NOT NULL COMMENT '词汇ID',
    mastery_level ENUM('new', 'learning', 'familiar', 'mastered') DEFAULT 'new' COMMENT '掌握程度',
    review_count INT DEFAULT 0 COMMENT '复习次数',
    correct_count INT DEFAULT 0 COMMENT '正确次数',
    wrong_count INT DEFAULT 0 COMMENT '错误次数',
    last_review_date TIMESTAMP NULL COMMENT '最后复习日期',
    next_review_date TIMESTAMP NULL COMMENT '下次复习日期',
    notes TEXT COMMENT '学习笔记',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_user (user_id),
    INDEX idx_vocabulary (vocabulary_id),
    INDEX idx_mastery (mastery_level),
    INDEX idx_next_review (next_review_date),
    UNIQUE KEY unique_user_vocab (user_id, vocabulary_id),
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习进度记录表';

-- ============================================
-- 表4: 文档导入记录表 (document_imports)
-- ============================================
CREATE TABLE IF NOT EXISTS document_imports (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '导入记录ID',
    folder_id VARCHAR(50) NOT NULL COMMENT '目标文件夹ID',
    file_name VARCHAR(255) NOT NULL COMMENT '文件名',
    file_type ENUM('excel', 'pdf', 'txt', 'csv') NOT NULL COMMENT '文件类型',
    file_path VARCHAR(500) COMMENT '文件路径',
    total_words INT DEFAULT 0 COMMENT '总词汇数',
    imported_words INT DEFAULT 0 COMMENT '成功导入数',
    failed_words INT DEFAULT 0 COMMENT '失败数',
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT '导入状态',
    error_message TEXT COMMENT '错误信息',
    import_config JSON COMMENT '导入配置（列映射等）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    INDEX idx_folder (folder_id),
    INDEX idx_status (status),
    FOREIGN KEY (folder_id) REFERENCES folder_structure(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档导入记录表';

-- ============================================
-- 表5: 用户表 (users) - 可选
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY COMMENT '用户ID',
    username VARCHAR(100) NOT NULL UNIQUE COMMENT '用户名',
    email VARCHAR(200) COMMENT '邮箱',
    avatar VARCHAR(500) COMMENT '头像URL',
    study_goal TEXT COMMENT '学习目标',
    daily_target INT DEFAULT 20 COMMENT '每日学习目标',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    last_login TIMESTAMP NULL COMMENT '最后登录时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ============================================
-- 初始化基础数据
-- ============================================

-- 插入根文件夹
INSERT INTO folder_structure (id, name, type, parent_id, icon, description) VALUES
('root', '我的单词本', 'folder', NULL, '📚', '单词本根目录');

-- 插入英语分类文件夹
INSERT INTO folder_structure (id, name, type, parent_id, icon, description, language) VALUES
('english', '英语', 'folder', 'root', '🇬🇧', '英语学习资源库', 'en'),
('english-exam', '考试词汇', 'folder', 'english', '🎯', '各类考试词汇', 'en'),
('english-practical', '实用英语', 'folder', 'english', '💼', '日常和职场英语', 'en');

-- 插入考试词汇子分类
INSERT INTO folder_structure (id, name, type, parent_id, icon, description, difficulty, language) VALUES
('kaoyan', '考研英语大纲词汇', 'word-source', 'english-exam', '🎓', '考研英语大纲要求的5500词汇', 'advanced', 'en'),
('cet4', '大学英语四级词汇', 'word-source', 'english-exam', '📘', '大学英语四级4500词汇', 'intermediate', 'en'),
('cet6', '大学英语六级词汇', 'word-source', 'english-exam', '📗', '大学英语六级5500词汇', 'advanced', 'en'),
('chuzhong', '初中英语词汇', 'word-source', 'english-exam', '📕', '初中英语必备词汇', 'beginner', 'en'),
('gaozhong', '高中英语词汇', 'word-source', 'english-exam', '📙', '高中英语3500词汇', 'intermediate', 'en'),
('ielts', '雅思词汇', 'word-source', 'english-exam', '🌏', '雅思考试核心词汇', 'advanced', 'en'),
('toefl', '托福词汇', 'word-source', 'english-exam', '🎓', '托福考试核心词汇', 'advanced', 'en');

-- 插入其他语言分类（可选）
INSERT INTO folder_structure (id, name, type, parent_id, icon, description, language) VALUES
('japanese', '日语', 'folder', 'root', '🇯🇵', '日语学习资源库', 'ja'),
('korean', '韩语', 'folder', 'root', '🇰🇷', '韩语学习资源库', 'ko'),
('french', '法语', 'folder', 'root', '🇫🇷', '法语学习资源库', 'fr'),
('german', '德语', 'folder', 'root', '🇩🇪', '德语学习资源库', 'de'),
('spanish', '西班牙语', 'folder', 'root', '🇪🇸', '西班牙语学习资源库', 'es');

-- 插入默认用户
INSERT INTO users (id, username, email, daily_target) VALUES
('default_user', '默认用户', 'user@example.com', 20);

-- ============================================
-- 创建视图 - 便于查询
-- ============================================

-- 视图1: 词汇详细信息视图
CREATE OR REPLACE VIEW v_vocabulary_detail AS
SELECT 
    v.*,
    f.name as folder_name,
    f.icon as folder_icon,
    lp.mastery_level,
    lp.review_count,
    lp.last_review_date,
    lp.next_review_date
FROM vocabulary v
LEFT JOIN folder_structure f ON v.folder_id = f.id
LEFT JOIN learning_progress lp ON v.id = lp.vocabulary_id AND lp.user_id = 'default_user';

-- 视图2: 文件夹统计视图
CREATE OR REPLACE VIEW v_folder_stats AS
SELECT 
    f.id,
    f.name,
    f.type,
    f.parent_id,
    COUNT(DISTINCT v.id) as total_words,
    COUNT(DISTINCT CASE WHEN lp.mastery_level = 'mastered' THEN v.id END) as mastered_words,
    COUNT(DISTINCT CASE WHEN lp.mastery_level = 'learning' THEN v.id END) as learning_words,
    COUNT(DISTINCT CASE WHEN lp.mastery_level = 'new' THEN v.id END) as new_words
FROM folder_structure f
LEFT JOIN vocabulary v ON f.id = v.folder_id
LEFT JOIN learning_progress lp ON v.id = lp.vocabulary_id AND lp.user_id = 'default_user'
GROUP BY f.id, f.name, f.type, f.parent_id;

-- ============================================
-- 存储过程
-- ============================================

-- 存储过程1: 批量导入词汇
DELIMITER //
CREATE PROCEDURE sp_batch_import_vocabulary(
    IN p_folder_id VARCHAR(50),
    IN p_words JSON
)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE word_count INT;
    DECLARE current_word JSON;
    
    SET word_count = JSON_LENGTH(p_words);
    
    WHILE i < word_count DO
        SET current_word = JSON_EXTRACT(p_words, CONCAT('$[', i, ']'));
        
        INSERT INTO vocabulary (
            folder_id, word, phonetic, translation, 
            example_sentence, language, difficulty, source
        ) VALUES (
            p_folder_id,
            JSON_UNQUOTE(JSON_EXTRACT(current_word, '$.word')),
            JSON_UNQUOTE(JSON_EXTRACT(current_word, '$.phonetic')),
            JSON_UNQUOTE(JSON_EXTRACT(current_word, '$.translation')),
            JSON_UNQUOTE(JSON_EXTRACT(current_word, '$.example')),
            JSON_UNQUOTE(JSON_EXTRACT(current_word, '$.language')),
            JSON_UNQUOTE(JSON_EXTRACT(current_word, '$.difficulty')),
            JSON_UNQUOTE(JSON_EXTRACT(current_word, '$.source'))
        );
        
        SET i = i + 1;
    END WHILE;
    
    -- 更新文件夹词汇数量
    UPDATE folder_structure 
    SET word_count = (SELECT COUNT(*) FROM vocabulary WHERE folder_id = p_folder_id)
    WHERE id = p_folder_id;
END //
DELIMITER ;

-- 存储过程2: 更新学习进度
DELIMITER //
CREATE PROCEDURE sp_update_learning_progress(
    IN p_user_id VARCHAR(50),
    IN p_vocabulary_id INT,
    IN p_is_correct BOOLEAN
)
BEGIN
    -- 插入或更新学习记录
    INSERT INTO learning_progress (
        user_id, vocabulary_id, review_count, 
        correct_count, wrong_count, last_review_date
    ) VALUES (
        p_user_id, p_vocabulary_id, 1,
        IF(p_is_correct, 1, 0),
        IF(p_is_correct, 0, 1),
        NOW()
    )
    ON DUPLICATE KEY UPDATE
        review_count = review_count + 1,
        correct_count = correct_count + IF(p_is_correct, 1, 0),
        wrong_count = wrong_count + IF(p_is_correct, 0, 1),
        last_review_date = NOW(),
        mastery_level = CASE
            WHEN correct_count >= 5 THEN 'mastered'
            WHEN correct_count >= 3 THEN 'familiar'
            WHEN review_count >= 1 THEN 'learning'
            ELSE 'new'
        END;
END //
DELIMITER ;

-- ============================================
-- 示例数据（可选）
-- ============================================

-- 插入示例词汇
INSERT INTO vocabulary (folder_id, word, phonetic, translation, example_sentence, language, difficulty, source) VALUES
('kaoyan', 'abandon', '/əˈbændən/', 'v. 放弃；抛弃', 'They had to abandon the car and walk.', 'en', 'intermediate', '考研大纲'),
('kaoyan', 'ability', '/əˈbɪləti/', 'n. 能力；才能', 'She has the ability to solve complex problems.', 'en', 'beginner', '考研大纲'),
('cet4', 'academic', '/ˌækəˈdemɪk/', 'adj. 学术的；理论的', 'He has a strong academic background.', 'en', 'intermediate', '四级词汇'),
('cet4', 'accept', '/əkˈsept/', 'v. 接受；承认', 'I accept your apology.', 'en', 'beginner', '四级词汇');

COMMIT;

-- ============================================
-- 查询示例
-- ============================================
/*
-- 查询文件夹下所有词汇
SELECT * FROM v_vocabulary_detail WHERE folder_id = 'kaoyan' LIMIT 20;

-- 查询需要复习的词汇
SELECT * FROM v_vocabulary_detail 
WHERE next_review_date <= NOW() 
ORDER BY next_review_date 
LIMIT 20;

-- 查询文件夹统计
SELECT * FROM v_folder_stats;

-- 搜索词汇
SELECT * FROM vocabulary 
WHERE MATCH(word, translation, example_sentence) AGAINST('abandon' IN NATURAL LANGUAGE MODE);
*/

-- ============================================
-- 表6: 打字练习记录表 (typing_practice_sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS typing_practice_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '练习记录ID',
    user_id VARCHAR(50) DEFAULT 'default_user' COMMENT '用户ID',
    mode ENUM('word', 'sentence', 'paragraph', 'article', 'vocabulary') NOT NULL COMMENT '练习模式',
    difficulty ENUM('easy', 'medium', 'hard', 'expert') NOT NULL COMMENT '难度等级',
    words_typed INT NOT NULL DEFAULT 0 COMMENT '打字单词数',
    chars_typed INT NOT NULL DEFAULT 0 COMMENT '打字字符数',
    errors INT NOT NULL DEFAULT 0 COMMENT '错误次数',
    wpm DECIMAL(6,2) NOT NULL DEFAULT 0 COMMENT '每分钟字数',
    accuracy DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '准确率(%)',
    duration_seconds INT NOT NULL DEFAULT 0 COMMENT '用时(秒)',
    practice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '练习时间',
    INDEX idx_user (user_id),
    INDEX idx_mode (mode),
    INDEX idx_date (practice_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打字练习会话记录表';

-- ============================================
-- 表7: 打字错误词汇表 (typing_error_words)
-- ============================================
CREATE TABLE IF NOT EXISTS typing_error_words (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '错误记录ID',
    session_id INT NOT NULL COMMENT '所属练习会话ID',
    user_id VARCHAR(50) DEFAULT 'default_user' COMMENT '用户ID',
    word VARCHAR(200) NOT NULL COMMENT '错误单词',
    error_count INT DEFAULT 1 COMMENT '错误次数',
    added_to_vocabulary BOOLEAN DEFAULT FALSE COMMENT '是否已加入词汇本',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_session (session_id),
    INDEX idx_user (user_id),
    INDEX idx_word (word),
    FOREIGN KEY (session_id) REFERENCES typing_practice_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打字错误词汇记录表';

-- ============================================
-- 表8: 打字成就表 (typing_achievements)
-- ============================================
CREATE TABLE IF NOT EXISTS typing_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '成就ID',
    user_id VARCHAR(50) DEFAULT 'default_user' COMMENT '用户ID',
    achievement_id VARCHAR(50) NOT NULL COMMENT '成就标识',
    achievement_name VARCHAR(100) NOT NULL COMMENT '成就名称',
    achievement_desc VARCHAR(200) COMMENT '成就描述',
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '解锁时间',
    INDEX idx_user (user_id),
    UNIQUE KEY unique_user_achievement (user_id, achievement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打字成就记录表';

-- ============================================
-- 视图3: 打字练习统计视图
-- ============================================
CREATE OR REPLACE VIEW v_typing_stats AS
SELECT 
    user_id,
    COUNT(*) as total_sessions,
    SUM(words_typed) as total_words,
    SUM(chars_typed) as total_chars,
    SUM(errors) as total_errors,
    MAX(wpm) as best_wpm,
    MAX(accuracy) as best_accuracy,
    AVG(wpm) as avg_wpm,
    AVG(accuracy) as avg_accuracy,
    MIN(practice_date) as first_practice,
    MAX(practice_date) as last_practice
FROM typing_practice_sessions
GROUP BY user_id;

-- ============================================
-- 存储过程3: 保存打字练习记录
-- ============================================
DELIMITER //
CREATE PROCEDURE sp_save_typing_session(
    IN p_user_id VARCHAR(50),
    IN p_mode VARCHAR(20),
    IN p_difficulty VARCHAR(20),
    IN p_words_typed INT,
    IN p_chars_typed INT,
    IN p_errors INT,
    IN p_wpm DECIMAL(6,2),
    IN p_accuracy DECIMAL(5,2),
    IN p_duration INT,
    IN p_error_words JSON,
    OUT p_session_id INT
)
BEGIN
    -- 插入练习记录
    INSERT INTO typing_practice_sessions 
    (user_id, mode, difficulty, words_typed, chars_typed, errors, wpm, accuracy, duration_seconds)
    VALUES 
    (p_user_id, p_mode, p_difficulty, p_words_typed, p_chars_typed, p_errors, p_wpm, p_accuracy, p_duration);
    
    SET p_session_id = LAST_INSERT_ID();
    
    -- 插入错误词汇（如果有）
    IF p_error_words IS NOT NULL AND JSON_LENGTH(p_error_words) > 0 THEN
        INSERT INTO typing_error_words (session_id, user_id, word)
        SELECT p_session_id, p_user_id, JSON_UNQUOTE(JSON_EXTRACT(p_error_words, CONCAT('$[', idx, ']')))
        FROM (
            SELECT 0 AS idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
            UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
        ) AS numbers
        WHERE idx < JSON_LENGTH(p_error_words);
    END IF;
END //
DELIMITER ;
