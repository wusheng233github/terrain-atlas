// 全局变量
let canvas = document.getElementById('previewCanvas');
let 详细信息弹窗 = document.getElementById('infoPopup');
let 信息弹窗切换按钮 = document.getElementById('infoBtn');
let 底部面板左侧 = document.getElementById('bottomPanelLeft');
let 底部面板右侧 = document.getElementById('bottomPanelRight');
let ctx = canvas.getContext('2d');
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let 正在拖动画面 = false;
let lastX = 0;
let lastY = 0;
let 信息弹窗是否显示 = true;
let 背景颜色 = ['black', 'white', '#808080'];
let 当前背景颜色编号 = 0;
let 画面更新事件监听 = []; // 无参数
const moveStep = 30;
const zoomStep = 0.1;

const 快捷键管理器 = {
    回调列表: {},
    注册快捷键: function (按键码列表, 回调, 描述 = '') {
        if (typeof 按键码列表 === 'string') {
            按键码列表 = [按键码列表];
        }
        按键码列表.forEach(按键码 => {
            this.回调列表[按键码.toLowerCase()] = {
                回调: 回调,
                描述: 描述
            };
        });
    },
    按键按下: function (按键码) {
        按键码 = 按键码.toLowerCase();
        if (this.回调列表[按键码]) {
            this.回调列表[按键码].回调();
            return true;
        }
        return false;
    },
    批量注册快捷键: function (回调列表) {
        for (let 按键码 in 回调列表) {
            let 配置 = 回调列表[按键码];

            if (typeof 配置 === 'string') {
                if (this.回调列表[配置]) {
                    配置 = this.回调列表[配置];
                } else {
                    continue;
                }
            } else if (typeof 配置 !== 'object') {
                continue;
            }
            this.注册快捷键(
                按键码,
                配置.回调,
                配置.描述 || ''
            );
        }
    }
};

// 调整Canvas大小以适应窗口
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 48;
}

window.addEventListener('resize', function () {
    resizeCanvas();
});
resizeCanvas();

// 信息按钮事件
信息弹窗切换按钮.addEventListener('click', function () {
    切换信息弹窗();
});

function 设置画面背景(编号) {
    document.querySelectorAll('.bg-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === 编号);
    });
    当前背景颜色编号 = 编号;
    canvas.style.backgroundColor = 背景颜色[编号];
    更新画面();
}

document.querySelectorAll('.bg-btn').forEach((btn, index) => {
    btn.addEventListener('click', function () {
        设置画面背景(index);
    });
});

function 切换背景() {
    设置画面背景((当前背景颜色编号 + 1) % 背景颜色.length);
}

function 切换信息弹窗() {
    信息弹窗是否显示 = !信息弹窗是否显示;
    详细信息弹窗.classList.toggle('active', 信息弹窗是否显示);
    信息弹窗切换按钮.classList.toggle('active', 信息弹窗是否显示);
}

function 重置视图(width, height) {
    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;
    scale = Math.min(scaleX, scaleY, 1);
    offsetX = (canvas.width - width * scale) / 2;
    offsetY = (canvas.height - height * scale) / 2;
}

function 更新画面() {
    触发事件(画面更新事件监听);
}

function 触发事件(监听列表, ...参数) {
    监听列表.forEach(回调 => {
        回调(参数);
    });
}

function 更新信息栏(text) {
    console.log(text);
    document.getElementById('info').textContent = text;
}

canvas.addEventListener('mousedown', function (e) {
    正在拖动画面 = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', function (e) {
    if (!正在拖动画面) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    offsetX += dx;
    offsetY += dy;
    lastX = e.clientX;
    lastY = e.clientY;
    更新画面();
});

canvas.addEventListener('mouseup', function () {
    正在拖动画面 = false;
    canvas.style.cursor = 'move';
});

canvas.addEventListener('mouseleave', function () {
    if (正在拖动画面) {
        正在拖动画面 = false;
        canvas.style.cursor = 'move';
    }
});

canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const mouseX = e.clientX - canvas.getBoundingClientRect().left;
    const mouseY = e.clientY - canvas.getBoundingClientRect().top;
    const imageX = (mouseX - offsetX) / scale;
    const imageY = (mouseY - offsetY) / scale;
    const wheel = e.deltaY < 0 ? 1 : -1;
    const zoom = Math.exp(wheel * zoomIntensity);
    const newScale = scale * zoom;
    if (newScale < 0.1 || newScale > 20) return;
    scale = newScale;
    offsetX = mouseX - imageX * scale;
    offsetY = mouseY - imageY * scale;
    更新画面();
});

// 添加触摸事件支持变量
let 正在触摸 = false;
let 双指距离 = 0;
let 触摸点 = [];

// 触摸开始事件
canvas.addEventListener('touchstart', function (e) {
    正在触摸 = true;

    if (e.touches.length === 1) {
        // 单指触摸 - 准备移动
        const touch = e.touches[0];
        lastX = touch.clientX;
        lastY = touch.clientY;
        canvas.style.cursor = 'grabbing';
    } else if (e.touches.length === 2) {
        // 双指触摸 - 准备缩放
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        双指距离 = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        触摸点 = [
            { clientX: touch1.clientX, clientY: touch1.clientY },
            { clientX: touch2.clientX, clientY: touch2.clientY }
        ];
    }
});

// 触摸移动事件
canvas.addEventListener('touchmove', function (e) {
    if (e.touches.length === 1) {
        // 单指移动
        const touch = e.touches[0];
        const dx = touch.clientX - lastX;
        const dy = touch.clientY - lastY;

        offsetX += dx;
        offsetY += dy;

        lastX = touch.clientX;
        lastY = touch.clientY;
        更新画面();
    } else if (e.touches.length === 2) {
        // 双指缩放
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        // 计算当前两指距离
        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );

        // 计算两指中心点（缩放中心）
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        if (双指距离 > 0) {
            // 计算缩放比例
            const zoomIntensity = 0.1;
            const zoom = currentDistance / 双指距离;
            const scaleChange = (zoom - 1) * zoomIntensity * 10;

            // 转换为图像坐标
            const imageX = (centerX - offsetX) / scale;
            const imageY = (centerY - offsetY) / scale;

            // 应用缩放
            const newScale = scale * (1 + scaleChange);
            if (newScale >= 0.1 && newScale <= 20) { // TODO
                scale = newScale;

                // 调整偏移量，使缩放中心保持不变
                offsetX = centerX - imageX * scale;
                offsetY = centerY - imageY * scale;

                更新画面();
            }
        }

        // 同时处理移动
        if (触摸点.length === 2) {
            const prevCenterX = (触摸点[0].clientX + 触摸点[1].clientX) / 2;
            const prevCenterY = (触摸点[0].clientY + 触摸点[1].clientY) / 2;

            const dx = centerX - prevCenterX;
            const dy = centerY - prevCenterY;

            offsetX += dx;
            offsetY += dy;

            更新画面();
        }

        双指距离 = currentDistance;
        触摸点 = [
            { clientX: touch1.clientX, clientY: touch1.clientY },
            { clientX: touch2.clientX, clientY: touch2.clientY }
        ];
    }
});

// 触摸结束事件
canvas.addEventListener('touchend', function (e) {
    if (e.touches.length === 0) {
        // 所有手指都离开屏幕
        正在触摸 = false;
        双指距离 = 0;
        触摸点 = [];
        canvas.style.cursor = 'move';
    } else if (e.touches.length === 1) {
        // 只剩一个手指，切换到移动模式
        const touch = e.touches[0];
        lastX = touch.clientX;
        lastY = touch.clientY;
        双指距离 = 0;
    }
});

// 触摸取消事件
canvas.addEventListener('touchcancel', function (e) {
    正在触摸 = false;
    双指距离 = 0;
    触摸点 = [];
});

document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') {
        return;
    }
    if (快捷键管理器.按键按下(e.key)) {
        e.preventDefault();
    }
});

快捷键管理器.批量注册快捷键({
    'b': {
        回调: function () {
            切换背景();
            显示快捷键提示('已切换背景颜色');
        },
        描述: '切换背景颜色'
    },
    'i': {
        回调: function () {
            切换信息弹窗();
            显示快捷键提示(信息弹窗是否显示 ? '显示信息面板' : '隐藏信息面板');
        },
        描述: '展开详细信息'
    },
    'ArrowUp': {
        回调: function () {
            offsetY += moveStep;
            更新画面();
        },
        描述: '向上移动画面'
    },
    'ArrowDown': {
        回调: function () {
            offsetY -= moveStep;
            更新画面();
        },
        描述: '向下移动画面'
    },
    'ArrowLeft': {
        回调: function () {
            offsetX += moveStep;
            更新画面();
        },
        描述: '向左移动画面'
    },
    'ArrowRight': {
        回调: function () {
            offsetX -= moveStep;
            更新画面();
        },
        描述: '向右移动画面'
    },
    '+': {
        回调: function () {
            const oldScale = scale;
            scale = Math.min(scale * (1 + zoomStep), 10);
            offsetX = offsetX - (offsetX * (scale - oldScale) / oldScale);
            offsetY = offsetY - (offsetY * (scale - oldScale) / oldScale);
            更新画面();
            显示快捷键提示(`放大至 ${scale.toFixed(2)}x`);
        },
        描述: '放大画面'
    },
    '=': '+',
    '-': {
        回调: function () {
            const oldScale = scale;
            scale = Math.max(scale * (1 - zoomStep), 0.1);
            offsetX = offsetX - (offsetX * (scale - oldScale) / oldScale);
            offsetY = offsetY - (offsetY * (scale - oldScale) / oldScale);
            更新画面();
            显示快捷键提示(`缩小至 ${scale.toFixed(2)}x`);
        },
        描述: '缩小画面'
    },
    '_': '_',
    'd': {
        回调: function () {
            if (typeof 已加载开发资源 === 'undefined') {
                更新信息栏('开发资源未加载，正在引入dev.js');
                const script = document.createElement('script');
                script.src = 'dev.js';
                script.onload = function () {
                    更新信息栏('加载了开发资源');
                };
                script.onerror = function () {
                    更新信息栏('开发资源加载失败');
                };
                document.head.appendChild(script);
            } else {
                更新信息栏("已加载开发资源");
            }
        },
        描述: '加载开发资源'
    }
});

function 显示快捷键提示(message) {
    const hint = document.getElementById('shortcutHint');
    hint.textContent = message;
    hint.classList.add('active');

    setTimeout(() => {
        hint.classList.remove('active');
    }, 1000 * 1.5); // FIXME
}

function 补一个零(num) {
    return num < 10 ? "0" + num : num;
}

const 时间 = document.getElementById("time");
setInterval(function () {
    const 日期 = new Date();
    时间.innerText = `${日期.getFullYear()}/${补一个零(日期.getMonth() + 1)}/${补一个零(日期.getDate())} ${补一个零(日期.getHours())}:${补一个零(日期.getMinutes())}:${补一个零(日期.getSeconds())}`;
}, 1000);