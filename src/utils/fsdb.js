const fs = require('fs');
const path = require('path');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

class FSDB {
  constructor(baseDir) {
    this.baseDir = baseDir;
    ensureDir(this.baseDir);
  }

  file(name) {
    return path.join(this.baseDir, name + '.json');
  }

  read(name, fallback) {
    const p = this.file(name);
    if (!fs.existsSync(p)) return fallback;
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      console.error('Failed to read', p, e.message);
      return fallback;
    }
  }

  write(name, data) {
    const p = this.file(name);
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
  }
}

module.exports = { FSDB, ensureDir };

