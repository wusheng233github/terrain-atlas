// 全局变量
let 全局元数据 = null;
let 映射数据 = null;
let canvas = document.getElementById('previewCanvas');
let ctx = canvas.getContext('2d');
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let 正在拖动画面 = false;
let lastX = 0;
let lastY = 0;
let 全局图集 = null; // FIXME: pixelstudio导出背景为黑色
let 选中方块 = null, 选中的UV编号 = -1;
let 信息弹窗是否显示 = true;
let 背景颜色 = ['black', 'white', '#808080'];
let 当前背景颜色编号 = 0;
let 纹理包 = {};
let 画面更新事件监听 = []; // 无参数
let 方块选中事件监听 = []; // 去找选中方块
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
                    配置 = this.回调列表[配置]
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
    if (全局图集) {
        更新画面()
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function 按钮绑定文件输入(按钮的id, 文件输入的id) {
    document.getElementById(按钮的id).addEventListener('click', function () {
        document.getElementById(文件输入的id).click();
    });
    // TODO: 拖放
}

function 文件输入绑定文件名标签(文件输入的id, 文件名标签的id, 回调) {
    document.getElementById(文件输入的id).addEventListener('change', function (e) {
        const 选择的文件 = e.target.files[0];
        if (!选择的文件) {
            return;
        }
        document.getElementById(文件名标签的id).textContent = 选择的文件.name;
        回调(选择的文件);
    });
}

// 文件按钮事件
按钮绑定文件输入('tgaBtn', 'tgaFile');
按钮绑定文件输入('metaBtn', 'metaFile');
按钮绑定文件输入('mappingBtn', 'mappingFile');
按钮绑定文件输入('zipBtn', 'zipFile');

// 信息按钮事件
document.getElementById('infoBtn').addEventListener('click', function () {
    切换信息弹窗();
});

// 文件加载
文件输入绑定文件名标签('tgaFile', 'tgaStatus', 加载图集);
文件输入绑定文件名标签('metaFile', 'metaStatus', 加载元数据);
文件输入绑定文件名标签('mappingFile', 'mappingStatus', 加载映射文件);
文件输入绑定文件名标签('zipFile', 'zipStatus', 导入纹理包);


function 加载图集(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        const arrayBuffer = event.target.result;
        let TGA编解码器 = new window.TGA();
        TGA编解码器.load(arrayBuffer);
        const 图像数据 = TGA编解码器.getImageData();
        createImageBitmap(图像数据).then(function (位图) {
            全局图集 = 位图;
            重置视图();
            更新画面();
            更新信息栏('已加载TGA文件\n图像尺寸: ' + 全局图集.width + ' × ' + 全局图集.height);
            if (全局元数据) {
                导入元数据();
            }
        });
    };
    reader.readAsArrayBuffer(file);
}

function 加载元数据(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            全局元数据 = JSON.parse(event.target.result);
            导入元数据();
        } catch (e) {
            更新信息栏('META文件解析错误: ' + e.message);
        }
    };
    reader.readAsText(file);
}

function 导入元数据() {
    if (!全局元数据 || !Array.isArray(全局元数据)) {
        更新信息栏('META数据格式错误');
        return;
    }

    let 浮点模式 = false;
    let 方块数量 = 0;

    全局元数据 = 全局元数据.map(方块数据 => {
        if (!方块数据.uvs) { // 检测到旧格式
            导入0点8方块元数据(方块数据);
        }

        const 首个UV = 方块数据.uvs[0];

        // 检查UV值是否为浮点数 (四个值都小于1)
        if (首个UV[0] < 1 && 首个UV[1] < 1 && 首个UV[2] < 1 && 首个UV[3] < 1) {
            浮点模式 = true;
        }

        方块数据.uvs = 方块数据.uvs.map(uv => {
            let width = uv[4];
            let height = uv[5];

            if (!浮点模式) {
                uv[0] /= uv[4];
                uv[1] /= uv[5];
                uv[2] /= uv[4];
                uv[3] /= uv[5];
            }

            if (全局图集) {
                width = 全局图集.width;
                height = 全局图集.height;
            }

            uv[0] *= width;
            uv[1] *= height;
            uv[2] *= width;
            uv[3] *= height;

            return [
                Math.round(uv[0]),
                Math.round(uv[1]),
                Math.round(uv[2]),
                Math.round(uv[3]),
                width,
                height
            ];
        });

        方块数量++;
        return 方块数据;
    });

    更新信息栏(`已加载元数据\n包含 ${方块数量} 个纹理块`);

    // 如果有图像，重新绘制
    if (全局图集) {
        更新画面();
    }
}

function 导入0点8方块元数据(方块数据) {
    const uvs = [];
    if (方块数据.uv) {
        uvs.push(方块数据.uv);
        delete 方块数据.uv; // ?
    }

    if (方块数据.additonal_textures && Array.isArray(方块数据.additonal_textures)) {
        方块数据.additonal_textures.forEach(texture => {
            uvs.push(texture);
        });
        delete 方块数据.additonal_textures;
    }

    方块数据.uvs = uvs;
}

function 加载映射文件(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const content = event.target.result;
            解析映射文件(content);
        } catch (e) {
            更新信息栏('映射文件解析错误: ' + e.message);
        }
    };
    reader.readAsText(file);
}

function 解析映射文件(content) {
    映射数据 = {};
    const lines = content.split('\n');
    let validCount = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) continue;

        const parts = trimmed.split('=');
        if (parts.length === 2) {
            const key = parts[0].trim();
            const value = parts[1].trim();
            映射数据[key] = value;
            validCount++;
        }
    }

    更新信息栏(`已加载映射文件\n有效映射数量: ${validCount}`);
}

function 导入纹理包(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        const arrayBuffer = event.target.result;
        const zip = new JSZip();

        zip.loadAsync(arrayBuffer).then(function (contents) {
            纹理包 = {};
            const promises = [];

            // 遍历ZIP中的文件
            zip.forEach(function (relativePath, zipEntry) {
                if (zipEntry.dir) return;
                const fileName = zipEntry.name.toLowerCase();
                if (!fileName.endsWith('.png')) return;

                promises.push(zipEntry.async('blob').then(function (data) {
                    纹理包[fileName] = URL.createObjectURL(data);
                }));
            });

            Promise.all(promises).then(function () {
                更新信息栏(`已加载纹理包`);
            });

        }).catch(function (error) {
            更新信息栏('ZIP文件解析错误: ' + error.message);
        });
    };
    reader.readAsArrayBuffer(file);
}

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
    document.getElementById('infoPopup').classList.toggle('active', 信息弹窗是否显示);
    document.getElementById('infoBtn').classList.toggle('active', 信息弹窗是否显示);
}

function 重置视图() {
    if (!全局图集) return;
    const width = 全局图集.width, height = 全局图集.height;
    const scaleX = canvas.width / width, scaleY = canvas.height / height;
    scale = Math.min(scaleX, scaleY, 1);
    offsetX = (canvas.width - width * scale) / 2;
    offsetY = (canvas.height - height * scale) / 2;
    选中方块 = null;
    选中的UV编号 = -1;
    设置纹理预览(false);
}

function 更新画面() {
    if (!全局图集) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(全局图集, 0, 0);

    // 绘制所有同名块的蓝色边框
    if (选中方块) {
        for (const block of 全局元数据) {
            if (block.name === 选中方块.name) {
                for (let i = 0; i < block.uvs.length; i++) {
                    if (block === 选中方块 && i === 选中的UV编号) continue;
                    const uv = block.uvs[i];
                    const x = uv[0], y = uv[1], w = uv[2] - uv[0], h = uv[3] - uv[1];
                    ctx.strokeStyle = '#0000ff';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(x, y, w, h);
                }
            }
        }

        // 最后绘制当前UV的红色边框
        const uv = 选中方块.uvs[选中的UV编号];
        const x = uv[0], y = uv[1], w = uv[2] - uv[0], h = uv[3] - uv[1];
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, w, h);
    }

    ctx.restore();
    触发事件(画面更新事件监听);
}

function 触发事件(监听列表) {
    监听列表.forEach(回调 => {
        回调();
    });
}

function 更新信息栏(text) {
    console.log(text);
    document.getElementById('info').textContent = text;
}

function 获取选中方块映射ID() {
    if (!选中方块) {
        return null;
    }
    return `${选中方块.name}+${选中的UV编号}`;
}

function 设置纹理预览(可见) {
    const 纹理内容 = 获取PNG纹理数据(获取选中方块映射ID());
    if (可见 && 纹理内容) {
        document.getElementById('previewImage').src = 纹理内容;
        document.getElementById('previewImage').style.display = 'block';
    } else {
        //不能请求null document.getElementById('previewImage').src = null;
        document.getElementById('previewImage').style.display = 'none';
    }
}

function 获取PNG纹理数据(映射ID) {
    if (!映射数据 || !映射ID) {
        return null;
    }
    const 文件名 = 映射数据[映射ID];
    if (!文件名) {
        return null;
    }
    return 纹理包[文件名.toLowerCase()];
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

// 点击事件
canvas.addEventListener('click', function (e) {
    const rect = canvas.getBoundingClientRect();
    if (!处理点击事件(e.clientX - rect.left, e.clientY - rect.top)) {
        设置纹理预览(false);
    }
    更新画面();
});

function 处理点击事件(x, y) {
    选中方块 = null;
    选中的UV编号 = -1;

    if (!全局图集 || !全局元数据) return;
    const imageX = Math.floor((x - offsetX) / scale);
    const imageY = Math.floor((y - offsetY) / scale);

    if (imageX < 0 || imageX >= 全局图集.width ||
        imageY < 0 || imageY >= 全局图集.height) {
        更新信息栏('点击位置超出图像范围');
        return;
    }

    let 找到方块 = null;
    let 找到UV编号 = -1;

    console.time('查找块');
    for (const block of 全局元数据) {
        for (let i = 0; i < block.uvs.length; i++) {
            const uv = block.uvs[i];
            if (imageX >= uv[0] && imageX < uv[2] &&
                imageY >= uv[1] && imageY < uv[3]) {
                找到方块 = block;
                找到UV编号 = i;
                break;
            }
        }
        if (找到方块) break;
    }
    console.timeEnd('查找块');

    if (!找到方块 || (选中方块 && 找到方块.name === 选中方块.name && 找到UV编号 === 选中的UV编号)) {
        更新信息栏(`点击位置: (${imageX}, ${imageY})`);
        return;
    } else {
        选中方块 = 找到方块;
        选中的UV编号 = 找到UV编号;

        触发事件(方块选中事件监听);

        const uv = 选中方块.uvs[选中的UV编号];

        // 查找同名的其他UV块
        const sameNameBlocks = 全局元数据.filter(b => b.name === 选中方块.name);
        let sameNameUVs = [];
        sameNameBlocks.forEach(block => {
            block.uvs.forEach((uv, idx) => {
                sameNameUVs.push({
                    block: block,
                    uvIndex: idx,
                    uv: uv
                });
            });
        });

        let infoText = `点击位置: (${imageX}, ${imageY})\n\n${生成选中详细信息()}`;

        if (sameNameUVs.length > 1) {
            infoText += `\n\n同名UV块 (共${sameNameUVs.length}个):\n`;
            sameNameUVs.forEach((item, index) => {
                const isCurrent = (item.block === 选中方块 && item.uvIndex === 选中的UV编号);
                infoText += `${isCurrent ? '> ' : '  '}${index + 1}. [${item.uv[0]}, ${item.uv[1]}, ${item.uv[2]}, ${item.uv[3]}] ${item.uv[2] - item.uv[0]}×${item.uv[3] - item.uv[1]}\n`;
            });
        }

        设置纹理预览(true);
        更新信息栏(infoText);
    }
    return true;
}

function 生成选中详细信息() {
    const uv = 选中方块.uvs[选中的UV编号];
    const mappingKey = 获取选中方块映射ID();

    let infoText = `块名称: ${选中方块.name}\n`;
    infoText += `UV索引: ${选中的UV编号}\n`;
    infoText += `UV坐标: [${uv[0]}, ${uv[1]}, ${uv[2]}, ${uv[3]}]\n`;
    infoText += `UV尺寸: ${uv[2] - uv[0]} × ${uv[3] - uv[1]}\n`;
    infoText += `图像尺寸: ${全局图集.width} × ${全局图集.height}\n`;
    if (映射数据) {
        infoText += `纹理文件: ${映射数据[mappingKey] ? 映射数据[mappingKey] : '无'}`;
    }

    return infoText;
}

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
    if (!正在触摸 || !全局图集) return;

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
    canvas.style.cursor = 'move';
});

const dropZone = document.getElementById('dropZone');
let dragCounter = 0;

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, 阻止浏览拖入文件, false);
});

function 阻止浏览拖入文件(e) {
    e.preventDefault();
    e.stopPropagation();
}

document.addEventListener('dragenter', function (e) {
    dragCounter++;
    if (dragCounter === 1) {
        dropZone.style.display = 'flex';
    }
});

document.addEventListener('dragleave', function (e) {
    dragCounter--;
    if (dragCounter === 0) {
        dropZone.style.display = 'none';
    }
});

document.addEventListener('drop', function (e) {
    dragCounter = 0;
    dropZone.style.display = 'none';

    const dt = e.dataTransfer;
    const files = dt.files;

    let tgaFile;
    let metaFile;
    let mappingFile;
    let zipFile;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.tga')) {
            tgaFile = file;
        } else if (file.name.endsWith('.meta')) {
            metaFile = file;
        } else if (file.name.endsWith('.txt')) {
            mappingFile = file;
        } else if (file.name.endsWith('.zip')) {
            zipFile = file;
        }
    }

    if (tgaFile) {
        document.getElementById('tgaStatus').textContent = tgaFile.name;
        加载图集(tgaFile);
    }
    if (metaFile) {
        document.getElementById('metaStatus').textContent = metaFile.name;
        加载元数据(metaFile);
    }
    if (mappingFile) {
        document.getElementById('mappingStatus').textContent = mappingFile.name;
        加载映射文件(mappingFile);
    }
    if (zipFile) {
        document.getElementById('zipStatus').textContent = zipFile.name;
        导入纹理包(zipFile);
    }
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
        描述: '加载UI演示资源'
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
    return num < 10 ? "0" + num : num
}

const 时间 = document.getElementById("time");
setInterval(function () {
    const 日期 = new Date();
    时间.innerText = `${日期.getFullYear()}/${补一个零(日期.getMonth())}/${补一个零(日期.getDay())} ${补一个零(日期.getHours())}:${补一个零(日期.getMinutes())}:${补一个零(日期.getSeconds())}`;
}, 1000);