# Docker 安装与使用指南

## ❌ 问题：`docker-compose` 命令未找到

如果你看到以下错误：
```
zsh: command not found: docker-compose
```

说明 Docker 或 docker-compose 未正确安装。

## 🔧 解决方案

### 方案一：安装 Docker Desktop（推荐 macOS）

#### 1. 下载并安装 Docker Desktop

**方式 1：使用 Homebrew（推荐）**
```bash
brew install --cask docker
```

**方式 2：手动下载**
- 访问：https://www.docker.com/products/docker-desktop
- 下载 Docker Desktop for Mac
- 安装并启动

#### 2. 启动 Docker Desktop

- 打开"应用程序"文件夹，找到 Docker
- 点击启动 Docker Desktop
- 等待 Docker 引擎启动（菜单栏会出现 Docker 图标）

#### 3. 验证安装

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker Compose 版本（新版本）
docker compose version

# 检查 Docker Compose 版本（旧版本）
docker-compose --version
```

### 方案二：只安装 Docker Compose（如果已有 Docker）

```bash
# 使用 Homebrew 安装 docker-compose
brew install docker-compose

# 验证安装
docker-compose --version
```

## 📝 新版本 vs 旧版本命令

### Docker Compose V2（新版本，集成到 Docker CLI）

新版本的 Docker Desktop 将 `docker-compose` 集成到了 `docker` 命令中，使用方式：

```bash
# 旧命令（带连字符）
docker-compose up -d

# 新命令（空格，无连字符）✅ 推荐
docker compose up -d
```

### 常用命令对比

| 功能 | 旧命令 | 新命令 |
|------|--------|--------|
| 启动服务 | `docker-compose up -d` | `docker compose up -d` |
| 停止服务 | `docker-compose down` | `docker compose down` |
| 查看状态 | `docker-compose ps` | `docker compose ps` |
| 查看日志 | `docker-compose logs -f` | `docker compose logs -f` |
| 查看版本 | `docker-compose --version` | `docker compose version` |

## 🚀 使用 Docker Compose 启动 MySQL

### 使用新版本命令（推荐）

```bash
cd BackEnd

# 启动 MySQL 容器
docker compose up -d

# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f mysql

# 停止容器
docker compose down

# 停止并删除数据卷（⚠️ 会删除数据库数据）
docker compose down -v
```

### 使用旧版本命令（如果新命令不行）

```bash
cd BackEnd

# 启动 MySQL 容器
docker-compose up -d

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f mysql

# 停止容器
docker-compose down
```

## 🔄 创建别名（可选）

为了方便，可以在 `~/.zshrc` 或 `~/.bashrc` 中添加别名：

```bash
# 编辑 shell 配置文件
vim ~/.zshrc

# 添加以下行（如果 docker-compose 不存在，使用 docker compose）
alias docker-compose='docker compose'

# 重新加载配置
source ~/.zshrc
```

这样你就可以继续使用 `docker-compose` 命令，但它会调用 `docker compose`。

## ✅ 验证 Docker 是否正常工作

运行以下命令验证：

```bash
# 1. 检查 Docker 是否运行
docker info

# 2. 测试运行一个容器
docker run hello-world

# 3. 检查 Docker Compose
docker compose version
# 或
docker-compose --version
```

如果这些命令都能正常执行，说明 Docker 已正确安装。

## 📋 完整安装步骤总结

### macOS 用户（推荐使用 Homebrew）

```bash
# 1. 安装 Docker Desktop
brew install --cask docker

# 2. 启动 Docker Desktop（通过应用程序或命令行）
open -a Docker

# 3. 等待 Docker 启动完成（菜单栏会出现 Docker 图标）

# 4. 验证安装
docker --version
docker compose version

# 5. 启动 MySQL
cd BackEnd
docker compose up -d
```

## ❓ 常见问题

### Q: Docker Desktop 启动失败？

A: 检查系统要求：
- macOS 10.15 或更高版本
- 至少 4GB RAM
- 虚拟化支持（Intel 芯片或 Apple Silicon）

### Q: 如何检查 Docker 是否在运行？

A:
```bash
docker info
```
如果 Docker 未运行，会出现错误提示。

### Q: 权限错误 "permission denied"？

A: Docker Desktop 首次运行时需要管理员权限，或者将用户添加到 docker 组：
```bash
sudo dseditgroup -o edit -a $USER -t user docker
```

### Q: 如何完全卸载 Docker？

A:
```bash
# 卸载 Docker Desktop
brew uninstall --cask docker

# 删除数据目录
rm -rf ~/Library/Containers/com.docker.docker
rm -rf ~/.docker
```

## 📚 更多资源

- Docker 官方文档：https://docs.docker.com/
- Docker Compose 文档：https://docs.docker.com/compose/
- Docker Desktop for Mac：https://docs.docker.com/desktop/install/mac-install/

