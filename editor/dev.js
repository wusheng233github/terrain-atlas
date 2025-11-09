const 已加载开发资源 = true;

// UI 组件演示
function 创建UI演示面板() {
    // 创建主演示面板
    const 演示面板 = document.createElement('div');
    演示面板.id = 'uiDemoPanel';
    演示面板.classList.add('popup-panel', '中', 'active');

    // 面板内容
    演示面板.innerHTML = `
        UI 组件演示
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- 左侧：按钮演示 -->
            <div>
                按钮组件
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button class="btn 扁">扁按钮</button>
                    <button class="btn">普通按钮</button>
                    <button class="btn 高">高按钮</button>
                    <button class="btn 方 小">小方按钮</button>
                    <button class="btn 方">方按钮</button>
                    <button class="btn 方 大">大方按钮</button>
                    <button class="btn 宽">宽按钮</button>
                </div>
            </div>
            <!-- 右侧：面板位置演示 -->
            <div>
                面板位置
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button class="btn 宽" onclick="切换演示面板('左上')">左上面板</button>
                    <button class="btn 宽" onclick="切换演示面板('右上')">右上面板</button>
                    <button class="btn 宽" onclick="切换演示面板('左下')">左下面板</button>
                    <button class="btn 宽" onclick="切换演示面板('右下')">右下面板</button>
                </div>
                面板尺寸
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button class="btn" onclick="切换面板尺寸('窄')">窄面板</button>
                    <button class="btn" onclick="切换面板尺寸('正常')">正常面板</button>
                    <button class="btn" onclick="切换面板尺寸('宽')">宽面板</button>
                </div>
            </div>
        </div>
        <div style="margin-top: 16px; text-align: center;">
            <button class="btn 宽" onclick="隐藏UI演示()">关闭演示 (U)</button>
        </div>
    `;

    document.body.appendChild(演示面板);
}

// 创建位置演示面板
function 创建位置演示面板() {
    const 位置 = ['左上', '右上', '左下', '右下'];

    位置.forEach(位置 => {
        const 面板 = document.createElement('div');
        面板.id = `demoPanel${位置}`;
        面板.style.zIndex = '0';
        面板.classList.add('popup-panel');
        面板.innerHTML = `
            <div style="text-align: center;">${位置}面板</div>
        `;

        if (位置.includes('上')) {
            面板.classList.add('上');
        } else {
            面板.classList.add('下');
        }

        if (位置.includes('左')) {
            面板.classList.add('左');
        } else {
            面板.classList.add('右');
        }

        document.body.appendChild(面板);
    });
}

// 切换演示面板显示
function 切换演示面板(位置) {
    const 所有演示面板 = document.querySelectorAll('[id^="demoPanel"]');
    所有演示面板.forEach(面板 => {
        面板.classList.remove('active');
    });

    const 目标面板 = document.getElementById(`demoPanel${位置}`);
    if (目标面板) {
        目标面板.classList.add('active');
    }
}

// 切换面板尺寸
function 切换面板尺寸(尺寸) {
    const 主面板 = document.getElementById('uiDemoPanel');
    const 尺寸映射 = { // XXX
        '窄': '280px',
        '正常': '400px',
        '宽': '640px'
    };

    if (主面板 && 尺寸映射[尺寸]) {
        主面板.style.width = 尺寸映射[尺寸];
    }
}

// 隐藏UI演示
function 隐藏UI演示() {
    const 演示面板 = document.getElementById('uiDemoPanel');
    if (演示面板) {
        演示面板.remove();
    }

    const 所有演示面板 = document.querySelectorAll('[id^="demoPanel"]');
    所有演示面板.forEach(面板 => {
        面板.remove();
    });
}

// 切换UI演示显示
function 切换UI演示() {
    const 现有面板 = document.getElementById('uiDemoPanel');

    if (现有面板) {
        隐藏UI演示();
        更新信息栏('已关闭UI演示');
    } else {
        创建UI演示面板();
        创建位置演示面板();
        更新信息栏('显示UI组件演示面板');
    }
}

// 绑定U键事件
document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        切换UI演示();
        显示快捷键提示((document.getElementById('uiDemoPanel') ? '显示' : '隐藏') + 'UI演示');
    } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (全局元数据) {
            download(JSON.stringify(全局元数据), 'terrain.meta', 'text/plain');
        }
    }
});

更新信息栏('开发资源已加载 (U键显示UI演示)');