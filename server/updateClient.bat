@echo off
setlocal enableDelayedExpansion

:: 定义 R2 存储桶的名称
set R2_BUCKET_NAME=my-cool-nav

:: 获取当前脚本所在的目录
set SCRIPT_DIR=%~dp0

:: 定义 website 目录的绝对路径
:: %~dp0 是脚本所在的驱动器和路径（以反斜杠结尾）
:: 假设 website 目录在脚本所在目录的上一级
set WEBSITE_DIR=%SCRIPT_DIR%..\website

:: 对 WEBSITE_DIR 进行规范化，去除多余的反斜杠，确保路径正确
for %%i in ("%WEBSITE_DIR%") do set WEBSITE_DIR=%%~fi
:: WEBSITE_DIR 现在是绝对路径，且不带末尾的斜杠，例如 D:\Projects\JS\chweb\website

:: 检查 wrangler 是否安装
where /q wrangler
if %errorlevel% neq 0 (
    echo Error: wrangler CLI is not installed. Please install it globally: npm install -g wrangler
    echo.
    pause
    exit /b 1
)

:: 检查 website 目录是否存在
if not exist "%WEBSITE_DIR%" (
    echo Error: Directory "%WEBSITE_DIR%" not found.
    echo Please ensure the website directory exists relative to the script.
    echo.
    pause
    exit /b 1
)

echo --- Starting R2 Local Upload for bucket '%R2_BUCKET_NAME%' ---
echo Source directory: "%WEBSITE_DIR%"
echo.

:: TEMP_LIST 文件将存储所有要上传的文件路径
set TEMP_LIST_FILE="r2_upload_temp_list.txt"
if exist %TEMP_LIST_FILE% del %TEMP_LIST_FILE% 2>nul

:: 使用 for /r 遍历 WEBSITE_DIR 及其子目录下的所有文件
:: 将文件的完整路径写入临时文件
for /r "%WEBSITE_DIR%" %%F in (*) do (
    echo %%F>>%TEMP_LIST_FILE%
)

:: 读取文件列表并逐个上传
for /f "usebackq tokens=*" %%G in (%TEMP_LIST_FILE%) do (
    set "full_path=%%G"

    :: 计算相对于 WEBSITE_DIR 的路径，作为 R2 中的 key
    :: 1. 从完整路径中移除 WEBSITE_DIR 的绝对路径前缀
    :: %WEBSITE_DIR% 已经是一个规范化的绝对路径，不带末尾斜杠
    set "r2_key=!full_path:%WEBSITE_DIR%\=!"

    :: 2. 将 Windows 的反斜杠替换为 R2 要求的正斜杠
    set "r2_key=!r2_key:\=/!"

    echo Uploading "!full_path!" to R2 key "!r2_key!"...
    wrangler r2 object put "%R2_BUCKET_NAME%/!r2_key!" --file "!full_path!" --local

    :: 检查上传是否成功
    if %errorlevel% neq 0 (
        echo Error uploading "!full_path!". Aborting.
        del %TEMP_LIST_FILE% 2>nul
        echo.
        pause
        exit /b %errorlevel%
    )
)

:: 清理临时文件
if exist %TEMP_LIST_FILE% del %TEMP_LIST_FILE% 2>nul

echo.
echo --- All files from "%WEBSITE_DIR%" have been uploaded to local R2 bucket '%R2_BUCKET_NAME%'. ---
echo You can now run 'wrangler dev' to test your Worker.
echo.
pause
