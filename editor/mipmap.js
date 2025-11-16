let 已加载mipmap生成 = true;
let mipmaps = [];

function 创建mipmap面板() {
    const style = document.createElement('style');
    style.textContent = `
        .mipmap-preview {
            margin-top: 8px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }

        .mipmap-level {
            border: 1px solid #444;
            padding: 4px;
            text-align: center;
        }

        .mipmap-level canvas {
            max-width: 100%;
            height: auto;
            image-rendering: pixelated;
        }

        .edit-input {
            padding-top: 4px;
            padding-bottom: 4px;
        }

        .edit-input label {
            min-width: 60px;
        }

        .edit-input input {
            width: 60px;
            background-color: #333;
            border: 1px solid #555;
            color: white;
            padding: 2px 4px;
        }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'mipmapPanel';
    panel.className = 'popup-panel 左 下';
    panel.innerHTML = `
        <div>mipmap生成工具</div>
        <div class="edit-controls">
            <div class="edit-input">
                <label>级别数:</label>
                <input type="number" id="mipmapLevels" min="1" max="10" value="4">
            </div>
            <div class="btn-controls">
                <button id="generatemipmaps" class="btn 宽">生成mipmaps</button>
                <button id="exportmipmaps" class="btn 宽">导出mipmaps</button>
            </div>
        </div>
        <div id="mipmapPreview" class="mipmap-preview"></div>
    `;
    document.body.appendChild(panel);
}

function 绑定mipmap事件() {
    document.getElementById('generatemipmaps').addEventListener('click', 生成mipmaps);
    document.getElementById('exportmipmaps').addEventListener('click', 导出mipmaps);
}

function 切换mipmap显示() {
    const panel = document.getElementById('mipmapPanel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

function 生成mipmaps() {
    if (!全局图集) {
        更新信息栏('请先加载图集');
        return;
    }

    const levels = parseInt(document.getElementById('mipmapLevels').value) || 4;
    const previewContainer = document.getElementById('mipmapPreview');
    previewContainer.innerHTML = '';

    mipmaps = [];

    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = 全局图集.width;
    originalCanvas.height = 全局图集.height;
    const originalCtx = originalCanvas.getContext('2d');
    originalCtx.imageSmoothingEnabled = false;
    originalCtx.drawImage(全局图集, 0, 0);

    let currentWidth = 全局图集.width;
    let currentHeight = 全局图集.height;

    console.time('生成mipmap');
    for (let i = 0; i < levels; i++) {
        console.time('Mipmap Level ' + i);
        currentWidth = Math.max(1, Math.floor(currentWidth / 2));
        currentHeight = Math.max(1, Math.floor(currentHeight / 2));

        const mipmapCanvas = document.createElement('canvas');
        mipmapCanvas.width = currentWidth;
        mipmapCanvas.height = currentHeight;
        const mipmapCtx = mipmapCanvas.getContext('2d');
        mipmapCtx.imageSmoothingEnabled = false;
        mipmapCtx.drawImage(全局图集, 0, 0, currentWidth, currentHeight);

        mipmaps.push({
            level: i,
            width: currentWidth,
            height: currentHeight,
            canvas: mipmapCanvas
        });

        const levelDiv = document.createElement('div');
        levelDiv.className = 'mipmap-level';
        levelDiv.innerHTML = `<div>Level ${i} (${currentWidth}×${currentHeight})</div>`;
        levelDiv.appendChild(mipmapCanvas);
        previewContainer.appendChild(levelDiv);
        console.timeEnd('Mipmap Level ' + i);
    }
    console.timeEnd('生成mipmap');

    更新信息栏(`已生成 ${levels} 级mipmaps`);
}

function 导出mipmaps() {
    if (!mipmaps || mipmaps.length === 0) {
        更新信息栏('请先生成mipmaps');
        return;
    }

    const zip = new JSZip();
    let processed = 0;

    console.time('导出zip');
    mipmaps.forEach((mipmap, index) => {
        canvas生成TGA(mipmap.canvas, function (blob) {
            zip.file(`terrain-atlas_mip${index}.tga`, blob);
            processed++;

            // 如果是最后一个，生成ZIP文件
            if (processed === mipmaps.length) {
                zip.generateAsync({ type: 'blob' }).then(function (content) {
                    const url = URL.createObjectURL(content);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'mipmaps.zip';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    更新信息栏('mipmaps已导出为ZIP文件');
                });
            }
        });
    });
    console.timeEnd('导出zip');
}

快捷键管理器.注册快捷键('m', function () {
    切换mipmap显示();
    显示快捷键提示('mipmap工具 ' + (document.getElementById('mipmapPanel').classList.contains('active') ? '显示' : '隐藏'));
}, '显示Mipmap生成窗口');

创建mipmap面板();
绑定mipmap事件();