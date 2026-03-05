class SecurityUtils {
    static async hashPassword(password, salt = null) {
        if (!salt) {
            salt = crypto.getRandomValues(new Uint8Array(16));
        }

        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );

        const exportedKey = await crypto.subtle.exportKey('raw', key);
        const saltBase64 = btoa(String.fromCharCode(...salt));
        const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));

        return `${saltBase64}:${hashBase64}`;
    }

    static async verifyPassword(password, storedHash) {
        try {
            const [saltBase64, hashBase64] = storedHash.split(':');
            const salt = new Uint8Array(atob(saltBase64).split('').map(c => c.charCodeAt(0)));
            const computedHash = await this.hashPassword(password, salt);
            return computedHash === storedHash;
        } catch (error) {
            console.error('密码验证失败:', error);
            return false;
        }
    }

    static generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim();
    }

    static validateUsername(username) {
        if (!username || username.length < 3 || username.length > 20) {
            return { valid: false, message: '用户名长度必须在3-20个字符之间' };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { valid: false, message: '用户名只能包含字母、数字和下划线' };
        }
        return { valid: true };
    }

    static validatePassword(password) {
        if (!password || password.length < 6 || password.length > 50) {
            return { valid: false, message: '密码长度必须在6-50个字符之间' };
        }
        return { valid: true };
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return { valid: false, message: '请输入有效的邮箱地址' };
        }
        return { valid: true };
    }
}

class AuthSystem {
    static STORAGE_KEY = 'auth_users';
    static SESSION_KEY = 'auth_session';
    static LOGIN_HISTORY_KEY = 'auth_login_history';

    static users = {};

    static rolePermissions = {
        'admin': {
            label: '管理员',
            color: '#dc2626',
            permissions: [
                'view', 'add', 'edit', 'delete', 'export', 'import',
                'manage_users', 'manage_students', 'manage_folders',
                'view_statistics', 'system_settings', 'data_backup'
            ]
        },
        'teacher': {
            label: '教师',
            color: '#2563eb',
            permissions: [
                'view', 'add', 'edit', 'export', 'import',
                'manage_students', 'manage_folders', 'view_statistics'
            ]
        },
        'student': {
            label: '学生',
            color: '#16a34a',
            permissions: [
                'view', 'learn', 'practice', 'export_own'
            ]
        },
        'guest': {
            label: '访客',
            color: '#9ca3af',
            permissions: [
                'view'
            ]
        }
    };

    static async initialize() {
        await this.loadUsersFromStorage();
        await this.initializeDefaultUsers();
    }

    static async initializeDefaultUsers() {
        const defaultUsers = [
            {
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                displayName: '系统管理员',
                email: 'admin@languagehub.com',
                avatar: '👑'
            },
            {
                username: 'teacher',
                password: 'teacher123',
                role: 'teacher',
                displayName: '王老师',
                email: 'teacher@languagehub.com',
                avatar: '👨‍🏫'
            },
            {
                username: 'student',
                password: 'student123',
                role: 'student',
                displayName: '张同学',
                email: 'student@languagehub.com',
                avatar: '👨‍🎓'
            },
            {
                username: 'guest',
                password: 'guest123',
                role: 'guest',
                displayName: '访客',
                email: 'guest@languagehub.com',
                avatar: '👤'
            }
        ];

        for (const userData of defaultUsers) {
            if (!this.users[userData.username]) {
                await this.register(userData);
            }
        }
    }

    static async login(username, password, rememberMe = false) {
        try {
            username = SecurityUtils.sanitizeInput(username);
            password = SecurityUtils.sanitizeInput(password);

            const usernameValidation = SecurityUtils.validateUsername(username);
            if (!usernameValidation.valid) {
                return { success: false, message: usernameValidation.message };
            }

            const user = this.users[username];

            if (!user) {
                return { success: false, message: '用户名或密码错误' };
            }

            const isValidPassword = await SecurityUtils.verifyPassword(password, user.passwordHash);
            if (!isValidPassword) {
                return { success: false, message: '用户名或密码错误' };
            }

            user.lastLogin = new Date().toISOString();
            user.loginCount = (user.loginCount || 0) + 1;

            const session = {
                token: SecurityUtils.generateToken(),
                username: user.username,
                role: user.role,
                displayName: user.displayName,
                email: user.email,
                avatar: user.avatar,
                permissions: user.permissions,
                loginTime: user.lastLogin,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

            if (rememberMe) {
                localStorage.setItem('savedUsername', username);
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('savedUsername');
                localStorage.removeItem('rememberMe');
            }

            await this.saveLoginHistory(session);
            await this.saveUsersToStorage();

            return { success: true, user: session };
        } catch (error) {
            console.error('登录失败:', error);
            return { success: false, message: '登录过程中发生错误' };
        }
    }

    static logout() {
        try {
            sessionStorage.removeItem(this.SESSION_KEY);
            window.location.href = 'login.html';
        } catch (error) {
            console.error('登出失败:', error);
        }
    }

    static getCurrentUser() {
        try {
            const sessionStr = sessionStorage.getItem(this.SESSION_KEY);
            if (!sessionStr) return null;

            const session = JSON.parse(sessionStr);

            if (new Date(session.expiresAt) < new Date()) {
                this.logout();
                return null;
            }

            return session;
        } catch (error) {
            console.error('获取当前用户失败:', error);
            return null;
        }
    }

    static isLoggedIn() {
        return this.getCurrentUser() !== null;
    }

    static hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;

        if (user.role === 'admin' || user.permissions.includes('all')) {
            return true;
        }

        return user.permissions.includes(permission);
    }

    static hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    }

    static getRoleInfo(role) {
        return this.rolePermissions[role] || null;
    }

    static async saveLoginHistory(session) {
        try {
            let history = JSON.parse(localStorage.getItem(this.LOGIN_HISTORY_KEY) || '[]');

            history.unshift({
                username: session.username,
                displayName: session.displayName,
                role: session.role,
                loginTime: session.loginTime,
                userAgent: navigator.userAgent
            });

            if (history.length > 20) {
                history = history.slice(0, 20);
            }

            localStorage.setItem(this.LOGIN_HISTORY_KEY, JSON.stringify(history));
        } catch (error) {
            console.error('保存登录历史失败:', error);
        }
    }

    static getLoginHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.LOGIN_HISTORY_KEY) || '[]');
        } catch (error) {
            console.error('获取登录历史失败:', error);
            return [];
        }
    }

    static requireLogin() {
        if (!this.isLoggedIn()) {
            const currentUrl = window.location.href;
            localStorage.setItem('redirectAfterLogin', currentUrl);
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    static requireRole(role) {
        if (!this.requireLogin()) return false;

        if (!this.hasRole(role)) {
            alert('您没有权限访问此页面');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    static requirePermission(permission) {
        if (!this.requireLogin()) return false;

        if (!this.hasPermission(permission)) {
            alert('您没有权限执行此操作');
            return false;
        }
        return true;
    }

    static async register(userData) {
        try {
            userData.username = SecurityUtils.sanitizeInput(userData.username);
            userData.password = SecurityUtils.sanitizeInput(userData.password);
            userData.displayName = SecurityUtils.sanitizeInput(userData.displayName || userData.username);
            userData.email = SecurityUtils.sanitizeInput(userData.email || '');

            const usernameValidation = SecurityUtils.validateUsername(userData.username);
            if (!usernameValidation.valid) {
                return { success: false, message: usernameValidation.message };
            }

            if (this.users[userData.username]) {
                return { success: false, message: '用户名已被使用' };
            }

            const passwordValidation = SecurityUtils.validatePassword(userData.password);
            if (!passwordValidation.valid) {
                return { success: false, message: passwordValidation.message };
            }

            if (userData.email) {
                const emailValidation = SecurityUtils.validateEmail(userData.email);
                if (!emailValidation.valid) {
                    return { success: false, message: emailValidation.message };
                }
            }

            const role = userData.role || 'student';
            const passwordHash = await SecurityUtils.hashPassword(userData.password);

            const newUser = {
                username: userData.username,
                passwordHash: passwordHash,
                displayName: userData.displayName,
                email: userData.email,
                role: role,
                avatar: userData.avatar || '👨‍🎓',
                permissions: this.rolePermissions[role].permissions,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                loginCount: 0
            };

            this.users[userData.username] = newUser;
            await this.saveUsersToStorage();

            return {
                success: true,
                message: '注册成功',
                user: {
                    username: newUser.username,
                    displayName: newUser.displayName,
                    role: newUser.role
                }
            };
        } catch (error) {
            console.error('注册失败:', error);
            return { success: false, message: '注册过程中发生错误' };
        }
    }

    static checkUsernameExists(username) {
        username = SecurityUtils.sanitizeInput(username);
        return {
            exists: !!this.users[username],
            username: username
        };
    }

    static async addUser(userData) {
        if (!this.hasRole('admin')) {
            return { success: false, message: '仅管理员可以添加用户' };
        }

        if (this.users[userData.username]) {
            return { success: false, message: '用户名已存在' };
        }

        userData.passwordHash = await SecurityUtils.hashPassword(userData.password);
        delete userData.password;

        this.users[userData.username] = {
            ...userData,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };

        await this.saveUsersToStorage();

        return { success: true, message: '用户添加成功' };
    }

    static async deleteUser(username) {
        if (!this.hasRole('admin')) {
            return { success: false, message: '仅管理员可以删除用户' };
        }

        if (!this.users[username]) {
            return { success: false, message: '用户不存在' };
        }

        delete this.users[username];
        await this.saveUsersToStorage();

        return { success: true, message: '用户删除成功' };
    }

    static async updateUser(username, updates) {
        const user = this.users[username];
        if (!user) {
            return { success: false, message: '用户不存在' };
        }

        const currentUser = this.getCurrentUser();
        if (currentUser.username !== username && !this.hasRole('admin')) {
            return { success: false, message: '无权限修改其他用户信息' };
        }

        if (updates.password) {
            updates.passwordHash = await SecurityUtils.hashPassword(updates.password);
            delete updates.password;
        }

        Object.assign(user, updates);
        await this.saveUsersToStorage();

        return { success: true, message: '用户信息更新成功' };
    }

    static getAllUsers() {
        if (!this.hasRole('admin')) {
            return { success: false, message: '仅管理员可以查看所有用户' };
        }

        return {
            success: true,
            users: Object.values(this.users).map(user => ({
                username: user.username,
                role: user.role,
                displayName: user.displayName,
                email: user.email,
                avatar: user.avatar,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                loginCount: user.loginCount
            }))
        };
    }

    static async changePassword(username, oldPassword, newPassword) {
        const user = this.users[username];

        if (!user) {
            return { success: false, message: '用户不存在' };
        }

        const isValidOldPassword = await SecurityUtils.verifyPassword(oldPassword, user.passwordHash);
        if (!isValidOldPassword) {
            return { success: false, message: '原密码错误' };
        }

        user.passwordHash = await SecurityUtils.hashPassword(newPassword);
        await this.saveUsersToStorage();

        return { success: true, message: '密码修改成功' };
    }

    static async saveUsersToStorage() {
        try {
            const usersData = {};
            Object.keys(this.users).forEach(key => {
                usersData[key] = { ...this.users[key] };
            });
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usersData));
        } catch (error) {
            console.error('保存用户数据失败:', error);
        }
    }

    static async loadUsersFromStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const usersData = JSON.parse(stored);
                this.users = { ...this.users, ...usersData };
            }
        } catch (error) {
            console.error('加载用户数据失败:', error);
        }
    }

    static getStatistics() {
        if (!this.hasPermission('view_statistics')) {
            return { success: false, message: '无权限查看统计' };
        }

        const users = Object.values(this.users);
        const loginHistory = this.getLoginHistory();

        return {
            success: true,
            data: {
                totalUsers: users.length,
                activeUsers: users.filter(u => u.lastLogin).length,
                usersByRole: {
                    admin: users.filter(u => u.role === 'admin').length,
                    teacher: users.filter(u => u.role === 'teacher').length,
                    student: users.filter(u => u.role === 'student').length,
                    guest: users.filter(u => u.role === 'guest').length
                },
                recentLogins: loginHistory.slice(0, 10),
                todayLogins: loginHistory.filter(h => {
                    const today = new Date().toDateString();
                    return new Date(h.loginTime).toDateString() === today;
                }).length
            }
        };
    }
}

AuthSystem.initialize();

function requireAuth() {
    return AuthSystem.requireLogin();
}

function requireRole(role) {
    return AuthSystem.requireRole(role);
}

function requirePermission(permission) {
    return AuthSystem.requirePermission(permission);
}

function getCurrentUser() {
    return AuthSystem.getCurrentUser();
}

function hasPermission(permission) {
    return AuthSystem.hasPermission(permission);
}

function logout() {
    if (confirm('确定要退出登录吗？')) {
        AuthSystem.logout();
    }
}
