const 映射编辑器已加载 = true;

// 映射编辑相关变量
let 映射编辑弹窗 = null;
let 映射输入框 = null;
let 映射列表容器 = null;
let 当前映射键 = null;
let 所有纹理文件 = [];

// 添加映射编辑器样式
const 样式 = document.createElement('style');
样式.textContent = `
    #mappingEditor {
        width: 480px;
        max-height: 80vh;
        background: #272727;
        border: 1px solid #444;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        display: none;
        flex-direction: column;
    }

    #mappingEditor.active {
        display: flex;
    }

    .mapping-input-container {
        margin-bottom: 12px;
    }

    #mappingInput {
        width: 100%;
        padding: 8px 12px;
        background: #333;
        color: white;
        border: 1px solid #555;
        font-family: monospace;
        font-size: 14px;
    }

    #mappingInput:focus {
        outline: none;
        border-color: #0066cc;
    }

    .mapping-list-container {
        flex: 1;
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #555;
        background: #222;
        margin-bottom: 12px;
    }

    .mapping-item {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-bottom: 1px solid #333;
        cursor: pointer;
    }

    .mapping-item:hover {
        background-color: #444;
    }

    .mapping-item.selected {
        background-color: #0066cc;
    }

    .mapping-item.selected:hover {
        background-color: #1e82e6 !important;
    }

    .mapping-icon {
        width: 32px;
        height: 32px;
        margin-right: 12px;
        background: #333;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #555;
        flex-shrink: 0;
    }

    .mapping-icon img {
        max-width: 100%;
        max-height: 100%;
        image-rendering: pixelated;
    }

    .mapping-filename {
        flex: 1;
        font-family: monospace;
        font-size: 12px;
        color: white;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .mapping-controls {
        text-align: center;
    }

    .mapping-empty {
        padding: 20px;
        text-align: center;
        color: #888;
        font-style: italic;
    }

    .mapping-search-info {
        padding: 8px 12px;
        font-size: 11px;
        color: #aaa;
        border-bottom: 1px solid #333;
        background: #1a1a1a;
    }
`;
document.head.appendChild(样式);

// 初始化映射编辑器
function 初始化映射编辑器() {
    // 创建映射编辑弹窗
    映射编辑弹窗 = document.createElement('div');
    映射编辑弹窗.id = 'mappingEditor';
    映射编辑弹窗.className = 'popup-panel 中';
    映射编辑弹窗.innerHTML = `
        <div>映射编辑</div>
        <div class="mapping-input-container">
            <input type="text" id="mappingInput" placeholder="输入PNG文件名或搜索..." autocomplete="off">
        </div>
        <div class="mapping-list-container">
            <div id="mappingList">
                <!-- 映射列表将在这里动态生成 -->
            </div>
        </div>
        <div class="btn-controls">
            <button id="mappingConfirm" class="btn">确定</button>
        </div>
    `;

    document.body.appendChild(映射编辑弹窗);

    // 获取元素引用
    映射输入框 = document.getElementById('mappingInput');
    映射列表容器 = document.getElementById('mappingList');
    const 确定按钮 = document.getElementById('mappingConfirm');

    // 绑定事件
    确定按钮.addEventListener('click', 关闭映射编辑器);

    映射输入框.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            关闭映射编辑器();
        } else if (e.key === 'Escape') {
            关闭映射编辑器();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const 项目列表 = 映射列表容器.querySelectorAll('.mapping-item');
            if (项目列表.length > 0) {
                const 当前选中 = 映射列表容器.querySelector('.mapping-item.selected');
                let 下一个索引 = 0;
                if (当前选中) {
                    const 当前索引 = Array.from(项目列表).indexOf(当前选中);
                    下一个索引 = (当前索引 + 1) % 项目列表.length;
                }
                选择映射项目(项目列表[下一个索引]);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const 项目列表 = 映射列表容器.querySelectorAll('.mapping-item');
            if (项目列表.length > 0) {
                const 当前选中 = 映射列表容器.querySelector('.mapping-item.selected');
                let 上一个索引 = 项目列表.length - 1;
                if (当前选中) {
                    const 当前索引 = Array.from(项目列表).indexOf(当前选中);
                    上一个索引 = (当前索引 - 1 + 项目列表.length) % 项目列表.length;
                }
                选择映射项目(项目列表[上一个索引]);
            }
        }
    });

    // 实时搜索
    映射输入框.addEventListener('input', function () {
        生成映射列表();
    });

    // 点击弹窗外部关闭
    document.addEventListener('click', function (e) {
        if (映射编辑弹窗 && 映射编辑弹窗.classList.contains('active') &&
            !映射编辑弹窗.contains(e.target)) {
            关闭映射编辑器();
        }
    });
}

// 选择映射项目
function 选择映射项目(项目元素) {
    // 移除其他项的选中状态
    document.querySelectorAll('.mapping-item').forEach(item => {
        item.style.backgroundColor = '';
        item.classList.remove('selected');
    });

    // 设置当前项为选中状态
    项目元素.classList.add('selected');

    // 更新输入框
    const 文件名 = 项目元素.querySelector('.mapping-filename').textContent;
    映射输入框.value = 文件名;

    // 滚动到选中项
    项目元素.scrollIntoView({ block: 'nearest' });
}

// 打开映射编辑器
function 打开映射编辑器() {
    if (!映射编辑弹窗) {
        初始化映射编辑器();
    }

    if (!选中方块) {
        更新信息栏('请先选择一个方块');
        return;
    }

    当前映射键 = 获取选中方块映射ID();
    if (!当前映射键) {
        更新信息栏('无法获取映射键');
        return;
    }

    // 收集所有纹理文件
    所有纹理文件 = Object.keys(纹理包 || {}).sort();

    // 设置当前映射值
    const 当前映射值 = 映射数据 ? 映射数据[当前映射键] : '';
    映射输入框.value = 当前映射值 || '';

    // 生成映射列表
    生成映射列表();

    // 显示弹窗
    映射编辑弹窗.style.display = 'block';
    映射编辑弹窗.classList.add('active');

    // 聚焦输入框
    映射输入框.focus();
    映射输入框.select();
}

// 关闭映射编辑器
function 关闭映射编辑器() {
    if (!映射编辑弹窗 || !当前映射键) return;

    const 新映射值 = 映射输入框.value.trim();

    // 更新映射数据
    if (!映射数据) {
        映射数据 = {};
    }

    if (新映射值) {
        映射数据[当前映射键] = 新映射值;
        更新信息栏(`已更新映射: ${当前映射键} -> ${新映射值}`);
    } else {
        // 如果输入为空，删除映射
        delete 映射数据[当前映射键];
        更新信息栏(`已删除映射: ${当前映射键}`);
    }

    // 隐藏弹窗
    映射编辑弹窗.style.display = 'none';
    映射编辑弹窗.classList.remove('active');

    // 更新纹理预览
    设置纹理预览(true);
}

// 生成映射列表
function 生成映射列表() {
    if (!映射列表容器) return;

    const 搜索文本 = 映射输入框.value.toLowerCase().trim();
    let 过滤后的文件 = 所有纹理文件;

    if (搜索文本) {
        过滤后的文件 = 所有纹理文件.filter(文件名 =>
            文件名.toLowerCase().includes(搜索文本)
        );
    }

    映射列表容器.innerHTML = '';

    if (过滤后的文件.length === 0) {
        const 空状态 = document.createElement('div');
        空状态.className = 'mapping-empty';
        空状态.textContent = 所有纹理文件.length === 0 ?
            '没有可用的纹理文件' :
            `没有找到包含"${搜索文本}"的文件`;
        映射列表容器.appendChild(空状态);
        return;
    }

    // 显示搜索结果信息
    if (搜索文本) {
        const 搜索信息 = document.createElement('div');
        搜索信息.className = 'mapping-search-info';
        搜索信息.textContent = `找到 ${过滤后的文件.length} 个文件 (共 ${所有纹理文件.length} 个)`;
        映射列表容器.appendChild(搜索信息);
    }

    const 当前映射值 = 映射输入框.value.toLowerCase();
    let 选中项索引 = -1;

    过滤后的文件.forEach((文件名, 索引) => {
        const 列表项 = document.createElement('div');
        列表项.className = 'mapping-item';

        // 如果此项与当前输入完全匹配，则选中
        if (文件名.toLowerCase() === 当前映射值) {
            列表项.classList.add('selected');
            选中项索引 = 索引;
        }

        // 创建图标容器
        const 图标容器 = document.createElement('div');
        图标容器.className = 'mapping-icon';

        // 创建图标（使用纹理预览）
        const 图标 = document.createElement('img');
        图标.src = 纹理包[文件名];
        图标.alt = 文件名;

        图标容器.appendChild(图标);

        // 创建文件名显示
        const 文件名显示 = document.createElement('div');
        文件名显示.className = 'mapping-filename';
        文件名显示.textContent = 文件名;

        // 高亮搜索文本
        if (搜索文本) {
            const 文件名小写 = 文件名.toLowerCase();
            const 搜索索引 = 文件名小写.indexOf(搜索文本);
            if (搜索索引 !== -1) {
                文件名显示.innerHTML =
                    文件名.substring(0, 搜索索引) +
                    `<mark style="background: #ffeb3b; color: black;">${文件名.substring(搜索索引, 搜索索引 + 搜索文本.length)}</mark>` +
                    文件名.substring(搜索索引 + 搜索文本.length);
            }
        }

        // 组装列表项
        列表项.appendChild(图标容器);
        列表项.appendChild(文件名显示);

        // 点击事件
        列表项.addEventListener('click', function () {
            选择映射项目(this);
        });

        // 双击事件 - 直接应用并关闭
        列表项.addEventListener('dblclick', function () {
            映射输入框.value = 文件名;
            关闭映射编辑器();
        });

        映射列表容器.appendChild(列表项);
    });

    // 自动滚动到选中项
    if (选中项索引 !== -1) {
        const 选中项 = 映射列表容器.children[搜索文本 ? 1 : 0]; // 考虑搜索信息条
        if (选中项) {
            setTimeout(() => {
                选中项.scrollIntoView({ block: 'center' });
            }, 100);
        }
    } else if (过滤后的文件.length > 0) {
        // 如果没有选中项，选中第一个
        const 第一项 = 映射列表容器.children[搜索文本 ? 1 : 0];
        if (第一项) {
            第一项.classList.add('selected');
        }
    }
}

// 导出映射文件
function 导出映射文件() {
    if (!映射数据 || Object.keys(映射数据).length === 0) {
        更新信息栏('没有映射数据可导出');
        return;
    }

    let 映射内容 = '';
    Object.keys(映射数据).forEach(key => {
        if (映射数据[key]) {
            映射内容 += `${key}=${映射数据[key]}\n`;
        }
    });

    const 时间戳 = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const 文件名 = `mapping-${时间戳}.txt`;

    download(映射内容, 文件名, 'text/plain');
    更新信息栏(`已导出映射文件: ${文件名}`);
}

// 切换映射编辑器
function 切换映射编辑器() {
    if (映射编辑弹窗 && 映射编辑弹窗.classList.contains('active')) {
        关闭映射编辑器();
    } else {
        打开映射编辑器();
    }
}

// 添加键盘快捷键
document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    // A键 - 切换映射编辑器
    if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        切换映射编辑器();
    }

    // C键 - 导出映射文件
    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        导出映射文件();
    }
});

// 更新信息栏显示映射编辑功能已加载
//更新信息栏('映射编辑功能已加载\n按 A 键打开/关闭映射编辑器\n按 C 键导出映射文件');