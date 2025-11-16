let 已加载手机端优化 = true;

function 创建手机快捷键按钮() {
    const 快捷键按钮 = document.createElement('button');
    快捷键按钮.id = 'mobileShortcutBtn';
    快捷键按钮.className = 'btn 方 大 primary';
    快捷键按钮.textContent = '菜单';
    快捷键按钮.title = '快捷键菜单';
    快捷键按钮.style.position = 'absolute';
    快捷键按钮.style.top = '48px';
    快捷键按钮.style.left = '12px';
    快捷键按钮.style.zIndex = '1';

    const 菜单弹窗 = document.createElement('div');
    菜单弹窗.id = 'mobileShortcutMenu';
    菜单弹窗.className = 'popup-panel 中 窄 list-container';

    const 样式 = document.createElement('style');
    样式.textContent = `
        .shortcut-description {
            flex: 1;
        }
    `;
    document.head.appendChild(样式);

    快捷键按钮.addEventListener('click', function () {
        const 当前显示状态 = 快捷键按钮.classList.contains('active');

        if (当前显示状态) {
            菜单弹窗.classList.remove('active');
            快捷键按钮.classList.remove('active');
        } else {
            刷新快捷键列表(菜单弹窗);
            菜单弹窗.classList.add('active');
            快捷键按钮.classList.add('active');
        }
    });

    document.body.appendChild(快捷键按钮);
    document.body.appendChild(菜单弹窗);
}

function 刷新快捷键列表(菜单弹窗) {
    菜单弹窗.innerHTML = '';
    for (const 按键码 in 快捷键管理器.回调列表) {
        const 信息 = 快捷键管理器.回调列表[按键码];

        const 列表项 = document.createElement('div');
        列表项.className = 'list-item';
        列表项.setAttribute('data-key', 按键码);

        const 项目描述 = document.createElement('span');
        项目描述.className = 'shortcut-description';
        项目描述.innerText = 信息.描述;

        列表项.appendChild(项目描述);

        const 项目按键码 = document.createElement('code');
        项目按键码.className = 'key-code';
        项目按键码.innerText = 按键码;

        列表项.appendChild(项目按键码);

        列表项.addEventListener('click', function () {
            const 按键 = this.getAttribute('data-key');
            if (快捷键管理器.回调列表[按键]) {
                快捷键管理器.回调列表[按键].回调();

                菜单弹窗.classList.remove('active');
                document.getElementById('mobileShortcutBtn').classList.remove('active');
            }
        });

        菜单弹窗.appendChild(列表项);
    }
}

创建手机快捷键按钮();