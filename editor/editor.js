const 已加载编辑功能 = true;

// 控制点相关变量
let 控制点列表 = [];
let 选中控制点索引 = -1;
let 正在拖动控制点 = false;
let 控制点大小 = 1; // 控制点大小（像素）

// 定义9个控制点的相对位置（相对于UV矩形）
const 控制点位置 = [
    [0, 0],    // 左上
    [0.5, 0],  // 上中
    [1, 0],    // 右上
    [1, 0.5],  // 右中
    [1, 1],    // 右下
    [0.5, 1],  // 下中
    [0, 1],    // 左下
    [0, 0.5],  // 左中
    [0.5, 0.5] // 中心
];

// 监听画面更新事件
画面更新事件监听.push(绘制控制点);

// 监听方块选择事件
方块选中事件监听.push(更新控制点);

// 更新控制点位置
function 更新控制点() {
    if (!选中方块 || 选中的UV编号 === -1) {
        控制点列表 = [];
        return;
    }

    const uv = 选中方块.uvs[选中的UV编号];
    const x = uv[0], y = uv[1], w = uv[2] - uv[0], h = uv[3] - uv[1];

    // 2x2可点击
    控制点列表 = 控制点位置.map(([rx, ry]) => ({
        x: x + w * rx - 0.5,
        y: y + h * ry - 0.5
    }));
}

// 绘制控制点
function 绘制控制点() {
    if (!选中方块 || 选中的UV编号 === -1 || 控制点列表.length === 0) {
        return;
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 绘制控制点
    控制点列表.forEach((点, 索引) => {
        ctx.fillStyle = 索引 === 选中控制点索引 ? '#ffff00' : '#00ff00';
        ctx.fillRect(点.x, 点.y, 控制点大小, 控制点大小);
    });

    ctx.restore();
}

// 检查点击是否在控制点上
function 检查控制点点击(图像X, 图像Y) {
    if (!选中方块 || 选中的UV编号 === -1) {
        return -1;
    }

    for (let i = 0; i < 控制点列表.length; i++) {
        const 点 = 控制点列表[i];
        const dx = Math.abs(图像X - 点.x);
        const dy = Math.abs(图像Y - 点.y);

        if (dx <= 控制点大小 && dy <= 控制点大小) {
            return i;
        }
    }

    return -1;
}

// 处理控制点拖动
function 处理控制点拖动(图像X, 图像Y) {
    if (选中控制点索引 === -1 || !选中方块 || 选中的UV编号 === -1) {
        return;
    }

    const uv = 选中方块.uvs[选中的UV编号];
    const 点 = 控制点列表[选中控制点索引];

    // 更新控制点位置
    点.x = 图像X;
    点.y = 图像Y;

    // 根据激活的控制点更新UV坐标
    switch (选中控制点索引) {
        case 0: // 左上
            uv[0] = 图像X;
            uv[1] = 图像Y;
            break;
        case 1: // 上中
            uv[1] = 图像Y;
            break;
        case 2: // 右上
            uv[2] = 图像X;
            uv[1] = 图像Y;
            break;
        case 3: // 右中
            uv[2] = 图像X;
            break;
        case 4: // 右下
            uv[2] = 图像X;
            uv[3] = 图像Y;
            break;
        case 5: // 下中
            uv[3] = 图像Y;
            break;
        case 6: // 左下
            uv[0] = 图像X;
            uv[3] = 图像Y;
            break;
        case 7: // 左中
            uv[0] = 图像X;
            break;
        case 8: // 中心
            const 宽度 = uv[2] - uv[0];
            const 高度 = uv[3] - uv[1];
            uv[0] = 图像X - 宽度 / 2;
            uv[1] = 图像Y - 高度 / 2;
            uv[2] = 图像X + 宽度 / 2;
            uv[3] = 图像Y + 高度 / 2;
            break;
    }

    // 确保坐标有效性
    uv[0] = Math.max(0, Math.min(uv[0], 全局图集.width));
    uv[1] = Math.max(0, Math.min(uv[1], 全局图集.height));
    uv[2] = Math.max(0, Math.min(uv[2], 全局图集.width));
    uv[3] = Math.max(0, Math.min(uv[3], 全局图集.height));

    // 确保左上角在右下角之前
    if (uv[0] > uv[2]) [uv[0], uv[2]] = [uv[2], uv[0]];
    if (uv[1] > uv[3]) [uv[1], uv[3]] = [uv[3], uv[1]];

    // 更新控制点位置
    更新控制点();
    更新信息栏('正在编辑\n' + 生成选中详细信息());
}


处理点击事件 = function (原处理点击事件) {
    return function (x, y) {
        const 图像X = Math.floor((x - offsetX) / scale);
        const 图像Y = Math.floor((y - offsetY) / scale);

        if (正在拖动控制点) {
            正在拖动控制点 = false;
            选中控制点索引 = -1;
            更新画面();
        } else {
            // 检查是否点击了控制点
            选中控制点索引 = 检查控制点点击(图像X, 图像Y);
            if (选中控制点索引 === -1) {
                return 原处理点击事件(x, y);
            } else if (选中方块) {
                正在拖动控制点 = true;
                更新画面();
            }
        }
        return true;
    };
}(处理点击事件);

canvas.onmousemove = function (原MouseMove) {
    return function (e) {
        if (正在拖动控制点 && 选中控制点索引 !== -1) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const 图像X = Math.floor((x - offsetX) / scale);
            const 图像Y = Math.floor((y - offsetY) / scale);

            处理控制点拖动(图像X, 图像Y);
            更新画面();
        } else if (原MouseMove) {
            原MouseMove(e);
        }
    };
}(canvas.onmousemove);

// 初始化时更新控制点
更新控制点();