#!/bin/bash

echo "=== Docker Build Verification Script ==="
echo "项目路径: $(pwd)"
echo "时间: $(date)"
echo

# 验证预期文件存在
echo "1. 验证构建上下文文件存在:"
echo "✓ backend/package.json: $([ -f backend/package.json ] && echo '存在' || echo '❌ 缺失')"
echo "✓ backend/tsconfig.json: $([ -f backend/tsconfig.json ] && echo '存在' || echo '❌ 缺失')"
echo "✓ backend/src/: $([ -d backend/src ] && echo '存在' || echo '❌ 缺失')"
echo "✓ Dockerfile.railway: $([ -f Dockerfile.railway ] && echo '存在' || echo '❌ 缺失')"
echo

# 执行 Docker 构建
echo "2. 执行 Docker 构建:"
echo "构建命令: docker build -f Dockerfile.railway -t stylist-agent-verification ."
echo

if command -v docker >/dev/null 2>&1; then
    docker build -f Dockerfile.railway -t stylist-agent-verification . 2>&1 | tee docker_build.log
    BUILD_RESULT=${PIPESTATUS[0]}
    
    echo
    echo "3. 构建结果分析:"
    if [ $BUILD_RESULT -eq 0 ]; then
        echo "✅ Docker 构建成功!"
        
        # 验证镜像
        echo
        echo "4. 验证最终镜像:"
        docker run --rm stylist-agent-verification ls -la /app/backend/ | head -10
        
        echo
        echo "5. 验证构建产物:"
        docker run --rm stylist-agent-verification ls -la /app/backend/dist/ | head -5
        
    else
        echo "❌ Docker 构建失败! 退出码: $BUILD_RESULT"
        echo
        echo "错误分析:"
        grep -E "(error|Error|ERROR|failed|Failed|FAILED)" docker_build.log | tail -10
    fi
else
    echo "❌ Docker 未安装，跳过实际构建测试"
    echo "请安装 Docker 后重新运行此脚本"
fi

echo
echo "=== 预期通过条件 ==="
echo "1. npm ci 在 npm run build 之前完成"
echo "2. 构建过程中不出现 'postinstall' 调用"
echo "3. /app/backend/ 下存在: package.json, tsconfig.json, src/"
echo "4. 构建成功生成 /app/backend/dist/ 目录"
echo "5. 最终镜像可以正常启动"
