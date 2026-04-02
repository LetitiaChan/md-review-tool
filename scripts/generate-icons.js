/**
 * Icon 多尺寸生成脚本
 *
 * 用法：
 *   node scripts/generate-icons.js [源图片路径] [输出目录]
 *
 * 示例：
 *   node scripts/generate-icons.js assets/icon.png assets/icons
 *   node scripts/generate-icons.js                              # 使用默认路径
 *
 * 依赖：
 *   npm install sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ============ 配置区域 ============

// 需要生成的尺寸列表（可根据需求自行修改）
const SIZES = [
  16, 24, 32, 48, 64, 72, 96, 128, 144, 152, 192, 256, 512, 1024
];

// 默认源图片路径（相对于项目根目录）
const DEFAULT_SOURCE = 'assets/icon.png';

// 默认输出目录（相对于项目根目录）
const DEFAULT_OUTPUT_DIR = 'assets/icons';

// 输出格式：'png' | 'ico' | 'webp' | 'jpeg'
const OUTPUT_FORMAT = 'png';

// ============ 主逻辑 ============

async function generateIcons() {
  const projectRoot = path.resolve(__dirname, '..');
  const sourcePath = path.resolve(projectRoot, process.argv[2] || DEFAULT_SOURCE);
  const outputDir = path.resolve(projectRoot, process.argv[3] || DEFAULT_OUTPUT_DIR);

  // 检查源文件是否存在
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ 源图片不存在: ${sourcePath}`);
    process.exit(1);
  }

  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 已创建输出目录: ${outputDir}`);
  }

  // 获取源图片信息
  const metadata = await sharp(sourcePath).metadata();
  console.log(`\n📷 源图片信息:`);
  console.log(`   路径: ${sourcePath}`);
  console.log(`   尺寸: ${metadata.width} x ${metadata.height}`);
  console.log(`   格式: ${metadata.format}`);
  console.log(`\n🔄 开始生成 ${SIZES.length} 个尺寸的图标...\n`);

  const results = [];

  for (const size of SIZES) {
    const filename = `icon-${size}x${size}.${OUTPUT_FORMAT}`;
    const outputPath = path.join(outputDir, filename);

    try {
      let pipeline = sharp(sourcePath).resize(size, size, {
        fit: 'contain',        // 保持比例，不裁剪
        background: { r: 0, g: 0, b: 0, alpha: 0 } // 透明背景
      });

      // 根据输出格式设置参数
      switch (OUTPUT_FORMAT) {
        case 'png':
          pipeline = pipeline.png({ compressionLevel: 9 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: 90 });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: 90 });
          break;
      }

      await pipeline.toFile(outputPath);

      const stat = fs.statSync(outputPath);
      const sizeKB = (stat.size / 1024).toFixed(2);
      results.push({ size, filename, sizeKB, success: true });
      console.log(`   ✅ ${filename.padEnd(25)} ${sizeKB.padStart(8)} KB`);
    } catch (err) {
      results.push({ size, filename, error: err.message, success: false });
      console.log(`   ❌ ${filename.padEnd(25)} 失败: ${err.message}`);
    }
  }

  // 输出汇总
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`\n📊 生成完成!`);
  console.log(`   成功: ${successCount} 个`);
  if (failCount > 0) {
    console.log(`   失败: ${failCount} 个`);
  }
  console.log(`   输出目录: ${outputDir}\n`);
}

generateIcons().catch(err => {
  console.error('❌ 生成失败:', err.message);
  process.exit(1);
});
