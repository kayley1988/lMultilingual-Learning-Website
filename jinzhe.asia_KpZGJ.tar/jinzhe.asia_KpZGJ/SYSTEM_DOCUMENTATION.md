# JZ多语言学习助手 - 系统文档

## 项目概述

JZ多语言学习助手是一个基于Web的多语言学习和阅读辅助平台，提供词汇管理、学习进度跟踪、语音合成等功能。系统采用模块化架构，使用现代JavaScript类进行组织，确保代码的可维护性和可扩展性。

## 核心模块

### 1. 认证系统 (auth-system.js)

#### SecurityUtils 类
提供密码加密、输入验证和安全工具方法。

**主要方法:**
- `hashPassword(password, salt)` - 使用PBKDF2算法加密密码
- `verifyPassword(password, storedHash)` - 验证密码
- `generateToken()` - 生成安全令牌
- `sanitizeInput(input)` - 清理输入防止XSS攻击
- `validateUsername(username)` - 验证用户名格式
- `validatePassword(password)` - 验证密码强度
- `validateEmail(email)` - 验证邮箱格式

#### AuthSystem 类
管理用户认证、会话和权限控制。

**主要方法:**
- `initialize()` - 初始化认证系统
- `login(username, password, rememberMe)` - 用户登录
- `logout()` - 用户登出
- `register(userData)` - 用户注册
- `getCurrentUser()` - 获取当前登录用户
- `isLoggedIn()` - 检查登录状态
- `hasPermission(permission)` - 检查权限
- `hasRole(role)` - 检查角色
- `requireLogin()` - 要求登录
- `requireRole(role)` - 要求特定角色
- `requirePermission(permission)` - 要求特定权限
- `addUser(userData)` - 添加用户(管理员)
- `deleteUser(username)` - 删除用户(管理员)
- `updateUser(username, updates)` - 更新用户信息
- `changePassword(username, oldPassword, newPassword)` - 修改密码
- `getStatistics()` - 获取统计信息

**角色系统:**
- `admin` - 管理员，拥有所有权限
- `teacher` - 教师，可管理学生和文件夹
- `student` - 学生，可学习和练习
- `guest` - 访客，仅查看权限

**存储键:**
- `auth_users` - 用户数据
- `auth_session` - 会话信息
- `auth_login_history` - 登录历史

### 2. 配置管理 (config-manager.js)

#### ConfigManager 类
统一管理应用程序配置。

**主要方法:**
- `initialize()` - 初始化配置
- `loadConfig()` - 从localStorage加载配置
- `saveConfig()` - 保存配置到localStorage
- `get(key)` - 获取配置值(支持嵌套路径)
- `set(key, value)` - 设置配置值
- `update(updates)` - 批量更新配置
- `reset()` - 重置为默认配置
- `applyConfig()` - 应用配置到UI
- `exportConfig()` - 导出配置
- `importConfig(configString)` - 导入配置

**默认配置:**
```javascript
{
    theme: 'maillard',
    language: 'zh-CN',
    fontSize: 16,
    speechRate: 1.0,
    speechPitch: 1.0,
    autoPlay: false,
    showPronunciation: true,
    showRomanization: true,
    enableNotifications: true,
    enableSoundEffects: true,
    mysql: {
        enabled: false,
        apiUrl: '/api/learning',
        autoSync: true,
        syncInterval: 30000
    },
    ui: {
        sidebarWidth: 320,
        showSidebar: true,
        compactMode: false,
        darkMode: false
    },
    learning: {
        dailyGoal: 20,
        reviewInterval: 7,
        difficulty: 'medium'
    }
}
```

#### LanguageConfig 类
管理语言配置和检测。

**主要方法:**
- `getLanguage(code)` - 获取语言配置
- `getAllLanguages()` - 获取所有语言
- `getLanguageCodes()` - 获取语言代码列表
- `getLanguageNames()` - 获取语言名称列表
- `detectLanguage(text)` - 自动检测文本语言

**支持的语言:**
英语、日语、韩语、中文、法语、德语、西班牙语、意大利语、葡萄牙语、俄语、阿拉伯语、印地语、泰语、越南语、土耳其语、波兰语、荷兰语、瑞典语、丹麦语、挪威语、哈萨克语、乌尔都语

#### VoiceManager 类
管理语音合成功能。

**主要方法:**
- `initialize()` - 初始化语音系统
- `cacheVoices()` - 缓存可用语音
- `getVoicesForLanguage(langCode)` - 获取指定语言的语音
- `getBestVoice(langCode)` - 获取最佳语音
- `speak(text, langCode, options)` - 朗读文本
- `stop()` - 停止朗读
- `pause()` - 暂停朗读
- `resume()` - 恢复朗读

#### NotificationManager 类
管理浏览器通知。

**主要方法:**
- `initialize()` - 初始化通知系统
- `requestPermission()` - 请求通知权限
- `show(title, options)` - 显示通知
- `schedule(title, options, delay)` - 定时显示通知

### 3. 词汇管理 (vocabulary-manager.js)

#### VocabularyManager 类
管理词汇和文件夹结构。

**主要方法:**
- `initialize()` - 初始化词汇管理器
- `addWord(wordData)` - 添加单词
- `updateWord(wordId, updates)` - 更新单词
- `deleteWord(wordId)` - 删除单词
- `getWord(wordId)` - 获取单词
- `getWordsByFolder(folderId)` - 获取文件夹中的单词
- `searchWords(query)` - 搜索单词
- `addFolder(folderData)` - 添加文件夹
- `updateFolder(folderId, updates)` - 更新文件夹
- `deleteFolder(folderId)` - 删除文件夹
- `getFolderTree()` - 获取文件夹树
- `importWords(words)` - 导入单词
- `exportWords()` - 导出单词
- `extractWordsFromText(text)` - 从文本提取单词

**存储键:**
- `vocabulary` - 词汇数据
- `folder_structure` - 文件夹结构
- `pending_extracted_words` - 待提取的单词

### 4. 学习管理 (learning-manager.js)

#### LearningManager 类
管理学习进度和游戏模式。

**主要方法:**
- `initialize()` - 初始化学习管理器
- `loadProgress()` - 加载学习进度
- `saveProgress()` - 保存学习进度
- `startLearning(bookId)` - 开始学习
- `markWord(wordId, status)` - 标记单词状态
- `nextWord()` - 下一个单词
- `previousWord()` - 上一个单词
- `getStatistics()` - 获取学习统计
- `startGameMode()` - 开始游戏模式
- `startDictationMode()` - 开始听写模式
- `addWordRelation(wordId1, wordId2, relation)` - 添加单词关系
- `importProgress(data)` - 导入进度
- `exportProgress()` - 导出进度

**学习状态:**
- `mastered` - 已掌握
- `difficult` - 困难
- `fuzzy` - 模糊

**学习模式:**
- `card` - 卡片模式
- `game` - 游戏模式
- `dictation` - 听写模式

**存储键:**
- `learning_progress` - 学习进度
- `word_relations` - 单词关系

### 5. 错误处理 (error-handler.js)

#### ErrorHandler 类
统一错误处理和日志记录。

**主要方法:**
- `handle(error, context)` - 处理错误
- `notifyUser(error, context)` - 通知用户
- `getUserFriendlyMessage(error, context)` - 获取用户友好的错误消息
- `logToConsole(errorInfo)` - 记录到控制台
- `saveErrorLog()` - 保存错误日志
- `loadErrorLog()` - 加载错误日志
- `getErrorLog()` - 获取错误日志
- `clearErrorLog()` - 清除错误日志
- `exportErrorLog()` - 导出错误日志
- `wrapAsync(fn, context)` - 包装异步函数
- `wrap(fn, context)` - 包装同步函数

**错误类型:**
- `NetworkError` - 网络错误
- `TypeError` - 类型错误
- `ReferenceError` - 引用错误
- `SyntaxError` - 语法错误
- `AuthenticationError` - 认证错误
- `PermissionError` - 权限错误
- `ValidationError` - 验证错误

#### UIManager 类
UI组件和用户交互管理。

**主要方法:**
- `initialize()` - 初始化UI管理器
- `showToast(message, type, duration)` - 显示提示消息
- `showModal(content, options)` - 显示模态框
- `closeModal()` - 关闭模态框
- `showLoading(text)` - 显示加载遮罩
- `hideLoading()` - 隐藏加载遮罩
- `showConfirm(message, onConfirm, onCancel)` - 显示确认对话框
- `showAlert(message, type)` - 显示警告对话框
- `showForm(formConfig, onSubmit)` - 显示表单

**UI组件:**
- Toast提示
- Modal模态框
- Loading加载遮罩
- Form表单

## 样式系统 (unified-theme.css)

### CSS变量
定义了完整的主题系统，包括颜色、间距、圆角、阴影等。

**主要颜色:**
- `--maillard-brown` - 美拉德棕色
- `--maillard-coffee` - 咖啡色
- `--maillard-cream` - 奶油色
- `--maillard-caramel` - 焦糖色
- `--maillard-toast` - 吐司色
- `--maillard-latte` - 拿铁色

**功能类:**
- `.glass-card` - 毛玻璃卡片
- `.glass-card-solid` - 实心毛玻璃卡片
- `.apple-navbar` - 苹果风格导航栏
- `.btn` - 按钮基础样式
- `.btn-primary` - 主要按钮
- `.btn-secondary` - 次要按钮
- `.btn-danger` - 危险按钮
- `.btn-success` - 成功按钮
- `.input` - 输入框
- `.select` - 下拉选择
- `.card` - 卡片
- `.badge` - 徽章
- `.alert` - 警告
- `.modal` - 模态框
- `.spinner` - 加载动画

**响应式设计:**
- 平板: `max-width: 768px`
- 手机: `max-width: 480px`

**暗黑模式:**
通过 `[data-theme="dark"]` 属性支持暗黑主题。

## 安全特性

1. **密码安全**
   - 使用PBKDF2算法进行密码哈希
   - 100,000次迭代
   - SHA-256哈希算法
   - 随机盐值

2. **输入验证**
   - 用户名验证(3-20字符,字母数字下划线)
   - 密码验证(6-50字符)
   - 邮箱验证
   - XSS防护

3. **会话管理**
   - 安全令牌生成
   - 会话过期控制(24小时)
   - 登录历史记录

4. **权限控制**
   - 基于角色的访问控制(RBAC)
   - 细粒度权限管理
   - 路由守卫

## 数据存储

所有数据使用localStorage进行持久化存储:

| 键名 | 描述 |
|------|------|
| `auth_users` | 用户数据 |
| `auth_session` | 会话信息 |
| `auth_login_history` | 登录历史 |
| `app_config` | 应用配置 |
| `vocabulary` | 词汇数据 |
| `folder_structure` | 文件夹结构 |
| `pending_extracted_words` | 待提取单词 |
| `learning_progress` | 学习进度 |
| `word_relations` | 单词关系 |
| `error_log` | 错误日志 |
| `notification_permission` | 通知权限 |

## 使用示例

### 用户认证
```javascript
// 登录
const result = await AuthSystem.login('admin', 'admin123', true);
if (result.success) {
    console.log('登录成功', result.user);
}

// 检查权限
if (AuthSystem.hasPermission('view_statistics')) {
    // 显示统计数据
}

// 登出
AuthSystem.logout();
```

### 配置管理
```javascript
// 获取配置
const fontSize = ConfigManager.get('fontSize');

// 设置配置
ConfigManager.set('speechRate', 1.5);

// 批量更新
ConfigManager.update({
    theme: 'dark',
    fontSize: 18
});
```

### 词汇管理
```javascript
// 添加单词
const word = VocabularyManager.addWord({
    word: 'hello',
    pronunciation: '/həˈloʊ/',
    translation: '你好',
    language: 'en'
});

// 搜索单词
const results = VocabularyManager.searchWords('hello');

// 导出单词
const exported = VocabularyManager.exportWords();
```

### 学习管理
```javascript
// 开始学习
LearningManager.startLearning('book-1');

// 标记单词
LearningManager.markWord('word-123', 'mastered');

// 获取统计
const stats = LearningManager.getStatistics();
```

### 错误处理
```javascript
// 包装异步函数
const result = await ErrorHandler.wrapAsync(async () => {
    // 可能出错的代码
}, { context: 'user-action' });

// 显示提示
UIManager.showToast('操作成功', 'success');

// 显示确认对话框
UIManager.showConfirm('确定删除吗?', () => {
    // 确认操作
}, () => {
    // 取消操作
});
```

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**必需API:**
- Web Crypto API
- Web Speech API
- LocalStorage
- Notification API

## 开发建议

1. **模块化开发**
   - 每个功能模块独立
   - 使用类进行封装
   - 避免全局变量污染

2. **错误处理**
   - 使用ErrorHandler包装所有可能出错的函数
   - 提供用户友好的错误提示
   - 记录详细的错误日志

3. **性能优化**
   - 使用localStorage缓存数据
   - 避免频繁的DOM操作
   - 使用事件委托

4. **安全考虑**
   - 所有用户输入必须验证
   - 敏感操作需要权限检查
   - 密码等敏感信息加密存储

## 更新日志

### v2.0.0 (2026-03-01)
- 重构认证系统，实现密码加密
- 创建统一的配置管理模块
- 重构词汇管理系统
- 优化单词学习系统
- 完善错误处理和用户提示
- 统一样式系统，支持响应式设计
- 优化外部依赖，减少不必要的库加载

### v1.0.0
- 初始版本
- 基本的词汇管理功能
- 简单的学习系统

## 许可证

本项目仅供学习和研究使用。

## 联系方式

如有问题或建议，请联系开发团队。
