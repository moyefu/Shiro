@echo off
chcp 65001 >nul

:: 构建docker镜像
set TAG=latest
set /p TAG="请输入镜像标签 (默认: latest): "
if "%TAG%"=="" set TAG=latest

echo 正在构建镜像: moyefu/shiro:%TAG%
docker build -t moyefu/shiro:%TAG% --build-arg BASE_URL=https://moyefu.cn .