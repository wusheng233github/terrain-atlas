function snackbar(message) {
    mdui.snackbar({
        message: message,
        position: 'left-bottom',
    });
}
// ===========================
// 1. 生成 Terrain Meta
// ===========================
document.getElementById('generateMeta').addEventListener('click', function () {
    const fileInput = document.getElementById('vanillaMeta');

    if (!fileInput.files[0]) {
        snackbar('请选择原版 terrain.meta 文件');
        return;
    }

    const tgaWidth = parseInt(document.getElementById('tgaWidth').value, 10);
    const tgaHeight = parseInt(document.getElementById('tgaHeight').value, 10);
    const blockWidth = parseInt(document.getElementById('blockWidth').value, 10);
    const blockHeight = parseInt(document.getElementById('blockHeight').value, 10);

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const vanilla = JSON.parse(e.target.result);
            const outputArray = [];

            let x = 0;
            let y = 0;

            for (const block of vanilla) {
                const uvsCount = block.uvs ? block.uvs.length : 1;
                const uvsArray = [];

                for (let n = 0; n < uvsCount; n++) {
                    if (x >= tgaWidth) {
                        x = 0;
                        y += blockHeight;
                    }

                    uvsArray.push([
                        x, y,
                        x + blockWidth, y + blockHeight,
                        tgaWidth, tgaHeight
                    ]);

                    x += blockWidth;
                }

                outputArray.push({
                    name: block.name,
                    uvs: uvsArray
                });
            }

            const outputJSON = JSON.stringify(outputArray, null, 2);
            const blob = new Blob([outputJSON], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const downloadLink = document.getElementById('metaDownload');
            downloadLink.href = url;
            downloadLink.download = 'terrain2.meta';
            downloadLink.style.display = 'inline';
            downloadLink.textContent = '下载 terrain2.meta';

            snackbar('已生成terrain.meta！');
        } catch (error) {
            snackbar('解析文件时出错: ' + error.message);
        }
    };

    reader.readAsText(fileInput.files[0]);
});

// ===========================
// 2. 生成纹理图集
// ===========================
document.getElementById('generateAtlas').addEventListener('click', function () {
    const textureZip = document.getElementById('textureZip').files[0];
    const mappingFile = document.getElementById('mappingFile').files[0];
    const terrainMeta = document.getElementById('terrainMeta').files[0];

    if (!textureZip || !mappingFile || !terrainMeta) {
        snackbar('请选择所有必需的文件');
        return;
    }

    const outputWidth = parseInt(document.getElementById('outputWidth').value, 10);
    const outputHeight = parseInt(document.getElementById('outputHeight').value, 10);

    const mappingReader = new FileReader();

    mappingReader.onload = function (e) {
        const table = decodeProperties(e.target.result);

        const metaReader = new FileReader();

        metaReader.onload = function (e) {
            const meta = JSON.parse(e.target.result);

            JSZip.loadAsync(textureZip).then(function (zip) {
                const canvas = document.createElement('canvas');
                canvas.width = outputWidth;
                canvas.height = outputHeight;

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'rgba(0, 0, 0, 0)';
                ctx.fillRect(0, 0, outputWidth, outputHeight);

                const drawPromises = [];

                for (const block of meta) {
                    for (let uvIndex = 0; uvIndex < block.uvs.length; uvIndex++) {
                        const textureName = table[block.name + '+' + uvIndex];

                        if (!textureName) {
                            console.warn(`未找到纹理: ${block.name}+${uvIndex}`);
                            continue;
                        }

                        const file = zip.file(textureName);

                        if (!file) {
                            console.warn(`ZIP 中未找到文件: ${textureName}`);
                            continue;
                        }

                        const drawPromise = file
                            .async('blob')
                            .then(function (blob) {
                                return createImageBitmap(blob);
                            })
                            .then(function (img) {
                                const uv = block.uvs[uvIndex];
                                ctx.drawImage(
                                    img,
                                    uv[0], uv[1],
                                    uv[2] - uv[0], uv[3] - uv[1]
                                );
                            });

                        drawPromises.push(drawPromise);
                    }
                }

                Promise.all(drawPromises).then(function () {
                    const preview = document.getElementById('atlasPreview');

                    preview.src = canvas.toDataURL('image/png');

                    // 生成PNG下载
                    canvas.toBlob(function (blob) {
                        const url = URL.createObjectURL(blob);

                        const downloadLink = document.getElementById('atlasDownload');
                        downloadLink.href = url;
                        downloadLink.download = 'output.png';
                        downloadLink.style.display = 'inline';
                        downloadLink.textContent = '下载纹理图集 (PNG)';
                    });

                    // 生成TGA下载（带Alpha通道）
                    generateTGAFromCanvas(canvas, function (tgaBlob) {
                        const tgaUrl = URL.createObjectURL(tgaBlob);
                        const tgaDownloadLink = document.getElementById('atlasDownloadTGA');
                        tgaDownloadLink.href = tgaUrl;
                        tgaDownloadLink.download = 'output.tga';
                        tgaDownloadLink.style.display = 'inline';
                        tgaDownloadLink.textContent = '下载纹理图集 (TGA)';
                    });

                    snackbar('已生成纹理图集！');
                });
            }).catch(function (error) {
                snackbar('解压纹理文件时出错: ' + error.message);
            });
        };

        metaReader.readAsText(terrainMeta);
    };

    mappingReader.readAsText(mappingFile);
});

// ===========================
// 3. 生成 Mipmap
// ===========================
document.getElementById('generateMipmap').addEventListener('click', function () {
    const inputAtlas = document.getElementById('inputAtlas').files[0];

    if (!inputAtlas) {
        snackbar('请选择输入纹理图集');
        return;
    }

    const levels = parseInt(document.getElementById('mipLevels').value, 10);

    const reader = new FileReader();

    reader.onload = function (e) {
        const img = new Image();

        img.onload = function () {
            const mipmaps = [];

            let width = img.width / 2;
            let height = img.height / 2;

            for (let i = 0; i < levels; i++) {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'rgba(0, 0, 0, 0)';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                mipmaps.push({ canvas: canvas, level: i });

                width = width / 2;
                height = height / 2;
            }

            const preview = document.getElementById('mipmapPreview');
            preview.innerHTML = '';

            const downloads = document.getElementById('mipmapDownloads');
            downloads.innerHTML = '';
            downloads.style.display = 'block';

            // 创建表格
            const table = document.createElement('table');
            table.style.borderCollapse = 'collapse';

            // 创建表头
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');

            const headers = ['级别', '预览', '分辨率', 'PNG下载', 'TGA下载'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });

            thead.appendChild(headerRow);
            table.appendChild(thead);

            // 创建表格主体
            const tbody = document.createElement('tbody');

            for (const mipmap of mipmaps) {
                const row = document.createElement('tr');

                // 级别列
                const levelCell = document.createElement('td');
                levelCell.textContent = mipmap.level;
                row.appendChild(levelCell);

                // 预览列
                const previewCell = document.createElement('td');
                const previewImg = document.createElement('img');
                previewImg.src = mipmap.canvas.toDataURL('image/png');
                previewCell.appendChild(previewImg);
                row.appendChild(previewCell);

                // 分辨率列
                const resolutionCell = document.createElement('td');
                resolutionCell.textContent = `${mipmap.canvas.width} × ${mipmap.canvas.height}`;
                row.appendChild(resolutionCell);

                // PNG下载列
                const pngDownloadCell = document.createElement('td');

                mipmap.canvas.toBlob(function (blob) {
                    const url = URL.createObjectURL(blob);

                    const pngDownloadLink = document.createElement('a');
                    pngDownloadLink.href = url;
                    pngDownloadLink.download = `terrain-atlas_mip${mipmap.level}.png`;
                    pngDownloadLink.textContent = `下载`;
                    pngDownloadCell.appendChild(pngDownloadLink);
                });

                row.appendChild(pngDownloadCell);

                // TGA下载列
                const tgaDownloadCell = document.createElement('td');

                generateTGAFromCanvas(mipmap.canvas, function (tgaBlob) {
                    const tgaUrl = URL.createObjectURL(tgaBlob);

                    const tgaDownloadLink = document.createElement('a');
                    tgaDownloadLink.href = tgaUrl;
                    tgaDownloadLink.download = `terrain-atlas_mip${mipmap.level}.tga`;
                    tgaDownloadLink.textContent = `下载`;
                    tgaDownloadCell.appendChild(tgaDownloadLink);
                });

                row.appendChild(tgaDownloadCell);
                tbody.appendChild(row);
            }

            table.appendChild(tbody);
            downloads.appendChild(table);

            snackbar('Mipmap 生成成功！');
        };

        img.src = e.target.result;
    };

    reader.readAsDataURL(inputAtlas);
});

// ===========================
// 辅助函数：解析属性文件
// ===========================
function decodeProperties(properties) {
    const result = {};
    const lines = properties.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            continue;
        }

        const parts = trimmed.split('=');

        if (parts.length === 2) {
            result[parts[0].trim()] = parts[1].trim();
        }
    }

    return result;
}

// ===========================
// 生成TGA文件（带Alpha通道）
// ===========================
function generateTGAFromCanvas(canvas, callback) {
    const width = canvas.width;
    const height = canvas.height;

    // 获取Canvas的ImageData
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);

    // 创建TGA头部
    const header = {
        imageType: window.TGA.Type.RGB, // 使用RGB类型但包含Alpha
        pixelDepth: 32, // 32位包含Alpha通道
        width: width,
        height: height,
        flags: (window.TGA.Origin.TOP_LEFT << window.TGA.Origin.SHIFT) | 8 // 包含8位Alpha通道
    };

    // 创建TGA实例
    const tga = new window.TGA(header);

    try {
        // 设置图像数据
        tga.setImageData(imageData);

        // 获取TGA的ArrayBuffer
        const tgaArrayBuffer = tga.arrayBuffer;

        // 创建Blob
        const tgaBlob = new Blob([tgaArrayBuffer], { type: 'image/x-tga' });

        callback(tgaBlob);
    } catch (error) {
        console.error('生成TGA文件时出错:', error);
        snackbar('生成TGA文件时出错: ' + error.message);
    }
}