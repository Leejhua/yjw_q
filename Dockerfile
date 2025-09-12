# 使用老板的Q CLI基础镜像配置
FROM ubuntu:22.04

# 设置时区和语言环境
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC
ENV LANG=C.UTF-8

# 安装基础工具和Node.js
RUN apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    python3 \
    python3-pip \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip \
    vim \
    wget \
    sudo \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户
RUN useradd -m -s /bin/bash -u 1000 quser \
    && echo "quser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# 安装 Amazon Q CLI (支持多架构)
RUN ARCH=$(uname -m) \
    && if [ "$ARCH" = "x86_64" ]; then \
        curl --proto '=https' --tlsv1.2 -sSf \
            https://desktop-release.q.us-east-1.amazonaws.com/latest/amazon-q.deb \
            -o /tmp/amazon-q.deb \
        && apt-get update \
        && apt-get install -y /tmp/amazon-q.deb \
        && rm /tmp/amazon-q.deb \
        && rm -rf /var/lib/apt/lists/*; \
    elif [ "$ARCH" = "aarch64" ]; then \
        curl --proto '=https' --tlsv1.2 -sSf \
            "https://desktop-release.q.us-east-1.amazonaws.com/latest/q-aarch64-linux.zip" \
            -o /tmp/q.zip \
        && unzip /tmp/q.zip -d /tmp \
        && chown -R quser:quser /tmp/q \
        && su quser -c "/tmp/q/install.sh --no-confirm" \
        && rm -rf /tmp/q.zip /tmp/q; \
    else \
        echo "Unsupported architecture: $ARCH" && exit 1; \
    fi

# 切换到普通用户
USER quser

# 创建必要的配置目录
RUN mkdir -p /home/quser/.aws/amazonq \
    && mkdir -p /home/quser/.amazonq

# 设置工作目录
WORKDIR /home/quser/workspace

# 复制项目文件
COPY --chown=quser:quser package*.json ./
COPY --chown=quser:quser server.js ./
COPY --chown=quser:quser 个人记忆/ ./个人记忆/

# 安装Node.js依赖
RUN npm install

# 设置环境变量
ENV Q_LOG_LEVEL=info
ENV PATH="/home/quser/.local/bin:/usr/local/bin:${PATH}"

# 暴露端口
EXPOSE 3001

# 启动后端服务
CMD ["node", "server.js"]
