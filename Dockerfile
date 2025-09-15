FROM ubuntu:22.04

# 设置时区和语言环境
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC
ENV LANG=C.UTF-8

# 安装基础工具和依赖
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
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户
RUN useradd -m -s /bin/bash -u 1000 quser \
    && echo "quser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# 安装 Amazon Q CLI
RUN curl --proto '=https' --tlsv1.2 -sSf \
    https://desktop-release.q.us-east-1.amazonaws.com/latest/amazon-q.deb \
    -o /tmp/amazon-q.deb \
    && apt-get update \
    && apt-get install -y /tmp/amazon-q.deb \
    && rm /tmp/amazon-q.deb \
    && rm -rf /var/lib/apt/lists/*

# 切换到普通用户
USER quser

# 设置工作目录
WORKDIR /home/quser/app

# 复制项目文件
COPY --chown=quser:quser package*.json yarn.lock ./
RUN npm install -g yarn && yarn install

COPY --chown=quser:quser . .

# 创建必要的配置目录
RUN mkdir -p /home/quser/.aws/amazonq \
    && mkdir -p /home/quser/.amazonq

# 设置环境变量
ENV Q_LOG_LEVEL=info
ENV PATH="/home/quser/.local/bin:/usr/local/bin:${PATH}"
ENV PORT=3001

EXPOSE 3001

# 启动命令
CMD ["node", "server.js"]
