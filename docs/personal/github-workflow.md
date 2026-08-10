# GitHub 维护流程

仓库已配置 GitHub Actions：每次向 `main` 推送代码、或发起面向 `main` 的 Pull Request 时，都会自动执行：

1. 依赖安装；
2. JavaScript 语法与项目质量门禁；
3. Chromium 浏览器安装；
4. 快速 UI 回归矩阵（包含“喻园第一周”）。

工作流文件：`.github/workflows/ci.yml`。

## 推荐日常节奏

```bash
git switch -c feature/your-feature
# 修改并本地运行 npm run test:quick
git add -A
git commit -m "feat: describe your change"
git push -u origin feature/your-feature
```

随后在 GitHub 创建 Pull Request；绿色的 Actions 检查通过后再合并到 `main`。
