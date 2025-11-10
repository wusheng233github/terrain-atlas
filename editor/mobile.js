let 已加载手机端优化 = true;

function 创建手机快捷键按钮() {
    // 创建按钮元素
    const 快捷键按钮 = document.createElement('button');
    快捷键按钮.id = 'mobileShortcutBtn';
    快捷键按钮.className = 'btn 方 大 primary';
    快捷键按钮.textContent = '菜单';
    快捷键按钮.title = '快捷键菜单';
    快捷键按钮.style.position = 'absolute';
    快捷键按钮.style.top = '48px';
    快捷键按钮.style.left = '12px';
    快捷键按钮.style.zIndex = '1';

    // 创建菜单弹窗
    const 菜单弹窗 = document.createElement('div');
    菜单弹窗.id = 'mobileShortcutMenu';
    菜单弹窗.className = 'popup-panel 中 窄 list-container';
    菜单弹窗.style.display = 'none';

    // 添加样式 - 与 mapping.js 保持一致
    const 样式 = document.createElement('style');
    样式.textContent = `
        .shortcut-key {
            background-color: #444;
            padding: 4px 8px;
            font-family: monospace;
            font-size: 12px;
            margin-left: 8px;
            color: #fff;
            border: 1px solid #555;
        }

        .shortcut-description {
            flex: 1;
        }
    `;
    document.head.appendChild(样式);

    // 按钮点击事件
    快捷键按钮.addEventListener('click', function () {
        const 当前显示状态 = 菜单弹窗.style.display === 'block';

        if (当前显示状态) {
            // 关闭菜单
            菜单弹窗.style.display = 'none';
            菜单弹窗.classList.remove('active');
            快捷键按钮.classList.remove('active');
        } else {
            // 打开菜单
            打开快捷键列表();
            菜单弹窗.style.display = 'block';
            菜单弹窗.classList.add('active');
            快捷键按钮.classList.add('active');
        }
    });

    // 点击菜单外部关闭
    document.addEventListener('click', function (e) {
        if (菜单弹窗.style.display === 'block' &&
            !菜单弹窗.contains(e.target) &&
            !快捷键按钮.contains(e.target)) {
            菜单弹窗.style.display = 'none';
            菜单弹窗.classList.remove('active');
            快捷键按钮.classList.remove('active');
        }
    });

    // 添加到页面
    document.body.appendChild(快捷键按钮);
    document.body.appendChild(菜单弹窗);
}

function 打开快捷键列表() {
    const 菜单弹窗 = document.getElementById('mobileShortcutMenu');
    if (!菜单弹窗) return;

    let 菜单内容 = '';

    const 排序后的快捷键 = Object.entries(快捷键管理器.回调列表).sort((a, b) => {
        return a[1].描述.localeCompare(b[1].描述);
    });

    排序后的快捷键.forEach(([按键, 信息]) => {
        if (信息.描述) { // 只显示有描述的快捷键
            菜单内容 += `
                    <div class="list-item" data-key="${按键}">
                        <span class="shortcut-description">${信息.描述}</span>
                        <span class="shortcut-key">${按键}</span>
                    </div>
                `;
        }
    });

    菜单弹窗.innerHTML = 菜单内容;

    // 添加点击事件
    const 所有菜单项 = 菜单弹窗.querySelectorAll('.list-item[data-key]');
    所有菜单项.forEach(菜单项 => {
        菜单项.addEventListener('click', function () {
            const 按键 = this.getAttribute('data-key');
            if (快捷键管理器.回调列表[按键]) {
                快捷键管理器.回调列表[按键].回调();
                // 关闭菜单
                菜单弹窗.style.display = 'none';
                菜单弹窗.classList.remove('active');
                document.getElementById('mobileShortcutBtn').classList.remove('active');
            }
        });
    });
}

创建手机快捷键按钮();