const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const imagesPath = path.join(projectRoot, 'map', 'images');

console.log('🔍 验证社团负责人NPC图片配置...\n');

// 检查图片文件是否存在
const expectedImages = [
  '蓝桥编程社社长.png',
  '光影跑酷社社长.png',
  '喻园摄影协会会长.png',
  '百景志愿队队长.png'
];

console.log('📁 检查图片文件:');
const existingImages = fs.readdirSync(imagesPath);
expectedImages.forEach(img => {
  const exists = existingImages.includes(img);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${img}`);
});

console.log('\n📋 验证ImageManager.js配置:');

// 读取ImageManager.js文件
const imageManagerPath = path.join(projectRoot, 'map', 'js', 'ImageManager.js');
const imageManagerContent = fs.readFileSync(imageManagerPath, 'utf8');

// 检查映射配置
const mappings = [
  { keyword: '蓝桥编程社社长', file: '蓝桥编程社社长.png' },
  { keyword: '编程社社长', file: '蓝桥编程社社长.png' },
  { keyword: '光影跑酷社社长', file: '光影跑酷社社长.png' },
  { keyword: '跑酷社社长', file: '光影跑酷社社长.png' },
  { keyword: '喻园摄影协会会长', file: '喻园摄影协会会长.png' },
  { keyword: '摄影协会会长', file: '喻园摄影协会会长.png' },
  { keyword: '百景志愿队队长', file: '百景志愿队队长.png' },
  { keyword: '志愿队队长', file: '百景志愿队队长.png' }
];

console.log('📝 图片映射配置:');
mappings.forEach(map => {
  const hasMapping = imageManagerContent.includes(`'${map.keyword}'`);
  const status = hasMapping ? '✅' : '❌';
  console.log(`  ${status} '${map.keyword}' -> '${map.file}'`);
});

// 检查加载列表
console.log('\n🚚 图片加载列表:');
expectedImages.forEach(img => {
  const name = img.replace('.png', '');
  const inLoadList = imageManagerContent.includes(`name: '${name}'`) || 
                    imageManagerContent.includes(`src: '${img}'`);
  const status = inLoadList ? '✅' : '❌';
  console.log(`  ${status} ${name} (${img})`);
});

// 总结
const allFilesExist = expectedImages.every(img => existingImages.includes(img));
const allMappingsExist = mappings.every(map => 
  imageManagerContent.includes(`'${map.keyword}'`)
);
const allInLoadList = expectedImages.every(img => {
  const name = img.replace('.png', '');
  return imageManagerContent.includes(`name: '${name}'`) || 
         imageManagerContent.includes(`src: '${img}'`);
});

console.log('\n📊 总结:');
console.log(`  图片文件存在: ${allFilesExist ? '✅' : '❌'}`);
console.log(`  映射配置完整: ${allMappingsExist ? '✅' : '❌'}`);
console.log(`  加载列表完整: ${allInLoadList ? '✅' : '❌'}`);

if (allFilesExist && allMappingsExist && allInLoadList) {
  console.log('\n🎉 社团负责人NPC图片配置完成！');
  console.log('   所有图片文件已就绪，映射配置正确！');
} else {
  console.log('\n⚠️  部分配置不完整，请检查！');
}
