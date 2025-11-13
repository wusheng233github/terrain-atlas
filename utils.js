function canvas生成TGA(canvas, callback) {
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

    // 设置图像数据
    tga.setImageData(imageData);

    // 获取TGA的ArrayBuffer
    const tgaArrayBuffer = tga.arrayBuffer;

    // 创建Blob
    const tgaBlob = new Blob([tgaArrayBuffer], { type: 'application/octet-stream' });

    callback(tgaBlob);
}

function basename去后缀(路径 = "") {
    // /.ab/.cd.e
    // 0123456789
    //     *   #
    let 路径分隔符 = 路径.lastIndexOf('/');
    let 结束 = 路径.lastIndexOf('.');
    if (结束 === -1 || 结束 < Math.max(0, 路径分隔符)) {
        结束 = 路径.length;
    }
    // -1 + 1 = 0
    return 路径.slice(路径分隔符 + 1, 结束);
}