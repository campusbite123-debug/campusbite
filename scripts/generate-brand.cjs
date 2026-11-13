const Jimp = require('jimp-compact');
const fs = require('node:fs');
(async () => {
  const mark = new Jimp(1024, 1024, 0x00000000);
  const white = 0xffffffff;
  const rect = (x, y, w, h) => {
    for (let xx = x; xx < x + w; xx++)
      for (let yy = y; yy < y + h; yy++) mark.setPixelColor(white, xx, yy);
  };
  const ellipse = (x, y, rx, ry) => {
    for (let xx = x - rx; xx <= x + rx; xx++)
      for (let yy = y - ry; yy <= y + ry; yy++)
        if (((xx - x) / rx) ** 2 + ((yy - y) / ry) ** 2 <= 1) mark.setPixelColor(white, xx, yy);
  };
  rect(355, 425, 44, 315);
  ellipse(377, 740, 22, 22);
  rect(307, 370, 140, 65);
  ellipse(377, 409, 70, 48);
  for (const x of [307, 359, 411]) {
    rect(x, 275, 36, 133);
    ellipse(x + 18, 275, 18, 18);
  }
  ellipse(603, 360, 58, 102);
  rect(581, 410, 44, 330);
  ellipse(603, 740, 22, 22);
  const icon = new Jimp(1024, 1024, 0xf56b28ff).composite(mark, 0, 0);
  await icon.writeAsync('assets/images/icon.png');
  await mark.writeAsync('assets/images/android-icon-foreground.png');
  await mark.writeAsync('assets/images/android-icon-monochrome.png');
  await icon.clone().resize(256, 256).writeAsync('assets/images/splash-icon.png');
  await icon.clone().resize(64, 64).writeAsync('assets/images/favicon.png');
  const config = JSON.parse(fs.readFileSync('app.json', 'utf8').replace(/^\uFEFF/, ''));
  delete config.expo.android.adaptiveIcon.backgroundImage;
  fs.writeFileSync('app.json', JSON.stringify(config, null, 2) + '\n');
})();
