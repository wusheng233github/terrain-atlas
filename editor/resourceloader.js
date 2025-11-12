const 已加载资源加载功能 = true;

let 全局元数据 = null;
let 映射数据 = null;
let 全局图集 = null; // FIXME: pixelstudio导出背景为黑色
let 选中方块 = null;
let 选中的UV编号 = -1;
let 纹理包 = {};
let 方块选中事件监听 = [];

resizeCanvas = function (原resizeCanvas) {
    return function () {
        原resizeCanvas();
        if (全局图集) {
            更新画面();
        }
    };
}(resizeCanvas);

重置视图 = function (原重置视图) {
    return function () {
        if (!全局图集) return;
        const width = 全局图集.width;
        const height = 全局图集.height;
        原重置视图(width, height);
        选中方块 = null;
        选中的UV编号 = -1;
        设置纹理预览(false);
    };
}(重置视图);

更新画面 = function (原更新画面) {
    return function () {
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
        原更新画面();
    };
}(更新画面);

底部面板左侧.innerHTML = 底部面板左侧.innerHTML + `
    <div class="btn-controls">
        <button id="tgaBtn" class="btn 高" title="加载TGA文件">TGA</button>
        <input type="file" id="tgaFile" class="file-input" accept=".tga">
        <div class="file-status" id="tgaStatus">未加载</div>
    </div>

    <div class="btn-controls">
        <button id="metaBtn" class="btn 高" title="加载META文件">META</button>
        <input type="file" id="metaFile" class="file-input" accept=".meta">
        <div class="file-status" id="metaStatus">未加载</div>
    </div>

    <div class="btn-controls">
        <button id="mappingBtn" class="btn 高" title="加载映射文件">映射</button>
        <input type="file" id="mappingFile" class="file-input" accept=".txt">
        <div class="file-status" id="mappingStatus">未加载</div>
    </div>

    <div class="btn-controls">
        <button id="zipBtn" class="btn 高" title="加载纹理包">ZIP</button>
        <input type="file" id="zipFile" class="file-input" accept=".zip">
        <div class="file-status" id="zipStatus">未加载</div>
    </div>
`;

let dropZone = document.createElement('div');
dropZone.className = 'drop-zone';
document.body.appendChild(dropZone);

let 预览图 = document.createElement('img');
预览图.id = 'previewImage';
详细信息弹窗.appendChild(预览图);

class UV选择操作 extends 编辑操作 {
    constructor(新方块, 新uv索引, 旧方块, 旧uv索引) {
        if (新方块) {
            super(`选择UV: ${新方块.name}[${新uv索引}]`);
        } else {
            super(`取消选择UV`);
        }
        this.新方块名称 = this.获取方块名称(新方块);
        this.新uv索引 = 新uv索引;
        this.旧方块名称 = this.获取方块名称(旧方块);
        this.旧uv索引 = 旧uv索引;
    }

    执行() {
        选中方块 = this.获取方块数据(this.新方块名称);
        选中的UV编号 = this.新uv索引;
        触发事件(方块选中事件监听/*, this.获取方块数据(this.旧方块名称), this.旧uv索引*/);
        更新画面();
    }

    撤销() {
        选中方块 = this.获取方块数据(this.旧方块名称);
        选中的UV编号 = this.旧uv索引;
        触发事件(方块选中事件监听/*, this.获取方块数据(this.新方块名称), this.新uv索引*/);
        更新画面();
    }

    获取方块数据(名称) {
        if (名称) {
            return 获取方块数据(名称);
        }
        return null;
    }

    获取方块名称(数据) {
        if (数据) {
            return 数据.name;
        }
        return null;
    }
}

注册操作类型('选择UV', UV选择操作);

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

function 导出图集() {
    if (!全局图集) {
        更新信息栏('没有可导出的图集');
        return;
    }

    // 创建临时Canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 全局图集.width;
    tempCanvas.height = 全局图集.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(全局图集, 0, 0);

    // 转换为Blob并下载
    tempCanvas.toBlob(function (blob) {
        download(blob, 'terrain-atlas.png', 'image/png');
        更新信息栏('已导出PNG图集');
    }, 'image/png');
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

function 导出元数据() {
    download(JSON.stringify(全局元数据), 'terrain.meta', 'text/plain');
    更新信息栏('已导出元数据');
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

function 获取方块数据(名称) {
    for (const 方块数据 of 全局元数据) {
        if (方块数据.name && 方块数据.name == 名称) {
            return 方块数据;
        }
    }
    return null;
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

function 处理点击事件(x, y) {
    const 旧选中方块 = 选中方块;
    const 旧选的中UV编号 = 选中的UV编号;

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

    console.time('查找块UV');
    for (const block of 全局元数据) {
        for (let i = 0; i < block.uvs.length; i++) {
            const uv = block.uvs[i];
            if (imageX >= uv[0] && imageX < uv[2] &&
                imageY >= uv[1] && imageY < uv[3]) {
                选中方块 = block;
                选中的UV编号 = i;
                break;
            }
        }
        if (选中方块) break;
    }
    console.timeEnd('查找块UV');
    更新信息栏(`点击位置: (${imageX}, ${imageY})`);

    // 屎
    执行操作('选择UV', 选中方块, 选中的UV编号, 旧选中方块, 旧选的中UV编号);

    if (!选中方块 || (旧选中方块 && 选中方块.name === 旧选中方块.name && 选中的UV编号 === 旧选的中UV编号)) {
        return;
    }
    return true;
}

方块选中事件监听.push(function () {
    let 原内容 = document.getElementById('info').textContent;
    let infoText = '';
    if (原内容.startsWith('点击位置')) {
        infoText = 原内容.split("\n")[0];
    }
    infoText += `\n\n${生成选中详细信息()}`;

    if (选中方块.uvs.length > 1) {
        infoText += `\n\n共${选中方块.uvs.length}个UV块:\n`;

        for (let index in 选中方块.uvs) {
            index = Number(index);

            if (isNaN(index)) {
                break;
            }

            const uv = 选中方块.uvs[index];
            infoText += `${index === 选中的UV编号 ? '> ' : '  '}${index + 1}. [${uv[0]}, ${uv[1]}, ${uv[2]}, ${uv[3]}] ${uv[2] - uv[0]}×${uv[3] - uv[1]}\n`;
        }
    }

    设置纹理预览(true);
    更新信息栏(infoText);
});

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

canvas.addEventListener('click', function (e) {
    const rect = canvas.getBoundingClientRect();
    if (!处理点击事件(e.clientX - rect.left, e.clientY - rect.top)) {
        设置纹理预览(false);
    }
    更新画面();
});

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

快捷键管理器.批量注册快捷键({
    'e': {
        回调: 导出图集,
        描述: '导出PNG图集'
    },
    'c': {
        回调: 导出元数据,
        描述: '导出元数据'
    },
    's': {
        回调: 导出映射文件,
        描述: '导出映射文件'
    }
});

// 文件按钮事件
按钮绑定文件输入('tgaBtn', 'tgaFile');
按钮绑定文件输入('metaBtn', 'metaFile');
按钮绑定文件输入('mappingBtn', 'mappingFile');
按钮绑定文件输入('zipBtn', 'zipFile');

// 文件加载
文件输入绑定文件名标签('tgaFile', 'tgaStatus', 加载图集);
文件输入绑定文件名标签('metaFile', 'metaStatus', 加载元数据);
文件输入绑定文件名标签('mappingFile', 'mappingStatus', 加载映射文件);
文件输入绑定文件名标签('zipFile', 'zipStatus', 导入纹理包);

document.title = 'TGA预览器';
更新信息栏('请加载TGA文件和对应的META文件');