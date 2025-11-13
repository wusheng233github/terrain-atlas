// TODO: 启用
const 已加载撤销重做 = true;

const 操作事件监听 = [];

// === 核心架构 ===

// 1. 操作基类 - 所有编辑操作的抽象
class 编辑操作 {
    constructor(描述 = '操作') {
        this.描述 = 描述;
        this.时间戳 = Date.now();
    }

    执行() { /* 子类实现 */ }
    撤销() { /* 子类实现 */ }

    // 默认重做就是执行
    重做() { this.执行(); }
}

// 2. 历史记录管理器 - 单例模式
const 历史记录 = {
    记录: [],
    指针: -1,
    最大容量: 100,

    // 添加新操作
    记录操作(操作) {
        // 清除指针后的记录
        if (this.指针 < this.记录.length - 1) {
            this.记录 = this.记录.slice(0, this.指针 + 1);
        }

        this.记录.push(操作);

        // 容量控制
        if (this.记录.length > this.最大容量) {
            this.记录.shift();
        }

        this.指针 = this.记录.length - 1;
        this.更新状态();
    },

    // 撤销
    撤销() {
        if (this.指针 >= 0) {
            this.记录[this.指针].撤销();
            this.指针--;
            this.更新状态();
            return true;
        }
        return false;
    },

    // 重做
    重做() {
        if (this.指针 < this.记录.length - 1) {
            this.指针++;
            this.记录[this.指针].重做();
            this.更新状态();
            return true;
        }
        return false;
    },

    // 清空历史
    清空() {
        this.记录 = [];
        this.指针 = -1;
        this.更新状态();
    },

    // 状态更新钩子
    更新状态() {
        // 可扩展：触发状态变化事件
        if (typeof this.状态变化回调 === 'function') {
            this.状态变化回调();
        }
    },

    // 状态查询
    可以撤销() { return this.指针 >= 0; },
    可以重做() { return this.指针 < this.记录.length - 1; }
};

// 3. 操作执行器 - 统一的操作入口
const 操作执行器 = {
    执行(操作) {
        操作.执行();
        历史记录.记录操作(操作);
        return 操作;
    },

    批量执行(操作数组, 描述 = '批量操作') {
        const 批量操作 = new 批量操作类(操作数组, 描述);
        return this.执行(批量操作);
    }
};

class 批量操作类 extends 编辑操作 {
    constructor(操作列表, 描述) {
        super(描述);
        this.操作列表 = 操作列表;
    }

    执行() {
        this.操作列表.forEach(操作 => 操作.执行());
    }

    撤销() {
        // 反向撤销
        for (let i = this.操作列表.length - 1; i >= 0; i--) {
            this.操作列表[i].撤销();
        }
    }
}

// 操作注册表 - 用于动态创建操作
const 操作注册表 = {};

function 注册操作类型(类型名, 操作类) {
    操作注册表[类型名] = 操作类;
}

function 创建操作(类型名, ...参数) {
    const 操作类 = 操作注册表[类型名];
    if (!操作类) throw new Error(`未注册的操作类型: ${类型名}`);
    return new 操作类(...参数);
}

// === 快捷键集成 ===
快捷键管理器.批量注册快捷键({
    'z': {
        回调: () => 历史记录.撤销(),
        描述: '撤销'
    },
    'y': {
        回调: () => 历史记录.重做(),
        描述: '重做'
    }
});

function 执行操作(类型名, ...参数) {
    const 操作 = 创建操作(类型名, ...参数);
    return 操作执行器.执行(操作);
}