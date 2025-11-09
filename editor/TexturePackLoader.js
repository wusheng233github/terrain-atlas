const 已加载纹理包加载器 = true;

function 从纹理包覆盖图集() {
    if (!全局图集 || !全局元数据 || !映射数据 || Object.keys(纹理包).length === 0) {
        更新信息栏('需要先加载资源');
        return;
    }

    更新信息栏('开始从纹理包覆盖图集...');

    // 创建离屏Canvas用于处理图像
    const 离屏canvas = document.createElement('canvas');
    离屏canvas.width = 全局图集.width;
    离屏canvas.height = 全局图集.height;
    const 离屏ctx = 离屏canvas.getContext('2d');

    // 先绘制原始图集
    离屏ctx.drawImage(全局图集, 0, 0);

    const 加载Promises = [];
    let 覆盖数量 = 0;
    let 错误数量 = 0;

    console.time('覆盖纹理图集');
    // 遍历所有方块和UV，收集所有需要加载的纹理
    全局元数据.forEach((方块) => {
        方块.uvs.forEach((uv, uv索引) => {
            const 映射ID = `${方块.name}+${uv索引}`;
            const 纹理文件名 = 映射数据[映射ID];

            if (纹理文件名 && 纹理包[纹理文件名.toLowerCase()]) {
                const 加载Promise = new Promise((resolve) => {
                    const img = new Image();
                    img.onload = function () {
                        // 计算UV区域
                        const x = uv[0];
                        const y = uv[1];
                        const width = uv[2] - uv[0];
                        const height = uv[3] - uv[1];

                        // 在离屏Canvas上绘制纹理
                        离屏ctx.drawImage(img, x, y, width, height);
                        覆盖数量++;
                        resolve();
                    };

                    img.onerror = function () {
                        错误数量++;
                        console.error(`无法加载纹理: ${纹理文件名}`);
                        resolve(); // 即使出错也要resolve，不让整个Promise.all失败
                    };

                    img.src = 纹理包[纹理文件名.toLowerCase()];
                });
                加载Promises.push(加载Promise);
            }
        });
    });

    // 等待所有纹理加载完成
    Promise.all(加载Promises).then(() => {
        canvas覆盖图集(离屏canvas);
        更新信息栏(`纹理包覆盖完成\n成功覆盖: ${覆盖数量} 个纹理\n失败: ${错误数量} 个`);
        console.timeEnd('覆盖纹理图集');
    });
}

function canvas覆盖图集(离屏canvas) {
    // 将离屏Canvas转换为ImageBitmap
    createImageBitmap(离屏canvas).then(function (新图集) {
        全局图集 = 新图集;
        更新画面();
    });
}

// 导出功能函数
function 下载图集() {
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
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'terrain-atlas.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        更新信息栏('已导出PNG图集');
    }, 'image/png');
}

document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    switch (e.key) {
        case 'w':
        case 'W':
            从纹理包覆盖图集();
            break;
        case 'e':
        case 'E':
            下载图集();
            break;
    }
});